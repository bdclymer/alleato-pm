"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CreditCard,
  DollarSign,
  Download,
  GitBranch,
  History,
  Mail,
  MoreVertical,
  Pencil,
  PenLine,
  Plus,
  RefreshCw,
  Upload,
} from "lucide-react";

import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { ContentSectionStack, PageShell, PageTabs, SectionRuleHeading } from "@/components/layout";
import { EmptyState, EstimateVersionBadge } from "@/components/ds";
import { SyncFromEstimateModal } from "@/components/domain/contracts/SyncFromEstimateModal";
import { DocumentDeliveryDialog } from "@/components/documents/DocumentDeliveryDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectTitle } from "@/hooks/useProjectTitle";
import { fetchWithTransientRouteRetry } from "@/lib/fetch-with-transient-route-retry";
import { apiFetch } from "@/lib/api-client";
import { useConfirm } from "@/hooks/use-confirm";
import { handleFormError } from "@/lib/handle-form-error";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  usePaymentApplications,
  useDeletePaymentApplication,
  paymentApplicationKeys,
} from "@/hooks/use-payment-applications";

import { EmailsClient } from "../../emails/emails-client";
import { PrimeContractOverviewTab } from "./components/PrimeContractOverviewTab";
import { PrimeContractDialogs } from "./components/PrimeContractDialogs";
import { PrimeContractEstimateImportModal } from "./components/PrimeContractEstimateImportModal";
import { ContractForm } from "@/components/domain/contracts";
import { RelatedItemsTab } from "@/components/commitments/tabs/RelatedItemsTab";
import {
  PrimeContractChangeEventsTab,
  PrimeContractChangeOrdersTab,
  PrimeContractPcosSection,
  PrimeContractInvoicesTab,
  PrimeContractPaymentsTab,
  PrimeContractFinancialMarkupTab,
  PrimeContractAdvancedSettingsTab,
  PrimeContractSovTab,
  useSovEditing,
} from "@/components/domain/contracts/prime-contract-detail";

import type { ContractFormData } from "@/components/domain/contracts/ContractForm";
import type {
  BudgetCode,
  ChangeOrderFormState,
  Contract,
  ContractLineItem,
  ContractTab,
  LineItemFormState,
  OwnerInvoiceSummary,
  Payment,
  PrimeContractCO,
  VerticalMarkup,
} from "./types";

// #region Types

type BudgetCodeCreateTarget =
  | { type: "line-item-form" }
  | { type: "sov-line"; lineId: string };

interface PrimeContractSettings {
  project_id: number;
  co_tier_count: 1 | 2;
  allow_standard_users_create_pcco: boolean;
  allow_standard_users_create_pco: boolean;
  sov_always_editable: boolean;
  enable_completed_work_retainage: boolean;
  enable_stored_materials_retainage: boolean;
  default_retainage_percent: number;
  show_markup_on_co_pdf: boolean;
  show_markup_on_invoice_pdf: boolean;
  default_distribution_prime_contract: string | null;
  default_distribution_pcco: string | null;
  default_distribution_pco: string | null;
}

// #endregion

// #region Helpers

const normalizeVerticalMarkupRows = (rows: VerticalMarkup[]): VerticalMarkup[] =>
  rows.map((row) => ({
    ...row,
    markup_type: row.markup_type ?? "",
    percentage: Number.isFinite(Number(row.percentage)) ? Number(row.percentage) : 0,
    compound: Boolean(row.compound),
    calculation_order: Number.isFinite(Number(row.calculation_order)) ? Number(row.calculation_order) : 0,
  }));

const parseBulletList = (value: string | null | undefined): string[] => {
  if (!value) return [];
  const plainText = value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|div|li)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#\d+;/g, "");
  return plainText.split(/[\n•]+/).map((item) => item.trim()).filter((item) => item.length > 0);
};

const getTextValue = (value: string | null | undefined): { text: string; isMissing: boolean } => {
  const normalized = value?.trim();
  if (!normalized) return { text: "—", isMissing: true };
  return { text: normalized, isMissing: false };
};

const formatStatusLabel = (status: Contract["status"]) => {
  switch (status) {
    case "out_for_signature": return "Out for Signature";
    default: return status.charAt(0).toUpperCase() + status.slice(1);
  }
};

const formatDateTime = (value: string): string => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Unknown date";
  return d.toLocaleString();
};

// #endregion

// #region Component

