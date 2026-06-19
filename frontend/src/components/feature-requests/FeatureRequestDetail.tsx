import Link from "next/link";
import { ExternalLinkIcon, FileTextIcon, GitBranchIcon } from "lucide-react";

import {
  InspectorRail,
  InspectorSection,
  PropertyList,
  PropertyRow,
  ToneDot,
} from "@/components/ds";
import { cn } from "@/lib/utils";
import { scoreFeatureRequestReadiness } from "@/lib/feature-requests/readiness";
import type { FeatureRequestDetail as FeatureRequestDetailData } from "@/lib/feature-requests/types";
import { RequestTimeline } from "./RequestTimeline";

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function formatLabel(value: string | null | undefined): string {
  if (!value) return "Not set";
  return value.replaceAll("_", " ");
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "Not tracked";
  return new Date(value).toLocaleString();
}

function statusTone(value: string | null | undefined): "success" | "warning" | "danger" | "info" | "neutral" {
  const normalized = value?.toLowerCase().replaceAll("_", " ") ?? "";
  if (["ready for build", "accepted", "synced", "created", "complete"].includes(normalized)) return "success";
  if (["blocked", "failed", "rejected"].includes(normalized)) return "danger";
  if (["almost ready", "ready for planning", "plan generated", "linear drafted", "in progress"].includes(normalized)) {
    return "warning";
  }
  if (["captured", "not started", "drafted"].includes(normalized)) return "info";
  return "neutral";
}

function StatusToken({
  value,
  className,
}: {
  value: string | null | undefined;
  className?: string;
}) {
  const label = formatLabel(value);
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2 text-sm text-foreground", className)}>
      <ToneDot tone={statusTone(label)} />
      <span className="truncate">{label}</span>
    </span>
  );
}

function DetailSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <div role="heading" aria-level={2} className="text-sm font-medium text-foreground">
        {title}
      </div>
      {children}
    </section>
  );
}

function BulletList({ values, empty }: { values: string[]; empty: string }) {
  if (values.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <ul className="space-y-2 text-sm leading-6 text-foreground">
      {values.map((value) => (
        <li key={value} className="flex gap-2">
          <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
          <span>{value}</span>
        </li>
      ))}
    </ul>
  );
}

function TextBlock({
  children,
  muted = false,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        "max-w-3xl whitespace-pre-wrap text-sm leading-7",
        muted ? "text-muted-foreground" : "text-foreground",
      )}
    >
      {children}
    </div>
  );
}

