"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  MoreVertical,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FinancialPageLayout,
  FinancialDataTable,
  TableColumn,
} from "@/components/shared";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import { StatusBadge } from "@/components/misc/status-badge";
import { createClient } from "@/lib/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProjectTitle } from "@/hooks/useProjectTitle";

interface Contract {
  id: number;
  contract_number: string | null;
  title: string | null;
  client_id: number;
  project_id: number | null;
  status: string | null;
  erp_status: string | null;
  executed: boolean | null;
  original_contract_amount: number | null;
  approved_change_orders: number | null;
  pending_change_orders: number | null;
  draft_change_orders: number | null;
  revised_contract_amount: number | null;
  invoiced_amount: number | null;
  client?: {
    id: number;
    name: string | null;
  } | null;
  project?: {
    id: number;
    name: string | null;
    project_number: string | null;
  } | null;
}

export default function ContractsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  useProjectTitle("Prime Contracts");

  const formatCurrency = useFormatCurrency();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedContracts, setExpandedContracts] = useState<Set<number>>(
    new Set(),
  );

  // Fetch contracts
  useEffect(() => {
    fetchContracts();
  }, [projectId]);

  const fetchContracts = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("financial_contracts")
        .select(
          `
          *,
          client:clients(id, name),
          project:projects(id, name, project_number)
        `,
        )
        .eq("project_id", Number(projectId))
        .order("created_at", { ascending: false });

      if (!error) {
        setContracts((data || []) as any);
      }
    } catch (err) {
      console.error("Failed to fetch contracts:", err);
      // Error is handled silently - UI shows empty state
    } finally {
      setLoading(false);
    }
  };

  // Calculate summary data
  const totalOriginalAmount = contracts.reduce(
    (sum, c) => sum + (c.original_contract_amount || 0),
    0,
  );
  const totalApprovedCOs = contracts.reduce(
    (sum, c) => sum + (c.approved_change_orders || 0),
    0,
  );
  const totalRevisedAmount = contracts.reduce(
    (sum, c) => sum + (c.revised_contract_amount || 0),
    0,
  );
  const totalPendingCOs = contracts.reduce(
    (sum, c) => sum + (c.pending_change_orders || 0),
    0,
  );

  // Define summary cards
  const summaryCards = [
    {
      label: "Original Contract Amount",
      value: totalOriginalAmount,
      format: "currency" as const,
    },
    {
      label: "Approved COs",
      value: totalApprovedCOs,
      format: "currency" as const,
      color: "green" as const,
    },
    {
      label: "Revised Contract Amount",
      value: totalRevisedAmount,
      format: "currency" as const,
    },
    {
      label: "Pending COs",
      value: totalPendingCOs,
      format: "currency" as const,
      color: "yellow" as const,
    },
  ];

  // Define table columns
  const columns: TableColumn<Contract>[] = [
    {
      key: "expand",
      header: "",
      accessor: (contract) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            toggleExpanded(contract.id);
          }}
        >
          {expandedContracts.has(contract.id) ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      ),
      className: "w-10",
    },
    {
      key: "contract_number",
      header: "Contract #",
      accessor: (contract) => (
        <span className="font-medium">
          {contract.contract_number || `CON-${contract.id}`}
        </span>
      ),
    },
    {
      key: "title",
      header: "Title",
      accessor: (contract) => contract.title || "Untitled Contract",
    },
    {
      key: "client",
      header: "Client",
      accessor: (contract) => contract.client?.name || "--",
    },
    {
      key: "status",
      header: "Status",
      accessor: (contract) => (
        <StatusBadge
          status={contract.status || "draft"}
          type="prime-contract"
        />
      ),
    },
    {
      key: "erp_status",
      header: "ERP Status",
      accessor: (contract) => (
        <Badge variant="outline">{contract.erp_status || "Not Synced"}</Badge>
      ),
    },
    {
      key: "original_amount",
      header: "Original Amount",
      accessor: (contract) => formatCurrency(contract.original_contract_amount),
      align: "right" as const,
    },
    {
      key: "revised_amount",
      header: "Revised Amount",
      accessor: (contract) => formatCurrency(contract.revised_contract_amount),
      align: "right" as const,
    },
    {
      key: "invoiced",
      header: "Invoiced",
      accessor: (contract) => formatCurrency(contract.invoiced_amount),
      align: "right" as const,
    },
    {
      key: "executed",
      header: "Executed",
      accessor: (contract) =>
        contract.executed ? (
          <Badge variant="default">Yes</Badge>
        ) : (
          <Badge variant="secondary">No</Badge>
        ),
      align: "center" as const,
    },
  ];

  const toggleExpanded = (contractId: number) => {
    setExpandedContracts((prev) => {
      const next = new Set(prev);
      if (next.has(contractId)) {
        next.delete(contractId);
      } else {
        next.add(contractId);
      }
      return next;
    });
  };

  const handleExport = (format: "csv" | "pdf" | "excel") => {
    // Implement export functionality
    };

  const handleRowClick = (contract: Contract) => {
    if (contract.id) {
      router.push(`/${projectId}/contracts/${contract.id}`);
    }
  };

  const rowActions = (contract: Contract) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => router.push(`/${projectId}/contracts/${contract.id}`)}
        >
          View Details
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            router.push(`/${projectId}/contracts/${contract.id}/edit`)
          }
        >
          Edit Contract
        </DropdownMenuItem>
        <DropdownMenuItem>Download PDF</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <FinancialPageLayout
      title="Prime Contracts"
      description="Manage your prime contracts and change orders"
      createButtonLabel="Create Contract"
      createHref={`/${projectId}/contracts/new`}
      summaryCards={summaryCards}
    >
      <FinancialDataTable
        title="Contracts"
        data={contracts}
        columns={columns}
        loading={loading}
        loadingMessage="Loading contracts..."
        emptyIcon={FileText}
        emptyMessage="No contracts found. Create your first contract to get started."
        emptyActionLabel="Create your first contract"
        onEmptyAction={() => router.push(`/${projectId}/contracts/new`)}
        onExport={handleExport}
        onRowClick={handleRowClick}
        actions={rowActions}
      />

      {/* TODO: Add expandable rows for change orders */}
    </FinancialPageLayout>
  );
}
