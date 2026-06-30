import { linearChannel } from "eve/channels/linear";

export default linearChannel({
  credentials: {
    accessToken: () =>
      requiredEnv(
        "LINEAR_AGENT_ACCESS_TOKEN",
        process.env.LINEAR_AGENT_ACCESS_TOKEN ?? process.env.LINEAR_ACCESS_TOKEN ?? process.env.LINEAR_API_KEY,
      ),
    webhookSecret: () => requiredEnv("LINEAR_WEBHOOK_SECRET", process.env.LINEAR_WEBHOOK_SECRET),
  },
});

function requiredEnv(name: string, value: string | undefined): string {
  if (value) return value;
  throw new Error(`Linear channel delivery blocked: missing ${name}.`);
}
