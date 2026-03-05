/**
 * Next.js Instrumentation — LangFuse AI Observability
 *
 * This file is automatically loaded by Next.js on server startup.
 * It sets up OpenTelemetry tracing to send AI SDK spans to LangFuse.
 *
 * What gets traced automatically:
 *  - Every streamText / generateText call with experimental_telemetry enabled
 *  - Model ID, provider, token usage (prompt + completion)
 *  - Tool calls (name, args, results, duration)
 *  - Latency (TTFB for streaming, total duration)
 *  - Custom metadata (userId, sessionId, projectId)
 *
 * IMPORTANT: The processor is stored on globalThis so API routes can call
 * forceFlush() after streaming completes. Without forceFlush(), the batch
 * processor may not send spans before the serverless function shuts down.
 *
 * Cloud dashboard: https://us.cloud.langfuse.com
 *
 * @see https://langfuse.com/integrations/frameworks/vercel-ai-sdk
 */
export async function register() {
  // Only instrument on the server side (Node.js runtime)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { LangfuseSpanProcessor } = await import("@langfuse/otel");
    const { NodeTracerProvider } = await import(
      "@opentelemetry/sdk-trace-node"
    );

    // Support both LANGFUSE_BASE_URL and LANGFUSE_HOST (Vercel convention)
    const langfuseBaseUrl =
      process.env.LANGFUSE_BASE_URL ??
      process.env.LANGFUSE_HOST ??
      "https://us.cloud.langfuse.com";

    const langfuseProcessor = new LangfuseSpanProcessor({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      baseUrl: langfuseBaseUrl,
    });

    // Store on globalThis so API routes can call forceFlush() after streaming.
    // Pattern recommended by Langfuse for Next.js + streaming responses.
    (globalThis as Record<string, unknown>).__langfuseSpanProcessor =
      langfuseProcessor;

    const tracerProvider = new NodeTracerProvider({
      // Type assertion needed due to minor version mismatch between
      // @langfuse/otel's bundled OTel types and @opentelemetry/sdk-trace-node
      spanProcessors: [langfuseProcessor as any],
    });

    tracerProvider.register();

    // Log startup confirmation
    if (process.env.LANGFUSE_PUBLIC_KEY) {
      console.log(
        `[LangFuse] AI observability enabled — traces → ${langfuseBaseUrl}`,
      );
    } else {
      console.log(
        "[LangFuse] No API keys configured. Add LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY to .env",
      );
    }
  }
}
