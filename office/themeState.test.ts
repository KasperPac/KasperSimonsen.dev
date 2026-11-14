import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { THEME_INIT_SCRIPT, THEME_KEY, getTheme, resetThemeState, resolveTheme, setTheme, subscribeTheme, systemTheme } from "./themeState";

function browser(opts: { stored?: string | null; prefersLight?: boolean; onPage?: string; blocked?: boolean }) {
  const store = new Map<string, string>(opts.stored != null ? [[THEME_KEY, opts.stored]] : []);
  const root = { dataset: {} as Record<string, string> };
  if (opts.onPage) root.dataset.theme = opts.onPage;
  const localStorage = {
    getItem: (k: string) => {
      if (opts.blocked) throw new Error("blocked");
      return store.get(k) ?? null;
    },
    setItem: (k: string, v: string) => {
      if (opts.blocked) throw new Error("blocked");
      store.set(k, v);
    },
  };
  vi.stubGlobal("window", { localStorage, matchMedia: () => ({ matches: !!opts.prefersLight }) });
  vi.stubGlobal("document", { documentElement: root });
  return { store, root, localStorage };
}

beforeEach(() => resetThemeState());
afterEach(() => vi.unstubAllGlobals());

describe("resolveTheme", () => {
  it("follows the system when nothing is stored", () => {
    expect(resolveTheme(null, false)).toBe("dark");
    expect(resolveTheme(null, true)).toBe("light");
    expect(systemTheme(true)).toBe("light");
  });
  it("a stored choice wins over the system", () => {
    expect(resolveTheme("dark", true)).toBe("dark");
    expect(resolveTheme("light", false)).toBe("light");
  });
  it("ignores a stored value that isn't a theme", () => {
    expect(resolveTheme("", true)).toBe("light");
    expect(resolveTheme(" light", false)).toBe("dark");
    expect(resolveTheme("LIGHT", false)).toBe("dark");
  });
});

describe("theme state", () => {
  it("is dark on the server", () => {
    expect(getTheme()).toBe("dark");
  });
  it("first visit follows prefers-color-scheme", () => {
    browser({ prefersLight: true });
    expect(getTheme()).toBe("light");
  });
  it("a stored choice wins on a later visit", () => {
    browser({ stored: "dark", prefersLight: true });
    expect(getTheme()).toBe("dark");
  });
  it("uses what the head script put on the page, so the first render matches the first paint", () => {
    browser({ onPage: "light", stored: "dark" });
    expect(getTheme()).toBe("light");
  });
  it("setTheme stores the choice, updates the page and tells every subscriber", () => {
    const { store, root } = browser({ prefersLight: false });
    const seen: string[] = [];
    const off = subscribeTheme(() => seen.push(getTheme()));
    setTheme("light");
    expect(getTheme()).toBe("light");
    expect(store.get(THEME_KEY)).toBe("light");
    expect(root.dataset.theme).toBe("light");
    setTheme("dark");
    expect(seen).toEqual(["light", "dark"]);
    off();
    setTheme("light");
    expect(seen).toHaveLength(2);
  });
  it("the stored choice is what the next load reads", () => {
    const { store } = browser({ prefersLight: false });
    setTheme("light");
    resetThemeState();
    browser({ stored: store.get(THEME_KEY), prefersLight: false });
    expect(getTheme()).toBe("light");
  });
  it("works for this visit when storage is blocked", () => {
    browser({ blocked: true, prefersLight: true });
    expect(getTheme()).toBe("light");
    expect(() => setTheme("dark")).not.toThrow();
    expect(getTheme()).toBe("dark");
  });
});

describe("THEME_INIT_SCRIPT (runs before first paint)", () => {
  const run = (opts: Parameters<typeof browser>[0]) => {
    const { root } = browser(opts);
    vi.stubGlobal("localStorage", window.localStorage);
    new Function(THEME_INIT_SCRIPT)();
    return root.dataset.theme;
  };
  it("sets the system theme on a first visit", () => {
    expect(run({ prefersLight: true })).toBe("light");
    expect(run({ prefersLight: false })).toBe("dark");
  });
  it("sets the stored choice over the system", () => {
    expect(run({ stored: "dark", prefersLight: true })).toBe("dark");
    expect(run({ stored: "light", prefersLight: false })).toBe("light");
  });
  it("falls back to the system on a bad stored value or blocked storage", () => {
    expect(run({ stored: "blue", prefersLight: true })).toBe("light");
    expect(run({ blocked: true, prefersLight: true })).toBe("light");
  });
});
