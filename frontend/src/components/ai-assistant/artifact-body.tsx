"use client";

import { MessageResponse } from "@/components/ai-elements/message";
import { cn } from "@/lib/utils";
import type { ArtifactType } from "@/lib/ai/services/workspace-artifact-service";

interface ArtifactBodyProps {
  artifactType: ArtifactType;
  content: Record<string, unknown>;
  variant?: "preview" | "full";
}

export function ArtifactBody({
  artifactType,
  content,
  variant = "full",
}: ArtifactBodyProps) {
  switch (artifactType) {
    case "owner_update":
      return <OwnerUpdateBody content={content} variant={variant} />;
    case "risk_report":
      return <RiskReportBody content={content} variant={variant} />;
    case "meeting_prep":
      return <MeetingPrepBody content={content} variant={variant} />;
    case "analysis":
      return <AnalysisBody content={content} variant={variant} />;
    case "briefing":
      return <BriefingBody content={content} variant={variant} />;
    case "note":
      return <NoteBody content={content} variant={variant} />;
    default:
      return <UnknownBody content={content} variant={variant} />;
  }
}

function strField(content: Record<string, unknown>, key: string): string {
  const v = content[key];
  return typeof v === "string" ? v : "";
}

function arrField<T = unknown>(
  content: Record<string, unknown>,
  key: string,
): T[] {
  const v = content[key];
  return Array.isArray(v) ? (v as T[]) : [];
}

function PreviewWrap({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: "preview" | "full";
}) {
  return (
    <div
      className={cn(
        "text-sm",
        variant === "preview" && "line-clamp-6 overflow-hidden",
      )}
    >
      {children}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="heading"
      aria-level={4}
      className="mb-1 mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground first:mt-0"
    >
      {children}
    </div>
  );
}

function OwnerUpdateBody({
  content,
  variant,
}: {
  content: Record<string, unknown>;
  variant: "preview" | "full";
}) {
  const summary = strField(content, "summary");
  const highlights = arrField<string>(content, "highlights");
  const risks = arrField<string>(content, "risks");
  const nextSteps = arrField<string>(content, "next_steps");

  return (
    <PreviewWrap variant={variant}>
      {summary && (
        <>
          <SectionHeading>Summary</SectionHeading>
          <MessageResponse className="text-sm leading-6">
            {summary}
          </MessageResponse>
        </>
      )}
      {highlights.length > 0 && (
        <>
          <SectionHeading>Highlights</SectionHeading>
          <ul className="ml-4 list-disc space-y-1">
            {highlights.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </>
      )}
      {risks.length > 0 && (
        <>
          <SectionHeading>Risks</SectionHeading>
          <ul className="ml-4 list-disc space-y-1">
            {risks.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </>
      )}
      {nextSteps.length > 0 && (
        <>
          <SectionHeading>Next Steps</SectionHeading>
          <ul className="ml-4 list-disc space-y-1">
            {nextSteps.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </>
      )}
    </PreviewWrap>
  );
}

interface RiskRow {
  title?: string;
  severity?: string;
  mitigation?: string;
}

function RiskReportBody({
  content,
  variant,
}: {
  content: Record<string, unknown>;
  variant: "preview" | "full";
}) {
  const risks = arrField<RiskRow>(content, "risks");

  if (risks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No risks captured.</p>
    );
  }

  const displayRows = variant === "preview" ? risks.slice(0, 3) : risks;

  return (
    <div className="overflow-hidden rounded-md bg-muted/40">
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Risk</th>
            <th className="px-3 py-2 font-medium">Severity</th>
            <th className="px-3 py-2 font-medium">Mitigation</th>
          </tr>
        </thead>
        <tbody>
          {displayRows.map((r, i) => (
            <tr key={i} className="border-t border-border/50">
              <td className="px-3 py-2 align-top">{r.title ?? "—"}</td>
              <td className="px-3 py-2 align-top capitalize">
                {r.severity ?? "—"}
              </td>
              <td className="px-3 py-2 align-top text-muted-foreground">
                {r.mitigation ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {variant === "preview" && risks.length > 3 && (
        <p className="px-3 py-2 text-xs text-muted-foreground">
          +{risks.length - 3} more
        </p>
      )}
    </div>
  );
}

function MeetingPrepBody({
  content,
  variant,
}: {
  content: Record<string, unknown>;
  variant: "preview" | "full";
}) {
  const agenda = arrField<string>(content, "agenda");
  const talkingPoints = arrField<string>(content, "talking_points");
  const questions = arrField<string>(content, "questions");

  return (
    <PreviewWrap variant={variant}>
      {agenda.length > 0 && (
        <>
          <SectionHeading>Agenda</SectionHeading>
          <ol className="ml-4 list-decimal space-y-1">
            {agenda.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ol>
        </>
      )}
      {talkingPoints.length > 0 && (
        <>
          <SectionHeading>Talking Points</SectionHeading>
          <ul className="ml-4 list-disc space-y-1">
            {talkingPoints.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </>
      )}
      {questions.length > 0 && (
        <>
          <SectionHeading>Questions</SectionHeading>
          <ul className="ml-4 list-disc space-y-1">
            {questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </>
      )}
    </PreviewWrap>
  );
}

function AnalysisBody({
  content,
  variant,
}: {
  content: Record<string, unknown>;
  variant: "preview" | "full";
}) {
  const findings = strField(content, "findings");
  const recommendations = arrField<string>(content, "recommendations");

  return (
    <PreviewWrap variant={variant}>
      {findings && (
        <>
          <SectionHeading>Findings</SectionHeading>
          <MessageResponse className="text-sm leading-6">
            {findings}
          </MessageResponse>
        </>
      )}
      {recommendations.length > 0 && (
        <>
          <SectionHeading>Recommendations</SectionHeading>
          <ul className="ml-4 list-disc space-y-1">
            {recommendations.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </>
      )}
    </PreviewWrap>
  );
}

function BriefingBody({
  content,
  variant,
}: {
  content: Record<string, unknown>;
  variant: "preview" | "full";
}) {
  const body = strField(content, "body");

  if (!body) {
    return <p className="text-sm text-muted-foreground">Briefing is empty.</p>;
  }

  return (
    <PreviewWrap variant={variant}>
      <MessageResponse className="text-sm leading-6">{body}</MessageResponse>
    </PreviewWrap>
  );
}

function NoteBody({
  content,
  variant,
}: {
  content: Record<string, unknown>;
  variant: "preview" | "full";
}) {
  const text = strField(content, "text");

  if (!text) {
    return <p className="text-sm text-muted-foreground">Note is empty.</p>;
  }

  return (
    <PreviewWrap variant={variant}>
      <MessageResponse className="text-sm leading-6">{text}</MessageResponse>
    </PreviewWrap>
  );
}

function UnknownBody({
  content,
  variant,
}: {
  content: Record<string, unknown>;
  variant: "preview" | "full";
}) {
  return (
    <PreviewWrap variant={variant}>
      <pre className="overflow-auto rounded-md bg-muted/40 p-3 text-xs">
        {JSON.stringify(content, null, 2)}
      </pre>
    </PreviewWrap>
  );
}
