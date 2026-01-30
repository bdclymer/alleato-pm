/**
 * Database Introspection Utilities
 *
 * Server-only utilities for querying database schema information
 * Used by the Admin Table Explorer to dynamically generate forms and views
 */

import { createServiceClient } from "@/lib/supabase/service";
import {
  assertTableAllowed,
  getTableConfig,
  type TableName,
} from "@/lib/table-registry";

export interface ColumnInfo {
  column_name: string;
  data_type: string;
  udt_name: string;
  is_nullable: boolean;
  column_default: string | null;
  is_identity: boolean;
  character_maximum_length: number | null;
  is_updatable: boolean;
}

export type InputType =
  | "text"
  | "number"
  | "boolean"
  | "datetime"
  | "date"
  | "time"
  | "json"
  | "uuid"
  | "email"
  | "url"
  | "select";

export interface ColumnMetadata extends ColumnInfo {
  inputType: InputType;
  label: string;
  placeholder?: string;
  isHidden: boolean;
  isReadOnly: boolean;
}

// Cache for column info to avoid repeated queries
const columnCache = new Map<string, ColumnInfo[]>();
const CACHE_TTL = 60000; // 1 minute cache
const cacheTimestamps = new Map<string, number>();

/**
 * Get column information for a table from the database schema
 */
export async function getTableColumns(table: TableName): Promise<ColumnInfo[]> {
  assertTableAllowed(table);

  // Check cache
  const cacheKey = table;
  const now = Date.now();
  const cachedAt = cacheTimestamps.get(cacheKey);

  if (cachedAt && now - cachedAt < CACHE_TTL) {
    const cached = columnCache.get(cacheKey);
    if (cached) return cached;
  }

  // Use direct query approach since we don't have an RPC function
  const columns = await getTableColumnsViaQuery(table);
  columnCache.set(cacheKey, columns);
  cacheTimestamps.set(cacheKey, now);

  return columns;
}

/**
 * Fallback method to get columns using direct table query
 * This works by selecting from the table with limit 0 and examining the response
 */
async function getTableColumnsViaQuery(
  table: TableName,
): Promise<ColumnInfo[]> {
  const supabase = createServiceClient();

  // Get one row (or empty) to determine columns
  const { data, error } = await (supabase as any).from(table).select("*").limit(1);

  if (error) {
    throw new Error(`Failed to query table ${table}: ${error.message}`);
  }

  // If we have data, use the first row to infer columns
  // If no data, use table-specific fallback columns
  if (!data || data.length === 0) {
    return inferColumnsFromEmpty(table);
  }

  const row = data[0] as Record<string, unknown>;
  return Object.entries(row).map(([key, value]) => ({
    column_name: key,
    data_type: inferDataType(value),
    udt_name: inferUdtName(value),
    is_nullable: true, // Assume nullable by default
    column_default: null,
    is_identity: key === "id",
    character_maximum_length: null,
    is_updatable: key !== "id" && key !== "created_at",
  }));
}

/**
 * Infer columns for empty tables based on common patterns
 */
function inferColumnsFromEmpty(table: TableName): ColumnInfo[] {
  // Common columns present in most tables
  const commonColumns: ColumnInfo[] = [
    {
      column_name: "id",
      data_type: "uuid",
      udt_name: "uuid",
      is_nullable: false,
      column_default: "gen_random_uuid()",
      is_identity: true,
      character_maximum_length: null,
      is_updatable: false,
    },
    {
      column_name: "created_at",
      data_type: "timestamp with time zone",
      udt_name: "timestamptz",
      is_nullable: true,
      column_default: "now()",
      is_identity: false,
      character_maximum_length: null,
      is_updatable: false,
    },
    {
      column_name: "updated_at",
      data_type: "timestamp with time zone",
      udt_name: "timestamptz",
      is_nullable: true,
      column_default: "now()",
      is_identity: false,
      character_maximum_length: null,
      is_updatable: false,
    },
  ];

  // Table-specific columns based on common patterns
  const tableSpecificColumns: Record<string, ColumnInfo[]> = {
    projects: [
      {
        column_name: "name",
        data_type: "text",
        udt_name: "text",
        is_nullable: true,
        column_default: null,
        is_identity: false,
        character_maximum_length: null,
        is_updatable: true,
      },
      {
        column_name: "description",
        data_type: "text",
        udt_name: "text",
        is_nullable: true,
        column_default: null,
        is_identity: false,
        character_maximum_length: null,
        is_updatable: true,
      },
    ],
    companies: [
      {
        column_name: "name",
        data_type: "text",
        udt_name: "text",
        is_nullable: true,
        column_default: null,
        is_identity: false,
        character_maximum_length: null,
        is_updatable: true,
      },
      {
        column_name: "email",
        data_type: "text",
        udt_name: "text",
        is_nullable: true,
        column_default: null,
        is_identity: false,
        character_maximum_length: null,
        is_updatable: true,
      },
    ],
  };

  return [...commonColumns, ...(tableSpecificColumns[table] ?? [])];
}

/**
 * Infer SQL data type from a JavaScript value
 */
