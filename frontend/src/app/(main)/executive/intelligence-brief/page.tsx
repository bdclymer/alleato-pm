import Link from "next/link";
import { AppCapabilityAccessDenied } from "@/components/guards/app-capability-access-denied";
import { PageShell } from "@/components/layout";
import { canCurrentUserAccessAppCapability } from "@/lib/app-capabilities";
import {
  DEFAULT_EXECUTIVE_WINDOW_DAYS,
  clampDailyBriefWindowDays,
} from "@/lib/executive/daily-brief";
import { getExecutiveBriefingDashboard } from "@/lib/executive/executive-briefing-workflow";
import {
  generateExecutiveIntelligenceBrief,
  type MorningIntelligenceBrief,
  type EveningIntelligenceBrief,
} from "@/lib/executive/intelligence-brief";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// Section block
// ---------------------------------------------------------------------------

function BriefSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <span className="text-xs font-semibold uppercase tracking-widest text-primary">
        {label}
      </span>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Bullet list
// ---------------------------------------------------------------------------

function BulletList({ items, empty }: { items: string[]; empty?: string }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{empty ?? "None."}</p>
    );
  }
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5 text-sm leading-6 text-foreground">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/40" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Morning brief card
// ---------------------------------------------------------------------------

function MorningBriefCard({ brief }: { brief: MorningIntelligenceBrief }) {
  return (
    <div className="space-y-8">
      <BriefSection label="Executive Snapshot">
        <BulletList items={brief.executiveSnapshot} empty="No items surfaced." />
      </BriefSection>

      <BriefSection label="Today's Focus">
        {brief.todaysPriorities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No priorities surfaced.</p>
        ) : (
          <ol className="space-y-2">
            {brief.todaysPriorities.map((priority, idx) => (
              <li key={priority} className="flex gap-3 text-sm leading-6 text-foreground">
                <span className="w-5 shrink-0 font-semibold tabular-nums text-muted-foreground">
                  {idx + 1}.
                </span>
                <span>{priority}</span>
              </li>
            ))}
          </ol>
        )}
      </BriefSection>

      <BriefSection label="Watch Items">
        <BulletList items={brief.watchItems} empty="Nothing to watch." />
      </BriefSection>

      {brief.decisionsApproaching.length > 0 && (
        <BriefSection label="Upcoming Decisions">
          <div className="space-y-4">
            {brief.decisionsApproaching.map((decision) => (
              <div key={decision.title} className="space-y-1">
                <div className="text-sm font-semibold text-foreground">
                  {decision.title}
                </div>
                <div className="text-xs text-muted-foreground">
                  Decision needed:{" "}
                  <span className="font-medium text-foreground">
                    {decision.decisionNeededBy}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Impact: {decision.impact}
                </div>
              </div>
            ))}
          </div>
        </BriefSection>
      )}

      <BriefSection label="Project Forecast">
        <p className="text-sm leading-7 text-foreground">{brief.forecast}</p>
      </BriefSection>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Evening brief card
// ---------------------------------------------------------------------------

function EveningBriefCard({ brief }: { brief: EveningIntelligenceBrief }) {
  const ownerAttentionIsNone = /^none\.?$/i.test(brief.ownerAttentionRequired.trim());
  const noRiskChange = /^no (new |change|schedule)/i.test(brief.risksThatIncreased.trim());

  return (
    <div className="space-y-8">
      <BriefSection label="Today's Developments">
        <BulletList items={brief.whatChangedToday} empty="No changes recorded today." />
      </BriefSection>

      <BriefSection label="Decisions Made">
        {brief.decisionsMade.length === 0 ? (
          <p className="text-sm text-muted-foreground">No decisions recorded today.</p>
        ) : (
          <ul className="space-y-2">
            {brief.decisionsMade.map((decision) => (
              <li key={decision} className="flex gap-2.5 text-sm leading-6 text-foreground">
                <span className="shrink-0 text-green-600 dark:text-green-400">✓</span>
                <span>{decision}</span>
              </li>
            ))}
          </ul>
        )}
      </BriefSection>

      <BriefSection label="Risk Update">
        <p
          className={`text-sm leading-6 ${
            noRiskChange ? "text-muted-foreground" : "text-foreground"
          }`}
        >
          {noRiskChange ? null : (
            <span className="mr-1.5 font-semibold text-status-warning">↑</span>
          )}
          {brief.risksThatIncreased}
        </p>
      </BriefSection>

      <BriefSection label="Owner Attention">
        <div
          className={`rounded-md px-4 py-3 text-sm leading-6 ${
            ownerAttentionIsNone
              ? "bg-muted text-muted-foreground"
              : "bg-status-warning/10 text-status-warning"
          }`}
        >
          {brief.ownerAttentionRequired}
        </div>
      </BriefSection>

      <BriefSection label="Strategic Insight">
        <p className="text-sm italic leading-7 text-foreground">
          {brief.strategicInsight}
        </p>
      </BriefSection>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function IntelligenceBriefPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const canView = await canCurrentUserAccessAppCapability("view_executive_briefing");

  if (!canView) {
    return (
      <AppCapabilityAccessDenied
        title="Executive briefing"
        description="This executive briefing is limited to users with executive briefing access."
      />
    );
  }

  const resolvedParams = searchParams ? await searchParams : {};
  const rawDays = Array.isArray(resolvedParams.days)
    ? resolvedParams.days[0]
    : resolvedParams.days;
  const windowDays = Number.isFinite(Number(rawDays))
    ? clampDailyBriefWindowDays(Number(rawDays))
    : DEFAULT_EXECUTIVE_WINDOW_DAYS;

  const rawType = Array.isArray(resolvedParams.type)
    ? resolvedParams.type[0]
    : resolvedParams.type;
  const forceBriefType =
    rawType === "morning" || rawType === "evening" ? rawType : undefined;

  const { draft } = await getExecutiveBriefingDashboard({ windowDays });
  const brief = await generateExecutiveIntelligenceBrief(draft.packet, {
    forceBriefType,
  });

  const todayLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  return (
    <PageShell
      variant="content"
      eyebrow={todayLabel}
      title="Executive Daily Brief"
      contentClassName="pb-16"
    >
      <div className="space-y-10">
        {brief.morning && <MorningBriefCard brief={brief.morning} />}
        {brief.evening && <EveningBriefCard brief={brief.evening} />}

        <div className="border-t border-border pt-4 text-xs text-muted-foreground">
          <span className="font-medium">Compare with: </span>
          <Link href="/executive" className="underline-offset-4 hover:underline">
            Format A — Operating Brief
          </Link>
          {" · "}
          <Link
            href="/executive/intelligence-brief?type=morning"
            className="underline-offset-4 hover:underline"
          >
            Force Morning
          </Link>
          {" · "}
          <Link
            href="/executive/intelligence-brief?type=evening"
            className="underline-offset-4 hover:underline"
          >
            Force Evening
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
