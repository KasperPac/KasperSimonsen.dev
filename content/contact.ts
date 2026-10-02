export const CONTACT_EMAIL = "hello@kaspersimonsen.dev";

// Same subjects as the old /contact form, so ?topic= links keep working on both.
const SUBJECTS: Record<string, string> = {
  tools: "Tools & dashboards enquiry",
  platforms: "Platforms & systems enquiry",
};

/** Pre-filled subject for a `?topic=` value; empty for anything else. */
export function subjectForTopic(topic: string | undefined): string {
  return (topic && SUBJECTS[topic]) || "";
}
