"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Calculator,
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
} from "lucide-react";

import { toast } from "sonner";

import { ProjectPageHeader } from "@/components/layout";
import { TableLayout } from "@/components/layouts";
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
import { useProjectTitle } from "@/hooks/useProjectTitle";
import { PrimeContractTabs } from "./components/PrimeContractTabs";
import { PrimeContractOverviewTab } from "./components/PrimeContractOverviewTab";
import { PrimeContractDialogs } from "./components/PrimeContractDialogs";
import type {
  BudgetCode,
  ChangeOrderFormState,
  Contract,
  ContractAttachment,
  ContractLineItem,
  ContractTab,
  InvoiceFormState,
  LineItemFormState,
  MarkupCalculationResponse,
  Payment,
  PaymentApplication,
  PaymentFormState,
  PrimeContractCO,
  VerticalMarkup,
} from "./types";

export default function ProjectContractDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const contractId = params.contractId as string;

  useProjectTitle("Prime Contract");

  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generalInfoOpen, setGeneralInfoOpen] = useState(true);
  const [contractSummaryOpen, setContractSummaryOpen] = useState(true);
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
  const [markupsLoading, setMarkupsLoading] = useState(false);
  const [previewBaseAmount, setPreviewBaseAmount] = useState<string>("10000");
  const [calculationResult, setCalculationResult] = useState<MarkupCalculationResponse | null>(null);
  const [calculationLoading, setCalculationLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ContractTab>("overview");
  const [isSovFullscreen, setIsSovFullscreen] = useState(false);
  const [isSovOpen, setIsSovOpen] = useState(true);
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
    status: "draft" as "draft" | "pending",
  });
  const [isSubmittingCo, setIsSubmittingCo] = useState(false);
  const [showRejectCoDialog, setShowRejectCoDialog] = useState(false);
  const [rejectingCoId, setRejectingCoId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejectingCo, setIsRejectingCo] = useState(false);

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
        const response = await fetch(
          `/api/projects/${projectId}/contracts/${contractId}/change-orders`,
        );

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        setChangeOrders(data || []);
      } catch (err) {

        console.error("Failed to load data:", err);

        // Intentionally swallowed: component shows appropriate state on error

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
        setVerticalMarkups(data.markups || []);
      } catch (err) {

        console.error("Failed to load data:", err);

        // Intentionally swallowed: component shows appropriate state on error

      } finally {
        setMarkupsLoading(false);
      }
    };

    fetchVerticalMarkups();
  }, [contract, projectId]);

  // Calculate markup preview when base amount changes or markups load
  const calculateMarkupPreview = async () => {
    const baseAmount = parseFloat(previewBaseAmount);
    if (isNaN(baseAmount) || baseAmount <= 0) {
      setCalculationResult(null);
      return;
    }

    try {
      setCalculationLoading(true);
      const response = await fetch(
        `/api/projects/${projectId}/vertical-markup/calculate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ baseAmount }),
        }
      );

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      setCalculationResult(data);
    } catch (err) {

      console.error("Failed to load data:", err);

      // Intentionally swallowed: component shows appropriate state on error

    } finally {
      setCalculationLoading(false);
    }
  };

  const handleBack = () => {
    router.push(`/${projectId}/prime-contracts`);
  };

  const handleEdit = () => {
    router.push(`/${projectId}/prime-contracts/${contractId}/edit`);
  };

  const handleAddLineItem = async () => {
    if (!lineItemForm.lineNumber || !lineItemForm.description) {
      toast.error("Line number and description are required");
      return;
    }

    const selectedBudgetCode = budgetCodes.find(
      (code) => code.id === lineItemForm.budgetCodeId,
    );
    const parsedCostCodeId = selectedBudgetCode?.code
      ? Number.parseInt(selectedBudgetCode.code, 10)
      : null;

    if (selectedBudgetCode?.code && Number.isNaN(parsedCostCodeId)) {
      toast.error(
        "Selected budget code could not be applied. Please choose a valid budget code.",
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
            cost_code_id: parsedCostCodeId,
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
          url: newAttachment.url,
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
      setCoForm({ change_order_number: "", description: "", amount: "", status: "draft" });
      toast.success("Change order created successfully");
    } catch {
      toast.error("Failed to create change order");
    } finally {
      setIsSubmittingCo(false);
    }
  };

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
      setLineItemForm((prev) => ({ ...prev, budgetCodeId }));
    } finally {
      setBudgetCodesLoading(false);
    }
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
    return value
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
  const sovTotal = useMemo(
    () => lineItems.reduce((sum, item) => sum + (item.total_cost ?? 0), 0),
    [lineItems],
  );
  const sovBilledToDateTotal = sovTotal;
  const sovRemainingTotal = 0;

  if (loading) {
    return (
      <>
        <ProjectPageHeader
          title="Prime Contract"
          description="Loading contract details..."
        />
        <TableLayout>
          <Skeleton className="h-96" />
        </TableLayout>
      </>
    );
  }

  if (error || !contract) {
    return (
      <>
        <ProjectPageHeader
          title="Prime Contract"
          description="Unable to load contract"
          breadcrumbs={[
            { label: "Prime Contracts", href: `/${projectId}/prime-contracts` },
            { label: "Contract Details" },
          ]}
        />
        <TableLayout>
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
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Contracts
            </Button>
          </Card>
        </TableLayout>
      </>
    );
  }

  return (
    <>
      <ProjectPageHeader
        title={`${contract.title} - #${contract.contract_number || contract.id.slice(0, 8)}`}
        description={
          contract.contractor
            ? `Contractor: ${contract.contractor.name}`
            : contract.vendor
              ? `Contractor: ${contract.vendor.name}`
              : "No contractor assigned"
        }
        breadcrumbs={[
          { label: "Prime Contracts", href: `/${projectId}/prime-contracts` },
          { label: `Contract #${contract.contract_number || contract.id}` },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    router.push(
                      `/form-change-event?projectId=${projectId}&contractId=${contractId}`,
                    )
                  }
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Change Event
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    router.push(
                      `/form-change-order?projectId=${projectId}&contractId=${contractId}`,
                    )
                  }
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Change Order
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    router.push(
                      `/form-purchase-order?projectId=${projectId}&contractId=${contractId}`,
                    )
                  }
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Purchase Order
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    router.push(
                      `/form-subcontract?projectId=${projectId}&contractId=${contractId}`,
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
              onClick={() => setActiveTab("emails")}
              aria-label="Email"
              title="Email"
            >
              <Mail className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.print()}
              aria-label="Export"
              title="Export"
            >
              <Download className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={handleEdit}
              aria-label="Edit Contract"
              title="Edit Contract"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <PrimeContractTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        changeOrdersCount={changeOrdersCount}
        paymentApplicationsCount={paymentApplications.length}
        paymentsCount={payments.length}
      />

      <TableLayout>
        <PrimeContractOverviewTab
          activeTab={activeTab}
          contract={contract}
          generalInfoOpen={generalInfoOpen}
          setGeneralInfoOpen={setGeneralInfoOpen}
          contractSummaryOpen={contractSummaryOpen}
          setContractSummaryOpen={setContractSummaryOpen}
          attachments={attachments}
          attachmentsLoading={attachmentsLoading}
          isUploadingAttachment={isUploadingAttachment}
          handleUploadAttachment={handleUploadAttachment}
          formatDate={formatDate}
          getTextValue={getTextValue}
          inclusionsList={inclusionsList}
          exclusionsList={exclusionsList}
          formatStatusLabel={formatStatusLabel}
          formatCurrency={formatCurrency}
          isSovFullscreen={isSovFullscreen}
          setIsSovFullscreen={setIsSovFullscreen}
          isSovOpen={isSovOpen}
          setIsSovOpen={setIsSovOpen}
          lineItemsLoading={lineItemsLoading}
          lineItems={lineItems}
          setLineItemToDelete={setLineItemToDelete}
          sovTotal={sovTotal}
          sovBilledToDateTotal={sovBilledToDateTotal}
          sovRemainingTotal={sovRemainingTotal}
          setShowAddLineItemDialog={setShowAddLineItemDialog}
        />

        
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
                  <Plus className="h-4 w-4 mr-2" />
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
                            {co.status !== "approved" && co.status !== "rejected" && (
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs text-green-700 border-green-300 hover:bg-green-50"
                                  onClick={() => handleApproveCo(co.id)}
                                >
                                  <Check className="h-3 w-3 mr-1" />
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
                              </div>
                            )}
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
                  <Plus className="h-4 w-4 mr-2" />
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
                  <Plus className="h-4 w-4 mr-2" />
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
          <div>
            <div className="space-y-6">
              {/* Markup Overview */}
              <div className="bg-background">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">Financial Markup</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure markup percentages applied to change orders on this contract
                  </p>
                </div>
                <div>
                  <div className="space-y-6">
                    {/* Explanation */}
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium mb-2">About Financial Markup</h4>
                      <p className="text-sm text-muted-foreground">
                        Financial markup represents the difference between the cost of work and the sales price,
                        accounting for overhead expenses and profit. Markups are applied to Prime Contract Change Orders (PCCOs).
                      </p>
                    </div>

                    {/* Markup Types Explanation */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border rounded-lg p-4">
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          Horizontal Markup
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Calculates markup on individual line items. Markup amounts appear in the same row as each line item on the Schedule of Values.
                        </p>
                      </div>
                      <div className="border rounded-lg p-4">
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                          Vertical Markup
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Calculates markup as a subtotal on all line items. Markup amounts appear after the subtotal on the Schedule of Values.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Vertical Markup Configuration */}
              <div className="bg-background">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Vertical Markup Configuration</h3>
                    <p className="text-sm text-muted-foreground">
                      Project-level markup settings applied to change orders
                    </p>
                  </div>
                  <Button variant="outline" size="sm" disabled>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Markup
                  </Button>
                </div>
                <div>
                  {markupsLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Loading markup settings...</p>
                    </div>
                  ) : verticalMarkups.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calculator className="h-12 w-12 mx-auto mb-[var(--group-gap)] opacity-50" />
                      <p>No markup items configured</p>
                      <p className="text-xs mt-2">
                        Add markup items like GC Fee, Insurance, Bond, or Overhead to apply to change orders.
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order</TableHead>
                          <TableHead>Markup Type</TableHead>
                          <TableHead className="text-right">Percentage</TableHead>
                          <TableHead>Compound</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {verticalMarkups
                          .sort((a, b) => a.calculation_order - b.calculation_order)
                          .map((markup) => (
                            <TableRow key={markup.id}>
                              <TableCell className="font-medium">
                                {markup.calculation_order}
                              </TableCell>
                              <TableCell>{markup.markup_type}</TableCell>
                              <TableCell className="text-right">
                                {markup.percentage.toFixed(3)}%
                              </TableCell>
                              <TableCell>
                                {markup.compound ? (
                                  <Badge variant="secondary">Compounds Above</Badge>
                                ) : (
                                  <span className="text-muted-foreground">Base Only</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>

              {/* Markup Calculation Preview */}
              {verticalMarkups.length > 0 && (
                <div className="bg-background" data-testid="markup-calculation-preview">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold">Calculation Preview</h3>
                    <p className="text-sm text-muted-foreground">
                      Test how markups will be applied to a change order amount
                    </p>
                  </div>
                  <div>
                    <div className="space-y-6">
                      {/* Input Section */}
                      <div className="flex items-end gap-4">
                        <div className="flex-1 max-w-xs">
                          <Label htmlFor="preview-amount">Base Amount (Change Order Cost)</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-muted-foreground">$</span>
                            <Input
                              id="preview-amount"
                              type="number"
                              value={previewBaseAmount}
                              onChange={(e) => setPreviewBaseAmount(e.target.value)}
                              placeholder="10000"
                              data-testid="markup-preview-input"
                            />
                          </div>
                        </div>
                        <Button
                          onClick={calculateMarkupPreview}
                          disabled={calculationLoading}
                          data-testid="calculate-markup-btn"
                        >
                          <Calculator className="h-4 w-4 mr-2" />
                          {calculationLoading ? "Calculating..." : "Calculate"}
                        </Button>
                      </div>

                      {/* Calculation Results */}
                      {calculationResult && (
                        <div className="space-y-4" data-testid="markup-calculation-results">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Markup Type</TableHead>
                                <TableHead className="text-right">Percentage</TableHead>
                                <TableHead>Calculation Base</TableHead>
                                <TableHead className="text-right">Markup Amount</TableHead>
                                <TableHead className="text-right">Running Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {/* Base Amount Row */}
                              <TableRow className="bg-muted/30">
                                <TableCell className="font-medium">Base Amount</TableCell>
                                <TableCell className="text-right">--</TableCell>
                                <TableCell>--</TableCell>
                                <TableCell className="text-right">--</TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatCurrency(calculationResult.baseAmount)}
                                </TableCell>
                              </TableRow>
                              {calculationResult.calculations.map((calc, index) => (
                                <TableRow key={index} data-testid={`markup-row-${index}`}>
                                  <TableCell>{calc.markup_type}</TableCell>
                                  <TableCell className="text-right">{calc.percentage.toFixed(3)}%</TableCell>
                                  <TableCell>
                                    {calc.compound ? (
                                      <span className="text-xs text-muted-foreground">
                                        Running Total ({formatCurrency(calc.baseAmount)})
                                      </span>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">
                                        Base Only ({formatCurrency(calc.baseAmount)})
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right text-green-600" data-testid={`markup-amount-${index}`}>
                                    +{formatCurrency(calc.markupAmount)}
                                  </TableCell>
                                  <TableCell className="text-right font-medium">
                                    {formatCurrency(calc.runningTotal)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                            <tfoot>
                              <TableRow className="bg-muted font-medium">
                                <TableCell colSpan={3}>Total with Markup</TableCell>
                                <TableCell className="text-right text-green-600" data-testid="total-markup">
                                  +{formatCurrency(calculationResult.totalMarkup)}
                                </TableCell>
                                <TableCell className="text-right text-lg" data-testid="final-amount">
                                  {formatCurrency(calculationResult.finalAmount)}
                                </TableCell>
                              </TableRow>
                            </tfoot>
                          </Table>

                          {/* Summary */}
                          <div className="bg-muted/50 p-4 rounded-lg">
                            <p className="text-sm">
                              <strong>Summary:</strong> A change order with base cost of{" "}
                              <strong>{formatCurrency(calculationResult.baseAmount)}</strong> would have{" "}
                              <strong>{formatCurrency(calculationResult.totalMarkup)}</strong> in markup applied,
                              resulting in a total billable amount of{" "}
                              <strong>{formatCurrency(calculationResult.finalAmount)}</strong>.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Common Markup Categories Reference */}
              <div className="bg-background">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">Common Markup Categories</h3>
                  <p className="text-sm text-muted-foreground">
                    Typical markup items used in construction contracts
                  </p>
                </div>
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="border rounded-lg p-4">
                      <p className="text-sm font-medium">GC Fee / Contractor&apos;s Fee</p>
                      <p className="text-xs text-muted-foreground">Typically 3-10%</p>
                    </div>
                    <div className="border rounded-lg p-4">
                      <p className="text-sm font-medium">Insurance</p>
                      <p className="text-xs text-muted-foreground">Typically 1-2%</p>
                    </div>
                    <div className="border rounded-lg p-4">
                      <p className="text-sm font-medium">Bond</p>
                      <p className="text-xs text-muted-foreground">Typically 0.5-2%</p>
                    </div>
                    <div className="border rounded-lg p-4">
                      <p className="text-sm font-medium">Overhead</p>
                      <p className="text-xs text-muted-foreground">Typically 5-15%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "advanced-settings" && (
          <div>
            <div className="bg-background">
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Advanced Settings</h3>
                <p className="text-sm text-muted-foreground">Contract configuration and permissions</p>
              </div>
              <div>
                <div className="space-y-6">
                  {/* Inclusions & Exclusions */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Inclusions & Exclusions</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Inclusions</p>
                        <p className="text-sm">{contract.inclusions || "--"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Exclusions</p>
                        <p className="text-sm">{contract.exclusions || "--"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Contract Privacy */}
                  <div className="space-y-4 border-t pt-4">
                    <h3 className="text-sm font-medium">Contract Privacy</h3>
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        This contract is {contract.is_private ? "private" : "visible to all project members"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </TableLayout>

      <PrimeContractDialogs
        showAddLineItemDialog={showAddLineItemDialog}
        setShowAddLineItemDialog={setShowAddLineItemDialog}
        lineItemForm={lineItemForm}
        setLineItemForm={setLineItemForm}
        budgetCodes={budgetCodes}
        budgetCodesLoading={budgetCodesLoading}
        setShowCreateBudgetCodeModal={setShowCreateBudgetCodeModal}
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
    </>
  );
}
