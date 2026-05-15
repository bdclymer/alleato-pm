// AUTO-GENERATED — DO NOT EDIT BY HAND.
// Regenerate with: npm run db:inventory
// Source: docs/architecture/tables.yaml + live Supabase (MAIN + RAG) + codebase grep.
// Generated: (stub — run npm run db:inventory to populate)

export type DbInventoryStatus =
  | "live"
  | "live-empty"
  | "dormant"
  | "dead"
  | "legacy"
  | "orphan-mirror";

export type DbInventoryDomain =
  | "projects"
  | "people"
  | "permissions"
  | "financial"
  | "acumatica-erp"
  | "change-management"
  | "commitments"
  | "documents"
  | "communications"
  | "chat-bot"
  | "intelligence"
  | "ai-feedback-memory"
  | "sync-infrastructure"
  | "workflow"
  | "marketing"
  | "admin-feedback"
  | "media"
  | "fm-asrs"
  | "procore-parity"
  | "support-knowledge"
  | "infra-meta";

export type DbInventoryReference = {
  filePath: string;
  lineNumber: number;
  kind: "read" | "write" | "migration" | "unknown";
  snippet: string;
};

export type DbInventoryTable = {
  name: string;
  db: "MAIN" | "RAG";
  domain: DbInventoryDomain;
  status: DbInventoryStatus;
  purpose: string;
  gotchas: string | null;
  cleanupPriority: "low" | "medium" | "high" | null;
  owner: string;
  relatedTables: string[];
  notesForAi: string | null;
  liveStats: {
    approxRows: number;
    totalSize: string;
    lastAutoanalyze: string | null;
    nLiveTup: number;
    nDeadTup: number;
    refreshedAt: string;
  };
  columns: Array<{
    name: string;
    dataType: string;
    isNullable: boolean;
  }>;
  references: {
    writes: DbInventoryReference[];
    reads: DbInventoryReference[];
    migrations: DbInventoryReference[];
    unknown: DbInventoryReference[];
  };
};

export type DbInventory = {
  generatedAt: string;
  generatorVersion: "1";
  tables: DbInventoryTable[];
};

export const DB_INVENTORY: DbInventory = {
  generatedAt: "(stub — run npm run db:inventory)",
  generatorVersion: "1",
  tables: [],
};
