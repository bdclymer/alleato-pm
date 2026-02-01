import { z } from "zod"; // Enums matching database CHECK constraints
export const ChangeEventType = z.enum([
  "Owner Change",
  "Design Change",
  "Allowance",
  "Scope Gap",
  "Unforeseen Condition",
  "Value Engineering",
  "Owner Requested",
  "Constructability Issue",
]);
export const ChangeEventScope = z.enum([
  "TBD",
  "In Scope",
  "Out of Scope",
  "Allowance",
]);
export const ChangeEventStatus = z.enum([
  "Open",
  "Pending Approval",
  "Approved",
  "Rejected",
  "Closed",
  "Converted",
]);
export const ChangeEventOrigin = z.enum(["Internal", "RFI", "Field"]);
export const LineItemRevenueSource = z.enum([
  "Match Latest Cost",
  "Latest Cost",
  "Latest Price",
]); // Create Change Event Schema
export const createChangeEventSchema = z.object({
  title: z.string().min(1).max(255, "Title must be less than 255 characters"),
  type: ChangeEventType,
  reason: z.string().max(100).optional(),
  scope: ChangeEventScope,
  origin: ChangeEventOrigin.optional(),
  expectingRevenue: z.boolean().default(true),
  lineItemRevenueSource: LineItemRevenueSource.optional(),
  primeContractId: z.coerce.number().int().positive().optional(),
  description: z.string().optional(),
});

// Update Change Event Schema
export const updateChangeEventSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  type: ChangeEventType.optional(),
  reason: z.string().max(100).optional(),
  scope: ChangeEventScope.optional(),
  expectingRevenue: z.boolean().optional(),
  lineItemRevenueSource: LineItemRevenueSource.optional(),
  primeContractId: z.string().uuid().optional(),
  description: z.string().optional(),
  status: ChangeEventStatus.optional(), // Only admin can change status
}); // Create Line Item Schema
export const createLineItemSchema = z.object({
  budgetCodeId: z.string().uuid().optional(),
  description: z.string(),
  vendorId: z.string().uuid().optional(),
  contractId: z.string().uuid().optional(),
  unitOfMeasure: z.string().max(50).optional(),
  quantity: z.number().positive().optional(),
  unitCost: z.number().nonnegative().optional(),
  revenueRom: z.number().nonnegative().optional(),
  costRom: z.number().nonnegative().optional(),
  nonCommittedCost: z.number().nonnegative().optional(),
  sortOrder: z.number().int().default(0),
}); // Update Line Item Schema
export const updateLineItemSchema = createLineItemSchema.partial(); // Query params schema
export const changeEventQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
  status: ChangeEventStatus.optional(),
  type: ChangeEventType.optional(),
  scope: ChangeEventScope.optional(),
  search: z.string().optional(),
  sort: z
    .enum(["createdAt", "updatedAt", "number", "title"])
    .default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  includeDeleted: z.coerce.boolean().default(false),
}); // Attachment Schema
export const createAttachmentSchema = z.object({
  fileName: z.string().max(255),
  filePath: z.string(),
  fileSize: z.number().positive(),
  mimeType: z.string().max(100),
});

// Approval Status Enum (matches DB CHECK constraint)
export const ApprovalStatus = z.enum(["pending", "approved", "rejected"]);

// Change Event Approval Schema
export const changeEventApprovalSchema = z.object({
  approver_id: z.string().uuid(),
  approval_status: ApprovalStatus.default("pending"),
  comments: z.string().optional(),
});

// Update Approval Schema
export const updateApprovalSchema = z.object({
  approval_id: z.string().uuid(),
  approval_status: ApprovalStatus,
  comments: z.string().optional(),
});
