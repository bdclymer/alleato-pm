import { Lato, Oswald } from "next/font/google";

import { AppCapabilityAccessDenied } from "@/components/guards/app-capability-access-denied";
import { PageShell } from "@/components/layout";
import { canCurrentUserAccessAppCapability } from "@/lib/app-capabilities";

import { loadRealBriefTasks } from "./brief-tasks";
import { MorningBriefV2Client } from "./brief-v2-client";
import "./brief-v2.css";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// The bespoke brief surface uses a serif display face + humanist sans, exposed to
// the scoped CSS as variables (see brief-v2.css).
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
 * Standalone, mobile-responsive, interactive Morning Brief preview. Renders the
 * hand-authored July 9 edition (brief-content.ts) so the layout and the
 * resolve / edit / add-task interactions can be reviewed on a real device before
 * this surface is wired to the live daily-executive-brief packet. Gated by the
 * same executive-briefing capability as the sibling brief pages.
 */
export default async function MorningBriefV2Page() {
  const canView = await canCurrentUserAccessAppCapability("view_executive_briefing");

  if (!canView) {
    return (
      <AppCapabilityAccessDenied
        title="Executive briefing"
        description="The Morning Brief is limited to users with executive briefing access."
      />
    );
  }

  // Real action items from the daily deep read (public.tasks). Falls back to the
  // static snapshot inside the client when the DB is unreachable at build time.
  const tasks = await loadRealBriefTasks();

  return (
    <PageShell
      variant="table"
      title="The Morning Brief"
      showHeader={false}
      containerPaddingClassName="p-0"
      contentClassName="p-0"
    >
      <div className={fontClassName}>
        <MorningBriefV2Client tasks={tasks} />
      </div>
    </PageShell>
  );
}
