"use client";

import { useMemo, useState } from "react";
import {
  GenericDataTable,
  type GenericTableConfig,
} from "@/components/tables/generic-table-factory";
import { TableLayout } from "@/components/layouts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BadgeCheck,
  Download,
  FolderKanban,
  Package,
  Plus,
  ShieldCheck,
} from "lucide-react";
import type { SubmittalRow } from "./submittals-data";

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

const statusVariantMap: Record<string, "default" | "secondary" | "destructive" | "outline" | "success"> = {
  Draft: "secondary",
  Submitted: "default",
  "Under Review": "outline",
  "Requires Revision": "destructive",
  Approved: "success",
  Rejected: "destructive",
  Superseded: "secondary",
};

const priorityVariantMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
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

interface SubmittalsClientProps {
  submittals: SubmittalRow[];
  projectId?: number;
}

function formatLabel(value?: string | null) {
  if (!value) return "";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function SubmittalsClient({ submittals, projectId }: SubmittalsClientProps) {
  const [activeTab, setActiveTab] = useState<string>("items");
  const [ballInCourtOnly, setBallInCourtOnly] = useState(false);

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
        submission_date: item.submission_date as string | null | undefined,
        required_approval_date: item.required_approval_date as string | null | undefined,
        submittal_type_name: item.submittal_type_name as string | null | undefined,
        project_name: item.project_name as string | null | undefined,
        ballInCourt:
          item.status === "submitted" || item.status === "under_review",
      })) as SubmittalTableRow[],
    [submittals],
  );

  const filteredRows = useMemo(() => {
    if (activeTab === "packages" || activeTab === "spec-sections" || activeTab === "recycle-bin") {
      return [] as SubmittalTableRow[];
    }

    let rows = tableRows;
    if (activeTab === "ball-in-court" || ballInCourtOnly) {
      rows = rows.filter((row) => row.ballInCourt);
    }
    return rows;
  }, [activeTab, ballInCourtOnly, tableRows]);

  const statusCounts = useMemo(() => {
    const source = activeTab === "ball-in-court" || ballInCourtOnly ? filteredRows : tableRows;
    return {
      draft: source.filter((row) => row.statusKey === "draft").length,
      submitted: source.filter((row) => row.statusKey === "submitted").length,
      approved: source.filter((row) => row.statusKey === "approved").length,
      underReview: source.filter((row) => row.statusKey === "under_review").length,
      rejected: source.filter((row) => row.statusKey === "rejected").length,
    };
  }, [activeTab, ballInCourtOnly, filteredRows, tableRows]);

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
    [],
  );

  return (
    <TableLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-bold" data-testid="submittals-heading">
              Submittals
            </h1>
            <p className="text-sm text-muted-foreground">
              Submittal tracking and approvals
            </p>
            {projectId ? (
              <p className="text-xs text-muted-foreground mt-1">
                Project ID {projectId}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild data-testid="submittals-dropdown-create">
                <Button className="bg-[hsl(var(--procore-orange))] hover:bg-[hsl(var(--procore-orange))]/90">
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
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem data-testid="submittals-export-csv">CSV</DropdownMenuItem>
                <DropdownMenuItem data-testid="submittals-export-pdf">PDF</DropdownMenuItem>
                <DropdownMenuItem data-testid="submittals-export-excel">Excel</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="items" data-testid="submittals-tab-items">
                Items
              </TabsTrigger>
              <TabsTrigger value="packages">
                <Package className="mr-1 h-4 w-4" />
                Packages
              </TabsTrigger>
              <TabsTrigger value="spec-sections">
                <FolderKanban className="mr-1 h-4 w-4" />
                Spec Sections
              </TabsTrigger>
              <TabsTrigger
                value="ball-in-court"
                data-testid="submittals-tab-ball-in-court"
              >
                Ball In Court
              </TabsTrigger>
              <TabsTrigger value="recycle-bin">Recycle Bin</TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            variant={ballInCourtOnly ? "secondary" : "ghost"}
            size="sm"
            data-testid="submittals-filter-chip"
            onClick={() => setBallInCourtOnly((prev) => !prev)}
            className="flex items-center gap-2"
          >
            <BadgeCheck className="h-4 w-4" />
            Ball In Court
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Draft
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statusCounts.draft}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Submitted
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statusCounts.submitted}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Under Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statusCounts.underReview}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Approved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statusCounts.approved}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Rejected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statusCounts.rejected}</div>
            </CardContent>
          </Card>
        </div>

        <div
          className="bg-background rounded-lg border"
          data-testid="submittals-table"
        >
          <GenericDataTable data={filteredRows} config={tableConfig} />
        </div>

        {activeTab !== "items" && activeTab !== "ball-in-court" && (
          <div className="text-sm text-muted-foreground">
            <Badge variant="outline" className="mr-2">
              <ShieldCheck className="mr-1 h-4 w-4" />
              Placeholder
            </Badge>
            This tab is reserved for upcoming {activeTab} workflows.
          </div>
        )}
      </div>
    </TableLayout>
  );
}
