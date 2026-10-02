import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Single registration point for GSAP. Import `gsap`, `useGSAP` and plugins from here (never straight
 * from "gsap/*") so registration runs once, and only in bundles that animate with GSAP. Add a plugin
 * here when a feature starts using it.
 */
gsap.registerPlugin(useGSAP, ScrollTrigger);

// The walk-in scrub must track the scroll position in real time. Default lag smoothing counts any frame
// over 500 ms as 33 ms, so on a slow device (or software WebGL in e2e, ~2 fps) the camera crawls behind
// the scroll for tens of seconds. Off, a hitch just jumps the scrub to where the scroll already is.
gsap.ticker.lagSmoothing(0);

export { gsap, useGSAP, ScrollTrigger };
