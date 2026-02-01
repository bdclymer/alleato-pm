"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Plus, ArrowUpDown, FileDown } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  PageContainer,
  ProjectPageHeader,
  PageTabs,
} from "@/components/layout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useProjectTitle } from "@/hooks/useProjectTitle";

// Contract Line Item interface
interface ContractLineItem {
  id: string;
  contract_id: string;
  line_number: number;
  description: string;
  cost_code_id: number | null;
  quantity: number;
  unit_of_measure: string | null;
  unit_cost: number;
  total_cost: number;
  created_at: string;
  updated_at: string;
}

// Contract interface with line items
interface ContractWithLineItems {
  id: string;
  contract_number: string;
  title: string;
  status: string;
  original_contract_value: number;
  revised_contract_value: number;
  line_items: ContractLineItem[];
}

export default function ProjectSOVPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  useProjectTitle("Schedule of Values");

  const [contracts, setContracts] = useState<ContractWithLineItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [activeTab, setActiveTab] = useState("all");

  // Fetch contracts and their line items
  useEffect(() => {
    const fetchData = async () => {
      if (!projectId) return;

      try {
        setLoading(true);

        // Fetch contracts
        const contractsResponse = await fetch(
          `/api/projects/${projectId}/contracts`,
        );
        if (!contractsResponse.ok) {
          throw new Error("Failed to fetch contracts");
        }
        const contractsData = await contractsResponse.json();

        // Fetch line items for each contract
        const contractsWithLineItems = await Promise.all(
          contractsData.map(async (contract: ContractWithLineItems) => {
            try {
              const lineItemsResponse = await fetch(
                `/api/projects/${projectId}/contracts/${contract.id}/line-items`,
              );
              if (lineItemsResponse.ok) {
                const lineItemsData = await lineItemsResponse.json();
                return {
                  ...contract,
                  line_items: lineItemsData || [],
                };
              }
              return { ...contract, line_items: [] };
            } catch (err) {
              return { ...contract, line_items: [] };
            }
          }),
        );

        setContracts(contractsWithLineItems);
      } catch (err) {
        toast.error("Failed to load Schedule of Values");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  const handleSort = useCallback(
    (column: string) => {
      if (sortColumn === column) {
        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
      } else {
        setSortColumn(column);
        setSortDirection("asc");
      }
    },
    [sortColumn, sortDirection],
  );

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return "$0.00";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Flatten all line items from all contracts
  const allLineItems = useMemo(() => {
    const items: Array<ContractLineItem & { contract: ContractWithLineItems }> =
      [];

    contracts.forEach((contract) => {
      contract.line_items.forEach((item) => {
        items.push({ ...item, contract });
      });
    });

    // Apply sorting
    if (sortColumn) {
      items.sort((a, b) => {
        let aVal: string | number | null | undefined;
        let bVal: string | number | null | undefined;

        switch (sortColumn) {
          case "contract":
            aVal = a.contract.contract_number;
            bVal = b.contract.contract_number;
            break;
          case "line":
            aVal = a.line_number;
            bVal = b.line_number;
            break;
          case "description":
            aVal = a.description;
            bVal = b.description;
            break;
          case "cost_code":
            aVal = a.cost_code_id || 0;
            bVal = b.cost_code_id || 0;
            break;
          case "quantity":
            aVal = a.quantity;
            bVal = b.quantity;
            break;
          case "unit_cost":
            aVal = a.unit_cost;
            bVal = b.unit_cost;
            break;
          case "total":
            aVal = a.total_cost;
            bVal = b.total_cost;
            break;
          default:
            return 0;
        }

        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        if (typeof aVal === "string" && typeof bVal === "string") {
          return sortDirection === "asc"
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }

        return sortDirection === "asc"
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number);
      });
    }

    return items;
  }, [contracts, sortColumn, sortDirection]);

  // Calculate totals
  const totals = useMemo(() => {
    const contractValues = contracts.reduce(
      (acc, contract) => ({
        original: acc.original + (contract.original_contract_value || 0),
        revised: acc.revised + (contract.revised_contract_value || 0),
      }),
      { original: 0, revised: 0 },
    );

    const sovTotal = allLineItems.reduce(
      (sum, item) => sum + (item.total_cost || 0),
      0,
    );

    return {
      ...contractValues,
      sov: sovTotal,
      variance: sovTotal - contractValues.revised,
    };
  }, [contracts, allLineItems]);

  const handleExportCSV = () => {
    // Create CSV content
    const headers = [
      "Contract",
      "Line #",
      "Cost Code",
      "Description",
      "Quantity",
      "Unit",
      "Unit Cost",
      "Total Cost",
    ];
    const rows = allLineItems.map((item) => [
      item.contract.contract_number,
      item.line_number,
      item.cost_code_id || "",
      item.description,
      item.quantity,
      item.unit_of_measure || "",
      item.unit_cost,
      item.total_cost,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sov-project-${projectId}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success("SOV exported to CSV");
  };

  return (
    <>
      <ProjectPageHeader
        title="Schedule of Values"
        description="View and manage schedule of values across all contracts"
        showExportButton={true}
        onExportCSV={handleExportCSV}
        onExportPDF={() => toast.info("PDF export coming soon")}
        actions={
          <Button
            size="sm"
            onClick={() => router.push(`/${projectId}/contracts/new`)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Contract
          </Button>
        }
      />

      <PageTabs
        tabs={[
          {
            label: "All Line Items",
            href: `/${projectId}/sov`,
            count: allLineItems.length,
          },
          { label: "By Contract", href: `/${projectId}/sov?view=by-contract` },
        ]}
      />

      <PageContainer className="space-y-6">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-muted-foreground">
              Loading schedule of values...
            </p>
          </div>
        ) : allLineItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              No schedule of values found
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Create a contract and add line items to get started
            </p>
            <Button onClick={() => router.push(`/${projectId}/contracts/new`)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Contract
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => handleSort("contract")}
                  >
                    <div className="flex items-center gap-1">
                      Contract
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted w-20"
                    onClick={() => handleSort("line")}
                  >
                    <div className="flex items-center gap-1">
                      Line #
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => handleSort("cost_code")}
                  >
                    <div className="flex items-center gap-1">
                      Cost Code
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => handleSort("description")}
                  >
                    <div className="flex items-center gap-1">
                      Description
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-right cursor-pointer hover:bg-muted"
                    onClick={() => handleSort("quantity")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Quantity
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead className="text-center">Unit</TableHead>
                  <TableHead
                    className="text-right cursor-pointer hover:bg-muted"
                    onClick={() => handleSort("unit_cost")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Unit Cost
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-right cursor-pointer hover:bg-muted"
                    onClick={() => handleSort("total")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Total Cost
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allLineItems.map((item) => (
                  <TableRow key={item.id} className="border-b hover:bg-muted">
                    <TableCell>
                      <Link
                        href={`/${projectId}/contracts/${item.contract.id}`}
                        className="text-link hover:text-link-hover hover:underline"
                      >
                        {item.contract.contract_number}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {item.contract.title}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm">
                      {item.line_number}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {item.cost_code_id || "--"}
                    </TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">
                      {item.quantity.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.unit_of_measure || "LS"}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.unit_cost)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.total_cost)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <tfoot>
                <TableRow className="bg-muted font-medium">
                  <TableCell colSpan={7}>Grand Total</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(totals.sov)}
                  </TableCell>
                </TableRow>
              </tfoot>
            </Table>
          </div>
        )}
      </PageContainer>
    </>
  );
}
