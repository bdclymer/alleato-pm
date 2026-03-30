"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronDown,
  Download,
  DollarSign,
  FileText,
  History,
  Mail,
  Pencil,
  Plus,
  Settings,
  X,
  AlertTriangle,
  RefreshCw,
  Trash2,
} from "lucide-react";

import { arrayMove } from "@dnd-kit/sortable";
import { toast } from "sonner";

import { PageShell } from "@/components/layout";
import { DocumentDeliveryDialog } from "@/components/documents/DocumentDeliveryDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/unified-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useProjectTitle } from "@/hooks/useProjectTitle";
import { PageTabs } from "@/components/layout/PageTabs";
import { PrimeContractOverviewTab } from "./components/PrimeContractOverviewTab";
import { PrimeContractDialogs } from "./components/PrimeContractDialogs";
import { ContractForm } from "@/components/domain/contracts";
import type { ContractFormData } from "@/components/domain/contracts/ContractForm";
import type {
  BudgetCode,
  ChangeOrderFormState,
  Contract,
  ContractAttachment,
  ContractLineItem,
  ContractTab,
  InvoiceFormState,
  LineItemFormState,
  Payment,
  PaymentApplication,
  PaymentFormState,
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
  show_markup_on_co_pdf: boolean;
  show_markup_on_invoice_pdf: boolean;
  default_distribution_prime_contract: string | null;
  default_distribution_pcco: string | null;
  default_distribution_pco: string | null;
}

const ALLOWED_MARKUP_TYPES = ["insurance", "bond", "fee", "overhead", "custom"] as const;

const normalizeVerticalMarkupRows = (rows: VerticalMarkup[]): VerticalMarkup[] =>
  rows.map((row) => ({
    ...row,
    markup_type: row.markup_type ?? "",
    percentage: Number.isFinite(Number(row.percentage))
      ? Number(row.percentage)
      : 0,
    compound: Boolean(row.compound),
    calculation_order: Number.isFinite(Number(row.calculation_order))
      ? Number(row.calculation_order)
      : 0,
  }));

const findDuplicateMarkupTypes = (rows: VerticalMarkup[]): string[] => {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    const key = (row.markup_type ?? "").trim().toLowerCase();
    if (!key) return;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([key]) => key);
};

const getNextAvailableMarkupType = (rows: VerticalMarkup[]): string | null => {
  const used = new Set(
    rows.map((row) => (row.markup_type ?? "").trim().toLowerCase()),
  );
  for (const type of ALLOWED_MARKUP_TYPES) {
    if (!used.has(type)) return type;
  }
  return null;
};

