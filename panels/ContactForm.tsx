"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CONTACT_EMAIL, subjectForTopic } from "@/content/contact";
import { COPY } from "@/office/copy";

type Status = "idle" | "sending" | "sent" | "error";

/** Shared by the office drawer and standalone contact page. */
export default function ContactForm({ topic, titleId, level }: { topic?: string; titleId: string; level: 1 | 2 }) {
  const Title = level === 1 ? "h1" : "h2";
  const [form, setForm] = useState({ name: "", email: "", subject: subjectForTopic(topic), message: "" });
  const [status, setStatus] = useState<Status>("idle");
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <article className="article">
      <Title id={titleId} className="article-title">
        {COPY.contact.title}
      </Title>
      <p className="article-lede">{COPY.contact.lede}</p>
      <div className="contact-direct">
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        {status !== "sent" && <p>{COPY.contact.direct}</p>}
      </div>
      {status === "sent" ? (
        <p role="status">{COPY.contact.sent}</p>
      ) : (
        <form onSubmit={submit}>
          <noscript><p>{COPY.contact.noScript}</p></noscript>
          <fieldset className="form" disabled={!ready || status === "sending"}>
            <label>
              {COPY.contact.name}
              <input required autoComplete="name" value={form.name} onChange={set("name")} />
            </label>
            <label>
              {COPY.contact.email}
              <input required type="email" autoComplete="email" value={form.email} onChange={set("email")} />
            </label>
            <label>
              {COPY.contact.subject}
              <input required value={form.subject} onChange={set("subject")} />
            </label>
            <label>
              {COPY.contact.message}
              <textarea required rows={5} value={form.message} onChange={set("message")} />
            </label>
            <button className="article-cta" type="submit" disabled={status === "sending"}>
              {status === "sending" ? COPY.contact.sending : COPY.contact.send}
            </button>
            {status === "error" && (
              <p role="alert">
                {COPY.contact.error} <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              </p>
            )}
          </fieldset>
        </form>
      )}
    </article>
  );
}
