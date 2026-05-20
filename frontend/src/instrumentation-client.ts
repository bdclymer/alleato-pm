/**
 * Next.js 15 client instrumentation — runs on every browser page load.
 *
 * Sentry is only initialized when NEXT_PUBLIC_SENTRY_DSN is set, so this file
 * is a no-op in environments that haven't opted in.
 */

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  // The import has side effects (Sentry.init) — see sentry.client.config.ts.
  import("../sentry.client.config");
}
