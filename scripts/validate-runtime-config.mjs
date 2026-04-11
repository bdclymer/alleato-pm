#!/usr/bin/env node

/**
 * Validates critical runtime configuration.
 * Fails fast before deploy/startup if required env vars are missing or malformed.
 */

const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
];

const OPTIONAL_URLS = [
  "BACKEND_URL",
  "PYTHON_BACKEND_URL",
];

const missing = REQUIRED.filter((key) => !process.env[key]?.trim());
if (missing.length > 0) {
  console.error(`Missing required env vars: ${missing.join(", ")}`);
  process.exit(1);
}

const malformed = [];
for (const key of OPTIONAL_URLS) {
  const value = process.env[key];
  if (!value) continue;
  try {
    // eslint-disable-next-line no-new
    new URL(value);
  } catch {
    malformed.push(`${key}=${value}`);
  }
}

if (malformed.length > 0) {
  console.error(`Malformed URL env vars: ${malformed.join(", ")}`);
  process.exit(1);
}

if (
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.SUPABASE_ANON_KEY &&
  process.env.SUPABASE_SERVICE_ROLE_KEY === process.env.SUPABASE_ANON_KEY
) {
  console.error("Invalid config: service role key must not equal anon key.");
  process.exit(1);
}

console.log("Runtime config validation passed.");

