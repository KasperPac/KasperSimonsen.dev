import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Single registration point for GSAP. Import `gsap`, `useGSAP` and plugins from here (never straight
 * from "gsap/*") so registration runs once, and only in bundles that animate with GSAP. Add a plugin
 * here when a feature starts using it.
 */
gsap.registerPlugin(useGSAP, ScrollTrigger);

export { gsap, useGSAP, ScrollTrigger };
