type GitHubRepo = {
  fullName: string;
  name: string;
  url: string;
  defaultBranch: string | null;
  latestCommit: { sha: string; message: string; date: string | null; url: string } | null;
  latestWorkflow: { name: string; status: string; conclusion: string | null; updatedAt: string; url: string } | null;
  error?: string;
};

const repositories = [
  "shahlal07/nashemann-admin",
  "shahlal07/nashemann-web",
  "shahlal07/vendor-storefronts",
  "shahlal07/vendor-admins",
];

async function githubGet(path: string, token: string) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`GitHub API returned ${response.status}`);
  return response.json();
}

export async function getRepositoryHealth(): Promise<{
  configured: boolean;
  message: string;
  repositories: GitHubRepo[];
}> {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    return {
      configured: false,
      message: "Set GITHUB_TOKEN as a server-side environment variable with read access to the Nashemann repositories.",
      repositories: repositories.map((fullName) => ({
        fullName, name: fullName.split("/")[1], url: `https://github.com/${fullName}`,
        defaultBranch: null, latestCommit: null, latestWorkflow: null,
        error: "GitHub integration is not configured.",
      })),
    };
  }

  const results = await Promise.all(repositories.map(async (fullName): Promise<GitHubRepo> => {
    try {
      const [repo, commits, workflows] = await Promise.all([
        githubGet(`/repos/${fullName}`, token),
        githubGet(`/repos/${fullName}/commits?per_page=1`, token),
        githubGet(`/repos/${fullName}/actions/runs?per_page=1`, token),
      ]);
      const commit = Array.isArray(commits) ? commits[0] : null;
      const run = workflows?.workflow_runs?.[0] ?? null;
      return {
        fullName,
        name: repo.name || fullName.split("/")[1],
        url: repo.html_url || `https://github.com/${fullName}`,
        defaultBranch: repo.default_branch ?? null,
        latestCommit: commit ? {
          sha: String(commit.sha || "").slice(0, 7),
          message: commit.commit?.message?.split("\n")[0] || "Commit message unavailable",
          date: commit.commit?.committer?.date ?? null,
          url: commit.html_url,
        } : null,
        latestWorkflow: run ? {
          name: run.name || run.display_title || "GitHub Actions",
          status: run.status || "unknown",
          conclusion: run.conclusion ?? null,
          updatedAt: run.updated_at || run.created_at,
          url: run.html_url,
        } : null,
      };
    } catch (error) {
      return {
        fullName, name: fullName.split("/")[1], url: `https://github.com/${fullName}`,
        defaultBranch: null, latestCommit: null, latestWorkflow: null,
        error: error instanceof Error ? error.message : "Unable to retrieve repository data.",
      };
    }
  }));

  return { configured: true, message: "Repository data retrieved from GitHub.", repositories: results };
}
