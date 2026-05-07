import Link from "next/link";
import { ExternalLinkIcon, FileTextIcon, GitBranchIcon } from "lucide-react";

import { Button, StatusBadge } from "@/components/ds";
import { SectionRuleHeading } from "@/components/layout";
import { scoreFeatureRequestReadiness } from "@/lib/feature-requests/readiness";
import type { FeatureRequestDetail as FeatureRequestDetailData } from "@/lib/feature-requests/types";
import { ReadinessBadge } from "./ReadinessBadge";
import { RequestTimeline } from "./RequestTimeline";

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <SectionRuleHeading label={title} className="mb-0" />
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
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
          <span>{value}</span>
        </li>
      ))}
    </ul>
  );
}

export function FeatureRequestDetail({ detail }: { detail: FeatureRequestDetailData }) {
  const { request, latestPlan, handoffs, events, linearEvents, linearSubIssues } = detail;
  const readiness = scoreFeatureRequestReadiness({ request, latestPlan });
  const acceptanceCriteria = asStringArray(request.acceptance_criteria);
  const verificationSteps = asStringArray(request.verification_steps);
  const openQuestions = asStringArray(request.open_questions);
  const assumptions = asStringArray(request.assumptions);

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-5">
        <div>
          <div className="text-xs font-medium uppercase text-muted-foreground">Status</div>
          <div className="mt-2"><StatusBadge status={request.status.replaceAll("_", " ")} /></div>
        </div>
        <div>
          <div className="text-xs font-medium uppercase text-muted-foreground">Readiness</div>
          <div className="mt-2"><ReadinessBadge readyForBuild={readiness.readyForBuild} label={readiness.label} /></div>
        </div>
        <div>
          <div className="text-xs font-medium uppercase text-muted-foreground">Requester</div>
          <div className="mt-2 text-sm font-medium text-foreground">{request.requester_name}</div>
        </div>
        <div>
          <div className="text-xs font-medium uppercase text-muted-foreground">Type</div>
          <div className="mt-2 text-sm font-medium text-foreground">{request.request_type.replaceAll("_", " ")}</div>
        </div>
        <div>
          <div className="text-xs font-medium uppercase text-muted-foreground">Linear sync</div>
          <div className="mt-2"><StatusBadge status={request.linear_sync_status.replaceAll("_", " ")} /></div>
        </div>
      </section>

      {!readiness.readyForBuild ? (
        <section className="rounded-lg border border-border bg-muted/20 px-4 py-3">
          <SectionRuleHeading label="Readiness block" className="mb-0" />
          <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-6 text-muted-foreground">
            {readiness.blockedMessage}
          </pre>
        </section>
      ) : null}

      <Section title="Stakeholder Summary">
        <p className="text-sm leading-6 text-foreground">{request.assistant_summary}</p>
      </Section>

      <Section title="Original Request">
        <blockquote className="border-l-2 border-border pl-4 text-sm leading-6 text-muted-foreground">
          {request.raw_request}
        </blockquote>
      </Section>

      <section className="grid gap-8 lg:grid-cols-2">
        <Section title="Acceptance Criteria">
          <BulletList values={acceptanceCriteria} empty="No acceptance criteria captured yet." />
        </Section>
        <Section title="Verification Steps">
          <BulletList values={verificationSteps} empty="No verification steps captured yet." />
        </Section>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <Section title="Open Questions">
          <BulletList values={openQuestions} empty="No open implementation-critical questions." />
        </Section>
        <Section title="Assumptions">
          <BulletList values={assumptions} empty="No assumptions recorded yet." />
        </Section>
      </section>

      <Section title="Implementation Plan">
        {latestPlan ? (
          <div className="space-y-4">
            <p className="text-sm leading-6 text-foreground">{latestPlan.summary}</p>
            <BulletList
              values={asStringArray(latestPlan.implementation_steps)}
              empty="No implementation steps captured."
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No implementation plan generated yet.</p>
        )}
      </Section>

      <section className="grid gap-8 lg:grid-cols-2">
        <Section title="Linear">
          <div className="space-y-3 text-sm">
            {request.linear_issue_url ? (
              <div className="space-y-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={request.linear_issue_url}>
                    <ExternalLinkIcon className="h-4 w-4" />
                    Open Linear issue
                  </Link>
                </Button>
                {request.linear_last_synced_at ? (
                  <div className="text-xs text-muted-foreground">
                    Last synced {new Date(request.linear_last_synced_at).toLocaleString()}
                  </div>
                ) : null}
              </div>
            ) : request.linear_draft_body ? (
              <pre className="whitespace-pre-wrap rounded-md bg-muted/40 p-3 font-sans text-muted-foreground">
                {request.linear_draft_body}
              </pre>
            ) : (
              <p className="text-muted-foreground">No Linear issue or draft attached yet.</p>
            )}
            {request.linear_sync_error ? (
              <p className="text-sm text-destructive">{request.linear_sync_error}</p>
            ) : null}
          </div>
        </Section>
        <Section title="Claude Code Handoff">
          {handoffs.length > 0 ? (
            <div className="divide-y divide-border/70">
              {handoffs.map((handoff) => (
                <div key={handoff.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">{handoff.handoff_title}</div>
                    <div className="truncate text-xs text-muted-foreground">{handoff.handoff_path}</div>
                  </div>
                  <StatusBadge status={handoff.validation_status} />
                </div>
              ))}
            </div>
          ) : request.claude_handoff_path ? (
            <div className="flex items-center gap-2 text-sm text-foreground">
              <FileTextIcon className="h-4 w-4 text-muted-foreground" />
              {request.claude_handoff_path}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No Claude Code handoff generated yet.</p>
          )}
        </Section>
      </section>

      <Section title="Linear Sub-Issues">
        {linearSubIssues.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="grid grid-cols-[1.5fr_0.7fr_0.6fr] gap-4 border-b border-border bg-muted/30 px-4 py-2 text-xs font-medium uppercase text-muted-foreground">
              <span>Issue slice</span>
              <span>Status</span>
              <span className="text-right">Linear</span>
            </div>
            <div className="divide-y divide-border/70">
              {linearSubIssues.map((subIssue) => (
                <div key={subIssue.id} className="grid grid-cols-1 gap-3 px-4 py-3 md:grid-cols-[1.5fr_0.7fr_0.6fr] md:items-center md:gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <GitBranchIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate text-sm font-medium text-foreground">{subIssue.title}</span>
                    </div>
                    {subIssue.source_step ? (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{subIssue.source_step}</p>
                    ) : null}
                  </div>
                  <StatusBadge status={subIssue.status.replaceAll("_", " ")} />
                  <div className="text-left md:text-right">
                    {subIssue.linear_issue_url ? (
                      <Link href={subIssue.linear_issue_url} className="text-sm font-medium text-primary hover:underline">
                        {subIssue.linear_issue_id ?? "Open"}
                      </Link>
                    ) : (
                      <span className="text-sm text-muted-foreground">Draft</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No Linear sub-issue drafts generated yet.</p>
        )}
      </Section>

      <Section title="Activity Timeline">
        <RequestTimeline events={[
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
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())} />
      </Section>
    </div>
  );
}
