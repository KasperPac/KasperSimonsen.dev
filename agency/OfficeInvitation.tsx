/** A lightweight doorway into the separate interactive portfolio. */
export default function OfficeInvitation() {
  return (
    <section id="the-office" className="office-section" aria-labelledby="office-title">
      <a className="wrap office-visit" href="/office" aria-labelledby="office-action" aria-describedby="office-description">
        <div className="office-invitation-copy">
          <p className="section-label">The interactive portfolio</p>
          <h2 id="office-title">The door’s open.</h2>
          <p id="office-description">Fancy a look around? Step inside Kasper’s interactive office and explore the projects on the record player.</p>
          <span className="button" id="office-action">Step into the office <span aria-hidden="true">↗</span></span>
        </div>

        <div className="office-drawing" aria-hidden="true">
          <span className="office-door-note">Curiosity welcome.</span>
          <svg className="office-door-surround" viewBox="0 0 460 400" fill="none">
            <path d="M81 62 C106 66 127 79 139 102 M127 98 L140 104 L141 90" />
            <path d="M38 337 C135 334 264 339 418 335 M104 351 L333 354 L351 374 L83 371 Z" />
            <path className="door-retrace" d="M146 51 L327 50 L330 337 M39 341 L99 340" />
          </svg>
          <div className="office-doorway">
            <svg className="office-interior" viewBox="0 0 180 280" fill="none">
              <path d="M12 244 L28 224 L180 224 M58 183 L174 182 M66 184 L65 239 M167 182 L169 239" />
              <path d="M92 125 L156 124 L156 160 L92 161 Z M123 161 L124 180 M110 180 L138 180 M101 133 L147 132" />
              <path d="M20 202 L48 203 L44 230 L24 230 Z M34 202 C34 174 34 161 31 146 M33 183 C13 181 12 169 14 164 C31 166 33 174 33 183 M34 171 C46 170 54 159 52 151 C39 154 33 164 34 171" />
              <path d="M90 74 L163 74 M99 74 L99 49 L112 49 L112 74 M115 73 L115 42 L128 42 L128 73 M135 49 L144 46 L153 71" />
            </svg>
            <div className="office-door">
              <div className="office-door-panel">
                <img src="/agency/ks-mark.svg" width="68" height="56" alt="" />
                <span>The office</span>
              </div>
              <span className="office-door-handle" />
            </div>
          </div>
        </div>
      </a>
    </section>
  );
}
