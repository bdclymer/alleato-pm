/**
 * Next.js 15 instrumentation hook — runs once at server startup.
 *
 * Validates required env vars at boot so a misconfigured deployment fails fast
 * rather than crashing on the first user-facing request. Also warns if the
 * alert webhook is absent in deployed runtimes so operators know alerts are
 * suppressed. Local development intentionally stays quiet unless an alertable
 * error actually occurs.
 *
 * Sentry is only initialized when NEXT_PUBLIC_SENTRY_DSN (or SENTRY_DSN) is set,
 * so dev environments without the env var are completely unaffected.
 *
 * Phoenix tracing: set PHOENIX_TRACING=true in .env.local, then run:
 *   pip install arize-phoenix && python -m phoenix.server.main
 *   open http://localhost:6006
 */

import * as Sentry from "@sentry/nextjs";

const sentryDsnPresent = Boolean(
  process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
);

const langfuseConfigured = Boolean(
  process.env.LANGFUSE_PUBLIC_KEY?.trim() &&
    process.env.LANGFUSE_SECRET_KEY?.trim(),
);

// Holds the live Langfuse span processor once register() wires it up so route
// handlers can force a flush before the serverless function suspends. ES module
// live bindings mean importers observe this assignment after startup.
let langfuseSpanProcessor: { forceFlush: () => Promise<void> } | null = null;

/**
 * Flush any buffered Langfuse spans. Call from `after()` in AI route handlers
 * so traces are not lost when the serverless function suspends. No-ops when
 * Langfuse is not configured.
 */
export async function flushLangfuse(): Promise<void> {
  if (!langfuseSpanProcessor) return;
  await langfuseSpanProcessor.forceFlush();
}

export async function register() {
  if (sentryDsnPresent && process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (sentryDsnPresent && process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }

  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Langfuse takes precedence over Phoenix: both register a global OTel tracer
    // provider, and only one can win. Langfuse is the production observability
    // path; Phoenix stays a local-only opt-in fallback.
    if (langfuseConfigured) {
      const { LangfuseSpanProcessor } = await import("@langfuse/otel");
      const { NodeTracerProvider } = await import(
        "@opentelemetry/sdk-trace-node"
      );
      const { setLangfuseTracerProvider } = await import("@langfuse/tracing");
      const { maskLangfuse } = await import("./lib/ai/langfuse-mask");

      // Redact PII (emails / SSN / card / phone) before egress to us.cloud.
      const processor = new LangfuseSpanProcessor({ mask: maskLangfuse });
      langfuseSpanProcessor = processor;

      // ISOLATED provider — NOT registered as the global OTel provider.
      //
      // Sentry's SDK (@sentry/nextjs v9) claims the global TracerProvider during
      // Sentry.init() above. OpenTelemetry allows only one global provider, so a
      // second `provider.register()` here silently no-ops and Langfuse's
      // processor never receives spans — which is exactly why traces stopped on
      // 2026-06-10 once Sentry + the OTel telemetry path were both live.
      //
      // Instead we hand Langfuse its own provider via setLangfuseTracerProvider.
      // The Langfuse tracing helpers (startActiveObservation / propagateAttributes
      // / getActiveTraceId) use it directly, and AI SDK spans reach it because
      // `aiTelemetry()` passes `getLangfuseTracer()` as the telemetry tracer. This
      // keeps Sentry's global provider — and its error/perf tracing — untouched,
      // and decouples Langfuse from Sentry's tracesSampleRate (which is 0.1 in
      // prod and would otherwise drop 90% of LLM traces).
      // Ref: https://langfuse.com/faq/all/existing-sentry-setup (Option C)
      const provider = new NodeTracerProvider({
        spanProcessors: [processor],
      });
      setLangfuseTracerProvider(provider);

      console.log(
        "[instrumentation] Langfuse tracing enabled (isolated provider) → " +
          (process.env.LANGFUSE_BASE_URL ?? "https://us.cloud.langfuse.com"),
      );
    } else if (process.env.PHOENIX_TRACING === "true") {
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
        instrumentations: [new OpenAIInstrumentation({})],
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

// Capture errors from Server Components, middleware, and route handlers.
// Sentry no-ops when the SDK was not initialized because no DSN is configured.
export const onRequestError = Sentry.captureRequestError;
