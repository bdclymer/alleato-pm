"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Circle, Zap } from "lucide-react";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { DetailField } from "@/components/ds/DetailField";
import { SectionRuleHeading } from "@/components/layout/spacing";

import {
  type AiAgent,
  STATUS_LABELS,
  STATUS_COLORS,
  IMPACT_COLORS,
} from "./ai-agents-table-config";

interface AiAgentDetailPanelProps {
  agent: AiAgent | null;
  onClose: () => void;
}

function GapRow({ label, value }: { label: string; value: string | null | undefined }) {
  const missing = !value;
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border last:border-0">
      <div className="mt-0.5 shrink-0">
        {missing ? (
          <AlertTriangle className="h-3.5 w-3.5 text-status-warning" />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5 text-status-success" />
        )}
      </div>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
        <span className={`text-sm ${missing ? "text-muted-foreground italic" : "text-foreground"}`}>
          {value ?? "Not defined"}
        </span>
      </div>
    </div>
  );
}

export function AiAgentDetailPanel({ agent, onClose }: AiAgentDetailPanelProps) {
  if (!agent) return null;

  return (
    <Sheet open={!!agent} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-xl">
        <SheetHeader className="mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[agent.status]}`}
            >
              {STATUS_LABELS[agent.status]}
            </span>
            {agent.domain && (
              <Badge variant="outline" className="text-xs capitalize">
                {agent.domain}
              </Badge>
            )}
            {agent.layer && (
              <Badge variant="outline" className="text-xs capitalize">
                {agent.layer}
              </Badge>
            )}
          </div>
          <SheetTitle className="text-lg leading-snug mt-2">{agent.name}</SheetTitle>
          {agent.purpose && (
            <p className="text-sm text-muted-foreground leading-relaxed">{agent.purpose}</p>
          )}
        </SheetHeader>

        {/* ── How it runs ────────────────────────────────────────── */}
        <section className="mb-6">
          <SectionRuleHeading
            label="How it runs"
            icon={<Zap className="h-3.5 w-3.5" />}
          />
          <div className="space-y-0">
            <DetailField label="Trigger" value={agent.trigger_type ?? "—"} />
            <DetailField label="Detail" value={agent.trigger_detail ?? "—"} />
            <DetailField label="Freshness" value={agent.data_freshness_requirement ?? "—"} />
            <DetailField
              label="Approval"
              value={
                agent.approval_required == null
                  ? "—"
                  : agent.approval_required
                    ? "Required before output is trusted"
                    : "Auto-publishes"
              }
            />
          </div>
        </section>

        {/* ── Data ────────────────────────────────────────────────── */}
        <section className="mb-6">
          <SectionRuleHeading label="Data" />
          <div className="space-y-0">
            <DetailField
              label="Sources"
              value={
                agent.data_sources?.length
                  ? agent.data_sources.join(", ")
                  : "—"
              }
            />
            <DetailField label="Output type" value={agent.output_type ?? "—"} />
            <DetailField label="Destination" value={agent.output_destination ?? "—"} />
          </div>
        </section>

        {/* ── Dependencies ─────────────────────────────────────────── */}
        {agent.dependencies?.length > 0 && (
          <section className="mb-6">
            <SectionRuleHeading label="Dependencies" />
            <div className="flex flex-wrap gap-1.5">
              {agent.dependencies.map((dep) => (
                <Badge key={dep} variant="secondary" className="text-xs font-mono">
                  {dep}
                </Badge>
              ))}
            </div>
          </section>
        )}

        {/* ── Prioritization ────────────────────────────────────────── */}
        <section className="mb-6">
          <SectionRuleHeading label="Prioritization" />
          <div className="space-y-0">
            <DetailField label="Priority score" value={agent.priority_score != null ? String(agent.priority_score) : "—"} />
            <DetailField
              label="Impact"
              value={
                agent.estimated_impact ? (
                  <span className={`capitalize ${IMPACT_COLORS[agent.estimated_impact]}`}>
                    {agent.estimated_impact}
                  </span>
                ) : (
                  "—"
                )
              }
            />
            <DetailField label="Effort" value={agent.estimated_effort ?? "—"} />
          </div>
        </section>

        {/* ── Gap analysis ──────────────────────────────────────────── */}
        <section className="mb-6">
          <SectionRuleHeading
            label="Gap Analysis"
            actions={
              agent.gapCount > 0 ? (
                <span className="text-xs font-normal text-status-warning">
                  {agent.gapCount} undefined
                </span>
              ) : null
            }
          />
          <div>
            <GapRow label="Success metric" value={agent.success_metric} />
            <GapRow label="Confidence threshold" value={agent.confidence_threshold != null ? String(agent.confidence_threshold) : null} />
            <GapRow label="Failure behavior" value={agent.failure_behavior} />
            <GapRow label="Output destination" value={agent.output_destination} />
          </div>
        </section>

        {/* ── Blockers ─────────────────────────────────────────────── */}
        {agent.blockers && (
          <section className="mb-6">
            <SectionRuleHeading
              label="Blockers"
              icon={<Circle className="h-3.5 w-3.5 fill-status-error text-status-error" />}
            />
            <p className="text-sm text-status-error leading-relaxed">
              {agent.blockers}
            </p>
          </section>
        )}

        {/* ── Runtime stats ─────────────────────────────────────────── */}
        <section className="mb-6">
          <SectionRuleHeading label="Runtime" />
          <div className="space-y-0">
            <DetailField
              label="Last run"
              value={
                agent.runStats.lastRun
                  ? new Date(agent.runStats.lastRun).toLocaleString()
                  : "Never recorded"
              }
            />
            <DetailField
              label="Success rate"
              value={
                agent.runStats.totalRuns > 0
                  ? `${agent.runStats.successRate}% (${agent.runStats.totalRuns} runs)`
                  : "No runs recorded"
              }
            />
          </div>
        </section>

        {/* ── Notes ────────────────────────────────────────────────── */}
        {agent.notes && (
          <section>
            <SectionRuleHeading label="Notes" />
            <p className="text-sm text-muted-foreground leading-relaxed">{agent.notes}</p>
          </section>
        )}
      </SheetContent>
    </Sheet>
  );
}
