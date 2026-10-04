import Link from "next/link";
import Arrow from "./Arrow";

export default function V2Nav() {
  return (
    <nav className="v2-nav" aria-label="Main">
      <a href="/v2" className="v2-logo">
        Kasper Simonsen
      </a>
      <div className="v2-nav-links">
        <a href="/v2#work">Work</a>
        <a href="/v2#services">Services</a>
        <a href="/v2#process">Process</a>
        <a href="/v2#contact">Contact</a>
      </div>
      <Link href="/contact" className="v2-outline-btn">
        Discovery call <Arrow />
      </Link>
    </nav>
  );
}
