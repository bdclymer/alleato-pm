import { z } from "zod";

export const companySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  title: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  license_number: z.string().trim().max(50, "License number must be 50 characters or less").optional(),
  currency_code: z.string().optional(),
  currency_symbol: z.string().optional(),
  notes: z.string().optional(),
});

export const companyUpdateSchema = companySchema.partial().extend({
  id: z.string().uuid(),
});

export const clientSchema = z.object({
  name: z.string().min(1, "Client name is required"),
  company_id: z.string().uuid().optional().nullable(),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const clientUpdateSchema = clientSchema.partial().extend({
  id: z.number(),
});

export const commitmentSchema = z.object({
  number: z.string().min(1, "Commitment number is required"),
  contract_company_id: z.string().uuid("Valid company ID required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum([
    "draft",
    "sent",
    "pending",
    "approved",
    "executed",
    "closed",
    "void",
  ]),
  original_amount: z.number().min(0, "Amount must be positive"),
  accounting_method: z.enum(["amount", "unit", "percent"]),
  retention_percentage: z.number().min(0).max(100).optional(),
  executed_date: z.string().optional(),
  start_date: z.string().optional(),
  substantial_completion_date: z.string().optional(),
  vendor_invoice_number: z.string().optional(),
  signed_received_date: z.string().optional(),
  assignee_id: z.string().uuid().optional(),
  private: z.boolean().default(false),
});

export const changeEventSchema = z.object({
  number: z.string().min(1, "Change event number is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["open", "pending", "approved", "closed"]),
  commitment_id: z.string().uuid().optional(),
  rom_cost_impact: z.number().optional(),
  rom_schedule_impact: z.number().optional(),
});

export const changeOrderSchema = z.object({
  co_number: z.string().min(1, "Change order number is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["draft", "pending", "approved", "executed", "rejected", "void"]),
  contract_id: z.number().int().positive().optional().nullable(),
  change_event_id: z.string().uuid().optional().nullable(),
  amount: z.number().default(0),
  is_private: z.boolean().default(false),
  due_date: z.string().optional().nullable(),
  rejection_reason: z.string().optional().nullable(),
});

export const primeContractSchema = z.object({
  number: z.string().min(1, "Contract number is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  owner_id: z.string().uuid("Valid owner ID required"),
  status: z.enum([
    "draft",
    "sent",
    "pending",
    "approved",
    "executed",
    "closed",
  ]),
  contract_date: z.string().optional(),
  start_date: z.string().optional(),
  substantial_completion_date: z.string().optional(),
  original_amount: z.number().min(0, "Amount must be positive"),
  retention_percentage: z.number().min(0).max(100).optional(),
});

export const invoiceSchema = z.object({
  commitment_id: z.string().uuid("Valid commitment ID required"),
  number: z.string().min(1, "Invoice number is required"),
  billing_period_start: z.string(),
  billing_period_end: z.string(),
  invoice_date: z.string(),
  due_date: z.string().optional(),
  status: z.enum(["draft", "submitted", "approved", "paid", "void"]),
  notes: z.string().optional(),
});

export type CompanyFormData = z.infer<typeof companySchema>;
export type CompanyUpdateData = z.infer<typeof companyUpdateSchema>;
export type ClientFormData = z.infer<typeof clientSchema>;
export type ClientUpdateData = z.infer<typeof clientUpdateSchema>;
export type CommitmentFormData = z.infer<typeof commitmentSchema>;
export type ChangeEventFormData = z.infer<typeof changeEventSchema>;
export type ChangeOrderFormData = z.infer<typeof changeOrderSchema>;
export type PrimeContractFormData = z.infer<typeof primeContractSchema>;
export type InvoiceFormData = z.infer<typeof invoiceSchema>;
