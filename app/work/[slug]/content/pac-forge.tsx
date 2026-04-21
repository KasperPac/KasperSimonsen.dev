const mono  = { fontFamily: "var(--font-geist-mono), ui-monospace, monospace" };
const serif = { fontFamily: "var(--font-fraunces), 'Instrument Serif', Georgia, serif" };
const body  = { fontFamily: "var(--font-instrument-sans), system-ui, -apple-system, sans-serif" };

const agents = [
  { id: "PM",   name: "Product Manager",   desc: "Parses the natural-language spec, resolves ambiguity, emits a structured requirements object." },
  { id: "CODE", name: "Code Architect",     desc: "Generates raw SCL function blocks from the requirements and the pattern library." },
  { id: "STD",  name: "Standards Reviewer", desc: "Validates output against site-specific coding standards and naming conventions." },
  { id: "I/O",  name: "IO Validator",       desc: "Cross-references every address against the project's IO list. Rejects phantom tags." },
  { id: "SAFE", name: "Safety Auditor",     desc: "Checks for unsafe constructs — missing interlocks, unguarded actuator commands, inhibit bypass logic." },
  { id: "LIB",  name: "Pattern Librarian",  desc: "Pulls relevant WRONG/CORRECT examples from the learning library and injects them into context." },
  { id: "ORC",  name: "Orchestrator",       desc: "Sequences agents, manages retries, resolves conflicts, and decides when output is ready to compile." },
];

const hardBits = [
  {
    title: "Orchestrating seven agents deterministically",
    paras: [
      "The core problem: LLM outputs are non-deterministic, but PLC code must compile every time. Each agent has a defined interface — a structured input schema and a structured output schema — and the orchestrator enforces this contract. If an agent returns output that doesn't parse against the schema, the run fails fast rather than silently propagating garbage.",
      "Agent sequencing uses a topological sort over a static dependency graph. The Pattern Librarian runs early so its output is available to the Code Architect; the Safety Auditor runs after IO validation so it can reason about real addresses. The orchestrator manages retries with exponential backoff and a maximum attempt ceiling per agent. Lease-based concurrency via Supabase row-level locking ensures only one pipeline can write to a given project at a time — preventing two engineers from stomping each other's in-flight runs.",
    ],
  },
  {
    title: "Auto-learning from compile errors",
    paras: [
      "Every compile result from TIA Portal gets ingested back into the system. A compile failure produces a structured error list — error code, line number, message. A deterministic diff engine compares the failed code against the engineer's manual correction to produce a WRONG/CORRECT example pair. These pairs are stored in the pattern library tagged by error type, involved function block, and originating agent.",
      "When a new run starts, the Pattern Librarian queries the library for semantically similar examples and injects them into the Code Architect's context as few-shot guidance. The system gets measurably better at the specific patterns that have failed before — without retraining the model.",
    ],
  },
  {
    title: "The TIA Openness bridge",
    paras: [
      "TIA Portal has no REST API. The only programmatic interface is TIA Openness — a COM-style .NET library that ships with TIA Portal and requires a .NET Framework 4.8 process running on the same Windows machine as TIA Portal itself.",
      "The bridge is a C# console app that wraps TIA Openness and exposes an HTTP + WebSocket server on port 5102. The web app sends compiled SCL blocks to this server; the bridge opens the TIA project, imports the blocks, triggers a compile, and streams the error list back via WebSocket. The bridge process launches on demand and shuts down on idle — so it doesn't hold the TIA Portal project open between runs.",
    ],
  },
  {
    title: "Lease-based concurrency",
    paras: [
      "Supabase Postgres handles concurrency coordination. Each pipeline run acquires a row-level lease on the target project with a 90-second TTL. Auto-renewing keepalives extend the lease while the run is active. If the client disconnects or the run exceeds the TTL without renewal, the lease expires and the project becomes available again.",
      "This prevents two simultaneous pipeline runs from producing conflicting SCL for the same project — a scenario that would either overwrite good code or produce an unresolvable merge conflict in TIA Portal.",
    ],
  },
];

