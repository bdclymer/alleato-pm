/**
 * Typed database operations for subcontracts.
 *
 * This file uses the generated Supabase types directly to prevent
 * schema mismatches. All column names match the database exactly.
 */

import type { Database } from "@/types/database.types";

// Use the generated types - these are the source of truth
type SubcontractRow = Database["public"]["Tables"]["subcontracts"]["Row"];
type SubcontractInsert = Database["public"]["Tables"]["subcontracts"]["Insert"];

/**
 * Form data uses camelCase (JavaScript convention).
 * This type defines what the form submits.
 */
export interface SubcontractFormData {
  contractNumber?: string;
  contractCompanyId?: string | null;
  title?: string | null;
  status?: string;
  executed?: boolean;
  defaultRetainagePercent?: number | null;
  description?: string | null;
  inclusions?: string | null;
  exclusions?: string | null;
  dates?: {
    startDate?: string;
    estimatedCompletionDate?: string;
    actualCompletionDate?: string;
    contractDate?: string;
    signedContractReceivedDate?: string;
    issuedOnDate?: string;
  };
  privacy?: {
    isPrivate?: boolean;
    nonAdminUserIds?: string[];
    allowNonAdminViewSovItems?: boolean;
  };
  invoiceContacts?: string[];
  sov?: Array<{
    lineNumber?: number;
    changeEventLineItem?: string;
    budgetCode?: string;
    description?: string;
    amount?: number;
    billedToDate?: number;
  }>;
}

/**
 * Convert mm/dd/yyyy to ISO date string (yyyy-mm-dd) for database.
 * Returns null if the input is empty or invalid.
 */
function parseFormDate(dateStr: string | undefined): string | null {
  if (!dateStr?.trim()) return null;

  // Handle mm/dd/yyyy format
  const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    const [, month, day, year] = match;
    return `${year}-${month}-${day}`;
  }

  // Already ISO format or other valid date
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  return null;
}

/**
 * Maps form data (camelCase) to database insert payload (snake_case).
 *
 * This is the ONLY place where the mapping happens.
 * If you get a schema mismatch error, fix it HERE.
 */
export function mapFormToInsert(
  formData: SubcontractFormData,
  projectId: number,
  userId: string,
): SubcontractInsert {
  return {
    // Required fields
    project_id: projectId,
    contract_number: formData.contractNumber?.trim() || "",
    status: formData.status || "Draft",
    executed: formData.executed ?? false,

    // Optional fields - map camelCase to snake_case
    contract_company_id: formData.contractCompanyId || null,
    title: formData.title || null,
    default_retainage_percent: formData.defaultRetainagePercent ?? null,
    description: formData.description || null,
    inclusions: formData.inclusions || null,
    exclusions: formData.exclusions || null,

    // Date fields - convert mm/dd/yyyy to ISO
    start_date: parseFormDate(formData.dates?.startDate),
    estimated_completion_date: parseFormDate(
      formData.dates?.estimatedCompletionDate,
    ),
    actual_completion_date: parseFormDate(formData.dates?.actualCompletionDate),
    contract_date: parseFormDate(formData.dates?.contractDate),
    signed_contract_received_date: parseFormDate(
      formData.dates?.signedContractReceivedDate,
    ),
    issued_on_date: parseFormDate(formData.dates?.issuedOnDate),

    // Privacy fields
    is_private: formData.privacy?.isPrivate ?? true,
    non_admin_user_ids: formData.privacy?.nonAdminUserIds || [],
    allow_non_admin_view_sov_items:
      formData.privacy?.allowNonAdminViewSovItems ?? false,

    // Other fields
    invoice_contact_ids: formData.invoiceContacts || [],
    created_by: userId,
  };
}

/**
 * Maps database row (snake_case) to frontend format (camelCase).
 * Use this when displaying data from the database.
 */
export function mapRowToDisplay(row: SubcontractRow) {
  return {
    id: row.id,
    projectId: row.project_id,
    contractNumber: row.contract_number,
    contractCompanyId: row.contract_company_id,
    title: row.title,
    status: row.status,
    executed: row.executed,
    defaultRetainagePercent: row.default_retainage_percent,
    description: row.description,
    inclusions: row.inclusions,
    exclusions: row.exclusions,
    startDate: row.start_date,
    estimatedCompletionDate: row.estimated_completion_date,
    actualCompletionDate: row.actual_completion_date,
    contractDate: row.contract_date,
    signedContractReceivedDate: row.signed_contract_received_date,
    issuedOnDate: row.issued_on_date,
    isPrivate: row.is_private,
    nonAdminUserIds: row.non_admin_user_ids,
    allowNonAdminViewSovItems: row.allow_non_admin_view_sov_items,
    invoiceContactIds: row.invoice_contact_ids,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
  };
}
