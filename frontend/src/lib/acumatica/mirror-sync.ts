/**
 * Acumatica Mirror Sync Engine
 *
 * Pulls ALL data from Acumatica and upserts it into Supabase `acumatica_*`
 * mirror tables. Supports both full and incremental sync modes.
 *
 * Key constraints:
 *   - $filter causes HTTP 500 on most Acumatica entities — NEVER use it here.
 *     For incremental sync, fetch all records and filter client-side by
 *     LastModifiedDateTime.
 *   - $select causes HTTP 500 on some entities (Subcontract) — avoid it.
 *   - ChangeOrder uses RefNbr (not ReferenceNbr).
 *   - Some fields (PaymentMethod, ExternalRef) may return {} instead of string.
 *
 * Usage:
 *   const results = await syncAllMirrorEntities({ mode: 'incremental' });
 *   const result  = await syncMirrorEntity(ENTITY_CONFIGS.customers, { mode: 'full' });
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAcumaticaClient } from "./client";
import type {
  FlatCustomer,
  FlatAccount,
  FlatProject,
  FlatProjectTask,
  FlatInvoice,
  FlatPayment,
  FlatBill,
  FlatCheck,
  FlatPurchaseOrder,
  FlatSubcontract,
  FlatProjectBudget,
} from "./types";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface MirrorSyncOptions {
  /** full = fetch everything and overwrite; incremental = fetch since last cursor. */
  mode: "full" | "incremental";
}

export interface MirrorSyncResult {
  entity: string;
  table: string;
  fetched: number;
  upserted: number;
  skipped: number;
  errors: number;
  errorMessages: string[];
  durationMs: number;
  /** ISO timestamp of the newest LastModifiedDateTime seen, or null if none. */
  cursor: string | null;
}

// ---------------------------------------------------------------------------
// Internal — Acumatica flat record shape that every entity exposes
// ---------------------------------------------------------------------------

/** Supabase row shape for upsert. Must include external_key. */
type MirrorRow = Record<string, unknown> & {
  external_key: string;
  acumatica_sync_at: string;
};

// ---------------------------------------------------------------------------
// Entity config
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface EntityConfig<TFlat = any> {
  /** Acumatica API entity name (e.g. "Customer", "Bill"). */
  entityName: string;
  /** Supabase mirror table name (e.g. "acumatica_customers"). */
  tableName: string;
  /** Records per paginated request. Default 200; 50 for expanded entities. */
  pageSize: number;
  /** Optional OData $expand value. */
  expand?: string;
  /** Tier number for ordered execution. Lower runs first. */
  tier: 0 | 1 | 2;
  /** Derive the stable unique key from a flat record. */
  externalKeyFn: (r: TFlat) => string;
  /** Map a flat Acumatica record to a Supabase row (without external_key / sync timestamps). */
  mapFn: (r: TFlat) => Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a potential "empty object" Acumatica field (returns `{}` instead of
 * a string) to null. Also coerces non-string primitives gracefully.
 */
function aStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v.length > 0 ? v : null;
  if (typeof v === "object") return null; // {} sentinel
  return String(v);
}

/**
 * Parse a potential ISO date string from Acumatica into a safe string for
 * Supabase (timestamptz). Returns null when absent or unparseable.
 */
function aDate(v: unknown): string | null {
  if (!v) return null;
  const s = aStr(v);
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Parse a potential numeric value from Acumatica. Returns null on absence,
 * but 0 on explicit zero.
 */
function aNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  }
  return null;
}

function aBool(v: unknown): boolean | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v.toLowerCase() === "true";
  return null;
}

/** Extract the max LastModifiedDateTime from a batch of records. */
function maxLastModified(records: Array<{ LastModifiedDateTime?: string }>): string | null {
  let max: string | null = null;
  for (const r of records) {
    const lm = aDate(r.LastModifiedDateTime);
    if (lm && (!max || lm > max)) max = lm;
  }
  return max;
}

/** Chunk an array into slices of at most `size` elements. */
function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

// ---------------------------------------------------------------------------
// Entity configs — Tier 0: Reference data (no FK dependencies)
// ---------------------------------------------------------------------------

