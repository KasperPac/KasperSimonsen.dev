import type { services } from "./content";

type ServiceId = (typeof services)[number]["id"];

export default function ServiceIcon({ service }: { service: ServiceId }) {
  return (
    <div className="service-icon" aria-hidden="true">
      {service === "websites" ? <span className="service-web-address">www.</span> : (
        <svg viewBox="0 0 80 64" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" focusable="false">
          {service === "software" ? (
            <>
              <path d="M10 9 L69 8 Q73 8 73 12 L72 52 Q72 55 68 55 L10 56 Q7 56 7 52 L7 13 Q7 9 10 9 Z M7 19 L73 18 M22 19 L22 55" />
              <path d="M12 14 H14 M18 14 H20 M12 27 H17 M12 34 H17 M12 41 H17 M28 25 H42 M28 30 H37" />
              <path d="M29 46 L34 46 L34 38 L29 38 Z M40 46 L45 46 L45 34 L40 34 Z M51 46 L56 46 L56 27 L51 27 Z M62 46 L67 46 L67 35 L62 35 Z" />
            </>
          ) : service === "automation" ? (
            <>
              <path d="M3 23 L13 23 L18 28 L18 44 L3 44 Z M13 23 L13 29 L18 29 M7 34 H13 M7 38 H12" />
              <path d="M19 33 L28 33 M24 29 L28 33 L24 37" />
              <path d="M35 15 L50 15 Q55 15 55 20 L55 45 Q55 49 50 49 L35 49 Q30 49 30 44 L30 20 Q30 15 35 15 Z" />
              <text x="42.5" y="37" textAnchor="middle" fill="currentColor" stroke="none" fontSize="15" fontWeight="500">AI</text>
              <path d="M57 33 L65 33 M61 29 L65 33 L61 37 M67 23 L77 23 L77 44 L67 44 M67 32 L70 35 L75 29" />
            </>
          ) : (
            <>
              <path d="M10 11 L59 10 Q62 10 62 14 L62 45 L7 45 L7 15 Q7 11 10 11 Z M7 20 L61 19 M3 49 L26 49 L29 52 L42 52 L45 49 L68 49 L64 56 L8 56 Z" />
              <path d="M17 32 L22 37 L31 27" />
              <path className="service-tool" d="M66 8 C57 5 49 13 52 22 L35 39 C33 41 33 44 35 46 C37 48 40 48 42 46 L59 29 C68 32 76 24 73 15 L66 22 L59 15 Z" />
            </>
          )}
        </svg>
      )}
    </div>
  );
}
