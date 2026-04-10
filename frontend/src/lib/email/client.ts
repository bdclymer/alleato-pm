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

export const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://app.alleato.com";
