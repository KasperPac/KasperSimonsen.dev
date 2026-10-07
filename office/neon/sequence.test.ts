import { describe, expect, it } from "vitest";
import { TUBES, type TubeId } from "./mark";
import {
  BAD_TUBE_GAP_S,
  BAD_TUBE_S,
  POWER_UP_S,
  STEP_S,
  __neonCacheStats,
  __resetNeonCaches,
  badTubes,
  neonFrame,
  nextPower,
} from "./sequence";

const lit = (f: ReturnType<typeof neonFrame>) => TUBES.filter((t) => f.brightness[t] > 0);

describe("power (neon sign spec 3.1)", () => {
  it("powers up on arrival, then stays on; reduced motion skips the power-up", () => {
    expect(nextPower("off", false, 5, false)).toBe("off");
    expect(nextPower("off", true, 0, false)).toBe("powering");
    expect(nextPower("powering", true, POWER_UP_S - 0.01, false)).toBe("powering");
    expect(nextPower("powering", true, POWER_UP_S, false)).toBe("on");
    expect(nextPower("off", true, 0, true)).toBe("on");
  });
  it("goes off the moment the visitor leaves, even mid power-up", () => {
    expect(nextPower("powering", false, 0.1, false)).toBe("off");
    expect(nextPower("on", false, 30, false)).toBe("off");
  });
});

describe("the frame (neon sign spec 3.2-3.4)", () => {
  it("lights nothing while off", () => {
    const f = neonFrame("off", 3, 1, false);
    expect(lit(f)).toEqual([]);
    expect(f.hop).toBe(0);
  });

  it("ends the power-up with the letters, the head and the overhead rope lit", () => {
    const f = neonFrame("powering", POWER_UP_S - 0.001, 1, false);
    expect(lit(f)).toEqual(["k", "s", "head", "rope0"]);
    for (const t of lit(f)) expect(f.brightness[t]).toBe(1);
  });

  it("stutters on: during the power-up some tube is out or dipped", () => {
    const samples = Array.from({ length: 60 }, (_, i) => neonFrame("powering", (i / 60) * POWER_UP_S, 7, false));
    expect(samples.some((f) => (["k", "s", "head", "rope0"] as const).some((t) => f.brightness[t] < 1))).toBe(true);
  });

  it("steps the rope round every STEP_S, one position lit at a time, in order", () => {
    // a time with no bad tube for this seed: before the first event
    const first = badTubes(3, 100)[0].at;
    const steps = Array.from({ length: 12 }, (_, i) => neonFrame("on", i * STEP_S + STEP_S / 2, 3, false));
    expect(first).toBeGreaterThan(12 * STEP_S);
    expect(steps.map((f) => f.step)).toEqual([0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5]);
    for (const f of steps) expect(lit(f)).toEqual(["k", "s", "head", `rope${f.step}` as TubeId]);
  });

  it("hops only while the rope is under the feet", () => {
    for (let step = 0; step < 6; step++) expect(neonFrame("on", step * STEP_S + 0.01, 3, false).hop).toBe(step === 3 ? 1 : 0);
  });

  it("lets a tube go bad now and then: 8-20 s apart, ~0.3 s each, the same for the same seed", () => {
    const events = badTubes(42, 600);
    expect(events).toEqual(badTubes(42, 600));
    expect(events.length).toBeGreaterThan(600 / BAD_TUBE_GAP_S[1] - 1);
    events.forEach((e, i) => {
      const gap = e.at - (i ? events[i - 1].at : 0);
      expect(gap).toBeGreaterThanOrEqual(BAD_TUBE_GAP_S[0]);
      expect(gap).toBeLessThanOrEqual(BAD_TUBE_GAP_S[1]);
    });
    const e = events[0];
    const during = Array.from({ length: 30 }, (_, i) => neonFrame("on", e.at + (i / 30) * BAD_TUBE_S, 42, false));
    const tube = (f: ReturnType<typeof neonFrame>) => (e.tube === "rope" ? (`rope${f.step}` as TubeId) : (e.tube as TubeId));
    expect(during.some((f) => f.brightness[tube(f)] < 1 && f.brightness[tube(f)] > 0)).toBe(true);
    // and steady again once it's over (the next event is at least 8 s away)
    const after = neonFrame("on", e.at + BAD_TUBE_S + 0.01, 42, false);
    expect(after.brightness[tube(after)]).toBe(1);
  });

  it("dips a bad tube at most twice (well under three flashes a second)", () => {
    const e = badTubes(9, 100)[0];
    const levels = Array.from({ length: 300 }, (_, i) => {
      const f = neonFrame("on", e.at + (i / 300) * BAD_TUBE_S, 9, false);
      return f.brightness[e.tube === "rope" ? (`rope${f.step}` as TubeId) : (e.tube as TubeId)];
    });
    let dips = 0;
    for (let i = 1; i < levels.length; i++) if (levels[i] < 1 && levels[i - 1] === 1) dips++;
    expect(dips).toBeLessThanOrEqual(2);
  });

  it("under reduced motion holds the overhead frame, fully lit, still", () => {
    for (const [power, t] of [["on", 0], ["on", 17.3], ["powering", 0.1]] as const) {
      const f = neonFrame(power, t, 5, true);
      expect(f.step).toBe(0);
      expect(f.hop).toBe(0);
      expect(lit(f)).toEqual(["k", "s", "head", "rope0"]);
      for (const tube of lit(f)) expect(f.brightness[tube]).toBe(1);
    }
  });
});

