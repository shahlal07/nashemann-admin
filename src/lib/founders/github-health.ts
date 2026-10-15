import "server-only";

const REPOSITORIES = [
  { name: "nashemann-web", fullName: "shahlal07/nashemann-web", active: true },
  { name: "nashemann-admin", fullName: "shahlal07/nashemann-admin", active: true },
  { name: "vendor-storefronts", fullName: "shahlal07/vendor-storefronts", active: true },
  { name: "vendor-admins", fullName: "shahlal07/vendor-admins", active: true },
] as const;

type GitHubRepository = {
  default_branch?: string;
  private?: boolean;
  html_url?: string;
};

type GitHubCommit = {
  sha: string;
  html_url: string;
  commit?: { message?: string; committer?: { date?: string } };
};

type GitHubWorkflowRuns = {
  workflow_runs?: Array<{
    name?: string;
    html_url?: string;
    status?: string;
    conclusion?: string | null;
    updated_at?: string;
  }>;
};

export type RepositoryHealth = {
  name: string;
  fullName: string;
  url: string;
  defaultBranch: string | null;
  latestCommit: { sha: string; message: string; url: string; date: string | null } | null;
  latestWorkflow: { name: string; url: string; status: string; conclusion: string | null; updatedAt: string | null } | null;
  error: string | null;
};

async function githubGet<T>(url: string, token: string | undefined): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`GitHub API returned ${response.status}`);
  return response.json() as Promise<T>;
}

export async function getRepositoryHealth(): Promise<{
  configured: boolean;
  repositories: RepositoryHealth[];
  message: string | null;
}> {
  const token = process.env.GITHUB_TOKEN || process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
  if (!token) {
    return {
      configured: false,
      repositories: REPOSITORIES.map((repo) => ({
        name: repo.name,
        fullName: repo.fullName,
        url: `https://github.com/${repo.fullName}`,
        defaultBranch: null,
        latestCommit: null,
        latestWorkflow: null,
        error: "GitHub token not configured",
      })),
      message: "Set GITHUB_TOKEN or GITHUB_PERSONAL_ACCESS_TOKEN in the server environment with read access to the four active repositories. No repository health is fabricated.",
    };
  }

  const repositories = await Promise.all(REPOSITORIES.map(async (repo): Promise<RepositoryHealth> => {
    try {
      const api = `https://api.github.com/repos/${repo.fullName}`;
      const [metadata, commits, workflows] = await Promise.all([
        githubGet<GitHubRepository>(api, token),
        githubGet<GitHubCommit[]>(`${api}/commits?per_page=1`, token),
        githubGet<GitHubWorkflowRuns>(`${api}/actions/runs?per_page=1`, token),
      ]);
      const commit = commits[0];
      const workflow = workflows.workflow_runs?.[0];
      return {
        name: repo.name,
        fullName: repo.fullName,
        url: metadata.html_url || `https://github.com/${repo.fullName}`,
        defaultBranch: metadata.default_branch || null,
        latestCommit: commit ? {
          sha: commit.sha.slice(0, 7),
          message: (commit.commit?.message || "Commit message unavailable").split("\n")[0].slice(0, 160),
          url: commit.html_url,
          date: commit.commit?.committer?.date || null,
        } : null,
        latestWorkflow: workflow ? {
          name: workflow.name || "GitHub Actions",
          url: workflow.html_url || `https://github.com/${repo.fullName}/actions`,
          status: workflow.status || "unknown",
          conclusion: workflow.conclusion ?? null,
          updatedAt: workflow.updated_at || null,
        } : null,
        error: null,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "GitHub data unavailable";
      return {
        name: repo.name,
        fullName: repo.fullName,
        url: `https://github.com/${repo.fullName}`,
        defaultBranch: null,
        latestCommit: null,
        latestWorkflow: null,
        error: message,
      };
    }
  }));

  return { configured: true, repositories, message: null };
}
