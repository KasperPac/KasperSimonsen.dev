const serif = { fontFamily: "var(--font-fraunces), 'Instrument Serif', Georgia, serif" };
const body  = { fontFamily: "var(--font-instrument-sans), system-ui, -apple-system, sans-serif" };
const mono  = { fontFamily: "var(--font-geist-mono), ui-monospace, monospace" };

const hardBits = [
  {
    title: "Buffering orders between Tencia and the plant",
    paras: [
      "Tencia is Rabar's existing ERP — products, recipes, customers, and work orders all live there. Silio doesn't replace Tencia, it reads from it. The ingestion layer pulls orders out in priority order and queues them onto the PLC. The PLC keeps a working buffer of up to 100 active orders, and refills it as orders complete.",
      "Rush orders are the tricky part. When the office flags an order as urgent, it jumps the queue in Tencia. The ingestion layer picks it up on the next refresh. The PLC promotes it to the top of the working buffer. The relevant station's interface surfaces it immediately. None of this can disrupt whatever's already in progress — you can't yank an in-flight ingredient out of an operator's hand. Silio slots the rush order as the next thing up, not the current thing, and the working buffer makes that safe.",
      "The ingestion layer also owns the trip back. When a batch completes, the actual weights and the signed audit trail get written to Tencia so Rabar's reporting and stock systems stay current. Tencia knows what was planned. Silio reports what actually happened.",
    ],
  },
  {
    title: "Weighing to tolerance, signed by the operator",
    paras: [
      "Weighing is the core of the plant. Each measured ingredient has a target weight and an adjustable tolerance. The PLC reads the scale live and tells the operator's interface when the weight is in tolerance. Only then can the operator accept the ingredient. And only an NFC tap commits it. The tag's UID is the operator's identity.",
      "Three conditions have to agree for a sign-off to commit: the scale is in tolerance, the scanned GIN matches the ingredient the recipe expects next, and the operator's NFC tag is tapped. The PLC validates all three together. If any one fails — wrong ingredient, weight out of tolerance, unauthorised tag — the sign-off is rejected and nothing hits SQL. The audit log only contains entries where all three conditions agreed at the same moment in time.",
      "This matters because the audit log is the record of who weighed what into which batch. Partial writes, drift between the PLC and SQL, sign-offs without a weight check — any one of those breaks the guarantee. A bag of finished feed shipping to a customer needs to tie unambiguously to a set of NFC-signed events in SQL.",
    ],
  },
  {
    title: "An Android app for the bags you can't carry",
    paras: [
      "Some ingredients arrive in bulk bags that are too big or too awkward to move to a fixed HMI. For those, Silio ships an Android scanner app on rugged devices. The operator carries it to the bag. The app scans the GIN barcode, validates it against the recipe via the PLC, counts bags per GIN (up to five GINs per ingredient, up to five bags per GIN), and signs the ingredient off with an NFC tap. Same sign-off discipline as the fixed station, just portable.",
      "The unusual part is that the app talks to the PLC directly over a raw TCP socket. Fixed-field binary protocol, framed by an STX byte and a 16-bit length prefix. No HTTP, no middleware, no message queue. The PLC's Structured Text UDTs mirror the TypeScript message definitions in the app, so both sides of the wire agree on every byte. Why binary? The PLC doesn't speak HTTP, and a translation layer is just another thing that can fail. A mismatched field is a bug at both design time and runtime. The app can't construct a message the PLC doesn't understand.",
      "The connection stays alive with a heartbeat every five seconds. If the socket dies, the app reconnects with exponential backoff and the PLC's accept loop picks it up. Operators wear gloves and work fast, so the UI is single-screen and state-machine-driven, with audio and vibration feedback on every transition. No chance of landing in an unreachable state. No need to look at the screen to know whether a scan passed.",
    ],
  },
  {
    title: "A dashboard that reads the same truth the floor writes",
    paras: [
      "The office wanted to watch production happen. Which orders are on which stations, who's working them, how far through each batch is, what's queued, what's suspended, and when something goes wrong, what happened and when. The dashboard is the office's window into all of it, accurate within seconds, not minutes.",
      "The dashboard is a React app that reads directly from SQL. The audit log is append-only and events land atomically with every sign-off, which means the dashboard renders live throughput by operator, station, and product without guessing at mid-flight state. A floor manager can click any in-progress order and see every ingredient already signed off — by whom, at what weight, at what time. A query against last Tuesday's production reads the same as a query against this morning's. The dashboard isn't a separate truth. It's a projection of the one that already exists.",
    ],
  },
];

const flows: { from: string; to: string; note: string; arrow?: string }[] = [
  { from: "Tencia ERP",      to: "Silio ingestion",     note: "orders in · completions out" },
  { from: "Silio ingestion", to: "Omron PLC",           note: "100-order working buffer" },
  { from: "Omron PLC",       to: "Plant hardware",      note: "scales · valves · load cells" },
  { from: "Android app",     to: "Omron PLC",           note: "raw binary TCP + NFC sign-off", arrow: "↔" },
  { from: "Omron PLC",       to: "SQL",                 note: "atomic sign-off events" },
  { from: "SQL",             to: "Dashboard",           note: "live reads" },
];

