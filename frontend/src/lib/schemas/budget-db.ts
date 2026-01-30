/**
 * DATABASE-ALIGNED BUDGET SCHEMAS
 *
 * These schemas match the ACTUAL database column names to prevent mismatches.
 * Auto-generated from database.types.ts to ensure type safety.
 *
 * IMPORTANT: These use snake_case to match PostgreSQL column names exactly.
 */

import { z } from "zod";
import type { Database } from "@/types/database.types";

// Extract the actual database types
type _BudgetLineRow = Database["public"]["Tables"]["budget_lines"]["Row"];
type BudgetLineInsert = Database["public"]["Tables"]["budget_lines"]["Insert"];
type BudgetLineUpdate = Database["public"]["Tables"]["budget_lines"]["Update"];

/**
 * BUDGET LINE INSERT SCHEMA
 * Validates data before inserting into budget_lines table
 * Uses actual database column names (snake_case)
 */
export const BudgetLineInsertSchema = z.object({
  // Required fields
  project_id: z.number().int().positive("Project ID required"),
  cost_code_id: z.string().uuid("Cost code ID must be valid UUID"),
  cost_type_id: z.string().uuid("Cost type ID must be valid UUID"),
  original_amount: z.number().default(0),

  // Optional fields
  description: z.string().trim().nullable().optional(),
  quantity: z.number().nullable().optional(),
  unit_cost: z.number().nullable().optional(),
  unit_of_measure: z.string().trim().nullable().optional(),
  project_budget_code_id: z.string().uuid().nullable().optional(),
  sub_job_id: z.string().uuid().nullable().optional(),
  sub_job_key: z.string().nullable().optional(),

  // Forecasting fields
  forecasting_enabled: z.boolean().default(false),
  default_ftc_method: z
    .enum(["manual", "automatic", "lump_sum", "monitored_resources"])
    .nullable()
    .optional(),
  default_curve_id: z.string().uuid().nullable().optional(),

  // Audit fields (auto-populated by triggers, but can be overridden)
  created_by: z.string().uuid().nullable().optional(),
  updated_by: z.string().uuid().nullable().optional(),
}) satisfies z.ZodType<Partial<BudgetLineInsert>>;

/**
 * BUDGET LINE UPDATE SCHEMA
 * Validates data before updating budget_lines table
 */
export const BudgetLineUpdateSchema = z.object({
  description: z.string().trim().nullable().optional(),
  quantity: z.number().nullable().optional(),
  unit_cost: z.number().nullable().optional(),
  unit_of_measure: z.string().trim().nullable().optional(),
  original_amount: z.number().optional(),
  forecasting_enabled: z.boolean().optional(),
  default_ftc_method: z
    .enum(["manual", "automatic", "lump_sum", "monitored_resources"])
    .nullable()
    .optional(),
  default_curve_id: z.string().uuid().nullable().optional(),
  updated_by: z.string().uuid().nullable().optional(),
}) satisfies z.ZodType<Partial<BudgetLineUpdate>>;

/**
 * BUDGET MODIFICATION INSERT SCHEMA
 * For budget transfers/modifications
 */
export const BudgetModificationInsertSchema = z.object({
  project_id: z.number().int().positive(),
  from_budget_line_id: z.string().uuid(),
  to_budget_line_id: z.string().uuid(),
  amount: z.number().refine((val) => val !== 0, "Amount cannot be zero"),
  description: z.string().trim().nullable().optional(),
  created_by: z.string().uuid().nullable().optional(),
});

/**
 * BULK BUDGET LINE INSERT SCHEMA
 * For creating multiple budget lines at once
 */
export const BulkBudgetLineInsertSchema = z.object({
  project_id: z.number().int().positive("Project ID required"),
  budget_lines: z
    .array(BudgetLineInsertSchema)
    .min(1, "At least one budget line required"),
});

/**
 * TYPE EXPORTS
 * TypeScript types inferred from Zod schemas
 */
export type BudgetLineInsertInput = z.infer<typeof BudgetLineInsertSchema>;
export type BudgetLineUpdateInput = z.infer<typeof BudgetLineUpdateSchema>;
export type BudgetModificationInsertInput = z.infer<
  typeof BudgetModificationInsertSchema
>;
export type BulkBudgetLineInsertInput = z.infer<
  typeof BulkBudgetLineInsertSchema
>;

/**
 * VALIDATION HELPERS
 * Use these in API routes to validate requests
 */
export function validateBudgetLineInsert(data: unknown): BudgetLineInsertInput {
  return BudgetLineInsertSchema.parse(data);
}

export function validateBudgetLineUpdate(data: unknown): BudgetLineUpdateInput {
  return BudgetLineUpdateSchema.parse(data);
}

export function validateBudgetModification(
  data: unknown,
): BudgetModificationInsertInput {
  return BudgetModificationInsertSchema.parse(data);
}

export function validateBulkBudgetLineInsert(
  data: unknown,
): BulkBudgetLineInsertInput {
  return BulkBudgetLineInsertSchema.parse(data);
}

/**
 * SAFE VALIDATION HELPERS
 * Return success/error objects instead of throwing
 */
export function safeParseBudgetLineInsert(data: unknown) {
  return BudgetLineInsertSchema.safeParse(data);
}

export function safeParseBudgetLineUpdate(data: unknown) {
  return BudgetLineUpdateSchema.safeParse(data);
}

export function safeParseBudgetModification(data: unknown) {
  return BudgetModificationInsertSchema.safeParse(data);
}

export function safeParseBulkBudgetLineInsert(data: unknown) {
  return BulkBudgetLineInsertSchema.safeParse(data);
}
