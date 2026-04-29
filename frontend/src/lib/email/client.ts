import { Resend } from "resend";

/**
 * Resend client singleton. Lazily instantiated so build-time imports don't
 * crash when RESEND_API_KEY is missing. Use `getResend()` in server code only.
 */
let _resend: Resend | null = null;

export function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }
  if (!_resend) {
    _resend = new Resend(apiKey);
  }
  return _resend;
}

export const EMAIL_FROM =
  process.env.EMAIL_FROM_ADDRESS ?? "Alleato <notifications@alleato.app>";

export const DEFAULT_APP_BASE_URL = "https://projects.alleatogroup.com";

const LEGACY_APP_HOSTS = new Set(["app.alleato.com"]);

export function resolveAppBaseUrl(value = process.env.NEXT_PUBLIC_APP_URL) {
  const rawValue = value?.trim();

  if (!rawValue) {
    return DEFAULT_APP_BASE_URL;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawValue);
  } catch {
    throw new Error(
      `Invalid NEXT_PUBLIC_APP_URL for email links: "${rawValue}". Expected an absolute URL such as ${DEFAULT_APP_BASE_URL}.`,
    );
  }

  if (LEGACY_APP_HOSTS.has(parsedUrl.hostname)) {
    return DEFAULT_APP_BASE_URL;
  }

  return parsedUrl.origin;
}

export const APP_BASE_URL = resolveAppBaseUrl();
