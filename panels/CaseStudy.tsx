"use client";

import type { WorkItem } from "@/content/work";
import { COPY } from "@/office/copy";

/** A case study in the Read more panel: the intro, every section, the stack and the live link. */
export default function CaseStudy({ item, titleId }: { item: WorkItem; titleId: string }) {
  return (
    <article className="article">
      <p className="article-eyebrow">
        {item.years} · {item.role}
      </p>
      <h2 id={titleId} className="article-title">
        {item.name}
      </h2>
      <p className="article-lede">{item.headline}</p>
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
      <h3>{COPY.caseStudy.stack}</h3>
      <ul className="article-stack">
        {item.stack.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
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
