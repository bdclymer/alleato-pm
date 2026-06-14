"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/forms/SelectField";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FileCheck, ArrowRight } from "lucide-react";
import { Text } from "@/components/ds/text";
import { apiFetch } from "@/lib/api-client";
import type { VerticalMarkup } from "@/hooks/use-vertical-markup";

interface ChangeEventConvertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  changeEventId: string;
  projectId: number;
  lineItems: Array<{
    id: string;
    description: string | null;
    costRom: number | null;
    revenueRom?: number | null;
  }>;
  markupRows: VerticalMarkup[];
  expectingRevenue?: boolean;
}

const MARKUP_TYPE_LABELS: Record<string, string> = {
  insurance: "Insurance",
  bond: "Bond",
  fee: "Contractor Fee",
  overhead: "Overhead",
  custom: "Custom",
};

function getMarkupLabel(markupType: string): string {
  return MARKUP_TYPE_LABELS[markupType.toLowerCase()] || markupType;
}

export function ChangeEventConvertDialog({
  open,
  onOpenChange,
  changeEventId,
  projectId,
  lineItems = [],
  markupRows,
  expectingRevenue = true,
}: ChangeEventConvertDialogProps) {
  const router = useRouter();
  const [isConverting, setIsConverting] = useState(false);
  const [conversionType, setConversionType] = useState("commitment_pco");
  const [targetContractId, setTargetContractId] = useState<string>("");
  const [contracts, setContracts] = useState<Array<{
    id: string;
    label: string;
    contract_number: string;
    title: string | null;
    company_name: string | null;
    type: "prime_contract" | "commitment";
    commitment_type?: "subcontract" | "purchase_order";
  }>>([]);
  const [isLoadingContracts, setIsLoadingContracts] = useState(false);

  const basePrimeAmount = lineItems.reduce(
    (sum, item) => sum + (item.revenueRom ?? 0),
    0,
  );
  const baseCommitmentAmount = lineItems.reduce(
    (sum, item) => sum + (item.costRom ?? 0),
    0,
  );

  const computedMarkups = (() => {
    if (conversionType !== "prime_pco" || !expectingRevenue) return [];
    const sorted = [...markupRows].sort((a, b) => a.calculation_order - b.calculation_order);
    let runningRevenueBase = basePrimeAmount;
    return sorted.map((markup) => {
      const revenueAmount = runningRevenueBase * (markup.percentage / 100);
      if (markup.compound) runningRevenueBase += revenueAmount;
      return { ...markup, revenueAmount };
    });
  })();

  const markupTotal = computedMarkups.reduce(
    (sum, markup) => sum + markup.revenueAmount,
    0,
  );
  const displayedTotal =
    conversionType === "prime_pco"
      ? basePrimeAmount + markupTotal
      : baseCommitmentAmount;
  const usesRevenueAmounts = conversionType === "prime_pco";

  // Fetch contracts when dialog opens
  useEffect(() => {
    if (!open) return;

    const fetchContracts = async () => {
      setIsLoadingContracts(true);
      try {
        // Fetch both prime contracts and commitments in parallel
        const [primeContracts, commitmentsData] = await Promise.all([
          apiFetch<Array<Record<string, unknown>>>(`/api/projects/${projectId}/contracts`),
          apiFetch<unknown>(`/api/commitments?projectId=${projectId}&limit=500`),
        ]);

        const allContracts: typeof contracts = [];

        // Process prime contracts
        (Array.isArray(primeContracts) ? primeContracts : []).forEach((contract) => {
          const vendor = contract.vendor as Record<string, unknown> | undefined;
          const client = contract.client as Record<string, unknown> | undefined;
          const companyName = (vendor?.name ?? client?.name ?? null) as string | null;
          allContracts.push({
            id: String(contract.id),
            contract_number: String(contract.contract_number ?? ""),
            title: (contract.title as string | null) ?? null,
            company_name: companyName,
            type: "prime_contract",
            label: `${contract.contract_number} - ${companyName ?? "Unknown"}`,
          });
        });

        // Handle both array and paginated response
        const commitments = Array.isArray(commitmentsData)
          ? commitmentsData
          : (commitmentsData as Record<string, unknown>)?.data ||
            (commitmentsData as Record<string, unknown>)?.items ||
            [];

        (commitments as Array<Record<string, unknown>>).forEach((commitment) => {
          const contractCompany = commitment.contract_company as Record<string, unknown> | undefined;
          const contractNum = String(commitment.number ?? commitment.contract_number ?? "N/A");
          allContracts.push({
            id: String(commitment.id),
            contract_number: contractNum,
            title: (commitment.title as string | null) ?? null,
            company_name: (contractCompany?.name as string | null) ?? null,
            type: "commitment",
            commitment_type:
              commitment.commitment_type === "purchase_order"
                ? "purchase_order"
                : "subcontract",
            label: `${contractNum} - ${(contractCompany?.name as string | undefined) ?? "Unknown"}`,
          });
        });

        setContracts(allContracts);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load contracts";
        toast.error(message);
      } finally {
        setIsLoadingContracts(false);
      }
    };

    fetchContracts();
  }, [open, projectId]);

  const handleConvert = async () => {
    if (!targetContractId) {
      toast.error("Please select a target contract");
      return;
    }

    setIsConverting(true);

    try {
      if (conversionType === "prime_pco") {
        const query = new URLSearchParams({
          contractId: targetContractId,
          changeEventIds: changeEventId,
        });
        const formPath = `/${projectId}/prime-contracts/${targetContractId}/change-orders/pcos/new?${query.toString()}`;
        toast.success("Opening prime potential change order form");
        onOpenChange(false);
        router.push(formPath);
        return;
      }

      const selectedContract = contracts.find((contract) => contract.id === targetContractId);
      const pcoTitle = selectedContract
        ? `PCO for change event — ${selectedContract.title || selectedContract.contract_number}`
        : "PCO for change event";

      const result = await apiFetch<Record<string, unknown>>(
        `/api/projects/${projectId}/change-events/add-to-pco`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            change_event_ids: [changeEventId],
            pco_type: conversionType === "prime_pco" ? "prime" : "commitment",
            create_new:
              conversionType === "prime_pco"
                ? {
                    title: pcoTitle,
                    prime_contract_id: targetContractId,
                  }
                : {
                    title: pcoTitle,
                    commitment_id: targetContractId,
                    commitment_type: selectedContract?.commitment_type ?? "subcontract",
                  },
          }),
        },
      );
      toast.success("Successfully created potential change order");
      onOpenChange(false);

      const pco = result?.pco as Record<string, unknown> | undefined;
      if (pco?.id) {
        router.push(`/${projectId}/commitment-pcos/${pco.id}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create potential change order";
      toast.error(message);
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add to Potential Change Order</DialogTitle>
          <DialogDescription>
            This project uses a two-tier change process. Convert this approved
            change event into a Potential Change Order (PCO) first. You can
            create the formal change order from approved PCOs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Conversion Type */}
          <div className="space-y-2">
            <Label>Change Order Type</Label>
            <RadioGroup value={conversionType} onValueChange={setConversionType}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="commitment_pco" id="commitment_pco" />
                <Label htmlFor="commitment_pco" className="cursor-pointer">
                  Commitment Potential Change Order (Subcontractor/Vendor)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="prime_pco" id="prime_pco" />
                <Label htmlFor="prime_pco" className="cursor-pointer">
                  Prime Contract Potential Change Order (Owner)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Target Contract Selection */}
          {conversionType === "commitment_pco" && (
            <SelectField
              label="Target Contract"
              value={targetContractId}
              onValueChange={setTargetContractId}
              placeholder={isLoadingContracts ? "Loading contracts..." : "Select a commitment"}
              required
              disabled={isLoadingContracts}
              options={contracts
                .filter((c) => c.type === "commitment")
                .map((c) => ({
                  value: c.id,
                  label: c.label,
                }))}
            />
          )}

          {/* Target Contract for Prime */}
          {conversionType === "prime_pco" && (
            <SelectField
              label="Target Contract"
              value={targetContractId}
              onValueChange={setTargetContractId}
              placeholder={isLoadingContracts ? "Loading contracts..." : "Select a prime contract"}
              required
              disabled={isLoadingContracts}
              options={contracts
                .filter((c) => c.type === "prime_contract")
                .map((c) => ({
                  value: c.id,
                  label: c.label,
                }))}
            />
          )}

          {/* Line Items Summary */}
          <div className="space-y-2">
            <Label>Line Items to Convert</Label>
            <div className="border rounded-lg p-4 space-y-2 max-h-40 overflow-y-auto">
              {lineItems.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="truncate flex-1">{item.description}</span>
                  <span className="font-mono">
                    $
                    {(usesRevenueAmounts
                      ? (item.revenueRom ?? item.costRom ?? 0)
                      : (item.costRom ?? 0)
                    ).toLocaleString()}
                  </span>
                </div>
              ))}
              {computedMarkups.map((markup) => (
                <div key={markup.id} className="flex justify-between text-sm text-muted-foreground">
                  <span className="truncate flex-1">
                    {getMarkupLabel(markup.markup_type)} ({markup.percentage}%)
                  </span>
                  <span className="font-mono">+${markup.revenueAmount.toLocaleString()}</span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between font-medium">
                <span>Total</span>
                <span className="font-mono">
                  ${displayedTotal.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Conversion Note */}
          <div className="bg-muted p-4 rounded-lg text-sm">
            <Text as="div" size="sm" className="flex items-start gap-2">
              <FileCheck className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                This change event will be linked to the newly created PCO.
                Line items and attachments remain available for review before
                final CO conversion.
              </span>
            </Text>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isConverting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConvert}
            disabled={isConverting || !targetContractId || isLoadingContracts}
          >
            <ArrowRight />
            Create Potential Change Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
