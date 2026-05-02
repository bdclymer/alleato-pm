export const dynamic = "force-dynamic";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout";
import { ExecutiveBriefEmailForm } from "@/components/executive/executive-brief-email-form";
import { Button } from "@/components/ui/button";
import { AdminActionCards } from "./admin-action-cards";
import { createServiceClient } from "@/lib/supabase/service";
import { DEFAULT_EXECUTIVE_WINDOW_DAYS } from "@/lib/executive/brandon-daily-update";
import { getExecutiveBriefingDashboard } from "@/lib/executive/executive-briefing-workflow";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function loadEmailFormData() {
  try {
    const supabase = createServiceClient();
    const dashboard = await getExecutiveBriefingDashboard({
      windowDays: DEFAULT_EXECUTIVE_WINDOW_DAYS,
    });
    const { draft } = dashboard;

    const { data: person } = await supabase
      .from("people")
      .select("email, first_name, last_name")
      .ilike("first_name", "brandon")
      .limit(1)
      .single();

    const defaultRecipient = person?.email ?? "";
    const defaultSubject = `Daily operating brief — ${draft.recapDate}`;
    return { draftId: draft.id, defaultRecipient, defaultSubject };
  } catch {
    return null;
  }
}

export default async function AdminActionsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const emailData = await loadEmailFormData();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const emailStatusRaw = Array.isArray(resolvedSearchParams.emailStatus)
    ? resolvedSearchParams.emailStatus[0]
    : resolvedSearchParams.emailStatus;
  const emailMessageRaw = Array.isArray(resolvedSearchParams.emailMessage)
    ? resolvedSearchParams.emailMessage[0]
    : resolvedSearchParams.emailMessage;
  const emailStatus =
    emailStatusRaw === "sent" || emailStatusRaw === "failed" ? emailStatusRaw : null;

  return (
    <PageShell
      variant="content"
      title="Actions"
      description="Manually run internal workflows, syncs, AI refreshes, and outbound notifications without exposing those controls on client-facing pages."
    >
      {emailStatus && emailMessageRaw ? (
        <ActionStatusBanner status={emailStatus} message={emailMessageRaw} />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          This page is the operational control surface for manual runs. Keep owner-facing pages
          focused on results, and keep triggers here.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/executive">Open executive brief</Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <ActionCard
          title="Send Executive Brief"
          badge="Email"
          description="Generate and send the Brandon daily operating brief. Same pipeline the scheduled job uses."
        >
          {emailData ? (
            <ExecutiveBriefEmailForm
              draftId={emailData.draftId}
              defaultRecipients={emailData.defaultRecipient}
              defaultSubject={emailData.defaultSubject}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              No draft found. The executive briefing workflow may not have run yet today.
            </p>
          )}
        </ActionCard>

        {/* All other triggerable actions — client component */}
        <AdminActionCards />
      </div>
    </PageShell>
  );
}

function ActionStatusBanner({
  status,
  message,
}: {
  status: "sent" | "failed";
  message: string;
}) {
  return (
    <div
      className={
        status === "sent"
          ? "rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950"
          : "rounded-2xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-foreground"
      }
    >
      <div className="font-medium">
        {status === "sent" ? "Executive brief email sent" : "Executive brief email failed"}
      </div>
      <p className="mt-1 opacity-90">{message}</p>
    </div>
  );
}

function ActionCard({
  title,
  badge,
  description,
  children,
}: {
  title: string;
  badge?: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {badge && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}
