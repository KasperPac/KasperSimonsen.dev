import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { engagementModels, services } from "@/content/services";
import ServiceArticle from "./ServiceArticle";
import Plaque from "@/office/cards/Plaque";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

describe("ServiceArticle", () => {
  it("shows the service, then the two ways to work, under a heading the dialog is labelled by", () => {
    const out = renderToStaticMarkup(createElement(ServiceArticle, { service: services[0], titleId: "t", level: 2, onWrite: () => {} }));
    expect(out).toContain(`id="t"`);
    expect(out).toMatch(/<h2[^>]*id="t"/);
    for (const p of services[0].body) expect(out).toContain(esc(p));
    expect(out).toContain("Two ways to work with me");
    for (const m of engagementModels) {
      expect(out).toContain(esc(m.description));
      expect(out).toContain(esc(m.ctaLabel));
    }
    expect(out.indexOf(esc(services[0].body[0]))).toBeLessThan(out.indexOf("Two ways to work with me")); // the models close it
  });
  it("in the office its buttons open the form; standalone they link to it with the topic", () => {
    const office = renderToStaticMarkup(createElement(ServiceArticle, { service: services[1], titleId: "t", level: 2, onWrite: () => {} }));
    expect(office).not.toContain("/contact?topic=");
    const page = renderToStaticMarkup(createElement(ServiceArticle, { service: services[1], titleId: "t", level: 1 }));
    expect(page).toMatch(/<h1[^>]*id="t"/);
    for (const m of engagementModels) expect(page).toContain(`href="/contact?topic=${m.topic}"`);
  });
});

describe("Plaque", () => {
  it("shows the name, the summary and Read more", () => {
    const out = renderToStaticMarkup(createElement(Plaque, { service: services[2], titleId: "p", cardRef: { current: null }, onReadMore: () => {} }));
    for (const text of [services[2].name, services[2].summary, "Read more", services[2].number]) expect(out).toContain(esc(text));
    expect(out).toContain(`aria-labelledby="p"`);
  });
});