export default function SilioContent() {
  return (
    <div className="space-y-14">

      {/* Opening */}
      <div className="space-y-4 max-w-[68ch]">
        <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
          Silio runs Rabar's animal-nutrition feed facility in Beaudesert, Queensland. It pulls work orders from Rabar's existing Tencia ERP, drives weighing and blending through an Omron PLC, validates every ingredient that enters a batch, and writes every operator action to a SQL audit log. Operators carry an Android scanner so they can sign off bulk bags where they sit on the floor, without dragging them to a station. The office watches the plant through a live web dashboard.
        </p>
        <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
          The original Rabar plant down the road still runs on handwritten work orders and end-of-shift operator signatures. Silio replaces that paper trail with a typed, signed digital workflow. Every weight, every scan, every bag, every action is recorded in real time against the person who did it.
        </p>
      </div>

      {/* The problem */}
      <section className="space-y-4 max-w-[68ch]">
        <h2 className="text-[2rem] italic leading-tight mb-5" style={{ ...serif, color: "var(--text-primary)" }}>
          The problem
        </h2>
        <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
          A feed mill blends dry ingredients into nutritional mixes for livestock. Some ingredients are measured by hand (trace elements, premixes, specific weights of specific flours). Some arrive in bulk bags pre-measured by the supplier and dropped in whole. A single batch can pull 20+ ingredients from both workflows. Traditionally the operator works from a printed work order: weigh each measured ingredient, pick the bulk bags from the warehouse, write it down, sign the sheet at the end. The paperwork gets filed against the batch number. If anyone needs it later, someone walks to the filing cabinet.
        </p>
        <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
          This works until it doesn't. Handwritten weights drift from actual weights. Bag counts get off by one. End-of-shift signatures tell you very little about who did what and when. And when an animal gets sick from a specific batch, the chain back through the paperwork is slow and fragile. Rabar wanted the traceability the paper trail pretends to give — actually delivered, in real time, for every ingredient in every batch.
        </p>
      </section>

      {/* Shape of the system */}
      <section className="space-y-6">
        <h2 className="text-[2rem] italic leading-tight mb-5" style={{ ...serif, color: "var(--text-primary)" }}>
          The shape of the system
        </h2>

        <div
          className="p-5 space-y-3 overflow-x-auto"
          style={{ background: "#0f0f0f", border: "0.5px solid var(--border)" }}
        >
          {flows.map(({ from, to, note, arrow = "→" }) => (
            <div key={`${from}→${to}`} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <span className="text-[11px] sm:w-[160px] flex-shrink-0" style={{ ...mono, color: "var(--text-muted)" }}>{from}</span>
              <div className="flex items-center gap-1 sm:flex-1">
                <div className="hidden sm:block flex-1 h-[0.5px]" style={{ background: "var(--border)" }} />
                <span className="text-[10px] sm:px-2 flex-shrink-0" style={{ ...mono, color: "var(--text-dim)" }}>{note}</span>
                <div className="hidden sm:block w-3 h-[0.5px]" style={{ background: "var(--border)" }} />
                <span style={{ color: "var(--accent)", fontSize: 10 }}>{arrow}</span>
              </div>
              <span className="text-[11px] sm:w-[160px] flex-shrink-0 sm:text-right" style={{ ...mono, color: "var(--text-muted)" }}>{to}</span>
            </div>
          ))}
        </div>

        <div className="space-y-4 max-w-[68ch]">
          <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
            Silio is five pieces of software. An <em>ingestion layer</em> reads Tencia work orders and feeds them into a 100-order buffer on the PLC. An <em>Omron Sysmac PLC program</em> drives the plant hardware (load cells, valves, motors, scales) and enforces the weighing and tolerance logic for every ingredient. An <em>Android scanner app</em> runs on rugged devices so operators can scan bulk-bag GINs and sign off with an NFC tap without moving the bag. A <em>SQL backbone</em> captures every operator action — every weight, every scan, every sign-off — as an immutable event. A <em>React dashboard</em> reads SQL live for the office.
          </p>
          <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
            Tencia owns orders. The PLC is where real-time control lives. SQL is the audit log. The Android app and the dashboard are two windows into the same running system. Every piece has a single job, and the wiring between them is typed and checked at every hop.
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
          Silio has run Rabar's Beaudesert plant since 2023. The paper trail is gone. Every gram weighed into every batch — measured or bulk — is recorded in SQL against the operator who handled it and the NFC tap that confirmed it. Tracing a customer complaint back to the batch, then to the ingredients, then to the operators who signed each one, is one query. Not a walk to a filing cabinet.
        </p>
        <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
          Tencia stays in charge of orders and reporting. The plant stays in charge of weighing and blending. Silio wires them together so what Tencia plans is what the plant does, and what the plant does is what Tencia reports. The dashboard has become the office's default view of the day — a live feed, not a report run after the fact. And because every commit needs a physical NFC tap, the audit log records human actions, not claims the software made on someone's behalf.
        </p>
      </section>

    </div>
  );
}
