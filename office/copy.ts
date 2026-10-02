/**
 * Every visitor-facing word in the office. DRAFTS: Kasper approves all of these before launch (spec 4: his voice,
 * conversational, dry, contractions, no marketing words).
 */
export const COPY = {
  nav: "Around the office",
  labels: {
    hs_crate: "The work",
    hs_drawer: "Get in touch",
    hs_shelf: "What I do",
    hs_monitor: "Monitor",
  },
  back: "Back",
  close: "Close",
  card: {
    eyebrow: "Contact",
    role: "Independent software engineer, Cremorne",
    write: "Write to me",
  },
  contact: {
    title: "Get in touch",
    lede: "I reply within 24 hours. Usually faster.",
    name: "Name",
    email: "Email",
    subject: "What's it about",
    message: "Message",
    send: "Send it",
    sending: "Sending…",
    sent: "Sent. Talk soon.",
    error: "That didn't go through. Email me instead:",
  },
  sleeve: { readMore: "Read more", stack: "Built with" },
  caseStudy: { stack: "Built with", live: "See it live" },
  crate: {
    label: (name: string, n: number, of: number) => `Record crate: ${name}, ${n} of ${of}. Arrow keys flick, Enter pulls it out.`,
    hint: "Scroll to flick through. Click a record to pull it out.",
  },
} as const;
