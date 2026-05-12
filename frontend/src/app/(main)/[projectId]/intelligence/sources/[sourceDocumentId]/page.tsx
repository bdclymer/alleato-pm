export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, MailOpen } from "lucide-react";

import { Badge, Button, StatusBadge } from "@/components/ds";
import { PageShell, SectionRuleHeading } from "@/components/layout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  cleanEmailText,
  parseReadableEmailThread,
  type ReadableEmailMessage,
} from "@/lib/email/readable-email";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database.types";

type SourceDocument = Database["public"]["Tables"]["document_metadata"]["Row"];

type PageProps = {
  params: Promise<{ projectId: string; sourceDocumentId: string }>;
};

function formatLabel(value: string | null | undefined): string {
  if (!value) return "Unknown";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function cleanSourceText(value: string | null | undefined): string {
  if (!value) return "";
  return cleanEmailText(value).replace(/\n{3,}/g, "\n\n");
}

function getReadableContent(source: SourceDocument): string {
  if (source.type === "email" || source.category === "email") {
    return cleanSourceText(source.content || source.raw_text);
  }

  return cleanSourceText(
    source.content ||
      source.raw_text ||
      source.summary ||
      source.overview ||
      source.description ||
      source.notes,
  );
}

function getExternalSourceHref(source: SourceDocument): string | null {
  return (
    source.source_web_url ||
    source.fireflies_link ||
    source.meeting_link ||
    source.url ||
    null
  );
}

function getSourceContextHref(projectId: number, source: SourceDocument): string | null {
  if (source.type === "meeting") {
    return `/${projectId}/meetings/${encodeURIComponent(source.id)}`;
  }
  if (source.category === "knowledge") {
    return `/${projectId}/knowledge`;
  }
  return null;
}

function emailTitle(message: ReadableEmailMessage, fallback: string | null | undefined, index: number): string {
  return message.subject || fallback || `Email ${index + 1}`;
}

function emailSubtitle(message: ReadableEmailMessage): string {
  return [message.from, message.date ? formatDateTime(message.date) : null]
    .filter(Boolean)
    .join(" - ");
}

export default async function IntelligenceSourcePage({ params }: PageProps) {
  const { projectId, sourceDocumentId } = await params;
  const numericProjectId = Number.parseInt(projectId, 10);

  if (Number.isNaN(numericProjectId)) {
    notFound();
  }

  const supabase = createServiceClient();
  const { data: source, error } = await supabase
    .from("document_metadata")
    .select("*")
    .eq("id", sourceDocumentId)
    .eq("project_id", numericProjectId)
    .single();

  if (error || !source) {
    notFound();
  }

  const readableContent = getReadableContent(source);
  const emailMessages =
    source.type === "email" || source.category === "email"
      ? parseReadableEmailThread(readableContent)
      : [];
  const externalHref = getExternalSourceHref(source);
  const sourceContextHref = getSourceContextHref(numericProjectId, source);
  const participants = source.participants_array?.length
    ? source.participants_array
    : source.participants
      ? source.participants
          .replace(/[{}"]/g, "")
          .split(/[,;|\n]+/)
          .map((participant) => participant.trim())
          .filter(Boolean)
      : [];

  return (
    <PageShell
      variant="content"
      title={source.title ?? "Source context"}
      description={
        emailMessages.length > 0
          ? "Full email source content used by the project intelligence packet."
          : "Original source context used by the project intelligence packet."
      }
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {sourceContextHref ? (
            <Button asChild size="sm" variant="outline">
              <Link href={sourceContextHref}>Open in project</Link>
            </Button>
          ) : null}
          {externalHref ? (
            <Button asChild size="sm" variant="outline">
              <a href={externalHref} target="_blank" rel="noopener noreferrer">
                Original source
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          ) : null}
          <Button asChild size="sm" variant="ghost">
            <Link href={`/${numericProjectId}/intelligence`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Intelligence
            </Link>
          </Button>
        </div>
      }
      contentClassName="space-y-8"
    >
      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{formatLabel(source.type ?? source.category)}</Badge>
          {source.source ? <Badge variant="outline">{formatLabel(source.source)}</Badge> : null}
          {source.source_system ? (
            <Badge variant="outline">{formatLabel(source.source_system)}</Badge>
          ) : null}
          {source.status ? <StatusBadge status={source.status} /> : null}
        </div>

        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Source date
            </dt>
            <dd className="mt-1 text-foreground">{formatDateTime(source.date)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Captured
            </dt>
            <dd className="mt-1 text-foreground">
              {formatDateTime(source.captured_at ?? source.created_at)}
            </dd>
          </div>
          {source.project ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Project
              </dt>
              <dd className="mt-1 text-foreground">{source.project}</dd>
            </div>
          ) : null}
          {participants.length > 0 ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Participants
              </dt>
              <dd className="mt-1 text-foreground">{participants.slice(0, 8).join(", ")}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      {source.summary || source.overview ? (
        <section className="space-y-3">
          <SectionRuleHeading label="Summary" />
          <p className="text-sm leading-6 text-foreground">
            {cleanSourceText(source.summary || source.overview)}
          </p>
        </section>
      ) : null}

      <section className="space-y-3">
        <SectionRuleHeading label="Source Content" />
        {emailMessages.length > 0 ? (
          <div className="rounded-md border border-border bg-background">
            <div className="border-b border-border px-4 py-4">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                <MailOpen className="h-3.5 w-3.5" />
                Email thread
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {source.title || emailMessages[0]?.subject || "Untitled email"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {emailMessages.length} message{emailMessages.length === 1 ? "" : "s"} parsed. Open an item to read the clean body text.
              </p>
            </div>
            <Accordion type="multiple" className="px-4">
              {emailMessages.map((message, index) => (
                <AccordionItem key={message.id} value={message.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <span className="min-w-0 text-left">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {emailTitle(message, source.title, index)}
                      </span>
                      {emailSubtitle(message) ? (
                        <span className="mt-1 block truncate text-xs font-normal text-muted-foreground">
                          {emailSubtitle(message)}
                        </span>
                      ) : null}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <dl className="grid gap-4 pb-4 text-sm sm:grid-cols-2">
                      {message.from ? (
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">From</dt>
                          <dd className="mt-1 break-words text-foreground">{message.from}</dd>
                        </div>
                      ) : null}
                      {message.to ? (
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">To</dt>
                          <dd className="mt-1 break-words text-foreground">{message.to}</dd>
                        </div>
                      ) : null}
                      {message.cc ? (
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Cc</dt>
                          <dd className="mt-1 break-words text-foreground">{message.cc}</dd>
                        </div>
                      ) : null}
                      {message.date ? (
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Date</dt>
                          <dd className="mt-1 text-foreground">{formatDateTime(message.date)}</dd>
                        </div>
                      ) : null}
                    </dl>
                    {message.body ? (
                      <div className="max-w-none whitespace-pre-wrap text-sm leading-7 text-foreground">
                        {message.body}
                      </div>
                    ) : (
                      <p className="text-sm leading-6 text-muted-foreground">
                        No email body text was captured for this message; only the message headers are available.
                      </p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ) : readableContent ? (
          <div className="max-w-none whitespace-pre-wrap text-sm leading-7 text-foreground">
            {readableContent}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No readable body content is stored for this source.
          </p>
        )}
      </section>
    </PageShell>
  );
}
