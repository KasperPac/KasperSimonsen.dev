import type { Metadata } from "next";
import Image from "next/image";
import { CONTACT_EMAIL, CONTACT_NAME } from "@/content/contact";
import { slides } from "@/content/screens";
import { services } from "@/content/services";
import { work } from "@/content/work";
import { COPY } from "@/office/copy";
import PortfolioNav from "../PortfolioNav";

export const metadata: Metadata = {
  title: `Portfolio — ${CONTACT_NAME}`,
  description: "Browse Kasper Simonsen’s software projects and services, from websites and apps to industrial automation.",
  alternates: { canonical: "/portfolio" },
};

export default function PortfolioPage() {
  return (
    <main className="site-portfolio">
      <PortfolioNav current="portfolio" />
      <header className="site-portfolio-intro">
        <h1>{CONTACT_NAME}</h1>
        <p>{COPY.entry.role}. {COPY.entry.intro}</p>
        <nav aria-label="On this page">
          <a href="#work">Work</a>
          <a href="#services">Services</a>
        </nav>
      </header>
      <section id="work" aria-labelledby="portfolio-work">
        <h2 id="portfolio-work">Selected work</h2>
        <ul className="site-projects">
          {work.map((item) => {
            const shot = slides.find((slide) => slide.slug === item.slug)?.shot;
            return (
              <li key={item.slug}>
                {shot && (
                  <Image src={shot.src} alt={shot.alt} width={1280} height={720} sizes="(max-width: 660px) 92vw, (max-width: 1160px) 46vw, 540px" />
                )}
                <h3><a href={`/portfolio/${item.slug}`}>{item.name}</a></h3>
                <p>{item.headline}</p>
              </li>
            );
          })}
        </ul>
      </section>
      <section id="services" aria-labelledby="portfolio-services">
        <h2 id="portfolio-services">What I do</h2>
        <ul className="site-services">
          {services.map((service) => (
            <li key={service.slug}>
              <h3><a href={`/services/${service.slug}`}>{service.name}</a></h3>
              <p>{service.summary}</p>
            </li>
          ))}
        </ul>
      </section>
      <footer className="site-portfolio-contact">
        <a className="site-entry-button site-entry-contact" href="/contact">{COPY.entry.contact}</a>
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </footer>
    </main>
  );
}
