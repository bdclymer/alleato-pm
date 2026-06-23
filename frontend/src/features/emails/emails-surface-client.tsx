"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import { PageShell } from "@/components/layout";
import { EmailsClient } from "@/app/(main)/[projectId]/emails/emails-client";
import { EmailInboxClient, type InboxTab } from "@/features/emails/inbox/email-inbox-client";

const INBOX_TABS = new Set<InboxTab>([
  "brandon-queue",
  "needs-assignment",
  "all",
  "has-attachments",
]);

function resolveInboxTab(tab: string | null): InboxTab | null {
  if (!tab) return null;
  if (tab === "triage") return "brandon-queue";
  return INBOX_TABS.has(tab as InboxTab) ? (tab as InboxTab) : null;
}

interface SurfaceTab {
  label: string;
  href: string;
  isActive: boolean;
  count?: number;
}

function SurfaceTabs({ tabs }: { tabs: SurfaceTab[] }) {
  return (
    <div className="flex items-center gap-5 text-sm text-muted-foreground">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            "flex items-center gap-1.5 border-b pb-2 transition-colors",
            tab.isActive
              ? "border-primary text-foreground"
              : "border-transparent hover:text-foreground",
          )}
        >
          {tab.label}
          {typeof tab.count === "number" && tab.count > 0 ? (
            <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums text-muted-foreground">
              {tab.count}
            </span>
          ) : null}
        </Link>
      ))}
    </div>
  );
}

/**
 * Unified Emails surface. Replaces the standalone /email-inbox route: the
 * Brandon triage inbox is now the "Triage" tab here, alongside the regular
 * Emails table. The triage queue still reads from outlook_email_intake via
 * /api/email-inbox; only the route that hosts it changed.
 */
export function EmailsSurfaceClient() {
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get("tab") ?? null;
  const inboxTab = resolveInboxTab(tabParam);
  const isTriage = inboxTab !== null;

  // Live badge for the triage tab so the count is visible from the table view.
  const { data: brandonQueueCount = 0 } = useQuery({
    queryKey: ["email-inbox-count", "brandon-queue"],
    queryFn: async () => {
      const data = await apiFetch<unknown[]>(
        "/api/email-inbox?tab=brandon-queue",
      );
      return data.length;
    },
    refetchInterval: 60_000,
  });

  const tabs: SurfaceTab[] = [
    { label: "Emails", href: "/emails", isActive: !isTriage },
    {
      label: "Triage",
      href: "/emails?tab=triage",
      isActive: isTriage,
      count: brandonQueueCount,
    },
  ];

  if (isTriage) {
    return (
      <PageShell variant="table" title="Emails">
        <div className="mb-3">
          <SurfaceTabs tabs={tabs} />
        </div>
        <EmailInboxClient initialTab={inboxTab} />
      </PageShell>
    );
  }

  return (
    <EmailsClient scope="global" source="all" navigationTabs={tabs} />
  );
}
