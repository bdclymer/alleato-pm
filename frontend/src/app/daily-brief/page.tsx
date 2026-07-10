import type { Metadata } from "next";
import { Lato, Oswald } from "next/font/google";

import { AppCapabilityAccessDenied } from "@/components/guards/app-capability-access-denied";
import { canCurrentUserAccessAppCapability } from "@/lib/app-capabilities";

import { loadRealBriefTasks } from "../(main)/executive/morning-brief-v2/brief-tasks";
import { MorningBriefV2Client } from "../(main)/executive/morning-brief-v2/brief-v2-client";
import "../(main)/executive/morning-brief-v2/brief-v2.css";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Daily Executive Brief",
  description:
    "Owner-facing daily executive brief — decisions, per-project status, and action items, each traced to its source inside the app.",
};

// Bespoke brief surface: serif display face + humanist sans, exposed to the
// scoped CSS (brief-v2.css) as variables.
const displayFont = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mb-display",
  display: "swap",
});
const bodyFont = Lato({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-mb-body",
  display: "swap",
});
const fontClassName = `${displayFont.variable} ${bodyFont.variable}`;

/**
 * The Daily Executive Brief. Renders the scannable, in-app-linked design with
 * interactive action items (mark resolved, create / edit / delete). Action items
 * are the real daily-deep-read tasks (`public.tasks`); the narrative is the
 * July-9 snapshot for now, pending wiring to the live brief packet.
 *
 * Full-bleed (no app shell), gated by the executive-briefing capability.
 */
export default async function DailyBriefPage() {
  const canView = await canCurrentUserAccessAppCapability("view_executive_briefing");

  if (!canView) {
    return (
      <AppCapabilityAccessDenied
        title="Daily Executive Brief"
        description="This executive brief is limited to users with executive briefing access."
      />
    );
  }

  const tasks = await loadRealBriefTasks();

  return (
    <div className={fontClassName}>
      <MorningBriefV2Client tasks={tasks} />
    </div>
  );
}
