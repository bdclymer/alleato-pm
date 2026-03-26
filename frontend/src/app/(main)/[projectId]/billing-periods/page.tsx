"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ds";
import { ProjectPageHeader, PageContainer } from "@/components/layout";
import {
  Plus,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  FileText,
  Lock,
  Unlock,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BillingPeriod {
  id: string;
  number: string;
  name: string;
  startDate: string;
  endDate: string;
  status: "draft" | "open" | "locked" | "closed";
  invoiceCount: number;
  totalInvoiced: number;
  totalPaid: number;
  dueDate: string;
  closedDate: string | null;
}

const mockBillingPeriods: BillingPeriod[] = [
  {
    id: "1",
    number: "BP-2025-01",
    name: "January 2025 Billing",
    startDate: "2025-01-01",
    endDate: "2025-01-31",
    status: "open",
    invoiceCount: 8,
    totalInvoiced: 287500,
    totalPaid: 145000,
    dueDate: "2025-02-15",
    closedDate: null,
  },
  {
    id: "2",
    number: "BP-2024-12",
    name: "December 2024 Billing",
    startDate: "2024-12-01",
    endDate: "2024-12-31",
    status: "closed",
    invoiceCount: 12,
    totalInvoiced: 425000,
    totalPaid: 425000,
    dueDate: "2025-01-15",
    closedDate: "2025-01-20",
  },
  {
    id: "3",
    number: "BP-2024-11",
    name: "November 2024 Billing",
    startDate: "2024-11-01",
    endDate: "2024-11-30",
    status: "closed",
    invoiceCount: 10,
    totalInvoiced: 356000,
    totalPaid: 356000,
    dueDate: "2024-12-15",
    closedDate: "2024-12-18",
  },
  {
    id: "4",
    number: "BP-2025-02",
    name: "February 2025 Billing",
    startDate: "2025-02-01",
    endDate: "2025-02-28",
    status: "draft",
    invoiceCount: 0,
    totalInvoiced: 0,
    totalPaid: 0,
    dueDate: "2025-03-15",
    closedDate: null,
  },
];

const getPaymentStatus = (
  invoiced: number,
  paid: number,
): { percentage: number; color: string } => {
  if (invoiced === 0) return { percentage: 0, color: "bg-muted" };
  const raw = (paid / invoiced) * 100;
  const percentage = Math.max(0, Math.min(100, raw));
  if (percentage >= 100) return { percentage, color: "bg-primary" };
  if (percentage >= 50) return { percentage, color: "bg-warning" };
  return { percentage, color: "bg-destructive" };
};

export default function ProjectBillingPeriodsPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const projectId = params.projectId ?? "";

  const [data] = React.useState<BillingPeriod[]>(mockBillingPeriods);

  const columns: ColumnDef<BillingPeriod>[] = [
    {
      accessorKey: "number",
      header: "Period Number",
      cell: ({ row }) => (
        <Button
          variant="link"
          className="p-0 h-auto font-medium"
          onClick={() => router.push(`/${projectId}/billing-periods/${row.original.id}`)}
        >
          {row.getValue("number")}
        </Button>
      ),
    },
    {
      accessorKey: "name",
      header: "Period Name",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
    },
    {
      accessorKey: "startDate",
      header: "Period",
      cell: ({ row }) => (
        <div className="text-sm">
          <div>{new Date(row.getValue("startDate")).toLocaleDateString()}</div>
          <div className="text-muted-foreground">
            to {new Date(row.original.endDate).toLocaleDateString()}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return <StatusBadge status={status} />;
      },
    },
    {
      accessorKey: "invoiceCount",
      header: "Invoices",
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("invoiceCount")}</span>
      ),
    },
    {
      accessorKey: "totalInvoiced",
      header: "Total Invoiced",
      cell: ({ row }) => (
        <span className="font-medium">
          ${row.getValue<number>("totalInvoiced").toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "totalPaid",
      header: "Payment Status",
      cell: ({ row }) => {
        const invoiced = row.original.totalInvoiced;
        const paid = row.original.totalPaid;
        const { percentage, color } = getPaymentStatus(invoiced, paid);

        return (
          <div className="space-y-1">
            <div className="text-sm font-medium">
              ${paid.toLocaleString()} / ${invoiced.toLocaleString()}
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className={`${color} h-2 rounded-full transition-all`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "dueDate",
      header: "Due Date",
      cell: ({ row }) => (
        <span>{new Date(row.getValue("dueDate")).toLocaleDateString()}</span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const status = row.original.status;
        const id = row.original.id;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => router.push(`/${projectId}/billing-periods/${id}`)}
              >
                <Eye className="mr-2 h-4 w-4" />
                View
              </DropdownMenuItem>
              {status === "draft" && (
                <DropdownMenuItem
                  onClick={() => router.push(`/${projectId}/billing-periods/${id}/edit`)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
              {status === "open" && (
                <>
                  <DropdownMenuItem
                    onClick={() => router.push(`/${projectId}/invoices/new?billingPeriodId=${id}`)}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Create Invoice
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push(`/${projectId}/billing-periods/${id}/lock`)}>
                    <Lock className="mr-2 h-4 w-4" />
                    Lock Period
                  </DropdownMenuItem>
                </>
              )}
              {status === "locked" && (
                <DropdownMenuItem onClick={() => router.push(`/${projectId}/billing-periods/${id}/unlock`)}>
                  <Unlock className="mr-2 h-4 w-4" />
                  Unlock Period
                </DropdownMenuItem>
              )}
              {status === "draft" && (
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const openPeriods = data.filter((p) => p.status === "open");
  const totalInvoiced = data.reduce((sum, p) => sum + p.totalInvoiced, 0);
  const totalPaid = data.reduce((sum, p) => sum + p.totalPaid, 0);
  const outstanding = totalInvoiced - totalPaid;

  return (
    <>
      <ProjectPageHeader
        title="Billing Periods"
        description="Manage invoice billing periods and cycles"
        breadcrumbs={[
          { label: "Invoices", href: `/${projectId}/invoices?tab=billing-periods` },
          { label: "Billing Periods" },
        ]}
        actions={
          <Button>
            <Plus />
            Create Billing Period
          </Button>
        }
      />
      <PageContainer>
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-card rounded-lg border border-border p-4">
              <div className="text-sm font-medium text-muted-foreground">Total Periods</div>
              <div className="text-2xl font-bold text-foreground mt-1">
                {data.length}
              </div>
            </div>
            <div className="bg-card rounded-lg border border-border p-4">
              <div className="text-sm font-medium text-muted-foreground">Open Periods</div>
              <div className="text-2xl font-bold text-foreground mt-1">
                {openPeriods.length}
              </div>
            </div>
            <div className="bg-card rounded-lg border border-border p-4">
              <div className="text-sm font-medium text-muted-foreground">
                Total Invoiced
              </div>
              <div className="text-2xl font-bold text-foreground mt-1">
                ${totalInvoiced.toLocaleString()}
              </div>
            </div>
            <div className="bg-card rounded-lg border border-border p-4">
              <div className="text-sm font-medium text-muted-foreground">Outstanding</div>
              <div className="text-2xl font-bold text-foreground mt-1">
                ${outstanding.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <DataTable
              columns={columns}
              data={data}
              searchKey="name"
              searchPlaceholder="Search billing periods..."
            />
          </div>
        </div>
      </PageContainer>
    </>
  );
}
