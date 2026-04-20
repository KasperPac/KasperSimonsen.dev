const GITHUB_TOKEN    = process.env.GITHUB_TOKEN;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME ?? "kaspersimonsen";

export type RepoMeta = {
  lastCommit: { sha: string; message: string; date: string } | null;
  stars: number | null;
};

export async function fetchRepoMeta(repo: string): Promise<RepoMeta> {
  if (!GITHUB_TOKEN) return { lastCommit: null, stars: null };

  const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  try {
    const [commitsRes, repoRes] = await Promise.all([
      fetch(
        `https://api.github.com/repos/${GITHUB_USERNAME}/${repo}/commits?per_page=1`,
        { headers, next: { revalidate: 900 } }
      ),
      fetch(
        `https://api.github.com/repos/${GITHUB_USERNAME}/${repo}`,
        { headers, next: { revalidate: 900 } }
      ),
    ]);

    let lastCommit: RepoMeta["lastCommit"] = null;
    if (commitsRes.ok) {
      const commits: Array<{
        sha: string;
        commit: { message: string; author: { date: string } };
      }> = await commitsRes.json();
      if (commits[0]) {
        const c = commits[0];
        lastCommit = {
          sha: c.sha.slice(0, 7),
          message: c.commit.message.split("\n")[0] ?? "",
          date: new Date(c.commit.author.date).toLocaleDateString("en-AU", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
        };
      }
    }

    let stars: number | null = null;
    if (repoRes.ok) {
      const data: { private: boolean; stargazers_count: number } =
        await repoRes.json();
      if (!data.private) stars = data.stargazers_count;
    }

    return { lastCommit, stars };
  } catch {
    return { lastCommit: null, stars: null };
  }
}
