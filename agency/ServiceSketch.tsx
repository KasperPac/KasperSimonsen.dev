import type { services } from "./content";
import { sketches } from "./sketches";

type ServiceId = (typeof services)[number]["id"];

/** One of the board's pen sketches for a service. Decorative: it sits beside the service's visible heading. */
export default function ServiceSketch({ service }: { service: ServiceId }) {
  const { viewBox, paths } = sketches[service];
  return (
    <svg className="service-sketch" viewBox={viewBox} fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {paths.map((path, index) => (
        <path key={index} d={path.d} className={"fill" in path ? `sketch-${path.fill}` : undefined} stroke={"stroke" in path ? "none" : undefined} />
      ))}
    </svg>
  );
}
