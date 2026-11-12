import { CONTACT_EMAIL } from "@/content/contact";
import { aiCapabilities, aiCredential, aiExample, aiSteps, sectors, services, supportStarts } from "@/agency/content";
import { exampleScreens } from "@/agency/AgentExample";
import EnquiryForm from "@/agency/EnquiryForm";
import HeroWork from "@/agency/HeroWork";
import OfficeInvitation from "@/agency/OfficeInvitation";
import ServiceSketch from "@/agency/ServiceSketch";
import Tick from "@/agency/Tick";

function Mark() {
  return <img src="/agency/ks-mark.svg" width="68" height="56" alt="KS" />;
}

const nav = [["Services", "services"], ["AI & agents", "ai-agents"], ["Who we help", "who-we-help"], ["The office", "the-office"]] as const;

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
        <div className="hero-copy">
          <p className="intro-label">Websites, AI & business software</p>
          <h1 id="hero-title">Built around<br />your business.</h1>
          <p className="hero-body">A better website. Less time on admin. The right tools for the way you work.</p>
          <p className="hero-detail">We help small businesses get online, connect their systems and put AI to work on everyday tasks.</p>
          <div className="hero-actions">
            <a className="button button-accent" href="#contact">Tell us what you need <span aria-hidden="true">↗</span></a>
            <a className="text-link" href="#services">Explore our services <span aria-hidden="true">↓</span></a>
          </div>
          <p className="hero-credential"><span className="tick-badge"><Tick /></span>Led by a {aiCredential}</p>
        </div>
        <HeroWork />
      </section>
      <div className="intro-strip"><div className="wrap"><p>Practical digital help, from the first idea to the next improvement.</p><a href="#small-business">Here for small business <span aria-hidden="true">↙</span></a></div></div>

      <section id="services" className="section wrap" aria-labelledby="services-title">
        <div className="section-heading section-heading-stacked">
          <div><p className="section-label">What we do</p><h2 id="services-title">What needs to work better?</h2></div>
          <p>You might need a new website, a tool for your team, or a hand with what you already have. Start with the problem. We’ll help work out the right next step.</p>
        </div>
        <div className="service-grid">
          {services.map((service) => (
            <article className="service" key={service.id}>
              <div className="service-plate"><ServiceSketch service={service.id} /></div>
              <div className="service-text">
                <h3>{service.title}</h3>
                <p className="service-lead">{service.lead}</p>
                <p>{service.examples}</p>
                <details>
                  <summary>How we can help <span aria-hidden="true">+</span></summary>
                  <div className="service-detail">
                    <p>{service.detail}</p>
                    <h4>A good place to start</h4>
                    <p>{service.fit}</p>
                    <a className="text-link" href="#contact">{service.talk}</a>
                  </div>
                </details>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="ai-agents" className="ai-section" aria-labelledby="ai-title">
        <div className="wrap">
          <div className="ai-top">
            <div>
              <p className="section-label">AI agents & business optimisation</p>
              <h2 id="ai-title">Give the busywork<br />a new job description.</h2>
            </div>
            <div className="ai-lede">
              <p>We build AI agents that can work with your business tools, understand the task and move work forward. Think preparing a quote, checking a document or gathering everything your team needs to answer an enquiry.</p>
              <a className="text-link" href="#contact">Let’s find your first useful AI project <span aria-hidden="true">↗</span></a>
            </div>
          </div>
          <div className="ai-flow">
            <h3 className="ai-flow-title">What could that look like?</h3>
            <ol className="ai-steps">
              {aiSteps.map((step, index) => {
                const Screen = exampleScreens[index];
                return (
                  <li key={step.title}>
                    <span className="ai-step-number" aria-hidden="true">{index + 1}</span>
                    <h4>{step.title}</h4>
                    <p className="sr-only">{step.text}</p>
                    {Screen ? <Screen /> : null}
                  </li>
                );
              })}
            </ol>
            <p className="ai-example-note">{aiExample.note}</p>
          </div>
          <div className="ai-capabilities">{aiCapabilities.map((capability) => <article key={capability.title}><h3>{capability.title}</h3><p>{capability.description}</p></article>)}</div>
          <div className="ai-credential"><span className="credential-icon"><Tick /></span><div><strong>{aiCredential}</strong><p>AI architecture led by Kasper Simonsen.</p></div><a href="https://anthropic-partners.skilljar.com/page/partner-certifications" target="_blank" rel="noopener noreferrer">About the certification <span aria-hidden="true">↗</span></a></div>
        </div>
      </section>

      <section id="small-business" className="support-section" aria-labelledby="support-title">
        <div className="wrap support-layout">
          <div className="support-copy">
            <p className="section-label">Small-business support</p>
            <h2 id="support-title">You don’t need a big project<br />to ask for a hand.</h2>
            <p>Running a business leaves enough on your plate. If the website needs updating, the enquiries aren’t coming through, or the same spreadsheet is doing too many jobs, we can help you work through it.</p>
            <a className="button button-accent" href="#contact">Tell us what’s getting in the way <span aria-hidden="true">↗</span></a>
          </div>
          <div className="support-note">
            <h3 className="support-note-title">A few good places to start</h3>
            <ul>{supportStarts.map((start) => <li key={start}><span className="tick-badge"><Tick /></span>{start}</li>)}</ul>
            <p>One-off help or ongoing support.<br />We agree the scope with you first.</p>
          </div>
        </div>
      </section>

      <section id="who-we-help" className="section wrap" aria-labelledby="sectors-title"><div className="section-heading"><div><p className="section-label">Who we help</p><h2 id="sectors-title">Different businesses.<br />Familiar challenges.</h2></div><p>You know your business. We bring the technical help to make its next step easier. Here are some of the places that can start.</p></div><div className="sector-list">{sectors.map((sector) => <article key={sector.name}><div><h3>{sector.name}</h3><p className="sector-examples">{sector.examples}</p></div><p>{sector.need}</p></article>)}</div><p className="sector-footnote">Don’t see your business here? <a href="#contact">Tell us what you’re working on.</a></p></section>

      <OfficeInvitation />

      <section id="about" className="section wrap about-section" aria-labelledby="about-title"><div className="about-intro"><p className="section-label">A straightforward way to work</p><h2 id="about-title">A conversation.<br />A clear plan.<br />Something useful.</h2><p>KS is a digital practice led by Kasper Simonsen, a software engineer and {aiCredential} based in Melbourne. You work directly with the person responsible for the build, from the first conversation through to handover.</p></div><ol className="process"><li><span>01</span><div><h3>Tell us what’s happening</h3><p>We start with your business, the people using your tools and what you want to improve. You don’t need a technical brief.</p></div></li><li><span>02</span><div><h3>Agree the next step</h3><p>You get a clear scope, approach and price before work starts. If a small change will do the job, that’s where we start.</p></div></li><li><span>03</span><div><h3>Build, try it, put it to work</h3><p>You see progress along the way. We test the agreed workflows, help you get comfortable with the result and agree any support you need.</p></div></li></ol></section>

      <section id="contact" className="contact-section" aria-labelledby="contact-title"><div className="wrap contact-layout"><div className="contact-copy"><p className="section-label">Let’s talk</p><h2 id="contact-title">What would make<br />your working day<br />a little easier?</h2><p>Tell us about your business and what you have in mind. It’s fine if you’re still figuring it out.</p><a className="email-link" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a><p className="contact-location">Melbourne, Australia</p></div><EnquiryForm /></div></section>
    </main>
    <footer className="wrap agency-footer"><a className="brand" href="/agency"><Mark /><span>Digital services<br /><small>Led by Kasper Simonsen</small></span></a><p>Websites, AI and practical support.</p><div><a href="#about">About KS</a><a href="/office">Interactive office</a><a href="/services/industrial-automation">Industrial automation <span aria-hidden="true">↗</span></a><a href="#contact">Contact</a></div></footer>
  </>;
}
