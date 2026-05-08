"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { OutlookIntakeClient } from "@/app/(tables)/outlook-intake/outlook-intake-client";
import { EmailsClient } from "@/app/(main)/[projectId]/emails/emails-client";
import { EmailAttachmentsClient } from "@/app/(main)/[projectId]/email-attachments/email-attachments-client";

type TabId = "all" | "threads" | "assigned" | "review" | "attachments";

const TABS = [
  { id: "all" as const, label: "All Emails", href: "?tab=all" },
  { id: "threads" as const, label: "Threads", href: "?tab=threads" },
  { id: "assigned" as const, label: "Assigned", href: "?tab=assigned" },
  { id: "review" as const, label: "Needs Review", href: "?tab=review" },
  { id: "attachments" as const, label: "Attachments", href: "?tab=attachments" },
];

function normalizeTab(value: string | null): TabId {
  return TABS.some((tab) => tab.id === value) ? (value as TabId) : "all";
}

export function EmailSyncClient(): React.ReactElement {
  const pathname = usePathname() ?? "/emails";
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get("tab") ?? null;
  const [activeTab, setActiveTab] = React.useState<TabId>(() => normalizeTab(tabParam));

  React.useEffect(() => {
    setActiveTab(normalizeTab(tabParam));
  }, [tabParam]);

  const tabs = TABS.map((tab) => {
    const nextParams = new URLSearchParams(searchParams?.toString());
    nextParams.set("tab", tab.id);

    return {
      ...tab,
      href: `${pathname}?${nextParams.toString()}`,
      isActive: tab.id === activeTab,
    };
  });

  return (
    <div className="flex flex-col">
      <div className="min-h-0 flex-1">
        {activeTab === "all" && <OutlookIntakeClient embedded navigationTabs={tabs} />}
        {activeTab === "threads" && (
          <OutlookIntakeClient embedded navigationTabs={tabs} viewMode="threads" />
        )}
        {activeTab === "assigned" && (
          <EmailsClient scope="global" embedded navigationTabs={tabs} />
        )}
        {activeTab === "review" && (
          <OutlookIntakeClient unassigned embedded navigationTabs={tabs} />
        )}
        {activeTab === "attachments" && (
          <EmailAttachmentsClient scope="global" tabs={tabs} />
        )}
      </div>
    </div>
  );
}
