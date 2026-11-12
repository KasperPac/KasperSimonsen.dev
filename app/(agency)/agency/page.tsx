import { CONTACT_EMAIL } from "@/content/contact";
import { aiCapabilities, aiCredential, sectors, services } from "@/agency/content";
import EnquiryForm from "@/agency/EnquiryForm";
import OfficeInvitation from "@/agency/OfficeInvitation";
import ServiceIcon from "@/agency/ServiceIcon";

function Mark() {
  return <img src="/agency/ks-mark.svg" width="68" height="56" alt="KS" />;
}

const nav = [["Services", "services"], ["AI & agents", "ai-agents"], ["Who we help", "who-we-help"], ["The office", "the-office"]] as const;

function Sketch() {
  return <div className="hero-sketch" aria-hidden="true">
    <div className="sketch-note note-top">Let’s make this easier.</div>
    <svg className="sketch-lines" viewBox="0 0 560 460" fill="none"><path d="M65 76 C106 55 180 55 214 78 M201 65 L216 79 L199 87 M452 276 C500 302 477 350 444 361 M451 347 L442 362 L459 365" /><path className="sketch-faint" d="M66 80 C109 59 178 60 207 79" /></svg>
    <div className="sketch-browser">
      <div className="browser-bar"><span /><span /><span /><p>Your business, online</p></div>
      <div className="browser-content"><div className="mini-brand">Hello, customer.</div><div className="mini-heading">The right place.<br />The next step.</div><div className="mini-lines"><i /><i /></div><div className="mini-button">Let’s talk <span>↗</span></div><div className="mini-illustration"><svg viewBox="0 0 120 130" fill="none"><path d="M23 109 L100 108 L97 25 L28 23 Z M24 45 L98 45 M44 46 L43 108 M26 27 L16 46 L107 46 L98 26 M62 65 L84 65 L84 85 L61 85 Z M50 84 L53 84 M29 16 C49 12 76 13 95 17" /></svg></div></div>
    </div>
    <div className="sketch-slip"><span className="slip-check">✓</span><div><strong>One less thing to chase.</strong><span>A booking. An enquiry. A job done.</span></div></div>
    <div className="sketch-note note-bottom">Built around how you work.</div>
  </div>;
}

