import type { Metadata } from "next";
import { AppCapabilityAccessDenied } from "@/components/guards/app-capability-access-denied";
import { canCurrentUserAccessAppCapability } from "@/lib/app-capabilities";
import { DailyBriefDocument } from "./daily-brief-document";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Daily Executive Brief · July 7, 2026",
  description:
    "Owner-facing daily executive brief — decisions, financial and schedule watch, calendar, and per-project status.",
};

/**
 * Standalone, full-viewport Daily Executive Brief.
 *
 * This route intentionally renders outside the app's PageShell chrome — it is a
 * bespoke editorial document (masthead + index rail + sections), not a standard
 * app screen. The design system components are deliberately not used here; see
 * daily-brief-document.tsx / brief-markup.ts for the rationale.
 *
 * Access is gated by the same `view_executive_briefing` capability as every
 * other Daily Brief surface (e.g. /executive, /daily-briefs) — the page exposes
 * owner-level financials, schedule risk, and project detail, so it must not be
 * visible to every authenticated user.
 */
export default async function DailyBriefPage() {
  const canViewExecutiveBriefing = await canCurrentUserAccessAppCapability(
    "view_executive_briefing",
  );

  if (!canViewExecutiveBriefing) {
    return (
      <AppCapabilityAccessDenied
        title="Daily Executive Brief"
        description="This executive brief is limited to users with executive briefing access."
      />
    );
  }

  return (
    <div className="min-h-screen">
      <DailyBriefDocument />
    </div>
  );
}
