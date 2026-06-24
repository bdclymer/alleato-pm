"use client";

import { EmailsClient } from "@/app/(main)/[projectId]/emails/emails-client";

/**
 * Global Emails surface — the company inbox, reading the live Outlook intake.
 *
 * The Brandon "Triage" tab was removed; triage is handled elsewhere, not as a
 * sub-tab here. Passing an empty navigationTabs hides the surface tab bar.
 */
export function EmailsSurfaceClient() {
  return <EmailsClient scope="global" source="all" navigationTabs={[]} />;
}
