import type { WorkItem } from "@/content/work";
import { COPY } from "@/office/copy";

/** A product description, with an optional shortcut to its screenshots in the office. */
export default function CaseStudy({
  item,
  titleId,
  level = 2,
  onShowOnMonitor,
}: {
  item: WorkItem;
  titleId: string;
  level?: 1 | 2;
  onShowOnMonitor?: () => void;
}) {
  const Title = level === 1 ? "h1" : "h2";
  const SectionHeading = level === 1 ? "h2" : "h3";
  return (
    <article className="article">
      <p className="article-eyebrow">
        {item.years} · {item.role}
      </p>
      <Title id={titleId} className="article-title">
        {item.name}
      </Title>
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
          <SectionHeading>{s.title}</SectionHeading>
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
