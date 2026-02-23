"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Calculator,
  Check,
  ChevronDown,
  ChevronRight,
  DollarSign,
  FileText,
  History,
  Mail,
  Plus,
  Settings,
  X,
  AlertTriangle,
} from "lucide-react";

import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header-unified";
import { cn } from "@/lib/utils";
import { TableLayout } from "@/components/layouts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BudgetCodeSelector } from "@/components/budget/budget-code-selector";
import { CreateBudgetCodeModal } from "@/app/(main)/[projectId]/budget/setup/components/CreateBudgetCodeModal";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useProjectTitle } from "@/hooks/useProjectTitle";
// Local type aligned with contract_change_orders DB table (UUID-based, for prime contracts)
interface PrimeContractCO {
  id: string;
  contract_id: string;
  change_order_number: string;
  description: string;
  amount: number;
  status: string;
  requested_by: string | null;
  requested_date: string;
  approved_by: string | null;
  approved_date: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}
import type { ContractLineItemWithCostCode } from "@/types/contract-line-items";

interface PaymentApplication {
  id: string;
  contract_id: string;
  project_id: number;
  application_number: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  amount: number;
  retention_amount: number;
  net_amount: number;
  period_from: string | null;
  period_to: string | null;
  submitted_at: string | null;
  submitted_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface Payment {
  id: string;
  contract_id: string;
  project_id: number;
  payment_application_id: string | null;
  payment_number: string | null;
  amount: number;
  payment_date: string;
  method: string | null;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  payment_application?: {
    id: string;
    application_number: string;
    amount: number;
    status: string;
  } | null;
}

interface VerticalMarkup {
  id: string;
  markup_type: string;
  percentage: number;
  calculation_order: number;
  compound: boolean;
  project_id: number;
}

interface MarkupCalculationResult {
  markup_type: string;
  percentage: number;
  compound: boolean;
  baseAmount: number;
  markupAmount: number;
  runningTotal: number;
}

interface MarkupCalculationResponse {
  baseAmount: number;
  calculations: MarkupCalculationResult[];
  totalMarkup: number;
  finalAmount: number;
}

interface Contract {
  id: string;
  contract_number: string | null;
  title: string;
  status: "draft" | "out_for_bid" | "out_for_signature" | "approved" | "complete" | "terminated";
  executed: boolean;
  executed_at: string | null;
  original_contract_value: number;
  revised_contract_value: number;
  start_date: string | null;
  end_date: string | null;
  substantial_completion_date: string | null;
  actual_completion_date: string | null;
  signed_contract_received_date: string | null;
  contract_termination_date: string | null;
  retention_percentage: number;
  payment_terms: string | null;
  billing_schedule: string | null;
  description: string | null;
  inclusions: string | null;
  exclusions: string | null;
  is_private: boolean;
  created_at: string;
  created_by: string | null;
  vendor_id: string | null;
  client_id: number | null;
  project_id: number;
  vendor?: { id: string; name: string } | null;
  client?: { id: number; name: string } | null;
  // Calculated financial fields from contract_financial_summary_mv
  approved_change_orders: number;
  pending_change_orders: number;
  draft_change_orders: number;
  pending_revised_contract_amount: number;
  invoiced_amount: number;
  payments_received: number;
  remaining_balance: number;
  percent_paid: number;
}

interface BudgetCode {
  id: string;
  code: string;
  description: string;
  costType: string | null;
  fullLabel: string;
  costTypeId?: string | null;
}

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
  const [lineItems, setLineItems] = useState<ContractLineItemWithCostCode[]>([]);
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
  const [invoiceForm, setInvoiceForm] = useState({
    application_number: "",
    amount: "",
    retention_amount: "",
    period_from: "",
    period_to: "",
    notes: "",
  });
  const [paymentForm, setPaymentForm] = useState({
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
  const [activeTab, setActiveTab] = useState("overview");
  const [showAddLineItemDialog, setShowAddLineItemDialog] = useState(false);
  const [lineItemForm, setLineItemForm] = useState({
    lineNumber: "",
    description: "",
    quantity: "1",
    unitCost: "0",
    unitOfMeasure: "",
    budgetCodeId: "",
  });
  const [isSubmittingLineItem, setIsSubmittingLineItem] = useState(false);
  const [budgetCodes, setBudgetCodes] = useState<BudgetCode[]>([]);
  const [budgetCodesLoading, setBudgetCodesLoading] = useState(false);
  const [showCreateBudgetCodeModal, setShowCreateBudgetCodeModal] =
    useState(false);

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
    if (!dateString) return "--";

    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZoneName: "short",
    });
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

