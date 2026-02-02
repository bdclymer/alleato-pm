import { z } from "zod";

// =============================================================================
// RFI Validation Schemas
// =============================================================================

/**
 * Base schema for all RFI operations.
 * Subject is always required; other fields are optional.
 */
export const rfiBaseSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  question: z.string().optional().default(""),
  due_date: z.string().nullable().optional(),
  assignees: z.array(z.string()).optional().default([]),
  rfi_manager: z.string().nullable().optional(),
  received_from: z.string().nullable().optional(),
  responsible_contractor: z.string().nullable().optional(),
  distribution_list: z.array(z.string()).optional().default([]),
  location: z.string().nullable().optional(),
  specification: z.string().nullable().optional(),
  cost_code: z.string().nullable().optional(),
  schedule_impact: z.string().nullable().optional(),
  cost_impact: z.string().nullable().optional(),
  reference: z.string().nullable().optional(),
  is_private: z.boolean().optional().default(false),
  rfi_stage: z.string().nullable().optional(),
});

/**
 * Draft schema — only subject required.
 */
export const rfiDraftSchema = rfiBaseSchema;

/**
 * Open schema — subject + assignees + due_date + question all required.
 */
export const rfiOpenSchema = rfiBaseSchema.extend({
  question: z.string().min(1, "Question is required for Open RFIs"),
  due_date: z.string().min(1, "Due date is required for Open RFIs"),
  assignees: z
    .array(z.string())
    .min(1, "At least one assignee is required for Open RFIs"),
});

/**
 * Edit schema — partial base for updates.
 */
export const rfiEditSchema = rfiBaseSchema.partial();

// =============================================================================
// Status Constants
// =============================================================================

export const RFI_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "open", label: "Open" },
  { value: "pending", label: "Pending" },
  { value: "closed", label: "Closed" },
  { value: "void", label: "Void" },
] as const;

export const RFI_STATUS_VARIANT_MAP: Record<
  string,
  "default" | "secondary" | "destructive" | "outline" | "success"
> = {
  draft: "secondary",
  open: "default",
  pending: "outline",
  closed: "success",
  void: "destructive",
};

export const RFI_IMPACT_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "tbd", label: "TBD" },
  { value: "n/a", label: "N/A" },
] as const;

// =============================================================================
// Inferred Types
// =============================================================================

export type RfiFormValues = z.infer<typeof rfiBaseSchema>;
export type RfiEditValues = z.infer<typeof rfiEditSchema>;
