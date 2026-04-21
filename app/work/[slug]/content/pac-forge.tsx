const mono  = { fontFamily: "var(--font-geist-mono), ui-monospace, monospace" };
const serif = { fontFamily: "var(--font-fraunces), 'Instrument Serif', Georgia, serif" };
const body  = { fontFamily: "var(--font-instrument-sans), system-ui, -apple-system, sans-serif" };

const agents = [
  { id: "PM",   name: "Project Manager",    desc: "Plans the run, delegates to specialists, and writes the final report." },
  { id: "CODE", name: "Code Architect",     desc: "Writes SCL function blocks, function calls, data blocks, and UDTs in the right TIA import order." },
  { id: "STD",  name: "Standards Enforcer", desc: "Reviews generated blocks against IEC 61131-3 and project-specific naming and style rules." },
  { id: "I/O",  name: "IO Validator",       desc: "Cross-checks every signal against the IO list. Catches address conflicts, type mismatches, and orphan tags." },
  { id: "SAFE", name: "Safety Auditor",     desc: "Rule-based checks for emergency-stop handling, unguarded actuators, SIL/PL compliance, and safety-FB misuse." },
  { id: "LIB",  name: "Pattern Librarian",  desc: "Watches every correction, classifies it, and turns it into a pattern for future runs." },
  { id: "HMI",  name: "HMI Designer",       desc: "Lays out ISA-101 WinCC Comfort screens, navigation, and faceplates from the machine model." },
  { id: "TAG",  name: "HMI Tag Linker",     desc: "Wires each screen element to the correct PLC data block variable with the right acquisition cycle and type mapping." },
];

const pillarNotes = [
  "FDS Builder — structured interview + fidelity review",
  "Pac-Audit — deterministic extract + AI for inferential facts only",
  "Derived spec — machine hierarchy (System → Subsystem → Assembly → Device)",
  "Forge Wizard — eight-agent generation + PLCsim validation",
  "TIA project — imported + compiled via .NET Openness bridge",
];

const nodeStyle = {
  ...mono,
  color: "var(--text-muted)",
  fontSize: 11,
  whiteSpace: "nowrap" as const,
};

const specNodeStyle = {
  ...mono,
  color: "var(--text-primary)",
  fontSize: 11,
  padding: "0.5rem 0.75rem",
  border: "0.5px solid rgba(255,90,31,0.4)",
  background: "rgba(255,90,31,0.05)",
  textAlign: "center" as const,
  whiteSpace: "nowrap" as const,
};

const arrow = <span style={{ color: "var(--accent)", fontSize: 10, ...mono }}>→</span>;

function ShapeDiagram() {
  return (
    <div
      className="p-5 overflow-x-auto"
      style={{ background: "#0f0f0f", border: "0.5px solid var(--border)" }}
    >
      <div
        className="grid items-center"
        style={{
          gridTemplateColumns:
            "auto 20px auto 64px auto 20px auto 20px auto",
          gridTemplateRows: "1.75rem 1.75rem",
          columnGap: 0,
          rowGap: "1rem",
          minWidth: 680,
        }}
      >
        {/* Row 1: Instrument register → FDS Builder */}
        <span style={{ gridColumn: 1, gridRow: 1, ...nodeStyle }}>Instrument register</span>
        <span style={{ gridColumn: 2, gridRow: 1, textAlign: "center" }}>{arrow}</span>
        <span style={{ gridColumn: 3, gridRow: 1, ...nodeStyle }}>FDS Builder</span>

        {/* Row 2: Legacy TIA project → Pac-Audit */}
        <span style={{ gridColumn: 1, gridRow: 2, ...nodeStyle }}>Legacy TIA project</span>
        <span style={{ gridColumn: 2, gridRow: 2, textAlign: "center" }}>{arrow}</span>
        <span style={{ gridColumn: 3, gridRow: 2, ...nodeStyle }}>Pac-Audit</span>

        {/* Y-merge connector (spans both rows) */}
        <div
          style={{
            gridColumn: 4,
            gridRow: "1 / 3",
            position: "relative",
            width: 64,
            height: 72,
            alignSelf: "center",
            justifySelf: "center",
          }}
        >
          {/* top branch */}
          <div style={{ position: "absolute", top: "20%", left: 0, width: "50%", borderBottom: "0.5px solid var(--border)" }} />
          {/* bottom branch */}
          <div style={{ position: "absolute", top: "80%", left: 0, width: "50%", borderBottom: "0.5px solid var(--border)" }} />
          {/* vertical join */}
          <div style={{ position: "absolute", top: "20%", height: "60%", left: "50%", borderLeft: "0.5px solid var(--border)" }} />
          {/* horizontal out */}
          <div style={{ position: "absolute", top: "50%", left: "50%", right: 8, borderTop: "0.5px solid var(--border)" }} />
          {/* arrowhead */}
          <span
            style={{
              position: "absolute",
              top: "50%",
              right: 0,
              transform: "translateY(-55%)",
              color: "var(--accent)",
              fontSize: 10,
              ...mono,
            }}
          >
            →
          </span>
        </div>

        {/* Derived spec (convergence node, spans both rows) */}
        <span style={{ gridColumn: 5, gridRow: "1 / 3", ...specNodeStyle }}>Derived spec</span>

        {/* Serial tail → Forge Wizard → TIA project */}
        <span style={{ gridColumn: 6, gridRow: "1 / 3", textAlign: "center" }}>{arrow}</span>
        <span style={{ gridColumn: 7, gridRow: "1 / 3", ...nodeStyle }}>Forge Wizard</span>
        <span style={{ gridColumn: 8, gridRow: "1 / 3", textAlign: "center" }}>{arrow}</span>
        <span style={{ gridColumn: 9, gridRow: "1 / 3", ...nodeStyle }}>TIA project</span>
      </div>

      {/* Edge legend */}
      <div
        className="mt-5 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2"
        style={{ borderTop: "0.5px solid var(--border)" }}
      >
        {pillarNotes.map((label) => (
          <p key={label} className="text-[11px] leading-snug" style={{ ...mono, color: "var(--text-dim)" }}>
            {label}
          </p>
        ))}
      </div>
    </div>
  );
}

