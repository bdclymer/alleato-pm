import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  ExecutionHandoffRow,
  FeatureRequestRow,
  ImplementationPlanRow,
} from "./types";
import { scoreFeatureRequestReadiness } from "./readiness";

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function checkboxList(values: string[], fallback: string): string {
  const rows = values.length > 0 ? values : [fallback];
  return rows.map((value) => `- [ ] ${value}`).join("\n");
}

function bulletList(values: string[], fallback: string): string {
  const rows = values.length > 0 ? values : [fallback];
  return rows.map((value) => `- ${value}`).join("\n");
}

function numberedList(values: string[], fallback: string): string {
  const rows = values.length > 0 ? values : [fallback];
  return rows.map((value, index) => `${index + 1}. ${value}`).join("\n");
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 54) || "feature-request";
}

export function buildClaudeCodeHandoffMarkdown(params: {
  request: FeatureRequestRow;
  plan: ImplementationPlanRow | null;
  linearIssue?: string | null;
}): { markdown: string; validationStatus: ExecutionHandoffRow["validation_status"]; validationErrors: string[] } {
  const { request, plan } = params;
  const readiness = scoreFeatureRequestReadiness({ request, latestPlan: plan });
  const acceptanceCriteria = asStringArray(plan?.acceptance_criteria ?? request.acceptance_criteria);
  const verificationSteps = asStringArray(plan?.verification_steps ?? request.verification_steps);
  const implementationSteps = asStringArray(plan?.implementation_steps);
  const affectedRoutes = asStringArray(plan?.affected_routes);
  const affectedComponents = asStringArray(plan?.affected_components);
  const affectedTables = asStringArray(plan?.affected_tables);
  const dataRequirements = asStringArray(plan?.data_requirements);
  const openQuestions = asStringArray(plan?.open_questions ?? request.open_questions);
  const assumptions = asStringArray(request.assumptions);
  const likelyFiles = [
    ...affectedRoutes.map((route) => `frontend route: ${route}`),
    ...affectedComponents,
    ...affectedTables.map((table) => `database table: ${table}`),
  ];

  return {
    validationStatus: readiness.readyForBuild ? "valid" : "blocked",
    validationErrors: readiness.missingRequirements,
    markdown: [
      `# Claude Code Handoff: ${request.title}`,
      "",
      "## Intake",
      `Requester: ${request.requester_name}`,
      `Source: ${request.source}`,
      `AIS request id: ${request.id}`,
      `Linear issue: ${params.linearIssue ?? request.linear_issue_id ?? request.linear_issue_url ?? "Draft required"}`,
      "",
      "## Stakeholder Goal",
      request.raw_request,
      "",
      "## Current Understanding",
      request.assistant_summary,
      "",
      "## Acceptance Criteria",
      checkboxList(acceptanceCriteria, "Confirm final acceptance criteria with stakeholder."),
      "",
      "## Implementation Plan",
      numberedList(implementationSteps, plan?.summary ?? "Generate and review an implementation plan before coding."),
      "",
      "## Likely Files",
      bulletList(likelyFiles, "Identify owner files during implementation discovery."),
      "",
      "## Data Requirements",
      bulletList(dataRequirements, "Confirm data requirements before implementation."),
      "",
      "## Verification Plan",
      bulletList(verificationSteps, "Add targeted verification before handoff."),
      "",
      "## Open Questions / Assumptions",
      bulletList([...openQuestions, ...assumptions.map((assumption) => `Assumption: ${assumption}`)], "No open questions recorded."),
      "",
      "## Readiness Gate",
      readiness.readyForBuild
        ? "Ready for build."
        : readiness.blockedMessage ?? "Blocked by missing readiness requirements.",
      "",
      "## Guardrails",
      "- No silent failures.",
      "- No generic errors.",
      "- Use shared primitives.",
      "- Run route checks if routes change.",
      "- Verify migration ledger if schema changes.",
      "- Attach browser evidence for frontend flows.",
      "",
    ].join("\n"),
  };
}

export async function writeClaudeCodeHandoffFile(params: {
  request: FeatureRequestRow;
  plan: ImplementationPlanRow | null;
  linearIssue?: string | null;
  sessionLabel?: string;
}): Promise<{
  path: string;
  title: string;
  markdown: string;
  validationStatus: ExecutionHandoffRow["validation_status"];
  validationErrors: string[];
}> {
  const built = buildClaudeCodeHandoffMarkdown(params);
  const today = new Date().toISOString().slice(0, 10);
  const session = (params.sessionLabel ?? "SAIS").replace(/[^A-Za-z0-9]/g, "") || "SAIS";
  const relativePath = `docs/ops/handoffs/${today}-${session}-${slugify(params.request.title)}.md`;
  const absolutePath = path.join(process.cwd(), relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, built.markdown, "utf8");

  return {
    path: relativePath,
    title: `Claude Code Handoff: ${params.request.title}`,
    markdown: built.markdown,
    validationStatus: built.validationStatus,
    validationErrors: built.validationErrors,
  };
}
