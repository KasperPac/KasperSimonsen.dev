"use client";

import { CONTACT_EMAIL, CONTACT_LINKS, CONTACT_NAME } from "@/content/contact";
import { COPY } from "@/office/copy";

/** What's printed on the business card in the drawer (interactions spec section 3.3). */
export default function BusinessCard({ titleId, onWrite }: { titleId: string; onWrite: () => void }) {
  return (
    <>
      <p className="office-card-eyebrow">{COPY.card.eyebrow}</p>
      <h2 id={titleId} className="office-card-title" tabIndex={-1}>
        {CONTACT_NAME}
      </h2>
      <p className="office-card-text">{COPY.card.role}</p>
      <p className="office-card-text">
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
      <ul className="office-card-links">
        {CONTACT_LINKS.map((l) => (
          <li key={l.href}>
            <a href={l.href} target="_blank" rel="noreferrer">
              {l.label}
            </a>
          </li>
        ))}
      </ul>
      <button type="button" className="office-card-cta" onClick={onWrite}>
        {COPY.card.write}
      </button>
    </>
  );
}