const hardBits = [
  {
    title: "Eight agents, one pipeline",
    paras: [
      "Everything Forja produces comes from eight agents. The Project Manager plans the run and delegates. The Code Architect writes SCL. The Standards Enforcer, IO Validator, and Safety Auditor each review blocks against their own rules. The Pattern Librarian watches corrections as they happen. The HMI Designer lays out WinCC screens. The HMI Tag Linker wires each element to the right PLC data block.",
      "They run as a pipeline, not a chorus. Specialists do their job. Reviewers send findings back for a rewrite pass when they need one. When two reviewers disagree, the PM surfaces the disagreement instead of silently picking a side. Every hand-off produces an artefact the engineer can edit, rewind, or regenerate without blowing away the run.",
      "A Conformance Reviewer is in the works. Its job is to check both directions: every requirement traces to generated code, every generated behaviour traces back to a requirement. That's the one kind of bug nothing else in the pipeline catches — code that compiles, passes every standards check, and still doesn't do what was asked.",
    ],
  },
  {
    title: "Extracting spec from legacy without hallucinating",
    paras: [
      "Pac-Audit points the same platform at an existing project instead of a blank canvas. The extraction rule is strict. Anything computable from structured Openness data goes through a deterministic extractor. Block interfaces, call graphs, state machines, cross-reference graphs — all of it, no inference. This isn't a style choice. It's the difference between a derived spec you can trust and one you can't.",
      "Only the genuinely interpretive parts go through an AI. Intent. Fault-handling prose. Non-standard patterns an engineer used instead of the conventional one. Every AI-extracted fact carries an evidence citation (which block, which line, which comment) and a confidence flag. If Pac-Audit can't find evidence, it says so instead of inventing plausible text. The spec ships with a provenance trail for every AI claim, because a spec nobody can verify is worth nothing.",
    ],
  },
  {
    title: "Every correction becomes a rule",
    paras: [
      "Forja is supposed to get better with use. When a generation fails to compile in TIA, the error comes back through the bridge. A compile-fix agent proposes a correction. The fix is re-imported. If it holds, the diff between what was generated and what actually compiled gets classified by the Pattern Librarian and saved. Every future run starts seeded with the approved library, across every agent and every project.",
      "Engineers also feed reference material into a shared knowledge base: Siemens manuals, internal standards, design profiles. The Project Manager reads each document and only distributes the relevant sections to the agents that need them. Safety standards go to the Safety Auditor. ISA-101 material goes to the HMI Designer. Nothing gets broadcast. Every piece of knowledge lives with the agent that uses it.",
      "When sources disagree, a seven-level priority hierarchy picks a winner: Platform Rules → Design Profile → Correction Patterns → FB Templates → Agent Knowledge → Reference Library → Prompt Sections. Per-project overrides are available when a team needs them. The point is to encode the team's judgment: manual corrections, approved review comments, compile fixes, all carried forward into the next run.",
    ],
  },
  {
    title: "The TIA Openness bridge",
    paras: [
      "TIA Portal has no REST API. The only programmatic interface is TIA Openness, a COM-style .NET library that ships with TIA Portal. Talking to it means a .NET Framework 4.8 process running on the same Windows machine as TIA Portal itself.",
      "The bridge is a C# console app that wraps Openness and exposes HTTP and WebSocket on port 5102. The web app posts generated SCL and hardware configuration to it. The bridge opens the TIA project, imports artefacts in the right order, triggers a compile, and streams the errors back via WebSocket. Before anything gets near real hardware, the bridge also runs PLCsim passes against the generated blocks. Supports V17 through V20. Launches on demand, shuts down when idle, so TIA Portal doesn't stay open between runs.",
    ],
  },
];

