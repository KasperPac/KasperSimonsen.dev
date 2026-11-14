import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getTheme, resetThemeState } from "../themeState";
import { FLICKER_S } from "./sequence";
import { flickerElapsedMs, getLight, resetLightState, subscribeLight, toggleLight } from "./lightState";

function setup(prefersLight: boolean, stored?: string) {
  const store = new Map<string, string>(stored ? [["office-theme", stored]] : []);
  const localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
  vi.stubGlobal("window", { localStorage, matchMedia: () => ({ matches: prefersLight }) });
  vi.stubGlobal("document", { documentElement: { dataset: {} } });
  resetThemeState();
  resetLightState();
  return localStorage;
}

describe("the office light", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("starts from the theme the page opened in", () => {
    setup(false);
    expect(getLight()).toBe("off");
    setup(true);
    expect(getLight()).toBe("on");
    setup(true, "dark"); // a stored choice beats the system
    expect(getLight()).toBe("off");
  });

  it("flickers first, then goes on and the office turns light", () => {
    const storage = setup(false);
    toggleLight(false, 1000);
    expect(getLight()).toBe("flickering");
    expect(getTheme()).toBe("dark"); // not yet
    expect(flickerElapsedMs(1250)).toBe(250);
    vi.advanceTimersByTime(FLICKER_S * 1000 - 1);
    expect(getLight()).toBe("flickering");
    vi.advanceTimersByTime(1);
    expect(getLight()).toBe("on");
    expect(getTheme()).toBe("light");
    expect(storage.getItem("office-theme")).toBe("light");
    expect(flickerElapsedMs()).toBe(0);
  });

  it("goes off and back to dark straight away, and remembers it", () => {
    const storage = setup(true);
    toggleLight(false);
    expect(getLight()).toBe("off");
    expect(getTheme()).toBe("dark");
    expect(storage.getItem("office-theme")).toBe("dark");
  });

  it("ignores a press while it flickers", () => {
    setup(false);
    toggleLight(false);
    toggleLight(false);
    expect(getLight()).toBe("flickering");
    vi.advanceTimersByTime(FLICKER_S * 1000);
    expect(getLight()).toBe("on");
  });

  it("with reduced motion changes at once, with no flicker and no timer", () => {
    setup(false);
    const seen: string[] = [];
    subscribeLight(() => seen.push(getLight()));
    toggleLight(true);
    expect(getLight()).toBe("on");
    expect(getTheme()).toBe("light");
    toggleLight(true);
    expect(getLight()).toBe("off");
    expect(getTheme()).toBe("dark");
    expect(seen).toEqual(["on", "off"]);
    expect(vi.getTimerCount()).toBe(0);
  });
});
