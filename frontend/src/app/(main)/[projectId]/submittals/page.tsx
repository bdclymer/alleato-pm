"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Plus, Download, Package } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageContainer, PageTabs } from "@/components/layout";
import { PageHeader } from "@/components/layout/page-header-unified";
import { GenericDataTable } from "@/components/tables/generic-table-factory";
import type { GenericTableConfig } from "@/components/tables/generic-table-factory";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProjectTitle } from "@/hooks/useProjectTitle";

// Submittal interface
interface Submittal {
  id: string;
  submittal_number: string;
  title: string;
  status: string;
  priority: string;
  submitter_company: string;
  submission_date: string | null;
  required_approval_date: string | null;
  submittal_type_name: string | null;
  project_name: string | null;
}

type SubmittalTableRow = {
  id: string;
  submittal_number: string;
  title: string;
  statusDisplay: string;
  priorityLabel: string;
  submitter_company: string;
  submission_date: string | null;
  required_approval_date: string | null;
  submittal_type_name: string | null;
  project_name: string | null;
  ballInCourt: boolean;
  statusKey: string;
};

const statusVariantMap: Record<
  string,
  "default" | "secondary" | "destructive" | "outline" | "success"
> = {
  Draft: "secondary",
  Submitted: "default",
  "Under Review": "outline",
  "Requires Revision": "destructive",
  Approved: "success",
  Rejected: "destructive",
  Superseded: "secondary",
};

const priorityVariantMap: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  High: "destructive",
  Normal: "secondary",
  Low: "outline",
};

const statusOptions = [
  "Draft",
  "Submitted",
  "Under Review",
  "Requires Revision",
  "Approved",
  "Rejected",
  "Superseded",
];

const priorityOptions = ["High", "Normal", "Low"];

