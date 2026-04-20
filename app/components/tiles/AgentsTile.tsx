const nodes = [
  { cx: 7,   label: "PM" },
  { cx: 28,  label: "CODE" },
  { cx: 49,  label: "STD" },
  { cx: 70,  label: "I/O" },
  { cx: 91,  label: "SAFE" },
  { cx: 112, label: "LIB" },
  { cx: 133, label: "AUDIT" },
];

const dimNodes = new Set([3, 4]);
const monoStyle = { fontFamily: "var(--font-geist-mono), ui-monospace, monospace" };

export default function AgentsTile() {
  return (
    <div
      className="flex flex-col gap-3 p-5 min-h-[160px]"
      style={{ borderRight: "0.5px solid var(--border)" }}
    >
      <p className="text-[10px] tracking-[0.06em] uppercase" style={{ ...monoStyle, color: "var(--text-dim)" }}>
        LLM Agents
      </p>
      <p className="text-[40px] font-medium leading-none tracking-tight" style={{ ...monoStyle, color: "var(--text-primary)" }}>
        07
      </p>
      <div className="mt-auto space-y-2">
        <svg viewBox="0 0 140 14" style={{ width: "100%", height: "14px", display: "block" }} aria-label="Seven-agent pipeline">
          <line x1="7" y1="7" x2="133" y2="7" stroke="var(--accent)" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.55" />
          {nodes.map(({ cx }, i) => (
            <circle key={i} cx={cx} cy="7" r="3.2" fill={dimNodes.has(i) ? "#ffffff" : "var(--accent)"} />
          ))}
        </svg>
        <div className="flex justify-between">
          {nodes.map(({ label }) => (
            <span key={label} style={{ ...monoStyle, fontSize: "8px", color: "var(--text-dim)" }}>
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
