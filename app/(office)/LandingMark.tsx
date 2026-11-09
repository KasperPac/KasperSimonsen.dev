import { COPY } from "@/office/copy";
import { BOX, HEAD, K, S, STEPS, rope, ropeSide, type Polyline } from "@/office/neon/mark";
import { STEP_S } from "@/office/neon/sequence";

const points = (line: Polyline) => line.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
const size = BOX.max - BOX.min;
const stepMs = Math.round(STEP_S * 1000);

const frames = Array.from({ length: STEPS }, (_, step) => ({
  step,
  side: ropeSide(step),
  points: points(rope(step, 24)),
}));

function renderRope(frame: (typeof frames)[number]) {
  return (
    <g
      key={frame.step}
      className="site-mark-rope"
      data-step={frame.step}
      style={{
        animationDuration: `${STEPS * stepMs}ms`,
        animationDelay: `${(frame.step - STEPS) * stepMs}ms`,
      }}
    >
      {frame.side === "front" && <polyline points={frame.points} stroke="#000" strokeWidth="4" />}
      <polyline points={frame.points} />
    </g>
  );
}

export default function LandingMark() {
  return (
    <figure className="site-mark">
      <svg viewBox={`${BOX.min} ${BOX.min} ${size} ${size}`} fill="none" aria-hidden="true">
        {frames.filter((frame) => frame.side === "back").map(renderRope)}
        <g className="site-mark-letters" fill="#000">
          <polygon points={points(K)} />
          <polygon points={points(S)} />
        </g>
        {frames.filter((frame) => frame.side === "front").map(renderRope)}
        <circle {...HEAD} fill="#000" />
      </svg>
      <figcaption>
        <label className="site-mark-control">
          <input type="checkbox" />
          {COPY.entry.pause}
        </label>
      </figcaption>
    </figure>
  );
}
