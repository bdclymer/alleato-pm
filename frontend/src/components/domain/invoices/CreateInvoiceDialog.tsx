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
import { Textarea } from "@/components/ui/textarea";

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    application_number: string;
    billing_period_id?: string;
    period_from?: string;
    period_to?: string;
    billing_date?: string;
    status: string;
    notes?: string;
    amount: number;
    retention_amount: number;
  }) => Promise<void>;
  nextInvoiceNumber: number;
  billingPeriods: Array<{
    id: string;
    start_date: string;
    end_date: string;
    name: string | null;
    period_number: number;
  }>;
}

export function CreateInvoiceDialog({
  open,
  onOpenChange,
  onSubmit,
  nextInvoiceNumber,
  billingPeriods,
}: CreateInvoiceDialogProps) {
  const [applicationNumber, setApplicationNumber] = useState(
    String(nextInvoiceNumber).padStart(3, "0"),
  );
  const [billingPeriodId, setBillingPeriodId] = useState<string>("");
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [billingDate, setBillingDate] = useState("");
  const [status, setStatus] = useState("draft");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setApplicationNumber(String(nextInvoiceNumber).padStart(3, "0"));
      setBillingPeriodId("");
      setPeriodFrom("");
      setPeriodTo("");
      setBillingDate("");
      setStatus("draft");
      setNotes("");
    }
  }, [open, nextInvoiceNumber]);

  // Auto-fill dates when billing period is selected
  useEffect(() => {
    if (!billingPeriodId) return;
    const period = billingPeriods.find((bp) => bp.id === billingPeriodId);
    if (period) {
      setPeriodFrom(period.start_date);
      setPeriodTo(period.end_date);
    }
  }, [billingPeriodId, billingPeriods]);

  const formatPeriodLabel = (bp: {
    start_date: string;
    end_date: string;
    name: string | null;
    period_number: number;
  }) => {
    const start = format(new Date(bp.start_date), "MM/dd/yy");
    const end = format(new Date(bp.end_date), "MM/dd/yy");
    return `${start} - ${end}`;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        application_number: applicationNumber,
        billing_period_id: billingPeriodId || undefined,
        period_from: periodFrom || undefined,
        period_to: periodTo || undefined,
        billing_date: billingDate || undefined,
        status,
        notes: notes || undefined,
        amount: 0,
        retention_amount: 0,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Invoice / Payment Application</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="billing-period">Commitment Billing Period</Label>
              <Select value={billingPeriodId} onValueChange={setBillingPeriodId}>
                <SelectTrigger id="billing-period">
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
            <div className="space-y-2">
              <Label htmlFor="invoice-number">Invoice #</Label>
              <Input
                id="invoice-number"
                value={applicationNumber}
                onChange={(e) => setApplicationNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="period-start">Period Start</Label>
              <Input
                id="period-start"
                type="date"
                value={periodFrom}
                onChange={(e) => setPeriodFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="period-end">Period End</Label>
              <Input
                id="period-end"
                type="date"
                value={periodTo}
                onChange={(e) => setPeriodTo(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="billing-date">Billing Date</Label>
              <Input
                id="billing-date"
                type="date"
                value={billingDate}
                onChange={(e) => setBillingDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice-status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="invoice-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="revise_and_resubmit">
                    Revise and Resubmit
                  </SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invoice-notes">Notes</Label>
            <Textarea
              id="invoice-notes"
              placeholder="Optional notes..."
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
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
            {isSubmitting ? "Creating..." : "Create Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
