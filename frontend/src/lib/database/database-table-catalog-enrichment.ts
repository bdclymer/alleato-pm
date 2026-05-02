import type { Database } from "@/types/database.types";

type DatabaseTableCatalogRow =
  Database["public"]["Tables"]["database_tables_catalog"]["Row"];

type Enrichment = {
  table_comment?: string;
  notes?: string;
  tools?: string;
  category?: string;
  status?: string;
};

const SPECIFIC_ENRICHMENTS: Record<string, Enrichment> = {
  projects: {
    table_comment:
      "Master project record. Stores core job metadata and the configured project OneDrive folder URL in `projects.onedrive`.",
    notes:
      "If you are looking for the original OneDrive folder link for a project, start here.",
    tools: "Project setup, Home, OneDrive, Directory",
    category: "Project Setup",
  },
  graph_sync_state: {
    table_comment:
      "Ledger of Microsoft Graph sync status for Outlook, Teams, OneDrive, and SharePoint resources, including cursors, errors, and last successful sync state.",
    notes:
      "Best first stop to verify whether OneDrive or SharePoint syncing is actually running and which folder/resource it is tracking.",
    tools: "OneDrive, SharePoint, Outlook, Teams, Microsoft Graph",
    category: "Integrations",
  },
  document_metadata: {
    table_comment:
      "Canonical ingestion landing table for synced and uploaded documents, meetings, emails, Teams messages, OneDrive files, and SharePoint files.",
    notes:
      "OneDrive and SharePoint files land here first. Source ids are typically prefixed like `onedrive_` or `sharepoint_`.",
    tools: "Meetings, Documents, AI Assistant, OneDrive, SharePoint, Outlook, Teams",
    category: "Documents & Knowledge",
  },
  document_chunks: {
    table_comment:
      "Searchable text chunks generated from `document_metadata` for semantic retrieval and AI assistant answers.",
    notes:
      "This is the RAG/search layer, not the user-facing document library.",
    tools: "AI Assistant, Search, RAG, Documents",
    category: "Documents & Knowledge",
  },
  project_documents: {
    table_comment:
      "Project-facing document records used by the app's document UIs, workflow attachments, and download surfaces.",
    notes:
      "Not every ingested `document_metadata` row becomes a `project_documents` row automatically; this is the visible project surface.",
    tools: "Project documents, RFIs, Submittals, Change events",
    category: "Documents & Knowledge",
  },
  meeting_segments: {
    table_comment:
      "Parsed meeting transcript segments used to extract tasks, decisions, risks, and summaries from meeting content.",
    tools: "Meetings, AI extraction, Tasks, Decisions",
    category: "Meetings",
  },
  project_emails: {
    table_comment:
      "Project-linked email records for the Outlook/admin communications pipeline.",
    notes:
      "Useful when tracing email ingestion separately from generic document sync.",
    tools: "Email, Outlook, Admin comms",
    category: "Communications",
  },
  email_attachments: {
    table_comment:
      "Files extracted from project-linked emails by the Outlook attachment worker.",
    notes:
      "Separate path from generic OneDrive/SharePoint sync. This is attachment-specific intake.",
    tools: "Email attachments, Outlook, Documents",
    category: "Communications",
  },
  search_documents: {
    table_comment:
      "Search/index table for the standalone attachment ingestion pipeline.",
    notes:
      "Used for searchable extracted attachment content, especially in the Microsoft email attachment worker flow.",
    tools: "Search, Attachments, AI Assistant",
    category: "Documents & Knowledge",
  },
  rfis: {
    table_comment:
      "Request for Information records, including project questions, status, assignment, and linked supporting documents.",
    tools: "RFIs, Project workflow, Documents",
    category: "Project Controls",
  },
  submittals: {
    table_comment:
      "Primary submittal workflow records for tracked package reviews, routing, and responses.",
    tools: "Submittals, Project workflow, Documents",
    category: "Project Controls",
  },
  tasks: {
    table_comment:
      "Action items surfaced in the app, often extracted from meetings or created manually and linked back to project work.",
    tools: "Tasks, Meetings, Home",
    category: "Execution",
  },
  people: {
    table_comment:
      "Directory of individual contacts and team members across clients, vendors, and internal users.",
    tools: "Directory, Teams, Clients, Vendors",
    category: "Directory",
  },
  companies: {
    table_comment:
      "Master company directory for clients, vendors, subcontractors, and other organizations.",
    tools: "Directory, Clients, Vendors, Companies",
    category: "Directory",
  },
  budget_lines: {
    table_comment:
      "Detailed project budget line items used across budget, cost, and change workflows.",
    tools: "Budget, Forecast, Change events, Direct costs",
    category: "Financial",
  },
  prime_contracts: {
    table_comment:
      "Owner contract header records for each project's prime contract and overall billable scope.",
    tools: "Prime contracts, Owner invoices, Change orders",
    category: "Financial",
  },
  subcontracts: {
    table_comment:
      "Subcontract commitment records for downstream vendor commitments and billing.",
    tools: "Commitments, Invoices, SOV",
    category: "Financial",
  },
  purchase_orders: {
    table_comment:
      "Purchase order commitment records for material or vendor spend that is not tracked as a subcontract.",
    tools: "Commitments, Cost control, Vendors",
    category: "Financial",
  },
  change_events: {
    table_comment:
      "Potential change records capturing scope, cost, and revenue impact before formal contract change approval.",
    tools: "Change events, PCOs, Change orders",
    category: "Change Management",
  },
  potential_change_orders: {
    table_comment:
      "Commercial packaging layer that groups approved/ready change-event scope into a draft owner-facing change order.",
    tools: "PCOs, Change events, Prime contracts",
    category: "Change Management",
  },
  change_orders: {
    table_comment:
      "Executed change order records that formalize approved contract adjustments.",
    tools: "Change orders, Financials, Contracts",
    category: "Change Management",
  },
};

