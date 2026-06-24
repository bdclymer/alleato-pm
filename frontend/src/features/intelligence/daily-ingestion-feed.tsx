"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Mail,
  MessageSquare,
} from "lucide-react";

import { Button, EmptyState, InfoAlert } from "@/components/ds";
import {
  InlineTable,
  InlineTableBody,
  InlineTableCell,
  InlineTableHeader,
  InlineTableHeaderCell,
  InlineTableHeaderRow,
  InlineTableRow,
} from "@/components/ds/inline-table";
import { apiFetch } from "@/lib/api-client";
import type {
  IngestionFeedError,
  IngestionFeedResponse,
  IngestionItem,
} from "@/app/api/projects/[projectId]/ingestion-feed/route";

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function shiftDay(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function formatDayLabel(date: string): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  const today = todayUtc();
  if (date === today) return "Today";
  if (date === shiftDay(today, -1)) return "Yesterday";
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

const worstSeverity = (errors: IngestionFeedError[]): "critical" | "warning" | "info" =>
  errors.some((e) => e.severity === "critical")
    ? "critical"
    : errors.some((e) => e.severity === "warning")
      ? "warning"
      : "info";

function CategoryTable({
  label,
  emptyNoun,
  icon,
  items,
  showSource = false,
}: {
  label: string;
  emptyNoun: string;
  icon: React.ReactNode;
  items: IngestionItem[];
  showSource?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <span className="text-xs tabular-nums text-muted-foreground">{items.length}</span>
      </div>

      {items.length === 0 ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">No {emptyNoun} ingested on this day.</p>
      ) : (
        <InlineTable variant="read">
          <InlineTableHeader>
            <InlineTableHeaderRow>
              <InlineTableHeaderCell>Title</InlineTableHeaderCell>
              {showSource ? <InlineTableHeaderCell>Source</InlineTableHeaderCell> : null}
              <InlineTableHeaderCell align="right">Ingested</InlineTableHeaderCell>
            </InlineTableHeaderRow>
          </InlineTableHeader>
          <InlineTableBody>
            {items.map((item) => (
              <InlineTableRow key={item.id}>
                <InlineTableCell>
                  {item.link ? (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-foreground hover:text-primary hover:underline"
                    >
                      <span className="line-clamp-1">{item.title}</span>
                      <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                    </a>
                  ) : (
                    <span className="line-clamp-1 text-foreground">{item.title}</span>
                  )}
                </InlineTableCell>
                {showSource ? (
                  <InlineTableCell className="text-muted-foreground">
                    {item.sourceSystem ?? "—"}
                  </InlineTableCell>
                ) : null}
                <InlineTableCell align="right" numeric className="text-muted-foreground">
                  {formatTime(item.ingestedAt)}
                </InlineTableCell>
              </InlineTableRow>
            ))}
          </InlineTableBody>
        </InlineTable>
      )}
    </div>
  );
}

export function DailyIngestionFeed({ projectId }: { projectId: number }) {
  const [date, setDate] = React.useState<string>(todayUtc());
  const isToday = date === todayUtc();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["ingestion-feed", projectId, date],
    queryFn: () =>
      apiFetch<IngestionFeedResponse>(`/api/projects/${projectId}/ingestion-feed?date=${date}`),
    staleTime: 60_000,
  });

  const errors = data?.errors ?? [];
  const total =
    (data?.counts.meetings ?? 0) +
    (data?.counts.documents ?? 0) +
    (data?.counts.emails ?? 0) +
    (data?.counts.teams ?? 0);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Source ingestion
          </p>
          <p className="text-lg font-semibold text-foreground">
            {formatDayLabel(date)}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {isLoading ? "" : `${total} item${total === 1 ? "" : "s"}`}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => setDate((d) => shiftDay(d, -1))} aria-label="Previous day">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {!isToday ? (
            <Button variant="outline" size="sm" onClick={() => setDate(todayUtc())}>
              Today
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDate((d) => shiftDay(d, 1))}
            disabled={isToday}
            aria-label="Next day"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {errors.length > 0 ? (
        <InfoAlert variant={worstSeverity(errors) === "critical" ? "error" : "warning"} role="alert">
          <span className="font-semibold">
            {errors.length} active pipeline {errors.length === 1 ? "alert" : "alerts"} — synced data may be stale.
          </span>
          <ul className="mt-1.5 space-y-1">
            {errors.slice(0, 5).map((e, i) => (
              <li key={`${e.source}-${i}`} className="flex items-start gap-1.5 text-sm">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  <span className="font-medium">{e.title}</span>
                  {e.message ? ` — ${e.message}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </InfoAlert>
      ) : null}

      {isError ? (
        <InfoAlert variant="error" role="alert">
          Could not load the ingestion feed for this day.
        </InfoAlert>
      ) : isLoading ? (
        <p className="py-6 text-sm text-muted-foreground">Loading ingested items…</p>
      ) : total === 0 && errors.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-6 w-6" />}
          title="Nothing ingested on this day"
          description="Meetings, documents, emails, and Teams messages synced for this project on the selected day will appear here."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <CategoryTable
            label="Meetings"
            emptyNoun="meetings"
            icon={<Calendar className="h-4 w-4" />}
            items={data?.meetings ?? []}
          />
          <CategoryTable
            label="SharePoint documents"
            emptyNoun="SharePoint documents"
            icon={<FileText className="h-4 w-4" />}
            items={data?.documents ?? []}
            showSource
          />
          <CategoryTable
            label="Emails"
            emptyNoun="emails"
            icon={<Mail className="h-4 w-4" />}
            items={data?.emails ?? []}
          />
          <CategoryTable
            label="Teams messages"
            emptyNoun="Teams messages"
            icon={<MessageSquare className="h-4 w-4" />}
            items={data?.teams ?? []}
          />
        </div>
      )}
    </section>
  );
}
