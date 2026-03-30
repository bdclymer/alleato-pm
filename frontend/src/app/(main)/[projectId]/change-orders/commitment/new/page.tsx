"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import { createClient } from "@/lib/supabase/client";
import { PageShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  change_order_number: z.string().min(1, "CO number is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.number(),
  contract_id: z.string().min(1, "Contract is required"),
});

type FormData = z.infer<typeof schema>;

interface ContractOption {
  id: string;
  contract_number: string | null;
  title: string | null;
}

export default function NewCommitmentCOPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contracts, setContracts] = useState<ContractOption[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      change_order_number: "",
      description: "",
      amount: 0,
      contract_id: "",
    },
  });

  // Load contracts for the dropdown
  useEffect(() => {
    const fetchContracts = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("prime_contracts")
        .select("id, contract_number, title")
        .eq("project_id", Number(projectId))
        .order("contract_number");
      if (data) setContracts(data);
    };
    fetchContracts();
  }, [projectId]);

  const handleSubmit: SubmitHandler<FormData> = async (data) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/contracts/${data.contract_id}/change-orders`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            change_order_number: data.change_order_number,
            description: data.description,
            amount: data.amount,
          }),
        },
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create");
      }

      const created = await res.json();
      toast.success("Change order created");
      router.push(`/${projectId}/change-orders/commitment/${created.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageShell
      variant="form"
      title="Create Commitment Change Order"
      onBack={() => router.back()}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/${projectId}/change-orders?tab=commitment`)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={form.handleSubmit(handleSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create"}
          </Button>
        </div>
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="contract_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contract *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a contract" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {contracts.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.contract_number || "—"} — {c.title || "Untitled"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="change_order_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CO Number *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. 001816" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description *</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={4} placeholder="Describe the change..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        value={field.value}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </form>
      </Form>
    </PageShell>
  );
}