export function FeatureRequestDetail({ detail }: { detail: FeatureRequestDetailData }) {
  const { request, latestPlan, handoffs, events, linearEvents, linearSubIssues } = detail;
  const readiness = scoreFeatureRequestReadiness({ request, latestPlan });
  const acceptanceCriteria = asStringArray(request.acceptance_criteria);
  const verificationSteps = asStringArray(request.verification_steps);
  const openQuestions = asStringArray(request.open_questions);
  const assumptions = asStringArray(request.assumptions);
  const affectedPages = asStringArray(request.affected_pages);
  const affectedWorkflows = asStringArray(request.affected_workflows);
  const missingRequirements = readiness.missingRequirements;
  const readinessSummary = readiness.readyForBuild
    ? "Ready for build."
    : `Not ready for build. Missing ${missingRequirements.join(", ")}.`;
  const combinedEvents = [
    ...linearEvents.map((event) => ({
      id: event.id,
      feature_request_id: event.feature_request_id,
      event_type: event.event_type,
      title: event.title,
      body: event.body,
      metadata: event.metadata,
      created_by: event.created_by,
      created_at: event.created_at,
    })),
    ...events,
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="grid min-w-0 gap-12 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_368px]">
      <main className="min-w-0 space-y-8">
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          <span className="font-medium text-foreground">{readinessSummary}</span>
          {!readiness.readyForBuild && openQuestions[0] ? ` Next: ${openQuestions[0]}` : null}
        </p>

        <DetailSection title="Stakeholder summary">
          <TextBlock>{request.assistant_summary}</TextBlock>
        </DetailSection>

        <DetailSection title="Original request">
          <TextBlock muted>{request.raw_request}</TextBlock>
        </DetailSection>

        <DetailSection title="Acceptance criteria">
          <BulletList values={acceptanceCriteria} empty="No acceptance criteria captured yet." />
        </DetailSection>

        <DetailSection title="Verification steps">
          <BulletList values={verificationSteps} empty="No verification steps captured yet." />
        </DetailSection>

        {openQuestions.length > 0 ? (
          <DetailSection title="Open questions">
            <BulletList values={openQuestions} empty="No open implementation-critical questions." />
          </DetailSection>
        ) : null}

        {assumptions.length > 0 ? (
          <DetailSection title="Assumptions">
            <BulletList values={assumptions} empty="No assumptions recorded yet." />
          </DetailSection>
        ) : null}

        {latestPlan ? (
          <DetailSection title="Implementation plan">
            <div className="space-y-4">
              <TextBlock>{latestPlan.summary}</TextBlock>
              <BulletList
                values={asStringArray(latestPlan.implementation_steps)}
                empty="No implementation steps captured."
              />
            </div>
          </DetailSection>
        ) : null}

        {linearSubIssues.length > 0 ? (
          <DetailSection title="Linear sub-issues">
            <div className="divide-y divide-border/50">
              {linearSubIssues.map((subIssue) => (
                <div
                  key={subIssue.id}
                  className="grid grid-cols-1 gap-3 py-3 md:grid-cols-[minmax(0,1fr)_8rem_6rem] md:items-center md:gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <GitBranchIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="truncate text-sm font-medium text-foreground">{subIssue.title}</span>
                    </div>
                    {subIssue.source_step ? (
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {subIssue.source_step}
                      </p>
                    ) : null}
                  </div>
                  <StatusToken value={subIssue.status} />
                  <div className="text-left md:text-right">
                    {subIssue.linear_issue_url ? (
                      <Link
                        href={subIssue.linear_issue_url}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {subIssue.linear_issue_id ?? "Open"}
                      </Link>
                    ) : (
                      <span className="text-sm text-muted-foreground">Draft</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </DetailSection>
        ) : null}

        {combinedEvents.length > 0 ? (
          <DetailSection title="Activity">
            <RequestTimeline events={combinedEvents} />
          </DetailSection>
        ) : null}
      </main>

      <InspectorRail className="space-y-6 lg:sticky lg:top-20 lg:self-start">
        <InspectorSection title="Properties" variant="plain">
          <PropertyList className="divide-y-0">
            <PropertyRow label="Status">
              <StatusToken value={request.status} />
            </PropertyRow>
            <PropertyRow label="Readiness">
              <StatusToken value={readiness.label} />
            </PropertyRow>
            <PropertyRow label="Priority">{formatLabel(request.priority)}</PropertyRow>
            <PropertyRow label="Requester">{request.requester_name}</PropertyRow>
            <PropertyRow label="Type">{formatLabel(request.request_type)}</PropertyRow>
            <PropertyRow label="Source">{formatLabel(request.source)}</PropertyRow>
            <PropertyRow label="Project">{request.project_id ? String(request.project_id) : null}</PropertyRow>
            <PropertyRow label="Linear sync">
              <StatusToken value={request.linear_sync_status} />
            </PropertyRow>
          </PropertyList>
        </InspectorSection>

        {(affectedPages.length > 0 || affectedWorkflows.length > 0 || request.desired_outcome) ? (
          <InspectorSection title="Scope" variant="plain" defaultOpen>
            <PropertyList className="divide-y-0">
              <PropertyRow label="Pages">
                {affectedPages.length > 0 ? affectedPages.join(", ") : null}
              </PropertyRow>
              <PropertyRow label="Workflows">
                {affectedWorkflows.length > 0 ? affectedWorkflows.join(", ") : null}
              </PropertyRow>
              <PropertyRow label="Outcome">{request.desired_outcome}</PropertyRow>
            </PropertyList>
          </InspectorSection>
        ) : null}

        <InspectorSection title="Readiness" variant="plain">
          <PropertyList className="divide-y-0">
            <PropertyRow label="Goal">{formatLabel(readiness.goalClarity)}</PropertyRow>
            <PropertyRow label="Data">{formatLabel(readiness.dataClarity)}</PropertyRow>
            <PropertyRow label="UX">{formatLabel(readiness.uxClarity)}</PropertyRow>
            <PropertyRow label="Criteria">{formatLabel(readiness.acceptanceStatus)}</PropertyRow>
            <PropertyRow label="Risk">{formatLabel(readiness.implementationRisk)}</PropertyRow>
            <PropertyRow label="Missing">
              {missingRequirements.length > 0 ? missingRequirements.join(", ") : "None"}
            </PropertyRow>
          </PropertyList>
        </InspectorSection>

        <InspectorSection
          title="Linear"
          variant="plain"
          defaultOpen={Boolean(request.linear_issue_url || request.linear_draft_body || request.linear_sync_error)}
        >
          <div className="space-y-3 text-sm">
            {request.linear_issue_url ? (
              <Link
                href={request.linear_issue_url}
                className="inline-flex min-w-0 items-center gap-1.5 font-medium text-primary hover:underline"
              >
                <ExternalLinkIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{request.linear_issue_id ?? "Open Linear issue"}</span>
              </Link>
            ) : request.linear_draft_body ? (
              <details className="text-muted-foreground">
                <summary className="cursor-pointer text-sm text-foreground">Linear draft</summary>
                <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 font-sans text-xs leading-5">
                  {request.linear_draft_body}
                </pre>
              </details>
            ) : (
              <p className="text-muted-foreground">No Linear issue or draft attached yet.</p>
            )}
            {request.linear_last_synced_at ? (
              <p className="text-xs text-muted-foreground">Last synced {formatDate(request.linear_last_synced_at)}</p>
            ) : null}
            {request.linear_sync_error ? (
              <p className="text-sm text-destructive">{request.linear_sync_error}</p>
            ) : null}
          </div>
        </InspectorSection>

        <InspectorSection
          title="Handoff"
          variant="plain"
          defaultOpen={handoffs.length > 0 || Boolean(request.claude_handoff_path)}
        >
          {handoffs.length > 0 ? (
            <div className="space-y-2">
              {handoffs.map((handoff) => (
                <div key={handoff.id} className="space-y-1 text-sm">
                  <div className="truncate font-medium text-foreground">{handoff.handoff_title}</div>
                  <div className="truncate text-xs text-muted-foreground">{handoff.handoff_path}</div>
                  <StatusToken value={handoff.validation_status} className="text-xs" />
                </div>
              ))}
            </div>
          ) : request.claude_handoff_path ? (
            <div className="flex min-w-0 items-start gap-2 text-sm text-foreground">
              <FileTextIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="min-w-0 break-words">{request.claude_handoff_path}</span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No Claude Code handoff generated yet.</p>
          )}
        </InspectorSection>

        <InspectorSection title="Trace" variant="plain" defaultOpen={false}>
          <PropertyList className="divide-y-0">
            <PropertyRow label="Created">{formatDate(request.created_at)}</PropertyRow>
            <PropertyRow label="Updated">{formatDate(request.updated_at)}</PropertyRow>
            <PropertyRow label="Request ID">
              <span className="break-all text-xs text-muted-foreground">{request.id}</span>
            </PropertyRow>
          </PropertyList>
        </InspectorSection>
      </InspectorRail>
    </div>
  );
}
