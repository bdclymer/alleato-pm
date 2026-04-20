"use client";
/* eslint-disable design-system/no-raw-heading */

import {
  CheckCircle,
  ListTodo,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  Sparkles,
  Loader2,
} from "lucide-react";
import { useMeetingDigest } from "@/hooks/use-meeting-digest";
import { SectionRuleHeading } from "@/components/layout/spacing";
import type {
  DigestDecision,
  DigestActionItem,
  DigestRisk,
  DigestOpportunity,
  DigestFollowUp,
} from "@/hooks/use-meeting-digest";

interface DigestSectionProps {
  projectId: string;
  meetingId: string;
}

export function DigestSection({ projectId, meetingId }: DigestSectionProps) {
  const { data: digest, isLoading } = useMeetingDigest(projectId, meetingId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading digest...
      </div>
    );
  }

  if (!digest) {
    return null;
  }

  const hasDecisions = digest.decisions_summary?.length > 0;
  const hasActions = digest.action_items_summary?.length > 0;
  const hasRisks = digest.risks_summary?.length > 0;
  const hasOpportunities = digest.opportunities_summary?.length > 0;
  const hasFollowUps = digest.follow_ups?.length > 0;
  const hasTakeaways = digest.key_takeaways?.length > 0;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <SectionRuleHeading label="AI Digest" />
      </div>

      {hasTakeaways && (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {digest.key_takeaways.join(" ")}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {hasDecisions && (
          <DigestList
            icon={<CheckCircle className="h-4 w-4 text-green-700" />}
            title={`Decisions (${digest.decisions_summary.length})`}
          >
            {digest.decisions_summary.map((d: DigestDecision, i: number) => (
              <li key={i} className="text-sm leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">{d.decision}</span>
                {d.owner ? <span className="ml-1">— {d.owner}</span> : null}
              </li>
            ))}
          </DigestList>
        )}

        {hasActions && (
          <DigestList
            icon={<ListTodo className="h-4 w-4 text-blue-700" />}
            title={`Action Items (${digest.action_items_summary.length})`}
          >
            {digest.action_items_summary.map((a: DigestActionItem, i: number) => (
              <li key={i} className="text-sm leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">{a.action}</span>
                {(a.assignee || a.due) && (
                  <span className="ml-1">
                    {a.assignee ? `— ${a.assignee}` : ""}
                    {a.due ? ` (by ${a.due})` : ""}
                  </span>
                )}
              </li>
            ))}
          </DigestList>
        )}

        {hasRisks && (
          <DigestList
            icon={<AlertTriangle className="h-4 w-4 text-amber-700" />}
            title={`Risks (${digest.risks_summary.length})`}
          >
            {digest.risks_summary.map((r: DigestRisk, i: number) => (
              <li key={i} className="text-sm leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">{r.risk}</span>
                {r.severity ? <span className="ml-1">[{r.severity}]</span> : null}
                {r.mitigation ? <span className="ml-1">— {r.mitigation}</span> : null}
              </li>
            ))}
          </DigestList>
        )}

        {hasOpportunities && (
          <DigestList
            icon={<Lightbulb className="h-4 w-4 text-purple-700" />}
            title={`Opportunities (${digest.opportunities_summary.length})`}
          >
            {digest.opportunities_summary.map((o: DigestOpportunity, i: number) => (
              <li key={i} className="text-sm leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">{o.opportunity}</span>
                {o.type ? <span className="ml-1">({o.type})</span> : null}
              </li>
            ))}
          </DigestList>
        )}
      </div>

      {hasFollowUps && (
        <div className="border-t border-border pt-4">
          <div className="mb-2 flex items-center gap-2">
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Follow-ups
            </h4>
          </div>
          <ul className="space-y-2">
            {digest.follow_ups.map((f: DigestFollowUp, i: number) => (
              <li key={i} className="text-sm text-muted-foreground">
                <span className="text-foreground">{f.item}</span>
                {f.owner ? <span className="ml-1">— {f.owner}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function DigestList({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 border-l border-border pl-4">
      <div className="flex items-center gap-2">
        {icon}
        <SectionRuleHeading label={title} />
      </div>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}
