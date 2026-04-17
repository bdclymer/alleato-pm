"use client";

import { GenericDataTable, type GenericTableConfig } from "@/components/tables/generic-table-factory";
import { apiFetch } from "@/lib/api-client";

interface Props {
  data: Record<string, unknown>[];
  config: GenericTableConfig;
  tableName: string;
}

export function GenericTableWithDelete({ data, config, tableName }: Props) {
  return (
    <GenericDataTable
      data={data}
      config={config}
      onDeleteRow={async (id) => {
        try {
          await apiFetch("/api/table-delete", {
            method: "POST",
            body: JSON.stringify({ table: tableName, id }),
          });
          return { success: true } as const;
        } catch (err) {
          return {
            error: err instanceof Error ? err.message : "Failed to delete",
          } as const;
        }
      }}
    />
  );
}

