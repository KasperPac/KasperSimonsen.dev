const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME ?? "kaspersimonsen";
const REPOS = ["pac-forge", "assemblio"] as const;
const WEEKS = 12;

const mono = { fontFamily: "var(--font-geist-mono), ui-monospace, monospace" };

// Chart geometry — wider viewBox to fit y-axis labels
const VW = 160;
const VH = 90;
const TOP  = 6;
const BOT  = 84;
const XS   = Array.from({ length: 12 }, (_, i) => 4 + i * ((VW - 8) / 11));

async function fetchRepo(repo: string): Promise<number[]> {
  if (!GITHUB_TOKEN) return [];
  try {
    const r = await fetch(
      `https://api.github.com/repos/${GITHUB_USERNAME}/${repo}/commits?per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        next: { revalidate: 300 },
      }
    );
    if (!r.ok) return [];
    const data: { commit: { author: { date: string } } }[] = await r.json();

    const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const weeks = Array<number>(WEEKS).fill(0);
    for (const c of data) {
      const age = now - new Date(c.commit.author.date).getTime();
      const weekIndex = Math.floor(age / MS_PER_WEEK);
      if (weekIndex >= 0 && weekIndex < WEEKS) {
        weeks[WEEKS - 1 - weekIndex]++;
      }
    }
    return weeks;
  } catch {
    return [];
  }
}

function toY(v: number, maxVal: number) {
  return (BOT - (v / maxVal) * (BOT - TOP)).toFixed(1);
}

function buildPoints(data: number[], maxVal: number) {
  return data.map((v, i) => `${XS[i]?.toFixed(1)},${toY(v, maxVal)}`).join(" ");
}

// Horizontal guide lines + y-axis labels
function Grid({ maxVal }: { maxVal: number }) {
  const ticks = [
    { y: TOP },
    { y: TOP + (BOT - TOP) / 2 },
    { y: BOT },
  ];
  return (
    <>
      {ticks.map(({ y }) => (
        <line
          key={y}
          x1={0} y1={y} x2={VW} y2={y}
          stroke="#1f1f1f"
          strokeWidth="0.8"
          strokeDasharray={y === BOT ? "none" : "2 3"}
        />
      ))}
    </>
  );
}

function Sparklines({ pacForge, assemblio }: { pacForge: number[]; assemblio: number[] }) {
  const combined = pacForge.map((v, i) => v + (assemblio[i] ?? 0));
  const maxVal = Math.max(...combined, ...pacForge, ...assemblio, 1);
  const combinedPts = buildPoints(combined, maxVal);
  const pfPts = buildPoints(pacForge, maxVal);
  const asPts = buildPoints(assemblio, maxVal);
  return (
    <div className="relative mt-auto" style={{ height: "90px" }}>
      {/* Combined — at rest */}
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full transition-opacity duration-300 opacity-100 group-hover:opacity-0"
        aria-hidden
      >
        <Grid maxVal={maxVal} />
        <polyline fill="none" stroke="var(--accent)" strokeWidth="1.4" points={combinedPts} />
      </svg>

      {/* Dual lines — on hover, drawn left-to-right */}
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full transition-opacity duration-300 opacity-0 group-hover:opacity-100"
        aria-hidden
      >
        <Grid maxVal={maxVal} />
        <polyline data-sparkline="pf" fill="none" stroke="var(--accent)" strokeWidth="1.4" points={pfPts} />
        <polyline data-sparkline="as" fill="none" stroke="var(--health)" strokeWidth="1.4" points={asPts} />
      </svg>
    </div>
  );
}

function FallbackSparklines() {
  const maxVal = 12;
  const pfData  = [4, 6, 5, 8, 7, 10, 8, 11, 9, 12, 10, 11];
  const asData  = [2, 3, 2, 4, 3, 5,  4, 6,  5, 7,  6,  7 ];
  const combined = pfData.map((v, i) => v + (asData[i] ?? 0));
  const combinedPts = buildPoints(combined, Math.max(...combined, 1));
  const pfPts       = buildPoints(pfData,   maxVal);
  const asPts       = buildPoints(asData,   maxVal);
  return (
    <div className="relative mt-auto" style={{ height: "90px" }}>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full transition-opacity duration-300 opacity-100 group-hover:opacity-0"
        aria-hidden
      >
        <Grid maxVal={Math.max(...combined)} />
        <polyline fill="none" stroke="var(--accent)" strokeWidth="1.4" points={combinedPts} />
      </svg>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full transition-opacity duration-300 opacity-0 group-hover:opacity-100"
        aria-hidden
      >
        <Grid maxVal={maxVal} />
        <polyline data-sparkline="pf" fill="none" stroke="var(--accent)" strokeWidth="1.4" points={pfPts} />
        <polyline data-sparkline="as" fill="none" stroke="var(--health)" strokeWidth="1.4" points={asPts} />
      </svg>
    </div>
  );
}

export default async function CommitsTile() {
  const [pacForge, assemblio] = await Promise.all([
    fetchRepo("pac-forge"),
    fetchRepo("assemblio"),
  ]);

  const combined = pacForge.map((v, i) => v + (assemblio[i] ?? 0));
  const total = combined.reduce((s, n) => s + n, 0);
  const hasData = combined.length > 0;

  return (
    <div className="tile-cell group flex flex-col gap-3 p-5 h-[240px] cursor-default">
      <p className="text-xs tracking-[0.06em] uppercase flex-shrink-0" style={{ ...mono, color: "var(--text-dim)" }}>
        Commits · 12w
      </p>

      <div className="flex items-baseline gap-3">
        <p className="text-[40px] font-medium leading-none tracking-tight" style={{ ...mono, color: "var(--text-primary)" }}>
          {hasData ? total : "—"}
        </p>
        <span className="flex items-center gap-1.5 text-xs tracking-wider uppercase" style={{ ...mono, color: hasData ? "var(--health)" : "var(--text-dim)" }}>
          <span className="inline-block w-[5px] h-[5px] rounded-full" style={{ background: hasData ? "var(--health)" : "var(--text-dim)" }} />
          {hasData ? "live" : "no token"}
        </span>
      </div>

      {/* Repo legend — fades in on hover */}
      <div className="flex items-center gap-5 transition-opacity duration-300 opacity-0 group-hover:opacity-100" style={{ marginTop: "-4px" }}>
        <span className="flex items-center gap-2 text-xs uppercase tracking-wider" style={{ ...mono, color: "var(--accent)" }}>
          <span className="inline-block w-4 h-[1.5px]" style={{ background: "var(--accent)" }} />
          pac-forge
        </span>
        <span className="flex items-center gap-2 text-xs uppercase tracking-wider" style={{ ...mono, color: "var(--health)" }}>
          <span className="inline-block w-4 h-[1.5px]" style={{ background: "var(--health)" }} />
          assemblio
        </span>
      </div>

      {hasData ? (
        <Sparklines pacForge={pacForge} assemblio={assemblio} />
      ) : (
        <FallbackSparklines />
      )}
    </div>
  );
}
