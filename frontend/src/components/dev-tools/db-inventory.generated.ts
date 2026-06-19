// AUTO-GENERATED — DO NOT EDIT BY HAND.
// Regenerate with: npm run db:inventory
// Source: docs/architecture/tables.yaml + live Supabase (MAIN + RAG) + codebase grep.
// Generated: 2026-06-19T18:16:54.194Z

import inventoryJson from "./db-inventory.generated.json";

export type DbInventoryStatus =
  | "active"
  | "dead"
  | "dormant"
  | "legacy"
  | "live"
  | "live-empty"
  | "orphan-mirror";

export type DbInventoryDomain =
  | "admin"
  | "ai"
  | "auth"
  | "change_management"
  | "communications"
  | "directory"
  | "documents"
  | "estimating"
  | "financial"
  | "fm-asrs"
  | "infrastructure"
  | "intelligence"
  | "marketing"
  | "ops"
  | "permissions"
  | "pipeline"
  | "project_intelligence"
  | "projects"
  | "support"
  | "workflow";

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

export const DB_INVENTORY: DbInventory = inventoryJson as DbInventory;
