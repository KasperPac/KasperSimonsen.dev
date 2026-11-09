import { CONTACT_NAME } from "@/content/contact";
import { COPY } from "@/office/copy";
import LandingMark from "./LandingMark";

export default function Home() {
  return (
    <main className="site-entry">
      <div className="site-entry-copy">
        <p className="site-entry-role">{COPY.entry.role}</p>
        <h1>{CONTACT_NAME}</h1>
        <p className="site-entry-intro">{COPY.entry.intro}</p>
        <nav className="site-entry-actions" aria-label="Explore the site">
          <div className="site-entry-buttons">
            <a className="site-entry-button" href="/office#enter">{COPY.entry.office}</a>
            <a className="site-entry-button site-entry-contact" href="/contact">{COPY.entry.contact}</a>
          </div>
          <a className="site-entry-static" href="/portfolio">{COPY.entry.browse}</a>
        </nav>
      </div>
      <LandingMark />
      <small className="site-entry-credit">
        City data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>
      </small>
    </main>
  );
}
