import { COPY } from "@/office/copy";

export default function PortfolioNav({ current }: { current?: "portfolio" | "contact" }) {
  return (
    <nav className="site-nav" aria-label="Site navigation">
      <a href="/portfolio" aria-current={current === "portfolio" ? "page" : undefined}>{COPY.entry.portfolio}</a>
      <a href="/office#enter">{COPY.enter}</a>
      <a href="/contact" aria-current={current === "contact" ? "page" : undefined}>{COPY.entry.contact}</a>
    </nav>
  );
}
