export const CONTACT_EMAIL = "hello@kaspersimonsen.dev";

/** `?topic=` values the contact form knows: the two engagement models. */
export const TOPICS = ["tools", "platforms"] as const;
export type Topic = (typeof TOPICS)[number];

export function isTopic(value: unknown): value is Topic {
  return typeof value === "string" && (TOPICS as readonly string[]).includes(value);
}

// Same subjects as the old /contact form, so ?topic= links keep working on both.
const SUBJECTS: Record<Topic, string> = {
  tools: "Tools & dashboards enquiry",
  platforms: "Platforms & systems enquiry",
};

/** Pre-filled subject for a `?topic=` value; empty for anything else. */
export function subjectForTopic(topic: string | undefined): string {
  return isTopic(topic) ? SUBJECTS[topic] : "";
}

export const CONTACT_NAME = "Kasper Simonsen";

/** Links on the business card. LinkedIn goes here when Kasper sends the URL. */
export const CONTACT_LINKS: { label: string; href: string }[] = [{ label: "GitHub", href: "https://github.com/kaspersimonsen" }];
