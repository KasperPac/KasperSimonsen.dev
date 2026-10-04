"use client";

import { engagementModels, type Service } from "@/content/services";
import type { Topic } from "@/content/contact";
import { COPY } from "@/office/copy";

/**
 * A service in full: the Read more panel (level 2, its buttons open the contact form over it) and its standalone page
 * (level 1, links to /contact with the topic). It ends with the two ways to work with Kasper (interactions spec 3.4).
 */
export default function ServiceArticle({ service, titleId, level, onWrite }: { service: Service; titleId: string; level: 1 | 2; onWrite?: (topic: Topic) => void }) {
  const Title = level === 1 ? "h1" : "h2";
  const Ways = level === 1 ? "h2" : "h3";
  const Model = level === 1 ? "h3" : "h4";
  return (
    <article className="article">
      <p className="article-eyebrow">{COPY.service.eyebrow}</p>
      <Title id={titleId} className="article-title">
        {service.name}
      </Title>
      <p className="article-lede">{service.summary}</p>
      {service.body.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
      <Ways>{COPY.service.ways}</Ways>
      {engagementModels.map((m) => (
        <section key={m.slug} className="article-model">
          <Model>{m.name}</Model>
          <p className="article-eyebrow">
            {m.meta} · {m.timeline}
          </p>
          <p>{m.description}</p>
          <p className="article-label">{m.fitsLabel}</p>
          <p>{m.fitsBody}</p>
          <p className="article-label">{m.requiresLabel}</p>
          <p>{m.requiresBody}</p>
          {onWrite ? (
            <button type="button" className="article-cta" onClick={() => onWrite(m.topic)}>
              {m.ctaLabel}
            </button>
          ) : (
            <a className="article-cta" href={`/contact?topic=${m.topic}`}>
              {m.ctaLabel}
            </a>
          )}
          <p className="article-hint">{m.replyHint}</p>
        </section>
      ))}
    </article>
  );
}