const customerConfig: EntityConfig<FlatCustomer> = {
  entityName: "Customer",
  tableName: "acumatica_customers",
  pageSize: 200,
  tier: 0,
  externalKeyFn: (r) => `Customer:${r.CustomerID}`,
  mapFn: (r) => ({
    customer_id: aStr(r.CustomerID),
    customer_name: aStr(r.CustomerName),
    status: aStr(r.Status),
    currency_id: aStr(r.CurrencyID),
    terms: aStr(r.Terms),
    tax_zone: aStr(r.TaxZone),
    email: aStr(r.Email),
    phone: aStr(r.Phone1),
    last_modified_at: aDate(r.LastModifiedDateTime),
    raw_payload: r,
  }),
};

const accountConfig: EntityConfig<FlatAccount> = {
  entityName: "Account",
  tableName: "acumatica_accounts",
  pageSize: 500,
  tier: 0,
  externalKeyFn: (r) => `Account:${r.AccountID}`,
  mapFn: (r) => ({
    account_id: aStr(r.AccountID),
    account_cd: aStr(r.AccountCD),
    description: aStr(r.Description),
    type: aStr(r.Type),
    active: aBool(r.Active),
    currency_id: aStr(r.CurrencyID),
    last_modified_at: aDate(r.LastModifiedDateTime),
  }),
};

// ---------------------------------------------------------------------------
// Entity configs — Tier 1: Core project entities
// ---------------------------------------------------------------------------

const projectConfig: EntityConfig<FlatProject> = {
  entityName: "Project",
  tableName: "acumatica_projects",
  pageSize: 200,
  tier: 1,
  externalKeyFn: (r) => `Project:${r.ProjectID}`,
  mapFn: (r) => ({
    project_id: aStr(r.ProjectID),
    description: aStr(r.Description),
    status: aStr(r.Status),
    customer: aStr(r.Customer),
    hold: aBool(r.Hold),
    income: aNum(r.Income),
    expenses: aNum(r.Expenses),
    assets: aNum(r.Assets),
    liabilities: aNum(r.Liabilities),
    template_id: aStr(r.ProjectTemplateID),
    external_ref_nbr: aStr(r.ExternalRefNbr),
    last_modified_at: aDate(r.LastModifiedDateTime),
    raw_payload: r,
  }),
};

const projectTaskConfig: EntityConfig<FlatProjectTask> = {
  entityName: "ProjectTask",
  tableName: "acumatica_project_tasks",
  pageSize: 200,
  tier: 1,
  externalKeyFn: (r) => `ProjectTask:${r.ProjectID}:${r.ProjectTaskID}`,
  mapFn: (r) => ({
    project_id: aStr(r.ProjectID),
    project_task_id: aStr(r.ProjectTaskID),
    description: aStr(r.Description),
    status: aStr(r.Status),
    is_default: aBool(r.Default),
    external_ref_nbr: aStr(r.ExternalRefNbr),
    last_modified_at: aDate(r.LastModifiedDateTime),
  }),
};

// ---------------------------------------------------------------------------
// Entity configs — Tier 2: Financial documents
// ---------------------------------------------------------------------------

const arInvoiceConfig: EntityConfig<FlatInvoice> = {
  entityName: "Invoice",
  tableName: "acumatica_ar_invoices",
  pageSize: 200,
  tier: 2,
  externalKeyFn: (r) => `Invoice:${r.Type ?? "Invoice"}:${r.ReferenceNbr}`,
  mapFn: (r) => ({
    reference_nbr: aStr(r.ReferenceNbr),
    type: aStr(r.Type),
    status: aStr(r.Status),
    date: aDate(r.Date),
    due_date: aDate(r.DueDate),
    post_period: aStr(r.FinancialPeriod),
    customer: aStr(r.Customer),
    customer_name: aStr(r.CustomerName),
    project: aStr(r.Project),
    description: aStr(r.Description),
    amount: aNum(r.Amount),
    balance: aNum(r.Balance),
    tax_total: aNum(r.TaxTotal),
    hold: null, // not on FlatInvoice
    currency_id: aStr(r.CurrencyID),
    last_modified_at: aDate(r.LastModifiedDateTime),
    raw_payload: r,
  }),
};

