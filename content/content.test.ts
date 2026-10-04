import { describe, it, expect } from "vitest";
import { findWork, work } from "./work";
import { findService, services, engagementModels } from "./services";
import { CONTACT_EMAIL, CONTACT_LINKS, CONTACT_NAME, subjectForTopic, isTopic } from "./contact";

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
  it("has the four shelf services, in shelf order, with url-safe slugs", () => {
    expect(services.map((s) => s.slug)).toEqual(["industrial-automation", "websites", "apps", "desktop-software"]);
    for (const s of services) expect(s.slug).toMatch(/^[a-z0-9-]+$/);
  });
  it("gives each one its ornament: gear, globe, phone, desktop computer", () =>
    expect(services.map((s) => s.ornament)).toEqual(["gear", "globe", "phone", "computer"]));
  it("numbers them 01 to 04", () => expect(services.map((s) => s.number)).toEqual(["01", "02", "03", "04"]));
  it("keeps each plaque summary to two or three lines", () => {
    for (const s of services) {
      expect(s.summary.length).toBeGreaterThan(40);
      expect(s.summary.length).toBeLessThanOrEqual(200);
    }
  });
  it("has a body to read for every service", () => {
    for (const s of services) {
      expect(s.body.length).toBeGreaterThan(0);
      for (const p of s.body) expect(p).not.toBe("");
    }
  });
  it("finds by slug", () => {
    expect(findService("apps")?.ornament).toBe("phone");
    expect(findService("tools-and-dashboards")).toBeUndefined();
  });
});

describe("engagement models", () => {
  it("keeps the two existing models, headlines and contact topics", () => {
    expect(engagementModels.map((m) => m.name)).toEqual(["Tools & Dashboards", "Platforms & Systems"]);
    expect(engagementModels.map((m) => m.topic)).toEqual(["tools", "platforms"]);
  });
  it("every topic pre-fills a subject", () => {
    for (const m of engagementModels) expect(subjectForTopic(m.topic)).not.toBe("");
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
  it("knows its topics", () => {
    expect(isTopic("tools")).toBe(true);
    expect(isTopic("platforms")).toBe(true);
    expect(isTopic("other")).toBe(false);
    expect(isTopic(undefined)).toBe(false);
  });
});

describe("business card", () => {
  it("has the name", () => expect(CONTACT_NAME).toBe("Kasper Simonsen"));
  it("has at least one link, all absolute https", () => {
    expect(CONTACT_LINKS.length).toBeGreaterThan(0);
    for (const l of CONTACT_LINKS) expect(l.href).toMatch(/^https:\/\//);
  });
});
