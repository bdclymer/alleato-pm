"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ChangeEventLineItem } from "@/types/change-events";

interface ChangeEventRfqResponseFormProps {
  projectId: number;
  changeEventId: string;
  isSubmitting?: boolean;
  onSubmit: (payload: ChangeEventRfqResponseFormValues) => Promise<void>;
  onCancel: () => void;
}

export interface ChangeEventRfqResponseFormValues {
  lineItemId: string;
  unitPrice: number;
  notes: string;
}

interface LineItemOption {
  id: string;
  label: string;
}

export function ChangeEventRfqResponseForm({
  projectId,
  changeEventId,
  isSubmitting,
  onSubmit,
  onCancel,
}: ChangeEventRfqResponseFormProps) {
  const [lineItems, setLineItems] = useState<LineItemOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const form = useForm<ChangeEventRfqResponseFormValues>({
    defaultValues: {
      lineItemId: "",
      unitPrice: 0,
      notes: "",
    },
  });

  const fetchLineItems = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/change-events/${changeEventId}/line-items`,
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Unable to load line items");
      }
      const payload = await response.json();
      const options = (payload.data as ChangeEventLineItem[]).map((item) => ({
        id: item.id,
        label: `${item.description || "Untitled"}`,
      }));
      setLineItems(options);
      if (options.length && !form.getValues("lineItemId")) {
        form.setValue("lineItemId", options[0].id);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load line items");
    } finally {
      setLoading(false);
    }
  }, [projectId, changeEventId, form]);

  useEffect(() => {
    fetchLineItems();
  }, [fetchLineItems]);

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values);
    form.reset({ lineItemId: lineItems[0]?.id ?? "", unitPrice: 0, notes: "" });
  });

  const content = useMemo(() => {
    if (loading) {
      return <p className="text-sm text-muted-foreground">Loading line items…</p>;
    }
    if (loadError) {
      return (
        <div className="rounded border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {loadError}
        </div>
      );
    }
    if (!lineItems.length) {
      return (
        <p className="text-sm text-muted-foreground">
          No line items are available for this change event. Add line items before collecting RFQ responses.
        </p>
      );
    }
    return null;
  }, [loading, loadError, lineItems]);

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        {content}

        {lineItems.length > 0 ? (
          <FormField
            control={form.control}
            name="lineItemId"
            rules={{ required: true }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Line Item</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select line item" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {lineItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}

        <FormField
          control={form.control}
          name="unitPrice"
          rules={{ required: true, min: 0 }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit Price</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  value={field.value}
                  onChange={(event) => field.onChange(Number(event.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Response notes" {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !lineItems.length}>
            {isSubmitting ? "Submitting..." : "Submit Response"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
