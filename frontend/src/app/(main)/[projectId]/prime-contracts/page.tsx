"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { PageContainer, PageTabs } from "@/components/layout";
import { PageHeader } from "@/components/layout/page-header-unified";
import { GenericDataTable } from "@/components/tables/generic-table-factory";
import { contractsTableConfig } from "@/config/tables/contracts.config";
import { useProjectTitle } from "@/hooks/useProjectTitle";

// Prime Contract interface matching the schema with calculated financial fields
interface Contract {
  id: string;
  project_id: number;
  contract_number: string;
  title: string;
  client_id: number | null;
  vendor_id: string | null; // Deprecated but kept for backward compatibility
  description: string | null;
  status: "draft" | "out_for_bid" | "out_for_signature" | "approved" | "complete" | "terminated";
  executed: boolean;
  executed_at: string | null;
  original_contract_value: number;
  revised_contract_value: number;
  start_date: string | null;
  end_date: string | null;
  retention_percentage: number | null;
  payment_terms: string | null;
  billing_schedule: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations
  client?: {
    id: number;
    name: string;
  } | null;
  // Calculated fields from contract_financial_summary_mv
  approved_change_orders: number;
  pending_change_orders: number;
  draft_change_orders: number;
  invoiced: number;
  payments_received: number;
  remaining_balance: number;
}

export default function ProjectContractsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = parseInt(params.projectId as string, 10);
  const statusFilter = searchParams.get("status") || "all";

  useProjectTitle("Prime Contracts");

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<Contract | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch contracts
  useEffect(() => {
    const fetchContracts = async () => {
      if (!projectId) return;

      try {
        const response = await fetch(`/api/projects/${projectId}/contracts`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setContracts(data || []);
      } catch (err) {
        toast.error("Failed to load contracts");
      } finally {
        setLoading(false);
      }
    };

    fetchContracts();
  }, [projectId]);

  // Filter contracts by status
  const filteredContracts = useMemo(() => {
    if (statusFilter === "all") return contracts;
    return contracts.filter((contract) => contract.status === statusFilter);
  }, [contracts, statusFilter]);

  // Transform contracts for GenericDataTable (flatten client - financial fields come from API)
  const tableData = useMemo(() => {
    return filteredContracts.map((contract) => ({
      ...contract,
      client_name: contract.client?.name || null,
    }));
  }, [filteredContracts]);

  // Handle delete with confirmation dialog
  const handleDeleteRow = useCallback(async (id: string | number): Promise<{ error?: string }> => {
    const contract = contracts.find(c => c.id === String(id));
    if (contract) {
      setContractToDelete(contract);
      setDeleteDialogOpen(true);
    }
    // Return empty - actual deletion happens in confirmDelete
    return {};
  }, [contracts]);

  const confirmDelete = async () => {
    if (!contractToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/contracts/${contractToDelete.id}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Failed to delete contract");
        return;
      }

      // Remove from local state
      setContracts(prev => prev.filter(c => c.id !== contractToDelete.id));
      toast.success(`Contract "${contractToDelete.title}" deleted successfully`);
    } catch (err) {
      toast.error("Failed to delete contract");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setContractToDelete(null);
    }
  };

  // Calculate totals
  const totals = useMemo(() => {
    return filteredContracts.reduce(
      (acc, contract) => ({
        original: acc.original + (contract.original_contract_value || 0),
        revised: acc.revised + (contract.revised_contract_value || 0),
      }),
      { original: 0, revised: 0 },
    );
  }, [filteredContracts]);

  // Table configuration with row click and delete
  const tableConfig = useMemo(
    () => ({
      ...contractsTableConfig,
      rowClickPath: `/${projectId}/prime-contracts/{id}`,
      onDelete: true,
    }),
    [projectId],
  );

  return (
    <>
      <PageHeader
        title="Prime Contracts"
        description="Manage prime contracts and owner agreements"
        showExportButton={false}
        actions={
          <Button
            size="sm"
            onClick={() => router.push(`/${projectId}/prime-contracts/new`)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Contract
          </Button>
        }
      />

      {/* Tabs */}
      <PageTabs
        tabs={[
          {
            label: "All Contracts",
            href: `/${projectId}/prime-contracts`,
            count: contracts.length,
          },
          {
            label: "Active",
            href: `/${projectId}/prime-contracts?status=active`,
          },
          {
            label: "Completed",
            href: `/${projectId}/prime-contracts?status=completed`,
          },
        ]}
      />

      <PageContainer className="space-y-6">
        {/* Contracts Table */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Text tone="muted">Loading contracts...</Text>
          </div>
        ) : tableData.length === 0 ? (
          <div className="text-center py-12">
            <Text tone="muted" className="mb-4">No contracts found</Text>
            <Button
              onClick={() => router.push(`/${projectId}/prime-contracts/new`)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create your first contract
            </Button>
          </div>
        ) : (
          <GenericDataTable
            data={tableData}
            config={tableConfig}
            onDeleteRow={handleDeleteRow}
          />
        )}
      </PageContainer>

      {/* //TODO: Delete confirmation dialog should use a component - MKH */}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contract</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete contract{" "}
              <strong>{contractToDelete?.contract_number}</strong> -{" "}
              <strong>{contractToDelete?.title}</strong>?
              <br /><br />
              This action cannot be undone. Any associated line items and change orders
              must be deleted first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Contract"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