function inferDataType(value: unknown): string {
  if (value === null) return "text";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") {
    return Number.isInteger(value) ? "integer" : "numeric";
  }
  if (typeof value === "string") {
    if (isUUID(value)) return "uuid";
    if (isISO8601(value)) return "timestamp with time zone";
    return "text";
  }
  if (typeof value === "object") {
    if (Array.isArray(value)) return "ARRAY";
    return "jsonb";
  }
  return "text";
}

/**
 * Infer UDT name from a JavaScript value
 */
function inferUdtName(value: unknown): string {
  if (value === null) return "text";
  if (typeof value === "boolean") return "bool";
  if (typeof value === "number") {
    return Number.isInteger(value) ? "int4" : "numeric";
  }
  if (typeof value === "string") {
    if (isUUID(value)) return "uuid";
    if (isISO8601(value)) return "timestamptz";
    return "text";
  }
  if (typeof value === "object") {
    if (Array.isArray(value)) return "_text";
    return "jsonb";
  }
  return "text";
}

/**
 * Check if a string is a valid UUID
 */
function isUUID(value: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Check if a string is an ISO 8601 date
 */
function isISO8601(value: string): boolean {
  const date = new Date(value);
  return !isNaN(date.getTime()) && value.includes("T");
}

/**
 * Get the primary key column for a table
 * Prefers registry config, but can verify against schema if needed
 */
export function getPrimaryKey(table: TableName): string {
  const config = getTableConfig(table);
  return config.primaryKey;
}

/**
 * Map database column types to form input types
 */
export function mapColumnToInputType(column: ColumnInfo): InputType {
  const { data_type, udt_name, column_name } = column;
  const type = data_type.toLowerCase();
  const udt = udt_name.toLowerCase();

  // Check column name for hints
  if (column_name.includes("email")) return "email";
  if (column_name.includes("url") || column_name.includes("link")) return "url";

  // UUID
  if (type === "uuid" || udt === "uuid") return "uuid";

  // Boolean
  if (type === "boolean" || udt === "bool") return "boolean";

  // Numbers
  if (
    type.includes("int") ||
    type === "numeric" ||
    type === "real" ||
    type === "double precision" ||
    type === "decimal" ||
    udt.includes("int") ||
    udt === "numeric" ||
    udt === "float4" ||
    udt === "float8"
  ) {
    return "number";
  }

  // Date/time
  if (type.includes("timestamp") || udt === "timestamptz") return "datetime";
  if (type === "date") return "date";
  if (type === "time" || type === "time without time zone") return "time";

  // JSON
  if (
    type === "json" ||
    type === "jsonb" ||
    udt === "json" ||
    udt === "jsonb"
  ) {
    return "json";
  }

  // Default to text
  return "text";
}

/**
 * Convert column name to human-readable label
 */
export function columnNameToLabel(columnName: string): string {
  return columnName
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Get enhanced column metadata for form generation
 */
export async function getColumnMetadata(
  table: TableName,
): Promise<ColumnMetadata[]> {
  const columns = await getTableColumns(table);
  const config = getTableConfig(table);
  const pk = getPrimaryKey(table);

  return columns.map((col) => {
    const inputType = mapColumnToInputType(col);
    const isHidden = config.hiddenColumns.includes(col.column_name);
    const isReadOnly =
      col.is_identity ||
      col.column_name === pk ||
      col.column_name === "created_at" ||
      col.column_default?.includes("now()") === true;

    return {
      ...col,
      inputType,
      label: columnNameToLabel(col.column_name),
      isHidden,
      isReadOnly,
    };
  });
}

/**
 * Get columns that should be displayed in forms (excludes identity/computed columns)
 */
export async function getFormColumns(
  table: TableName,
  mode: "create" | "edit",
): Promise<ColumnMetadata[]> {
  const columns = await getColumnMetadata(table);

  return columns.filter((col) => {
    // Skip identity columns for both create and edit
    if (col.is_identity) return false;

    // Skip primary key on edit (can't change PK)
    if (mode === "edit" && col.column_name === getPrimaryKey(table))
      return false;

    // Skip auto-generated timestamps
    if (
      col.column_default?.includes("now()") &&
      col.column_name !== "updated_at"
    ) {
      return false;
    }

    return true;
  });
}

/**
 * Validate that a set of column names are valid for a table
 */
export async function validateColumnNames(
  table: TableName,
  columnNames: string[],
): Promise<{ valid: string[]; invalid: string[] }> {
  const columns = await getTableColumns(table);
  const validColumnNames = new Set(columns.map((c) => c.column_name));

  const valid: string[] = [];
  const invalid: string[] = [];

  for (const name of columnNames) {
    if (validColumnNames.has(name)) {
      valid.push(name);
    } else {
      invalid.push(name);
    }
  }

  return { valid, invalid };
}

/**
 * Filter data object to only include valid column names
 */
export async function filterValidColumns(
  table: TableName,
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const columns = await getTableColumns(table);
  const validColumnNames = new Set(columns.map((c) => c.column_name));

  const filtered: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (validColumnNames.has(key)) {
      filtered[key] = value;
    }
  }

  return filtered;
}

/**
 * Clear the column cache (useful for testing or after schema changes)
 */
export function clearColumnCache(): void {
  columnCache.clear();
  cacheTimestamps.clear();
}
