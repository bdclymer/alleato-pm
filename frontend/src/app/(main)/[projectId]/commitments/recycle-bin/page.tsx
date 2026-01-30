"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { Trash2 } from "lucide-react";
import {
  GenericDataTable,
  type GenericTableConfig,
} from "@/components/tables/generic-table-factory";
import { TableLayout } from "@/components/layouts";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const config: GenericTableConfig = {
  searchFields: ["number", "title", "description"],
  exportFilename: "commitments-recycle-bin-export.csv",
  columns: [
    {
      id: "number",
      label: "Number",
      defaultVisible: true,
      type: "text",
    },
    {
      id: "title",
      label: "Title",
      defaultVisible: true,
      type: "text",
    },
    {
      id: "type",
      label: "Type",
      defaultVisible: true,
      type: "badge",
      renderConfig: {
        type: "badge",
        variantMap: {
          subcontract: "default",
          purchase_order: "secondary",
        },
        defaultVariant: "outline",
      },
    },
    {
      id: "status",
      label: "Status",
      defaultVisible: true,
      type: "badge",
      renderConfig: {
        type: "badge",
        variantMap: {
          draft: "outline",
          pending: "secondary",
          approved: "default",
          executed: "default",
          terminated: "destructive",
        },
        defaultVariant: "outline",
      },
    },
    {
      id: "revised_contract_amount",
      label: "Revised Amount",
      defaultVisible: true,
      type: "number",
      renderConfig: {
        type: "currency",
        prefix: "$",
      },
    },
    {
      id: "deleted_at",
      label: "Deleted",
      defaultVisible: true,
      type: "date",
    },
  ],
  filters: [
    {
      id: "type",
      label: "Type",
      field: "type",
      options: [
        { value: "subcontract", label: "Subcontract" },
        { value: "purchase_order", label: "Purchase Order" },
      ],
    },
  ],
};

export default function CommitmentsRecycleBinPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const projectId = params.projectId as string;

  const [deletedCommitments, setDeletedCommitments] = useState<Record<string, unknown>[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const supabase = createClient();

        // Fetch deleted commitments
        const { data: deleted, error: deletedError } = await supabase
          .from("commitments_unified")
          .select("*")
          .eq("project_id", parseInt(projectId))
          .not("deleted_at", "is", null)
          .order("deleted_at", { ascending: false });

        if (deletedError) throw deletedError;

        // Fetch count of active commitments for tab
        const { count, error: countError } = await supabase
          .from("commitments_unified")
          .select("*", { count: "exact", head: true })
          .eq("project_id", parseInt(projectId))
          .is("deleted_at", null);

        if (countError) throw countError;

        setDeletedCommitments(deleted || []);
        setActiveCount(count || 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [projectId]);

  const tabs = [
    {
      label: "Commitments",
      href: `/${projectId}/commitments`,
      count: activeCount,
    },
    {
      label: "Recycle Bin",
      href: `/${projectId}/commitments/recycle-bin`,
      count: deletedCommitments.length,
    },
  ];

  if (error) {
    return (
      <TableLayout>
        <div className="text-center text-destructive p-6">
          Error loading recycle bin: {error}
        </div>
      </TableLayout>
    );
  }

  return (
    <TableLayout>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Commitments</h1>
      </div>

      {/* Underline Tabs */}
      <nav className="-mb-px flex space-x-8 border-b" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <button
              key={tab.href}
              type="button"
              onClick={() => router.push(tab.href)}
              className={cn(
                "inline-flex items-center gap-2 border-b-2 py-4 px-1 text-sm font-medium transition-colors whitespace-nowrap",
                isActive
                  ? "border-brand text-brand"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    isActive
                      ? "bg-brand/10 text-brand"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Table */}
      <div className="mt-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading recycle bin...</div>
          </div>
        ) : deletedCommitments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Trash2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">Recycle bin is empty</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Deleted commitments will appear here
            </p>
          </div>
        ) : (
          <GenericDataTable data={deletedCommitments} config={config} />
        )}
      </div>
    </TableLayout>
  );
}
