import { defineSchedule } from "eve/schedules";

import linear from "../channels/linear.js";

const targetIssueId = process.env.EVE_PROJECT_INTELLIGENCE_LINEAR_ISSUE_ID;
const hasLinearAccessToken =
  Boolean(process.env.LINEAR_AGENT_ACCESS_TOKEN) ||
  Boolean(process.env.LINEAR_ACCESS_TOKEN) ||
  Boolean(process.env.LINEAR_API_KEY);
const hasLinearWebhookSecret = Boolean(process.env.LINEAR_WEBHOOK_SECRET);

export default defineSchedule({
  cron: "0 13 * * 1-5",
  async run({ receive, waitUntil, appAuth }) {
    if (!targetIssueId || !hasLinearAccessToken || !hasLinearWebhookSecret) {
      console.error(
        [
          "Project Intelligence maintainer Linear delivery blocked.",
          "Required env: EVE_PROJECT_INTELLIGENCE_LINEAR_ISSUE_ID, LINEAR_AGENT_ACCESS_TOKEN, LINEAR_WEBHOOK_SECRET.",
          `Configured: targetIssueId=${Boolean(targetIssueId)}, accessToken=${hasLinearAccessToken}, webhookSecret=${hasLinearWebhookSecret}.`,
        ].join(" "),
      );
      return;
    }

    waitUntil(
      receive(linear, {
        auth: appAuth,
        message: [
          "Run the Project Intelligence maintainer weekday scan.",
          "Report only non-healthy findings or a compact PASS heartbeat.",
          "Include source lifecycle status, packet freshness, read-back proof, cause, detection gap, prevention, owner path/table, and next action.",
          "Do not mutate data unless a bounded repair tool is explicitly approved by a human.",
        ].join("\n"),
        target: {
          issueId: targetIssueId,
          initialActivity: "Running Project Intelligence maintainer scan.",
        },
      }),
    );
  },
});
