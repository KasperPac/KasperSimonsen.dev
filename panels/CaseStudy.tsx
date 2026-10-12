"use client";

import type { WorkItem } from "@/content/work";
import { COPY } from "@/office/copy";

/** A product description, with an optional shortcut to its screenshots in the office. */
export default function CaseStudy({ item, titleId, onShowOnMonitor }: { item: WorkItem; titleId: string; onShowOnMonitor?: () => void }) {
  return (
    <article className="article">
      <p className="article-eyebrow">
        {item.years} · {item.role}
      </p>
      <h2 id={titleId} className="article-title">
        {item.name}
      </h2>
      <p className="article-lede">{item.headline}</p>
      {onShowOnMonitor && (
        <p>
          <button type="button" className="article-cta" onClick={onShowOnMonitor}>
            {COPY.caseStudy.monitor}
          </button>
        </p>
      )}
      {item.intro.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
      {item.sections.map((s) => (
        <section key={s.title}>
          <h3>{s.title}</h3>
          {s.paras.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </section>
      ))}
      {item.liveUrl && (
        <p>
          <a href={item.liveUrl} target="_blank" rel="noreferrer">
            {COPY.caseStudy.live}
          </a>
        </p>
      )}
    </article>
  );
}
