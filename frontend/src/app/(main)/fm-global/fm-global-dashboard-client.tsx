"use client";

import type { ReactElement } from "react";
import type { GenericTableConfig } from "@/components/tables/generic-table-factory";
import { GenericConfigUnifiedTable } from "@/components/tables/generic-config-unified-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  return (
    <Tabs defaultValue="tables" className="w-full">
      <TabsList variant="line">
        <TabsTrigger value="tables">FM Global Tables</TabsTrigger>
        <TabsTrigger value="figures">FM Global Figures</TabsTrigger>
      </TabsList>
      <TabsContent value="tables">
        <GenericConfigUnifiedTable
          data={tables}
          config={tablesConfig}
          title="FM Global Tables"
          description="Reference tables for sprinkler protection data."
          entityKey="fm-global-dashboard-tables"
          emptyTitle="No FM Global tables found"
          emptyDescription="No FM Global table records have been imported yet."
        />
      </TabsContent>
      <TabsContent value="figures">
        <GenericConfigUnifiedTable
          data={figures}
          config={figuresConfig}
          title="FM Global Figures"
          description="Figure references and extracted captions."
          entityKey="fm-global-dashboard-figures"
          emptyTitle="No FM Global figures found"
          emptyDescription="No FM Global figure records have been imported yet."
        />
      </TabsContent>
    </Tabs>
  );
}
