type GitHubIssuePayload = {
  title: string;
  body: string;
};

export type CreatedGitHubIssue = {
  number: number;
  url: string;
  state: string;
};

export type CreateTestFailureIssueInput = {
  testNumber: string;
  testName: string;
  category: string;
  subcategory: string | null;
  notes: string | null;
  severity: string | null;
  startUrl: string | null;
  expectedResult: string | null;
  steps: string | null;
  runId: string;
  runSlug: string | null;
  toolName: string | null;
};

function getRepoConfig() {
  const owner = process.env.GITHUB_FEEDBACK_REPO_OWNER;
  const repo = process.env.GITHUB_FEEDBACK_REPO_NAME;
  const token = process.env.GITHUB_FEEDBACK_TOKEN;

  if (!owner || !repo || !token) {
    return null;
  }

  return { owner, repo, token };
}

function buildIssueBody(input: CreateTestFailureIssueInput): string {
  const lines: string[] = [
    "## Test Failure",
    "",
    `**Test:** \`${input.testNumber}\` — ${input.testName}`,
    `**Category:** ${input.category}${input.subcategory ? ` › ${input.subcategory}` : ""}`,
  ];

  if (input.severity) {
    lines.push(`**Severity:** ${input.severity}`);
  }

  if (input.toolName) {
    lines.push(`**Tool:** ${input.toolName}`);
  }

  lines.push(`**Run:** \`${input.runSlug ?? input.runId}\``);

  if (input.notes) {
    lines.push("", "## What Went Wrong", input.notes);
  }

  if (input.expectedResult) {
    lines.push("", "## Expected Result", input.expectedResult);
  }

  if (input.steps) {
    lines.push("", "## Steps to Reproduce", input.steps);
  }

  if (input.startUrl) {
    lines.push("", `## Start URL`, input.startUrl);
  }

  return lines.join("\n");
}

async function postIssue(
  config: NonNullable<ReturnType<typeof getRepoConfig>>,
  payload: GitHubIssuePayload,
): Promise<CreatedGitHubIssue> {
  const response = await fetch(
    `https://api.github.com/repos/${config.owner}/${config.repo}/issues`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub issue creation failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return {
    number: data.number as number,
    url: data.html_url as string,
    state: data.state as string,
  };
}

async function addLabels(
  config: NonNullable<ReturnType<typeof getRepoConfig>>,
  issueNumber: number,
  labels: string[],
) {
  await fetch(
    `https://api.github.com/repos/${config.owner}/${config.repo}/issues/${issueNumber}/labels`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ labels }),
    },
  );
}

async function addComment(
  config: NonNullable<ReturnType<typeof getRepoConfig>>,
  issueNumber: number,
  body: string,
) {
  await fetch(
    `https://api.github.com/repos/${config.owner}/${config.repo}/issues/${issueNumber}/comments`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ body }),
    },
  );
}

export async function createTestFailureGitHubIssue(
  input: CreateTestFailureIssueInput,
): Promise<CreatedGitHubIssue | null> {
  const config = getRepoConfig();
  if (!config) return null;

  const severityPrefix = input.severity ? `[${input.severity.toUpperCase()}] ` : "";
  const title = `${severityPrefix}Test failure: ${input.testNumber} — ${input.testName}`;

  const issue = await postIssue(config, {
    title,
    body: buildIssueBody(input),
  });

  const baseLabels = (process.env.GITHUB_FEEDBACK_LABELS ?? "admin-feedback")
    .split(",")
    .map((l) => l.trim())
    .filter(Boolean);

  const labels = [...baseLabels, "test-failure"];
  if (input.severity) labels.push(`severity:${input.severity}`);

  try {
    await addLabels(config, issue.number, labels);
  } catch {
    // Non-fatal
  }

  try {
    await addComment(config, issue.number, "@claude");
  } catch {
    // Non-fatal
  }

  return issue;
}