function formatLabel(value?: string | null) {
  if (!value) return "";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function SubmittalsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = parseInt(params.projectId as string, 10);
  const activeTab = searchParams.get("tab") || "items";

  useProjectTitle("Submittals");

  const [submittals, setSubmittals] = useState<Submittal[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch submittals
  useEffect(() => {
    const fetchSubmittals = async () => {
      if (!projectId) return;

      try {
        const response = await fetch(`/api/projects/${projectId}/submittals`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setSubmittals(data || []);
      } catch {
        toast.error("Failed to load submittals");
      } finally {
        setLoading(false);
      }
    };

    fetchSubmittals();
  }, [projectId]);

  // Transform submittals to table rows
  const tableRows = useMemo<SubmittalTableRow[]>(
    () =>
      (submittals || []).map((item) => ({
        id: item.id ?? item.submittal_number ?? crypto.randomUUID(),
        submittal_number: item.submittal_number ?? "",
        title: item.title ?? "Untitled Submittal",
        statusDisplay: formatLabel(String(item.status)) || "Submitted",
        statusKey: item.status ?? "submitted",
        priorityLabel: formatLabel(String(item.priority)) || "Normal",
        submitter_company: item.submitter_company ?? "",
        submission_date: item.submission_date,
        required_approval_date: item.required_approval_date,
        submittal_type_name: item.submittal_type_name,
        project_name: item.project_name,
        ballInCourt:
          item.status === "submitted" || item.status === "under_review",
      })),
    [submittals]
  );

  // Filter rows based on active tab
  const filteredRows = useMemo(() => {
    if (
      activeTab === "packages" ||
      activeTab === "spec-sections" ||
      activeTab === "recycle-bin"
    ) {
      return [] as SubmittalTableRow[];
    }

    let rows = tableRows;
    if (activeTab === "ball-in-court") {
      rows = rows.filter((row) => row.ballInCourt);
    }
    return rows;
  }, [activeTab, tableRows]);

  // Table configuration
  const tableConfig = useMemo<GenericTableConfig>(
    () => ({
      columns: [
        {
          id: "submittal_number",
          label: "Number",
          defaultVisible: true,
          type: "text",
          isPrimary: true,
        },
        {
          id: "title",
          label: "Title",
          defaultVisible: true,
          type: "text",
        },
        {
          id: "submittal_type_name",
          label: "Type",
          defaultVisible: true,
          type: "text",
        },
        {
          id: "statusDisplay",
          label: "Status",
          defaultVisible: true,
          renderConfig: {
            type: "badge",
            variantMap: statusVariantMap,
            defaultVariant: "outline",
          },
        },
        {
          id: "priorityLabel",
          label: "Priority",
          defaultVisible: true,
          renderConfig: {
            type: "badge",
            variantMap: priorityVariantMap,
            defaultVariant: "secondary",
          },
        },
        {
          id: "submitter_company",
          label: "Submitted By",
          defaultVisible: true,
          type: "text",
        },
        {
          id: "submission_date",
          label: "Submitted",
          defaultVisible: true,
          type: "date",
        },
        {
          id: "required_approval_date",
          label: "Required Approval",
          defaultVisible: true,
          type: "date",
        },
        {
          id: "project_name",
          label: "Project",
          defaultVisible: false,
          type: "text",
        },
      ],
      searchFields: [
        "title",
        "submittal_number",
        "submitter_company",
        "statusDisplay",
        "priorityLabel",
        "submittal_type_name",
      ],
      filters: [
        {
          id: "status-filter",
          label: "Status",
          field: "statusDisplay",
          options: statusOptions.map((status) => ({
            value: status,
            label: status,
          })),
        },
        {
          id: "priority-filter",
          label: "Priority",
          field: "priorityLabel",
          options: priorityOptions.map((priority) => ({
            value: priority,
            label: priority,
          })),
        },
      ],
      exportFilename: "submittals-export.csv",
      enableViewSwitcher: true,
      enableSorting: true,
      defaultSortColumn: "submission_date",
      defaultSortDirection: "desc",
    }),
    []
  );

  return (
    <>
      <PageHeader
        title="Submittals"
        description="Manage submittal items, packages, and review workflows"
        showExportButton={false}
        actions={
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild data-testid="submittals-dropdown-create">
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Submittal
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem data-testid="submittals-create-submittal">
                  Submittal
                </DropdownMenuItem>
                <DropdownMenuItem data-testid="submittals-create-package">
                  Submittal Package
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild data-testid="submittals-dropdown-export">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem data-testid="submittals-export-csv">
                  CSV
                </DropdownMenuItem>
                <DropdownMenuItem data-testid="submittals-export-pdf">
                  PDF
                </DropdownMenuItem>
                <DropdownMenuItem data-testid="submittals-export-excel">
                  Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {/* Tabs */}
      <PageTabs
        tabs={[
          {
            label: "Items",
            href: `/${projectId}/submittals`,
            count: tableRows.length,
            testId: "submittals-tab-items",
          },
          {
            label: "Packages",
            href: `/${projectId}/submittals?tab=packages`,
          },
          {
            label: "Spec Sections",
            href: `/${projectId}/submittals?tab=spec-sections`,
          },
          {
            label: "Ball In Court",
            href: `/${projectId}/submittals?tab=ball-in-court`,
            testId: "submittals-tab-ball-in-court",
          },
          {
            label: "Recycle Bin",
            href: `/${projectId}/submittals?tab=recycle-bin`,
          },
        ]}
      />

      <PageContainer className="space-y-6">
        {/* Submittals Table */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-muted-foreground">Loading submittals...</p>
          </div>
        ) : activeTab === "items" || activeTab === "ball-in-court" ? (
          filteredRows.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No submittals found</p>
              <Button onClick={() => router.push(`/${projectId}/submittals/new`)}>
                <Plus className="h-4 w-4 mr-2" />
                Create your first submittal
              </Button>
            </div>
          ) : (
            <div data-testid="submittals-table">
              <GenericDataTable data={filteredRows} config={tableConfig} />
            </div>
          )
        ) : (
          <div className="text-center py-12">
            <Badge variant="outline" className="mb-4">
              <Package className="mr-1 h-4 w-4" />
              Coming Soon
            </Badge>
            <p className="text-sm text-muted-foreground">
              This tab is reserved for upcoming {activeTab} workflows.
            </p>
          </div>
        )}
      </PageContainer>
    </>
  );
}