  if (loading) {
    return (
      <>
        <PageHeader
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
        <PageHeader
          title="Prime Contract"
          description="Unable to load contract"
          breadcrumbs={[
            { label: "Prime Contracts", href: `/${projectId}/prime-contracts` },
            { label: "Contract Details" },
          ]}
        />
        <TableLayout>
          <Card className="p-[var(--card-padding)]">
            <div className="flex items-center gap-3 text-destructive">
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
      <PageHeader
        title={contract.title}
        description={
          contract.vendor
            ? `Contractor: ${contract.vendor.name}`
            : "No vendor assigned"
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

            <Button variant="outline" size="sm" onClick={handleEdit}>
              Edit Contract
            </Button>
          </div>
        }
      />

      {/* Site-standard tabs with border-bottom and brand orange */}
      <div className="px-4 sm:px-6 lg:px-8 mb-[var(--card-gap)]">
        <nav className="-mb-px flex overflow-x-auto border-b border-border" aria-label="Contract tabs">
          <div className="flex min-w-max space-x-6 md:space-x-8">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={cn(
                "group inline-flex items-center gap-2 whitespace-nowrap border-b-2 pb-3 pt-4 text-sm font-medium transition-colors",
                activeTab === "overview"
                  ? "border-brand text-brand"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
              )}
              aria-current={activeTab === "overview" ? "page" : undefined}
            >
              General
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("change-orders")}
              className={cn(
                "group inline-flex items-center gap-2 whitespace-nowrap border-b-2 pb-3 pt-4 text-sm font-medium transition-colors",
                activeTab === "change-orders"
                  ? "border-brand text-brand"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
              )}
              aria-current={activeTab === "change-orders" ? "page" : undefined}
            >
              <span>Change Orders</span>
              {changeOrdersCount > 0 && (
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium",
                    activeTab === "change-orders"
                      ? "bg-brand/10 text-brand"
                      : "bg-muted text-foreground",
                  )}
                >
                  {changeOrdersCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("invoices")}
              className={cn(
                "group inline-flex items-center gap-2 whitespace-nowrap border-b-2 pb-3 pt-4 text-sm font-medium transition-colors",
                activeTab === "invoices"
                  ? "border-brand text-brand"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
              )}
              aria-current={activeTab === "invoices" ? "page" : undefined}
            >
              Invoices
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("payments")}
              className={cn(
                "group inline-flex items-center gap-2 whitespace-nowrap border-b-2 pb-3 pt-4 text-sm font-medium transition-colors",
                activeTab === "payments"
                  ? "border-brand text-brand"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
              )}
              aria-current={activeTab === "payments" ? "page" : undefined}
            >
              Payments Received
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("emails")}
              className={cn(
                "group inline-flex items-center gap-2 whitespace-nowrap border-b-2 pb-3 pt-4 text-sm font-medium transition-colors",
                activeTab === "emails"
                  ? "border-brand text-brand"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
              )}
              aria-current={activeTab === "emails" ? "page" : undefined}
            >
              Emails
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={cn(
                "group inline-flex items-center gap-2 whitespace-nowrap border-b-2 pb-3 pt-4 text-sm font-medium transition-colors",
                activeTab === "history"
                  ? "border-brand text-brand"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
              )}
              aria-current={activeTab === "history" ? "page" : undefined}
            >
              Change History
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("financial-markup")}
              className={cn(
                "group inline-flex items-center gap-2 whitespace-nowrap border-b-2 pb-3 pt-4 text-sm font-medium transition-colors",
                activeTab === "financial-markup"
                  ? "border-brand text-brand"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
              )}
              aria-current={activeTab === "financial-markup" ? "page" : undefined}
            >
              Financial Markup
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("advanced-settings")}
              className={cn(
                "group inline-flex items-center gap-2 whitespace-nowrap border-b-2 pb-3 pt-4 text-sm font-medium transition-colors",
                activeTab === "advanced-settings"
                  ? "border-brand text-brand"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
              )}
              aria-current={activeTab === "advanced-settings" ? "page" : undefined}
            >
              Advanced Settings
            </button>
          </div>
        </nav>
      </div>

      <TableLayout>
        {activeTab === "overview" && (
          <div className="space-y-6 pb-20">
            <section className="rounded-2xl bg-background">
              <div className="px-6 pb-4 pt-3">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Prime Contract
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span>Contract #{contract.contract_number || contract.id}</span>
                      <span className="hidden sm:inline">•</span>
                      <span>
                        {contract.vendor
                          ? `Contractor: ${contract.vendor.name}`
                          : "No contractor assigned"}
                      </span>
                      <span className="hidden sm:inline">•</span>
                      <span>{contract.executed ? "Executed" : "Not executed"}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={getStatusBadgeVariant(contract.status)}>
                      {formatStatusLabel(contract.status)}
                    </Badge>
                    {contract.executed ? (
                      <Badge variant="secondary">Executed</Badge>
                    ) : (
                      <Badge variant="outline">Pending Execution</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-6 pb-6 pt-8">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                  <div className="space-y-6">
                    <div className="rounded-xl bg-muted/40 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold">Parties & Terms</h3>
                          <p className="text-sm text-muted-foreground">
                            Primary contract details and responsibilities
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex items-center gap-2"
                          onClick={() => setGeneralInfoOpen((prev) => !prev)}
                        >
                          {generalInfoOpen ? "Hide" : "Show"}
                          <ChevronRight
                            className={cn(
                              "h-4 w-4 transition-transform",
                              generalInfoOpen ? "rotate-90" : "rotate-0",
                            )}
                          />
                        </Button>
                      </div>
                      <Collapsible open={generalInfoOpen}>
                        <CollapsibleContent>
                          <dl className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                            <div>
                              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                                Contract #
                              </dt>
                              <dd className="mt-1 text-[15px] font-semibold leading-6">
                                {contract.contract_number || "Not set"}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                                Owner/Client
                              </dt>
                              <dd className="mt-1 text-[15px] font-semibold leading-6 text-blue-600 hover:underline cursor-pointer">
                                {contract.client?.name || "Not set"}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                                Contractor
                              </dt>
                              <dd className="mt-1 text-[15px] font-semibold leading-6 text-blue-600 hover:underline cursor-pointer">
                                {contract.vendor?.name || "Not set"}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                                Architect/Engineer
                              </dt>
                              <dd className="mt-1 text-[15px] font-semibold leading-6">Not set</dd>
                            </div>
                            <div>
                              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                                Default Retainage
                              </dt>
                              <dd className="mt-1 text-[15px] font-semibold leading-6">
                                {contract.retention_percentage ?? 0}%
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                                Payment Terms
                              </dt>
                              <dd className="mt-1 text-[15px] font-semibold leading-6">
                                {contract.payment_terms || "Not set"}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                                Billing Schedule
                              </dt>
                              <dd className="mt-1 text-[15px] font-semibold leading-6">
                                {contract.billing_schedule || "Not set"}
                              </dd>
                            </div>
                          </dl>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>

                    <div className="rounded-xl bg-muted/40 p-5">
                      <h3 className="text-base font-semibold">Scope Narrative</h3>
                      <p className="text-sm text-muted-foreground">
                        Written description and scope clarifications
                      </p>
                      <div className="mt-5 grid gap-6">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Description</p>
                          <p className="mt-2 text-[15px] leading-7 text-muted-foreground">
                            {contract.description || "Not set"}
                          </p>
                        </div>
                        <div className="grid gap-6 md:grid-cols-2">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Inclusions</p>
                            <p className="mt-2 text-[15px] leading-7 text-muted-foreground">
                              {contract.inclusions || "Not set"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Exclusions</p>
                            <p className="mt-2 text-[15px] leading-7 text-muted-foreground">
                              {contract.exclusions || "Not set"}
                            </p>
                          </div>
                        </div>
                        <div className="rounded-lg bg-muted/30 p-4">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Attachments</p>
                          <p className="mt-2 text-[15px] text-muted-foreground">Not set</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="rounded-xl bg-muted/40 p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-semibold">Financial Snapshot</h3>
                          <p className="text-sm text-muted-foreground">Current contract position</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex items-center gap-2"
                          onClick={() => setContractSummaryOpen((prev) => !prev)}
                        >
                          {contractSummaryOpen ? "Hide" : "Show"}
                          <ChevronRight
                            className={cn(
                              "h-4 w-4 transition-transform",
                              contractSummaryOpen ? "rotate-90" : "rotate-0",
                            )}
                          />
                        </Button>
                      </div>
                      <Collapsible open={contractSummaryOpen}>
                        <CollapsibleContent>
                          <dl className="mt-5 space-y-4 text-sm">
                            <div className="flex items-center justify-between">
                              <dt className="text-muted-foreground">Original Contract Amount</dt>
                              <dd className="text-right font-semibold tabular-nums">
                                {formatCurrency(contract.original_contract_value)}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between">
                              <dt className="text-muted-foreground">Revised Contract Amount</dt>
                              <dd className="text-right font-semibold tabular-nums">
                                {formatCurrency(contract.revised_contract_value)}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between">
                              <dt className="text-muted-foreground">Pending Change Orders</dt>
                              <dd className="text-right font-semibold tabular-nums">
                                {formatCurrency(contract.pending_change_orders)}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between">
                              <dt className="text-muted-foreground">Approved Change Orders</dt>
                              <dd className="text-right font-semibold tabular-nums">
                                {formatCurrency(contract.approved_change_orders)}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between">
                              <dt className="text-muted-foreground">Invoices</dt>
                              <dd className="text-right font-semibold tabular-nums">
                                {formatCurrency(contract.invoiced_amount)}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between">
                              <dt className="text-muted-foreground">Payments Received</dt>
                              <dd className="text-right font-semibold tabular-nums">
                                {formatCurrency(contract.payments_received)}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between">
                              <dt className="text-muted-foreground">Remaining Balance</dt>
                              <dd className="text-right font-semibold tabular-nums">
                                {formatCurrency(contract.remaining_balance)}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between pt-4">
                              <dt className="text-muted-foreground">Percent Paid</dt>
                              <dd className="text-right text-base font-semibold tabular-nums">{contract.percent_paid}%</dd>
                            </div>
                          </dl>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>

                    <div className="rounded-xl bg-muted/40 p-5">
                      <h3 className="text-base font-semibold">Key Dates</h3>
                      <p className="text-sm text-muted-foreground">Contract timeline milestones</p>
                      <dl className="mt-5 space-y-4 text-sm">
                        <div className="flex items-center justify-between">
                          <dt className="text-muted-foreground">Start Date</dt>
                          <dd className="text-right font-medium">
                            {contract.start_date ? formatDate(contract.start_date) : "Not set"}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between">
                          <dt className="text-muted-foreground">Estimated Completion</dt>
                          <dd className="text-right font-medium">
                            {contract.end_date ? formatDate(contract.end_date) : "Not set"}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between">
                          <dt className="text-muted-foreground">Substantial Completion</dt>
                          <dd className="text-right font-medium">
                            {contract.substantial_completion_date
                              ? formatDate(contract.substantial_completion_date)
                              : "Not set"}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between">
                          <dt className="text-muted-foreground">Actual Completion</dt>
                          <dd className="text-right font-medium">
                            {contract.actual_completion_date
                              ? formatDate(contract.actual_completion_date)
                              : "Not set"}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between">
                          <dt className="text-muted-foreground">Signed Contract Received</dt>
                          <dd className="text-right font-medium">
                            {contract.signed_contract_received_date
                              ? formatDate(contract.signed_contract_received_date)
                              : "Not set"}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between">
                          <dt className="text-muted-foreground">Contract Termination</dt>
                          <dd className="text-right font-medium">
                            {contract.contract_termination_date
                              ? formatDate(contract.contract_termination_date)
                              : "Not set"}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between pt-4">
                          <dt className="text-muted-foreground">Created</dt>
                          <dd className="text-right font-medium">{formatDate(contract.created_at)}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-xl bg-muted/40 px-6 py-6">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold">Schedule of Values</h3>
                  <p className="text-sm text-muted-foreground">
                    {lineItems.length} SOV line
                    {lineItems.length === 1 ? "" : "s"} on this contract
                  </p>
                </div>
                <Button size="sm" onClick={() => setShowAddLineItemDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add SOV Line
                </Button>
              </div>
              <div className="mt-4">
                {lineItemsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading schedule of values...
                  </div>
                ) : lineItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-[var(--group-gap)] opacity-50" />
                    <p>No SOV lines yet</p>
                    <p className="text-xs mt-2">
                      Add SOV lines with budget codes to track the contract value
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Line #</TableHead>
                        <TableHead>Budget Code</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>UOM</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Unit Cost</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.line_number}</TableCell>
                          <TableCell>
                            {item.cost_code?.code
                              ? `${item.cost_code.code} ${item.cost_code.name}`
                              : "--"}
                          </TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>{item.unit_of_measure || "--"}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.unit_cost)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.total_cost)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </section>
          </div>
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
                <Button variant="outline" size="sm">
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
                        <TableCell colSpan={3}></TableCell>
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
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
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
            <Dialog open={showAddInvoiceDialog} onOpenChange={setShowAddInvoiceDialog}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>New Invoice / Payment Application</DialogTitle>
                  <DialogDescription>
                    Create a payment application for this prime contract.
                  </DialogDescription>
                </DialogHeader>
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
                <DialogFooter>
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
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
                  <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
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
            <Dialog open={showAddPaymentDialog} onOpenChange={setShowAddPaymentDialog}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Record Payment Received</DialogTitle>
                  <DialogDescription>
                    Log a payment received against this prime contract.
                  </DialogDescription>
                </DialogHeader>
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
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
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
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
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
                <DialogFooter>
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
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
                    <div className="border rounded-lg p-3">
                      <p className="text-sm font-medium">GC Fee / Contractor&apos;s Fee</p>
                      <p className="text-xs text-muted-foreground">Typically 3-10%</p>
                    </div>
                    <div className="border rounded-lg p-3">
                      <p className="text-sm font-medium">Insurance</p>
                      <p className="text-xs text-muted-foreground">Typically 1-2%</p>
                    </div>
                    <div className="border rounded-lg p-3">
                      <p className="text-sm font-medium">Bond</p>
                      <p className="text-xs text-muted-foreground">Typically 0.5-2%</p>
                    </div>
                    <div className="border rounded-lg p-3">
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

      {/* Add Line Item Dialog */}
      <Dialog open={showAddLineItemDialog} onOpenChange={setShowAddLineItemDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Schedule of Values Line</DialogTitle>
            <DialogDescription>
              Add a new line to the Schedule of Values for this contract.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Budget Code</Label>
              <BudgetCodeSelector
                value={lineItemForm.budgetCodeId}
                onValueChange={(value) =>
                  setLineItemForm((prev) => ({ ...prev, budgetCodeId: value }))
                }
                budgetCodes={budgetCodes}
                loading={budgetCodesLoading}
                onCreateNew={() => setShowCreateBudgetCodeModal(true)}
                placeholder="Select budget code..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="line-number">
                Line Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="line-number"
                type="number"
                min="1"
                step="1"
                value={lineItemForm.lineNumber}
                onChange={(e) =>
                  setLineItemForm({ ...lineItemForm, lineNumber: e.target.value })
                }
                placeholder="1"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                value={lineItemForm.description}
                onChange={(e) =>
                  setLineItemForm({ ...lineItemForm, description: e.target.value })
                }
                placeholder="Enter line item description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  step="0.01"
                  value={lineItemForm.quantity}
                  onChange={(e) =>
                    setLineItemForm({ ...lineItemForm, quantity: e.target.value })
                  }
                  placeholder="1"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="unit-cost">Unit Cost</Label>
                <Input
                  id="unit-cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={lineItemForm.unitCost}
                  onChange={(e) =>
                    setLineItemForm({ ...lineItemForm, unitCost: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="unit-of-measure">Unit of Measure</Label>
              <Input
                id="unit-of-measure"
                value={lineItemForm.unitOfMeasure}
                onChange={(e) =>
                  setLineItemForm({ ...lineItemForm, unitOfMeasure: e.target.value })
                }
                placeholder="e.g., SF, LF, EA"
              />
            </div>

            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="font-medium mb-1">Total Cost</p>
              <p className="text-lg">
                {formatCurrency(
                  parseFloat(lineItemForm.quantity || "0") *
                    parseFloat(lineItemForm.unitCost || "0")
                )}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddLineItemDialog(false)}
              disabled={isSubmittingLineItem}
            >
              Cancel
            </Button>
            <Button onClick={handleAddLineItem} disabled={isSubmittingLineItem}>
              {isSubmittingLineItem ? "Adding..." : "Add SOV Line"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateBudgetCodeModal
        open={showCreateBudgetCodeModal}
        onOpenChange={setShowCreateBudgetCodeModal}
        projectId={projectId}
        onSuccess={handleBudgetCodeCreated}
      />
    </>
  );
}
