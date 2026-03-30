/**
 * Generic CRUD Layer for Admin Table Explorer
 *
 * Server-only functions for creating, reading, updating, and deleting rows
 * from any allowlisted table in the database.
 *
 * SECURITY: All operations validate table names against the registry before execution.
 */

import { createServiceClient } from "@/lib/supabase/service";
import {
  assertTableAllowed,
  getTableConfig,
  hasPermission,
  type TableName,
} from "@/lib/table-registry";
import { filterValidColumns, getPrimaryKey } from "./introspection";

export interface ListRowsParams {
  table: TableName;
  limit?: number;
  offset?: number;
  sort?: string;
  dir?: "asc" | "desc";
  search?: string;
  filters?: Record<string, string>;
}

export interface ListRowsResult {
  rows: Record<string, unknown>[];
  count: number;
  limit: number;
  offset: number;
}

export interface GetRowParams {
  table: TableName;
  id: string | number;
}

export interface CreateRowParams {
  table: TableName;
  data: Record<string, unknown>;
}

export interface UpdateRowParams {
  table: TableName;
  id: string | number;
  data: Record<string, unknown>;
}

export interface DeleteRowParams {
  table: TableName;
  id: string | number;
}

export interface CrudResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 200;

// Helper to get a typed-loose supabase client for dynamic queries
function getQueryBuilder(tableName: string): any {
  const supabase = createServiceClient();
  // Use any to bypass the recursive type checking
  return (supabase as any).from(tableName);
}

/**
 * List rows from a table with pagination, sorting, search, and filters
 */
