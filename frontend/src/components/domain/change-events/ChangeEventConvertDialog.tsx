"use client";

import { useState } from "react";
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
import { Text } from "@/components/ui/text";

interface ChangeEventConvertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  changeEventId: string;
  projectId: number;
  lineItems: Array<{
    id: number;
    description: string;
    vendor_id?: number;
    contract_id?: number;
    cost_rom: number;
    revenue_rom?: number;
  }>;
}

export function ChangeEventConvertDialog({
  open,
  onOpenChange,
  changeEventId,
  projectId,
  lineItems,
}: ChangeEventConvertDialogProps) {
  const router = useRouter();
  const [isConverting, setIsConverting] = useState(false);
  const [conversionType, setConversionType] = useState("commitment");
  const [targetContractId, setTargetContractId] = useState<string>("");

  const handleConvert = async () => {
    if (!targetContractId && conversionType === "commitment") {
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
            target_contract_id: targetContractId
              ? parseInt(targetContractId)
              : null,
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
              placeholder="Select a commitment"
              required
              options={[
                { value: "1", label: "SC-001 - ABC Construction - $125,000" },
                { value: "2", label: "SC-002 - XYZ Contractors - $85,000" },
                { value: "3", label: "PO-001 - Material Supplier - $45,000" },
              ]}
            />
          )}

          {/* Line Items Summary */}
          <div className="space-y-2">
            <Label>Line Items to Convert</Label>
            <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
              {lineItems.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="truncate flex-1">{item.description}</span>
                  <span className="font-mono">
                    ${item.cost_rom.toLocaleString()}
                  </span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between font-medium">
                <span>Total</span>
                <span className="font-mono">
                  $
                  {lineItems
                    .reduce((sum, item) => sum + item.cost_rom, 0)
                    .toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Conversion Note */}
          <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg text-sm">
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
            disabled={
              isConverting ||
              (!targetContractId && conversionType === "commitment")
            }
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            Convert to Change Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
