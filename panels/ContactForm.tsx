"use client";

import { useState, type FormEvent } from "react";
import { CONTACT_EMAIL, subjectForTopic } from "@/content/contact";
import { COPY } from "@/office/copy";

type Status = "idle" | "sending" | "sent" | "error";

/** The contact form in the office style. Posts the same body to /api/contact as the old form. */
export default function ContactForm({ topic, titleId, level }: { topic?: string; titleId: string; level: 1 | 2 }) {
  const Title = level === 1 ? "h1" : "h2";
  const [form, setForm] = useState({ name: "", email: "", subject: subjectForTopic(topic), message: "" });
  const [status, setStatus] = useState<Status>("idle");
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
      {status === "sent" ? (
        <p role="status">{COPY.contact.sent}</p>
      ) : (
        <form className="form" onSubmit={submit}>
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
            <textarea required rows={6} value={form.message} onChange={set("message")} />
          </label>
          <button className="article-cta" type="submit" disabled={status === "sending"}>
            {status === "sending" ? COPY.contact.sending : COPY.contact.send}
          </button>
          {status === "error" && (
            <p role="alert">
              {COPY.contact.error} <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </p>
          )}
        </form>
      )}
    </article>
  );
}
