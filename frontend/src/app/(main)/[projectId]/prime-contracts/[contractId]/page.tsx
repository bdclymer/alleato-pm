"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  Download,
  DollarSign,
  FileText,
  History,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  Upload,
} from "lucide-react";

import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { PageShell } from "@/components/layout";
import { DocumentDeliveryDialog } from "@/components/documents/DocumentDeliveryDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ds";
import { PageTabs } from "@/components/layout/PageTabs";
import { useProjectTitle } from "@/hooks/useProjectTitle";
import {
  usePaymentApplications,
  useCreatePaymentApplication,
  useDeletePaymentApplication,
  paymentApplicationKeys,
} from "@/hooks/use-payment-applications";

import { PrimeContractOverviewTab } from "./components/PrimeContractOverviewTab";
import { PrimeContractDialogs } from "./components/PrimeContractDialogs";
import { ContractForm } from "@/components/domain/contracts";
import {
  PrimeContractChangeOrdersTab,
  PrimeContractInvoicesTab,
  PrimeContractPaymentsTab,
  PrimeContractFinancialMarkupTab,
  PrimeContractAdvancedSettingsTab,
  useSovEditing,
} from "@/components/domain/contracts/prime-contract-detail";

import type { ContractFormData } from "@/components/domain/contracts/ContractForm";
import type {
  BudgetCode,
  ChangeOrderFormState,
  Contract,
  ContractAttachment,
  ContractLineItem,
  ContractTab,
  LineItemFormState,
  Payment,
  PaymentApplication,
  PrimeContractCO,
  VerticalMarkup,
} from "./types";

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

// ─── Helpers ────────────────────────────────────────────────────────────────

const normalizeVerticalMarkupRows = (rows: VerticalMarkup[]): VerticalMarkup[] =>
  rows.map((row) => ({
    ...row,
    markup_type: row.markup_type ?? "",
    percentage: Number.isFinite(Number(row.percentage)) ? Number(row.percentage) : 0,
    compound: Boolean(row.compound),
    calculation_order: Number.isFinite(Number(row.calculation_order)) ? Number(row.calculation_order) : 0,
  }));

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
};

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return "Not set";
  return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

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
  if (!normalized) return { text: "Not set", isMissing: true };
  return { text: normalized, isMissing: false };
};

const formatStatusLabel = (status: Contract["status"]) => {
  switch (status) {
    case "out_for_bid": return "Out for Bid";
    case "out_for_signature": return "Out for Signature";
    default: return status.charAt(0).toUpperCase() + status.slice(1);
  }
};

// ─── Page Component ─────────────────────────────────────────────────────────

