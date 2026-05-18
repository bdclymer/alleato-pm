/**
 * Table Registry - Allowlist of tables accessible via the Admin Table Explorer
 *
 * This file defines:
 * 1. Which tables are allowed to be accessed via the admin explorer
 * 2. Metadata for each table (primary key, display settings, permissions)
 * 3. Security-enforced access control
 *
 * SECURITY: Only tables listed here can be accessed. This is enforced server-side.
 */

export type ViewType = "table" | "list" | "grid" | "gallery";

export interface TablePermissions {
  read: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
}

export interface TableDisplaySettings {
  titleColumn?: string;
  subtitleColumns?: string[];
  imageColumn?: string;
  descriptionColumn?: string;
}

export interface TableConfig {
  /** Human-readable label for the table */
  label: string;
  /** Description shown in the table list */
  description: string;
  /** Primary key column (default: 'id') */
  primaryKey: string;
  /** Default sort configuration */
  defaultSort: {
    column: string;
    direction: "asc" | "desc";
  };
  /** Columns to hide by default */
  hiddenColumns: string[];
  /** Columns to search when using the search bar */
  searchColumns?: string[];
  /** Which views are enabled for this table */
  viewsEnabled: ViewType[];
  /** Permission configuration (all true by default for now) */
  permissions: TablePermissions;
  /** Display settings for list/grid/gallery views */
  display: TableDisplaySettings;
}

/**
 * The table registry - allowlist of accessible tables
 * Add new tables here to make them accessible via the admin explorer
 */
