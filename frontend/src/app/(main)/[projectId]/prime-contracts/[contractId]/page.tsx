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

import { PageHeader } from "@/components/layout/page-header-unified";
import { cn } from "@/lib/utils";
import { TableLayout } from "@/components/layouts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BudgetCodeSelector } from "@/components/budget/budget-code-selector";
import { CreateBudgetCodeModal } from "@/app/(main)/[projectId]/budget/setup/components/CreateBudgetCodeModal";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import type { ContractChangeOrder } from "@/types/contract-change-orders";
import type { ContractLineItemWithCostCode } from "@/types/contract-line-items";

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
  const [changeOrders, setChangeOrders] = useState<ContractChangeOrder[]>([]);
  const [changeOrdersLoading, setChangeOrdersLoading] = useState(false);
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
      alert("Line number and description are required");
      return;
    }

    const selectedBudgetCode = budgetCodes.find(
      (code) => code.id === lineItemForm.budgetCodeId,
    );
    const parsedCostCodeId = selectedBudgetCode?.code
      ? Number.parseInt(selectedBudgetCode.code, 10)
      : null;

    if (selectedBudgetCode?.code && Number.isNaN(parsedCostCodeId)) {
      alert(
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
      alert(err instanceof Error ? err.message : "Failed to create line item");
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
          <div className="space-y-8">
            <section className="rounded-2xl border border-border bg-background shadow-sm">
              <div className="border-b border-border px-6 py-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Prime Contract
                    </p>
                    <h2 className="text-2xl font-semibold leading-tight">
                      {contract.title}
                    </h2>
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

              <div className="px-6 py-6">
                <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                  <div className="space-y-8">
                    <div className="rounded-xl border border-border bg-muted/10 p-5">
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
                              <dd className="mt-1 text-sm font-semibold">
                                {contract.contract_number || "--"}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                                Owner/Client
                              </dt>
                              <dd className="mt-1 text-sm font-semibold text-blue-600 hover:underline cursor-pointer">
                                {contract.client?.name || "--"}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                                Contractor
                              </dt>
                              <dd className="mt-1 text-sm font-semibold text-blue-600 hover:underline cursor-pointer">
                                {contract.vendor?.name || "--"}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                                Architect/Engineer
                              </dt>
                              <dd className="mt-1 text-sm font-semibold">--</dd>
                            </div>
                            <div>
                              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                                Default Retainage
                              </dt>
                              <dd className="mt-1 text-sm font-semibold">
                                {contract.retention_percentage ?? 0}%
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                                Payment Terms
                              </dt>
                              <dd className="mt-1 text-sm font-semibold">
                                {contract.payment_terms || "--"}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                                Billing Schedule
                              </dt>
                              <dd className="mt-1 text-sm font-semibold">
                                {contract.billing_schedule || "--"}
                              </dd>
                            </div>
                          </dl>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>

                    <div className="rounded-xl border border-border bg-background p-5">
                      <h3 className="text-base font-semibold">Scope Narrative</h3>
                      <p className="text-sm text-muted-foreground">
                        Written description and scope clarifications
                      </p>
                      <div className="mt-5 grid gap-6">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Description</p>
                          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                            {contract.description || "--"}
                          </p>
                        </div>
                        <div className="grid gap-6 md:grid-cols-2">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Inclusions</p>
                            <p className="mt-2 text-sm text-muted-foreground">
                              {contract.inclusions || "--"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Exclusions</p>
                            <p className="mt-2 text-sm text-muted-foreground">
                              {contract.exclusions || "--"}
                            </p>
                          </div>
                        </div>
                        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Attachments</p>
                          <p className="mt-2 text-sm text-muted-foreground">--</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="rounded-xl border border-border bg-muted/30 p-5">
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
                              <dd className="font-semibold">
                                {formatCurrency(contract.original_contract_value)}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between">
                              <dt className="text-muted-foreground">Revised Contract Amount</dt>
                              <dd className="font-semibold">
                                {formatCurrency(contract.revised_contract_value)}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between">
                              <dt className="text-muted-foreground">Pending Change Orders</dt>
                              <dd className="font-semibold">
                                {formatCurrency(contract.pending_change_orders)}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between">
                              <dt className="text-muted-foreground">Approved Change Orders</dt>
                              <dd className="font-semibold">
                                {formatCurrency(contract.approved_change_orders)}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between">
                              <dt className="text-muted-foreground">Invoices</dt>
                              <dd className="font-semibold">
                                {formatCurrency(contract.invoiced_amount)}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between">
                              <dt className="text-muted-foreground">Payments Received</dt>
                              <dd className="font-semibold">
                                {formatCurrency(contract.payments_received)}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between">
                              <dt className="text-muted-foreground">Remaining Balance</dt>
                              <dd className="font-semibold">
                                {formatCurrency(contract.remaining_balance)}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between border-t border-border pt-4">
                              <dt className="text-muted-foreground">Percent Paid</dt>
                              <dd className="text-base font-semibold">{contract.percent_paid}%</dd>
                            </div>
                          </dl>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>

                    <div className="rounded-xl border border-border bg-background p-5">
                      <h3 className="text-base font-semibold">Key Dates</h3>
                      <p className="text-sm text-muted-foreground">Contract timeline milestones</p>
                      <dl className="mt-5 space-y-4 text-sm">
                        <div className="flex items-center justify-between">
                          <dt className="text-muted-foreground">Start Date</dt>
                          <dd className="font-medium">
                            {contract.start_date ? formatDate(contract.start_date) : "--"}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between">
                          <dt className="text-muted-foreground">Estimated Completion</dt>
                          <dd className="font-medium">
                            {contract.end_date ? formatDate(contract.end_date) : "--"}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between">
                          <dt className="text-muted-foreground">Substantial Completion</dt>
                          <dd className="font-medium">
                            {contract.substantial_completion_date
                              ? formatDate(contract.substantial_completion_date)
                              : "--"}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between">
                          <dt className="text-muted-foreground">Actual Completion</dt>
                          <dd className="font-medium">
                            {contract.actual_completion_date
                              ? formatDate(contract.actual_completion_date)
                              : "--"}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between">
                          <dt className="text-muted-foreground">Signed Contract Received</dt>
                          <dd className="font-medium">
                            {contract.signed_contract_received_date
                              ? formatDate(contract.signed_contract_received_date)
                              : "--"}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between">
                          <dt className="text-muted-foreground">Contract Termination</dt>
                          <dd className="font-medium">
                            {contract.contract_termination_date
                              ? formatDate(contract.contract_termination_date)
                              : "--"}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between border-t border-border pt-4">
                          <dt className="text-muted-foreground">Created</dt>
                          <dd className="font-medium">{formatDate(contract.created_at)}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <Card className="shadow-sm">
              <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Schedule of Values</CardTitle>
                  <CardDescription>
                    {lineItems.length} SOV line
                    {lineItems.length === 1 ? "" : "s"} on this contract
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddLineItemDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add SOV Line
                </Button>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
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
                            {co.co_number || "--"}
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
                            {co.approved_at
                              ? new Date(co.approved_at).toLocaleDateString()
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
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Invoices</h3>
                <p className="text-sm text-muted-foreground">Invoices for this contract</p>
              </div>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-[var(--group-gap)] opacity-50" />
                <p>Invoices will be displayed here</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "payments" && (
          <div>
            <div className="bg-background">
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Payments Received</h3>
                <p className="text-sm text-muted-foreground">Payment history for this contract</p>
              </div>
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-[var(--group-gap)] opacity-50" />
                <p>Payment history will be displayed here</p>
              </div>
            </div>
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
