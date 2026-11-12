"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CONTACT_EMAIL } from "@/content/contact";

export default function EnquiryForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;
    const data = new FormData(event.currentTarget);
    setStatus("sending");
    try {
      const response = await fetch("/api/contact", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"), email: data.get("email"),
          subject: `KS enquiry: ${data.get("help") || "Let’s talk"}`,
          message: `${data.get("business") ? `Business: ${data.get("business")}\n\n` : ""}${data.get("message")}`,
        }),
      });
      setStatus(response.ok ? "sent" : "error");
    } catch { setStatus("error"); }
  }

  if (status === "sent") return <div className="enquiry-sent" role="status"><h3>Thanks for getting in touch.</h3><p>Your enquiry has been sent to Kasper. We’ll reply to the email address you provided.</p><button className="button button-light" onClick={() => setStatus("idle")}>Send another enquiry</button></div>;

  return <form className="enquiry-form" onSubmit={submit}>
    <p className="form-fallback">Prefer email? <a href={`mailto:${CONTACT_EMAIL}`}>Contact Kasper directly</a>.</p>
    <fieldset disabled={!ready || status === "sending"}>
      <legend className="sr-only">Tell us about your business</legend>
      <div className="form-pair">
        <label>Your name<input name="name" autoComplete="name" required maxLength={120} /></label>
        <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
      </div>
      <label>Business name <span className="optional">(optional)</span><input name="business" autoComplete="organization" maxLength={200} /></label>
      <label>What would you like help with?<select name="help" defaultValue="Not sure yet"><option>Not sure yet</option><option>A website</option><option>Business software</option><option>AI agents & automation</option><option>Digital support</option></select></label>
      <label>A little about what you need<textarea name="message" required rows={4} maxLength={10000} placeholder="What would you like to make better?" /></label>
      <p className="form-note">We’ll use these details to respond to your enquiry. Please leave out passwords or sensitive customer information.</p>
      <button className="button button-accent" type="submit">{status === "sending" ? "Sending your enquiry…" : "Send enquiry"}<span aria-hidden="true">↗</span></button>
      {status === "error" && <p role="alert">Your enquiry couldn’t be sent. Please try again or email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Your details are still here.</p>}
    </fieldset>
  </form>;
}