export default function PacForgeContent() {
  return (
    <div className="space-y-14">

      {/* Opening */}
      <div className="space-y-4 max-w-[68ch]">
        <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
          Forja turns requirements documents into TIA Portal projects. It also runs the other way: point it at a legacy TIA project and it extracts a spec you can read. Eight agents do the work, and everything compiles against a real TIA Portal install via Openness — or you find out why it didn't.
        </p>
        <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
          The symmetry is the point. Greenfield projects start as a description and end as a compiling TIA project. Legacy projects start as TIA code and end as an editable spec. Both meet in the middle at a structured machine model. The same tool that writes the next project can read the one you inherited.
        </p>
      </div>

      {/* The problem */}
      <section className="space-y-4 max-w-[68ch]">
        <h2 className="text-[2rem] italic leading-tight mb-5" style={{ ...serif, color: "var(--text-primary)" }}>
          The problem
        </h2>
        <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
          PLC work eats engineering hours on tasks that look identical project to project but aren't. Translating functional descriptions into SCL. Wiring IO lists. Laying out HMI screens. Hand-auditing codebases inherited from other vendors. Every site has its own naming, its own hardware, its own safety constraints. You can't template it. You also can't avoid it.
        </p>
        <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
          The obvious move is to ask a chatbot to write SCL. That doesn't work. PLC code has to compile against specific hardware, follow project-specific naming, and obey standards that a general model has no particular reason to know. Forja is built for Siemens TIA Portal specifically, hooked into TIA Openness so every generated block gets compiled in the loop.
        </p>
      </section>

      {/* Shape of the system */}
      <section className="space-y-6">
        <h2 className="text-[2rem] italic leading-tight mb-5" style={{ ...serif, color: "var(--text-primary)" }}>
          The shape of the system
        </h2>

        <ShapeDiagram />

        <div className="space-y-4 max-w-[68ch]">
          <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
            Four pillars, two directions. The FDS Builder takes an instrument register and runs a structured interview with the engineer, one field at a time. A Fidelity Reviewer catches cases where the AI's take on an answer drifted from what the engineer actually said. Pac-Audit goes the other way: point it at an existing TIA project and it reverse-engineers a spec in the same shape. Anything you can compute from Openness is extracted deterministically. Only the genuinely interpretive parts — intent, fault handling, non-standard patterns — go through an AI, with evidence citations required.
          </p>
          <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
            Both paths produce the same derived spec: a machine hierarchy of System → Subsystem → Assembly → Device, with permissives, sequences, tags, timeouts, and fault handling in a common schema. The Forge Wizard takes that spec and runs it through the generation pipeline — hardware configuration, IO list, interface contracts, device and assembly function blocks, process sequence code, HMI screens, and the final TIA project. Every step produces a reviewable artefact, runs through PLCsim, and gets imported and compiled against a live TIA Portal instance.
          </p>
          <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
            The fourth pillar is free. Because Pac-Audit and the FDS Builder produce the same shape of spec, a V15 project can be extracted, edited in structured form, and regenerated onto a current TIA version without starting from scratch. The engineer picks what to port verbatim and what to let Forge re-emit. The spec is the bridge between the project you inherited and the one you want to ship.
          </p>
        </div>
      </section>

      {/* The hard bits */}
      <section className="space-y-10">
        <h2 className="text-[2rem] italic leading-tight" style={{ ...serif, color: "var(--text-primary)" }}>
          The hard bits
        </h2>

        {/* First hard bit: include the agent diagram inline */}
        <div className="space-y-4 max-w-[68ch]">
          <h3 className="text-[1.4rem] italic leading-snug" style={{ ...serif, color: "var(--text-primary)" }}>
            {hardBits[0]!.title}
          </h3>
          <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
            {hardBits[0]!.paras[0]}
          </p>
        </div>

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
                      color: "var(--accent)",
                      border: "0.5px solid rgba(255,90,31,0.3)",
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
                <span className="text-[10px] flex-shrink-0 w-[34px] pt-0.5" style={{ ...mono, color: "var(--accent)" }}>
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

        {/* Remaining paras of first hard bit */}
        <div className="space-y-4 max-w-[68ch]">
          {hardBits[0]!.paras.slice(1).map((para, i) => (
            <p key={i} className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
              {para}
            </p>
          ))}
        </div>

        {/* Remaining hard bits */}
        {hardBits.slice(1).map((section) => (
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
          Forja is in use on live projects. Engineers run instrument registers through the FDS Builder to produce customer-ready specs, push those specs through the Forge Wizard to get a compiling TIA project, and point Pac-Audit at inherited codebases to turn them into the same spec shape — ready to edit or regenerate onto a current TIA version. Every correction made along the way becomes a pattern in the library, ready for the next run.
        </p>
        <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
          The Conformance Reviewer is the next big piece. When it's in, the pipeline will verify both directions: every requirement traces to code, every behaviour traces to a requirement. That closes the last gap — code that compiles, passes every standards check, and still doesn't do what was asked.
        </p>
      </section>

    </div>
  );
}