export async function listRows(
  params: ListRowsParams,
): Promise<CrudResult<ListRowsResult>> {
  const {
    table,
    limit: requestedLimit = DEFAULT_LIMIT,
    offset = 0,
    sort,
    dir = "desc",
    search,
    filters = {},
  } = params;

  try {
    // Security check
    assertTableAllowed(table);

    // Permission check
    if (!hasPermission(table, "read")) {
      return { success: false, error: "Read permission denied for this table" };
    }

    const config = getTableConfig(table);

    // Apply limit cap
    const limit = Math.min(requestedLimit, MAX_LIMIT);

    // Determine sort settings
    const sortColumn = sort ?? config.defaultSort.column;
    const sortDir = sort ? dir : config.defaultSort.direction;

    // Build search condition
    const searchCondition =
      search &&
      search.trim() &&
      config.searchColumns &&
      config.searchColumns.length > 0
        ? config.searchColumns
            .map((col) => `${col}.ilike.%${search.trim()}%`)
            .join(",")
        : null;

    // Build filter object
    const filterEntries = Object.entries(filters).filter(
      ([, value]) => value !== undefined && value !== "",
    );

    // Build and execute query
    let query = getQueryBuilder(table).select("*", { count: "exact" });

    if (searchCondition) {
      query = query.or(searchCondition);
    }

    if (filterEntries.length > 0) {
      const filterObj = Object.fromEntries(filterEntries);
      query = query.match(filterObj);
    }

    const result = await query
      .order(sortColumn, { ascending: sortDir === "asc" })
      .range(offset, offset + limit - 1);

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return {
      success: true,
      data: {
        rows: (result.data ?? []) as Record<string, unknown>[],
        count: (result.count ?? 0) as number,
        limit,
        offset,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "an unexpected error occurred";
    return { success: false, error: message };
  }
}

/**
 * Get a single row by primary key
 */
export async function getRow(
  params: GetRowParams,
): Promise<CrudResult<Record<string, unknown>>> {
  const { table, id } = params;

  try {
    // Security check
    assertTableAllowed(table);

    // Permission check
    if (!hasPermission(table, "read")) {
      return { success: false, error: "Read permission denied for this table" };
    }

    const pk = getPrimaryKey(table);

    const result = await getQueryBuilder(table).select("*").eq(pk, id).single();

    if (result.error) {
      if (result.error.code === "PGRST116") {
        return { success: false, error: "Row not found" };
      }
      return { success: false, error: result.error.message };
    }

    return {
      success: true,
      data: result.data as Record<string, unknown>,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "an unexpected error occurred";
    return { success: false, error: message };
  }
}

/**
 * Create a new row in a table
 */
export async function createRow(
  params: CreateRowParams,
): Promise<CrudResult<Record<string, unknown>>> {
  const { table, data } = params;

  try {
    // Security check
    assertTableAllowed(table);

    // Permission check
    if (!hasPermission(table, "create")) {
      return {
        success: false,
        error: "Create permission denied for this table",
      };
    }

    // Filter out invalid columns and identity columns
    const pk = getPrimaryKey(table);
    const filteredData = await filterValidColumns(table, data);

    // Remove primary key and auto-generated fields from insert data
    delete filteredData[pk];
    delete filteredData["created_at"];
    delete filteredData["updated_at"];

    // Remove null/undefined values for required fields
    const cleanData = Object.fromEntries(
      Object.entries(filteredData).filter(([, value]) => value !== undefined),
    );

    const result = await getQueryBuilder(table)
      .insert(cleanData)
      .select()
      .single();

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return {
      success: true,
      data: result.data as Record<string, unknown>,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "an unexpected error occurred";
    return { success: false, error: message };
  }
}

/**
 * Update an existing row by primary key
 */
export async function updateRow(
  params: UpdateRowParams,
): Promise<CrudResult<Record<string, unknown>>> {
  const { table, id, data } = params;

  try {
    // Security check
    assertTableAllowed(table);

    // Permission check
    if (!hasPermission(table, "update")) {
      return {
        success: false,
        error: "Update permission denied for this table",
      };
    }

    // Filter out invalid columns
    const pk = getPrimaryKey(table);
    const filteredData = await filterValidColumns(table, data);

    // Never allow updating primary key or created_at
    delete filteredData[pk];
    delete filteredData["created_at"];

    // Remove undefined values but keep null (for clearing fields)
    const cleanData = Object.fromEntries(
      Object.entries(filteredData).filter(([, value]) => value !== undefined),
    );

    if (Object.keys(cleanData).length === 0) {
      return { success: false, error: "No valid fields to update" };
    }

    const result = await getQueryBuilder(table)
      .update(cleanData)
      .eq(pk, id)
      .select()
      .single();

    if (result.error) {
      if (result.error.code === "PGRST116") {
        return { success: false, error: "Row not found" };
      }
      return { success: false, error: result.error.message };
    }

    return {
      success: true,
      data: result.data as Record<string, unknown>,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "an unexpected error occurred";
    return { success: false, error: message };
  }
}

/**
 * Delete a row by primary key
 */
export async function deleteRow(
  params: DeleteRowParams,
): Promise<CrudResult<void>> {
  const { table, id } = params;

  try {
    // Security check
    assertTableAllowed(table);

    // Permission check
    if (!hasPermission(table, "delete")) {
      return {
        success: false,
        error: "Delete permission denied for this table",
      };
    }

    const pk = getPrimaryKey(table);

    const result = await getQueryBuilder(table).delete().eq(pk, id);

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "an unexpected error occurred";
    return { success: false, error: message };
  }
}

/**
 * Duplicate a row (creates a copy with a new ID)
 */
export async function duplicateRow(
  params: GetRowParams,
): Promise<CrudResult<Record<string, unknown>>> {
  const { table, id } = params;

  try {
    // First get the existing row
    const getResult = await getRow({ table, id });
    if (!getResult.success || !getResult.data) {
      return { success: false, error: getResult.error ?? "Row not found" };
    }

    // Remove identity fields
    const pk = getPrimaryKey(table);
    const rowData = { ...getResult.data };
    delete rowData[pk];
    delete rowData["created_at"];
    delete rowData["updated_at"];

    // Create the duplicate
    return createRow({ table, data: rowData });
  } catch (err) {
    const message = err instanceof Error ? err.message : "an unexpected error occurred";
    return { success: false, error: message };
  }
}

/**
 * Get count of rows matching optional filters
 */
export async function getRowCount(
  table: TableName,
  filters?: Record<string, string>,
): Promise<CrudResult<number>> {
  try {
    assertTableAllowed(table);

    if (!hasPermission(table, "read")) {
      return { success: false, error: "Read permission denied for this table" };
    }

    let query = getQueryBuilder(table).select("*", {
      count: "exact",
      head: true,
    });

    if (filters) {
      const filterEntries = Object.entries(filters).filter(
        ([, value]) => value !== undefined && value !== "",
      );
      if (filterEntries.length > 0) {
        query = query.match(Object.fromEntries(filterEntries));
      }
    }

    const result = await query;

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return { success: true, data: (result.count ?? 0) as number };
  } catch (err) {
    const message = err instanceof Error ? err.message : "an unexpected error occurred";
    return { success: false, error: message };
  }
}