const arPaymentConfig: EntityConfig<FlatPayment> = {
  entityName: "Payment",
  tableName: "acumatica_payments",
  pageSize: 200,
  tier: 2,
  externalKeyFn: (r) => `Payment:${r.Type ?? "Payment"}:${r.ReferenceNbr}`,
  mapFn: (r) => ({
    reference_nbr: aStr(r.ReferenceNbr),
    document_type: aStr(r.Type),
    customer_id: aStr(r.CustomerID),
    customer_name: aStr(r.CustomerName),
    status: aStr(r.Status),
    description: aStr(r.Description),
    payment_method: aStr(r.PaymentMethod), // {} guard handled inside aStr
    payment_ref: null, // FlatPayment has no PaymentRef — stored in raw
    external_ref: aStr(r.ExternalRef), // {} guard handled inside aStr
    cash_account: aStr(r.CashAccount),
    currency_id: aStr(r.CurrencyID),
    application_date: aDate(r.ApplicationDate),
    hold: aBool(r.Hold),
    payment_amount: aNum(r.PaymentAmount),
    available_balance: aNum(r.AppliedToDocuments), // proxy for available balance
    last_modified_at: aDate(r.LastModifiedDateTime),
    raw_payload: r,
  }),
};

const apBillConfig: EntityConfig<FlatBill> = {
  entityName: "Bill",
  tableName: "acumatica_ap_bills",
  pageSize: 200,
  tier: 2,
  externalKeyFn: (r) => `Bill:${r.Type ?? "Bill"}:${r.ReferenceNbr}`,
  mapFn: (r) => ({
    reference_nbr: aStr(r.ReferenceNbr),
    document_type: aStr(r.Type),
    vendor_id: aStr(r.Vendor),
    vendor_ref: aStr(r.VendorRef),
    date: aDate(r.Date),
    due_date: aDate(r.DueDate),
    post_period: aStr(r.FinancialPeriod),
    status: aStr(r.Status),
    description: aStr(r.Description),
    currency_id: aStr(r.CurrencyID),
    amount: aNum(r.Amount),
    balance: aNum(r.Balance),
    tax_total: aNum(r.TaxTotal),
    hold: null, // not on FlatBill — available in raw_payload
    last_modified_at: aDate(r.LastModifiedDateTime),
    raw_payload: r,
  }),
};

const apCheckConfig: EntityConfig<FlatCheck> = {
  entityName: "Check",
  tableName: "acumatica_checks",
  pageSize: 200,
  tier: 2,
  externalKeyFn: (r) => `Check:${r.Type ?? "Check"}:${r.ReferenceNbr}`,
  mapFn: (r) => ({
    reference_nbr: aStr(r.ReferenceNbr),
    document_type: aStr(r.Type),
    vendor_id: aStr(r.Vendor),
    vendor_name: aStr(r.VendorName),
    payment_ref: aStr(r.ExtRefNbr),
    application_date: aDate(r.Date),
    status: aStr(r.Status),
    description: aStr(r.Description),
    payment_method: aStr(r.PaymentMethod),
    cash_account: aStr(r.CashAccount),
    currency_id: aStr(r.CurrencyID),
    payment_amount: aNum(r.PaymentAmount),
    last_modified_at: aDate(r.LastModifiedDateTime),
    raw_payload: r,
  }),
};

const purchaseOrderConfig: EntityConfig<FlatPurchaseOrder> = {
  entityName: "PurchaseOrder",
  tableName: "acumatica_purchase_orders",
  pageSize: 200,
  tier: 2,
  externalKeyFn: (r) => `PurchaseOrder:${r.OrderType ?? "Normal"}:${r.OrderNbr}`,
  mapFn: (r) => ({
    order_nbr: aStr(r.OrderNbr),
    order_type: aStr(r.OrderType),
    vendor_id: aStr(r.Vendor),
    vendor_ref: aStr(r.VendorRef),
    status: aStr(r.Status),
    description: aStr(r.Description),
    date: aDate(r.Date),
    promised_on: aDate(r.PromisedOn),
    currency_id: aStr(r.CurrencyID),
    hold: null, // not on FlatPurchaseOrder — available in raw_payload
    control_total: null, // not on FlatPurchaseOrder
    line_total: null, // not on FlatPurchaseOrder — would need details expansion
    order_total: aNum(r.OrderTotal),
    tax_total: null, // not on FlatPurchaseOrder
    last_modified_at: aDate(r.LastModifiedDateTime),
    raw_payload: r,
  }),
};

