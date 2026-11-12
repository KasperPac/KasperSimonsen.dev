import Image from "next/image";
import { heroWork } from "./content";

/** Real client work at the top of the page: one site in a browser frame and on a phone. */
export default function HeroWork() {
  const { name, detail, image } = heroWork;
  return (
    <figure className="hero-work">
      <p className="hero-work-note">
        One of ours.
        <svg viewBox="0 0 60 44" fill="none" aria-hidden="true" focusable="false"><path d="M4 8 C22 5 40 13 50 34 M38 31 L51 36 L54 22" /></svg>
      </p>
      <div className="work-browser">
        <div className="work-browser-bar" aria-hidden="true"><i /><i /><i /></div>
        <Image src={image.src} alt={image.alt} width={image.width} height={image.height} sizes="(max-width: 800px) 82vw, (max-width: 1100px) 42vw, 535px" loading="eager" fetchPriority="high" />
      </div>
      {/* The phone repeats the desktop capture, cropped to its centre, until a reviewed phone capture exists.
          It is cropped by height, so it needs the same source width as the browser frame to stay sharp. */}
      <div className="work-phone" aria-hidden="true">
        <Image src={image.src} alt="" width={image.width} height={image.height} sizes="(max-width: 800px) 82vw, (max-width: 1100px) 42vw, 535px" loading="eager" />
      </div>
      <figcaption><strong>{name}</strong> <span>{detail}</span></figcaption>
    </figure>
  );
}
