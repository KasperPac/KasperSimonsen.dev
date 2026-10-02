import { describe, it, expect } from "vitest";
import { findWork, work } from "./work";
import { findService, services } from "./services";
import { CONTACT_EMAIL, subjectForTopic } from "./contact";

describe("work", () => {
  it("has the three case studies, newest first", () =>
    expect(work.map((w) => w.slug)).toEqual(["pac-forge", "manuva", "silio"]));
  it("gives every item a name, a headline and an intro", () => {
    for (const w of work) {
      expect(w.name).not.toBe("");
      expect(w.headline).not.toBe("");
      expect(w.intro.length).toBeGreaterThan(0);
    }
  });
  it("has unique slugs", () => expect(new Set(work.map((w) => w.slug)).size).toBe(work.length));
  it("finds by slug", () => {
    expect(findWork("manuva")?.name).toBe("Manuva");
    expect(findWork("nope")).toBeUndefined();
  });
});

describe("services", () => {
  it("has the two services with url-safe slugs", () =>
    expect(services.map((s) => s.slug)).toEqual(["tools-and-dashboards", "platforms-and-systems"]));
  it("keeps the existing headlines and contact topics", () => {
    expect(services.map((s) => s.name)).toEqual(["Tools & Dashboards", "Platforms & Systems"]);
    expect(services.map((s) => s.topic)).toEqual(["tools", "platforms"]);
  });
  it("finds by slug", () => {
    expect(findService("platforms-and-systems")?.number).toBe("02");
    expect(findService("nope")).toBeUndefined();
  });
});

describe("contact", () => {
  it("has the address", () => expect(CONTACT_EMAIL).toBe("hello@kaspersimonsen.dev"));
  it.each([
    ["tools", "Tools & dashboards enquiry"],
    ["platforms", "Platforms & systems enquiry"],
    ["other", ""],
    [undefined, ""],
  ])("subject for %j", (topic, subject) => expect(subjectForTopic(topic)).toBe(subject));
});
