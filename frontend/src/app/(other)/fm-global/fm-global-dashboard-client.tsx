"use client";

import type { ReactElement } from "react";
import {
  GenericDataTable,
  type GenericTableConfig,
} from "@/components/tables/generic-table-factory";
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
        <GenericDataTable data={tables} config={tablesConfig} />
      </TabsContent>
      <TabsContent value="figures">
        <GenericDataTable data={figures} config={figuresConfig} />
      </TabsContent>
    </Tabs>
  );
}
