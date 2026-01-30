"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { Plus, Download, ChevronDown } from "lucide-react";
import {
  GenericDataTable,
  type GenericTableConfig,
} from "@/components/tables/generic-table-factory";
import { TableLayout } from "@/components/layouts";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const config: GenericTableConfig = {
  title: "Commitments",
  description: "Manage purchase orders and subcontracts",
  searchFields: ["number", "title", "description"],
  exportFilename: "commitments-export.csv",
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
          out_for_signature: "secondary",
          executed: "default",
          complete: "default",
          terminated: "destructive",
        },
        defaultVariant: "outline",
      },
    },
    {
      id: "original_amount",
      label: "Original Amount",
      defaultVisible: true,
      type: "number",
      renderConfig: {
        type: "currency",
        prefix: "$",
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
      id: "balance_to_finish",
      label: "Balance to Finish",
      defaultVisible: true,
      type: "number",
      renderConfig: {
        type: "currency",
        prefix: "$",
      },
    },
    {
      id: "executed",
      label: "Executed",
      defaultVisible: false,
      type: "boolean",
      renderConfig: {
        type: "boolean",
        trueLabel: "Yes",
        falseLabel: "No",
      },
    },
    {
      id: "created_at",
      label: "Created",
      defaultVisible: false,
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
    {
      id: "status",
      label: "Status",
      field: "status",
      options: [
        { value: "draft", label: "Draft" },
        { value: "pending", label: "Pending" },
        { value: "approved", label: "Approved" },
        { value: "out_for_signature", label: "Out for Signature" },
        { value: "executed", label: "Executed" },
        { value: "complete", label: "Complete" },
        { value: "terminated", label: "Terminated" },
      ],
    },
    {
      id: "contract_company_name",
      label: "Contract Company",
      field: "contract_company_name",
      options: [],
    },
    {
      id: "executed_flag",
      label: "Executed",
      field: "executed",
      options: [
        { value: "true", label: "Yes" },
        { value: "false", label: "No" },
      ],
    },
    {
      id: "erp_status",
      label: "ERP Status",
      field: "erp_status",
      options: [
        { value: "synced", label: "Synced" },
        { value: "not_synced", label: "Not Synced" },
      ],
    },
    {
      id: "ssov_status",
      label: "SSOV Status",
      field: "ssov_status",
      options: [
        { value: "ready", label: "Ready" },
        { value: "not_ready", label: "Not Ready" },
      ],
    },
  ],
};

export default function ProjectCommitmentsPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const projectId = params.projectId as string;

  const [commitments, setCommitments] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCommitments() {
      try {
        setIsLoading(true);
        const supabase = createClient();
        const { data, error: fetchError } = await supabase
          .from("commitments_unified")
          .select("*")
          .eq("project_id", parseInt(projectId))
          .is("deleted_at", null)
          .order("created_at", { ascending: false });

        if (fetchError) throw fetchError;
        setCommitments(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load commitments");
      } finally {
        setIsLoading(false);
      }
    }

    fetchCommitments();
  }, [projectId]);

  const tabs = [
    {
      label: "Commitments",
      href: `/${projectId}/commitments`,
      count: commitments.length,
    },
    {
      label: "Recycle Bin",
      href: `/${projectId}/commitments/recycle-bin`,
    },
  ];

  const handleExport = () => {
    // CSV export is handled by GenericDataTable
  };

  const handleCreateSubcontract = () => {
    router.push(`/${projectId}/commitments/new?type=subcontract`);
  };

  const handleCreatePurchaseOrder = () => {
    router.push(`/${projectId}/commitments/new?type=purchase_order`);
  };

  if (error) {
    return (
      <TableLayout>
        <div className="text-center text-destructive p-6">
          Error loading commitments: {error}
        </div>
      </TableLayout>
    );
  }

  return (
    <TableLayout>
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Commitments</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/${projectId}/commitments/recycle-bin`)}
          >
            Recycle Bin
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleCreateSubcontract}>
                Subcontract
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCreatePurchaseOrder}>
                Purchase Order
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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
            <div className="text-muted-foreground">Loading commitments...</div>
          </div>
        ) : (
          <GenericDataTable
            data={commitments}
            config={{ ...config, title: undefined, description: undefined }}
          />
        )}
      </div>
    </TableLayout>
  );
}