export const TABLE_REGISTRY = {
  projects: {
    label: "Projects",
    description: "Construction projects and their details",
    primaryKey: "id",
    defaultSort: { column: "created_at", direction: "desc" },
    hiddenColumns: ["updated_at"],
    searchColumns: ["name", "description", "project_number"],
    viewsEnabled: ["table", "list", "grid", "gallery"],
    permissions: { read: true, create: true, update: true, delete: true },
    display: {
      titleColumn: "name",
      subtitleColumns: ["project_number", "status"],
      imageColumn: "image_url",
    },
  },
  companies: {
    label: "Companies",
    description: "Companies and organizations",
    primaryKey: "id",
    defaultSort: { column: "name", direction: "asc" },
    hiddenColumns: ["updated_at"],
    searchColumns: ["name", "email", "phone"],
    viewsEnabled: ["table", "list", "grid"],
    permissions: { read: true, create: true, update: true, delete: true },
    display: {
      titleColumn: "name",
      subtitleColumns: ["email", "phone"],
    },
  },
  clients: {
    label: "Clients",
    description: "Client organizations",
    primaryKey: "id",
    defaultSort: { column: "name", direction: "asc" },
    hiddenColumns: ["updated_at"],
    searchColumns: ["name"],
    viewsEnabled: ["table", "list", "grid"],
    permissions: { read: true, create: true, update: true, delete: true },
    display: {
      titleColumn: "name",
    },
  },
  contacts: {
    label: "Contacts",
    description: "People and contact information",
    primaryKey: "id",
    defaultSort: { column: "last_name", direction: "asc" },
    hiddenColumns: ["updated_at"],
    searchColumns: ["first_name", "last_name", "email", "phone"],
    viewsEnabled: ["table", "list", "grid"],
    permissions: { read: true, create: true, update: true, delete: true },
    display: {
      titleColumn: "first_name",
      subtitleColumns: ["last_name", "email"],
    },
  },
  contracts: {
    label: "Contracts",
    description: "Project contracts and agreements",
    primaryKey: "id",
    defaultSort: { column: "created_at", direction: "desc" },
    hiddenColumns: ["updated_at"],
    searchColumns: ["title", "description", "number"],
    viewsEnabled: ["table", "list"],
    permissions: { read: true, create: true, update: true, delete: true },
    display: {
      titleColumn: "title",
      subtitleColumns: ["number", "status"],
    },
  },
  prime_contract_change_orders: {
    label: "Prime Contract Change Orders",
    description: "Prime contract change orders (PCCOs)",
    primaryKey: "id",
    defaultSort: { column: "created_at", direction: "desc" },
    hiddenColumns: ["updated_at"],
    searchColumns: ["title", "pcco_number", "description"],
    viewsEnabled: ["table", "list"],
    permissions: { read: true, create: true, update: true, delete: true },
    display: {
      titleColumn: "title",
      subtitleColumns: ["pcco_number", "status"],
    },
  },
  contract_change_orders: {
    label: "Contract Change Orders",
    description: "Commitment/contract change orders (CCOs)",
    primaryKey: "id",
    defaultSort: { column: "created_at", direction: "desc" },
    hiddenColumns: ["updated_at"],
    searchColumns: ["change_order_number", "description"],
    viewsEnabled: ["table", "list"],
    permissions: { read: true, create: true, update: true, delete: true },
    display: {
      titleColumn: "description",
      subtitleColumns: ["change_order_number", "status"],
    },
  },
  rfis: {
    label: "RFIs",
    description: "Requests for Information",
    primaryKey: "id",
    defaultSort: { column: "created_at", direction: "desc" },
    hiddenColumns: ["updated_at"],
    searchColumns: ["subject", "number", "question"],
    viewsEnabled: ["table", "list"],
    permissions: { read: true, create: true, update: true, delete: true },
    display: {
      titleColumn: "subject",
      subtitleColumns: ["number", "status"],
    },
  },
  submittals: {
    label: "Submittals",
    description: "Project submittals",
    primaryKey: "id",
    defaultSort: { column: "created_at", direction: "desc" },
    hiddenColumns: ["updated_at"],
    searchColumns: ["title", "number", "description"],
    viewsEnabled: ["table", "list"],
    permissions: { read: true, create: true, update: true, delete: true },
    display: {
      titleColumn: "title",
      subtitleColumns: ["number", "status"],
    },
  },
  cost_codes: {
    label: "Cost Codes",
    description: "Project cost codes",
    primaryKey: "id",
    defaultSort: { column: "code", direction: "asc" },
    hiddenColumns: ["updated_at"],
    searchColumns: ["code", "name", "description"],
    viewsEnabled: ["table", "list"],
    permissions: { read: true, create: true, update: true, delete: true },
    display: {
      titleColumn: "name",
      subtitleColumns: ["code"],
    },
  },
  budget_lines: {
    label: "Budget Lines",
    description: "Budget line items and allocations",
    primaryKey: "id",
    defaultSort: { column: "created_at", direction: "desc" },
    hiddenColumns: ["updated_at", "sub_job_key"],
    searchColumns: ["description"],
    viewsEnabled: ["table", "list"],
    permissions: { read: true, create: true, update: true, delete: true },
    display: {
      titleColumn: "description",
      subtitleColumns: ["original_amount"],
    },
  },
  issues: {
    label: "Issues",
    description: "Project issues and tasks",
    primaryKey: "id",
    defaultSort: { column: "created_at", direction: "desc" },
    hiddenColumns: ["updated_at"],
    searchColumns: ["title", "description"],
    viewsEnabled: ["table", "list", "grid"],
    permissions: { read: true, create: true, update: true, delete: true },
    display: {
      titleColumn: "title",
      subtitleColumns: ["status", "priority"],
    },
  },
  daily_logs: {
    label: "Daily Logs",
    description: "Daily construction logs",
    primaryKey: "id",
    defaultSort: { column: "log_date", direction: "desc" },
    hiddenColumns: ["updated_at"],
    searchColumns: ["notes", "weather_notes"],
    viewsEnabled: ["table", "list"],
    permissions: { read: true, create: true, update: true, delete: true },
    display: {
      titleColumn: "log_date",
      subtitleColumns: ["weather_summary"],
    },
  },
  documents: {
    label: "Documents",
    description: "Project documents and files",
    primaryKey: "id",
    defaultSort: { column: "created_at", direction: "desc" },
    hiddenColumns: ["updated_at"],
    searchColumns: ["name", "description"],
    viewsEnabled: ["table", "list", "grid", "gallery"],
    permissions: { read: true, create: true, update: true, delete: true },
    display: {
      titleColumn: "name",
      subtitleColumns: ["type", "size"],
      imageColumn: "thumbnail_url",
    },
  },
  profiles: {
    label: "User Profiles",
    description: "User profile information",
    primaryKey: "id",
    defaultSort: { column: "created_at", direction: "desc" },
    hiddenColumns: ["updated_at"],
    searchColumns: ["full_name", "email"],
    viewsEnabled: ["table", "list", "grid"],
    permissions: { read: true, create: true, update: true, delete: true },
    display: {
      titleColumn: "full_name",
      subtitleColumns: ["email", "role"],
      imageColumn: "avatar_url",
    },
  },
  subcontracts: {
    label: "Subcontracts",
    description: "Subcontract commitments",
    primaryKey: "id",
    defaultSort: { column: "created_at", direction: "desc" },
    hiddenColumns: ["updated_at"],
    searchColumns: ["title", "description", "contract_number"],
    viewsEnabled: ["table", "list"],
    permissions: { read: true, create: true, update: true, delete: true },
    display: {
      titleColumn: "title",
      subtitleColumns: ["contract_number", "status"],
    },
  },
  purchase_orders: {
    label: "Purchase Orders",
    description: "Purchase order commitments",
    primaryKey: "id",
    defaultSort: { column: "created_at", direction: "desc" },
    hiddenColumns: ["updated_at"],
    searchColumns: ["title", "description", "contract_number"],
    viewsEnabled: ["table", "list"],
    permissions: { read: true, create: true, update: true, delete: true },
    display: {
      titleColumn: "title",
      subtitleColumns: ["contract_number", "status"],
    },
  },
  direct_costs: {
    label: "Direct Costs",
    description: "Direct project costs",
    primaryKey: "id",
    defaultSort: { column: "created_at", direction: "desc" },
    hiddenColumns: ["updated_at"],
    searchColumns: ["description"],
    viewsEnabled: ["table", "list"],
    permissions: { read: true, create: true, update: true, delete: true },
    display: {
      titleColumn: "description",
      subtitleColumns: ["amount"],
    },
  },
  owner_invoices: {
    label: "Owner Invoices",
    description: "Invoices to project owners",
    primaryKey: "id",
    defaultSort: { column: "created_at", direction: "desc" },
    hiddenColumns: ["updated_at"],
    searchColumns: ["number", "description"],
    viewsEnabled: ["table", "list"],
    permissions: { read: true, create: true, update: true, delete: true },
    display: {
      titleColumn: "number",
      subtitleColumns: ["status", "amount"],
    },
  },
} satisfies Record<string, TableConfig>;

