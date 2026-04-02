"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import { Pencil, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ds";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PaymentApplication } from "@/app/(main)/[projectId]/prime-contracts/[contractId]/types";

interface BillingPeriod {
  id: string;
  start_date: string;
  end_date: string;
  name: string | null;
  period_number: number;
}

interface InvoiceGeneralInfoProps {
  invoice: PaymentApplication;
  onUpdate: (data: Partial<PaymentApplication>) => Promise<void>;
  billingPeriods: BillingPeriod[];
}

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "under_review", label: "Under Review" },
  { value: "revise_and_resubmit", label: "Revise and Resubmit" },
  { value: "approved", label: "Approved" },
] as const;

function formatDisplayDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return format(new Date(dateStr), "M/d/yyyy");
  } catch {
    return "—";
  }
}

function formatStatusLabel(status: string): string {
  const match = STATUS_OPTIONS.find((o) => o.value === status);
  return match?.label ?? status;
}

function InfoField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </dt>
      <dd className="text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}

export function InvoiceGeneralInfo({
  invoice,
  onUpdate,
  billingPeriods,
}: InvoiceGeneralInfoProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    billing_period_id: invoice.billing_period_id ?? "",
    application_number: invoice.application_number,
    status: invoice.status,
    period_from: invoice.period_from ?? "",
    period_to: invoice.period_to ?? "",
    billing_date: invoice.billing_date ?? "",
  });

  const handleEdit = useCallback(() => {
    setFormData({
      billing_period_id: invoice.billing_period_id ?? "",
      application_number: invoice.application_number,
      status: invoice.status,
      period_from: invoice.period_from ?? "",
      period_to: invoice.period_to ?? "",
      billing_date: invoice.billing_date ?? "",
    });
    setIsEditing(true);
  }, [invoice]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await onUpdate({
        billing_period_id: formData.billing_period_id || null,
        application_number: formData.application_number,
        status: formData.status,
        period_from: formData.period_from || null,
        period_to: formData.period_to || null,
        billing_date: formData.billing_date || null,
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }, [formData, onUpdate]);

  const handleBillingPeriodChange = useCallback(
    (periodId: string) => {
      const period = billingPeriods.find((bp) => bp.id === periodId);
      setFormData((prev) => ({
        ...prev,
        billing_period_id: periodId,
        period_from: period?.start_date ?? prev.period_from,
        period_to: period?.end_date ?? prev.period_to,
      }));
    },
    [billingPeriods],
  );

  // Format billing period display
  const billingPeriodLabel = (() => {
    if (invoice.period_from && invoice.period_to) {
      try {
        const from = format(new Date(invoice.period_from), "M/d/yy");
        const to = format(new Date(invoice.period_to), "M/d/yy");
        return `${from} - ${to}`;
      } catch {
        return "—";
      }
    }
    if (invoice.billing_period) {
      return (
        invoice.billing_period.name ??
        `Period ${invoice.billing_period.period_number}`
      );
    }
    return "—";
  })();

  if (isEditing) {
    return (
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground">
            General Information
          </h3>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              <Check className="mr-1 h-3.5 w-3.5" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <InfoField label="Status">
            <Select
              value={formData.status}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  status: value as PaymentApplication["status"],
                }))
              }
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </InfoField>

          <InfoField label="Invoice No.">
            <Input
              className="h-8 text-sm"
              value={formData.application_number}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  application_number: e.target.value,
                }))
              }
            />
          </InfoField>

          <InfoField label="Billing Period">
            <Select
              value={formData.billing_period_id}
              onValueChange={handleBillingPeriodChange}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                {billingPeriods.map((bp) => (
                  <SelectItem key={bp.id} value={bp.id}>
                    {bp.name ?? `Period ${bp.period_number}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </InfoField>

          <InfoField label="Billing Date">
            <Input
              type="date"
              className="h-8 text-sm"
              value={formData.billing_date}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  billing_date: e.target.value,
                }))
              }
            />
          </InfoField>

          <InfoField label="Period Start">
            <Input
              type="date"
              className="h-8 text-sm"
              value={formData.period_from}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  period_from: e.target.value,
                }))
              }
            />
          </InfoField>

          <InfoField label="Period End">
            <Input
              type="date"
              className="h-8 text-sm"
              value={formData.period_to}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  period_to: e.target.value,
                }))
              }
            />
          </InfoField>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-foreground">
          General Information
        </h3>
        <Button variant="ghost" size="sm" onClick={handleEdit}>
          <Pencil className="mr-1 h-3.5 w-3.5" />
          Edit
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-4">
        <InfoField label="Status">
          <StatusBadge status={formatStatusLabel(invoice.status)} />
        </InfoField>
        <InfoField label="Invoice No.">{invoice.application_number}</InfoField>
        <InfoField label="Billing Period">{billingPeriodLabel}</InfoField>
        <InfoField label="Billing Date">
          {formatDisplayDate(invoice.billing_date)}
        </InfoField>
        <InfoField label="Period Start">
          {formatDisplayDate(invoice.period_from)}
        </InfoField>
        <InfoField label="Period End">
          {formatDisplayDate(invoice.period_to)}
        </InfoField>
      </div>
    </section>
  );
}
