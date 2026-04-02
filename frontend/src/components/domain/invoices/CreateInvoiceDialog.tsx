"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    application_number: string;
    billing_period_id?: string;
    period_from?: string;
    period_to?: string;
    status: string;
    amount: number;
    retention_amount: number;
    prefill_sov?: boolean;
    prefill_retainage?: boolean;
    include_backup?: boolean;
  }) => Promise<void>;
  nextInvoiceNumber: number;
  billingPeriods: Array<{
    id: string;
    start_date: string;
    end_date: string;
    name: string | null;
    period_number: number;
  }>;
  contractTitle?: string;
}

export function CreateInvoiceDialog({
  open,
  onOpenChange,
  onSubmit,
  nextInvoiceNumber,
  billingPeriods,
  contractTitle,
}: CreateInvoiceDialogProps) {
  const [applicationNumber, setApplicationNumber] = useState(
    String(nextInvoiceNumber),
  );
  const [billingPeriodId, setBillingPeriodId] = useState<string>("");
  const [prefillSOV, setPrefillSOV] = useState(false);
  const [prefillRetainage, setPrefillRetainage] = useState(false);
  const [includeBackup, setIncludeBackup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setApplicationNumber(String(nextInvoiceNumber));
      setPrefillSOV(false);
      setPrefillRetainage(false);
      setIncludeBackup(false);

      // Auto-select current/most recent billing period
      if (billingPeriods.length > 0) {
        const today = new Date().toISOString().split("T")[0];
        const current = billingPeriods.find(
          (bp) => bp.start_date <= today && bp.end_date >= today,
        );
        setBillingPeriodId(current?.id ?? billingPeriods[billingPeriods.length - 1].id);
      } else {
        setBillingPeriodId("");
      }
    }
  }, [open, nextInvoiceNumber, billingPeriods]);

  const formatPeriodLabel = (bp: {
    start_date: string;
    end_date: string;
  }) => {
    const start = format(new Date(bp.start_date), "M/d/yy");
    const end = format(new Date(bp.end_date), "M/d/yy");
    return `${start} - ${end}`;
  };

  const selectedPeriod = billingPeriods.find((bp) => bp.id === billingPeriodId);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        application_number: applicationNumber,
        billing_period_id: billingPeriodId || undefined,
        period_from: selectedPeriod?.start_date,
        period_to: selectedPeriod?.end_date,
        status: "draft",
        amount: 0,
        retention_amount: 0,
        prefill_sov: prefillSOV,
        prefill_retainage: prefillRetainage,
        include_backup: includeBackup,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
          <DialogDescription>
            You can edit information in the invoice after it&apos;s created.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Invoice No. — required */}
          <div className="space-y-2">
            <Label htmlFor="invoice-number">
              Invoice No. <span className="text-destructive">*</span>
            </Label>
            <Input
              id="invoice-number"
              className="max-w-xs"
              value={applicationNumber}
              onChange={(e) => setApplicationNumber(e.target.value)}
            />
          </div>

          {/* Billing Period */}
          <div className="space-y-2">
            <Label htmlFor="billing-period">Billing Period</Label>
            <Select value={billingPeriodId} onValueChange={setBillingPeriodId}>
              <SelectTrigger id="billing-period" className="max-w-xs">
                <SelectValue placeholder="Select period..." />
              </SelectTrigger>
              <SelectContent>
                {billingPeriods.map((bp) => (
                  <SelectItem key={bp.id} value={bp.id}>
                    {formatPeriodLabel(bp)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Pre-fill checkboxes */}
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <Checkbox
                id="prefill-sov"
                checked={prefillSOV}
                onCheckedChange={(checked) => {
                  setPrefillSOV(checked === true);
                  if (!checked) setPrefillRetainage(false);
                }}
              />
              <Label
                htmlFor="prefill-sov"
                className="text-sm font-normal leading-snug cursor-pointer"
              >
                Pre-fill the Schedule of Values with costs from the selected
                billing period
              </Label>
            </div>

            <div className="flex items-start gap-2 pl-6">
              <Checkbox
                id="prefill-retainage"
                checked={prefillRetainage}
                disabled={!prefillSOV}
                onCheckedChange={(checked) =>
                  setPrefillRetainage(checked === true)
                }
              />
              <Label
                htmlFor="prefill-retainage"
                className="text-sm font-normal leading-snug cursor-pointer"
              >
                Also pre-fill with retainage from the selected billing period
              </Label>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="include-backup"
                checked={includeBackup}
                onCheckedChange={(checked) =>
                  setIncludeBackup(checked === true)
                }
              />
              <Label
                htmlFor="include-backup"
                className="text-sm font-normal leading-snug cursor-pointer"
              >
                Include backup from direct costs and invoices in the selected
                billing period
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !applicationNumber}
          >
            {isSubmitting ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