/** Type representing valid table names from the registry */
export type TableName = keyof typeof TABLE_REGISTRY;

/** Get all registered table names */
export function getRegisteredTables(): TableName[] {
  return Object.keys(TABLE_REGISTRY) as TableName[];
}

/** Get configuration for a specific table */
export function getTableConfig(table: TableName): TableConfig {
  return TABLE_REGISTRY[table] as TableConfig;
}

/**
 * Security assertion - throws if table is not in the allowlist
 * Use this at the start of any server-side operation
 */
export function assertTableAllowed(table: string): asserts table is TableName {
  if (!(table in TABLE_REGISTRY)) {
    throw new Error(
      `Access denied: Table "${table}" is not in the allowed table registry`,
    );
  }
}

/**
 * Check if a table is in the registry without throwing
 */
export function isTableAllowed(table: string): table is TableName {
  return table in TABLE_REGISTRY;
}

/**
 * Check if a specific permission is granted for a table
 */
export function hasPermission(
  table: TableName,
  permission: keyof TablePermissions,
): boolean {
  return TABLE_REGISTRY[table].permissions[permission];
}

/**
 * Get the display title for a row based on table config
 */
export function getRowTitle(
  table: TableName,
  row: Record<string, unknown>,
): string {
  const config = getTableConfig(table);
  const titleColumn = config.display.titleColumn;

  if (titleColumn && row[titleColumn] != null) {
    return String(row[titleColumn]);
  }

  // Fallback to id or first available string value
  if (row.id != null) return String(row.id);

  const firstStringValue = Object.values(row).find(
    (v) => typeof v === "string" && v.length > 0,
  );
  return firstStringValue ? String(firstStringValue) : "Untitled";
}

/**
 * Get the subtitle for a row based on table config
 */
export function getRowSubtitle(
  table: TableName,
  row: Record<string, unknown>,
): string {
  const config = getTableConfig(table);
  const subtitleColumns = config.display.subtitleColumns ?? [];

  const parts = subtitleColumns
    .map((col) => row[col])
    .filter((v) => v != null && v !== "")
    .map(String);

  return parts.join(" • ");
}

/**
 * Get the image URL for a row if configured
 */
export function getRowImage(
  table: TableName,
  row: Record<string, unknown>,
): string | null {
  const config = getTableConfig(table);
  const imageColumn = config.display.imageColumn;

  if (imageColumn && row[imageColumn]) {
    const value = row[imageColumn];
    if (typeof value === "string" && value.startsWith("http")) {
      return value;
    }
  }

  return null;
}