const subcontractConfig: EntityConfig<FlatSubcontract> = {
  entityName: "Subcontract",
  tableName: "acumatica_subcontracts",
  // NOTE: $select causes HTTP 500 on Subcontract — never specify it
  pageSize: 200,
  tier: 2,
  externalKeyFn: (r) => `Subcontract:${r.SubcontractNbr}`,
  mapFn: (r) => ({
    subcontract_nbr: aStr(r.SubcontractNbr),
    vendor_id: aStr(r.Vendor),
    vendor_ref: aStr(r.VendorRef),
    status: aStr(r.Status),
    description: aStr(r.Description),
    date: aDate(r.Date),
    project_code: aStr(r.ProjectID),
    subcontract_total: aNum(r.SubcontractTotal),
    last_modified_at: aDate(r.LastModifiedDateTime),
    raw_payload: r,
  }),
};

// ---------------------------------------------------------------------------
// Change Order — uses RefNbr, fetched via fetchEntity directly
// ---------------------------------------------------------------------------

/** Flat shape for a ChangeOrder record from Acumatica. */
interface FlatChangeOrder {
  RefNbr?: string;
  ProjectID?: string;
  Customer?: string;
  Class?: string;
  Status?: string;
  ReverseStatus?: string;
  Description?: string;
  DetailedDescription?: string;
  ExternalRefNbr?: string;
  OriginalCORefNbr?: string;
  ChangeDate?: string;
  CompletionDate?: string;
  Hold?: boolean;
  ContractTimeChangeDays?: number;
  CommitmentsChangeTotal?: number;
  CostBudgetChangeTotal?: number;
  RevenueBudgetChangeTotal?: number;
  GrossMargin?: number;
  GrossMarginAmount?: number;
  LastModifiedDateTime?: string;
}

const changeOrderConfig: EntityConfig<FlatChangeOrder> = {
  entityName: "ChangeOrder",
  tableName: "acumatica_change_orders",
  pageSize: 200,
  tier: 2,
  externalKeyFn: (r) => `ChangeOrder:${r.RefNbr ?? ""}`,
  mapFn: (r) => ({
    reference_nbr: aStr(r.RefNbr),
    project_code: aStr(r.ProjectID),
    customer_id: aStr(r.Customer),
    class: aStr(r.Class),
    status: aStr(r.Status),
    reverse_status: aStr(r.ReverseStatus),
    description: aStr(r.Description),
    detailed_description: aStr(r.DetailedDescription),
    external_ref_nbr: aStr(r.ExternalRefNbr),
    original_co_ref_nbr: aStr(r.OriginalCORefNbr),
    change_date: aDate(r.ChangeDate),
    completion_date: aDate(r.CompletionDate),
    hold: aBool(r.Hold),
    contract_time_change_days: aNum(r.ContractTimeChangeDays),
    commitments_change_total: aNum(r.CommitmentsChangeTotal),
    cost_budget_change_total: aNum(r.CostBudgetChangeTotal),
    revenue_budget_change_total: aNum(r.RevenueBudgetChangeTotal),
    gross_margin: aNum(r.GrossMargin),
    gross_margin_amount: aNum(r.GrossMarginAmount),
    last_modified_at: aDate(r.LastModifiedDateTime),
    raw_payload: r,
  }),
};

const projectBudgetConfig: EntityConfig<FlatProjectBudget> = {
  entityName: "ProjectBudget",
  tableName: "acumatica_project_budgets",
  pageSize: 500,
  tier: 2,
  externalKeyFn: (r) =>
    `ProjectBudget:${r.ProjectID}:${r.ProjectTaskID}:${r.AccountGroup ?? "NONE"}:${r.CostCode ?? "00-0000"}:${r.Type ?? "Expense"}`,
  mapFn: (r) => ({
    project_code: aStr(r.ProjectID),
    project_task_id: aStr(r.ProjectTaskID),
    account_group: aStr(r.AccountGroup),
    cost_code: aStr(r.CostCode),
    description: aStr(r.Description),
    record_type: aStr(r.Type),
    inventory_id: aStr(r.InventoryID),
    uom: aStr(r.UOM),
    unit_rate: aNum(r.UnitRate),
    original_budgeted_amount: aNum(r.OriginalBudgetedAmount),
    revised_budgeted_amount: aNum(r.RevisedBudgetedAmount),
    budgeted_co_amount: aNum(r.BudgetedCOAmount),
    actual_amount: aNum(r.ActualAmount),
    actual_plus_open_committed_amount: aNum(r.ActualPlusOpenCommittedAmount),
    original_committed_amount: aNum(r.OriginalCommittedAmount),
    revised_committed_amount: aNum(r.RevisedCommittedAmount),
    committed_co_amount: aNum(r.CommittedCOAmount),
    committed_invoiced_amount: aNum(r.CommittedInvoicedAmount),
    committed_open_amount: aNum(r.CommittedOpenAmount),
    cost_at_completion: aNum(r.CostAtCompletion),
    cost_to_complete: aNum(r.CostToComplete),
    variance_amount: aNum(r.VarianceAmount),
    percentage_of_completion: aNum(r.PercentageOfCompletion),
    retainage: aNum(r.Retainage),
    draft_invoices_amount: aNum(r.DraftInvoicesAmount),
    pending_invoice_amount: aNum(r.PendingInvoiceAmount),
    last_modified_at: aDate(r.LastModifiedDateTime),
    raw_payload: r,
  }),
};

