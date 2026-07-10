import { IBM_Plex_Mono, Lato, Montserrat, Oswald } from "next/font/google";

import { AppCapabilityAccessDenied } from "@/components/guards/app-capability-access-denied";
import { PageShell } from "@/components/layout";
import { canCurrentUserAccessAppCapability } from "@/lib/app-capabilities";
import { loadCurrentDailyExecutiveBriefPacket } from "@/lib/daily-briefs/canonical-packets";
import { loadMorningBriefRailTasks } from "@/lib/daily-briefs/morning-brief-tasks";

import { MorningBriefClient } from "./morning-brief-client";
import { buildMorningBriefModel } from "./morning-brief-view-model";
import "./morning-brief.css";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const displayFont = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mb-display",
  display: "swap",
});
const headFont = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mb-head",
  display: "swap",
});
const bodyFont = Lato({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-mb-body",
  display: "swap",
});
const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mb-mono",
  display: "swap",
});

const fontClassName = `${displayFont.variable} ${headFont.variable} ${bodyFont.variable} ${monoFont.variable}`;

export default async function MorningBriefPage() {
  const canView = await canCurrentUserAccessAppCapability("view_executive_briefing");

  if (!canView) {
    return (
      <AppCapabilityAccessDenied
        title="Executive briefing"
        description="The Morning Brief is limited to users with executive briefing access."
      />
    );
  }

  const packet = await loadCurrentDailyExecutiveBriefPacket();
  const model = buildMorningBriefModel(packet);
  const rail = await loadMorningBriefRailTasks(model.businessDate);

  return (
    <PageShell
      variant="table"
      title="The Morning Brief"
      showHeader={false}
      containerPaddingClassName="p-0"
      contentClassName="p-0"
    >
      <div className={fontClassName}>
        <div className="morning-brief">
          <MorningBriefClient model={model} rail={rail} />
        </div>
      </div>
    </PageShell>
  );
}
