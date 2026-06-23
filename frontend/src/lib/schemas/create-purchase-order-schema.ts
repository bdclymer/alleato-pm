import { z } from "zod";
import {
  optionalNumber,
  optionalPercent,
  optionalPositiveNumber,
  requiredNumber,
} from "./common";

// SOV Line Item for Purchase Orders (Unit/Quantity-based)
export const PurchaseOrderSovLineItemSchema = z.object({
  lineNumber: requiredNumber,
  changeEventLineItem: z.string().optional(),
  budgetCode: z.string().optional(),
  description: z.string().optional(),
  quantity: optionalNumber,
  uom: z.string().optional(), // Unit of Measure: EA, LF, SF, etc.
  unitCost: optionalNumber,
  amount: requiredNumber,
  billedToDate: optionalPositiveNumber,
});

export type PurchaseOrderSovLineItem = z.infer<
  typeof PurchaseOrderSovLineItemSchema
>;

// Contract Dates
const ContractDatesSchema = z.object({
  contractDate: z.string().optional(),
  deliveryDate: z.string().optional(),
  signedPoReceivedDate: z.string().optional(),
  issuedOnDate: z.string().optional(),
});

// Privacy Settings
const PrivacySchema = z.object({
  isPrivate: z.boolean(),
  nonAdminUserIds: z.array(z.string()).optional(),
  allowNonAdminViewSovItems: z.boolean(),
});

// Main Purchase Order Schema
export const CreatePurchaseOrderSchema = z.object({
  // General Information
  contractNumber: z.string().min(1, "Contract number is required"),
  contractCompanyId: z.string().optional(),
  companyLicenseNumber: z.string().trim().max(50, "License number must be 50 characters or less").optional(),
  title: z.string().min(1, "Title is required"),
  status: z.enum([
    "Draft",
    "Out for Bid",
    "Out for Signature",
    "Approved",
    "Complete",
    "Terminated",
  ]),
  executed: z.boolean(),
  defaultRetainagePercent: optionalPercent,
  assignedTo: z.string().optional(), // User ID

  // Billing & Shipping
  billTo: z.string().optional(), // Rich text (HTML)
  paymentTerms: z.string().optional(),
  shipTo: z.string().optional(), // Rich text (HTML)
  shipVia: z.string().optional(),

  // Description
  description: z.string().optional(),

  // Schedule of Values (Unit/Quantity-based)
  sov: z.array(PurchaseOrderSovLineItemSchema),
  accountingMethod: z.enum(["unit-quantity", "amount"]),

  // Contract Dates
  dates: ContractDatesSchema.optional(),

  // Privacy & Access
  privacy: PrivacySchema.optional(),

  // Invoice Contacts
  invoiceContactIds: z.array(z.string()).optional(),
});

export type CreatePurchaseOrderInput = z.infer<
  typeof CreatePurchaseOrderSchema
>;
