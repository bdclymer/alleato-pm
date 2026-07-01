import { defineSchedule } from "eve/schedules";

import github from "../channels/github.js";
import {
  buildBackfillMessage,
  getBackfillRepos,
  issueAlreadyTriaged,
  listOpenIssuesForBackfill,
  resolveInstallationIdForRepo,
} from "../lib/github-app.js";

// Daily weekday backfill. Safe to run repeatedly because existing triage
// comments are skipped by default.
export default defineSchedule({
  cron: "0 14 * * 1-5",
  async run({ appAuth, receive }) {
    const repos = getBackfillRepos();
    if (repos.length === 0) {
      console.error(
        "GitHub triage backfill blocked. Required env: EVE_GITHUB_TRIAGE_REPOS or EVE_GITHUB_TRIAGE_BACKFILL_REPOS.",
      );
      return;
    }

    for (const repoRef of repos) {
      let installationId: number;
      try {
        installationId = await resolveInstallationIdForRepo(repoRef);
      } catch (error) {
        console.error(`GitHub triage backfill blocked for ${repoRef.owner}/${repoRef.repo}: ${toErrorMessage(error)}`);
        continue;
      }

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
          if (await issueAlreadyTriaged(repoRef, issue.issueNumber)) {
            console.info(`GitHub triage backfill skipped #${issue.issueNumber} in ${repoRef.owner}/${repoRef.repo}: already triaged.`);
            continue;
          }

          const session = await receive(github, {
            auth: appAuth,
            message: buildBackfillMessage(issue),
            target: {
              installationId,
              issueNumber: issue.issueNumber,
              owner: repoRef.owner,
              repo: repoRef.repo,
            },
          });

          console.info(
            `GitHub triage backfill dispatched #${issue.issueNumber} in ${repoRef.owner}/${repoRef.repo} with eve session ${session.id}.`,
          );
        } catch (error) {
          console.error(`GitHub triage backfill dispatch failed for #${issue.issueNumber} in ${repoRef.owner}/${repoRef.repo}: ${toErrorMessage(error)}`);
        }
      }
    }
  },
});

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
