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
  /** On the street, for anyone who doesn't think to scroll (Kasper). */
  arrive: { comeIn: "Come in", scroll: "or scroll" },
  hints: "Have a look around.",
  hintsPan: "Drag sideways to look around.",
  sleeve: { readMore: "Read more", stack: "Built with" },
  caseStudy: { stack: "Built with", live: "See it live" },
  crate: {
    label: (name: string, n: number, of: number) => `Record crate: ${name}, ${n} of ${of}. Arrow keys flick, Enter puts it on.`,
    hint: "Hover a record to flick to it. Click it to put it on.",
    hintTouch: "Swipe to flick through. Tap one to put it on.",
  },
  shelf: {
    label: "Shelf",
    hint: "Click one to pick it up.",
    hintTouch: "Tap one to pick it up.",
  },
  plaque: { eyebrow: (number: string) => `What I do · ${number}`, readMore: "Read more" },
  service: { eyebrow: "What I do", ways: "Two ways to work with me" },
  /** On the standalone pages, back into the office. */
  enter: "Enter the office",
  /** The monitor's reel of past work (spec 3.5). DRAFT. */
  reel: {
    title: "Some things I've built",
    caseStudy: "See the case study",
    prev: "Previous project",
    next: "Next project",
    show: (name: string) => `Show ${name}`,
  },
} as const;
