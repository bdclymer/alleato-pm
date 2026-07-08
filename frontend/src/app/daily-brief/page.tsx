import type { Metadata } from "next";
import { DailyBriefDocument } from "./daily-brief-document";

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
 */
export default function DailyBriefPage() {
  return (
    <div className="min-h-screen">
      <DailyBriefDocument />
    </div>
  );
}
