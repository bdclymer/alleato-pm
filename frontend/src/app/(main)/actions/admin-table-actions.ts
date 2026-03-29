"use server";

import { revalidatePath } from "next/cache";
import {
  listRows,
  getRow,
  createRow,
  updateRow,
  deleteRow,
  duplicateRow,
} from "@/server/db/crud";
import { getColumnMetadata, getFormColumns } from "@/server/db/introspection";
import { assertTableAllowed, type TableName } from "@/lib/table-registry";

/**
 * Server action to list rows from a table
 */
export async function listTableRows(
  table: string,
  options: {
    limit?: number;
    offset?: number;
    sort?: string;
    dir?: "asc" | "desc";
    search?: string;
    filters?: Record<string, string>;
  } = {},
) {
  assertTableAllowed(table);
  return listRows({ table, ...options });
}

/**
 * Server action to get a single row
 */
export async function getTableRow(table: string, id: string | number) {
  assertTableAllowed(table);
  return getRow({ table, id });
}

/**
 * Server action to create a new row
 */
export async function createTableRow(
  table: string,
  data: Record<string, unknown>,
) {
  assertTableAllowed(table);
  const result = await createRow({ table, data });

  if (result.success) {
    revalidatePath(`/admin/tables/${table}`);
    revalidatePath("/admin/tables");
  }

  return result;
}

/**
 * Server action to update a row
 */
export async function updateTableRow(
  table: string,
  id: string | number,
  data: Record<string, unknown>,
) {
  assertTableAllowed(table);
  const result = await updateRow({ table, id, data });

  if (result.success) {
    revalidatePath(`/admin/tables/${table}`);
    revalidatePath(`/admin/tables/${table}/${id}`);
    revalidatePath("/admin/tables");
  }

  return result;
}

/**
 * Server action to delete a row
 */
export async function deleteTableRow(table: string, id: string | number) {
  assertTableAllowed(table);
  const result = await deleteRow({ table, id });

  if (result.success) {
    revalidatePath(`/admin/tables/${table}`);
    revalidatePath("/admin/tables");
  }

  return result;
}

/**
 * Server action to duplicate a row
 */
export async function duplicateTableRow(table: string, id: string | number) {
  assertTableAllowed(table);
  const result = await duplicateRow({ table, id });

  if (result.success) {
    revalidatePath(`/admin/tables/${table}`);
    revalidatePath("/admin/tables");
  }

  return result;
}

/**
 * Server action to get column metadata for a table
 */
export async function getTableColumnMetadata(table: string) {
  assertTableAllowed(table);
  try {
    const columns = await getColumnMetadata(table as TableName);
    return { success: true, data: columns };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Server action to get form columns for create/edit
 */
export async function getTableFormColumns(
  table: string,
  mode: "create" | "edit",
) {
  assertTableAllowed(table);
  try {
    const columns = await getFormColumns(table as TableName, mode);
    return { success: true, data: columns };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}
