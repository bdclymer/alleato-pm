"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { PageShell } from "@/components/layout";
import { Form, FormGrid, FormSection } from "@/components/forms";
import { FormActions } from "@/components/forms/FormActions";
import { TextField } from "@/components/forms/TextField";
import { SelectField } from "@/components/forms/SelectField";
import { DateField } from "@/components/forms/DateField";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useBillingPeriodsList } from "@/hooks/use-billing-periods";
import { useCreateSubcontractorInvoice } from "@/hooks/use-subcontractor-invoices";

const schema = z
  .object({
    commitment_type: z.enum(["subcontract", "purchase_order"]),
    subcontract_id: z.string().optional(),
    purchase_order_id: z.string().optional(),
    billing_period_id: z.string().optional(),
    invoice_number: z.string().optional(),
    period_start: z.string().optional(),
    period_end: z.string().optional(),
    billing_date: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine(
    (v) =>
      v.commitment_type === "subcontract"
        ? !!v.subcontract_id
        : !!v.purchase_order_id,
    { message: "Please select a commitment", path: ["subcontract_id"] },
  );

type FormValues = z.infer<typeof schema>;

interface CommitmentOption {
  id: string;
  contract_number: string | null;
  title: string | null;
}

function toDateValue(value?: string) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function toDateString(value?: Date) {
  if (!value) return "";
  return value.toISOString().split("T")[0];
}

export default function NewSubcontractorInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [subcontracts, setSubcontracts] = useState<CommitmentOption[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<CommitmentOption[]>([]);
  const [loadingCommitments, setLoadingCommitments] = useState(true);

  const { data: billingPeriods = [] } = useBillingPeriodsList(projectId);
  const createInvoice = useCreateSubcontractorInvoice(projectId);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      commitment_type: "subcontract",
      subcontract_id: "",
      purchase_order_id: "",
      billing_period_id: "",
      invoice_number: "",
      period_start: "",
      period_end: "",
      billing_date: "",
      notes: "",
    },
  });

  const values = form.watch();

  useEffect(() => {
    async function load() {
      try {
        const [scRes, poRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/subcontracts`),
          fetch(`/api/projects/${projectId}/purchase-orders`),
        ]);
        const scJson = scRes.ok ? await scRes.json() : { data: [] };
        const poJson = poRes.ok ? await poRes.json() : { data: [] };
        const scList = Array.isArray(scJson) ? scJson : (scJson.data ?? []);
        const poList = Array.isArray(poJson) ? poJson : (poJson.data ?? []);
        setSubcontracts(
          scList.map((r: CommitmentOption) => ({
            id: String(r.id),
            contract_number: r.contract_number,
            title: r.title,
          })),
        );
        setPurchaseOrders(
          poList.map((r: CommitmentOption) => ({
            id: String(r.id),
            contract_number: r.contract_number,
            title: r.title,
          })),
        );
      } catch {
        toast.error("Failed to load commitments");
      } finally {
        setLoadingCommitments(false);
      }
    }
    load();
  }, [projectId]);

  // Auto-fill period dates when billing period changes
  useEffect(() => {
    if (!values.billing_period_id) return;
    const bp = billingPeriods.find((p) => p.id === values.billing_period_id);
    if (!bp) return;
    if (!values.period_start && bp.start_date) {
      form.setValue("period_start", bp.start_date);
    }
    if (!values.period_end && bp.end_date) {
      form.setValue("period_end", bp.end_date);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.billing_period_id, billingPeriods]);

  async function onSubmit(v: FormValues) {
    try {
      const result = await createInvoice.mutateAsync({
        subcontract_id:
          v.commitment_type === "subcontract"
            ? v.subcontract_id || undefined
            : undefined,
        purchase_order_id:
          v.commitment_type === "purchase_order"
            ? v.purchase_order_id || undefined
            : undefined,
        billing_period_id: v.billing_period_id || undefined,
        invoice_number: v.invoice_number || undefined,
        period_start: v.period_start || undefined,
        period_end: v.period_end || undefined,
        billing_date: v.billing_date || undefined,
        notes: v.notes || undefined,
      });
      const newId = result?.data?.id;
      if (newId) {
        router.push(`/${projectId}/invoicing/subcontractor/${newId}`);
      } else {
        router.push(`/${projectId}/invoicing?tab=subcontractor`);
      }
    } catch {
      // toast handled by hook
    }
  }

  const commitmentOptions =
    values.commitment_type === "subcontract" ? subcontracts : purchaseOrders;

  return (
    <PageShell
      variant="form"
      title="Create Subcontractor Invoice"
      description="Bill against a subcontract or purchase order"
      onBack={() =>
        router.push(`/${projectId}/invoicing?tab=subcontractor`)
      }
      backLabel="Back to Invoicing"
    >
      <Form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormSection
          title="Commitment"
          description="Select the subcontract or purchase order being billed."
          className="border-b-0 pb-0"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Commitment Type</Label>
              <RadioGroup
                value={values.commitment_type}
                onValueChange={(val) => {
                  form.setValue(
                    "commitment_type",
                    val as FormValues["commitment_type"],
                    { shouldValidate: true },
                  );
                  form.setValue("subcontract_id", "");
                  form.setValue("purchase_order_id", "");
                }}
                className="flex gap-6"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="subcontract" id="ct-sc" />
                  <Label htmlFor="ct-sc" className="font-normal">
                    Subcontract
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="purchase_order" id="ct-po" />
                  <Label htmlFor="ct-po" className="font-normal">
                    Purchase Order
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <SelectField
              label={
                values.commitment_type === "subcontract"
                  ? "Subcontract"
                  : "Purchase Order"
              }
              required
              fullWidth
              value={
                values.commitment_type === "subcontract"
                  ? values.subcontract_id || undefined
                  : values.purchase_order_id || undefined
              }
              onValueChange={(val) => {
                if (values.commitment_type === "subcontract") {
                  form.setValue("subcontract_id", val, {
                    shouldValidate: true,
                  });
                } else {
                  form.setValue("purchase_order_id", val, {
                    shouldValidate: true,
                  });
                }
              }}
              error={form.formState.errors.subcontract_id?.message}
              disabled={loadingCommitments}
              placeholder={
                loadingCommitments
                  ? "Loading…"
                  : commitmentOptions.length === 0
                    ? "No commitments available"
                    : "Select a commitment"
              }
              options={commitmentOptions.map((c) => ({
                value: c.id,
                label: `${c.contract_number ?? "—"}${c.title ? ` — ${c.title}` : ""}`,
              }))}
            />
          </div>
        </FormSection>

        <FormSection
          title="Invoice Details"
          description="Billing period, invoice number, and dates."
          className="border-b-0 pb-0"
        >
          <FormGrid columns={2}>
            <SelectField
              label="Billing Period"
              fullWidth
              value={values.billing_period_id || undefined}
              onValueChange={(val) =>
                form.setValue("billing_period_id", val, {
                  shouldValidate: true,
                })
              }
              placeholder="Select billing period"
              options={billingPeriods.map((p) => ({
                value: p.id,
                label: p.name ?? `Period ${p.period_number}`,
              }))}
            />

            <TextField
              label="Invoice Number"
              fullWidth
              value={values.invoice_number ?? ""}
              onChange={(e) =>
                form.setValue("invoice_number", e.target.value, {
                  shouldValidate: true,
                })
              }
              placeholder="Optional"
            />

            <DateField
              label="Period Start"
              value={toDateValue(values.period_start)}
              onChange={(val) =>
                form.setValue("period_start", toDateString(val), {
                  shouldValidate: true,
                })
              }
            />

            <DateField
              label="Period End"
              value={toDateValue(values.period_end)}
              onChange={(val) =>
                form.setValue("period_end", toDateString(val), {
                  shouldValidate: true,
                })
              }
            />

            <DateField
              label="Billing Date"
              value={toDateValue(values.billing_date)}
              onChange={(val) =>
                form.setValue("billing_date", toDateString(val), {
                  shouldValidate: true,
                })
              }
            />
          </FormGrid>

          <div className="space-y-1.5 mt-4">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={4}
              value={values.notes ?? ""}
              onChange={(e) =>
                form.setValue("notes", e.target.value, {
                  shouldValidate: true,
                })
              }
              placeholder="Optional notes about this invoice"
            />
          </div>
        </FormSection>

        <FormActions
          submitLabel="Create Invoice"
          onCancel={() =>
            router.push(`/${projectId}/invoicing?tab=subcontractor`)
          }
          isSubmitting={createInvoice.isPending}
        />
      </Form>
    </PageShell>
  );
}