export default function AgencyPage() {
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="agency-header wrap">
      <a className="brand" href="/agency" aria-label="KS digital services home"><Mark /><span>Digital services<br /><small>Melbourne, Australia</small></span></a>
      <nav className="desktop-nav" aria-label="Main navigation">{nav.map(([label, id]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav>
      <a className="button nav-contact" href="#contact">Let’s talk <span aria-hidden="true">↗</span></a>
      <details className="mobile-nav"><summary>Menu</summary><nav aria-label="Mobile navigation">{nav.map(([label, id]) => <a key={id} href={`#${id}`}>{label}</a>)}<a href="#contact">Contact</a></nav></details>
    </header>
    <main id="main">
      <section className="hero wrap" aria-labelledby="hero-title">
        <div className="hero-copy"><p className="intro-label">Websites, AI & business software</p><h1 id="hero-title">Built around<br />your business.</h1><p className="hero-body">A better website. Less time on admin. The right tools for the way you work.</p><p className="hero-detail">We help small businesses get online, connect their systems and put AI to work on everyday tasks.</p><div className="hero-actions"><a className="button" href="#contact">Tell us what you need <span aria-hidden="true">↗</span></a><a className="text-link" href="#services">Explore our services <span aria-hidden="true">↓</span></a></div><p className="hero-credential"><span aria-hidden="true">✓</span> Led by a {aiCredential}</p></div>
        <Sketch />
      </section>
      <div className="intro-strip"><div className="wrap"><p>Practical digital help, from the first idea to the next improvement.</p><a href="#small-business">Here for small business <span aria-hidden="true">↙</span></a></div></div>

      <section id="services" className="section wrap" aria-labelledby="services-title">
        <div className="section-heading"><div><p className="section-label">What we do</p><h2 id="services-title">What needs to<br />work better?</h2></div><p>You might need a new website, a tool for your team, or a hand with what you already have. Start with the problem. We’ll help work out the right next step.</p></div>
        <div className="service-grid">{services.map((service) => <article className="service" key={service.id}><ServiceIcon service={service.id} /><h3>{service.title}</h3><p className="service-lead">{service.lead}</p><p>{service.examples}</p><details><summary>How we can help <span aria-hidden="true">+</span></summary><div className="service-detail"><p>{service.detail}</p><h4>A good place to start</h4><p>{service.fit}</p><a className="text-link" href="#contact">Talk about {service.title.toLowerCase()}</a></div></details></article>)}</div>
      </section>

      <section id="ai-agents" className="ai-section" aria-labelledby="ai-title">
        <div className="wrap">
          <div className="ai-intro">
            <div className="ai-copy">
              <p className="section-label">AI agents & business optimisation</p>
              <h2 id="ai-title">Give the busywork<br />a new job description.</h2>
              <p>We build AI agents that can work with your business tools, understand the task and move work forward. Think preparing a quote, checking a document or gathering everything your team needs to answer an enquiry.</p>
              <p>From Claude-powered assistants to connected, agentic workflows, we turn a promising idea into something you can use and measure.</p>
              <a className="text-link" href="#contact">Let’s find your first useful AI project <span aria-hidden="true">↗</span></a>
            </div>
            <div className="ai-example">
              <p className="hand-note">What could that look like?</p>
              <ol className="agent-flow">
                <li><span className="flow-marker" aria-hidden="true">↘</span><div><h3>An enquiry arrives</h3><p>A customer describes the work they need.</p></div></li>
                <li><span className="flow-marker" aria-hidden="true">↳</span><div><h3>Your agent does the legwork</h3><p>Finds the relevant information, checks what’s missing and prepares a draft response.</p></div></li>
                <li><span className="flow-marker" aria-hidden="true">✓</span><div><h3>Your team takes it from here</h3><p>Review the details, make the decision and send it on.</p></div></li>
              </ol>
              <p className="ai-example-note">One example. We design the workflow around your business.</p>
            </div>
          </div>
          <div className="ai-capabilities">{aiCapabilities.map((capability) => <article key={capability.title}><h3>{capability.title}</h3><p>{capability.description}</p></article>)}</div>
          <div className="ai-credential"><span className="credential-icon" aria-hidden="true">✓</span><div><strong>{aiCredential}</strong><p>AI architecture led by Kasper Simonsen.</p></div><a href="https://anthropic-partners.skilljar.com/page/partner-certifications" target="_blank" rel="noopener noreferrer">About the certification <span aria-hidden="true">↗</span></a></div>
        </div>
      </section>

      <section id="small-business" className="support-section" aria-labelledby="support-title"><div className="wrap support-layout"><div className="support-copy"><p className="section-label">Small-business support</p><h2 id="support-title">You don’t need a big project<br />to ask for a hand.</h2><p>Running a business leaves enough on your plate. If the website needs updating, the enquiries aren’t coming through, or the same spreadsheet is doing too many jobs, we can help you work through it.</p><a className="button" href="#contact">Tell us what’s getting in the way <span aria-hidden="true">↗</span></a></div><div className="support-note"><p className="hand-note">A few good places to start</p><ul><li>Fix or improve the website you already have</li><li>Make booking and enquiries easier</li><li>Connect tools that don’t talk to each other</li><li>Get practical advice before you invest</li><li>Keep improving as your business grows</li></ul><p>One-off help or ongoing support.<br />We agree the scope with you first.</p></div></div></section>

      <section id="who-we-help" className="section wrap" aria-labelledby="sectors-title"><div className="section-heading"><div><p className="section-label">Who we help</p><h2 id="sectors-title">Different businesses.<br />Familiar challenges.</h2></div><p>You know your business. We bring the technical help to make its next step easier. Here are some of the places that can start.</p></div><div className="sector-list">{sectors.map((sector) => <article key={sector.name}><div><h3>{sector.name}</h3><p className="sector-examples">{sector.examples}</p></div><p>{sector.need}</p></article>)}</div><p className="sector-footnote">Don’t see your business here? <a href="#contact">Tell us what you’re working on.</a></p></section>

      <OfficeInvitation />

      <section id="about" className="section wrap about-section" aria-labelledby="about-title"><div className="about-intro"><p className="section-label">A straightforward way to work</p><h2 id="about-title">A conversation.<br />A clear plan.<br />Something useful.</h2><p>KS is a digital practice led by Kasper Simonsen, a software engineer and {aiCredential} based in Melbourne. You work directly with the person responsible for the build, from the first conversation through to handover.</p></div><ol className="process"><li><span>01</span><div><h3>Tell us what’s happening</h3><p>We start with your business, the people using your tools and what you want to improve. You don’t need a technical brief.</p></div></li><li><span>02</span><div><h3>Agree the next step</h3><p>You get a clear scope, approach and price before work starts. If a small change will do the job, that’s where we start.</p></div></li><li><span>03</span><div><h3>Build, try it, put it to work</h3><p>You see progress along the way. We test the agreed workflows, help you get comfortable with the result and agree any support you need.</p></div></li></ol></section>

      <section id="contact" className="contact-section" aria-labelledby="contact-title"><div className="wrap contact-layout"><div className="contact-copy"><p className="section-label">Let’s talk</p><h2 id="contact-title">What would make<br />your working day<br />a little easier?</h2><p>Tell us about your business and what you have in mind. It’s fine if you’re still figuring it out.</p><a className="email-link" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a><p className="contact-location">Melbourne, Australia</p><div className="contact-handnote">Start with a conversation.</div></div><EnquiryForm /></div></section>
    </main>
    <footer className="wrap agency-footer"><a className="brand" href="/agency"><Mark /><span>Digital services<br /><small>Led by Kasper Simonsen</small></span></a><p>Websites, AI and practical support.</p><div><a href="#about">About KS</a><a href="/office">Interactive office</a><a href="/services/industrial-automation">Industrial automation <span aria-hidden="true">↗</span></a><a href="#contact">Contact</a></div></footer>
  </>;
}