// ---------------------------------------------------------------------------
// Tier registry
// ---------------------------------------------------------------------------

/** All entity configs in tier order. */
const ALL_CONFIGS: EntityConfig[] = [
  customerConfig,
  accountConfig,
  projectConfig,
  projectTaskConfig,
  arInvoiceConfig,
  arPaymentConfig,
  apBillConfig,
  apCheckConfig,
  purchaseOrderConfig,
  subcontractConfig,
  changeOrderConfig,
  projectBudgetConfig,
];

// ---------------------------------------------------------------------------
// Sync state helpers (acumatica_sync_state table)
// ---------------------------------------------------------------------------

/**
 * Read the current incremental cursor (last synced timestamp) for an entity.
 * Returns null if no state row exists yet (meaning first sync = full fetch).
 */
async function readCursor(
  supabase: SupabaseClient,
  tableName: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("acumatica_sync_state")
    .select("cursor")
    .eq("entity_name", tableName)
    .maybeSingle();
  return (data?.cursor as string | null) ?? null;
}

/**
 * Persist the new cursor and stats for an entity after a successful sync run.
 */
async function writeCursor(
  supabase: SupabaseClient,
  tableName: string,
  cursor: string | null,
  stats: { fetched: number; upserted: number; skipped: number; errors: number },
): Promise<void> {
  await supabase.from("acumatica_sync_state").upsert(
    {
      entity_name: tableName,
      cursor,
      last_synced_at: new Date().toISOString(),
      last_fetched: stats.fetched,
      last_upserted: stats.upserted,
      last_skipped: stats.skipped,
      last_errors: stats.errors,
    },
    { onConflict: "entity_name" },
  );
}

// ---------------------------------------------------------------------------
// Sync run log helpers (acumatica_sync_runs table)
// ---------------------------------------------------------------------------

interface SyncRunRecord {
  id?: string;
  entity_name: string;
  mode: "full" | "incremental";
  status: "running" | "success" | "error";
  started_at: string;
  completed_at?: string;
  fetched?: number;
  upserted?: number;
  skipped?: number;
  errors?: number;
  error_message?: string;
  cursor_before?: string | null;
  cursor_after?: string | null;
  duration_ms?: number;
}

async function logRunStart(
  supabase: SupabaseClient,
  record: Omit<SyncRunRecord, "completed_at" | "fetched" | "upserted" | "skipped" | "errors">,
): Promise<string | null> {
  const { data } = await supabase
    .from("acumatica_sync_runs")
    .insert(record)
    .select("id")
    .single();
  return (data?.id as string | null) ?? null;
}

async function logRunComplete(
  supabase: SupabaseClient,
  runId: string | null,
  update: Partial<SyncRunRecord>,
): Promise<void> {
  if (!runId) return;
  await supabase
    .from("acumatica_sync_runs")
    .update({ ...update, completed_at: new Date().toISOString() })
    .eq("id", runId);
}

// ---------------------------------------------------------------------------
// Core sync function
// ---------------------------------------------------------------------------

/**
 * Sync a single Acumatica entity into its Supabase mirror table.
 *
 * Paginates through ALL records using $top/$skip. For incremental mode, records
 * are filtered client-side against the stored cursor because $filter is not
 * safe to use on Acumatica entities.
 *
 * @param config  - Entity configuration (entityName, tableName, mapFn, etc.)
 * @param options - Sync mode (full | incremental)
 * @param supabase - Optional Supabase client. When not provided, a server
 *                   client is created. Pass an existing client when calling
 *                   from API routes that already have a scoped client.
 */