/** The generator as it was before the per-seed cache: every call starts from zero. */
function legacyBadTubes(seed: number, until: number) {
  let a = seed >>> 0;
  const r = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const gap = () => BAD_TUBE_GAP_S[0] + (BAD_TUBE_GAP_S[1] - BAD_TUBE_GAP_S[0]) * r();
  const kinds = ["k", "s", "head", "rope"] as const;
  const out: { at: number; tube: (typeof kinds)[number] }[] = [];
  for (let at = gap(); at <= until; at += gap()) out.push({ at, tube: kinds[Math.floor(r() * kinds.length) % kinds.length] });
  return out;
}

describe("the per-seed cache", () => {
  const seed = 1234;

  it("gives the same bad tubes as generating from zero, whatever order it is asked in", () => {
    __resetNeonCaches();
    for (const until of [7200, 30, 86400 + 50, 0, 600, 86400, 12.5]) expect(badTubes(seed, until)).toEqual(legacyBadTubes(seed, until));
  });

  it("gives the same frame as the uncached computation, a day in and inside a bad tube", () => {
    __resetNeonCaches();
    const day = 86400;
    const event = legacyBadTubes(seed, day + 120).at(-1)!;
    const times = [day + 0.1, day + 33.37, event.at, event.at + 0.07, event.at + 0.15, event.at + BAD_TUBE_S + 0.01, 5, 3600.2];
    // cold: a cache that has only ever seen this one time, so it was generated from zero for it
    const cold = times.map((t) => {
      __resetNeonCaches();
      return neonFrame("on", t, seed, false);
    });
    __resetNeonCaches();
    const warm = times.map((t) => neonFrame("on", t, seed, false));
    expect(warm).toEqual(cold);
    // inside the event the bad tube is dipped at some moment: the cache did not lose it
    const tube = (f: ReturnType<typeof neonFrame>) => (event.tube === "rope" ? (`rope${f.step}` as TubeId) : (event.tube as TubeId));
    const during = Array.from({ length: 60 }, (_, i) => neonFrame("on", event.at + (i / 60) * BAD_TUBE_S, seed, false));
    expect(during.some((f) => f.brightness[tube(f)] < 1)).toBe(true);
  });

  it("generates each bad tube once as time grows, not again from zero every frame", () => {
    __resetNeonCaches();
    const until = 7200;
    for (let t = 0; t <= until; t += 0.25) neonFrame("on", t, seed, false);
    expect(__neonCacheStats().events).toBe(legacyBadTubes(seed, until).length);
    const before = __neonCacheStats().events;
    neonFrame("on", until, seed, false);
    neonFrame("on", 10, seed, false); // going back costs nothing either
    expect(badTubes(seed, 100)).toEqual(legacyBadTubes(seed, 100));
    expect(__neonCacheStats().events).toBe(before);
  });

  it("builds the power-up plan once", () => {
    __resetNeonCaches();
    for (let i = 0; i < 100; i++) neonFrame("powering", (i / 100) * POWER_UP_S, seed, false);
    expect(__neonCacheStats().powerUps).toBe(1);
  });

  it("keeps only a few seeds, dropping the oldest", () => {
    __resetNeonCaches();
    for (let s = 1; s <= 6; s++) neonFrame("on", 1, s, false);
    expect(__neonCacheStats().seeds).toBe(4);
    expect(badTubes(1, 500)).toEqual(legacyBadTubes(1, 500)); // an evicted seed still gives the same answer
  });
});
