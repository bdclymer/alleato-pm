"use client";

import { useState } from "react";
import type { ReactElement } from "react";
import { PageTabs } from "@/components/layout";
import type { GenericTableConfig } from "@/components/tables/generic-table-factory";
import { GenericConfigUnifiedTable } from "@/components/tables/generic-config-unified-table";

interface FmGlobalDashboardClientProps {
  tables: Record<string, unknown>[];
  figures: Record<string, unknown>[];
  tablesConfig: GenericTableConfig;
  figuresConfig: GenericTableConfig;
}

export function FmGlobalDashboardClient({
  tables,
  figures,
  tablesConfig,
  figuresConfig,
}: FmGlobalDashboardClientProps): ReactElement {
  const [activeTab, setActiveTab] = useState<"tables" | "figures">("tables");

  return (
    <div className="w-full space-y-6">
      <PageTabs
        tabs={[
          {
            label: "FM Global Tables",
            href: "tables",
            isActive: activeTab === "tables",
          },
          {
            label: "FM Global Figures",
            href: "figures",
            isActive: activeTab === "figures",
          },
        ]}
        variant="inline"
        className="mb-0"
        onTabClick={(href) => setActiveTab(href as "tables" | "figures")}
      />
      {activeTab === "tables" ? (
        <GenericConfigUnifiedTable
          data={tables}
          config={tablesConfig}
          title="FM Global Tables"
          description="Reference tables for sprinkler protection data."
          entityKey="fm-global-dashboard-tables"
          emptyTitle="No FM Global tables found"
          emptyDescription="No FM Global table records have been imported yet."
        />
      ) : null}
      {activeTab === "figures" ? (
        <GenericConfigUnifiedTable
          data={figures}
          config={figuresConfig}
          title="FM Global Figures"
          description="Figure references and extracted captions."
          entityKey="fm-global-dashboard-figures"
          emptyTitle="No FM Global figures found"
          emptyDescription="No FM Global figure records have been imported yet."
        />
      ) : null}
    </div>
  );
}
