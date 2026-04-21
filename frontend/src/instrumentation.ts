/**
 * Next.js 15 instrumentation hook — runs once at server startup (Node.js runtime only).
 *
 * Validates required env vars at boot so a misconfigured deployment fails fast
 * rather than crashing on the first user-facing request. Also warns if the
 * alert webhook is absent so operators know alerts are suppressed.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnvVars } = await import("@/lib/guardrails/env");

    validateEnvVars("instrumentation/startup", [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
    ]);

    if (!process.env.ERROR_ALERT_WEBHOOK_URL?.trim()) {
      console.warn(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: "warn",
          event: "startup_config_warning",
          where: "instrumentation/startup",
          message:
            "ERROR_ALERT_WEBHOOK_URL is not set. Critical/high-severity errors will be logged but not alerted externally. Set this env var to enable webhook alerting.",
        }),
      );
    }
  }
}
