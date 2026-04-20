import { z } from "zod";

const numericString = z
  .string()
  .trim()
  .refine((val) => val === "" || !Number.isNaN(Number(val)), "Must be numeric");

const amountString = numericString.refine(
  (val) => val !== "" && Number(val) !== 0,
  "Amount must be non-zero",
);

const optionalString = z
  .string()
  .trim()
  .transform((val) => (val === "" ? null : val))
  .nullable()
  .optional();

export const BudgetLineItemSchema = z.object({
  costCodeId: z.string().min(1, "Budget code required"),
  costType: z.string().min(1, "Cost type is required"),
  qty: numericString.optional(),
  uom: optionalString,
  unitCost: numericString.optional(),
  amount: amountString,
  description: optionalString,
});

export const BudgetLineItemsPayloadSchema = z.object({
  lineItems: z
    .array(BudgetLineItemSchema)
    .min(1, "At least one line item is required"),
});

export const BudgetModificationPayloadSchema = z.object({
  budgetItemId: z.string().uuid("budgetItemId must be a valid UUID"),
  amount: amountString,
  title: optionalString,
  description: optionalString,
  reason: optionalString,
  approver: optionalString,
  modificationType: z.enum(["addition", "deduction"]).optional().nullable(),
  changeEventId: z.string().uuid().optional().nullable(),
});

// Schema for modification status actions (submit, approve, reject, void)
export const BudgetModificationActionSchema = z.object({
  modificationId: z.string().uuid("modificationId must be a valid UUID"),
  action: z.enum(["submit", "approve", "reject", "void"]),
  voidedReason: z.string().min(1).max(1000).optional(),
});

export type BudgetLineItemPayload = z.infer<
  typeof BudgetLineItemsPayloadSchema
>;
export type BudgetModificationPayload = z.infer<
  typeof BudgetModificationPayloadSchema
>;
export type BudgetModificationAction = z.infer<
  typeof BudgetModificationActionSchema
>;
