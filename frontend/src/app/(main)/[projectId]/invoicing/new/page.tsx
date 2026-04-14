"use client";

import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { PageShell } from "@/components/layout";
import { Form, FormGrid, FormSection } from "@/components/forms";
import { FormActions } from "@/components/forms/FormActions";
import { DevAutoFillButton } from "@/hooks/use-dev-autofill";
import { TextField } from "@/components/forms/TextField";
import { SelectField } from "@/components/forms/SelectField";
import { DateField } from "@/components/forms/DateField";
import { apiFetch } from "@/lib/api-client";

const createInvoiceSchema = z.object({
  prime_contract_id: z.string().min(1, "Contract is required"),
  invoice_number: z.string().optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
  status: z.enum(["draft", "submitted", "approved", "paid", "void"]),
});

type CreateInvoiceValues = z.infer<typeof createInvoiceSchema>;

interface ContractOption {
  id: string;
  contract_number: string;
  title: string | null;
}

interface ContractsResponse {
  data?: ContractOption[];
}

// Normalize optional text values before submitting them to the API.
function normalizeOptionalValue(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

// Build a Postgres-safe create payload so blank form inputs become nulls instead of invalid dates.
function buildCreateInvoicePayload(values: CreateInvoiceValues) {
  return {
    prime_contract_id: values.prime_contract_id,
    invoice_number: normalizeOptionalValue(values.invoice_number),
    period_start: normalizeOptionalValue(values.period_start),
    period_end: normalizeOptionalValue(values.period_end),
    status: values.status,
  };
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

export default function NewInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [contracts, setContracts] = useState<ContractOption[]>([]);
  const [isLoadingContracts, setIsLoadingContracts] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateInvoiceValues>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: {
      prime_contract_id: "",
      status: "draft",
      invoice_number: "",
      period_start: "",
      period_end: "",
    },
  });

  const values = form.watch();

  useEffect(() => {
    async function loadContracts() {
      try {
        const data = await apiFetch<ContractsResponse | ContractOption[]>(
          `/api/projects/${projectId}/contracts`,
        );
        setContracts(Array.isArray(data) ? data : (data.data ?? []));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load contracts");
      } finally {
        setIsLoadingContracts(false);
      }
    }
    loadContracts();
  }, [projectId]);

  useEffect(() => {
    if (isLoadingContracts || contracts.length === 0) return;
    const selectedContract = form.getValues("prime_contract_id");
    if (selectedContract) return;
    form.setValue("prime_contract_id", contracts[0].id, { shouldValidate: true });
  }, [contracts, isLoadingContracts, form]);

  const handleDevAutoFill = () => {
    const now = Date.now();
    const firstContractId = contracts[0]?.id;
    if (firstContractId) {
      form.setValue("prime_contract_id", firstContractId, { shouldValidate: true });
    }
    form.setValue("invoice_number", `INV-${now}`, { shouldValidate: true });
    form.setValue("status", "draft", { shouldValidate: true });
  };

  async function onSubmit(values: CreateInvoiceValues) {
    setIsSubmitting(true);
    try {
      // Sensitive: this submits owner invoice data that persists to the project ledger.
      await apiFetch(`/api/projects/${projectId}/invoicing/owner`, {
        method: "POST",
        body: JSON.stringify(buildCreateInvoicePayload(values)),
      });

      toast.success("Invoice created successfully");
      router.push(`/${projectId}/invoicing`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create invoice");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageShell
      variant="form"
      title="Create Owner Invoice"
      description="Add a new owner invoice for this project"
      onBack={() => router.push(`/${projectId}/invoicing`)}
      backLabel="Back to Invoicing"
    >
      <Form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormSection
          title="Invoice Details"
          description="Set contract, billing period, and starting status."
          className="border-b-0 pb-0"
        >
          <FormGrid columns={2}>
            {isLoadingContracts ? (
              <TextField
                label="Contract"
                required
                fullWidth
                value="Loading contracts..."
                disabled
                readOnly
              />
            ) : (
              <SelectField
                label="Contract"
                required
                fullWidth
                value={values.prime_contract_id || contracts[0]?.id}
                onValueChange={(value) =>
                  form.setValue("prime_contract_id", value, { shouldValidate: true })
                }
                error={form.formState.errors.prime_contract_id?.message}
                placeholder="Select a contract"
                options={contracts.map((contract) => ({
                  value: String(contract.id),
                  label: `${contract.contract_number}${contract.title ? ` — ${contract.title}` : ""}`,
                }))}
              />
            )}

            <TextField
              label="Invoice Number"
              fullWidth
              value={values.invoice_number ?? ""}
              onChange={(event) =>
                form.setValue("invoice_number", event.target.value, { shouldValidate: true })
              }
              placeholder="Auto-generated if left blank"
            />

            <DateField
              label="Period Start"
              value={toDateValue(values.period_start)}
              onChange={(value) =>
                form.setValue("period_start", toDateString(value), { shouldValidate: true })
              }
            />

            <DateField
              label="Period End"
              value={toDateValue(values.period_end)}
              onChange={(value) =>
                form.setValue("period_end", toDateString(value), { shouldValidate: true })
              }
            />

            <SelectField
              label="Status"
              fullWidth
              value={values.status ?? "draft"}
              onValueChange={(value) =>
                form.setValue("status", value as CreateInvoiceValues["status"], {
                  shouldValidate: true,
                })
              }
              error={form.formState.errors.status?.message}
              options={[
                { value: "draft", label: "Draft" },
                { value: "submitted", label: "Submitted" },
                { value: "approved", label: "Approved" },
                { value: "paid", label: "Paid" },
                { value: "void", label: "Void" },
              ]}
            />
          </FormGrid>
        </FormSection>

        <FormActions
          submitLabel="Create Invoice"
          onCancel={() => router.push(`/${projectId}/invoicing`)}
          isSubmitting={isSubmitting}
        >
          <DevAutoFillButton formType="invoice" onAutoFill={handleDevAutoFill} />
        </FormActions>
      </Form>
    </PageShell>
  );
}