function hasValue(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function titleize(name: string): string {
  return name
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function inferGenericEnrichment(tableName: string): Enrichment {
  const label = titleize(tableName);

  if (tableName.startsWith("acumatica_")) {
    return {
      table_comment: `${label} data mirrored from Acumatica ERP for reporting, reconciliation, or sync workflows.`,
      tools: "Acumatica, Financial sync",
      category: "ERP Sync",
    };
  }

  if (tableName.startsWith("ai_") || tableName.startsWith("chat_") || tableName.startsWith("briefing_")) {
    return {
      table_comment: `${label} records that support AI assistant, briefing, or chat intelligence workflows.`,
      tools: "AI Assistant, Briefings, Chat",
      category: "AI & Intelligence",
    };
  }

  if (tableName.startsWith("project_")) {
    return {
      table_comment: `${label} rows that extend a project with scoped relationships, configuration, or derived project data.`,
      tools: "Projects",
      category: "Project Setup",
    };
  }

  if (tableName.startsWith("document_")) {
    return {
      table_comment: `${label} records in the document ingestion, parsing, search, or permissions pipeline.`,
      tools: "Documents, AI Assistant",
      category: "Documents & Knowledge",
    };
  }

  if (tableName.startsWith("meeting_")) {
    return {
      table_comment: `${label} records used to process or enrich meetings and meeting-derived data.`,
      tools: "Meetings",
      category: "Meetings",
    };
  }

  if (tableName.startsWith("team_chat_") || tableName.startsWith("message") || tableName.startsWith("conversation")) {
    return {
      table_comment: `${label} records used for communication history, chat threading, or messaging features.`,
      tools: "Chat, Communications",
      category: "Communications",
    };
  }

  if (tableName.startsWith("change_") || tableName.startsWith("pco_") || tableName.startsWith("prime_contract_change_")) {
    return {
      table_comment: `${label} records that support change-management workflow, approvals, or attachments.`,
      tools: "Change management",
      category: "Change Management",
    };
  }

  if (tableName.startsWith("submittal_") || tableName === "submittals") {
    return {
      table_comment: `${label} records that support the submittal review and routing workflow.`,
      tools: "Submittals",
      category: "Project Controls",
    };
  }

  if (tableName.startsWith("rfi_") || tableName === "rfis") {
    return {
      table_comment: `${label} records used by the RFI workflow, including assignments, history, and linked artifacts.`,
      tools: "RFIs",
      category: "Project Controls",
    };
  }

  if (tableName.startsWith("daily_")) {
    return {
      table_comment: `${label} records captured as part of daily logs, daily reports, or daily recaps.`,
      tools: "Daily logs",
      category: "Field Operations",
    };
  }

  if (tableName.endsWith("_attachments")) {
    return {
      table_comment: `${label} files attached to a parent workflow record.`,
      tools: "Documents, Attachments",
    };
  }

  if (tableName.endsWith("_comments")) {
    return {
      table_comment: `${label} discussion or annotation records attached to a parent workflow item.`,
      tools: "Comments, Collaboration",
    };
  }

  if (tableName.endsWith("_history") || tableName.endsWith("_audit_log")) {
    return {
      table_comment: `${label} audit trail rows that preserve historical changes or system actions.`,
      tools: "Audit, History",
    };
  }

  if (tableName.endsWith("_line_items")) {
    return {
      table_comment: `${label} detail rows that break a parent financial or workflow record into individual items.`,
      tools: "Financials, Line items",
    };
  }

  if (tableName.endsWith("_notifications")) {
    return {
      table_comment: `${label} notification delivery or notification-preference records.`,
      tools: "Notifications",
    };
  }

  if (tableName.endsWith("_state") || tableName.endsWith("_status")) {
    return {
      table_comment: `${label} system state rows that track sync progress, workflow progress, or latest status snapshots.`,
      tools: "State tracking",
    };
  }

  if (tableName.endsWith("_runs") || tableName.endsWith("_jobs")) {
    return {
      table_comment: `${label} execution records for background jobs, sync runs, or processing batches.`,
      tools: "Jobs, Background processing",
    };
  }

  return {
    table_comment: `${label} records used by this application.`,
  };
}

function withFallback(current: string | null, fallback?: string): string | null {
  if (hasValue(current)) return current;
  return fallback ?? null;
}

export function enrichDatabaseTableCatalogRows(
  rows: DatabaseTableCatalogRow[],
): DatabaseTableCatalogRow[] {
  return rows.map((row) => {
    const specific = SPECIFIC_ENRICHMENTS[row.table_name] ?? {};
    const generic = inferGenericEnrichment(row.table_name);
    const enrichment = { ...generic, ...specific };

    return {
      ...row,
      category: withFallback(row.category, enrichment.category),
      status: withFallback(row.status, enrichment.status),
      table_comment: withFallback(row.table_comment, enrichment.table_comment),
      notes: withFallback(row.notes, enrichment.notes),
      tools: withFallback(row.tools, enrichment.tools),
    };
  });
}