export default function PacForgeContent() {
  return (
    <div className="space-y-14">

      {/* Opening */}
      <div className="space-y-4 max-w-[68ch]">
        <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
          Pac-Forge is an internal productivity tool for industrial automation engineers. Its flagship module, Pac-ST, takes a natural-language control requirement and produces compilable Siemens Structured Control Language — the programming language of TIA Portal, which runs on a large share of factory automation hardware worldwide.
        </p>
        <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
          The challenge isn't generating plausible-looking SCL. Any capable model can do that. The challenge is generating SCL that compiles first-pass against a specific TIA Portal project, respects site-specific standards and IO mappings, passes a safety audit, and gets better over time as engineers correct it.
        </p>
      </div>

      {/* The problem */}
      <section className="space-y-4 max-w-[68ch]">
        <h2 className="text-[2rem] italic leading-tight mb-5" style={{ ...serif, color: "var(--text-primary)" }}>
          The problem
        </h2>
        <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
          Automation engineers spend a disproportionate amount of time writing boilerplate SCL. Motor start sequences, valve control blocks, PID loops with handoff logic — the patterns are repetitive but the implementation details are site-specific enough that generic templates don't compile. Every project has its own IO list, naming conventions, and safety constraints. Copying code from a previous project is faster than writing from scratch, but it still requires careful adaptation and produces subtle bugs when the adaptation is wrong.
        </p>
        <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
          No commercial tool generates PLC code that's immediately compilable against a real TIA project — and none of them learn from corrections. Pac-Forge was built to close that gap.
        </p>
      </section>

      {/* Shape of the system */}
      <section className="space-y-6">
        <h2 className="text-[2rem] italic leading-tight mb-5" style={{ ...serif, color: "var(--text-primary)" }}>
          The shape of the system
        </h2>

        {/* Agent pipeline diagram */}
        <div
          className="p-5 space-y-4 overflow-x-auto"
          style={{ background: "#0f0f0f", border: "0.5px solid var(--border)" }}
        >
          <div className="flex items-center gap-0 min-w-[520px]">
            {agents.map((agent, i) => (
              <div key={agent.id} className="flex items-center">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className="w-8 h-8 flex items-center justify-center text-[9px] font-medium"
                    style={{
                      ...mono,
                      background: "var(--border)",
                      color: i === 6 ? "var(--text-primary)" : "var(--accent)",
                      border: `0.5px solid ${i === 6 ? "var(--text-dim)" : "var(--accent)"}44`,
                    }}
                  >
                    {agent.id}
                  </div>
                </div>
                {i < agents.length - 1 && (
                  <div className="w-5 h-[0.5px] flex-shrink-0" style={{ background: "var(--border)" }} />
                )}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {agents.map((agent) => (
              <div key={agent.id} className="flex gap-2">
                <span className="text-[10px] flex-shrink-0 w-[28px] pt-0.5" style={{ ...mono, color: "var(--accent)" }}>
                  {agent.id}
                </span>
                <span className="text-[11px] leading-snug" style={{ ...body, color: "var(--text-dim)" }}>
                  <span style={{ color: "var(--text-muted)" }}>{agent.name}. </span>
                  {agent.desc}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 max-w-[68ch]">
          <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
            A React 19 front end communicates with a Supabase backend. When an engineer submits a requirement, it enters the pipeline above. Each agent operates on structured data — not raw text — with defined input and output schemas enforced by the orchestrator. The final output is a function block in SCL, ready to be compiled.
          </p>
          <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
            Compilation happens locally on the engineer's machine via a .NET bridge process that wraps TIA Openness. The bridge receives SCL over HTTP, imports it into the active TIA project, triggers a compile, and streams the error list back via WebSocket. The whole round-trip — generation to compile result — takes under two minutes on a warm run.
          </p>
        </div>
      </section>

      {/* The hard bits */}
      <section className="space-y-10">
        <h2 className="text-[2rem] italic leading-tight" style={{ ...serif, color: "var(--text-primary)" }}>
          The hard bits
        </h2>
        {hardBits.map((section) => (
          <div key={section.title} className="space-y-4 max-w-[68ch]">
            <h3 className="text-[1.4rem] italic leading-snug" style={{ ...serif, color: "var(--text-primary)" }}>
              {section.title}
            </h3>
            {section.paras.map((para, i) => (
              <p key={i} className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
                {para}
              </p>
            ))}
          </div>
        ))}
      </section>

      {/* The result */}
      <section className="space-y-4 max-w-[68ch]">
        <h2 className="text-[2rem] italic leading-tight mb-5" style={{ ...serif, color: "var(--text-primary)" }}>
          The result
        </h2>
        <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
          Engineers produce compilable SCL from natural language descriptions in under two minutes on warm runs. The pattern library grows continuously as engineers correct output — the system has accumulated hundreds of WRONG/CORRECT pairs covering the most common error classes. First-pass compile success rates have improved significantly since launch.
        </p>
        <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
          Pac-ST is actively used in production. The secondary module, Pac-LAD — Ladder Logic diagram generation — is in development.
        </p>
      </section>

    </div>
  );
}
