/**
 * Type Exports - Single Source of Truth
 *
 * This file re-exports all types used in the application.
 * Import types from here rather than directly from individual files.
 *
 * Example: import { Project, Meeting } from '@/types'
 */

// Database types (auto-generated from Supabase)
export type { Database, Json } from "./database.types";

// Derived table types for convenience
import type { Database } from "./database.types";

// Table Row Types (what you get when fetching data)
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type Subcontract = Database["public"]["Tables"]["subcontracts"]["Row"];
export type PurchaseOrder =
  Database["public"]["Tables"]["purchase_orders"]["Row"];
export type ChangeOrder = Database["public"]["Tables"]["prime_contract_change_orders"]["Row"];
export type BudgetLine = Database["public"]["Tables"]["budget_lines"]["Row"];
// Legacy `documents` table dropped — file metadata lives in `document_metadata`.
export type Document = Database["public"]["Tables"]["document_metadata"]["Row"];
// TODO: These tables don't exist in current schema - need to create or update references
// export type User = Database["public"]["Tables"]["users"]["Row"];
export type User = any; // Placeholder until users table is created
export type Company = Database["public"]["Tables"]["companies"]["Row"];
export type Task = Database["public"]["Tables"]["tasks"]["Row"];
// export type AppUser = Database["public"]["Tables"]["app_users"]["Row"];
export type AppUser = any; // Placeholder until app_users table is created
export type OwnerInvoice =
  Database["public"]["Tables"]["owner_invoices"]["Row"];
export type MeetingSegment =
  Database["public"]["Tables"]["meeting_segments"]["Row"];

// Commitment is now a union type representing data from the commitments_unified view
export interface Commitment {
  id: string;
  project_id: number;
  number: string;
  contract_company_id: string | null;
  title: string | null;
  status: string;
  executed: boolean;
  type: "subcontract" | "purchase_order";
  retention_percentage: number | null;
  start_date: string | null;
  executed_date: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  original_amount: number;
  approved_change_orders: number;
  revised_contract_amount: number;
  billed_to_date: number;
  balance_to_finish: number;
}

// Insert Types (for creating new records)
export type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];
export type SubcontractInsert =
  Database["public"]["Tables"]["subcontracts"]["Insert"];
export type PurchaseOrderInsert =
  Database["public"]["Tables"]["purchase_orders"]["Insert"];
export type ChangeOrderInsert =
  Database["public"]["Tables"]["prime_contract_change_orders"]["Insert"];
export type DocumentInsert =
  Database["public"]["Tables"]["document_metadata"]["Insert"];

// Update Types (for updating records)
export type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];
export type SubcontractUpdate =
  Database["public"]["Tables"]["subcontracts"]["Update"];
export type PurchaseOrderUpdate =
  Database["public"]["Tables"]["purchase_orders"]["Update"];
export type DocumentUpdate =
  Database["public"]["Tables"]["document_metadata"]["Update"];

// Meeting data is stored in document_metadata table
// Filter by type='meeting' or source='fireflies' for meeting records
export type Meeting = Database["public"]["Tables"]["document_metadata"]["Row"];
export type MeetingInsert =
  Database["public"]["Tables"]["document_metadata"]["Insert"];
export type MeetingUpdate =
  Database["public"]["Tables"]["document_metadata"]["Update"];

// Re-export domain-specific types
export * from "./financial";
export * from "./project";
export * from "./project-home";
export * from "./portfolio";
export * from "./budget";

// Common utility types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

// Status types used across the application
export type StatusType =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "active"
  | "inactive"
  | "completed";
export type PriorityType = "low" | "medium" | "high" | "urgent";

// Badge variant type (matches Badge component)
export type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning";

// Helper to get status badge variant
export function getStatusBadgeVariant(status: string): BadgeVariant {
  const statusMap: Record<string, BadgeVariant> = {
    active: "success",
    approved: "success",
    completed: "success",
    pending: "warning",
    draft: "secondary",
    rejected: "destructive",
    inactive: "outline",
  };
  return statusMap[status.toLowerCase()] || "default";
}

// Helper to get priority badge variant
export function getPriorityBadgeVariant(priority: string): BadgeVariant {
  const priorityMap: Record<string, BadgeVariant> = {
    high: "destructive",
    urgent: "destructive",
    medium: "warning",
    low: "secondary",
  };
  return priorityMap[priority.toLowerCase()] || "default";
}
