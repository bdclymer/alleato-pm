import type {
  AdminFeedbackRequestType,
  AdminFeedbackSeverity,
} from "./constants";
import type { ToolContextBundle } from "./context-resolver";

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
  /** Resolved tool context bundle — included when a tool match exists */
  toolContext?: ToolContextBundle | null;
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

  // Append tool context for agents if a tool was matched
  if (input.toolContext) {
    const ctx = input.toolContext;
    lines.push(
      "",
      "## Agent Context",
      "",
      `**Matched Tool:** ${ctx.tool_name} (${ctx.tool_category})`,
    );

    if (ctx.tool_description) {
      lines.push(`**Description:** ${ctx.tool_description}`);
    }

    if (ctx.procore_url) {
      lines.push(`**Procore URL:** ${ctx.procore_url}`);
    }

    lines.push(
      `**PRP:** \`${ctx.prp_path}\``,
      `**Research Folder:** \`${ctx.research_folder}\``,
      `**Crawl Manifest:** \`${ctx.manifest_path}\``,
      `**Screenshots:** \`${ctx.screenshots_folder}\``,
      "",
      "### Resolution Steps",
      "",
      ...ctx.resolution_steps,
      "",
      "### If More Detail Is Needed",
      "",
      "Run the Procore deep crawl to capture the latest field-level data:",
      "```bash",
      ctx.crawl_command,
      "```",
    );
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

async function addIssueComment(
  config: NonNullable<ReturnType<typeof getRepoConfig>>,
  issueNumber: number,
  body: string,
) {
  const response = await fetch(
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

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub issue comment failed: ${response.status} ${errorText}`);
  }
}

async function addLabels(
  config: NonNullable<ReturnType<typeof getRepoConfig>>,
  issueNumber: number,
  labels: string[],
) {
  // Add labels in a separate call so the "labeled" event fires distinctly,
  // which is required for GitHub Actions workflows that trigger on labeled events.
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

export async function createGitHubIssue(input: CreateGitHubIssueInput) {
  const config = getRepoConfig();
  if (!config) {
    return null;
  }

  const labels = buildLabels(input.requestType);

  // Create issue WITHOUT labels first
  const payload: GitHubIssuePayload = {
    title: input.title,
    body: buildIssueBody(input),
  };

  let issue: { number: number; url: string; state: string };

  try {
    issue = await postIssue(config, payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("Validation Failed")) {
      throw error;
    }
    issue = await postIssue(config, payload);
  }

  // Then add labels separately so the "labeled" event triggers the Claude workflow
  try {
    await addLabels(config, issue.number, labels);
  } catch (error) {
    console.warn(JSON.stringify({
      event: "admin_feedback_github_labels_failed",
      timestamp: new Date().toISOString(),
      issueNumber: issue.number,
      labels,
      error: error instanceof Error ? error.message : String(error),
    }));
  }

  // Post @claude comment to trigger auto-assignment to Claude Code
  try {
    await addIssueComment(config, issue.number, "@claude");
  } catch (error) {
    console.warn(JSON.stringify({
      event: "admin_feedback_github_claude_comment_failed",
      timestamp: new Date().toISOString(),
      issueNumber: issue.number,
      error: error instanceof Error ? error.message : String(error),
    }));
  }

  return issue;
}

export async function addGitHubIssueComment(issueNumber: number, body: string) {
  const config = getRepoConfig();
  if (!config) {
    return false;
  }

  await addIssueComment(config, issueNumber, body);
  return true;
}
