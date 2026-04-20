import Link from "next/link";

const GITHUB_TOKEN    = process.env.GITHUB_TOKEN;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME ?? "kaspersimonsen";

const mono = { fontFamily: "var(--font-geist-mono), ui-monospace, monospace" };

const REPO_COLOR: Record<string, string> = {
  "pac-forge": "var(--accent)",
  "assemblio": "var(--health)",
};

type Commit = {
  sha:     string;
  repo:    string;
  message: string;
  date:    string; // pre-formatted
};

async function fetchRepoCommits(repo: string): Promise<Commit[]> {
  if (!GITHUB_TOKEN) return [];
  try {
    const r = await fetch(
      `https://api.github.com/repos/${GITHUB_USERNAME}/${repo}/commits?per_page=10`,
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
    const data: any[] = await r.json();
    return data.map((c) => ({
      sha:     c.sha.slice(0, 7),
      repo,
      message: c.commit.message.split("\n")[0]!,
      date:    new Date(c.commit.author.date).toLocaleDateString("en-AU", {
        day:   "2-digit",
        month: "short",
      }),
    }));
  } catch {
    return [];
  }
}

const FALLBACK: Commit[] = [
  { sha: "a1c4f8e", repo: "pac-forge", message: "feat: safety-auditor agent prompt revision",   date: "20 Apr" },
  { sha: "f7d22b9", repo: "assemblio", message: "fix: HMAC verification edge case",              date: "18 Apr" },
  { sha: "3e8a107", repo: "pac-forge", message: "perf: shared cache across agent pipeline",      date: "12 Apr" },
  { sha: "9bb4e02", repo: "assemblio", message: "feat: drift detection scheduled job",           date: "09 Apr" },
];

export default async function ActivityLog() {
  const [pfCommits, asCommits] = await Promise.all([
    fetchRepoCommits("pac-forge"),
    fetchRepoCommits("assemblio"),
  ]);

  const hasData = pfCommits.length > 0 || asCommits.length > 0;

  const commits = hasData
    ? [...pfCommits, ...asCommits]
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 4)
    : FALLBACK;

  const githubUrl = `https://github.com/${GITHUB_USERNAME}`;

  return (
    <section>
      {/* Header */}
      <div
        className="flex items-center gap-5 px-6 md:px-10 py-7"
        style={{ background: "#161616", borderTop: "1px solid #333333", borderBottom: "0.5px solid #2a2a2a" }}
      >
        <span className="text-sm tracking-[0.18em] uppercase flex-shrink-0" style={{ ...mono, color: "var(--text-primary)" }}>
          Activity
        </span>
        <div className="flex-1 h-px" style={{ background: "#2a2a2a" }} />
        <div className="flex items-center gap-3 flex-shrink-0">
          {!hasData && (
            <span className="text-xs" style={{ ...mono, color: "var(--text-dim)" }}>
              example data
            </span>
          )}
          {hasData && (
            <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider" style={{ ...mono, color: "var(--health)" }}>
              <span className="inline-block w-[5px] h-[5px] rounded-full" style={{ background: "var(--health)" }} />
              live · 5 min
            </span>
          )}
        </div>
      </div>

      {/* Rows */}
      <div className={!hasData ? "opacity-50" : ""}>
        {commits.map((commit, i) => (
          <div
            key={`${commit.sha}-${i}`}
            className="group px-6 md:px-10 py-3.5 transition-colors duration-150 hover:bg-[#0f0f0f]"
            style={{ borderBottom: "0.5px solid var(--border)" }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "52px 96px 1fr 64px",
                gap: "0 20px",
                alignItems: "center",
              }}
            >
              {/* Date */}
              <span className="text-xs tabular-nums" style={{ ...mono, color: "var(--text-dim)" }}>
                {commit.date}
              </span>

              {/* Repo */}
              <span className="flex items-center gap-1.5 text-xs overflow-hidden" style={{ ...mono }}>
                <span
                  className="inline-block w-[5px] h-[5px] rounded-full flex-shrink-0"
                  style={{ background: REPO_COLOR[commit.repo] ?? "var(--text-dim)" }}
                />
                <span className="truncate" style={{ color: REPO_COLOR[commit.repo] ?? "var(--text-dim)" }}>
                  {commit.repo}
                </span>
              </span>

              {/* Message */}
              <span className="text-xs truncate" style={{ ...mono, color: "var(--text-muted)" }}>
                {commit.message}
              </span>

              {/* SHA */}
              <span
                className="text-xs tabular-nums text-right opacity-50 group-hover:opacity-100 transition-opacity duration-150"
                style={{ ...mono, color: "var(--text-dim)" }}
              >
                {commit.sha}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-6 md:px-10 py-4">
        <Link
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs tracking-wider uppercase transition-colors duration-150 hover:opacity-100 opacity-40"
          style={{ ...mono, color: "var(--text-primary)" }}
        >
          View on GitHub →
        </Link>
      </div>
    </section>
  );
}
