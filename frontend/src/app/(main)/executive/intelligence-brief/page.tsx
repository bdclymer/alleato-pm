import Link from "next/link";
import { CheckCircle2, AlertTriangle, XCircle, Clock, Eye, Target, TrendingUp } from "lucide-react";
import { AppCapabilityAccessDenied } from "@/components/guards/app-capability-access-denied";
import { PageShell, SectionRuleHeading } from "@/components/layout";
import { canCurrentUserAccessAppCapability } from "@/lib/app-capabilities";
import {
  DEFAULT_EXECUTIVE_WINDOW_DAYS,
  clampDailyBriefWindowDays,
} from "@/lib/executive/daily-brief";
import { getExecutiveBriefingDashboard } from "@/lib/executive/executive-briefing-workflow";
import {
  generateExecutiveIntelligenceBrief,
  type BriefHealthStatus,
  type MorningIntelligenceBrief,
  type EveningIntelligenceBrief,
  type ExecutiveIntelligenceBrief,
} from "@/lib/executive/intelligence-brief";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// Health badge
// ---------------------------------------------------------------------------

function HealthBadge({ status }: { status: BriefHealthStatus }) {
  if (status === "on_track") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700 dark:text-green-400">
        <CheckCircle2 className="h-4 w-4" />
        On Track
      </span>
    );
  }
  if (status === "watch") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-status-warning">
        <AlertTriangle className="h-4 w-4" />
        Watch Items
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-destructive">
      <XCircle className="h-4 w-4" />
      Critical Attention Required
    </span>
  );
}

// ---------------------------------------------------------------------------
// Section block
// ---------------------------------------------------------------------------

function BriefSection({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
      </div>
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
      {/* Header */}
      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Morning Brief · Forward Looking
        </div>
        <div className="flex items-center justify-end gap-4">
          <HealthBadge status={brief.healthStatus} />
        </div>
      </div>

      <SectionRuleHeading label="" />

      {/* Executive Snapshot */}
      <BriefSection icon={<Eye className="h-4 w-4" />} label="Executive Snapshot">
        <BulletList items={brief.executiveSnapshot} empty="No items surfaced." />
      </BriefSection>

      {/* Today's Priorities */}
      <BriefSection icon={<Target className="h-4 w-4" />} label="Today's Focus">
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

      {/* Watch Items */}
      <BriefSection icon={<AlertTriangle className="h-4 w-4" />} label="Watch Items">
        <BulletList items={brief.watchItems} empty="Nothing to watch." />
      </BriefSection>

      {/* Decisions Approaching */}
      {brief.decisionsApproaching.length > 0 && (
        <BriefSection icon={<Clock className="h-4 w-4" />} label="Upcoming Decisions">
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

      {/* Forecast */}
      <BriefSection icon={<TrendingUp className="h-4 w-4" />} label="Project Forecast">
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
      {/* Header */}
      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Evening Brief · Intelligence Report
        </div>
        <div className="flex items-center justify-end gap-4">
          <HealthBadge status={brief.healthStatus} />
        </div>
      </div>

      <SectionRuleHeading label="" />

      {/* What Changed Today */}
      <BriefSection icon={<TrendingUp className="h-4 w-4" />} label="Today's Developments">
        <BulletList items={brief.whatChangedToday} empty="No changes recorded today." />
      </BriefSection>

      {/* Decisions Made */}
      <BriefSection icon={<CheckCircle2 className="h-4 w-4" />} label="Decisions Made">
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

      {/* Risk Update */}
      <BriefSection icon={<AlertTriangle className="h-4 w-4" />} label="Risk Update">
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

      {/* Owner Attention Required */}
      <BriefSection icon={<Target className="h-4 w-4" />} label="Owner Attention">
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

      {/* Strategic Insight */}
      <BriefSection icon={<Eye className="h-4 w-4" />} label="Strategic Insight">
        <p className="text-sm italic leading-7 text-foreground">
          {brief.strategicInsight}
        </p>
      </BriefSection>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Meta bar
// ---------------------------------------------------------------------------

function BriefMeta({ brief }: { brief: ExecutiveIntelligenceBrief }) {
  const briefDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(brief.generatedAt));
  const generatedAt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(brief.generatedAt));

  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">{briefDate}</p>
      <p className="text-xs text-muted-foreground">
        {brief.briefType === "morning" ? "Morning brief" : "Evening brief"} ·{" "}
        Generated {generatedAt} · {brief.windowDays}-day window
      </p>
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
      <div className="mx-auto max-w-2xl space-y-10">
        <BriefMeta brief={brief} />

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
