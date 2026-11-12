import Image from "next/image";
import { heroWork } from "./content";

/** Real work at the top of the page: one site in a browser frame, and the same site on a phone. */
export default function HeroWork() {
  const { note, name, detail, browser, phone } = heroWork;
  return (
    <figure className="hero-work">
      <p className="hero-work-note">
        {note}
        <svg viewBox="0 0 60 44" fill="none" aria-hidden="true" focusable="false"><path d="M4 8 C22 5 40 13 50 34 M38 31 L51 36 L54 22" /></svg>
      </p>
      <div className="work-browser">
        <div className="work-browser-bar" aria-hidden="true"><i /><i /><i /></div>
        <Image src={browser.src} alt={browser.alt} width={browser.width} height={browser.height} sizes="(max-width: 800px) 82vw, (max-width: 1100px) 42vw, 535px" loading="eager" fetchPriority="high" />
      </div>
      <div className="work-phone" aria-hidden="true">
        <Image src={phone.src} alt="" width={phone.width} height={phone.height} sizes="(max-width: 800px) 24vw, 150px" loading="eager" />
      </div>
      <figcaption><strong>{name}</strong> <span>{detail}</span></figcaption>
    </figure>
  );
}