export default function ProjectContractDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const projectId = params.projectId as string;
  const contractId = params.contractId as string;

  useProjectTitle("Prime Contract");

  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lineItems, setLineItems] = useState<ContractLineItem[]>([]);
  const [lineItemsLoading, setLineItemsLoading] = useState(false);
  const [changeOrders, setChangeOrders] = useState<PrimeContractCO[]>([]);
  const [changeOrdersLoading, setChangeOrdersLoading] = useState(false);
  // Invoice / Payment state
  const [paymentApplications, setPaymentApplications] = useState<PaymentApplication[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsReceivedLoading, setPaymentsReceivedLoading] = useState(false);
  const [showAddInvoiceDialog, setShowAddInvoiceDialog] = useState(false);
  const [showAddPaymentDialog, setShowAddPaymentDialog] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState<InvoiceFormState>({
    application_number: "",
    amount: "",
    retention_amount: "",
    period_from: "",
    period_to: "",
    notes: "",
  });
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>({
    amount: "",
    payment_date: "",
    payment_application_id: "",
    payment_number: "",
    method: "",
    reference_number: "",
    notes: "",
  });
  const [isSubmittingInvoice, setIsSubmittingInvoice] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [verticalMarkups, setVerticalMarkups] = useState<VerticalMarkup[]>([]);
  const [savedVerticalMarkups, setSavedVerticalMarkups] = useState<VerticalMarkup[]>([]);
  const [markupsLoading, setMarkupsLoading] = useState(false);
  const [isSavingMarkupTable, setIsSavingMarkupTable] = useState(false);
  const [markupMapsToById, setMarkupMapsToById] = useState<Record<string, string>>({});
  const [markupDisplayById, setMarkupDisplayById] = useState<Record<string, "horizontal" | "vertical">>({});
  const [editingMarkupRowIds, setEditingMarkupRowIds] = useState<Record<string, boolean>>({});
  const [markupRowDrafts, setMarkupRowDrafts] = useState<
    Record<
      string,
      {
        markup_type: string;
        percentage: number;
        compound: boolean;
        displayIn: "horizontal" | "vertical";
        mapsTo: string;
      }
    >
  >({});
  const [showAddMarkupDialog, setShowAddMarkupDialog] = useState(false);
  const [editingMarkup, setEditingMarkup] = useState<VerticalMarkup | null>(null);
  const [markupForm, setMarkupForm] = useState({
    markup_type: "",
    percentage: "",
    compound: false,
  });
  const [isSubmittingMarkup, setIsSubmittingMarkup] = useState(false);
  const [deletingMarkupId, setDeletingMarkupId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ContractTab>("overview");
const [isSovEditing, setIsSovEditing] = useState(false);
  const [isSavingSovChanges, setIsSavingSovChanges] = useState(false);
  const [sovDraftItems, setSovDraftItems] = useState<ContractLineItem[]>([]);
  const [sovDraftBudgetCodeIds, setSovDraftBudgetCodeIds] = useState<Record<string, string>>({});
  const [showAddLineItemDialog, setShowAddLineItemDialog] = useState(false);
  const [lineItemForm, setLineItemForm] = useState<LineItemFormState>({
    lineNumber: "",
    description: "",
    quantity: "1",
    unitCost: "0",
    unitOfMeasure: "",
    budgetCodeId: "",
  });
  const [isSubmittingLineItem, setIsSubmittingLineItem] = useState(false);
  const [lineItemToDelete, setLineItemToDelete] = useState<ContractLineItem | null>(null);
  const [isDeletingLineItem, setIsDeletingLineItem] = useState(false);
  const [budgetCodes, setBudgetCodes] = useState<BudgetCode[]>([]);
  const [budgetCodesLoading, setBudgetCodesLoading] = useState(false);
  const [showCreateBudgetCodeModal, setShowCreateBudgetCodeModal] =
    useState(false);
  const [budgetCodeCreateTarget, setBudgetCodeCreateTarget] =
    useState<BudgetCodeCreateTarget | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [advancedSettings, setAdvancedSettings] = useState<PrimeContractSettings | null>(null);
  const [advancedSettingsLoading, setAdvancedSettingsLoading] = useState(false);
  const [advancedSettingsSaving, setAdvancedSettingsSaving] = useState(false);
  const [contractAdvancedDraft, setContractAdvancedDraft] = useState({
    inclusions: "",
    exclusions: "",
    is_private: false,
    payment_terms: "",
    billing_schedule: "",
  });

  // Attachments state
  const [attachments, setAttachments] = useState<ContractAttachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);

  // Change Order create/reject dialog state
  const [showNewCoDialog, setShowNewCoDialog] = useState(false);
  const [coForm, setCoForm] = useState<ChangeOrderFormState>({
    change_order_number: "",
    description: "",
    amount: "",
    status: "pending" as "pending",
  });
  const [isSubmittingCo, setIsSubmittingCo] = useState(false);
  const [showRejectCoDialog, setShowRejectCoDialog] = useState(false);
  const [rejectingCoId, setRejectingCoId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejectingCo, setIsRejectingCo] = useState(false);
  const [isDocumentDialogOpen, setIsDocumentDialogOpen] = useState(false);
  const [documentDialogTab, setDocumentDialogTab] = useState<"download" | "email">(
    "download",
  );
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const fetchContract = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/projects/${projectId}/contracts/${contractId}`,
        );

        if (!response.ok) {
          if (response.status === 404) {
            setError("Contract not found");
          } else {
            setError("Failed to load contract");
          }
          return;
        }

        const data = await response.json();
        setContract(data);
      } catch (err) {
        setError("Failed to load contract");
      } finally {
        setLoading(false);
      }
    };

    if (contractId && projectId) {
      fetchContract();
    }
  }, [contractId, projectId]);

  useEffect(() => {
    if (searchParams.get("edit") === "1") {
      setIsEditing(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchLineItems = async () => {
      if (!contract) return;

      try {
        setLineItemsLoading(true);
        const response = await fetch(
          `/api/projects/${projectId}/contracts/${contractId}/line-items`,
        );

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        setLineItems(data || []);
      } catch (err) {

        console.error("Failed to load data:", err);

        // Intentionally swallowed: component shows appropriate state on error

      } finally {
        setLineItemsLoading(false);
      }
    };

    fetchLineItems();
  }, [contract, contractId, projectId]);

  useEffect(() => {
    const fetchBudgetCodes = async () => {
      if (!projectId) return;

      try {
        setBudgetCodesLoading(true);
        const response = await fetch(`/api/projects/${projectId}/budget-codes`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData?.error || "Failed to load budget codes");
        }

        const { budgetCodes: codes } = (await response.json()) as {
          budgetCodes: BudgetCode[];
        };

        setBudgetCodes(codes || []);
      } catch (err) {
        setBudgetCodes([]);
      } finally {
        setBudgetCodesLoading(false);
      }
    };

    fetchBudgetCodes();
  }, [projectId]);

  useEffect(() => {
    const fetchChangeOrders = async () => {
      if (!contract) return;

      try {
        setChangeOrdersLoading(true);

        // Fetch both commitment COs (contract_change_orders) and PCCOs
        const [ccoResponse, pccoResponse] = await Promise.all([
          fetch(`/api/projects/${projectId}/contracts/${contractId}/change-orders`),
          fetch(`/api/projects/${projectId}/prime-contract-change-orders`),
        ]);

        const ccos: PrimeContractCO[] = ccoResponse.ok
          ? await ccoResponse.json()
          : [];

        // Normalize PCCOs to fit PrimeContractCO interface — filter to this contract only
        const pccoRaw = pccoResponse.ok ? await pccoResponse.json() : [];
        const pccos: PrimeContractCO[] = (pccoRaw || [])
          .filter((p: { id: number; contract_id: number | null }) =>
            String(p.contract_id) === String(contractId),
          )
          .map(
            (p: {
              id: number;
              contract_id: number | null;
              pcco_number: string | null;
              title: string | null;
              total_amount: number | null;
              status: string | null;
              submitted_at: string | null;
              approved_at: string | null;
              created_at: string | null;
            }) => ({
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
            }),
          );

        setChangeOrders([...ccos, ...pccos]);
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setChangeOrdersLoading(false);
      }
    };

    fetchChangeOrders();
  }, [contract, contractId, projectId]);

  // Fetch payment applications (invoices) when on invoices tab
  useEffect(() => {
    if (activeTab !== "invoices" || !contract) return;
    const fetchPaymentApplications = async () => {
      try {
        setPaymentsLoading(true);
        const response = await fetch(
          `/api/projects/${projectId}/contracts/${contractId}/payment-applications`,
        );
        if (!response.ok) return;
        const data = await response.json();
        setPaymentApplications(data || []);
      } catch (err) {
        console.error("Failed to load payment applications:", err);
      } finally {
        setPaymentsLoading(false);
      }
    };
    fetchPaymentApplications();
  }, [activeTab, contract, contractId, projectId]);

  // Fetch payments received when on payments tab
  useEffect(() => {
    if (activeTab !== "payments" || !contract) return;
    const fetchPayments = async () => {
      try {
        setPaymentsReceivedLoading(true);
        const response = await fetch(
          `/api/projects/${projectId}/contracts/${contractId}/payments`,
        );
        if (!response.ok) return;
        const data = await response.json();
        setPayments(data || []);
      } catch (err) {
        console.error("Failed to load payments:", err);
      } finally {
        setPaymentsReceivedLoading(false);
      }
    };
    fetchPayments();
  }, [activeTab, contract, contractId, projectId]);

  const handleCreateInvoice = async () => {
    if (!invoiceForm.application_number || !invoiceForm.amount) return;
    try {
      setIsSubmittingInvoice(true);
      const response = await fetch(
        `/api/projects/${projectId}/contracts/${contractId}/payment-applications`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            application_number: invoiceForm.application_number,
            amount: parseFloat(invoiceForm.amount),
            retention_amount: invoiceForm.retention_amount
              ? parseFloat(invoiceForm.retention_amount)
              : 0,
            period_from: invoiceForm.period_from || null,
            period_to: invoiceForm.period_to || null,
            notes: invoiceForm.notes || null,
          }),
        },
      );
      if (!response.ok) {
        const err = await response.json();
        toast.error(err.error || "Failed to create invoice");
        return;
      }
      const newApp = await response.json();
      setPaymentApplications((prev) => [...prev, newApp]);
      setShowAddInvoiceDialog(false);
      setInvoiceForm({
        application_number: "",
        amount: "",
        retention_amount: "",
        period_from: "",
        period_to: "",
        notes: "",
      });
      toast.success("Invoice created successfully");
      // Refresh contract to update invoiced_amount
      const contractRes = await fetch(
        `/api/projects/${projectId}/contracts/${contractId}`,
      );
      if (contractRes.ok) setContract(await contractRes.json());
    } catch {
      toast.error("Failed to create invoice");
    } finally {
      setIsSubmittingInvoice(false);
    }
  };

  const handleDeleteInvoice = async (applicationId: string) => {
    if (!confirm("Delete this invoice? This cannot be undone.")) return;
    const response = await fetch(
      `/api/projects/${projectId}/contracts/${contractId}/payment-applications/${applicationId}`,
      { method: "DELETE" },
    );
    if (!response.ok) {
      toast.error("Failed to delete invoice");
      return;
    }
    setPaymentApplications((prev) => prev.filter((a) => a.id !== applicationId));
    toast.success("Invoice deleted");
    const contractRes = await fetch(
      `/api/projects/${projectId}/contracts/${contractId}`,
    );
    if (contractRes.ok) setContract(await contractRes.json());
  };

  const handleCreatePayment = async () => {
    if (!paymentForm.amount || !paymentForm.payment_date) return;
    try {
      setIsSubmittingPayment(true);
      const response = await fetch(
        `/api/projects/${projectId}/contracts/${contractId}/payments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: parseFloat(paymentForm.amount),
            payment_date: paymentForm.payment_date,
            payment_application_id: paymentForm.payment_application_id || null,
            payment_number: paymentForm.payment_number || null,
            method: paymentForm.method || null,
            reference_number: paymentForm.reference_number || null,
            notes: paymentForm.notes || null,
          }),
        },
      );
      if (!response.ok) {
        const err = await response.json();
        toast.error(err.error || "Failed to record payment");
        return;
      }
      const newPayment = await response.json();
      setPayments((prev) => [newPayment, ...prev]);
      setShowAddPaymentDialog(false);
      setPaymentForm({
        amount: "",
        payment_date: "",
        payment_application_id: "",
        payment_number: "",
        method: "",
        reference_number: "",
        notes: "",
      });
      toast.success("Payment recorded successfully");
      const contractRes = await fetch(
        `/api/projects/${projectId}/contracts/${contractId}`,
      );
      if (contractRes.ok) setContract(await contractRes.json());
    } catch {
      toast.error("Failed to record payment");
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm("Delete this payment record? This cannot be undone.")) return;
    const response = await fetch(
      `/api/projects/${projectId}/contracts/${contractId}/payments/${paymentId}`,
      { method: "DELETE" },
    );
    if (!response.ok) {
      toast.error("Failed to delete payment");
      return;
    }
    setPayments((prev) => prev.filter((p) => p.id !== paymentId));
    toast.success("Payment deleted");
    const contractRes = await fetch(
      `/api/projects/${projectId}/contracts/${contractId}`,
    );
    if (contractRes.ok) setContract(await contractRes.json());
  };

  // Fetch vertical markups for this project
  useEffect(() => {
    const fetchVerticalMarkups = async () => {
      if (!contract) return;

      try {
        setMarkupsLoading(true);
        const response = await fetch(
          `/api/projects/${projectId}/vertical-markup`,
        );

        if (!response.ok) {
          // API may not exist yet - that's OK
          return;
        }

        const data = await response.json();
        const fetchedMarkups: VerticalMarkup[] = normalizeVerticalMarkupRows(
          data.markups || [],
        );
        setVerticalMarkups(fetchedMarkups);
        setSavedVerticalMarkups(fetchedMarkups);
      } catch (err) {

        console.error("Failed to load data:", err);

        // Intentionally swallowed: component shows appropriate state on error

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
        if (!response.ok) {
          throw new Error("Failed to fetch advanced settings");
        }
        const data = (await response.json()) as PrimeContractSettings;
        setAdvancedSettings(data);
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

  // Load local "maps to budget code" selections for markup rows.
  useEffect(() => {
    if (!projectId) return;
    const storageKey = `prime-contract-markup-maps:${projectId}`;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, string>;
      if (parsed && typeof parsed === "object") {
        setMarkupMapsToById(parsed);
      }
    } catch {
      // ignore localStorage parse issues
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    const storageKey = `prime-contract-markup-maps:${projectId}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify(markupMapsToById));
    } catch {
      // ignore localStorage write failures
    }
  }, [projectId, markupMapsToById]);

  useEffect(() => {
    if (!projectId) return;
    const storageKey = `prime-contract-markup-display:${projectId}`;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, "horizontal" | "vertical">;
      if (parsed && typeof parsed === "object") {
        setMarkupDisplayById(parsed);
      }
    } catch {
      // ignore localStorage parse issues
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    const storageKey = `prime-contract-markup-display:${projectId}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify(markupDisplayById));
    } catch {
      // ignore localStorage write failures
    }
  }, [projectId, markupDisplayById]);

  // ─── Financial Markup CRUD ─────────────────────────────────────────────

  const resetMarkupForm = () => {
    setMarkupForm({ markup_type: "", percentage: "", compound: false });
    setEditingMarkup(null);
  };

  const openAddMarkupDialog = () => {
    resetMarkupForm();
    setShowAddMarkupDialog(true);
  };

  const openEditMarkupDialog = (markup: VerticalMarkup) => {
    setEditingMarkup(markup);
    setMarkupForm({
      markup_type: markup.markup_type,
      percentage: String(markup.percentage),
      compound: markup.compound,
    });
    setShowAddMarkupDialog(true);
  };

  const handleSubmitMarkup = async () => {
    if (!markupForm.markup_type.trim() || !markupForm.percentage) {
      toast.error("Markup name and percentage are required");
      return;
    }

    const pct = parseFloat(markupForm.percentage);
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      toast.error("Percentage must be between 0 and 100");
      return;
    }

    setIsSubmittingMarkup(true);
    try {
      if (editingMarkup) {
        // Update existing markup via PUT (bulk update with single item)
        const updatedMarkups = verticalMarkups.map((m) =>
          m.id === editingMarkup.id
            ? { ...m, markup_type: markupForm.markup_type.trim(), percentage: pct, compound: markupForm.compound }
            : m,
        );
        const response = await fetch(`/api/projects/${projectId}/vertical-markup`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markups: updatedMarkups }),
        });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "Failed to update markup");
        }
        const data = await response.json();
        const normalized = normalizeVerticalMarkupRows(data.markups || []);
        setVerticalMarkups(normalized);
        setSavedVerticalMarkups(normalized);
        toast.success("Markup updated");
      } else {
        // Create new markup via POST
        const response = await fetch(`/api/projects/${projectId}/vertical-markup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            markup_type: markupForm.markup_type.trim(),
            percentage: pct,
            compound: markupForm.compound,
          }),
        });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "Failed to create markup");
        }
        const data = await response.json();
        setVerticalMarkups((prev) => [...prev, data.data]);
        toast.success("Markup added");
      }
      setShowAddMarkupDialog(false);
      resetMarkupForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save markup");
    } finally {
      setIsSubmittingMarkup(false);
    }
  };

  const handleDeleteMarkup = async (markupId: string) => {
    setDeletingMarkupId(markupId);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/vertical-markup?markupId=${markupId}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to delete markup");
      }
      setVerticalMarkups((prev) => prev.filter((m) => m.id !== markupId));
      setSavedVerticalMarkups((prev) => prev.filter((m) => m.id !== markupId));
      setMarkupMapsToById((prev) => {
        const next = { ...prev };
        delete next[markupId];
        return next;
      });
      setMarkupDisplayById((prev) => {
        const next = { ...prev };
        delete next[markupId];
        return next;
      });
      toast.success("Markup deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete markup");
    } finally {
      setDeletingMarkupId(null);
    }
  };

  const updateAdvancedSetting = <K extends keyof PrimeContractSettings>(
    key: K,
    value: PrimeContractSettings[K],
  ) => {
    setAdvancedSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const saveAdvancedSettings = async () => {
    if (!contract) {
      toast.error("Contract not loaded");
      return;
    }
    if (!advancedSettings) {
      toast.error("Project settings not loaded");
      return;
    }

    setAdvancedSettingsSaving(true);
    try {
      const [projectSettingsRes, contractRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/contracts/settings`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(advancedSettings),
        }),
        fetch(`/api/projects/${projectId}/contracts/${contractId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inclusions: contractAdvancedDraft.inclusions || null,
            exclusions: contractAdvancedDraft.exclusions || null,
            is_private: contractAdvancedDraft.is_private,
            payment_terms: contractAdvancedDraft.payment_terms || null,
            billing_schedule: contractAdvancedDraft.billing_schedule || null,
          }),
        }),
      ]);

      if (!projectSettingsRes.ok) {
        const err = await projectSettingsRes.json().catch(() => null);
        throw new Error(err?.error || "Failed to save project contract settings");
      }
      if (!contractRes.ok) {
        const err = await contractRes.json().catch(() => null);
        throw new Error(err?.error || "Failed to save contract advanced settings");
      }

      const [savedProjectSettings, savedContract] = await Promise.all([
        projectSettingsRes.json() as Promise<PrimeContractSettings>,
        contractRes.json() as Promise<Contract>,
      ]);
      setAdvancedSettings(savedProjectSettings);
      setContract((prev) => (prev ? { ...prev, ...savedContract } : prev));
      toast.success("Advanced settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save advanced settings");
    } finally {
      setAdvancedSettingsSaving(false);
    }
  };

  const handleAddMarkupInline = async () => {
    setIsSubmittingMarkup(true);
    const nextMarkupType = getNextAvailableMarkupType(verticalMarkups);
    if (!nextMarkupType) {
      setIsSubmittingMarkup(false);
      toast.error("All available markup types are already added.");
      return;
    }
    try {
      const response = await fetch(`/api/projects/${projectId}/vertical-markup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markup_type: nextMarkupType,
          percentage: 0,
          compound: false,
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.error || "Failed to create markup");
      }

      const data = await response.json();
      const newMarkup: VerticalMarkup = data.data;
      setVerticalMarkups((prev) => [...prev, newMarkup]);
      setSavedVerticalMarkups((prev) => [...prev, newMarkup]);
      toast.success("Markup row added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add markup");
    } finally {
      setIsSubmittingMarkup(false);
    }
  };

  const handleInlineMarkupChange = (
    markupId: string,
    updates: Partial<Pick<VerticalMarkup, "markup_type" | "percentage" | "compound">>,
  ) => {
    setVerticalMarkups((prev) =>
      prev.map((m) => (m.id === markupId ? { ...m, ...updates } : m)),
    );
  };

  const handleInlineMapsToChange = (markupId: string, value: string) => {
    setMarkupMapsToById((prev) => ({ ...prev, [markupId]: value }));
  };

  const handleInlineDisplayChange = (
    markupId: string,
    value: "horizontal" | "vertical",
  ) => {
    setMarkupDisplayById((prev) => ({ ...prev, [markupId]: value }));
  };

  const handleStartMarkupRowEdit = (markup: VerticalMarkup) => {
    setMarkupRowDrafts((prev) => ({
      ...prev,
      [markup.id]: {
        markup_type: markup.markup_type,
        percentage: Number(markup.percentage) || 0,
        compound: Boolean(markup.compound),
        displayIn: markupDisplayById[markup.id] ?? "horizontal",
        mapsTo: markupMapsToById[markup.id] ?? "all",
      },
    }));
    setEditingMarkupRowIds((prev) => ({ ...prev, [markup.id]: true }));
  };

  const handleCancelMarkupRowEdit = (markupId: string) => {
    setEditingMarkupRowIds((prev) => {
      const next = { ...prev };
      delete next[markupId];
      return next;
    });
    setMarkupRowDrafts((prev) => {
      const next = { ...prev };
      delete next[markupId];
      return next;
    });
  };

  const handleSaveMarkupRowEdit = (markupId: string) => {
    const draft = markupRowDrafts[markupId];
    if (!draft) return;

    setVerticalMarkups((prev) =>
      prev.map((row) =>
        row.id === markupId
          ? {
              ...row,
              markup_type: draft.markup_type,
              percentage: Number(draft.percentage) || 0,
              compound: Boolean(draft.compound),
            }
          : row,
      ),
    );
    setMarkupDisplayById((prev) => ({ ...prev, [markupId]: draft.displayIn }));
    setMarkupMapsToById((prev) => ({ ...prev, [markupId]: draft.mapsTo }));
    handleCancelMarkupRowEdit(markupId);
  };

  const handleSaveMarkupTable = async () => {
    const markupsToPersist = [...verticalMarkups]
      .sort((a, b) => a.calculation_order - b.calculation_order)
      .map((markup, index) => ({
        ...markup,
        markup_type: markup.markup_type.trim(),
        percentage: Number(markup.percentage),
        calculation_order: index + 1,
        maps_to_budget_code_id:
          markupMapsToById[markup.id] && markupMapsToById[markup.id] !== "all"
            ? markupMapsToById[markup.id]
            : null,
      }));

    if (markupsToPersist.some((markup) => !markup.markup_type)) {
      toast.error("Each markup row needs a name");
      return;
    }

    const duplicateMarkupTypes = findDuplicateMarkupTypes(markupsToPersist);
    if (duplicateMarkupTypes.length > 0) {
      toast.error(
        `Markup names must be unique. Duplicate: ${duplicateMarkupTypes
          .map((name) => `"${name}"`)
          .join(", ")}`,
      );
      return;
    }

    if (
      markupsToPersist.some(
        (markup) =>
          Number.isNaN(markup.percentage) ||
          markup.percentage < 0 ||
          markup.percentage > 100,
      )
    ) {
      toast.error("Percentages must be between 0 and 100");
      return;
    }

    setIsSavingMarkupTable(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/vertical-markup`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markups: markupsToPersist }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        const details =
          typeof err?.details === "string" && err.details.trim().length > 0
            ? ` (${err.details})`
            : "";
        throw new Error((err?.error || "Failed to save markup table") + details);
      }
      const data = await response.json();
      const updatedMarkups: VerticalMarkup[] = normalizeVerticalMarkupRows(
        data.markups || [],
      );
      setVerticalMarkups(updatedMarkups);
      setSavedVerticalMarkups(updatedMarkups);
      toast.success("Markup changes saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save markup table");
    } finally {
      setIsSavingMarkupTable(false);
    }
  };

  const handleBack = () => {
    router.push(`/${projectId}/prime-contracts`);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  // ─── Acumatica Sync (AR Invoices + AR Payments) ──────────────────────────

  const handleErpSync = async () => {
    setIsSyncing(true);
    try {
      const [invResp, payResp] = await Promise.all([
        fetch("/api/sync/acumatica/ar-invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: Number(projectId) }),
        }),
        fetch("/api/sync/acumatica/ar-payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: Number(projectId) }),
        }),
      ]);

      const invData = await invResp.json();
      const payData = await payResp.json();

      if (!invResp.ok) throw new Error(invData.error ?? "Invoice sync failed");
      if (!payResp.ok) throw new Error(payData.error ?? "Payment sync failed");

      const inv = invData.result;
      const pay = payData.result;
      const totalCreated = inv.created + pay.created;
      const totalUpdated = inv.updated + pay.updated;
      const totalErrors = inv.errors.length + pay.errors.length;

      toast.success(
        `ERP sync complete: ${totalCreated} created, ${totalUpdated} updated` +
          (totalErrors > 0 ? ` (${totalErrors} errors)` : ""),
      );

      // Re-fetch invoices and payments to show newly synced data
      const [invListResp, payListResp] = await Promise.all([
        fetch(`/api/projects/${projectId}/contracts/${contractId}/payment-applications`),
        fetch(`/api/projects/${projectId}/contracts/${contractId}/payments`),
      ]);
      if (invListResp.ok) {
        const invList = await invListResp.json();
        setPaymentApplications(invList || []);
      }
      if (payListResp.ok) {
        const payList = await payListResp.json();
        setPayments(payList || []);
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ERP sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const existingCostCodeByLineId = useMemo(
    () => new Map(lineItems.map((item) => [item.id, item.cost_code_id ?? null])),
    [lineItems],
  );

  const hasUnsavedMarkupChanges = useMemo(() => {
    const normalize = (rows: VerticalMarkup[]) =>
      [...rows]
        .sort((a, b) => a.calculation_order - b.calculation_order)
        .map((row) => ({
          id: row.id,
          markup_type: row.markup_type.trim(),
          percentage: Number(row.percentage),
          compound: Boolean(row.compound),
        }));
    return JSON.stringify(normalize(verticalMarkups)) !== JSON.stringify(normalize(savedVerticalMarkups));
  }, [verticalMarkups, savedVerticalMarkups]);

  const handleInlineEditSubmit = async (data: ContractFormData) => {
    if (!contract) {
      toast.error("Contract data is not loaded");
      return;
    }

    setIsSavingEdit(true);
    try {
      const sovItems = (data.sovItems || []).filter((item) => !item.isGroup);
      const sovTotal = sovItems.reduce(
        (sum, item) =>
          sum +
          (data.accountingMethod === "unit_quantity"
            ? (item.quantity ?? 0) * (item.unitCost ?? 0)
            : item.amount || 0),
        0,
      );

      const response = await fetch(
        `/api/projects/${projectId}/contracts/${contractId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contract_number: data.number,
            title: data.title,
            client_id: data.ownerCompanyId || null,
            contractor_id: data.contractorId || null,
            architect_engineer_id: data.architectEngineerId || null,
            contract_company_id:
              data.ownerCompanyId || data.contractCompanyId || null,
            description: data.description,
            status: data.status || "draft",
            executed: data.executed || false,
            original_contract_value: sovTotal,
            start_date: data.startDate?.toISOString().split("T")[0] || null,
            end_date:
              data.estimatedCompletionDate?.toISOString().split("T")[0] || null,
            substantial_completion_date:
              data.substantialCompletionDate?.toISOString().split("T")[0] || null,
            actual_completion_date:
              data.actualCompletionDate?.toISOString().split("T")[0] || null,
            signed_contract_received_date:
              data.signedContractReceivedDate?.toISOString().split("T")[0] || null,
            contract_termination_date:
              data.contractTerminationDate?.toISOString().split("T")[0] || null,
            retention_percentage: data.defaultRetainage || 0,
            payment_terms: data.paymentTerms || null,
            billing_schedule: data.billingSchedule || null,
            is_private: data.isPrivate || false,
            inclusions: data.inclusions || null,
            exclusions: data.exclusions || null,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.details?.length > 0) {
          const fieldErrors = errorData.details
            .map((d: { field: string; message: string }) => `${d.field}: ${d.message}`)
            .join("; ");
          throw new Error(`Validation failed — ${fieldErrors}`);
        }
        throw new Error(errorData.error || "Failed to update contract");
      }

      const budgetCodesResponse = await fetch(
        `/api/projects/${projectId}/budget-codes`,
        { credentials: "include" },
      );

      const budgetCodesPayload = budgetCodesResponse.ok
        ? await budgetCodesResponse.json().catch(() => ({ budgetCodes: [] }))
        : { budgetCodes: [] };

      // Map budget code UUID → cost_code_id string (for the legacy column)
      const budgetCodeIdToCostCode = new Map<string, string | null>(
        (budgetCodesPayload.budgetCodes || []).map(
          (code: { id: string; legacyCostCodeId?: string | null }) => [
            code.id,
            code.legacyCostCodeId ?? null,
          ],
        ),
      );

      const itemsToPersist = sovItems.map((item, index) => {
        const budgetCodeId = item.budgetCodeId || "";
        const costCodeId = budgetCodeIdToCostCode.get(budgetCodeId)
          ?? existingCostCodeByLineId.get(item.id)
          ?? null;

        const quantity =
          data.accountingMethod === "unit_quantity" ? item.quantity ?? 0 : 1;
        const unitCost =
          data.accountingMethod === "unit_quantity"
            ? item.unitCost ?? 0
            : item.amount || 0;

        return {
          id: item.id,
          line_number: index + 1,
          description: item.description || `Line ${index + 1}`,
          cost_code_id: costCodeId,
          budget_code_id: budgetCodeId || null,
          quantity,
          unit_cost: unitCost,
          unit_of_measure: item.unitOfMeasure || null,
        };
      });

      const existingIds = new Set(lineItems.map((item) => item.id));
      const incomingIds = new Set(itemsToPersist.map((item) => item.id));

      const updates = itemsToPersist.filter((item) => existingIds.has(item.id));
      const creates = itemsToPersist.filter((item) => !existingIds.has(item.id));
      const deletions = lineItems
        .filter((item) => !incomingIds.has(item.id))
        .map((item) => item.id);

      // Helper: format error details from API response into a readable string
      const formatSovError = (errorData: {
        error?: string;
        details?: string | Array<{ field: string; message: string }>;
      }): string => {
        const base = errorData.error || "an unexpected error occurred";
        if (!errorData.details) return base;
        const detail =
          typeof errorData.details === "string"
            ? errorData.details
            : Array.isArray(errorData.details)
              ? errorData.details.map((d) => `${d.field}: ${d.message}`).join("; ")
              : "";
        return detail ? `${base} — ${detail}` : base;
      };

      // Updates and deletions are independent — run them concurrently.
      // Creates are sequential to avoid the UNIQUE(contract_id, line_number) race condition.
      const [updateResults, deleteResponses] = await Promise.all([
        Promise.all(
          updates.map(async (item) => {
            const res = await fetch(
              `/api/projects/${projectId}/contracts/${contractId}/line-items/${item.id}`,
              {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  line_number: item.line_number,
                  description: item.description,
                  cost_code_id: item.cost_code_id,
                  budget_code_id: item.budget_code_id,
                  quantity: item.quantity,
                  unit_cost: item.unit_cost,
                  unit_of_measure: item.unit_of_measure,
                }),
              },
            );
            return { item, res };
          }),
        ),
        Promise.all(
          deletions.map((lineItemId) =>
            fetch(
              `/api/projects/${projectId}/contracts/${contractId}/line-items/${lineItemId}`,
              { method: "DELETE" },
            ),
          ),
        ),
      ]);

      const failedUpdate = updateResults.find((r) => !r.res.ok);
      if (failedUpdate) {
        const errorData = await failedUpdate.res.json().catch(() => ({}));
        const lineLabel =
          failedUpdate.item.description || `Line ${failedUpdate.item.line_number}`;
        console.error("[SOV] Update failed", { item: failedUpdate.item, errorData });
        throw new Error(`Could not save "${lineLabel}": ${formatSovError(errorData)}`);
      }

      const failedDelete = deleteResponses.find((res) => !res.ok);
      if (failedDelete) {
        const errorData = await failedDelete.json().catch(() => ({}));
        console.error("[SOV] Delete failed", errorData);
        throw new Error(`Could not remove line item: ${formatSovError(errorData)}`);
      }

      // Sequential creates to avoid the UNIQUE(contract_id, line_number) constraint race
      for (const item of creates) {
        const createRes = await fetch(
          `/api/projects/${projectId}/contracts/${contractId}/line-items`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              line_number: item.line_number,
              description: item.description,
              cost_code_id: item.cost_code_id,
              budget_code_id: item.budget_code_id,
              quantity: item.quantity,
              unit_cost: item.unit_cost,
              unit_of_measure: item.unit_of_measure,
            }),
          },
        );
        if (!createRes.ok) {
          const errorData = await createRes.json().catch(() => ({}));
          const lineLabel = item.description || `Line ${item.line_number}`;
          console.error("[SOV] Create failed", { item, errorData });
          throw new Error(`Could not add "${lineLabel}": ${formatSovError(errorData)}`);
        }
      }

      toast.success("Contract updated successfully");
      setIsEditing(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update contract");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleAddLineItem = async () => {
    if (!lineItemForm.lineNumber || !lineItemForm.description) {
      toast.error("Line number and description are required");
      return;
    }

    const selectedBudgetCode = budgetCodes.find(
      (code) => code.id === lineItemForm.budgetCodeId,
    );
    // legacyCostCodeId is a string (cost_codes.id), not a number.
    const costCodeId = selectedBudgetCode?.legacyCostCodeId
      ? String(selectedBudgetCode.legacyCostCodeId)
      : null;

    if (!selectedBudgetCode) {
      toast.error(
        "Please select a budget code before adding a line item.",
      );
      return;
    }

    setIsSubmittingLineItem(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/contracts/${contractId}/line-items`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            line_number: parseInt(lineItemForm.lineNumber, 10),
            description: lineItemForm.description,
            quantity: parseFloat(lineItemForm.quantity) || 0,
            unit_cost: parseFloat(lineItemForm.unitCost) || 0,
            unit_of_measure: lineItemForm.unitOfMeasure || null,
            cost_code_id: costCodeId,
            budget_code_id: selectedBudgetCode.id,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create line item");
      }

      // Refresh line items list
      const lineItemsResponse = await fetch(
        `/api/projects/${projectId}/contracts/${contractId}/line-items`
      );
      if (lineItemsResponse.ok) {
        const data = await lineItemsResponse.json();
        setLineItems(data || []);
      }

      // Reset form and close dialog
      setLineItemForm({
        lineNumber: "",
        description: "",
        quantity: "1",
        unitCost: "0",
        unitOfMeasure: "",
        budgetCodeId: "",
      });
      setShowAddLineItemDialog(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create line item");
    } finally {
      setIsSubmittingLineItem(false);
    }
  };

  const handleDeleteLineItem = async () => {
    if (!lineItemToDelete) return;

    setIsDeletingLineItem(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/contracts/${contractId}/line-items/${lineItemToDelete.id}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        toast.error(data.error || "Failed to delete line item");
        return;
      }

      setLineItems((prev) => prev.filter((li) => li.id !== lineItemToDelete.id));
      toast.success("Line item deleted");
    } catch {
      toast.error("Failed to delete line item");
    } finally {
      setIsDeletingLineItem(false);
      setLineItemToDelete(null);
    }
  };

  const normalizeSovDraftItems = (items: ContractLineItem[]) =>
    items
      .filter((item): item is ContractLineItem => Boolean(item))
      .map((item, index) => {
      const quantity = Number(item.quantity) || 0;
      const unitCost = Number(item.unit_cost) || 0;
      return {
        ...item,
        line_number: index + 1,
        total_cost: quantity * unitCost,
      };
      });

  const handleStartSovEdit = () => {
    setSovDraftItems(normalizeSovDraftItems(lineItems.map((item) => ({ ...item }))));

    // Use budget_code_id (the real FK) directly from each line item.
    // Fall back to reverse-mapping cost_code_id → budget code only for legacy rows.
    const budgetCodeIdByCostCodeId = new Map<string, string>();
    budgetCodes.forEach((budgetCode) => {
      const costCodeId = budgetCode.legacyCostCodeId;
      if (costCodeId && !budgetCodeIdByCostCodeId.has(costCodeId)) {
        budgetCodeIdByCostCodeId.set(costCodeId, budgetCode.id);
      }
    });

    const nextDraftBudgetCodeIds: Record<string, string> = {};
    lineItems.forEach((item) => {
      // Primary: use the stored budget_code_id FK
      if (item.budget_code_id) {
        nextDraftBudgetCodeIds[item.id] = item.budget_code_id;
        return;
      }
      // Fallback: reverse-map from cost_code_id (for legacy data)
      if (item.cost_code_id != null) {
        const budgetCodeId = budgetCodeIdByCostCodeId.get(String(item.cost_code_id));
        if (budgetCodeId) {
          nextDraftBudgetCodeIds[item.id] = budgetCodeId;
        }
      }
    });
    setSovDraftBudgetCodeIds(nextDraftBudgetCodeIds);
    setIsSovEditing(true);
  };

  const handleCancelSovEdit = () => {
    setSovDraftItems([]);
    setSovDraftBudgetCodeIds({});
    setIsSovEditing(false);
  };

  const handleAddSovLine = () => {
    // Ensure edit mode is active before adding a line — without this,
    // displayedSovItems points to lineItems (persisted), not sovDraftItems,
    // so the new draft row would be silently invisible.
    if (!isSovEditing) {
      handleStartSovEdit();
    }
    setSovDraftItems((prev) =>
      normalizeSovDraftItems([
        ...prev,
        {
          id: `new-${crypto.randomUUID()}`,
          contract_id: contractId,
          line_number: prev.length + 1,
          description: "",
          cost_code_id: null,
          quantity: 1,
          unit_of_measure: null,
          unit_cost: 0,
          total_cost: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]),
    );
  };

  const handleDeleteSovLine = async (lineId: string) => {
    // Optimistically remove from local state
    setLineItems((prev) => prev.filter((li) => li.id !== lineId));
    try {
      const response = await fetch(
        `/api/projects/${projectId}/contracts/${contractId}/line-items/${lineId}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        toast.error(data.error || "Failed to delete line item");
        // Re-fetch to restore state
        const restored = await fetch(`/api/projects/${projectId}/contracts/${contractId}/line-items`);
        if (restored.ok) setLineItems(await restored.json());
        return;
      }
      toast.success("Line item deleted");
    } catch {
      toast.error("Failed to delete line item");
      const restored = await fetch(`/api/projects/${projectId}/contracts/${contractId}/line-items`);
      if (restored.ok) setLineItems(await restored.json());
    }
  };

  const handleAddSovGroup = () => {
    setSovDraftItems((prev) =>
      normalizeSovDraftItems([
        ...prev,
        {
          id: `group-${crypto.randomUUID()}`,
          contract_id: contractId,
          line_number: prev.length + 1,
          description: "",
          cost_code_id: null,
          quantity: 0,
          unit_of_measure: null,
          unit_cost: 0,
          total_cost: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_group_header: true,
          group_name: "New Group",
        },
      ]),
    );
  };

  const handleUpdateSovLine = (
    lineId: string,
    updates: Partial<
      Pick<
        ContractLineItem,
        "description" | "quantity" | "unit_of_measure" | "unit_cost" | "cost_code_id"
      >
    >,
  ) => {
    setSovDraftItems((prev) =>
      normalizeSovDraftItems(
        prev.map((item) => (item.id === lineId ? { ...item, ...updates } : item)),
      ),
    );
  };

  const handleUpdateSovLineBudgetCode = (lineId: string, budgetCodeId: string) => {
    const selectedCode = budgetCodes.find((code) => code.id === budgetCodeId);
    // cost_code_id is TEXT in the DB, and legacyCostCodeId is cost_codes.id (also text).
    // Just pass the string directly — no numeric coercion needed.
    const costCodeId = selectedCode?.legacyCostCodeId != null
      ? String(selectedCode.legacyCostCodeId)
      : null;

    setSovDraftBudgetCodeIds((prev) => ({
      ...prev,
      [lineId]: budgetCodeId,
    }));
    setSovDraftItems((prev) =>
      normalizeSovDraftItems(
        prev.map((item) =>
          item.id === lineId
            ? {
                ...item,
                cost_code_id: costCodeId,
                // Preserve budget code info for read-mode display
                cost_code: selectedCode
                  ? {
                      id: costCodeId ?? "",
                      code: selectedCode.code,
                      name: selectedCode.description,
                    }
                  : item.cost_code,
              }
            : item,
        ),
      ),
    );
  };

  const handleRemoveSovLine = (lineId: string) => {
    setSovDraftBudgetCodeIds((prev) => {
      const next = { ...prev };
      delete next[lineId];
      return next;
    });
    setSovDraftItems((prev) =>
      normalizeSovDraftItems(prev.filter((item) => item.id !== lineId)),
    );
  };

  const handleReorderSovLines = (oldIndex: number, newIndex: number) => {
    if (!isSovEditing) {
      return;
    }

    setSovDraftItems((prev) =>
      oldIndex < 0 || newIndex < 0 || oldIndex >= prev.length || newIndex >= prev.length
        ? prev
        : normalizeSovDraftItems(arrayMove(prev, oldIndex, newIndex)),
    );
  };

  const handleSaveSovEdit = async () => {
    const normalizedDraftItems = normalizeSovDraftItems(sovDraftItems);

    // Group headers are UI-only and are not persisted to the database.
    // Re-index line numbers after filtering so persisted lines are contiguous
    // (1, 2, 3, ...) regardless of how many group headers existed in the UI.
    // Without this, group headers shift line_number values, causing gaps that
    // can violate the UNIQUE(contract_id, line_number) constraint on concurrent PUTs.
    const persistableItems = normalizedDraftItems
      .filter((item) => !item.is_group_header)
      .map((item, idx) => ({ ...item, line_number: idx + 1 }));

    if (persistableItems.length === 0) {
      toast.error("At least one SOV line item is required");
      return;
    }

    setIsSavingSovChanges(true);
    try {
      const existingIds = new Set(lineItems.map((item) => item.id));
      const incomingIds = new Set(
        persistableItems
          .filter((item) => existingIds.has(item.id))
          .map((item) => item.id),
      );

      const updatePayload = persistableItems.filter((item) =>
        existingIds.has(item.id),
      );
      const createPayload = persistableItems.filter(
        (item) => !existingIds.has(item.id),
      );
      const deletionIds = lineItems
        .filter((item) => !incomingIds.has(item.id))
        .map((item) => item.id);

      // Reordering can cause transient line_number collisions (e.g. swapping 10 and 11).
      // Avoid this by first moving all existing items to a temporary high range, then
      // applying deletions/final updates/creates.
      const temporaryLineBase = 100000;
      for (let index = 0; index < updatePayload.length; index++) {
        const item = updatePayload[index];
        const tempRes = await fetch(
          `/api/projects/${projectId}/contracts/${contractId}/line-items/${item.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ line_number: temporaryLineBase + index + 1 }),
          },
        );
        if (!tempRes.ok) {
          const errorData = await tempRes.json().catch(() => ({}));
          const label = `"${item.description || `Line ${item.line_number}`}"`;
          throw new Error(
            `Could not save ${label}: ${errorData.error || errorData.details || "unknown error"}`,
          );
        }
      }

      const deletionResponses = await Promise.all(
        deletionIds.map((lineItemId) =>
          fetch(
            `/api/projects/${projectId}/contracts/${contractId}/line-items/${lineItemId}`,
            { method: "DELETE" },
          ),
        ),
      );
      const failedDeletion = deletionResponses.findIndex((response) => !response.ok);
      if (failedDeletion !== -1) {
        const errorData = await deletionResponses[failedDeletion]
          .json()
          .catch(() => ({}));
        throw new Error(
          `Could not delete a removed line item: ${errorData.error || errorData.details || "unknown error"}`,
        );
      }

      for (const item of updatePayload) {
        const updateRes = await fetch(
          `/api/projects/${projectId}/contracts/${contractId}/line-items/${item.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              line_number: item.line_number,
              description: item.description || `Line ${item.line_number}`,
              cost_code_id: item.cost_code_id,
              budget_code_id: sovDraftBudgetCodeIds[item.id] || null,
              quantity: Number(item.quantity) || 0,
              unit_cost: Number(item.unit_cost) || 0,
              unit_of_measure: item.unit_of_measure || null,
            }),
          },
        );
        if (!updateRes.ok) {
          const errorData = await updateRes.json().catch(() => ({}));
          const label = `"${item.description || `Line ${item.line_number}`}"`;
          throw new Error(
            `Could not save ${label}: ${errorData.error || errorData.details || "unknown error"}`,
          );
        }
      }

      // Sequential creates to avoid the UNIQUE(contract_id, line_number) constraint race
      for (const item of createPayload) {
        const createRes = await fetch(
          `/api/projects/${projectId}/contracts/${contractId}/line-items`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              line_number: item.line_number,
              description: item.description || `Line ${item.line_number}`,
              cost_code_id: item.cost_code_id,
              budget_code_id: sovDraftBudgetCodeIds[item.id] || null,
              quantity: Number(item.quantity) || 0,
              unit_cost: Number(item.unit_cost) || 0,
              unit_of_measure: item.unit_of_measure || null,
            }),
          },
        );
        if (!createRes.ok) {
          const errorData = await createRes.json().catch(() => ({}));
          const label = `"${item.description || `Line ${item.line_number}`}"`;
          throw new Error(
            `Could not save ${label}: ${errorData.error || errorData.details || "unknown error"}`,
          );
        }
      }

      const refreshedLineItemsResponse = await fetch(
        `/api/projects/${projectId}/contracts/${contractId}/line-items`,
      );
      if (refreshedLineItemsResponse.ok) {
        const refreshedLineItems = await refreshedLineItemsResponse.json();
        setLineItems(refreshedLineItems || []);
      }

      setIsSovEditing(false);
      setSovDraftItems([]);
      setSovDraftBudgetCodeIds({});
      toast.success("Schedule of values updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save schedule of values",
      );
    } finally {
      setIsSavingSovChanges(false);
    }
  };

  // Fetch attachments when overview tab is active
  useEffect(() => {
    if (!contract) return;
    const fetchAttachments = async () => {
      try {
        setAttachmentsLoading(true);
        const response = await fetch(
          `/api/projects/${projectId}/contracts/${contractId}/attachments`,
        );
        if (!response.ok) return;
        const data = await response.json();
        setAttachments(data.data || []);
      } catch {
        // swallowed
      } finally {
        setAttachmentsLoading(false);
      }
    };
    fetchAttachments();
  }, [contract, contractId, projectId]);

  const handleUploadAttachment = async (file: File) => {
    setIsUploadingAttachment(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(
        `/api/projects/${projectId}/contracts/${contractId}/attachments`,
        { method: "POST", body: formData },
      );
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        toast.error(err.error || "Failed to upload attachment");
        return;
      }
      const newAttachment = await response.json();
      setAttachments((prev) => [
        {
          id: newAttachment.id,
          fileName: newAttachment.fileName,
          url: newAttachment.url ?? null,
          downloadUrl: newAttachment.downloadUrl,
          uploadedBy: newAttachment.uploadedBy,
          uploadedAt: newAttachment.uploadedAt,
        },
        ...prev,
      ]);
      toast.success(`"${file.name}" uploaded successfully`);
    } catch {
      toast.error("Failed to upload attachment");
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/contracts/${contractId}/attachments/${attachmentId}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        toast.error(err.error || "Failed to delete attachment");
        return;
      }
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      toast.success("Attachment deleted");
    } catch {
      toast.error("Failed to delete attachment");
    }
  };

  const handleCreateCo = async () => {
    if (!coForm.change_order_number || !coForm.description || !coForm.amount) {
      toast.error("CO number, description, and amount are required");
      return;
    }
    setIsSubmittingCo(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/contracts/${contractId}/change-orders`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contract_id: contractId,
            change_order_number: coForm.change_order_number,
            description: coForm.description,
            amount: parseFloat(coForm.amount),
            status: coForm.status,
          }),
        },
      );
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        toast.error(err.error || "Failed to create change order");
        return;
      }
      const newCo = await response.json();
      setChangeOrders((prev) => [...prev, newCo]);
      setShowNewCoDialog(false);
      setCoForm({ change_order_number: "", description: "", amount: "", status: "pending" });
      toast.success("Change order created successfully");
      void downloadPrimeContractChangeOrderPdf(newCo);
    } catch {
      toast.error("Failed to create change order");
    } finally {
      setIsSubmittingCo(false);
    }
  };

  async function downloadPrimeContractChangeOrderPdf(
    changeOrder: Pick<PrimeContractCO, "id" | "change_order_number">,
  ) {
    try {
      const response = await fetch(
        `/api/document-center/prime-contract-change-order/${changeOrder.id}/pdf`,
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate PDF");
      }

      const blob = await response.blob();
      const filename =
        response.headers
          .get("Content-Disposition")
          ?.match(/filename=\"?([^\"]+)\"?/)?.[1] ||
        `${changeOrder.change_order_number || "prime-contract-change-order"}.pdf`;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to download change order PDF",
      );
    }
  }

  const handleApproveCo = async (coId: string) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/contracts/${contractId}/change-orders/${coId}/approve`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) },
      );
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        toast.error(err.error || "Failed to approve change order");
        return;
      }
      setChangeOrders((prev) =>
        prev.map((co) =>
          co.id === coId ? { ...co, status: "approved", approved_date: new Date().toISOString() } : co,
        ),
      );
      toast.success("Change order approved");
    } catch {
      toast.error("Failed to approve change order");
    }
  };

  const handleRejectCo = async () => {
    if (!rejectingCoId || !rejectionReason.trim()) {
      toast.error("Rejection reason is required");
      return;
    }
    setIsRejectingCo(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/contracts/${contractId}/change-orders/${rejectingCoId}/reject`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rejection_reason: rejectionReason }),
        },
      );
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        toast.error(err.error || "Failed to reject change order");
        return;
      }
      setChangeOrders((prev) =>
        prev.map((co) =>
          co.id === rejectingCoId
            ? { ...co, status: "rejected", rejection_reason: rejectionReason }
            : co,
        ),
      );
      setShowRejectCoDialog(false);
      setRejectingCoId(null);
      setRejectionReason("");
      toast.success("Change order rejected");
    } catch {
      toast.error("Failed to reject change order");
    } finally {
      setIsRejectingCo(false);
    }
  };

  const handleBudgetCodeCreated = async (budgetCodeId: string) => {
    try {
      setBudgetCodesLoading(true);
      const response = await fetch(`/api/projects/${projectId}/budget-codes`);
      if (!response.ok) return;
      const { budgetCodes: codes } = (await response.json()) as {
        budgetCodes: BudgetCode[];
      };
      setBudgetCodes(codes || []);

      const createdBudgetCode = (codes || []).find((code) => code.id === budgetCodeId);
      // legacyCostCodeId is a string (cost_codes.id is TEXT), not a number.
      const costCodeId = createdBudgetCode?.legacyCostCodeId ?? null;

      if (budgetCodeCreateTarget?.type === "sov-line") {
        // Assign the newly created budget code to the target SOV line
        setSovDraftItems((prev) =>
          normalizeSovDraftItems(
            prev.map((item) =>
              item.id === budgetCodeCreateTarget.lineId
                ? { ...item, cost_code_id: costCodeId }
                : item,
            ),
          ),
        );
        setSovDraftBudgetCodeIds((prev) => ({
          ...prev,
          [budgetCodeCreateTarget.lineId]: budgetCodeId,
        }));
      } else {
        setLineItemForm((prev) => ({ ...prev, budgetCodeId }));
      }
    } finally {
      setBudgetCodesLoading(false);
      setBudgetCodeCreateTarget(null);
    }
  };

  const handleRequestCreateBudgetCodeForLineItemForm = () => {
    setBudgetCodeCreateTarget({ type: "line-item-form" });
    setShowCreateBudgetCodeModal(true);
  };

  const handleRequestCreateBudgetCodeForSovLine = (lineId: string) => {
    setBudgetCodeCreateTarget({ type: "sov-line", lineId });
    setShowCreateBudgetCodeModal(true);
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "$0.00";

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Not set";

    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const parseBulletList = (value: string | null | undefined): string[] => {
    if (!value) return [];
    // Strip HTML tags to get plain text, then split into bullet items
    const plainText = value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/?(p|div|li)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#\d+;/g, "");
    return plainText
      .split(/[\n•]+/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  };

  const getTextValue = (
    value: string | null | undefined,
  ): { text: string; isMissing: boolean } => {
    const normalized = value?.trim();
    if (!normalized) {
      return { text: "Not set", isMissing: true };
    }
    return { text: normalized, isMissing: false };
  };

  const getStatusBadgeVariant = (status: Contract["status"]) => {
    switch (status) {
      case "approved":
        return "success";
      case "complete":
        return "default";
      case "out_for_bid":
      case "out_for_signature":
        return "warning";
      case "terminated":
        return "destructive";
      case "draft":
      default:
        return "outline";
    }
  };

  const formatStatusLabel = (status: Contract["status"]) => {
    switch (status) {
      case "out_for_bid":
        return "Out for Bid";
      case "out_for_signature":
        return "Out for Signature";
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const changeOrdersCount = changeOrders.length;
  const approvedChangeOrders = useMemo(
    () => changeOrders.filter((co) => co.status === "approved"),
    [changeOrders],
  );
  const pendingChangeOrders = useMemo(
    () => changeOrders.filter((co) => co.status === "pending"),
    [changeOrders],
  );
  const rejectedChangeOrders = useMemo(
    () => changeOrders.filter((co) => co.status === "rejected"),
    [changeOrders],
  );
  const inclusionsList = useMemo(
    () => parseBulletList(contract?.inclusions),
    [contract?.inclusions],
  );
  const exclusionsList = useMemo(
    () => parseBulletList(contract?.exclusions),
    [contract?.exclusions],
  );
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
          <Button
            variant="outline"
            onClick={handleBack}
            className="mt-[var(--group-gap)]"
          >
            <ArrowLeft />
            Back to Contracts
          </Button>
        </Card>
      </PageShell>
    );
  }

  if (isEditing) {
    const sovItems = lineItems.map((item) => {
      const matchingBudgetCode = item.budget_code_id
        ? budgetCodes.find((c) => c.id === item.budget_code_id)
        : undefined;
      return {
      id: item.id,
      budgetCodeId: item.budget_code_id || "",
      budgetCodeLabel: matchingBudgetCode?.fullLabel
        ?? (item.cost_code ? `${item.cost_code.code} ${item.cost_code.name}` : undefined),
      description: item.description,
      amount: item.total_cost,
      quantity: item.quantity,
      unitCost: item.unit_cost,
      unitOfMeasure: item.unit_of_measure ?? undefined,
      billedToDate: 0,
      amountRemaining: item.total_cost,
      };
    });

    const initialData: Partial<ContractFormData> = {
      number: contract.contract_number || "",
      title: contract.title,
      status: contract.status,
      executed: contract.executed,
      ownerCompanyId: contract.client_id != null ? String(contract.client_id) : contract.contract_company_id != null ? String(contract.contract_company_id) : undefined,
      contractorId: contract.contractor_id || undefined,
      architectEngineerId: contract.architect_engineer_id || undefined,
      contractCompanyId: contract.contract_company_id || undefined,
      description: contract.description || "",
      originalAmount: contract.original_contract_value,
      revisedAmount: contract.revised_contract_value,
      startDate: contract.start_date ? new Date(contract.start_date) : undefined,
      estimatedCompletionDate: contract.end_date
        ? new Date(contract.end_date)
        : undefined,
      substantialCompletionDate: contract.substantial_completion_date
        ? new Date(contract.substantial_completion_date)
        : undefined,
      actualCompletionDate: contract.actual_completion_date
        ? new Date(contract.actual_completion_date)
        : undefined,
      signedContractReceivedDate: contract.signed_contract_received_date
        ? new Date(contract.signed_contract_received_date)
        : undefined,
      contractTerminationDate: contract.contract_termination_date
        ? new Date(contract.contract_termination_date)
        : undefined,
      defaultRetainage: contract.retention_percentage,
      paymentTerms: contract.payment_terms || "",
      billingSchedule: contract.billing_schedule || "",
      isPrivate: contract.is_private,
      inclusions: contract.inclusions || "",
      exclusions: contract.exclusions || "",
      sovItems,
    };

    return (
      <PageShell
        variant="form"
        title={`Edit: ${contract.contract_number || contract.title}`}
        description="Update contract details and SOV line items"
        onBack={() => setIsEditing(false)}
        backLabel="Cancel Edit"
        actions={
          <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
            Cancel Edit
          </Button>
        }
      >
        <ContractForm
          initialData={initialData}
          onSubmit={handleInlineEditSubmit}
          onCancel={() => setIsEditing(false)}
          isSubmitting={isSavingEdit}
          mode="edit"
          projectId={projectId}
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      variant="dashboard"
      title={`${contract.title} - #${contract.contract_number || contract.id.slice(0, 8)}`}
      description={
        contract.contractor
          ? `Contractor: ${contract.contractor.name}`
          : contract.vendor
            ? `Contractor: ${contract.vendor.name}`
            : "No contractor assigned"
      }
      onBack={() => router.back()}
      actions={
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" size="sm">
                <Plus />
                Create
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() =>
                  router.push(
                    `/${projectId}/change-events/new?contractId=${contractId}`,
                  )
                }
              >
                <FileText className="h-4 w-4 mr-2" />
                Change Event
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  router.push(
                    `/${projectId}/change-orders/prime/new?contractId=${contractId}`,
                  )
                }
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Change Order
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  router.push(
                    `/${projectId}/commitments/new?type=purchase_order&contractId=${contractId}`,
                  )
                }
              >
                <FileText className="h-4 w-4 mr-2" />
                Purchase Order
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  router.push(
                    `/${projectId}/commitments/new?type=subcontract&contractId=${contractId}`,
                  )
                }
              >
                <FileText className="h-4 w-4 mr-2" />
                Subcontract
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="icon"
            disabled={isSyncing}
            onClick={handleErpSync}
            aria-label="Sync from Acumatica"
            title="Sync invoices & payments from Acumatica"
          >
            <RefreshCw className={isSyncing ? "animate-spin" : undefined} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              setDocumentDialogTab("email");
              setIsDocumentDialogOpen(true);
            }}
            aria-label="Email"
            title="Email"
          >
            <Mail />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              setDocumentDialogTab("download");
              setIsDocumentDialogOpen(true);
            }}
            aria-label="Export"
            title="Export"
          >
            <Download />
          </Button>

          <Button
            variant="default"
            size="icon"
            onClick={handleEdit}
            aria-label="Edit Contract"
            title="Edit Contract"
          >
            <Pencil />
          </Button>
        </div>
      }
    >

      <PageTabs
        variant="inline"
        className="border-b border-border"
        tabs={[
          { label: "General", href: "overview", isActive: activeTab === "overview" },
          { label: "Change Orders", href: "change-orders", isActive: activeTab === "change-orders", count: changeOrdersCount || undefined },
          { label: "Invoices", href: "invoices", isActive: activeTab === "invoices", count: paymentApplications.length || undefined },
          { label: "Payments Received", href: "payments", isActive: activeTab === "payments", count: payments.length || undefined },
          { label: "Emails", href: "emails", isActive: activeTab === "emails" },
          { label: "Change History", href: "history", isActive: activeTab === "history" },
          { label: "Financial Markup", href: "financial-markup", isActive: activeTab === "financial-markup" },
          { label: "Advanced Settings", href: "advanced-settings", isActive: activeTab === "advanced-settings" },
        ]}
        onTabClick={(href) => setActiveTab(href as ContractTab)}
      />

      <div className="px-4 pt-10 md:px-6 lg:px-8">
      {activeTab === "overview" && (
        <PrimeContractOverviewTab
          contract={contract}
          changeOrders={changeOrders}
          attachments={attachments}
          attachmentsLoading={attachmentsLoading}
          isUploadingAttachment={isUploadingAttachment}
          handleUploadAttachment={handleUploadAttachment}
          handleDeleteAttachment={handleDeleteAttachment}
          formatDate={formatDate}
          getTextValue={getTextValue}
          inclusionsList={inclusionsList}
          exclusionsList={exclusionsList}
          formatStatusLabel={formatStatusLabel}
          formatCurrency={formatCurrency}
lineItemsLoading={lineItemsLoading}
          lineItems={lineItems}
          budgetCodes={budgetCodes}
          sovDraftBudgetCodeIds={sovDraftBudgetCodeIds}
          isSovEditing={isSovEditing}
          isSavingSovChanges={isSavingSovChanges}
          sovDraftItems={sovDraftItems}
          onStartSovEdit={handleStartSovEdit}
          onCancelSovEdit={handleCancelSovEdit}
          onSaveSovEdit={handleSaveSovEdit}
          onAddSovLine={handleAddSovLine}
          onAddSovGroup={handleAddSovGroup}
          onUpdateSovLine={handleUpdateSovLine}
          onUpdateSovLineBudgetCode={handleUpdateSovLineBudgetCode}
          onRemoveSovLine={handleRemoveSovLine}
          onReorderSovLines={handleReorderSovLines}
          onRequestCreateBudgetCode={handleRequestCreateBudgetCodeForSovLine}
          onDeleteSovLine={handleDeleteSovLine}
        />
        )}

        {activeTab === "change-orders" && (
          <div>
            <div className="bg-background">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Change Orders</h3>
                  <p className="text-sm text-muted-foreground">
                    {changeOrdersCount} change order
                    {changeOrdersCount === 1 ? "" : "s"} • {approvedChangeOrders.length} approved •
                    {" "}
                    {pendingChangeOrders.length} pending • {rejectedChangeOrders.length} rejected
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowNewCoDialog(true)}>
                  <Plus />
                  New Change Order
                </Button>
              </div>
              <div>
                {changeOrdersLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Loading change orders...</p>
                  </div>
                ) : changeOrders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-[var(--group-gap)] opacity-50" />
                    <p>No change orders yet</p>
                    <p className="text-xs mt-2">
                      Create a change order to track contract modifications
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>CO Number</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Requested</TableHead>
                        <TableHead>Approved/Rejected</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {changeOrders.map((co) => (
                        <TableRow key={co.id}>
                          <TableCell className="font-medium">
                            {co.change_order_number || "--"}
                          </TableCell>
                          <TableCell>{co.description}</TableCell>
                          <TableCell className="text-right">
                            <span className={(co.amount ?? 0) < 0 ? "text-red-600" : ""}>
                              {formatCurrency(co.amount ?? 0)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                co.status === "approved"
                                  ? "default"
                                  : co.status === "pending"
                                    ? "secondary"
                                    : "destructive"
                              }
                            >
                              {co.status ? co.status.charAt(0).toUpperCase() + co.status.slice(1) : "--"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {co.created_at ? new Date(co.created_at).toLocaleDateString() : "--"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {co.approved_date
                              ? new Date(co.approved_date).toLocaleDateString()
                              : "--"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => void downloadPrimeContractChangeOrderPdf(co)}
                                title="Download PDF"
                                aria-label={`Download ${co.change_order_number || "change order"} PDF`}
                              >
                                <Download />
                              </Button>
                              {co.status !== "approved" && co.status !== "rejected" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-xs text-green-700 border-green-300 hover:bg-green-50"
                                    onClick={() => handleApproveCo(co.id)}
                                  >
                                    <Check />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-xs text-red-700 border-red-300 hover:bg-red-50"
                                    onClick={() => {
                                      setRejectingCoId(co.id);
                                      setShowRejectCoDialog(true);
                                    }}
                                  >
                                    <X className="h-3 w-3 mr-1" />
                                    Reject
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <tfoot>
                      <TableRow className="bg-muted font-medium">
                        <TableCell colSpan={2}>Total Change Orders</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(
                            changeOrders.reduce((sum, co) => sum + (co.amount ?? 0), 0),
                          )}
                        </TableCell>
                        <TableCell colSpan={4}></TableCell>
                      </TableRow>
                    </tfoot>
                  </Table>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "invoices" && (
          <div>
            <div className="bg-background">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Invoices</h3>
                  <p className="text-sm text-muted-foreground">
                    {paymentApplications.length} invoice{paymentApplications.length === 1 ? "" : "s"} •{" "}
                    Total invoiced: {formatCurrency(
                      paymentApplications
                        .filter((a) => a.status === "approved")
                        .reduce((sum, a) => sum + a.amount, 0),
                    )}
                  </p>
                </div>
                <Button size="sm" onClick={() => setShowAddInvoiceDialog(true)}>
                  <Plus />
                  New Invoice
                </Button>
              </div>

              {paymentsLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Loading invoices...</p>
                </div>
              ) : paymentApplications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No invoices yet</p>
                  <p className="text-xs mt-2">Create an invoice to track payment applications</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Application #</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Retention</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentApplications.map((app) => (
                      <TableRow key={app.id}>
                        <TableCell className="font-medium">
                          {app.application_number}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {app.period_from && app.period_to
                            ? `${new Date(app.period_from).toLocaleDateString()} – ${new Date(app.period_to).toLocaleDateString()}`
                            : app.period_from
                              ? `From ${new Date(app.period_from).toLocaleDateString()}`
                              : "--"}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(app.amount)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {app.retention_amount > 0
                            ? formatCurrency(app.retention_amount)
                            : "--"}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(app.net_amount ?? app.amount - app.retention_amount)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              app.status === "approved"
                                ? "default"
                                : app.status === "submitted"
                                  ? "secondary"
                                  : app.status === "rejected"
                                    ? "destructive"
                                    : "outline"
                            }
                          >
                            {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {app.submitted_at
                            ? new Date(app.submitted_at).toLocaleDateString()
                            : "--"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteInvoice(app.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <tfoot>
                    <TableRow className="bg-muted font-medium">
                      <TableCell colSpan={2}>Total</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(paymentApplications.reduce((s, a) => s + a.amount, 0))}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(paymentApplications.reduce((s, a) => s + a.retention_amount, 0))}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(
                          paymentApplications.reduce(
                            (s, a) => s + (a.net_amount ?? a.amount - a.retention_amount),
                            0,
                          ),
                        )}
                      </TableCell>
                      <TableCell colSpan={3}></TableCell>
                    </TableRow>
                  </tfoot>
                </Table>
              )}
            </div>

            {/* Add Invoice Dialog */}
            <Modal open={showAddInvoiceDialog} onOpenChange={setShowAddInvoiceDialog}>
              <ModalContent className="max-w-lg">
                <ModalHeader>
                  <ModalTitle>New Invoice / Payment Application</ModalTitle>
                  <ModalDescription>
                    Create a payment application for this prime contract.
                  </ModalDescription>
                </ModalHeader>
                <div className="space-y-4 py-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="app-number">Application Number *</Label>
                      <Input
                        id="app-number"
                        placeholder="e.g. 001"
                        value={invoiceForm.application_number}
                        onChange={(e) =>
                          setInvoiceForm((f) => ({ ...f, application_number: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="app-amount">Amount *</Label>
                      <Input
                        id="app-amount"
                        type="number"
                        placeholder="0.00"
                        value={invoiceForm.amount}
                        onChange={(e) =>
                          setInvoiceForm((f) => ({ ...f, amount: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="app-retention">Retention Amount</Label>
                    <Input
                      id="app-retention"
                      type="number"
                      placeholder="0.00"
                      value={invoiceForm.retention_amount}
                      onChange={(e) =>
                        setInvoiceForm((f) => ({ ...f, retention_amount: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="app-period-from">Period From</Label>
                      <Input
                        id="app-period-from"
                        type="date"
                        value={invoiceForm.period_from}
                        onChange={(e) =>
                          setInvoiceForm((f) => ({ ...f, period_from: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="app-period-to">Period To</Label>
                      <Input
                        id="app-period-to"
                        type="date"
                        value={invoiceForm.period_to}
                        onChange={(e) =>
                          setInvoiceForm((f) => ({ ...f, period_to: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="app-notes">Notes</Label>
                    <Textarea
                      id="app-notes"
                      placeholder="Optional notes..."
                      rows={3}
                      value={invoiceForm.notes}
                      onChange={(e) =>
                        setInvoiceForm((f) => ({ ...f, notes: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <ModalFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowAddInvoiceDialog(false)}
                    disabled={isSubmittingInvoice}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateInvoice}
                    disabled={
                      isSubmittingInvoice ||
                      !invoiceForm.application_number ||
                      !invoiceForm.amount
                    }
                  >
                    {isSubmittingInvoice ? "Creating..." : "Create Invoice"}
                  </Button>
                </ModalFooter>
              </ModalContent>
            </Modal>
          </div>
        )}

        {activeTab === "payments" && (
          <div>
            <div className="bg-background">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Payments Received</h3>
                  <p className="text-sm text-muted-foreground">
                    {payments.length} payment{payments.length === 1 ? "" : "s"} •{" "}
                    Total received: {formatCurrency(
                      payments.reduce((sum, p) => sum + p.amount, 0),
                    )}
                  </p>
                </div>
                <Button size="sm" onClick={() => setShowAddPaymentDialog(true)}>
                  <Plus />
                  Record Payment
                </Button>
              </div>

              {paymentsReceivedLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Loading payments...</p>
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No payments recorded yet</p>
                  <p className="text-xs mt-2">Record a payment when funds are received</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Linked Invoice</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((pmt) => (
                      <TableRow key={pmt.id}>
                        <TableCell className="font-medium">
                          {pmt.payment_number || "--"}
                        </TableCell>
                        <TableCell>
                          {new Date(pmt.payment_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(pmt.amount)}
                        </TableCell>
                        <TableCell className="capitalize text-muted-foreground">
                          {pmt.method || "--"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {pmt.reference_number || "--"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {pmt.payment_application
                            ? `App #${pmt.payment_application.application_number}`
                            : "--"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeletePayment(pmt.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <tfoot>
                    <TableRow className="bg-muted font-medium">
                      <TableCell colSpan={2}>Total Received</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(payments.reduce((s, p) => s + p.amount, 0))}
                      </TableCell>
                      <TableCell colSpan={4}></TableCell>
                    </TableRow>
                  </tfoot>
                </Table>
              )}
            </div>

            {/* Record Payment Dialog */}
            <Modal open={showAddPaymentDialog} onOpenChange={setShowAddPaymentDialog}>
              <ModalContent className="max-w-lg">
                <ModalHeader>
                  <ModalTitle>Record Payment Received</ModalTitle>
                  <ModalDescription>
                    Log a payment received against this prime contract.
                  </ModalDescription>
                </ModalHeader>
                <div className="space-y-4 py-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pmt-amount">Amount *</Label>
                      <Input
                        id="pmt-amount"
                        type="number"
                        placeholder="0.00"
                        value={paymentForm.amount}
                        onChange={(e) =>
                          setPaymentForm((f) => ({ ...f, amount: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pmt-date">Payment Date *</Label>
                      <Input
                        id="pmt-date"
                        type="date"
                        value={paymentForm.payment_date}
                        onChange={(e) =>
                          setPaymentForm((f) => ({ ...f, payment_date: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pmt-method">Method</Label>
                      <select
                        id="pmt-method"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-4 py-1 text-sm shadow-sm"
                        value={paymentForm.method}
                        onChange={(e) =>
                          setPaymentForm((f) => ({ ...f, method: e.target.value }))
                        }
                      >
                        <option value="">Select method</option>
                        <option value="check">Check</option>
                        <option value="wire">Wire Transfer</option>
                        <option value="ach">ACH</option>
                        <option value="credit_card">Credit Card</option>
                        <option value="cash">Cash</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pmt-ref">Reference / Check #</Label>
                      <Input
                        id="pmt-ref"
                        placeholder="e.g. 12345"
                        value={paymentForm.reference_number}
                        onChange={(e) =>
                          setPaymentForm((f) => ({ ...f, reference_number: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  {paymentApplications.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="pmt-app">Linked Invoice (optional)</Label>
                      <select
                        id="pmt-app"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-4 py-1 text-sm shadow-sm"
                        value={paymentForm.payment_application_id}
                        onChange={(e) =>
                          setPaymentForm((f) => ({
                            ...f,
                            payment_application_id: e.target.value,
                          }))
                        }
                      >
                        <option value="">None</option>
                        {paymentApplications.map((app) => (
                          <option key={app.id} value={app.id}>
                            App #{app.application_number} — {formatCurrency(app.amount)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="pmt-notes">Notes</Label>
                    <Textarea
                      id="pmt-notes"
                      placeholder="Optional notes..."
                      rows={3}
                      value={paymentForm.notes}
                      onChange={(e) =>
                        setPaymentForm((f) => ({ ...f, notes: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <ModalFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowAddPaymentDialog(false)}
                    disabled={isSubmittingPayment}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreatePayment}
                    disabled={
                      isSubmittingPayment ||
                      !paymentForm.amount ||
                      !paymentForm.payment_date
                    }
                  >
                    {isSubmittingPayment ? "Recording..." : "Record Payment"}
                  </Button>
                </ModalFooter>
              </ModalContent>
            </Modal>
          </div>
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
          <div className="space-y-8">
            <section className="space-y-2">
              <h3 className="text-xl font-semibold">Financial Markup</h3>
              <p className="text-sm text-muted-foreground">
                Add percentage-based markups (e.g., tax, overhead, profit, insurance) to contract values.
              </p>
            </section>

            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-end gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSaveMarkupTable}
                    disabled={isSavingMarkupTable || !hasUnsavedMarkupChanges}
                  >
                    {isSavingMarkupTable ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button size="sm" onClick={handleAddMarkupInline} disabled={isSubmittingMarkup}>
                    <Plus />
                    {isSubmittingMarkup ? "Adding..." : "Add Markup"}
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto overflow-hidden rounded-lg border border-border/70 bg-muted/20">
                <Table>
                  <TableHeader className="border-y-0 [&_tr]:border-b-0">
                    <TableRow className="bg-muted/70 hover:bg-muted/70">
                      <TableHead className="px-3 py-2 text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
                        Markup Name
                      </TableHead>
                      <TableHead className="px-3 py-2 text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
                        Display In
                      </TableHead>
                      <TableHead className="px-3 py-2 text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
                        Maps To
                      </TableHead>
                      <TableHead className="px-3 py-2 text-right text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
                        %
                      </TableHead>
                      <TableHead className="px-3 py-2 text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
                        Calculation Type
                      </TableHead>
                      <TableHead className="px-3 py-2 text-right text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {markupsLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                          Loading markup settings...
                        </TableCell>
                      </TableRow>
                    ) : verticalMarkups.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                          No markup items configured. Click &quot;Add Markup&quot; to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      [...verticalMarkups]
                        .sort((a, b) => a.calculation_order - b.calculation_order)
                        .map((markup) => {
                          const isEditingRow = Boolean(editingMarkupRowIds[markup.id]);
                          const rowDraft = markupRowDrafts[markup.id];
                          const displayIn = markupDisplayById[markup.id] ?? "horizontal";
                          const mapsTo = markupMapsToById[markup.id] ?? "all";
                          const mapsToLabel =
                            mapsTo === "all"
                              ? "All Budget Codes"
                              : budgetCodes.find((code) => code.id === mapsTo)?.fullLabel ?? "All Budget Codes";

                          return (
                          <TableRow key={markup.id} className="border-b border-border/60 bg-background hover:bg-muted/20">
                            <TableCell className="px-3 py-2.5">
                              {isEditingRow ? (
                                <select
                                  value={rowDraft?.markup_type ?? markup.markup_type}
                                  onChange={(e) =>
                                    setMarkupRowDrafts((prev) => ({
                                      ...prev,
                                      [markup.id]: {
                                        ...(prev[markup.id] ?? {
                                          markup_type: markup.markup_type,
                                          percentage: Number(markup.percentage) || 0,
                                          compound: Boolean(markup.compound),
                                          displayIn,
                                          mapsTo,
                                        }),
                                        markup_type: e.target.value,
                                      },
                                    }))
                                  }
                                  className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                >
                                  <option value="insurance">Insurance</option>
                                  <option value="bond">Bond</option>
                                  <option value="fee">Fee</option>
                                  <option value="overhead">Overhead</option>
                                  <option value="custom">Custom</option>
                                </select>
                              ) : (
                                <span className="text-sm text-foreground capitalize">{markup.markup_type}</span>
                              )}
                            </TableCell>
                            <TableCell className="px-3 py-2.5">
                              {isEditingRow ? (
                                <select
                                  value={rowDraft?.displayIn ?? displayIn}
                                  onChange={(e) =>
                                    setMarkupRowDrafts((prev) => ({
                                      ...prev,
                                      [markup.id]: {
                                        ...(prev[markup.id] ?? {
                                          markup_type: markup.markup_type,
                                          percentage: Number(markup.percentage) || 0,
                                          compound: Boolean(markup.compound),
                                          displayIn,
                                          mapsTo,
                                        }),
                                        displayIn: e.target.value as "horizontal" | "vertical",
                                      },
                                    }))
                                  }
                                  className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                >
                                  <option value="horizontal">Horizontal</option>
                                  <option value="vertical">Vertical</option>
                                </select>
                              ) : (
                                <span className="text-sm text-foreground capitalize">{displayIn}</span>
                              )}
                            </TableCell>
                            <TableCell className="px-3 py-2.5">
                              {isEditingRow ? (
                                <select
                                  value={rowDraft?.mapsTo ?? mapsTo}
                                  onChange={(e) =>
                                    setMarkupRowDrafts((prev) => ({
                                      ...prev,
                                      [markup.id]: {
                                        ...(prev[markup.id] ?? {
                                          markup_type: markup.markup_type,
                                          percentage: Number(markup.percentage) || 0,
                                          compound: Boolean(markup.compound),
                                          displayIn,
                                          mapsTo,
                                        }),
                                        mapsTo: e.target.value,
                                      },
                                    }))
                                  }
                                  className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                >
                                  <option value="all">All Budget Codes</option>
                                  {budgetCodes.map((code) => (
                                    <option key={code.id} value={code.id}>
                                      {code.fullLabel}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-sm text-foreground">{mapsToLabel}</span>
                              )}
                            </TableCell>
                            <TableCell className="px-3 py-2.5 text-right">
                              {isEditingRow ? (
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.001"
                                  value={String(rowDraft?.percentage ?? markup.percentage)}
                                  onChange={(e) =>
                                    setMarkupRowDrafts((prev) => ({
                                      ...prev,
                                      [markup.id]: {
                                        ...(prev[markup.id] ?? {
                                          markup_type: markup.markup_type,
                                          percentage: Number(markup.percentage) || 0,
                                          compound: Boolean(markup.compound),
                                          displayIn,
                                          mapsTo,
                                        }),
                                        percentage: Number(e.target.value || 0),
                                      },
                                    }))
                                  }
                                  className="h-8 text-right"
                                />
                              ) : (
                                <span className="text-sm text-foreground">{Number(markup.percentage).toFixed(2)}%</span>
                              )}
                            </TableCell>
                            <TableCell className="px-3 py-2.5">
                              {isEditingRow ? (
                                <select
                                  value={(rowDraft?.compound ?? markup.compound) ? "compound" : "basic"}
                                  onChange={(e) =>
                                    setMarkupRowDrafts((prev) => ({
                                      ...prev,
                                      [markup.id]: {
                                        ...(prev[markup.id] ?? {
                                          markup_type: markup.markup_type,
                                          percentage: Number(markup.percentage) || 0,
                                          compound: Boolean(markup.compound),
                                          displayIn,
                                          mapsTo,
                                        }),
                                        compound: e.target.value === "compound",
                                      },
                                    }))
                                  }
                                  className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                >
                                  <option value="basic">Basic Calculation</option>
                                  <option value="compound">Compounds All Above</option>
                                </select>
                              ) : (
                                <span className="text-sm text-foreground">
                                  {markup.compound ? "Compounds All Above" : "Basic Calculation"}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="px-3 py-2.5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {isEditingRow ? (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2"
                                      onClick={() => handleSaveMarkupRowEdit(markup.id)}
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2"
                                      onClick={() => handleCancelMarkupRowEdit(markup.id)}
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2"
                                    onClick={() => handleStartMarkupRowEdit(markup)}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteMarkup(markup.id)}
                                  disabled={deletingMarkupId === markup.id}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </section>

            {/* Add/Edit Markup Dialog */}
            <Modal open={showAddMarkupDialog} onOpenChange={(open) => {
              if (!open) {
                setShowAddMarkupDialog(false);
                resetMarkupForm();
              }
            }}>
              <ModalContent>
                <ModalHeader>
                  <ModalTitle>{editingMarkup ? "Edit Markup" : "Add Markup"}</ModalTitle>
                  <ModalDescription>
                    {editingMarkup
                      ? "Update the markup name, percentage, and calculation type."
                      : "Add a percentage-based markup such as tax, overhead, profit, or insurance."}
                  </ModalDescription>
                </ModalHeader>
                <div className="space-y-4 px-6 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="markup-name">Markup Type</Label>
                    <select
                      id="markup-name"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={markupForm.markup_type}
                      onChange={(e) =>
                        setMarkupForm((prev) => ({ ...prev, markup_type: e.target.value }))
                      }
                    >
                      <option value="">Select markup type...</option>
                      <option value="insurance">Insurance</option>
                      <option value="bond">Bond</option>
                      <option value="fee">Fee</option>
                      <option value="overhead">Overhead</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="markup-percentage">Percentage (%)</Label>
                    <Input
                      id="markup-percentage"
                      type="number"
                      step="0.001"
                      min="0"
                      max="100"
                      placeholder="e.g., 10.000"
                      value={markupForm.percentage}
                      onChange={(e) =>
                        setMarkupForm((prev) => ({ ...prev, percentage: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      id="markup-compound"
                      type="checkbox"
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      checked={markupForm.compound}
                      onChange={(e) =>
                        setMarkupForm((prev) => ({ ...prev, compound: e.target.checked }))
                      }
                    />
                    <div>
                      <Label htmlFor="markup-compound" className="cursor-pointer">Compound Markup</Label>
                      <p className="text-xs text-muted-foreground">
                        When enabled, this markup is calculated on the subtotal plus all previous markups.
                      </p>
                    </div>
                  </div>
                </div>
                <ModalFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddMarkupDialog(false);
                      resetMarkupForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitMarkup}
                    disabled={isSubmittingMarkup || !markupForm.markup_type.trim() || !markupForm.percentage}
                  >
                    {isSubmittingMarkup ? "Saving..." : editingMarkup ? "Update" : "Add Markup"}
                  </Button>
                </ModalFooter>
              </ModalContent>
            </Modal>
          </div>
        )}

        {activeTab === "advanced-settings" && (
          <div className="space-y-8">
            {advancedSettingsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              <div className="max-w-xl space-y-0 bg-background">
                <section>
                  <h3 className="text-xl font-semibold tracking-tight">Advanced Settings</h3>
                </section>

                <section className="py-6">
                  <h4 className="text-lg font-semibold text-foreground">Financial Markup</h4>
                  <div className="mt-4 flex items-center gap-3">
                    <Checkbox
                      id="enable-financial-markups"
                      checked={advancedSettings?.show_markup_on_co_pdf ?? true}
                      onCheckedChange={(checked) =>
                        updateAdvancedSetting("show_markup_on_co_pdf", !!checked)
                      }
                    />
                    <Label htmlFor="enable-financial-markups" className="text-[15px] font-medium">
                      Enable Financial Markups
                    </Label>
                  </div>
                </section>

                <section className="py-4">
                  <h4 className="text-lg font-semibold text-foreground">Owner Invoices</h4>
                  <div className="mt-4 space-y-5">
                    <div className="flex items-center gap-3">
                      <Checkbox id="enable-owner-invoices" checked disabled />
                      <Label htmlFor="enable-owner-invoices" className="text-[15px] font-medium text-foreground">
                        Enable Owner Invoices
                      </Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Checkbox id="approve-sub-invoices" checked={false} disabled />
                      <Label htmlFor="approve-sub-invoices" className="text-[15px] text-muted-foreground">
                        Approve Subcontractor Invoices when Owner Approves Owner Invoice
                      </Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="enable-work-retainage"
                        checked={advancedSettings?.sov_always_editable ?? false}
                        onCheckedChange={(checked) =>
                          updateAdvancedSetting("sov_always_editable", !!checked)
                        }
                      />
                      <Label htmlFor="enable-work-retainage" className="text-[15px] font-medium text-foreground">
                        Enable Work Retainage This Period
                      </Label>
                    </div>
                  </div>
                </section>

                <section className="py-4">
                  <h4 className="text-lg font-semibold text-foreground">Stored Materials</h4>
                  <p className="mt-1 text-[15px] text-muted-foreground">
                    The Materials Presently Stored column amount is manually managed.
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    <Checkbox id="enable-material-retainage" checked disabled />
                    <Label htmlFor="enable-material-retainage" className="text-[15px] font-medium text-foreground">
                      Enable Material Retainage
                    </Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 p-0 text-muted-foreground hover:bg-transparent"
                          aria-label="Material retainage info"
                        >
                          <AlertCircle className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-md text-left">
                        To enable Material Retainage, first enable Work Retainage This Period. The
                        Material Retainage percentage amount will sync with the Work Retainage This
                        Period.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </section>

                <section className="py-4">
                  <h4 className="text-lg font-semibold text-foreground">PDF Export</h4>
                  <p className="mt-1 text-[15px] text-muted-foreground">
                    Choose what items are displayed on exported invoice PDFs.
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    <Checkbox
                      id="show-budget-code"
                      checked={advancedSettings?.show_markup_on_invoice_pdf ?? true}
                      onCheckedChange={(checked) =>
                        updateAdvancedSetting("show_markup_on_invoice_pdf", !!checked)
                      }
                    />
                    <Label htmlFor="show-budget-code" className="text-[15px] font-medium text-foreground">
                      Show Budget Code
                    </Label>
                  </div>
                </section>

                <section className="py-4">
                  <div className="flex items-center gap-2">
                    <h4 className="text-lg font-semibold text-foreground">Change Orders</h4>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 p-0 text-muted-foreground hover:bg-transparent"
                          aria-label="Change orders level of detail info"
                        >
                          <AlertCircle className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-lg text-left">
                        The level of detail that is selected here determines how change orders will
                        be displayed on the detail page of the Invoice when being viewed or printed
                        from Procore. The entry and editing of this information will always occur at
                        the line item level of detail.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="mt-3 max-w-md">
                    <Label htmlFor="co-tier-count" className="sr-only">Change order workflow</Label>
                    <select
                      id="co-tier-count"
                      value={String(advancedSettings?.co_tier_count ?? 1)}
                      onChange={(e) =>
                        updateAdvancedSetting(
                          "co_tier_count",
                          e.target.value === "1" ? 1 : 2,
                        )
                      }
                      className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-[16px] shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="1">Prime Contract Change Order</option>
                      <option value="2">Line Items in each Potential Change Order (PCO)</option>
                    </select>
                  </div>
                </section>

                <section className="py-4">
                  <h4 className="text-lg font-semibold text-foreground">Payments Received</h4>
                  <div className="mt-4 flex items-center gap-3">
                    <Checkbox id="enable-payments" checked disabled />
                    <Label htmlFor="enable-payments" className="text-[15px] font-medium text-foreground">
                      Enable Payments
                    </Label>
                  </div>
                </section>

                <section className="flex py-6">
                  <Button onClick={saveAdvancedSettings} disabled={advancedSettingsSaving || !advancedSettings}>
                    {advancedSettingsSaving ? "Saving..." : "Save Advanced Settings"}
                  </Button>
                </section>
              </div>
            )}
          </div>
        )}
      </div>
      <PrimeContractDialogs
        showAddLineItemDialog={showAddLineItemDialog}
        setShowAddLineItemDialog={setShowAddLineItemDialog}
        lineItemForm={lineItemForm}
        setLineItemForm={setLineItemForm}
        budgetCodes={budgetCodes}
        budgetCodesLoading={budgetCodesLoading}
        setShowCreateBudgetCodeModal={setShowCreateBudgetCodeModal}
        onRequestCreateBudgetCode={handleRequestCreateBudgetCodeForLineItemForm}
        showCreateBudgetCodeModal={showCreateBudgetCodeModal}
        projectId={projectId}
        handleBudgetCodeCreated={handleBudgetCodeCreated}
        isSubmittingLineItem={isSubmittingLineItem}
        handleAddLineItem={handleAddLineItem}
        formatCurrency={formatCurrency}
        showNewCoDialog={showNewCoDialog}
        setShowNewCoDialog={setShowNewCoDialog}
        coForm={coForm}
        setCoForm={setCoForm}
        isSubmittingCo={isSubmittingCo}
        handleCreateCo={handleCreateCo}
        showRejectCoDialog={showRejectCoDialog}
        setShowRejectCoDialog={setShowRejectCoDialog}
        setRejectingCoId={setRejectingCoId}
        rejectionReason={rejectionReason}
        setRejectionReason={setRejectionReason}
        isRejectingCo={isRejectingCo}
        handleRejectCo={handleRejectCo}
        lineItemToDelete={lineItemToDelete}
        setLineItemToDelete={setLineItemToDelete}
        isDeletingLineItem={isDeletingLineItem}
        handleDeleteLineItem={handleDeleteLineItem}
      />
      {contract ? (
        <DocumentDeliveryDialog
          open={isDocumentDialogOpen}
          onOpenChange={setIsDocumentDialogOpen}
          initialTab={documentDialogTab}
          recordType="prime-contract"
          recordId={contract.id}
          number={contract.contract_number || "Prime Contract"}
          title={contract.title}
        />
      ) : null}
    </PageShell>
  );
}
