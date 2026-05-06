"use client";

import * as React from "react";
import { PageTabs } from "@/components/layout";
import { OutlookIntakeClient } from "@/app/(tables)/outlook-intake/outlook-intake-client";
import { EmailsClient } from "@/app/(main)/[projectId]/emails/emails-client";
import { EmailAttachmentsClient } from "@/app/(main)/[projectId]/email-attachments/email-attachments-client";

type TabId = "all" | "assigned" | "review" | "attachments";

const TABS = [
  { id: "all" as const, label: "All Emails", href: "#all" },
  { id: "assigned" as const, label: "Assigned", href: "#assigned" },
  { id: "review" as const, label: "Needs Review", href: "#review" },
  { id: "attachments" as const, label: "Attachments", href: "#attachments" },
];

export function EmailSyncClient(): React.ReactElement {
  const [activeTab, setActiveTab] = React.useState<TabId>("all");

  const tabs = TABS.map((tab) => ({
    ...tab,
    isActive: tab.id === activeTab,
  }));

  return (
    <div className="flex flex-col">
      <div className="border-b border-border px-4 sm:px-6 lg:px-8">
        <PageTabs
          tabs={tabs}
          variant="inline"
          className="mb-0"
          onTabClick={(href) => {
            const id = href.replace("#", "") as TabId;
            setActiveTab(id);
          }}
        />
      </div>

      <div className="min-h-0 flex-1">
        {activeTab === "all" && <OutlookIntakeClient embedded />}
        {activeTab === "assigned" && <EmailsClient scope="global" embedded />}
        {activeTab === "review" && <OutlookIntakeClient unassigned embedded />}
        {activeTab === "attachments" && <EmailAttachmentsClient scope="global" />}
      </div>
    </div>
  );
}