export async function syncMirrorEntity<TFlat extends { LastModifiedDateTime?: string }>(
  config: EntityConfig<TFlat>,
  options: MirrorSyncOptions,
  supabase?: SupabaseClient,
): Promise<MirrorSyncResult> {
  const startedAt = Date.now();
  const errorMessages: string[] = [];

  const db = supabase ?? (await createClient());
  const acuClient = createAcumaticaClient();

  // Ensure authenticated
  await acuClient.login();

  // Read existing cursor for incremental mode
  const cursorBefore = options.mode === "incremental"
    ? await readCursor(db, config.tableName)
    : null;

  // Log run start
  const runId = await logRunStart(db, {
    entity_name: config.tableName,
    mode: options.mode,
    status: "running",
    started_at: new Date().toISOString(),
    cursor_before: cursorBefore,
  });

  let fetched = 0;
  let upserted = 0;
  let skipped = 0;
  let errors = 0;
  let newCursor: string | null = cursorBefore;

  try {
    // Paginate through all records
    let skip = 0;
    let page: TFlat[] = [];
    const syncAt = new Date().toISOString();

    do {
      const queryOptions: Record<string, unknown> = {
        $top: config.pageSize,
        $skip: skip,
      };

      if (config.expand) {
        queryOptions.$expand = config.expand;
      }

      page = await acuClient.fetchEntity<unknown, TFlat>(
        config.entityName,
        queryOptions,
      );

      fetched += page.length;

      // For incremental sync: filter client-side to only records modified after cursor
      const recordsToProcess: TFlat[] = options.mode === "incremental" && cursorBefore
        ? page.filter((r) => {
            const lm = aDate(r.LastModifiedDateTime);
            return lm !== null && lm > cursorBefore;
          })
        : page;

      skipped += page.length - recordsToProcess.length;

      // Track the newest timestamp seen in this page (for cursor advancement)
      const pageMax = maxLastModified(page);
      if (pageMax && (!newCursor || pageMax > newCursor)) {
        newCursor = pageMax;
      }

      if (recordsToProcess.length > 0) {
        // Map records to mirror rows
        const rows: MirrorRow[] = [];
        for (const record of recordsToProcess) {
          try {
            const externalKey = config.externalKeyFn(record);
            const mapped = config.mapFn(record);
            rows.push({
              ...mapped,
              external_key: externalKey,
              acumatica_sync_at: syncAt,
            });
          } catch (mapErr) {
            errors += 1;
            errorMessages.push(
              `Map error: ${mapErr instanceof Error ? mapErr.message : String(mapErr)}`,
            );
          }
        }

        // Batch upsert in chunks of 100 to avoid Supabase payload limits
        for (const rowChunk of chunk(rows, 100)) {
          const { error: upsertErr, count } = await db
            .from(config.tableName)
            .upsert(rowChunk, { onConflict: "external_key" })
            .select("external_key");

          if (upsertErr) {
            errors += rowChunk.length;
            errorMessages.push(`Upsert error: ${upsertErr.message}`);
          } else {
            upserted += count ?? rowChunk.length;
          }
        }
      }

      skip += config.pageSize;
    } while (page.length === config.pageSize);

    // Persist new cursor and stats
    await writeCursor(db, config.tableName, newCursor, {
      fetched,
      upserted,
      skipped,
      errors,
    });

    const durationMs = Date.now() - startedAt;

    await logRunComplete(db, runId, {
      status: errors > 0 && upserted === 0 ? "error" : "success",
      fetched,
      upserted,
      skipped,
      errors,
      cursor_after: newCursor,
      duration_ms: durationMs,
      error_message: errorMessages.length > 0 ? errorMessages.slice(0, 5).join(" | ") : undefined,
    });

    return {
      entity: config.entityName,
      table: config.tableName,
      fetched,
      upserted,
      skipped,
      errors,
      errorMessages,
      durationMs,
      cursor: newCursor,
    };
  } catch (fatalErr) {
    const durationMs = Date.now() - startedAt;
    const msg = fatalErr instanceof Error ? fatalErr.message : String(fatalErr);

    await logRunComplete(db, runId, {
      status: "error",
      fetched,
      upserted,
      skipped,
      errors: errors + 1,
      error_message: msg,
      duration_ms: durationMs,
    });

    return {
      entity: config.entityName,
      table: config.tableName,
      fetched,
      upserted,
      skipped,
      errors: errors + 1,
      errorMessages: [...errorMessages, msg],
      durationMs,
      cursor: newCursor,
    };
  }
}

