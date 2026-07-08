import { Archivo, JetBrains_Mono, Newsreader } from "next/font/google";

import { AppCapabilityAccessDenied } from "@/components/guards/app-capability-access-denied";
import { PageShell } from "@/components/layout";
import { canCurrentUserAccessAppCapability } from "@/lib/app-capabilities";
import { loadCurrentDailyExecutiveBriefPacket } from "@/lib/daily-briefs/canonical-packets";
import { buildExecutiveBriefViewModel } from "@/lib/daily-briefs/brief-view-model";

import { ExecutiveBriefView } from "./executive-brief-view";
import "./brief.css";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const displayFont = Archivo({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-brief-display",
  display: "swap",
});
const bodyFont = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-brief-body",
  display: "swap",
});
const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-brief-mono",
  display: "swap",
});

const fontClassName = `${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`;

export default async function IntelligenceBriefPage() {
  const canView = await canCurrentUserAccessAppCapability("view_executive_briefing");

  if (!canView) {
    return (
      <AppCapabilityAccessDenied
        title="Executive briefing"
        description="This executive briefing is limited to users with executive briefing access."
      />
    );
  }

  const packet = await loadCurrentDailyExecutiveBriefPacket();
  const model = buildExecutiveBriefViewModel(packet);

  return (
    <PageShell
      variant="table"
      title="Executive Daily Brief"
      showHeader={false}
      containerPaddingClassName="p-0"
      contentClassName="p-0"
    >
      <ExecutiveBriefView model={model} fontClassName={fontClassName} />
    </PageShell>
  );
}
