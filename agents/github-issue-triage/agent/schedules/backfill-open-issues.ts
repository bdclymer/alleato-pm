import { defineSchedule } from "eve/schedules";

import {
  ensureIssueLabels,
  getBackfillRepos,
  listOpenIssuesForBackfill,
  upsertTriageComment,
} from "../lib/github-app.js";
import { formatTriageComment, triageIssue } from "../lib/triage.js";

export default defineSchedule({
  cron: "*/5 * * * *",
  async run() {
    const repos = getBackfillRepos();
    if (repos.length === 0) {
      console.error(
        "GitHub triage backfill blocked. Required env: EVE_GITHUB_TRIAGE_REPOS or EVE_GITHUB_TRIAGE_BACKFILL_REPOS.",
      );
      return;
    }

    for (const repoRef of repos) {
      let issues;
      try {
        issues = await listOpenIssuesForBackfill(repoRef);
      } catch (error) {
        console.error(`GitHub triage backfill issue listing failed for ${repoRef.owner}/${repoRef.repo}: ${toErrorMessage(error)}`);
        continue;
      }

      console.info(`GitHub triage backfill discovered ${issues.length} open issue(s) for ${repoRef.owner}/${repoRef.repo}.`);

      for (const issue of issues) {
        try {
          const decision = triageIssue({
            body: issue.body,
            issueNumber: issue.issueNumber,
            labels: issue.labels,
            owner: repoRef.owner,
            repo: repoRef.repo,
            title: issue.title,
          });
          const result = await upsertTriageComment(repoRef, issue.issueNumber, formatTriageComment(decision));
          console.info(`GitHub triage backfill ${result} comment for #${issue.issueNumber} in ${repoRef.owner}/${repoRef.repo}.`);

          if (decision.route === "direct-to-main" || decision.route === "pr-required") {
            const addedLabels = await ensureIssueLabels(repoRef, issue.issueNumber, ["codex:fix"]);
            if (addedLabels.length > 0) {
              console.info(
                `GitHub triage backfill queued #${issue.issueNumber} in ${repoRef.owner}/${repoRef.repo} with labels: ${addedLabels.join(", ")}.`,
              );
            }
          }
        } catch (error) {
          console.error(`GitHub triage backfill comment failed for #${issue.issueNumber} in ${repoRef.owner}/${repoRef.repo}: ${toErrorMessage(error)}`);
        }
      }
    }
  },
});

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