// ---------------------------------------------------------------------------
// Tier-scoped sync
// ---------------------------------------------------------------------------

/**
 * Sync all entities belonging to a specific tier.
 * Entities within a tier run sequentially to avoid overwhelming Acumatica.
 *
 * @param tier    - 0 (reference), 1 (projects), or 2 (financial documents)
 * @param options - Sync mode
 * @param supabase - Optional shared Supabase client
 */
export async function syncMirrorTier(
  tier: 0 | 1 | 2,
  options: MirrorSyncOptions,
  supabase?: SupabaseClient,
): Promise<MirrorSyncResult[]> {
  const configs = ALL_CONFIGS.filter((c) => c.tier === tier);
  const results: MirrorSyncResult[] = [];

  for (const config of configs) {
    const result = await syncMirrorEntity(
      config,
      options,
      supabase,
    );
    results.push(result);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Full portfolio sync
// ---------------------------------------------------------------------------

/**
 * Sync ALL Acumatica entities into Supabase mirror tables in tier order.
 *
 * Tiers run sequentially (0 → 1 → 2) so reference data is available before
 * financial documents are processed. Entities within each tier run
 * sequentially to stay within Acumatica session limits.
 *
 * @param options  - Sync mode (full | incremental)
 * @param supabase - Optional shared Supabase client. When omitted, a fresh
 *                   server client is created once and shared across all entities.
 * @returns Array of per-entity results in execution order.
 */
export async function syncAllMirrorEntities(
  options: MirrorSyncOptions,
  supabase?: SupabaseClient,
): Promise<MirrorSyncResult[]> {
  const db = supabase ?? (await createClient());

  // Login once — the singleton client reuses the session for all entities
  const acuClient = createAcumaticaClient();
  await acuClient.login();

  const results: MirrorSyncResult[] = [];

  for (const tier of [0, 1, 2] as const) {
    const tierResults = await syncMirrorTier(tier, options, db);
    results.push(...tierResults);
  }

  // Post-sync enrichment: backfill customer_name on AR invoices from acumatica_customers
  // (Acumatica's Invoice entity doesn't return CustomerName, only Customer ID)
  await enrichInvoiceCustomerNames(db);

  return results;
}

/**
 * Backfill customer_name on AR invoices by joining against acumatica_customers.
 * Only updates rows where customer_name is null.
 */
async function enrichInvoiceCustomerNames(db: SupabaseClient): Promise<void> {
  try {
    const { data: customers } = await db
      .from("acumatica_customers")
      .select("customer_id, customer_name");

    if (!customers?.length) return;

    const nameMap = new Map<string, string>();
    for (const c of customers) {
      if (c.customer_id && c.customer_name) {
        nameMap.set(c.customer_id, c.customer_name);
      }
    }

    const { data: nullNameInvoices } = await db
      .from("acumatica_ar_invoices")
      .select("id, customer")
      .is("customer_name", null);

    if (!nullNameInvoices?.length) return;

    let updated = 0;
    for (const inv of nullNameInvoices) {
      const name = nameMap.get(inv.customer);
      if (name) {
        await db.from("acumatica_ar_invoices").update({ customer_name: name }).eq("id", inv.id);
        updated++;
      }
    }

    if (updated > 0) {
      console.log(`[mirror-sync] Enriched ${updated} invoice(s) with customer names`);
    }
  } catch (err) {
    console.error("[mirror-sync] Failed to enrich invoice customer names:", err);
  }
}

// ---------------------------------------------------------------------------
// Exported entity configs for consumers that need direct access
// ---------------------------------------------------------------------------

export const ENTITY_CONFIGS = {
  customers: customerConfig,
  accounts: accountConfig,
  projects: projectConfig,
  projectTasks: projectTaskConfig,
  arInvoices: arInvoiceConfig,
  arPayments: arPaymentConfig,
  apBills: apBillConfig,
  apChecks: apCheckConfig,
  purchaseOrders: purchaseOrderConfig,
  subcontracts: subcontractConfig,
  changeOrders: changeOrderConfig,
  projectBudgets: projectBudgetConfig,
} as const;
