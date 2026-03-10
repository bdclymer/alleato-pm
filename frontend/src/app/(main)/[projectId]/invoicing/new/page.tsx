"use client";

import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ProjectFormPageLayout } from "@/components/layout";
import { FormGrid, FormSection } from "@/components/forms";
import { FormActions } from "@/components/forms/FormActions";

const createInvoiceSchema = z.object({
  contract_id: z.number().min(1, "Contract is required"),
  invoice_number: z.string().optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
  status: z.enum(["draft", "submitted", "approved", "paid", "void"]),
});

type CreateInvoiceValues = z.infer<typeof createInvoiceSchema>;

interface ContractOption {
  id: number;
  contract_number: string;
  title: string | null;
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
      status: "draft",
    },
  });

  useEffect(() => {
    async function loadContracts() {
      try {
        const res = await fetch(`/api/projects/${projectId}/contracts`);
        if (!res.ok) throw new Error("Failed to load contracts");
        const data = await res.json();
        setContracts(data.data ?? data ?? []);
      } catch {
        toast.error("Failed to load contracts");
      } finally {
        setIsLoadingContracts(false);
      }
    }
    loadContracts();
  }, [projectId]);

  async function onSubmit(values: CreateInvoiceValues) {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/invoicing/owner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to create invoice");
      }

      toast.success("Invoice created successfully");
      router.push(`/${projectId}/invoicing`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create invoice");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ProjectFormPageLayout
        title="Create Owner Invoice"
        description="Add a new owner invoice for this project"
      maxWidth="lg"
      headerActions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/${projectId}/invoicing`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Invoicing
        </Button>
      }
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-8 max-w-2xl"
        >
          <FormSection
            title="Invoice Details"
            description="Set contract, billing period, and starting status."
          >
            <FormGrid columns={2}>
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="contract_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contract *</FormLabel>
                      <Select
                        disabled={isLoadingContracts}
                        onValueChange={(v) => field.onChange(Number(v))}
                        value={field.value ? String(field.value) : ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                isLoadingContracts
                                  ? "Loading contracts..."
                                  : "Select a contract"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {contracts.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {c.contract_number}
                              {c.title ? ` — ${c.title}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="invoice_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Auto-generated if left blank"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="period_start"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period Start</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="period_end"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period End</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="submitted">Submitted</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="void">Void</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </FormGrid>
          </FormSection>

          <FormActions
            submitLabel="Create Invoice"
            onCancel={() => router.push(`/${projectId}/invoicing`)}
            isSubmitting={isSubmitting}
          />
        </form>
      </Form>
    </ProjectFormPageLayout>
  );
}
