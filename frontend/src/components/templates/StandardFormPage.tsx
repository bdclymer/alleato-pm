/* eslint-disable design-system/no-raw-heading */
/**
 * =============================================================================
 * STANDARD FORM PAGE TEMPLATE
 * =============================================================================
 *
 * This is the CANONICAL template for all form pages in the application.
 * Copy this file and customize for your specific feature.
 *
 * RULES:
 * 1. Use ONLY standard UI components from @/components/ui
 * 2. Use ONLY standard layout components from @/components/layout
 * 3. NO custom styling on inputs, selects, or buttons
 * 4. NO Card wrappers around form sections (use section headings instead)
 * 5. Use consistent spacing (space-y-8 for sections, space-y-6 within sections)
 * 6. Form actions always at bottom with border-t separator
 * 7. PageHeader MUST be INSIDE PageContainer so header and content share
 *    the same width constraints and horizontal padding
 *
 * COMPONENTS ALLOWED:
 * - PageHeader, PageContainer, FormContainer from @/components/layout
 * - Input, Textarea, Select, Button from @/components/ui
 * - Form, FormField, FormItem, FormLabel, FormControl, FormMessage from @/components/ui/form
 *
 * COMPONENTS NOT ALLOWED:
 * - Card, CardHeader, CardContent (use section headings instead)
 * - Custom styled buttons/inputs
 * - Inline styles or custom classNames on form controls
 */

"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, PageContainer, FormContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyField } from "@/components/forms/MoneyField";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// =============================================================================
// SINGLE SOURCE OF TRUTH
// =============================================================================

const TYPE_VALUES = ["type_a", "type_b", "type_c"] as const;
const STATUS_VALUES = ["draft", "pending", "approved"] as const;

const TYPE_OPTIONS: Array<{ value: (typeof TYPE_VALUES)[number]; label: string }> = [
  { value: "type_a", label: "Type A" },
  { value: "type_b", label: "Type B" },
  { value: "type_c", label: "Type C" },
];

const STATUS_OPTIONS: Array<{
  value: (typeof STATUS_VALUES)[number];
  label: string;
}> = [
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
];

// =============================================================================
// HELPERS
// =============================================================================

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="border-b pb-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

// =============================================================================
// SCHEMA
// =============================================================================

const formSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  type: z.enum(TYPE_VALUES),
  date: z
    .string()
    .trim()
    .min(1, "Date is required")
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: "Please enter a valid date",
    }),

  description: z.string().trim().optional(),

  amount: z.number().min(0, "Amount must be 0 or greater"),

  status: z.enum(STATUS_VALUES),
  notes: z.string().trim().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// =============================================================================
// API ERROR SHAPE
// =============================================================================

type SaveResponse =
  | { success: true; id?: string }
  | {
      success: false;
      message?: string;
      fieldErrors?: Partial<Record<keyof FormValues, string>>;
    };

// =============================================================================
// PAGE
// =============================================================================

export default function StandardFormPage() {
  const params = useParams()!;
  const router = useRouter();
  const projectId = params.projectId as string;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      type: "type_a",
      date: new Date().toISOString().split("T")[0],
      description: "",
      amount: 0,
      status: "draft",
      notes: "",
    },
  });

  const {
    handleSubmit,
    control,
    setError,
    formState: { isSubmitting, errors },
  } = form;

  async function onSubmit(data: FormValues) {
    try {
      const response = await fetch(`/api/projects/${projectId}/your-endpoint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      let payload: SaveResponse | null = null;

      try {
        payload = (await response.json()) as SaveResponse;
      } catch {
        payload = null;
      }

      if (!response.ok) {
        if (payload && !payload.success && payload.fieldErrors) {
          for (const [fieldName, message] of Object.entries(payload.fieldErrors)) {
            if (!message) continue;
            setError(fieldName as keyof FormValues, {
              type: "server",
              message,
            });
          }
        }

        const message =
          payload && !payload.success && payload.message
            ? payload.message
            : "Failed to save item";

        setError("root", {
          type: "server",
          message,
        });

        toast.error(message);
        return;
      }

      toast.success("Item created successfully");
      router.push(`/${projectId}/your-list`);
      router.refresh();
    } catch (error) {
      console.error("Error saving item:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong while saving";

      setError("root", {
        type: "server",
        message,
      });

      toast.error(message);
    }
  }

  function handleCancel() {
    router.push(`/${projectId}/your-list`);
  }

  return (
    <PageContainer>
      <PageHeader
        title="Create New Item"
        description="Fill out the form below to create a new item"
      />

      <FormContainer maxWidth="lg" withCard={false}>
        <Form {...form}>
          <form
            noValidate
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-8"
          >
            <section className="space-y-6" aria-labelledby="basic-information">
              <SectionHeader
                title="Basic Information"
                description="Enter the core details for this item"
              />

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField
                  control={control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter name"
                          autoComplete="off"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type *</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <MoneyField
                          inline
                          label="Amount"
                          value={typeof field.value === "number" ? field.value : undefined}
                          onChange={(val) => field.onChange(val ?? 0)}
                          showCurrency={false}
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter a description..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional details about this item
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>

            <section className="space-y-6" aria-labelledby="additional-details">
              <SectionHeader
                title="Additional Details"
                description="Optional information and settings"
              />

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {STATUS_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Controls where this item is in the workflow
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any additional notes..."
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>

            {errors.root?.message ? (
              <div
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
              >
                {errors.root.message}
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-4 border-t pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Create Item"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </FormContainer>
    </PageContainer>
  );
}
