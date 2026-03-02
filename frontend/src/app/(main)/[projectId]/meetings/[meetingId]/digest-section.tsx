"use client";

import {
  CheckCircle,
  ListTodo,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  Sparkles,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { useMeetingDigest } from "@/hooks/use-meeting-digest";
import type {
  DigestDecision,
  DigestActionItem,
  DigestRisk,
  DigestOpportunity,
  DigestFollowUp,
} from "@/hooks/use-meeting-digest";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface DigestSectionProps {
  projectId: string;
  meetingId: string;
}

export function DigestSection({ projectId, meetingId }: DigestSectionProps) {
  const { data: digest, isLoading } = useMeetingDigest(projectId, meetingId);

  if (isLoading) {
    return (
      <div className="border border-neutral-200 bg-background p-6 mb-6 rounded-xl">
        <div className="flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-brand" />
          <span className="text-sm text-neutral-500">Loading digest...</span>
        </div>
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
    <div className="border border-brand/20 bg-brand/[0.02] p-6 mb-6 rounded-xl">
      <div className="flex items-center gap-2 mb-5">
        <Sparkles className="h-4 w-4 text-brand" />
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-brand">
          AI Digest
        </h2>
      </div>

      {/* Key Takeaways */}
      {hasTakeaways && (
        <div className="mb-5">
          <p className="text-sm text-neutral-700 leading-relaxed">
            {digest.key_takeaways.join(" ")}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {hasDecisions && (
          <CollapsibleList
            icon={<CheckCircle className="h-4 w-4 text-green-700" />}
            title="Decisions"
            count={digest.decisions_summary.length}
            colorClass="text-green-700"
          >
            {digest.decisions_summary.map(
              (d: DigestDecision, i: number) => (
                <li key={i} className="text-sm text-neutral-700 leading-relaxed">
                  <span className="font-medium">{d.decision}</span>
                  {d.owner && (
                    <span className="text-neutral-500 ml-1">
                      — {d.owner}
                    </span>
                  )}
                </li>
              )
            )}
          </CollapsibleList>
        )}

        {hasActions && (
          <CollapsibleList
            icon={<ListTodo className="h-4 w-4 text-blue-700" />}
            title="Action Items"
            count={digest.action_items_summary.length}
            colorClass="text-blue-700"
          >
            {digest.action_items_summary.map(
              (a: DigestActionItem, i: number) => (
                <li key={i} className="text-sm text-neutral-700 leading-relaxed">
                  <span className="font-medium">{a.action}</span>
                  {(a.assignee || a.due) && (
                    <span className="text-neutral-500 ml-1">
                      {a.assignee && `— ${a.assignee}`}
                      {a.due && ` (by ${a.due})`}
                    </span>
                  )}
                </li>
              )
            )}
          </CollapsibleList>
        )}

        {hasRisks && (
          <CollapsibleList
            icon={<AlertTriangle className="h-4 w-4 text-amber-700" />}
            title="Risks"
            count={digest.risks_summary.length}
            colorClass="text-amber-700"
          >
            {digest.risks_summary.map((r: DigestRisk, i: number) => (
              <li key={i} className="text-sm text-neutral-700 leading-relaxed">
                <span className="font-medium">{r.risk}</span>
                {r.severity && (
                  <span className="text-neutral-500 ml-1">
                    [{r.severity}]
                  </span>
                )}
                {r.mitigation && (
                  <span className="text-neutral-500 ml-1">
                    — {r.mitigation}
                  </span>
                )}
              </li>
            ))}
          </CollapsibleList>
        )}

        {hasOpportunities && (
          <CollapsibleList
            icon={<Lightbulb className="h-4 w-4 text-purple-700" />}
            title="Opportunities"
            count={digest.opportunities_summary.length}
            colorClass="text-purple-700"
          >
            {digest.opportunities_summary.map(
              (o: DigestOpportunity, i: number) => (
                <li key={i} className="text-sm text-neutral-700 leading-relaxed">
                  <span className="font-medium">{o.opportunity}</span>
                  {o.type && (
                    <span className="text-neutral-500 ml-1">
                      ({o.type})
                    </span>
                  )}
                </li>
              )
            )}
          </CollapsibleList>
        )}
      </div>

      {hasFollowUps && (
        <div className="mt-4 pt-4 border-t border-neutral-200">
          <div className="flex items-center gap-2 mb-3">
            <ArrowRight className="h-3.5 w-3.5 text-neutral-500" />
            <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-600">
              Follow-ups
            </h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {digest.follow_ups.map((f: DigestFollowUp, i: number) => (
              <span
                key={i}
                className="px-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 text-neutral-700 rounded-full"
              >
                {f.item}
                {f.owner && (
                  <span className="text-neutral-500"> — {f.owner}</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Collapsible list sub-component
interface CollapsibleListProps {
  icon: React.ReactNode;
  title: string;
  count: number;
  colorClass: string;
  children: React.ReactNode;
}

function CollapsibleList({
  icon,
  title,
  count,
  colorClass,
  children,
}: CollapsibleListProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="border border-neutral-200 bg-white rounded-lg p-4">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          {icon}
          <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-600">
            {title} ({count})
          </h4>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-neutral-400 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>
      {isOpen && (
        <ul className={cn("mt-3 space-y-2 list-disc list-inside", colorClass)}>
          {children}
        </ul>
      )}
    </div>
  );
}
