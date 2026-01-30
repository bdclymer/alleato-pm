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
} from "lucide-react";

import { ProjectPageHeader } from "@/components/layout";
import { TableLayout } from "@/components/layouts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
      <ProjectPageHeader
        title={contract.title}
        description={contract.vendor?.name || "No vendor assigned"}
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

            <Button variant="outline" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button variant="default" size="sm" onClick={handleEdit}>
              Edit Contract
            </Button>
          </div>
        }
      />

      <TableLayout>
        <Tabs defaultValue="overview">
          <TabsList className="mb-[var(--card-gap)]">
            <TabsTrigger value="overview">General</TabsTrigger>
            <TabsTrigger value="change-orders">
              Change Orders {changeOrdersCount > 0 && `(${changeOrdersCount})`}
            </TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="payments">Payments Received</TabsTrigger>
            <TabsTrigger value="emails">Emails</TabsTrigger>
            <TabsTrigger value="history">Change History</TabsTrigger>
            <TabsTrigger value="financial-markup">Financial Markup</TabsTrigger>
            <TabsTrigger value="advanced-settings">Advanced Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0 space-y-[var(--card-gap)]">
            <div className="grid gap-[var(--card-gap)] lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>General Info</CardTitle>
                    <CardDescription>Prime contract details</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2"
                    onClick={() => setGeneralInfoOpen((prev) => !prev)}
                  >
                    {generalInfoOpen ? "Hide" : "Show"}
                    <ChevronRight
                      className={`h-4 w-4 transition-transform ${generalInfoOpen ? "rotate-90" : "rotate-0"}`}
                    />
                  </Button>
                </CardHeader>
                <CardContent>
                  <Collapsible open={generalInfoOpen}>
                    <CollapsibleContent>
                      <div className="grid grid-cols-3 gap-[var(--group-gap)]">
                        {/* Row 1 */}
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">Contract #</p>
                          <p className="font-medium">
                            {contract.contract_number || "--"}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">Owner/Client</p>
                          <p className="font-medium text-blue-600 hover:underline cursor-pointer">
                            {contract.client?.name || "--"}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">Title</p>
                          <p className="font-medium">{contract.title}</p>
                        </div>

                        {/* Row 2 */}
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">Status</p>
                          <Badge variant={getStatusBadgeVariant(contract.status)}>
                            {formatStatusLabel(contract.status)}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">Executed</p>
                          <div className="flex items-center">
                            {contract.executed ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <X className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">Default Retainage</p>
                          <p className="font-medium">{contract.retention_percentage ?? 0}%</p>
                        </div>

                        {/* Row 3 */}
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">Contractor</p>
                          <p className="font-medium text-blue-600 hover:underline cursor-pointer">
                            {contract.vendor?.name || "--"}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">Architect/Engineer</p>
                          <p className="font-medium">--</p>
                        </div>
                        <div className="space-y-2 col-span-1" />

                        {/* Row 4 - Full width fields */}
                        <div className="space-y-2 col-span-3">
                          <p className="text-xs text-muted-foreground">Description</p>
                          <p className="text-sm text-muted-foreground">
                            {contract.description || "--"}
                          </p>
                        </div>

                        {/* Row 5 - Attachments placeholder */}
                        <div className="space-y-2 col-span-3">
                          <p className="text-xs text-muted-foreground">Attachments</p>
                          <p className="text-sm text-muted-foreground">--</p>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Contract Summary</CardTitle>
                  <CardDescription>Financial overview</CardDescription>
                </CardHeader>
                <CardContent>
                  <Collapsible open={contractSummaryOpen}>
                    <CollapsibleTrigger className="sr-only">
                      Toggle contract summary
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      {/* Financial summary grid matching Procore layout */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* Row 1 */}
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Original Contract Amount</p>
                          <p className="text-lg font-semibold">
                            {formatCurrency(contract.original_contract_value)}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Pending Change Orders</p>
                          <p className="text-lg font-semibold">
                            {formatCurrency(contract.pending_change_orders)}
                          </p>
                        </div>

                        {/* Row 2 */}
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Invoices</p>
                          <p className="text-lg font-semibold">
                            {formatCurrency(contract.invoiced_amount)}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Payments Received</p>
                          <p className="text-lg font-semibold">
                            {formatCurrency(contract.payments_received)}
                          </p>
                        </div>

                        {/* Row 3 */}
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Approved Change Orders</p>
                          <p className="text-lg font-semibold">
                            {formatCurrency(contract.approved_change_orders)}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Pending Revised Contract Amount</p>
                          <p className="text-lg font-semibold">
                            {formatCurrency(contract.pending_revised_contract_amount)}
                          </p>
                        </div>

                        {/* Row 4 */}
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Remaining Balance</p>
                          <p className="text-lg font-semibold">
                            {formatCurrency(contract.remaining_balance)}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Percent Paid</p>
                          <p className="text-lg font-semibold">
                            {contract.percent_paid}%
                          </p>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-[var(--card-gap)] lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Line Items</CardTitle>
                      <CardDescription>
                        {lineItems.length} line item
                        {lineItems.length === 1 ? "" : "s"} on this contract
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {lineItemsLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading line items...
                    </div>
                  ) : lineItems.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-[var(--group-gap)] opacity-50" />
                      <p>No line items yet</p>
                      <p className="text-xs mt-2">
                        Add line items to track Schedule of Values
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Line #</TableHead>
                          <TableHead>Cost Code</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">Unit Cost</TableHead>
                          <TableHead className="text-right">Total</TableHead>
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
                            <TableCell className="text-right">
                              {item.quantity}
                            </TableCell>
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

              <Card>
                <CardHeader>
                  <CardTitle>Contract Dates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-[var(--group-gap)]">
                    <div>
                      <p className="text-xs text-muted-foreground">Start Date</p>
                      <p className="text-sm">
                        {contract.start_date ? formatDate(contract.start_date) : "--"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Estimated Completion</p>
                      <p className="text-sm">
                        {contract.end_date ? formatDate(contract.end_date) : "--"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Substantial Completion</p>
                      <p className="text-sm">
                        {contract.substantial_completion_date ? formatDate(contract.substantial_completion_date) : "--"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Actual Completion</p>
                      <p className="text-sm">
                        {contract.actual_completion_date ? formatDate(contract.actual_completion_date) : "--"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Signed Contract Received</p>
                      <p className="text-sm">
                        {contract.signed_contract_received_date ? formatDate(contract.signed_contract_received_date) : "--"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Contract Termination</p>
                      <p className="text-sm">
                        {contract.contract_termination_date ? formatDate(contract.contract_termination_date) : "--"}
                      </p>
                    </div>
                    <div className="border-t pt-[var(--group-gap)]">
                      <p className="text-xs text-muted-foreground">Created</p>
                      <p className="text-sm">{formatDate(contract.created_at)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="change-orders" className="mt-0 p-[var(--card-padding)]">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Change Orders</CardTitle>
                    <CardDescription>
                      {changeOrdersCount} change order
                      {changeOrdersCount === 1 ? "" : "s"} • {approvedChangeOrders.length} approved •
                      {" "}
                      {pendingChangeOrders.length} pending • {rejectedChangeOrders.length} rejected
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    New Change Order
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
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
                            {co.change_order_number}
                          </TableCell>
                          <TableCell>{co.description}</TableCell>
                          <TableCell className="text-right">
                            <span className={co.amount < 0 ? "text-red-600" : ""}>
                              {formatCurrency(co.amount)}
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
                              {co.status.charAt(0).toUpperCase() + co.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(co.requested_date).toLocaleDateString()}
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
                            changeOrders.reduce((sum, co) => sum + co.amount, 0),
                          )}
                        </TableCell>
                        <TableCell colSpan={3}></TableCell>
                      </TableRow>
                    </tfoot>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices" className="mt-0 p-[var(--card-padding)]">
            <Card>
              <CardHeader>
                <CardTitle>Invoices</CardTitle>
                <CardDescription>Invoices for this contract</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-[var(--group-gap)] opacity-50" />
                  <p>Invoices will be displayed here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="mt-0 p-[var(--card-padding)]">
            <Card>
              <CardHeader>
                <CardTitle>Payments Received</CardTitle>
                <CardDescription>Payment history for this contract</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-[var(--group-gap)] opacity-50" />
                  <p>Payment history will be displayed here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="emails" className="mt-0 p-[var(--card-padding)]">
            <Card>
              <CardHeader>
                <CardTitle>Emails</CardTitle>
                <CardDescription>Email correspondence related to this contract</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="h-12 w-12 mx-auto mb-[var(--group-gap)] opacity-50" />
                  <p>Email history will be displayed here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-0 p-[var(--card-padding)]">
            <Card>
              <CardHeader>
                <CardTitle>Change History</CardTitle>
                <CardDescription>Track all changes made to this contract</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-[var(--group-gap)] opacity-50" />
                  <p>Change history will be displayed here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financial-markup" className="mt-0 p-[var(--card-padding)]">
            <div className="space-y-[var(--card-gap)]">
              {/* Markup Overview Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Financial Markup</CardTitle>
                      <CardDescription>
                        Configure markup percentages applied to change orders on this contract
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>

              {/* Vertical Markup Configuration */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Vertical Markup Configuration</CardTitle>
                      <CardDescription>
                        Project-level markup settings applied to change orders
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" disabled>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Markup
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>

              {/* Markup Calculation Preview */}
              {verticalMarkups.length > 0 && (
                <Card data-testid="markup-calculation-preview">
                  <CardHeader>
                    <CardTitle>Calculation Preview</CardTitle>
                    <CardDescription>
                      Test how markups will be applied to a change order amount
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
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
                  </CardContent>
                </Card>
              )}

              {/* Common Markup Categories Reference */}
              <Card>
                <CardHeader>
                  <CardTitle>Common Markup Categories</CardTitle>
                  <CardDescription>
                    Typical markup items used in construction contracts
                  </CardDescription>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="advanced-settings" className="mt-0 p-[var(--card-padding)]">
            <Card>
              <CardHeader>
                <CardTitle>Advanced Settings</CardTitle>
                <CardDescription>Contract configuration and permissions</CardDescription>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </TableLayout>
    </>
  );
}
