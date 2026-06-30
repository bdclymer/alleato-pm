import { defineSchedule } from "eve/schedules";

import linear from "../channels/linear.js";
import teams from "../channels/teams.js";

const targetIssueId = process.env.EVE_PROJECT_INTELLIGENCE_LINEAR_ISSUE_ID;
const hasLinearAccessToken =
  Boolean(process.env.LINEAR_AGENT_ACCESS_TOKEN) ||
  Boolean(process.env.LINEAR_ACCESS_TOKEN) ||
  Boolean(process.env.LINEAR_API_KEY);
const hasLinearWebhookSecret = Boolean(process.env.LINEAR_WEBHOOK_SECRET);
const teamsTarget = getTeamsTargetFromEnv();
const hasTeamsBotCredentials = Boolean(process.env.MICROSOFT_APP_ID) && Boolean(process.env.MICROSOFT_APP_PASSWORD);

const maintainerMessage = [
  "Run the Project Intelligence maintainer weekday scan.",
  "Report only non-healthy findings or a compact PASS heartbeat.",
  "Include source lifecycle status, packet freshness, read-back proof, cause, detection gap, prevention, owner path/table, and next action.",
  "Do not mutate data unless a bounded repair tool is explicitly approved by a human.",
].join("\n");

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
        message: maintainerMessage,
        target: {
          issueId: targetIssueId,
          initialActivity: "Running Project Intelligence maintainer scan.",
        },
      }),
    );

    if (!teamsTarget || !hasTeamsBotCredentials) {
      console.error(
        [
          "Project Intelligence maintainer Teams delivery blocked.",
          "Required env: MICROSOFT_APP_ID, MICROSOFT_APP_PASSWORD, EVE_PROJECT_INTELLIGENCE_TEAMS_SERVICE_URL, EVE_PROJECT_INTELLIGENCE_TEAMS_CONVERSATION_ID.",
          `Configured: botCredentials=${hasTeamsBotCredentials}, serviceUrl=${Boolean(teamsTarget?.serviceUrl)}, conversationId=${Boolean(teamsTarget?.conversationId)}.`,
        ].join(" "),
      );
      return;
    }

    waitUntil(
      receive(teams, {
        auth: appAuth,
        message: maintainerMessage,
        target: {
          ...teamsTarget,
          initialMessage: "Running Project Intelligence maintainer scan.",
        },
      }),
    );
  },
});

function getTeamsTargetFromEnv() {
  const serviceUrl = process.env.EVE_PROJECT_INTELLIGENCE_TEAMS_SERVICE_URL;
  const conversationId = process.env.EVE_PROJECT_INTELLIGENCE_TEAMS_CONVERSATION_ID;

  if (!serviceUrl || !conversationId) return null;

  return {
    serviceUrl,
    conversationId,
    channelId: process.env.EVE_PROJECT_INTELLIGENCE_TEAMS_CHANNEL_ID,
    conversationType: process.env.EVE_PROJECT_INTELLIGENCE_TEAMS_CONVERSATION_TYPE,
    replyToActivityId: process.env.EVE_PROJECT_INTELLIGENCE_TEAMS_REPLY_TO_ACTIVITY_ID,
    teamId: process.env.EVE_PROJECT_INTELLIGENCE_TEAMS_TEAM_ID,
    tenantId: process.env.MICROSOFT_TENANT_ID ?? process.env.EVE_PROJECT_INTELLIGENCE_TEAMS_TENANT_ID,
  };
}
