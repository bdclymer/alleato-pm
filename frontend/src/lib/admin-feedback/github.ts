import type {
  AdminFeedbackRequestType,
  AdminFeedbackSeverity,
} from "./constants";

type GitHubIssuePayload = {
  title: string;
  body: string;
  labels?: string[];
};

export type CreateGitHubIssueInput = {
  title: string;
  comment: string;
  pageUrl: string;
  pagePath: string;
  pageTitle: string | null;
  requestType: AdminFeedbackRequestType;
  severity: AdminFeedbackSeverity;
  targetId: string | null;
  targetSelector: string;
  targetTag: string | null;
  targetText: string | null;
  domPath: string | null;
  screenshotUrl: string | null;
  projectId: number | null;
  metadata: Record<string, unknown>;
};

export type CreatedGitHubIssue = {
  number: number;
  url: string;
  state: string;
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

function buildLabels(requestType: AdminFeedbackRequestType) {
  const baseLabels = (process.env.GITHUB_FEEDBACK_LABELS ?? "admin-feedback")
    .split(",")
    .map((label) => label.trim())
    .filter(Boolean);

  return [...baseLabels, `feedback:${requestType}`];
}

function buildIssueBody(input: CreateGitHubIssueInput) {
  const payload = {
    pageUrl: input.pageUrl,
    pagePath: input.pagePath,
    pageTitle: input.pageTitle,
    requestType: input.requestType,
    severity: input.severity,
    projectId: input.projectId,
    targetId: input.targetId,
    targetSelector: input.targetSelector,
    targetTag: input.targetTag,
    targetText: input.targetText,
    domPath: input.domPath,
    screenshotUrl: input.screenshotUrl,
    metadata: input.metadata,
    comment: input.comment,
  };

  const lines = [
    "## Feedback",
    input.comment,
    "",
    "## Location",
    `- URL: ${input.pageUrl}`,
    `- Path: ${input.pagePath}`,
    `- Page title: ${input.pageTitle ?? "Unknown"}`,
    `- Project ID: ${input.projectId ?? "N/A"}`,
    "",
    "## Target",
    `- Stable target ID: ${input.targetId ?? "Not provided"}`,
    `- Selector: \`${input.targetSelector}\``,
    `- Tag: ${input.targetTag ?? "Unknown"}`,
    `- Text: ${input.targetText ?? "None"}`,
    `- DOM path: \`${input.domPath ?? "Unknown"}\``,
    "",
    "## Request",
    `- Type: ${input.requestType}`,
    `- Severity: ${input.severity}`,
  ];

  if (input.screenshotUrl) {
    lines.push("", `## Screenshot`, `![Feedback screenshot](${input.screenshotUrl})`);
  }

  lines.push(
    "",
    "## Agent Payload",
    "```json",
    JSON.stringify(payload, null, 2),
    "```",
  );

  return lines.join("\n");
}

async function postIssue(
  config: NonNullable<ReturnType<typeof getRepoConfig>>,
  payload: GitHubIssuePayload,
) {
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

export async function createGitHubIssue(input: CreateGitHubIssueInput) {
  const config = getRepoConfig();
  if (!config) {
    return null;
  }

  const payload: GitHubIssuePayload = {
    title: input.title,
    body: buildIssueBody(input),
    labels: buildLabels(input.requestType),
  };

  try {
    return await postIssue(config, payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("Validation Failed")) {
      throw error;
    }

    return postIssue(config, {
      title: payload.title,
      body: payload.body,
    });
  }
}
