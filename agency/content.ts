/** First agency draft. The business name is intentionally provisional. */

/**
 * The project shown at the top of the page. The image is the reviewed capture already in `public/reel/`.
 * The project already has a case study on the portfolio (`/work/mariannes-hair`), where it was marked
 * pre-launch on 12 November 2026. Whether it leads this page is Kasper's call.
 *
 * It is described as a website and a custom booking platform at Kasper's instruction (12 November 2026):
 * the public site, plus the owner's booking diary built for the salon, with bookings kept in Square.
 */
export const heroWork = {
  name: "Marianne’s Hair",
  detail: "Salon website and custom booking platform",
  image: {
    src: "/reel/mariannes-hair-site-20261025.jpg",
    width: 1280,
    height: 720,
    alt: "The Marianne’s Hair home page: a line drawing of the salon’s shopfront above its logo and a Book online button",
  },
} as const;

export const services = [
  {
    id: "websites", title: "Websites", talk: "Talk about websites", lead: "Make it easy to find you, understand what you do and get in touch.",
    examples: "Business websites, online bookings, stores and website refreshes.",
    detail: "We plan the pages around your customers, help organise the content and build a site that works on phones as well as computers. Booking tools, enquiry forms and content editing are included where your business needs them.",
    fit: "A new business, an outdated website, or a site that makes it too hard for customers to take the next step.",
  },
  {
    id: "software", title: "Business software", talk: "Talk about business software", lead: "Give your team a better way to get the job done.",
    examples: "Customer portals, internal tools, reporting and web or mobile apps.",
    detail: "When spreadsheets or off-the-shelf tools no longer fit, we build software around the way your business works. We start with one useful version and include your team in trying it before it goes live.",
    fit: "A growing team that needs clearer job tracking, shared information or a customer-facing product.",
  },
  {
    id: "automation", title: "AI & automation", talk: "Talk about AI & automation", lead: "Put AI to work on the tasks that take up too much of your day.",
    examples: "Custom AI agents, connected systems, document assistants and workflow automation.",
    detail: "We design AI agents that use your business information and tools to work through multi-step tasks. From sorting enquiries to preparing reports, we connect the workflow, define what the agent can do and build in review where your team needs it.",
    fit: "Repeated admin, information spread across systems, or a useful AI idea you want to turn into a working business tool.",
  },
  {
    id: "support", title: "Digital support", talk: "Talk about digital support", lead: "Someone to help with the next change, fix or decision.",
    examples: "Website updates, troubleshooting, practical advice and ongoing improvements.",
    detail: "Support can start with something small: a broken enquiry form, a new page, a confusing workflow or help choosing a tool. We review what you have, agree the work and explain what will happen before making changes.",
    fit: "A business that needs reliable technical help without hiring an in-house developer. Availability and any ongoing arrangement are agreed with you.",
  },
] as const;

/** One example of an agent at work, shown as a sequence in the AI section. */
export const aiSteps = [
  { title: "An enquiry arrives", text: "A customer describes the work they need." },
  { title: "Your agent does the legwork", text: "Finds the relevant information, checks what’s missing and prepares a draft response." },
  { title: "Your team takes it from here", text: "Review the details, make the decision and send it on." },
] as const;

/**
 * The made-up example behind the three screens in the AI section: a painter answering a quote request.
 * Nothing here is a real customer or job. Kasper chose the layout on 12 November 2026; the wording is a
 * draft for him to change.
 */
export const aiExample = {
  enquiry: {
    initials: "JR",
    from: "Jess R.",
    meta: "Website enquiry, 9:12 am",
    status: "New",
    message: "Hi, can I get a quote to repaint a two bedroom unit in Brunswick? Hoping to start in March.",
  },
  agent: {
    title: "Your agent",
    meta: "Working through it",
    checks: [
      { text: "Found your price list", done: true },
      { text: "Found two similar jobs", done: true },
      { text: "Checked the calendar for March", done: true },
      { text: "Room sizes and photos are missing", done: false },
      { text: "Drafted a reply that asks for them", done: true },
    ],
  },
  draft: {
    title: "Draft reply",
    meta: "To Jess R.",
    status: "Waiting for you",
    message: "Thanks Jess. To quote properly we need the room sizes and a few photos. Can you send them through? We can start from 9 March.",
    actions: ["Edit", "Approve and send"],
  },
  note: "One example. We design the workflow around your business.",
} as const;

export const aiCapabilities = [
  {
    title: "Custom AI agents",
    description: "Agents that work across your tools to sort enquiries, gather job details, draft follow-ups or prepare reports. We build the steps around your process, with clear permissions and handover points.",
  },
  {
    title: "Business knowledge assistants",
    description: "Give your team a way to find answers across your procedures, product information and internal documents. Responses link back to their sources so people can check the details.",
  },
  {
    title: "AI strategy & optimisation",
    description: "Find where AI can make a useful difference, then test it on a real workflow. We compare time, cost and quality, refine what works and help your team put it into everyday use.",
  },
] as const;

// Credential supplied by Kasper on 12 November 2026. Level and public badge URL were not supplied.
// Use the generic credential name; do not imply company partner status or an independently verified badge.
export const aiCredential = "Claude Certified Architect";

export const supportStarts = [
  "Fix or improve the website you already have",
  "Make booking and enquiries easier",
  "Connect tools that don’t talk to each other",
  "Get practical advice before you invest",
  "Keep improving as your business grows",
] as const;

export const sectors = [
  { name: "Local & service businesses", examples: "Salons, studios and appointment-based businesses", need: "Help customers find your services, check the details and book or enquire." },
  { name: "Trades & field services", examples: "Trade businesses, contractors and service teams", need: "Bring job enquiries, quoting and information for your team into a clearer process." },
  { name: "Professional services", examples: "Consultants, specialist practices and small firms", need: "Explain your expertise and make client enquiries, documents and follow-ups easier to manage." },
  { name: "Product & operations teams", examples: "Makers, retailers and growing businesses", need: "Connect product information, stock and day-to-day work as the business grows." },
] as const;
