/**
 * Next.js 15 instrumentation hook — runs once at server startup (Node.js runtime only).
 *
 * Validates required env vars at boot so a misconfigured deployment fails fast
 * rather than crashing on the first user-facing request. Also warns if the
 * alert webhook is absent in deployed runtimes so operators know alerts are
 * suppressed. Local development intentionally stays quiet unless an alertable
 * error actually occurs.
 *
 * Phoenix tracing: set PHOENIX_TRACING=true in .env.local, then run:
 *   pip install arize-phoenix && python -m phoenix.server.main
 *   open http://localhost:6006
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // ---------------------------------------------------------------------------
    // Phoenix / OpenTelemetry tracing (local debugging only)
    // Enable with: PHOENIX_TRACING=true in .env.local
    // ---------------------------------------------------------------------------
    if (process.env.PHOENIX_TRACING === "true") {
      const { NodeSDK } = await import("@opentelemetry/sdk-node");
      const { OTLPTraceExporter } = await import(
        "@opentelemetry/exporter-trace-otlp-http"
      );
      const { OpenAIInstrumentation } = await import(
        "@arizeai/openinference-instrumentation-openai"
      );

      const sdk = new NodeSDK({
        traceExporter: new OTLPTraceExporter({
          url:
            process.env.PHOENIX_ENDPOINT ??
            "http://localhost:4318/v1/traces",
        }),
        instrumentations: [
          new OpenAIInstrumentation({}),
        ],
      });

      sdk.start();
      console.log(
        "[instrumentation] Phoenix tracing enabled → http://localhost:6006",
      );
    }


    const { validateEnvVars } = await import("@/lib/guardrails/env");

    validateEnvVars("instrumentation/startup", [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
    ]);

    const shouldWarnForMissingAlertWebhook =
      process.env.NODE_ENV !== "development" ||
      process.env.VERCEL_ENV === "preview";

    if (
      shouldWarnForMissingAlertWebhook &&
      !process.env.ERROR_ALERT_WEBHOOK_URL?.trim()
    ) {
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