export default function ProjectContractDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams()! ?? new URLSearchParams();
  const params = useParams()! ?? {};
  const projectId = params.projectId as string;
  const contractId = params.contractId as string;
  const { confirm, ConfirmDialog } = useConfirm();

  useProjectTitle("Prime Contract");

  // #region State

  // ── Core state ──────────────────────────────────────────────────────────
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ContractTab>("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // ── Line items & budget codes (shared by overview tab + edit mode) ──────
  const [lineItems, setLineItems] = useState<ContractLineItem[]>([]);
  const [lineItemsLoading, setLineItemsLoading] = useState(true);
  const [budgetCodes, setBudgetCodes] = useState<BudgetCode[]>([]);
  const [budgetCodesLoading, setBudgetCodesLoading] = useState(false);

  // ── SOV editing (custom hook) ────────────────────────────────────────────
  const sov = useSovEditing({ projectId, contractId, lineItems, setLineItems, budgetCodes });

  // ── Line item add dialog (used by PrimeContractDialogs) ─────────────────
  const [showAddLineItemDialog, setShowAddLineItemDialog] = useState(false);
  const [lineItemForm, setLineItemForm] = useState<LineItemFormState>({
    lineNumber: "", description: "", quantity: "1", unitCost: "0", unitOfMeasure: "", budgetCodeId: "",
  });
  const [isSubmittingLineItem, setIsSubmittingLineItem] = useState(false);
  const [lineItemToDelete, setLineItemToDelete] = useState<ContractLineItem | null>(null);
  const [isDeletingLineItem, setIsDeletingLineItem] = useState(false);
  const [showEstimateImportModal, setShowEstimateImportModal] = useState(false);
  const [showCreateBudgetCodeModal, setShowCreateBudgetCodeModal] = useState(false);
  const [budgetCodeCreateTarget, setBudgetCodeCreateTarget] = useState<BudgetCodeCreateTarget | null>(null);

  // ── Change orders ───────────────────────────────────────────────────────
  const [changeOrders, setChangeOrders] = useState<PrimeContractCO[]>([]);
  const [showNewCoDialog, setShowNewCoDialog] = useState(false);
  const [coForm, setCoForm] = useState<ChangeOrderFormState>({ change_order_number: "", description: "", amount: "", status: "pending" });
  const [isSubmittingCo, setIsSubmittingCo] = useState(false);
  const [showRejectCoDialog, setShowRejectCoDialog] = useState(false);
  const [rejectingCoId, setRejectingCoId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejectingCo, setIsRejectingCo] = useState(false);
  const [editingCo, setEditingCo] = useState<PrimeContractCO | null>(null);
  const [editCoForm, setEditCoForm] = useState<ChangeOrderFormState>({ change_order_number: "", description: "", amount: "", status: "pending" });
  const [isUpdatingCo, setIsUpdatingCo] = useState(false);
  const [deletingCo, setDeletingCo] = useState<PrimeContractCO | null>(null);
  const [isDeletingCo, setIsDeletingCo] = useState(false);

  // ── Invoices (React Query) ──────────────────────────────────────────────
  const { data: paymentApplications = [], isLoading: paymentsLoading } = usePaymentApplications(Number(projectId), contractId);
  const deletePaymentApp = useDeletePaymentApplication(Number(projectId), contractId);
  const queryClient = useQueryClient();
  const [ownerInvoices, setOwnerInvoices] = useState<OwnerInvoiceSummary[]>([]);
  const [ownerInvoicesLoading, setOwnerInvoicesLoading] = useState(false);

  // ── Payments received ───────────────────────────────────────────────────
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsReceivedLoading, setPaymentsReceivedLoading] = useState(false);

  // ── Vertical markups ────────────────────────────────────────────────────
  const [verticalMarkups, setVerticalMarkups] = useState<VerticalMarkup[]>([]);
  const [savedVerticalMarkups, setSavedVerticalMarkups] = useState<VerticalMarkup[]>([]);
  const [markupsLoading, setMarkupsLoading] = useState(false);

  // ── Advanced settings ───────────────────────────────────────────────────
  const [advancedSettings, setAdvancedSettings] = useState<PrimeContractSettings | null>(null);
  const [advancedSettingsLoading, setAdvancedSettingsLoading] = useState(false);
  const [advancedSettingsSaving, setAdvancedSettingsSaving] = useState(false);
  const [contractAdvancedDraft, setContractAdvancedDraft] = useState({
    inclusions: "", exclusions: "", is_private: false, payment_terms: "", billing_schedule: "",
  });


  // ── Document / sync dialogs ─────────────────────────────────────────────
  const [isDocumentDialogOpen, setIsDocumentDialogOpen] = useState(false);
  const [documentDialogTab, setDocumentDialogTab] = useState<"download" | "email">("download");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSyncFromEstimateOpen, setIsSyncFromEstimateOpen] = useState(false);

  // #endregion

  // #region Data Fetching

  useEffect(() => {
    const fetchContract = async () => {
      try {
        setLoading(true);
        const response = await fetchWithTransientRouteRetry(
          `/api/projects/${projectId}/contracts/${contractId}`,
        );
        if (!response.ok) {
          setError(response.status === 404 ? "Contract not found" : "Failed to load contract");
          return;
        }
        setContract(await response.json());
      } catch {
        setError("Failed to load contract");
      } finally {
        setLoading(false);
      }
    };
    if (contractId && projectId) fetchContract();
  }, [contractId, projectId]);

  useEffect(() => {
    if (searchParams.get("edit") === "1") setIsEditing(true);
  }, [searchParams]);

  useEffect(() => {
    if (!contractId || !projectId) return;
    const fetchLineItems = async () => {
      try {
        setLineItemsLoading(true);
        const response = await fetchWithTransientRouteRetry(
          `/api/projects/${projectId}/contracts/${contractId}/line-items`,
        );
        if (response.ok) {
          setLineItems((await response.json()) || []);
        } else {
          toast.error(`Failed to load schedule of values (${response.status})`);
        }
      } catch (err) {
        console.error("Failed to load schedule of values:", err);
        toast.error("Failed to load schedule of values. Try refreshing the page.");
      } finally {
        setLineItemsLoading(false);
      }
    };
    fetchLineItems();
  }, [contractId, projectId]);

  useEffect(() => {
    if (!projectId) return;
    const fetchBudgetCodes = async () => {
      try {
        setBudgetCodesLoading(true);
        const response = await fetchWithTransientRouteRetry(
          `/api/projects/${projectId}/budget-codes`,
        );
        if (!response.ok) throw new Error("Failed to load budget codes");
        const { budgetCodes: codes } = (await response.json()) as { budgetCodes: BudgetCode[] };
        setBudgetCodes(codes || []);
      } catch {
        setBudgetCodes([]);
      } finally {
        setBudgetCodesLoading(false);
      }
    };
    fetchBudgetCodes();
  }, [projectId]);

  useEffect(() => {
    if (!contract) return;
    const fetchChangeOrders = async () => {
      try {
        const ccoResponse = await fetchWithTransientRouteRetry(
          `/api/projects/${projectId}/prime-contract-change-orders`,
        );
        const payload: { data?: PrimeContractCO[] } | PrimeContractCO[] =
          ccoResponse.ok ? await ccoResponse.json() : [];
        const ccos: PrimeContractCO[] = Array.isArray(payload)
          ? payload
          : payload.data ?? [];
        // Keep the Change Orders tab scoped to actual change orders; PCOs render in the dedicated section below.
        setChangeOrders(
          ccos.filter((co) => String(co.contract_id ?? "") === String(contractId)),
        );
      } catch (err) {
        console.error("Failed to load change orders:", err);
        toast.error("Failed to load change orders. Try refreshing the page.");
      }
    };
    fetchChangeOrders();
  }, [contract, contractId, projectId]);

  useEffect(() => {
    if (activeTab !== "payments" || !contract) return;
    const fetchPayments = async () => {
      try {
        setPaymentsReceivedLoading(true);
        const response = await fetchWithTransientRouteRetry(
          `/api/projects/${projectId}/contracts/${contractId}/payments`,
        );
        if (response.ok) setPayments((await response.json()) || []);
      } catch (err) {
        console.error("Failed to load payments:", err);
      } finally {
        setPaymentsReceivedLoading(false);
      }
    };
    fetchPayments();
  }, [activeTab, contract, contractId, projectId]);

  useEffect(() => {
    if (activeTab !== "invoices" || !contract) return;
    const fetchOwnerInvoices = async () => {
      try {
        setOwnerInvoicesLoading(true);
        const response = await fetchWithTransientRouteRetry(
          `/api/projects/${projectId}/invoicing/owner?prime_contract_id=${contractId}`,
        );
        if (!response.ok) throw new Error("Failed to load owner invoices");
        const payload = (await response.json()) as { data?: OwnerInvoiceSummary[] };
        setOwnerInvoices(payload.data ?? []);
      } catch (err) {
        console.error("Failed to load owner invoices:", err);
        toast.error("Failed to load owner invoices. Try refreshing the page.");
      } finally {
        setOwnerInvoicesLoading(false);
      }
    };
    fetchOwnerInvoices();
  }, [activeTab, contract, contractId, projectId]);

  useEffect(() => {
    if (!contract) return;
    const fetchVerticalMarkups = async () => {
      try {
        setMarkupsLoading(true);
        const response = await fetchWithTransientRouteRetry(
          `/api/projects/${projectId}/vertical-markup`,
        );
        if (!response.ok) return;
        const data = await response.json();
        const fetched = normalizeVerticalMarkupRows(data.markups || []);
        setVerticalMarkups(fetched);
        setSavedVerticalMarkups(fetched);
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setMarkupsLoading(false);
      }
    };
    fetchVerticalMarkups();
  }, [contract, projectId]);

  useEffect(() => {
    if (!projectId || !contract) return;
    const fetchAdvancedSettings = async () => {
      try {
        setAdvancedSettingsLoading(true);
        const settings = await apiFetch<PrimeContractSettings>(
          `/api/projects/${projectId}/contracts/settings`,
        );
        setAdvancedSettings(settings);
      } catch (error) {
        handleFormError(error, {
          entity: "prime contract advanced settings",
          action: "load",
        });
      } finally {
        setAdvancedSettingsLoading(false);
      }
    };
    fetchAdvancedSettings();
  }, [projectId, contract]);

  useEffect(() => {
    if (!contract) return;
    setContractAdvancedDraft({
      inclusions: contract.inclusions ?? "",
      exclusions: contract.exclusions ?? "",
      is_private: contract.is_private,
      payment_terms: contract.payment_terms ?? "",
      billing_schedule: contract.billing_schedule ?? "",
    });
  }, [contract]);


  // #endregion

  // #region Computed Values

  const inclusionsList = useMemo(() => parseBulletList(contract?.inclusions), [contract?.inclusions]);
  const exclusionsList = useMemo(() => parseBulletList(contract?.exclusions), [contract?.exclusions]);
  const existingCostCodeByLineId = useMemo(
    () => new Map(lineItems.map((item) => [item.id, item.cost_code_id ?? null])),
    [lineItems],
  );
  const historyEntries = useMemo(() => {
    if (!contract) return [] as Array<{ id: string; label: string; details: string; at: string }>;

    const entries: Array<{ id: string; label: string; details: string; at: string }> = [
      {
        id: "created",
        label: "Prime contract created",
        details: "Initial contract record was created.",
        at: contract.created_at,
      },
    ];

    if (contract.executed_at) {
      entries.push({
        id: "executed",
        label: "Prime contract executed",
        details: "Contract execution was recorded.",
        at: contract.executed_at,
      });
    }

    const createdAt = new Date(contract.created_at).getTime();
    const updatedAt = new Date(contract.updated_at).getTime();
    if (Number.isFinite(createdAt) && Number.isFinite(updatedAt) && updatedAt - createdAt > 1000) {
      entries.push({
        id: "updated",
        label: "Prime contract updated",
        details: "Contract details were updated.",
        at: contract.updated_at,
      });
    }

    return entries.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [contract]);

  // #endregion

  // #region Handlers

  const handleBack = () => router.push(`/${projectId}/prime-contracts`);

  // ── Invoice CRUD ────────────────────────────────────────────────────────

  const handleDeleteInvoice = async (applicationId: string) => {
    const ok = await confirm({
      description: "Delete this invoice? This cannot be undone.",
      variant: "destructive",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    await deletePaymentApp.mutateAsync(applicationId);
  };

  // ── ERP Sync / Export ───────────────────────────────────────────────────

  const handleErpSync = async () => {
    setIsSyncing(true);
    try {
      const [invData, payData] = await Promise.all([
        apiFetch<{ result: { created: number; updated: number; errors: string[] } }>(
          "/api/sync/acumatica/ar-invoices",
          {
            method: "POST",
            body: JSON.stringify({ projectId: Number(projectId) }),
          },
        ),
        apiFetch<{ result: { created: number; updated: number; errors: string[] } }>(
          "/api/sync/acumatica/ar-payments",
          {
            method: "POST",
            body: JSON.stringify({ projectId: Number(projectId) }),
          },
        ),
      ]);
      const inv = invData.result;
      const pay = payData.result;
      toast.success(`ERP sync complete: ${inv.created + pay.created} created, ${inv.updated + pay.updated} updated${inv.errors.length + pay.errors.length > 0 ? ` (${inv.errors.length + pay.errors.length} errors)` : ""}`);
      queryClient.invalidateQueries({ queryKey: paymentApplicationKeys.list(Number(projectId), contractId) });
      const payList = await apiFetch<Payment[]>(
        `/api/projects/${projectId}/contracts/${contractId}/payments`,
      );
      setPayments(payList || []);
      router.refresh();
    } catch (err) {
      handleFormError(err, { entity: "ERP sync", action: "save" });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleErpExport = async () => {
    setIsExporting(true);
    try {
      const body = await apiFetch<{
        results?: {
          paymentApplications?: { created?: number; updated?: number; skipped?: number; errors?: string[] };
          invoices?: { created?: number; updated?: number; skipped?: number; errors?: string[] };
        };
      }>("/api/sync/acumatica/export", {
        method: "POST",
        body: JSON.stringify({ projectId: Number(projectId), contractId, entities: ["paymentApplications", "invoices"] }),
      });
      const paResult = body.results?.paymentApplications as { created?: number; updated?: number; skipped?: number; errors?: string[] } | undefined;
      const invResult = body.results?.invoices as { created?: number; updated?: number; skipped?: number; errors?: string[] } | undefined;
      const totalCreated = (paResult?.created ?? 0) + (invResult?.created ?? 0);
      const totalUpdated = (paResult?.updated ?? 0) + (invResult?.updated ?? 0);
      const totalSkipped = (paResult?.skipped ?? 0) + (invResult?.skipped ?? 0);
      const errors = [...(paResult?.errors ?? []), ...(invResult?.errors ?? [])];
      toast.success(`ERP export complete: ${totalCreated} created, ${totalUpdated} updated, ${totalSkipped} skipped${errors.length > 0 ? ` (${errors.length} errors)` : ""}`);
      if (errors.length > 0) toast.error(errors.slice(0, 2).join(" | "));
    } catch (err) {
      handleFormError(err, { entity: "ERP export", action: "save" });
    } finally {
      setIsExporting(false);
    }
  };


  // ── Change Order CRUD (for dialogs) ─────────────────────────────────────

  const handleCreateCo = async () => {
    if (!coForm.change_order_number || !coForm.description || !coForm.amount) { toast.error("CO number, description, and amount are required"); return; }
    setIsSubmittingCo(true);
    try {
      const newCo = await apiFetch<PrimeContractCO>(`/api/projects/${projectId}/prime-contract-change-orders`, {
        method: "POST",
        body: JSON.stringify({ contract_id: contractId, prime_contract_id: contractId, title: coForm.description, description: coForm.description, total_amount: parseFloat(coForm.amount), status: coForm.status }),
      });
      setChangeOrders((prev) => [...prev, newCo]);
      setShowNewCoDialog(false);
      setCoForm({ change_order_number: "", description: "", amount: "", status: "pending" });
      toast.success("Change order created successfully");
    } catch { toast.error("Failed to create change order"); } finally { setIsSubmittingCo(false); }
  };

  const handleStartEditCo = (co: PrimeContractCO) => {
    setEditingCo(co);
    setEditCoForm({ change_order_number: co.change_order_number || "", description: co.description || "", amount: String(co.amount ?? ""), status: "pending" });
  };

  const handleUpdateCo = async () => {
    if (!editingCo) return;
    if (!editCoForm.change_order_number || !editCoForm.description || !editCoForm.amount) { toast.error("CO number, description, and amount are required"); return; }
    setIsUpdatingCo(true);
    try {
      const updated = await apiFetch<PrimeContractCO>(`/api/projects/${projectId}/prime-contract-change-orders/${editingCo.id}`, {
        method: "PUT",
        body: JSON.stringify({ pcco_number: editCoForm.change_order_number, title: editCoForm.description, description: editCoForm.description, total_amount: parseFloat(editCoForm.amount) }),
      });
      setChangeOrders((prev) => prev.map((co) => (co.id === editingCo.id ? { ...co, ...updated } : co)));
      setEditingCo(null);
      toast.success("Change order updated");
    } catch { toast.error("Failed to update change order"); } finally { setIsUpdatingCo(false); }
  };

  const handleDeleteCo = async () => {
    if (!deletingCo) return;
    setIsDeletingCo(true);
    try {
      await apiFetch(`/api/projects/${projectId}/prime-contract-change-orders/${deletingCo.id}`, { method: "DELETE" });
      setChangeOrders((prev) => prev.filter((co) => co.id !== deletingCo.id));
      setDeletingCo(null);
      toast.success("Change order deleted");
    } catch { toast.error("Failed to delete change order"); } finally { setIsDeletingCo(false); }
  };

  const handleRejectCo = async () => {
    if (!rejectingCoId || !rejectionReason.trim()) { toast.error("Rejection reason is required"); return; }
    setIsRejectingCo(true);
    try {
      await apiFetch(`/api/projects/${projectId}/prime-contract-change-orders/${rejectingCoId}/reject`, {
        method: "POST",
        body: JSON.stringify({ rejection_reason: rejectionReason }),
      });
      setChangeOrders((prev) => prev.map((co) => co.id === rejectingCoId ? { ...co, status: "rejected", rejection_reason: rejectionReason } : co));
      setShowRejectCoDialog(false);
      setRejectingCoId(null);
      setRejectionReason("");
      toast.success("Change order rejected");
    } catch { toast.error("Failed to reject change order"); } finally { setIsRejectingCo(false); }
  };

  // ── Budget code creation ────────────────────────────────────────────────

  const handleBudgetCodeCreated = async (budgetCodeId: string) => {
    try {
      setBudgetCodesLoading(true);
      const { budgetCodes: codes } = await apiFetch<{ budgetCodes: BudgetCode[] }>(
        `/api/projects/${projectId}/budget-codes`,
      );
      setBudgetCodes(codes || []);
      const createdBudgetCode = (codes || []).find((code) => code.id === budgetCodeId);
      const costCodeId = createdBudgetCode?.legacyCostCodeId ?? null;
      if (budgetCodeCreateTarget?.type === "sov-line") {
        sov.setSovDraftItems((prev) => sov.normalizeSovDraftItems(prev.map((item) => item.id === budgetCodeCreateTarget.lineId ? { ...item, cost_code_id: costCodeId } : item)));
        sov.setSovDraftBudgetCodeIds((prev) => ({ ...prev, [budgetCodeCreateTarget.lineId]: budgetCodeId }));
      } else {
        setLineItemForm((prev) => ({ ...prev, budgetCodeId }));
      }
    } finally { setBudgetCodesLoading(false); setBudgetCodeCreateTarget(null); }
  };

  const handleRequestCreateBudgetCodeForLineItemForm = () => { setBudgetCodeCreateTarget({ type: "line-item-form" }); setShowCreateBudgetCodeModal(true); };
  const handleRequestCreateBudgetCodeForSovLine = (lineId: string) => { setBudgetCodeCreateTarget({ type: "sov-line", lineId }); setShowCreateBudgetCodeModal(true); };

  // ── Line item add (dialog) ──────────────────────────────────────────────

  const handleAddLineItem = async () => {
    if (!lineItemForm.lineNumber || !lineItemForm.description) { toast.error("Line number and description are required"); return; }
    const selectedBudgetCode = budgetCodes.find((code) => code.id === lineItemForm.budgetCodeId);
    const costCodeId = selectedBudgetCode?.legacyCostCodeId ? String(selectedBudgetCode.legacyCostCodeId) : null;
    if (!selectedBudgetCode) { toast.error("Please select a budget code before adding a line item."); return; }
    setIsSubmittingLineItem(true);
    try {
      await apiFetch(`/api/projects/${projectId}/contracts/${contractId}/line-items`, {
        method: "POST",
        body: JSON.stringify({ line_number: parseInt(lineItemForm.lineNumber, 10), description: lineItemForm.description, quantity: parseFloat(lineItemForm.quantity) || 0, unit_cost: parseFloat(lineItemForm.unitCost) || 0, unit_of_measure: lineItemForm.unitOfMeasure || null, cost_code_id: costCodeId, budget_code_id: selectedBudgetCode.id }),
      });
      const refreshedItems = await apiFetch<ContractLineItem[]>(
        `/api/projects/${projectId}/contracts/${contractId}/line-items`,
      );
      setLineItems(refreshedItems || []);
      setLineItemForm({ lineNumber: "", description: "", quantity: "1", unitCost: "0", unitOfMeasure: "", budgetCodeId: "" });
      setShowAddLineItemDialog(false);
    } catch (err) { handleFormError(err, { entity: "line item", action: "create" }); } finally { setIsSubmittingLineItem(false); }
  };

  const handleDeleteLineItem = async () => {
    if (!lineItemToDelete) return;
    setIsDeletingLineItem(true);
    try {
      await apiFetch(`/api/projects/${projectId}/contracts/${contractId}/line-items/${lineItemToDelete.id}`, { method: "DELETE" });
      setLineItems((prev) => prev.filter((li) => li.id !== lineItemToDelete.id));
      toast.success("Line item deleted");
    } catch { toast.error("Failed to delete line item"); } finally { setIsDeletingLineItem(false); setLineItemToDelete(null); }
  };

  // ── Inline edit submit ──────────────────────────────────────────────────

  const handleInlineEditSubmit = async (data: ContractFormData) => {
    if (!contract) { toast.error("Contract data is not loaded"); return; }
    setIsSavingEdit(true);
    try {
      const sovItems = (data.sovItems || []).filter((item) => !item.isGroup);
      const sovTotal = sovItems.reduce((sum, item) => sum + (data.accountingMethod === "unit_quantity" ? (item.quantity ?? 0) * (item.unitCost ?? 0) : item.amount || 0), 0);
      await apiFetch(`/api/projects/${projectId}/contracts/${contractId}`, {
        method: "PUT",
        body: JSON.stringify({
          contract_number: data.number, title: data.title, client_id: data.ownerCompanyId || null, contractor_id: data.contractorId || null, architect_engineer_id: data.architectEngineerId || null,
          contract_company_id: data.ownerCompanyId || data.contractCompanyId || null, description: data.description, status: data.status || "draft", executed: data.executed ?? false, executed_at: (data.executed ?? false) ? (contract.executed_at ?? new Date().toISOString()) : null, original_contract_value: sovTotal,
          start_date: data.startDate?.toISOString().split("T")[0] || null, end_date: data.estimatedCompletionDate?.toISOString().split("T")[0] || null,
          substantial_completion_date: data.substantialCompletionDate?.toISOString().split("T")[0] || null, actual_completion_date: data.actualCompletionDate?.toISOString().split("T")[0] || null,
          signed_contract_received_date: data.signedContractReceivedDate?.toISOString().split("T")[0] || null, contract_termination_date: data.contractTerminationDate?.toISOString().split("T")[0] || null,
          retention_percentage: data.defaultRetainage || 0, payment_terms: data.paymentTerms || null, billing_schedule: data.billingSchedule || null,
          is_private: data.isPrivate || false, inclusions: data.inclusions || null, exclusions: data.exclusions || null,
          allowed_user_ids: data.allowedUsers && data.allowedUsers.length > 0 ? data.allowedUsers : [],
          allow_sov_view: data.allowedUsersCanSeeSov || false,
        }),
      });
      const budgetCodesPayload = await apiFetch<{ budgetCodes: Array<{ id: string; legacyCostCodeId?: string | null }> }>(
        `/api/projects/${projectId}/budget-codes`,
      ).catch(() => ({ budgetCodes: [] }));
      const budgetCodeIdToCostCode = new Map<string, string | null>((budgetCodesPayload.budgetCodes || []).map((code: { id: string; legacyCostCodeId?: string | null }) => [code.id, code.legacyCostCodeId ?? null]));
      const itemsToPersist = sovItems.map((item, index) => {
        const budgetCodeId = item.budgetCodeId || "";
        const costCodeId = budgetCodeIdToCostCode.get(budgetCodeId) ?? existingCostCodeByLineId.get(item.id) ?? null;
        const quantity = data.accountingMethod === "unit_quantity" ? item.quantity ?? 0 : 1;
        const unitCost = data.accountingMethod === "unit_quantity" ? item.unitCost ?? 0 : item.amount || 0;
        return { id: item.id, line_number: index + 1, description: item.description || `Line ${index + 1}`, cost_code_id: costCodeId, budget_code_id: budgetCodeId || null, quantity, unit_cost: unitCost, unit_of_measure: item.unitOfMeasure || null };
      });
      const existingIds = new Set(lineItems.map((item) => item.id));
      const incomingIds = new Set(itemsToPersist.map((item) => item.id));
      const updates = itemsToPersist.filter((item) => existingIds.has(item.id));
      const creates = itemsToPersist.filter((item) => !existingIds.has(item.id));
      const deletions = lineItems.filter((item) => !incomingIds.has(item.id)).map((item) => item.id);
      for (const item of updates) {
        try {
          await apiFetch(`/api/projects/${projectId}/contracts/${contractId}/line-items/${item.id}`, {
            method: "PUT",
            body: JSON.stringify({
              line_number: item.line_number,
              description: item.description,
              cost_code_id: item.cost_code_id,
              budget_code_id: item.budget_code_id,
              quantity: item.quantity,
              unit_cost: item.unit_cost,
              unit_of_measure: item.unit_of_measure,
            }),
          });
        } catch (error) {
          throw new Error(
            `Could not save "${item.description || `Line ${item.line_number}`}": ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
      for (const lineItemId of deletions) {
        try {
          await apiFetch(`/api/projects/${projectId}/contracts/${contractId}/line-items/${lineItemId}`, { method: "DELETE" });
        } catch (error) {
          throw new Error(
            `Could not remove line item: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
      for (const item of creates) {
        try {
          await apiFetch(`/api/projects/${projectId}/contracts/${contractId}/line-items`, {
            method: "POST",
            body: JSON.stringify({
              line_number: item.line_number,
              description: item.description,
              cost_code_id: item.cost_code_id,
              budget_code_id: item.budget_code_id,
              quantity: item.quantity,
              unit_cost: item.unit_cost,
              unit_of_measure: item.unit_of_measure,
            }),
          });
        } catch (error) {
          throw new Error(
            `Could not add "${item.description || `Line ${item.line_number}`}": ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
      toast.success("Contract updated successfully");
      setIsEditing(false);
      router.refresh();
    } catch (err) { handleFormError(err, { entity: "contract", action: "update" }); } finally { setIsSavingEdit(false); }
  };

  // #endregion

  // #region Render

  if (loading) {
    return (
      <PageShell variant="detailXWide" title="Prime Contract" description="Loading contract details...">
        <Skeleton className="h-96" />
      </PageShell>
    );
  }

  if (error || !contract) {
    return (
      <PageShell variant="detailXWide" title="Prime Contract" description="Unable to load contract" onBack={handleBack}>
        <Card className="p-[var(--card-padding)]">
          <div className="flex items-center gap-4 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p>{error || "Contract not found"}</p>
          </div>
          <Button variant="outline" onClick={handleBack} className="mt-[var(--group-gap)]">
            <ArrowLeft />
            Back to Contracts
          </Button>
        </Card>
      </PageShell>
    );
  }

  if (isEditing) {
    const sovItems = lineItems.map((item) => {
      const matchingBudgetCode = item.budget_code_id ? budgetCodes.find((c) => c.id === item.budget_code_id) : undefined;
      return {
        id: item.id, budgetCodeId: item.budget_code_id || "", budgetCodeLabel: matchingBudgetCode?.fullLabel ?? (item.cost_code ? `${item.cost_code.code} ${item.cost_code.name}` : undefined),
        description: item.description, amount: item.total_cost, quantity: item.quantity, unitCost: item.unit_cost, unitOfMeasure: item.unit_of_measure ?? undefined, billedToDate: 0, amountRemaining: item.total_cost,
      };
    });
    const initialData: Partial<ContractFormData> = {
      number: contract.contract_number || "", title: contract.title, status: contract.status, executed: contract.executed,
      ownerCompanyId: contract.client_id != null ? String(contract.client_id) : contract.contract_company_id != null ? String(contract.contract_company_id) : undefined,
      contractorId: contract.contractor_id || undefined, architectEngineerId: contract.architect_engineer_id || undefined, contractCompanyId: contract.contract_company_id || undefined,
      description: contract.description || "", originalAmount: contract.original_contract_value, revisedAmount: contract.revised_contract_value,
      startDate: contract.start_date ? new Date(contract.start_date) : undefined, estimatedCompletionDate: contract.end_date ? new Date(contract.end_date) : undefined,
      substantialCompletionDate: contract.substantial_completion_date ? new Date(contract.substantial_completion_date) : undefined,
      actualCompletionDate: contract.actual_completion_date ? new Date(contract.actual_completion_date) : undefined,
      signedContractReceivedDate: contract.signed_contract_received_date ? new Date(contract.signed_contract_received_date) : undefined,
      contractTerminationDate: contract.contract_termination_date ? new Date(contract.contract_termination_date) : undefined,
      defaultRetainage: contract.retention_percentage, paymentTerms: contract.payment_terms || "", billingSchedule: contract.billing_schedule || "",
      isPrivate: contract.is_private,
      allowedUsers: (contract as { allowed_user_ids?: string[] }).allowed_user_ids ?? [],
      allowedUsersCanSeeSov: (contract as { allow_sov_view?: boolean }).allow_sov_view ?? false,
      inclusions: contract.inclusions || "", exclusions: contract.exclusions || "", sovItems,
    };
    return (
      <PageShell variant="form" title={`Edit: ${contract.contract_number || contract.title}`} description="Update contract details and SOV line items" onBack={() => setIsEditing(false)} backLabel="Cancel Edit"
        actions={<Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>Cancel Edit</Button>}>
        <ContractForm initialData={initialData} onSubmit={handleInlineEditSubmit} onCancel={() => setIsEditing(false)} isSubmitting={isSavingEdit} mode="edit" projectId={projectId} />
      </PageShell>
    );
  }

  return (
    <PageShell
      variant="detailXWide"
      eyebrow={
        <span className="inline-flex items-center gap-2">
          {contract.contract_number ? `#${contract.contract_number}` : `#${contract.id.slice(0, 8)}`}
          {contract.estimate_id != null && (
            <EstimateVersionBadge
              projectId={projectId}
              estimateId={contract.estimate_id}
              estimateVersion={contract.estimate_version ?? null}
              lastSyncedAt={contract.last_synced_from_estimate_at ?? null}
            />
          )}
        </span>
      }
      title={contract.title}
      description={contract.contractor ? `Contractor: ${contract.contractor.name}` : contract.vendor ? `Contractor: ${contract.vendor.name}` : "No contractor assigned"}
      onBack={() => router.push(`/${projectId}/prime-contracts`)}
      actions={
        <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" size="sm"><Plus />Create</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`/${projectId}/change-events/new?contractId=${contractId}`)}><GitBranch className="h-4 w-4 mr-2" />Create Change Event</DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`/${projectId}/prime-contracts/${contractId}/change-orders/pcos/new`)}><PenLine className="h-4 w-4 mr-2" />Create Potential Change Order</DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`/${projectId}/change-orders/prime/new?contractId=${contractId}`)}><PenLine className="h-4 w-4 mr-2" />Create Change Order</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setActiveTab("invoices")}><DollarSign className="h-4 w-4 mr-2" />Create Invoice</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("payments")}><CreditCard className="h-4 w-4 mr-2" />Create Payment</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setDocumentDialogTab("email"); setIsDocumentDialogOpen(true); }}><Mail className="h-4 w-4 mr-2" />Email Contract</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="More actions">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled={isSyncing} onClick={handleErpSync}>
                  <RefreshCw className={`h-4 w-4 mr-2${isSyncing ? " animate-spin" : ""}`} />
                  Resync to ERP
                </DropdownMenuItem>
                {contract.estimate_id != null && (
                  <DropdownMenuItem
                    disabled={contract.executed || !["draft", "out_for_signature"].includes(contract.status)}
                    onClick={() => setIsSyncFromEstimateOpen(true)}
                    title={
                      contract.executed
                        ? "Contract is executed — SOV cannot be changed"
                        : !["draft", "out_for_signature"].includes(contract.status)
                          ? `Contract is ${contract.status} — only Draft and Out for Signature can be resynced`
                          : undefined
                    }
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync from Estimate
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem disabled={isExporting} onClick={handleErpExport}>
                  <Upload className={`h-4 w-4 mr-2${isExporting ? " animate-pulse" : ""}`} />
                  Import
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setDocumentDialogTab("download"); setIsDocumentDialogOpen(true); }}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setDocumentDialogTab("email"); setIsDocumentDialogOpen(true); }}>
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
      }
    >
      <PageTabs
        variant="inline"
        tabs={[
          { label: "General", href: "overview", isActive: activeTab === "overview" },
          { label: "SOV", href: "schedule-of-values", isActive: activeTab === "schedule-of-values", count: lineItems.length || undefined },
          { label: "Change Orders", href: "change-orders", isActive: activeTab === "change-orders", count: changeOrders.length || undefined },
          { label: "Invoices", href: "invoices", isActive: activeTab === "invoices", count: paymentApplications.length || undefined },
          { label: "Payments Received", href: "payments", isActive: activeTab === "payments", count: payments.length || undefined },
          { label: "Related Items", href: "related-items", isActive: activeTab === "related-items" },
          { label: "Emails", href: "emails", isActive: activeTab === "emails" },
          { label: "Change History", href: "history", isActive: activeTab === "history" },
          { label: "Financial Markup", href: "financial-markup", isActive: activeTab === "financial-markup" },
          { label: "Advanced Settings", href: "advanced-settings", isActive: activeTab === "advanced-settings" },
        ]}
        onTabClick={(href) => setActiveTab(href as ContractTab)}
      />

      <ContentSectionStack className="pt-3">
        {activeTab === "overview" && (
          <PrimeContractOverviewTab
            contract={contract} changeOrders={changeOrders} projectId={String(projectId)}
            formatDate={formatDate} getTextValue={getTextValue} inclusionsList={inclusionsList} exclusionsList={exclusionsList}
            formatStatusLabel={formatStatusLabel} formatCurrency={formatCurrency} lineItemsLoading={lineItemsLoading} lineItems={lineItems}
            budgetCodes={budgetCodes} sovDraftBudgetCodeIds={sov.sovDraftBudgetCodeIds} isSovEditing={sov.isSovEditing} isSavingSovChanges={sov.isSavingSovChanges}
            sovDraftItems={sov.sovDraftItems} onStartSovEdit={sov.handleStartSovEdit} onCancelSovEdit={sov.handleCancelSovEdit} onSaveSovEdit={sov.handleSaveSovEdit}
            onAddSovLine={sov.handleAddSovLine} onAddSovGroup={sov.handleAddSovGroup} onUpdateSovLine={sov.handleUpdateSovLine}
            onUpdateSovLineBudgetCode={sov.handleUpdateSovLineBudgetCode} onRemoveSovLine={sov.handleRemoveSovLine} onReorderSovLines={sov.handleReorderSovLines}
            onRequestCreateBudgetCode={handleRequestCreateBudgetCodeForSovLine} onDeleteSovLine={sov.handleDeleteSovLine}
            onImportEstimateToSov={() => setShowEstimateImportModal(true)}
          />
        )}

        {activeTab === "schedule-of-values" && (
          <PrimeContractSovTab
            formatCurrency={formatCurrency}
            lineItemsLoading={lineItemsLoading}
            lineItems={lineItems}
            budgetCodes={budgetCodes}
            sovDraftBudgetCodeIds={sov.sovDraftBudgetCodeIds}
            isSovEditing={sov.isSovEditing}
            isSavingSovChanges={sov.isSavingSovChanges}
            sovDraftItems={sov.sovDraftItems}
            onStartSovEdit={sov.handleStartSovEdit}
            onCancelSovEdit={sov.handleCancelSovEdit}
            onSaveSovEdit={sov.handleSaveSovEdit}
            onAddSovLine={sov.handleAddSovLine}
            onAddSovGroup={sov.handleAddSovGroup}
            onUpdateSovLine={sov.handleUpdateSovLine}
            onUpdateSovLineBudgetCode={sov.handleUpdateSovLineBudgetCode}
            onRemoveSovLine={sov.handleRemoveSovLine}
            onReorderSovLines={sov.handleReorderSovLines}
            onRequestCreateBudgetCode={handleRequestCreateBudgetCodeForSovLine}
            onDeleteSovLine={sov.handleDeleteSovLine}
            onImportEstimateToSov={() => setShowEstimateImportModal(true)}
            invoicedAmount={contract.invoiced_amount}
          />
        )}

        {activeTab === "change-orders" && (
          <ContentSectionStack>
            <PrimeContractChangeOrdersTab
              projectId={projectId} contractId={contractId} changeOrders={changeOrders}
              setChangeOrders={setChangeOrders} formatCurrency={formatCurrency}
              onStartEditCo={handleStartEditCo}
              onSetDeletingCo={setDeletingCo} onSetRejectingCoId={setRejectingCoId} onShowRejectCoDialog={() => setShowRejectCoDialog(true)}
            />
            <PrimeContractPcosSection
              projectId={projectId}
              contractId={contractId}
              formatCurrency={formatCurrency}
            />
            <PrimeContractChangeEventsTab
              projectId={projectId}
              contractId={contractId}
              formatCurrency={formatCurrency}
            />
          </ContentSectionStack>
        )}

        {activeTab === "invoices" && (
          <PrimeContractInvoicesTab
            projectId={projectId} contractId={contractId} contract={contract} paymentApplications={paymentApplications}
            ownerInvoices={ownerInvoices} paymentsLoading={paymentsLoading} ownerInvoicesLoading={ownerInvoicesLoading}
            onDeleteInvoice={handleDeleteInvoice} formatCurrency={formatCurrency}
          />
        )}

        {activeTab === "payments" && (
          <PrimeContractPaymentsTab
            projectId={projectId} contractId={contractId} payments={payments} paymentsReceivedLoading={paymentsReceivedLoading}
            setPayments={setPayments} setContract={setContract} formatCurrency={formatCurrency}
          />
        )}

        {activeTab === "related-items" && (
          <RelatedItemsTab
            commitmentId={contractId}
            projectId={Number(projectId)}
            commitmentType="subcontract"
            apiBasePath={`/api/projects/${projectId}/contracts/${contractId}/related-items`}
            entityLabel="prime contract"
          />
        )}

        {activeTab === "emails" && (
          <EmailsClient projectId={Number(projectId)} embedded />
        )}

        {activeTab === "history" && (
          <div>
            <SectionRuleHeading label="Change History" />
            {historyEntries.length === 0 ? (
              <EmptyState
                icon={<History />}
                title="No changes recorded"
                description="No lifecycle events are available for this contract yet."
              />
            ) : (
              // @ui-exception prime-contract-history-timeline
              // Intentional deviation: no shared timeline/list primitive currently supports the
              // contract history row layout (label + timestamp + details), so this local shell
              // remains until a reusable history component is extracted.
              <div className="divide-y divide-border rounded-md border border-border">
                {historyEntries.map((entry) => (
                  <div key={entry.id} className="space-y-1 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">{entry.label}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(entry.at)}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{entry.details}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "financial-markup" && (
          <PrimeContractFinancialMarkupTab
            projectId={projectId} budgetCodes={budgetCodes} verticalMarkups={verticalMarkups}
            setVerticalMarkups={setVerticalMarkups} savedVerticalMarkups={savedVerticalMarkups}
            setSavedVerticalMarkups={setSavedVerticalMarkups} markupsLoading={markupsLoading}
          />
        )}

        {activeTab === "advanced-settings" && (
          <PrimeContractAdvancedSettingsTab
            projectId={projectId} contractId={contractId} advancedSettings={advancedSettings}
            setAdvancedSettings={setAdvancedSettings} advancedSettingsLoading={advancedSettingsLoading}
            advancedSettingsSaving={advancedSettingsSaving} setAdvancedSettingsSaving={setAdvancedSettingsSaving}
            contractAdvancedDraft={contractAdvancedDraft} setContract={setContract}
            changeOrderCount={changeOrders.length}
          />
        )}
      </ContentSectionStack>

      <PrimeContractDialogs
        showAddLineItemDialog={showAddLineItemDialog} setShowAddLineItemDialog={setShowAddLineItemDialog}
        lineItemForm={lineItemForm} setLineItemForm={setLineItemForm} budgetCodes={budgetCodes} budgetCodesLoading={budgetCodesLoading}
        setShowCreateBudgetCodeModal={setShowCreateBudgetCodeModal} onRequestCreateBudgetCode={handleRequestCreateBudgetCodeForLineItemForm}
        showCreateBudgetCodeModal={showCreateBudgetCodeModal} projectId={projectId} handleBudgetCodeCreated={handleBudgetCodeCreated}
        isSubmittingLineItem={isSubmittingLineItem} handleAddLineItem={handleAddLineItem} formatCurrency={formatCurrency}
        showNewCoDialog={showNewCoDialog} setShowNewCoDialog={setShowNewCoDialog} coForm={coForm} setCoForm={setCoForm}
        isSubmittingCo={isSubmittingCo} handleCreateCo={handleCreateCo} showRejectCoDialog={showRejectCoDialog}
        setShowRejectCoDialog={setShowRejectCoDialog} setRejectingCoId={setRejectingCoId} rejectionReason={rejectionReason}
        setRejectionReason={setRejectionReason} isRejectingCo={isRejectingCo} handleRejectCo={handleRejectCo}
        lineItemToDelete={lineItemToDelete} setLineItemToDelete={setLineItemToDelete} isDeletingLineItem={isDeletingLineItem}
        handleDeleteLineItem={handleDeleteLineItem} editingCo={editingCo} setEditingCo={setEditingCo} editCoForm={editCoForm}
        setEditCoForm={setEditCoForm} isUpdatingCo={isUpdatingCo} handleUpdateCo={handleUpdateCo} deletingCo={deletingCo}
        setDeletingCo={setDeletingCo} isDeletingCo={isDeletingCo} handleDeleteCo={handleDeleteCo}
      />

      {contract ? (
        <DocumentDeliveryDialog
          open={isDocumentDialogOpen} onOpenChange={setIsDocumentDialogOpen} initialTab={documentDialogTab}
          recordType="prime-contract" recordId={contract.id} number={contract.contract_number || "Prime Contract"} title={contract.title}
        />
      ) : null}
      <PrimeContractEstimateImportModal
        open={showEstimateImportModal}
        onOpenChange={setShowEstimateImportModal}
        projectId={projectId}
        contractId={contractId}
        budgetCodes={budgetCodes}
        existingLineItems={lineItems}
        onImported={(items) => setLineItems((prev) => [...prev, ...items])}
      />
      <SyncFromEstimateModal
        open={isSyncFromEstimateOpen}
        onOpenChange={setIsSyncFromEstimateOpen}
        projectId={projectId}
        contractId={contractId}
        onSuccess={() => {
          // Refetch contract + SOV by triggering query invalidation; the page also
          // self-fetches on mount, so a hard refetch is sufficient for the SOV tab.
          queryClient.invalidateQueries({ queryKey: ["prime-contract", contractId] });
          router.refresh();
        }}
      />
      {ConfirmDialog}
    </PageShell>
  );
  // #endregion
}
// #endregion
