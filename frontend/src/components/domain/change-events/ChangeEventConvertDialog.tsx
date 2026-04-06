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
}

export function ChangeEventConvertDialog({
  open,
  onOpenChange,
  changeEventId,
  projectId,
  lineItems = [],
}: ChangeEventConvertDialogProps) {
  const router = useRouter();
  const [isConverting, setIsConverting] = useState(false);
  const [conversionType, setConversionType] = useState("commitment");
  const [targetContractId, setTargetContractId] = useState<string>("");
  const [contracts, setContracts] = useState<Array<{
    id: string;
    label: string;
    contract_number: string;
    title: string | null;
    company_name: string | null;
    type: "prime_contract" | "commitment";
  }>>([]);
  const [isLoadingContracts, setIsLoadingContracts] = useState(false);

  // Fetch contracts when dialog opens
  useEffect(() => {
    if (!open) return;

    const fetchContracts = async () => {
      setIsLoadingContracts(true);
      try {
        // Fetch both prime contracts and commitments in parallel
        const [primeContractsRes, commitmentsRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/contracts`),
          fetch(`/api/commitments?project_id=${projectId}`),
        ]);

        const allContracts: typeof contracts = [];

        // Process prime contracts
        if (primeContractsRes.ok) {
          const primeContracts = await primeContractsRes.json();
          primeContracts.forEach((contract: any) => {
            allContracts.push({
              id: contract.id,
              contract_number: contract.contract_number,
              title: contract.title,
              company_name: contract.vendor?.name || contract.client?.name || null,
              type: "prime_contract",
              label: `${contract.contract_number} - ${contract.vendor?.name || contract.client?.name || "Unknown"}`,
            });
          });
        }

        // Process commitments
        if (commitmentsRes.ok) {
          const commitmentsData = await commitmentsRes.json();
          // Handle both array and paginated response
          const commitments = Array.isArray(commitmentsData)
            ? commitmentsData
            : commitmentsData.items || [];

          commitments.forEach((commitment: any) => {
            allContracts.push({
              id: commitment.id,
              contract_number: commitment.number || commitment.contract_number || "N/A",
              title: commitment.title,
              company_name: commitment.contract_company?.name || null,
              type: "commitment",
              label: `${commitment.number || commitment.contract_number || "N/A"} - ${commitment.contract_company?.name || "Unknown"}`,
            });
          });
        }

        setContracts(allContracts);
      } catch (error) {
        console.error("Failed to load contracts:", error);
        toast.error("Failed to load contracts");
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
      const response = await fetch(
        `/api/projects/${projectId}/change-events/${changeEventId}/convert-to-change-order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: conversionType,
            target_contract_id: targetContractId || null,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to convert to change order");
      }

      const result = await response.json();
      toast.success("Successfully converted to change order");
      onOpenChange(false);

      // Navigate to the new change order
      if (result.change_order_id) {
        router.push(`/${projectId}/change-orders/${result.change_order_id}`);
      }
    } catch {
      toast.error("Failed to convert to change order");
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Convert to Change Order</DialogTitle>
          <DialogDescription>
            Convert this approved change event into a formal change order. This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Conversion Type */}
          <div className="space-y-2">
            <Label>Change Order Type</Label>
            <RadioGroup value={conversionType} onValueChange={setConversionType}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="commitment" id="commitment" />
                <Label htmlFor="commitment" className="cursor-pointer">
                  Commitment Change Order (Subcontractor/Vendor)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="prime" id="prime" />
                <Label htmlFor="prime" className="cursor-pointer">
                  Prime Contract Change Order (Owner)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Target Contract Selection */}
          {conversionType === "commitment" && (
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
          {conversionType === "prime" && (
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
                    ${(item.costRom ?? 0).toLocaleString()}
                  </span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between font-medium">
                <span>Total</span>
                <span className="font-mono">
                  $
                  {lineItems
                    .reduce((sum, item) => sum + (item.costRom ?? 0), 0)
                    .toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Conversion Note */}
          <div className="bg-muted p-4 rounded-lg text-sm">
            <Text as="div" size="sm" className="flex items-start gap-2">
              <FileCheck className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                After conversion, this change event will be marked as
                &quot;Converted&quot; and will be linked to the new change
                order. All line items and attachments will be copied to the
                change order.
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
            Convert to Change Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