export default function ProjectContractDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const projectId = params.projectId as string;
  const contractId = params.contractId as string;

  useProjectTitle("Prime Contract");

  // ── Core state ──────────────────────────────────────────────────────────
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ContractTab>("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // ── Line items & budget codes (shared by overview tab + edit mode) ──────
  const [lineItems, setLineItems] = useState<ContractLineItem[]>([]);
  const [lineItemsLoading, setLineItemsLoading] = useState(false);
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
  const [showCreateBudgetCodeModal, setShowCreateBudgetCodeModal] = useState(false);
  const [budgetCodeCreateTarget, setBudgetCodeCreateTarget] = useState<BudgetCodeCreateTarget | null>(null);

  // ── Change orders ───────────────────────────────────────────────────────
  const [changeOrders, setChangeOrders] = useState<PrimeContractCO[]>([]);
  const [changeOrdersLoading, setChangeOrdersLoading] = useState(false);
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
  const createPaymentApp = useCreatePaymentApplication(Number(projectId), contractId);
  const deletePaymentApp = useDeletePaymentApplication(Number(projectId), contractId);
  const queryClient = useQueryClient();
  const [billingPeriods, setBillingPeriods] = useState<Array<{ id: string; start_date: string; end_date: string; name: string | null; period_number: number }>>([]);

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

  // ── Attachments ─────────────────────────────────────────────────────────
  const [attachments, setAttachments] = useState<ContractAttachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);

  // ── Document / sync dialogs ─────────────────────────────────────────────
  const [isDocumentDialogOpen, setIsDocumentDialogOpen] = useState(false);
  const [documentDialogTab, setDocumentDialogTab] = useState<"download" | "email">("download");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════
  // Data Fetching
  // ═══════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const fetchContract = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/projects/${projectId}/contracts/${contractId}`);
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
    if (!contract) return;
    const fetchLineItems = async () => {
      try {
        setLineItemsLoading(true);
        const response = await fetch(`/api/projects/${projectId}/contracts/${contractId}/line-items`);
        if (response.ok) setLineItems((await response.json()) || []);
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setLineItemsLoading(false);
      }
    };
    fetchLineItems();
  }, [contract, contractId, projectId]);

  useEffect(() => {
    if (!projectId) return;
    const fetchBudgetCodes = async () => {
      try {
        setBudgetCodesLoading(true);
        const response = await fetch(`/api/projects/${projectId}/budget-codes`);
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
        setChangeOrdersLoading(true);
        const [ccoResponse, pccoResponse] = await Promise.all([
          fetch(`/api/projects/${projectId}/contracts/${contractId}/change-orders`),
          fetch(`/api/projects/${projectId}/prime-contract-change-orders`),
        ]);
        const ccos: PrimeContractCO[] = ccoResponse.ok ? await ccoResponse.json() : [];
        const pccoRaw = pccoResponse.ok ? await pccoResponse.json() : [];
        const pccos: PrimeContractCO[] = (pccoRaw || [])
          .filter((p: { id: number; contract_id: number | null }) => String(p.contract_id) === String(contractId))
          .map((p: { id: number; contract_id: number | null; pcco_number: string | null; title: string | null; total_amount: number | null; status: string | null; submitted_at: string | null; approved_at: string | null; created_at: string | null }) => ({
            id: String(p.id),
            contract_id: String(p.contract_id ?? contractId),
            change_order_number: p.pcco_number || "",
            description: p.title || "",
            amount: p.total_amount ?? 0,
            status: (p.status || "proposed").toLowerCase(),
            requested_by: null,
            requested_date: p.submitted_at || p.created_at || "",
            approved_by: null,
            approved_date: p.approved_at || null,
            rejection_reason: null,
            created_at: p.created_at || "",
            updated_at: p.created_at || "",
          }));
        setChangeOrders([...ccos, ...pccos]);
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setChangeOrdersLoading(false);
      }
    };
    fetchChangeOrders();
  }, [contract, contractId, projectId]);

  useEffect(() => {
    if (activeTab === "invoices") {
      fetch(`/api/projects/${projectId}/billing-periods`)
        .then((r) => r.json())
        .then((data) => setBillingPeriods(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
  }, [activeTab, projectId]);

  useEffect(() => {
    if (activeTab !== "payments" || !contract) return;
    const fetchPayments = async () => {
      try {
        setPaymentsReceivedLoading(true);
        const response = await fetch(`/api/projects/${projectId}/contracts/${contractId}/payments`);
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
    if (!contract) return;
    const fetchVerticalMarkups = async () => {
      try {
        setMarkupsLoading(true);
        const response = await fetch(`/api/projects/${projectId}/vertical-markup`);
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
        const response = await fetch(`/api/projects/${projectId}/contracts/settings`);
        if (!response.ok) throw new Error("Failed to fetch advanced settings");
        setAdvancedSettings(await response.json());
      } catch {
        toast.error("Failed to load advanced settings");
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

  useEffect(() => {
    if (!contract) return;
    const fetchAttachments = async () => {
      try {
        setAttachmentsLoading(true);
        const response = await fetch(`/api/projects/${projectId}/contracts/${contractId}/attachments`);
        if (response.ok) { const data = await response.json(); setAttachments(data.data || []); }
      } catch { /* swallowed */ } finally { setAttachmentsLoading(false); }
    };
    fetchAttachments();
  }, [contract, contractId, projectId]);

  // ═══════════════════════════════════════════════════════════════════════
  // Computed values
  // ═══════════════════════════════════════════════════════════════════════

  const inclusionsList = useMemo(() => parseBulletList(contract?.inclusions), [contract?.inclusions]);
  const exclusionsList = useMemo(() => parseBulletList(contract?.exclusions), [contract?.exclusions]);
  const existingCostCodeByLineId = useMemo(
    () => new Map(lineItems.map((item) => [item.id, item.cost_code_id ?? null])),
    [lineItems],
  );

  // ═══════════════════════════════════════════════════════════════════════
  // Handlers
  // ═══════════════════════════════════════════════════════════════════════

  const handleBack = () => router.push(`/${projectId}/prime-contracts`);

  // ── Invoice CRUD ────────────────────────────────────────────────────────

  const handleCreateInvoiceSubmit = async (data: {
    application_number: string;
    billing_period_id?: string;
    period_from?: string;
    period_to?: string;
    billing_date?: string;
    status: string;
    notes?: string;
    amount: number;
    retention_amount: number;
  }) => {
    await createPaymentApp.mutateAsync(data as Partial<PaymentApplication>);
    toast.success("Invoice created successfully");
  };

  const handleDeleteInvoice = async (applicationId: string) => {
    if (!confirm("Delete this invoice? This cannot be undone.")) return;
    await deletePaymentApp.mutateAsync(applicationId);
  };

  // ── ERP Sync / Export ───────────────────────────────────────────────────

  const handleErpSync = async () => {
    setIsSyncing(true);
    try {
      const [invResp, payResp] = await Promise.all([
        fetch("/api/sync/acumatica/ar-invoices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: Number(projectId) }) }),
        fetch("/api/sync/acumatica/ar-payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: Number(projectId) }) }),
      ]);
      const invData = await invResp.json();
      const payData = await payResp.json();
      if (!invResp.ok) throw new Error(invData.error ?? "Invoice sync failed");
      if (!payResp.ok) throw new Error(payData.error ?? "Payment sync failed");
      const inv = invData.result;
      const pay = payData.result;
      toast.success(`ERP sync complete: ${inv.created + pay.created} created, ${inv.updated + pay.updated} updated${inv.errors.length + pay.errors.length > 0 ? ` (${inv.errors.length + pay.errors.length} errors)` : ""}`);
      queryClient.invalidateQueries({ queryKey: paymentApplicationKeys.list(Number(projectId), contractId) });
      const payListResp = await fetch(`/api/projects/${projectId}/contracts/${contractId}/payments`);
      if (payListResp.ok) setPayments((await payListResp.json()) || []);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ERP sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleErpExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/sync/acumatica/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: Number(projectId), contractId, entities: ["paymentApplications", "invoices"] }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Acumatica export failed");
      const paResult = body.results?.paymentApplications as { created?: number; updated?: number; skipped?: number; errors?: string[] } | undefined;
      const invResult = body.results?.invoices as { created?: number; updated?: number; skipped?: number; errors?: string[] } | undefined;
      const totalCreated = (paResult?.created ?? 0) + (invResult?.created ?? 0);
      const totalUpdated = (paResult?.updated ?? 0) + (invResult?.updated ?? 0);
      const totalSkipped = (paResult?.skipped ?? 0) + (invResult?.skipped ?? 0);
      const errors = [...(paResult?.errors ?? []), ...(invResult?.errors ?? [])];
      toast.success(`ERP export complete: ${totalCreated} created, ${totalUpdated} updated, ${totalSkipped} skipped${errors.length > 0 ? ` (${errors.length} errors)` : ""}`);
      if (errors.length > 0) toast.error(errors.slice(0, 2).join(" | "));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ERP export failed");
    } finally {
      setIsExporting(false);
    }
  };

  // ── Attachments ─────────────────────────────────────────────────────────

  const handleUploadAttachment = async (file: File) => {
    setIsUploadingAttachment(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`/api/projects/${projectId}/contracts/${contractId}/attachments`, { method: "POST", body: formData });
      if (!response.ok) { const err = await response.json().catch(() => ({})); toast.error(err.error || "Failed to upload attachment"); return; }
      const newAttachment = await response.json();
      setAttachments((prev) => [{ id: newAttachment.id, fileName: newAttachment.fileName, url: newAttachment.url ?? null, downloadUrl: newAttachment.downloadUrl, uploadedBy: newAttachment.uploadedBy, uploadedAt: newAttachment.uploadedAt }, ...prev]);
      toast.success(`"${file.name}" uploaded successfully`);
    } catch { toast.error("Failed to upload attachment"); } finally { setIsUploadingAttachment(false); }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/contracts/${contractId}/attachments/${attachmentId}`, { method: "DELETE" });
      if (!response.ok) { const err = await response.json().catch(() => ({})); toast.error(err.error || "Failed to delete attachment"); return; }
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      toast.success("Attachment deleted");
    } catch { toast.error("Failed to delete attachment"); }
  };

  // ── Change Order CRUD (for dialogs) ─────────────────────────────────────

  const handleCreateCo = async () => {
    if (!coForm.change_order_number || !coForm.description || !coForm.amount) { toast.error("CO number, description, and amount are required"); return; }
    setIsSubmittingCo(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/contracts/${contractId}/change-orders`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contract_id: contractId, change_order_number: coForm.change_order_number, description: coForm.description, amount: parseFloat(coForm.amount), status: coForm.status }),
      });
      if (!response.ok) { const err = await response.json().catch(() => ({})); toast.error(err.error || "Failed to create change order"); return; }
      const newCo = await response.json();
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
      const response = await fetch(`/api/projects/${projectId}/contracts/${contractId}/change-orders/${editingCo.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ change_order_number: editCoForm.change_order_number, description: editCoForm.description, amount: parseFloat(editCoForm.amount) }),
      });
      if (!response.ok) { const err = await response.json().catch(() => ({})); toast.error(err.error || "Failed to update change order"); return; }
      const updated = await response.json();
      setChangeOrders((prev) => prev.map((co) => (co.id === editingCo.id ? { ...co, ...updated } : co)));
      setEditingCo(null);
      toast.success("Change order updated");
    } catch { toast.error("Failed to update change order"); } finally { setIsUpdatingCo(false); }
  };

  const handleDeleteCo = async () => {
    if (!deletingCo) return;
    setIsDeletingCo(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/contracts/${contractId}/change-orders/${deletingCo.id}`, { method: "DELETE" });
      if (!response.ok) { const err = await response.json().catch(() => ({})); toast.error(err.error || "Failed to delete change order"); return; }
      setChangeOrders((prev) => prev.filter((co) => co.id !== deletingCo.id));
      setDeletingCo(null);
      toast.success("Change order deleted");
    } catch { toast.error("Failed to delete change order"); } finally { setIsDeletingCo(false); }
  };

  const handleRejectCo = async () => {
    if (!rejectingCoId || !rejectionReason.trim()) { toast.error("Rejection reason is required"); return; }
    setIsRejectingCo(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/contracts/${contractId}/change-orders/${rejectingCoId}/reject`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rejection_reason: rejectionReason }),
      });
      if (!response.ok) { const err = await response.json().catch(() => ({})); toast.error(err.error || "Failed to reject change order"); return; }
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
      const response = await fetch(`/api/projects/${projectId}/budget-codes`);
      if (!response.ok) return;
      const { budgetCodes: codes } = (await response.json()) as { budgetCodes: BudgetCode[] };
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
      const response = await fetch(`/api/projects/${projectId}/contracts/${contractId}/line-items`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ line_number: parseInt(lineItemForm.lineNumber, 10), description: lineItemForm.description, quantity: parseFloat(lineItemForm.quantity) || 0, unit_cost: parseFloat(lineItemForm.unitCost) || 0, unit_of_measure: lineItemForm.unitOfMeasure || null, cost_code_id: costCodeId, budget_code_id: selectedBudgetCode.id }),
      });
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || "Failed to create line item"); }
      const lineItemsResponse = await fetch(`/api/projects/${projectId}/contracts/${contractId}/line-items`);
      if (lineItemsResponse.ok) setLineItems((await lineItemsResponse.json()) || []);
      setLineItemForm({ lineNumber: "", description: "", quantity: "1", unitCost: "0", unitOfMeasure: "", budgetCodeId: "" });
      setShowAddLineItemDialog(false);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to create line item"); } finally { setIsSubmittingLineItem(false); }
  };

  const handleDeleteLineItem = async () => {
    if (!lineItemToDelete) return;
    setIsDeletingLineItem(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/contracts/${contractId}/line-items/${lineItemToDelete.id}`, { method: "DELETE" });
      if (!response.ok) { const data = await response.json().catch(() => ({})); toast.error(data.error || "Failed to delete line item"); return; }
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
      const response = await fetch(`/api/projects/${projectId}/contracts/${contractId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contract_number: data.number, title: data.title, client_id: data.ownerCompanyId || null, contractor_id: data.contractorId || null, architect_engineer_id: data.architectEngineerId || null,
          contract_company_id: data.ownerCompanyId || data.contractCompanyId || null, description: data.description, status: data.status || "draft", executed: data.executed || false, original_contract_value: sovTotal,
          start_date: data.startDate?.toISOString().split("T")[0] || null, end_date: data.estimatedCompletionDate?.toISOString().split("T")[0] || null,
          substantial_completion_date: data.substantialCompletionDate?.toISOString().split("T")[0] || null, actual_completion_date: data.actualCompletionDate?.toISOString().split("T")[0] || null,
          signed_contract_received_date: data.signedContractReceivedDate?.toISOString().split("T")[0] || null, contract_termination_date: data.contractTerminationDate?.toISOString().split("T")[0] || null,
          retention_percentage: data.defaultRetainage || 0, payment_terms: data.paymentTerms || null, billing_schedule: data.billingSchedule || null,
          is_private: data.isPrivate || false, inclusions: data.inclusions || null, exclusions: data.exclusions || null,
        }),
      });
      if (!response.ok) { const errorData = await response.json().catch(() => ({})); if (errorData.details?.length > 0) { throw new Error(`Validation failed — ${errorData.details.map((d: { field: string; message: string }) => `${d.field}: ${d.message}`).join("; ")}`); } throw new Error(errorData.error || "Failed to update contract"); }
      const budgetCodesResponse = await fetch(`/api/projects/${projectId}/budget-codes`, { credentials: "include" });
      const budgetCodesPayload = budgetCodesResponse.ok ? await budgetCodesResponse.json().catch(() => ({ budgetCodes: [] })) : { budgetCodes: [] };
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
      const formatSovError = (errorData: { error?: string; details?: string | Array<{ field: string; message: string }> }): string => {
        const base = errorData.error || "an unexpected error occurred";
        if (!errorData.details) return base;
        const detail = typeof errorData.details === "string" ? errorData.details : Array.isArray(errorData.details) ? errorData.details.map((d) => `${d.field}: ${d.message}`).join("; ") : "";
        return detail ? `${base} — ${detail}` : base;
      };
      const [updateResults, deleteResponses] = await Promise.all([
        Promise.all(updates.map(async (item) => { const res = await fetch(`/api/projects/${projectId}/contracts/${contractId}/line-items/${item.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ line_number: item.line_number, description: item.description, cost_code_id: item.cost_code_id, budget_code_id: item.budget_code_id, quantity: item.quantity, unit_cost: item.unit_cost, unit_of_measure: item.unit_of_measure }) }); return { item, res }; })),
        Promise.all(deletions.map((lineItemId) => fetch(`/api/projects/${projectId}/contracts/${contractId}/line-items/${lineItemId}`, { method: "DELETE" }))),
      ]);
      const failedUpdate = updateResults.find((r) => !r.res.ok);
      if (failedUpdate) { const errorData = await failedUpdate.res.json().catch(() => ({})); throw new Error(`Could not save "${failedUpdate.item.description || `Line ${failedUpdate.item.line_number}`}": ${formatSovError(errorData)}`); }
      const failedDelete = deleteResponses.find((res) => !res.ok);
      if (failedDelete) { const errorData = await failedDelete.json().catch(() => ({})); throw new Error(`Could not remove line item: ${formatSovError(errorData)}`); }
      for (const item of creates) {
        const createRes = await fetch(`/api/projects/${projectId}/contracts/${contractId}/line-items`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ line_number: item.line_number, description: item.description, cost_code_id: item.cost_code_id, budget_code_id: item.budget_code_id, quantity: item.quantity, unit_cost: item.unit_cost, unit_of_measure: item.unit_of_measure }) });
        if (!createRes.ok) { const errorData = await createRes.json().catch(() => ({})); throw new Error(`Could not add "${item.description || `Line ${item.line_number}`}": ${formatSovError(errorData)}`); }
      }
      toast.success("Contract updated successfully");
      setIsEditing(false);
      router.refresh();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to update contract"); } finally { setIsSavingEdit(false); }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <PageShell variant="detail" title="Prime Contract" description="Loading contract details...">
        <Skeleton className="h-96" />
      </PageShell>
    );
  }

  if (error || !contract) {
    return (
      <PageShell variant="detail" title="Prime Contract" description="Unable to load contract" onBack={handleBack}>
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
      isPrivate: contract.is_private, inclusions: contract.inclusions || "", exclusions: contract.exclusions || "", sovItems,
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
      variant="detailWide"
      title={`${contract.title} - #${contract.contract_number || contract.id.slice(0, 8)}`}
      description={contract.contractor ? `Contractor: ${contract.contractor.name}` : contract.vendor ? `Contractor: ${contract.vendor.name}` : "No contractor assigned"}
      onBack={() => router.back()}
      actions={
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" size="sm"><Plus />Create<ChevronDown /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/${projectId}/change-events/new?contractId=${contractId}`)}><FileText className="h-4 w-4 mr-2" />Change Event</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/${projectId}/change-orders/prime/new?contractId=${contractId}`)}><DollarSign className="h-4 w-4 mr-2" />Change Order</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/${projectId}/commitments/new?type=purchase_order&contractId=${contractId}`)}><FileText className="h-4 w-4 mr-2" />Purchase Order</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/${projectId}/commitments/new?type=subcontract&contractId=${contractId}`)}><FileText className="h-4 w-4 mr-2" />Subcontract</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="icon" disabled={isSyncing} onClick={handleErpSync} aria-label="Sync from Acumatica" title="Sync invoices & payments from Acumatica"><RefreshCw className={isSyncing ? "animate-spin" : undefined} /></Button>
          <Button variant="outline" size="icon" disabled={isExporting} onClick={handleErpExport} aria-label="Export to Acumatica" title="Export invoices & payment applications to Acumatica"><Upload className={isExporting ? "animate-pulse" : undefined} /></Button>
          <Button variant="outline" size="icon" onClick={() => { setDocumentDialogTab("email"); setIsDocumentDialogOpen(true); }} aria-label="Email" title="Email"><Mail /></Button>
          <Button variant="outline" size="icon" onClick={() => { setDocumentDialogTab("download"); setIsDocumentDialogOpen(true); }} aria-label="Export" title="Export"><Download /></Button>
          <Button variant="default" size="icon" onClick={() => setIsEditing(true)} aria-label="Edit Contract" title="Edit Contract"><Pencil /></Button>
        </div>
      }
    >
      <PageTabs
        variant="inline"
        className="border-b border-border"
        tabs={[
          { label: "General", href: "overview", isActive: activeTab === "overview" },
          { label: "Change Orders", href: "change-orders", isActive: activeTab === "change-orders", count: changeOrders.length || undefined },
          { label: "Invoices", href: "invoices", isActive: activeTab === "invoices", count: paymentApplications.length || undefined },
          { label: "Payments Received", href: "payments", isActive: activeTab === "payments", count: payments.length || undefined },
          { label: "Emails", href: "emails", isActive: activeTab === "emails" },
          { label: "Change History", href: "history", isActive: activeTab === "history" },
          { label: "Financial Markup", href: "financial-markup", isActive: activeTab === "financial-markup" },
          { label: "Advanced Settings", href: "advanced-settings", isActive: activeTab === "advanced-settings" },
        ]}
        onTabClick={(href) => setActiveTab(href as ContractTab)}
      />

      <div className="pt-6">
        {activeTab === "overview" && (
          <PrimeContractOverviewTab
            contract={contract} changeOrders={changeOrders} attachments={attachments} attachmentsLoading={attachmentsLoading}
            isUploadingAttachment={isUploadingAttachment} handleUploadAttachment={handleUploadAttachment} handleDeleteAttachment={handleDeleteAttachment}
            formatDate={formatDate} getTextValue={getTextValue} inclusionsList={inclusionsList} exclusionsList={exclusionsList}
            formatStatusLabel={formatStatusLabel} formatCurrency={formatCurrency} lineItemsLoading={lineItemsLoading} lineItems={lineItems}
            budgetCodes={budgetCodes} sovDraftBudgetCodeIds={sov.sovDraftBudgetCodeIds} isSovEditing={sov.isSovEditing} isSavingSovChanges={sov.isSavingSovChanges}
            sovDraftItems={sov.sovDraftItems} onStartSovEdit={sov.handleStartSovEdit} onCancelSovEdit={sov.handleCancelSovEdit} onSaveSovEdit={sov.handleSaveSovEdit}
            onAddSovLine={sov.handleAddSovLine} onAddSovGroup={sov.handleAddSovGroup} onUpdateSovLine={sov.handleUpdateSovLine}
            onUpdateSovLineBudgetCode={sov.handleUpdateSovLineBudgetCode} onRemoveSovLine={sov.handleRemoveSovLine} onReorderSovLines={sov.handleReorderSovLines}
            onRequestCreateBudgetCode={handleRequestCreateBudgetCodeForSovLine} onDeleteSovLine={sov.handleDeleteSovLine}
          />
        )}

        {activeTab === "change-orders" && (
          <PrimeContractChangeOrdersTab
            projectId={projectId} contractId={contractId} changeOrders={changeOrders} changeOrdersLoading={changeOrdersLoading}
            setChangeOrders={setChangeOrders} formatCurrency={formatCurrency}
            onShowNewCoDialog={() => setShowNewCoDialog(true)} onStartEditCo={handleStartEditCo}
            onSetDeletingCo={setDeletingCo} onSetRejectingCoId={setRejectingCoId} onShowRejectCoDialog={() => setShowRejectCoDialog(true)}
          />
        )}

        {activeTab === "invoices" && (
          <PrimeContractInvoicesTab
            projectId={projectId} contractId={contractId} contract={contract} paymentApplications={paymentApplications}
            paymentsLoading={paymentsLoading} billingPeriods={billingPeriods} onCreateInvoice={handleCreateInvoiceSubmit}
            onDeleteInvoice={handleDeleteInvoice} formatCurrency={formatCurrency}
          />
        )}

        {activeTab === "payments" && (
          <PrimeContractPaymentsTab
            projectId={projectId} contractId={contractId} payments={payments} paymentsReceivedLoading={paymentsReceivedLoading}
            paymentApplications={paymentApplications} setPayments={setPayments} setContract={setContract} formatCurrency={formatCurrency}
          />
        )}

        {activeTab === "emails" && (
          <div>
            <div className="bg-background">
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Emails</h3>
                <p className="text-sm text-muted-foreground">Email correspondence related to this contract</p>
              </div>
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-[var(--group-gap)] opacity-50" />
                <p>Email history will be displayed here</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div>
            <div className="bg-background">
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Change History</h3>
                <p className="text-sm text-muted-foreground">Track all changes made to this contract</p>
              </div>
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-[var(--group-gap)] opacity-50" />
                <p>Change history will be displayed here</p>
              </div>
            </div>
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
          />
        )}
      </div>

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
    </PageShell>
  );
}
