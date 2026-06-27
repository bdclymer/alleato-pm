import { z } from "zod";
import { renderChangeRequestToolDescription } from "@/lib/ai/change-request-field-guide";
import type { ToolPolicy } from "@/lib/ai-ops/contracts";
import type {
  AssistantToolCategory,
  AssistantToolCapability,
  AssistantToolRegistryEntry,
  AssistantToolRoutingPolicy,
} from "@/lib/ai/tool-registry";

type AssistantToolDescriptor = {
  name: string;
  description: string;
  owningAdapter: string;
  inputSchemaName: string;
  outputSchemaName: string;
  inputSchema: z.ZodTypeAny;
  owner: string;
  category: AssistantToolCategory;
  capabilities: AssistantToolCapability[];
  workflows: string[];
  actorModes: ToolPolicy["actorMode"][];
  sourceFamilies?: AssistantToolRegistryEntry["sourceFamilies"];
  allowedChannels?: AssistantToolRegistryEntry["allowedChannels"];
  requiresProjectScope: boolean;
  requiresWritePermission: boolean;
  requiresDeliveryPermission: boolean;
  evidencePolicy: AssistantToolRegistryEntry["evidencePolicy"];
  routingPolicy?: AssistantToolRoutingPolicy;
  factory: NonNullable<AssistantToolRegistryEntry["factory"]>;
  failureShape?: AssistantToolRegistryEntry["failureShape"];
  metadata?: AssistantToolRegistryEntry["metadata"];
};

const AI_ASSISTANT_CHAT_WORKFLOW_ID = "ai_assistant_chat";
const PROJECT_TOOL_FACTORY = {
  modulePath: "frontend/src/lib/ai/tools/project-tools.ts",
  exportName: "createProjectTools",
} as const;
const ACTION_TOOL_FACTORY = {
  modulePath: "frontend/src/lib/ai/tools/action-tools.ts",
  exportName: "createActionTools",
} as const;

const sourceReadDescriptorDefaults = {
  owner: "ai_assistant",
  workflows: [AI_ASSISTANT_CHAT_WORKFLOW_ID],
  actorModes: ["user_delegated"] as ToolPolicy["actorMode"][],
  capabilities: ["read"] as AssistantToolCapability[],
  requiresProjectScope: false,
  requiresWritePermission: false,
  requiresDeliveryPermission: false,
  evidencePolicy: {
    sourceBearing: true,
    requiresSourceRefs: false,
    ledgerRequired: false,
  },
  factory: PROJECT_TOOL_FACTORY,
  failureShape: "result_error" as const,
};

const confirmedWriteRoutingPolicy: AssistantToolRoutingPolicy = {
  useWhen: [
    "User explicitly asks the assistant to create, update, or record a project workflow item.",
    "The tool input includes enough project-scoped detail to prepare a confirmed write request.",
  ],
  doNotUseWhen: [
    "User is asking for analysis, search, summary, or source retrieval only.",
    "The user has not confirmed the write or required write fields are still ambiguous.",
    "A generated-preview tool is more appropriate than writing a persistent workflow record.",
  ],
  preferredFreshness:
    "Use the current user request and any provided project context; re-check access during execution before persisting.",
  emptyResultBehavior:
    "Return the tool's blocked/error result with the missing field, access, approval, or idempotency reason rather than claiming a write happened.",
  citationRule:
    "Confirmed writes do not cite source evidence by default; report the created or updated record id, status, and ledger/audit result when available.",
  regressionPrompts: [
    "create an RFI for this project",
    "update the project status to at risk",
    "create a change event for this scope issue",
  ],
};

const confirmedWriteDescriptorDefaults = {
  owner: "ai_assistant",
  workflows: [AI_ASSISTANT_CHAT_WORKFLOW_ID],
  actorModes: ["user_delegated"] as ToolPolicy["actorMode"][],
  capabilities: ["write"] as AssistantToolCapability[],
  requiresProjectScope: false,
  requiresWritePermission: true,
  requiresDeliveryPermission: false,
  evidencePolicy: {
    sourceBearing: false,
    requiresSourceRefs: false,
    ledgerRequired: true,
  },
  routingPolicy: confirmedWriteRoutingPolicy,
  factory: ACTION_TOOL_FACTORY,
  failureShape: "result_error" as const,
  metadata: {
    confirmedWrite: true,
    approvalRequired: true,
    idempotencySupported: true,
  },
};

export const getRecentEmailsDescription =
  "Get a list of Outlook emails received within a specific date range. " +
  "Use this when the user asks a time-based question about emails: " +
  "'what emails did I receive today?', 'show me emails from this week', " +
  "'any emails received yesterday?', 'how many emails came in today?'. " +
  "This queries the backend Microsoft Graph live inbox first. Synced Outlook intake rows are fallback only — never treat them as live inbox truth. " +
  "By default, queries the signed-in user's synced mailbox so 'my emails today' does not spill into other mailboxes. " +
  "Returns consolidated conversation/thread groups first, with message counts, senders, recipients, dates, and previews. " +
  "Use participantEmail plus direction='to' or direction='from' only when the user explicitly asks for emails to/from a person. " +
  "Always summarize results by thread, not as a raw individual-message dump.";

export const getRecentEmailsInputSchema = z.object({
  daysBack: z
    .number()
    .optional()
    .default(1)
    .describe(
      "How many days back to look. 0 = today only, 1 = yesterday through now, 7 = last 7 days. Default 1.",
    ),
  mailboxFilter: z
    .string()
    .optional()
    .describe(
      "Optional: filter to a specific synced mailbox email address. Use bclymer@alleatogroup.com for Brandon/operator inbox prompts. Omit only for the signed-in user's synced mailbox.",
    ),
  participantEmail: z
    .string()
    .optional()
    .describe(
      "Optional participant email for questions like emails to Brandon or from Brandon.",
    ),
  direction: z
    .enum(["mailbox", "to", "from", "to_or_from"])
    .optional()
    .default("mailbox")
    .describe(
      "mailbox = messages in the mailbox; to/from filters by participantEmail. Use 'to' for emails addressed to the person.",
    ),
  timeZone: z
    .string()
    .optional()
    .default("America/New_York")
    .describe(
      "Business timezone for interpreting 'today'. Default America/New_York.",
    ),
  groupByThread: z
    .boolean()
    .optional()
    .default(true)
    .describe(
      "Return consolidated conversation groups instead of individual messages. Default true.",
    ),
  limit: z
    .number()
    .optional()
    .default(50)
    .describe("Max thread groups or emails to return. Default 50."),
});

export const searchEmailsDescription =
  "Semantic search across Outlook email content synced from Microsoft 365. " +
  "Use this when the user asks about a TOPIC in emails — not a date range. " +
  "Examples: 'any emails about the permit delay?', 'what did we send to the GC about change orders?', " +
  "'find emails mentioning the subcontractor dispute'. " +
  "For date-based questions ('what emails today?', 'show me this week's emails'), use getRecentEmails instead. " +
  "Returns email subject, sender/recipients, date, and relevant content. " +
  "Always cite results as 'email from [participants] on [date]'.";

export const searchEmailsInputSchema = z.object({
  query: z
    .string()
    .describe(
      "What to search for in emails — e.g. 'permit delay notification' or 'invoice dispute with Turner'",
    ),
  matchCount: z
    .number()
    .optional()
    .default(8)
    .describe("Number of email chunks to return"),
});

export const searchTeamsMessagesDescription =
  "Search Microsoft Teams channel message threads. " +
  "Use this when the user asks about Teams conversations, " +
  "channel discussions, or anything communicated in Teams " +
  "(e.g. 'what did the team say about the schedule in Teams?', " +
  "'find Teams messages about the subcontractor issue'). " +
  "Returns channel name, participants, date, and message content. " +
  "Always cite results as 'Teams message in [channel] on [date]'.";

export const searchTeamsMessagesInputSchema = z.object({
  query: z
    .string()
    .describe(
      "What to search for in Teams messages — e.g. 'schedule delay discussion' or 'RFI response from Hensel'",
    ),
  matchCount: z
    .number()
    .optional()
    .default(8)
    .describe("Number of Teams message chunks to return"),
});

export const searchMeetingsByTopicDescription =
  "Search for meetings about a specific topic across ALL projects. " +
  "Returns enriched results with speaker quotes, decisions, risks, " +
  "and action items from meeting digests and segments. " +
  "Use this when the user asks 'find meetings about X' or " +
  "'what have we discussed about Y'. Works cross-project by default. " +
  "Combines keyword search AND semantic search for best coverage.";

export const searchMeetingsByTopicInputSchema = z.object({
  topic: z
    .string()
    .describe(
      "The topic to search for (e.g. 'ASRS', 'sprinkler design', 'pricing')",
    ),
  projectId: z.number().optional().describe("Optional project ID to filter by"),
  projectName: z
    .string()
    .optional()
    .describe("Optional project name to filter by (e.g. 'Uniqlo')"),
  maxResults: z.number().optional().default(10).describe("Max meetings to return"),
});

export const getMeetingDetailsDescription =
  "Get the FULL details of a specific meeting including its digest, " +
  "segments with speaker discussion topics, decisions, risks, and " +
  "action items. Provide EITHER meetingId (exact DB id from a prior search) " +
  "OR meetingTitle (the meeting name — will be looked up automatically). " +
  "NEVER guess or construct a meetingId from a date or title string. " +
  "If you only know the title, pass meetingTitle and the ID will be resolved.";

export const getMeetingDetailsInputSchema = z.object({
  meetingId: z
    .string()
    .optional()
    .describe(
      "The exact meeting ID from document_metadata.id — only use this if you got it from a prior searchMeetingsByTopic or getMeetingsByDate call",
    ),
  meetingTitle: z
    .string()
    .optional()
    .describe(
      "The meeting title to search for — use this when you know the name but not the ID",
    ),
});

export const getMeetingsByDateDescription =
  "Get meetings for a specific date or date range. Use this for temporal " +
  "queries like 'today meetings', 'yesterday', or 'meetings this week'. " +
  "Returns only meeting records.";

export const getMeetingsByDateInputSchema = z.object({
  projectId: z.number().optional().describe("Optional project ID to filter by"),
  projectName: z
    .string()
    .optional()
    .describe("Optional project name to resolve and filter by"),
  date: z
    .string()
    .optional()
    .describe(
      "Exact date in YYYY-MM-DD format; defaults to today if no range is provided",
    ),
  startDate: z.string().optional().describe("Range start in YYYY-MM-DD format"),
  endDate: z.string().optional().describe("Range end in YYYY-MM-DD format"),
  maxResults: z.number().optional().default(25).describe("Max meetings to return"),
});

export const semanticSearchDescription =
  "Search across ALL project knowledge using semantic similarity: " +
  "meeting transcripts (full chunked transcripts, segment summaries, meeting summaries), " +
  "emails, Teams messages, OneDrive documents, insights (decisions/risks/opportunities), " +
  "company knowledge base entries (lessons learned, pricing intel, vendor intel), " +
  "and other indexed content. " +
  "Uses unified document_chunks table (24K+ chunks) + insights + knowledge base. " +
  "Works CROSS-PROJECT by default — no project filter needed. " +
  "Optionally filter by project name or ID, or by source type. Use when " +
  "the user asks a broad question that could span multiple data types, " +
  "or when keyword search isn't finding results.";

export const semanticSearchInputSchema = z.object({
  query: z.string().describe("Natural language search query"),
  projectId: z
    .number()
    .optional()
    .describe(
      "Optional project ID filter. When provided, non-matching document chunks are excluded.",
    ),
  projectName: z
    .string()
    .optional()
    .describe(
      "Optional project name to resolve to ID (e.g. 'Uniqlo', 'Cedar Park')",
    ),
  matchCount: z.number().optional().default(10).describe("Number of results to return"),
  threshold: z
    .number()
    .optional()
    .default(0.3)
    .describe("Minimum similarity threshold (0-1)"),
  skipRerank: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Skip the LLM reranker when the caller needs fast deterministic retrieval.",
    ),
});

export const searchExternalDocumentsDescription =
  "Search OneDrive files and uploaded project documents (PDFs, Word docs, spreadsheets, etc.). " +
  "Use this when the user asks about specific documents, reports, specs, or files " +
  "(e.g. 'find the geotechnical report', 'what does the contract say about liquidated damages?', " +
  "'search the RFP document for insurance requirements'). " +
  "Distinct from meeting transcripts — this searches files and documents. " +
  "Always cite results as 'document: [title] ([date if available])'.";

export const searchExternalDocumentsInputSchema = z.object({
  query: z
    .string()
    .describe(
      "What to search for in documents — e.g. 'liquidated damages clause' or 'geotechnical boring results'",
    ),
  matchCount: z
    .number()
    .optional()
    .default(8)
    .describe("Number of document chunks to return"),
});

export const findProjectDocumentsDescription =
  "**USE THIS to FIND specific documents/files for a project** — " +
  "permits, contracts, drawings, specs, certificates, daily reports, " +
  "RFIs, submittals, change orders, financial docs. " +
  "This is a STRUCTURED lookup against document_metadata by project " +
  "and document category/type/title keyword. NOT a content search — " +
  "use searchDocuments for content-inside-the-document queries " +
  "(e.g. 'what does the spec say about fire ratings'). " +
  "Returns: file_name, title, type, category, date, OneDrive link, " +
  "summary, and a content preview. " +
  "Examples: 'find the permit for Westfield Collective' " +
  "→ category='permit' or titleKeyword='permit'; " +
  "'show me drawings for Goodwill' → category='drawing' or titleKeyword='drawing'; " +
  "'pull the latest contract' → category='contract' ordered by date desc.";

export const findProjectDocumentsInputSchema = z.object({
  projectId: z.number().optional().describe("Project ID — use this when known"),
  projectName: z
    .string()
    .optional()
    .describe("Project name (partial, case-insensitive match)"),
  category: z
    .enum([
      "contract",
      "permit",
      "drawing",
      "specification",
      "submittal",
      "rfi",
      "daily_report",
      "change_order",
      "certificate",
      "insurance",
      "financial_document",
      "meeting",
      "email",
      "any",
    ])
    .optional()
    .default("any")
    .describe(
      "Filter by document category (legacy). 'any' returns all categories. Prefer documentType when available.",
    ),
  documentType: z
    .enum([
      "psr",
      "schedule",
      "submittal",
      "pay_app",
      "proposal",
      "estimate",
      "bid",
      "drawing",
      "specification",
      "permit",
      "rfi",
      "change_order",
      "subcontract",
      "contract",
      "safety",
      "closeout",
      "design",
      "photo",
      "executed_contract",
      "contract_proposal",
      "change_order_executed",
      "insurance_certificate",
      "lien_waiver_progress",
      "lien_waiver_final",
      "w9",
      "closeout_manual",
      "closeout_warranty",
      "closeout_asbuilt",
      "permit_inspection",
      "drawing_revision",
      "progress_photo",
      "email_message",
      "teams_message",
      "meeting_transcript",
      "invoice_document",
      "rfi_response",
      "daily_report",
      "email_attachment",
      "other",
    ])
    .optional()
    .describe(
      "Filter by structured document type. Prefer the canonical keys derived " +
        "from the SharePoint/OneDrive folder structure: " +
        "'show PSRs' → 'psr'; 'find the schedule' → 'schedule'; " +
        "'latest pay app' → 'pay_app'; 'submittals' → 'submittal'; " +
        "'the proposal' → 'proposal'; 'estimate' → 'estimate'; " +
        "'bid responses' → 'bid'; 'drawings' → 'drawing'; 'permit' → 'permit'; " +
        "'RFIs' → 'rfi'; 'change orders' → 'change_order'; " +
        "'subcontracts' → 'subcontract'; 'owner contract' → 'contract'; " +
        "'closeout / warranty / lien waiver' → 'closeout'. " +
        "(WIP financials live in PSR folders → use 'psr'.)",
    ),
  titleKeyword: z
    .string()
    .optional()
    .describe(
      "Substring to look for in file_name, title, or summary " +
        "(case-insensitive). Use when category alone isn't enough " +
        "(e.g. titleKeyword='certificate of occupancy').",
    ),
  sinceIso: z
    .string()
    .optional()
    .describe("Only documents whose date is >= this ISO timestamp"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .default(15)
    .describe("Max documents to return (1-50, default 15)"),
});

export const searchDocumentsDescription =
  "Vector SEARCH inside document CONTENT — meeting transcripts, email " +
  "bodies, doc text — by topic or keyword. Use ONLY when you need to " +
  "find the specific TEXT inside documents (e.g. 'what does the spec " +
  "say about fire ratings'). " +
  "For finding a specific FILE (the permit, the contract, the drawings) " +
  "use findProjectDocuments instead. " +
  "For project FACTS (address, phase, manager) use getProjectDetails. " +
  "Works across ALL projects by default; optionally filter by projectId/Name.";

export const searchDocumentsInputSchema = z.object({
  query: z.string().describe("Search keywords or phrases to find in documents"),
  projectId: z
    .number()
    .optional()
    .describe("Optional project ID to scope the search"),
  projectName: z
    .string()
    .optional()
    .describe(
      "Optional project name to resolve and filter by (e.g. 'Uniqlo', 'Cedar Park')",
    ),
  maxResults: z.number().optional().default(10).describe("Max results to return"),
});

export const getAPAgingReportDescription =
  "Get Accounts Payable (AP) aging report from the Acumatica ERP system. " +
  "Shows outstanding bills grouped by how many days past due they are " +
  "(Current, 1-30, 31-60, 61-90, 90+ days). This is LIVE accounting data. " +
  "Use when asked about: AP aging, outstanding bills, what we owe vendors, " +
  "overdue payables, accounts payable status, or vendor payment obligations.";

export const getAPAgingReportInputSchema = z.object({});

export const getARAgingReportDescription =
  "Get Accounts Receivable (AR) aging report from Acumatica ERP. " +
  "Shows outstanding invoices grouped by how many days past due they are. " +
  "This is LIVE accounting data. Use when asked about: AR aging, " +
  "outstanding invoices, what clients owe us, overdue receivables, " +
  "collections, or accounts receivable status.";

export const getARAgingReportInputSchema = z.object({});

export const getCashPositionReportDescription =
  "Get cash position summary from Acumatica ERP. Shows net cash flow " +
  "over a rolling window: total AR payments received (inflows) vs " +
  "AP checks issued (outflows). This is LIVE accounting data. " +
  "Use when asked about: cash position, cash flow, liquidity, " +
  "how much cash we have, net inflows/outflows, or working capital.";

export const getCashPositionReportInputSchema = z.object({
  windowDays: z
    .number()
    .optional()
    .default(90)
    .describe("Number of days to look back (default 90)"),
});

export const getVendorSpendReportDescription =
  "Get vendor spend analysis from Acumatica ERP. Shows how much has " +
  "been invoiced by vendors, how much is still outstanding, and how " +
  "much has been paid. Can filter to a specific vendor or show top " +
  "vendors by total spend. This is LIVE accounting data. " +
  "Use when asked about: vendor spend, vendor payments, top vendors, " +
  "how much we've paid a vendor, or vendor cost analysis.";

export const getVendorSpendReportInputSchema = z.object({
  vendorId: z
    .string()
    .optional()
    .describe(
      "Optional vendor ID to filter (e.g. 'PROOUT'). " +
        "Omit to see top vendors by spend.",
    ),
});

export const getRecentBillsDescription =
  "Get recent AP bills (vendor invoices) from Acumatica ERP. " +
  "Shows the latest bills with vendor, amount, balance, and status. " +
  "This is LIVE accounting data. Use when asked about: recent bills, " +
  "vendor invoices, AP transactions, or what bills came in recently.";

export const getRecentBillsInputSchema = z.object({
  status: z
    .string()
    .optional()
    .describe("Filter by status: 'Open', 'Closed', 'Balanced', etc."),
  limit: z.number().optional().default(20).describe("Max bills to return (default 20)"),
});

export const getRecentInvoicesDescription =
  "Get recent AR invoices (customer billings) from Acumatica ERP. " +
  "Shows customer invoices with amounts, balances, and status. " +
  "This is LIVE accounting data. Use when asked about: invoices, " +
  "customer billings, AR transactions, pay applications, or what " +
  "we've billed recently.";

export const getRecentInvoicesInputSchema = z.object({
  status: z.string().optional().describe("Filter by status: 'Open', 'Closed', etc."),
  limit: z
    .number()
    .optional()
    .default(20)
    .describe("Max invoices to return (default 20)"),
});

export const getAcumaticaProjectBudgetDescription =
  "Get a comprehensive project budget from the Acumatica ERP system. " +
  "Returns budget line items with original budget, revised budget, " +
  "actual costs, committed costs, cost to complete, cost at completion, " +
  "variance, and change order amounts. This is LIVE accounting data " +
  "from the official financial system of record. " +
  "Use when asked about: ERP budget, Acumatica budget, official project " +
  "budget, accounting budget, project financials from ERP, cost codes " +
  "from Acumatica, or when the user wants the 'real' budget numbers " +
  "from the accounting system. " +
  "The projectId is the Acumatica project code (e.g., '25108'), NOT " +
  "the Supabase project ID (which is a number like 67).";

export const getAcumaticaProjectBudgetInputSchema = z.object({
  projectId: z
    .string()
    .describe(
      "Acumatica project code (e.g., '25108' for Goodwill Tremont). " +
        "This is the code shown in Acumatica, not the Supabase ID.",
    ),
  typeFilter: z
    .enum(["Expense", "Income", "all"])
    .optional()
    .default("all")
    .describe(
      "Filter budget lines by type: 'Expense' for costs, " +
        "'Income' for revenue lines, or 'all' for everything.",
    ),
});

export const getAcumaticaProjectListDescription =
  "Get a list of all projects from the Acumatica ERP system with " +
  "high-level financial totals (income, expenses, net position). " +
  "This is LIVE accounting data. Use when asked about: all projects " +
  "in Acumatica, project portfolio from ERP, which projects are active " +
  "in the accounting system, or for a financial overview across all " +
  "projects from the official books.";

export const getAcumaticaProjectListInputSchema = z.object({
  statusFilter: z
    .string()
    .optional()
    .describe(
      "Filter by project status: 'Active', 'In Planning', 'Completed', etc. " +
        "Omit to see all non-planning projects.",
    ),
});

export const getPurchaseOrderSummaryDescription =
  "Get purchase order summary from Acumatica ERP. Shows POs by " +
  "vendor with totals, billed amounts, and status. This is LIVE " +
  "accounting data. Use when asked about: purchase orders, POs, " +
  "what we've ordered, procurement status, or vendor commitments.";

export const getPurchaseOrderSummaryInputSchema = z.object({
  status: z
    .string()
    .optional()
    .describe("Filter by status: 'Open', 'Closed', 'On Hold', etc."),
  limit: z.number().optional().default(30).describe("Max POs to return (default 30)"),
});

export const generatedTaskPrioritySchema = z.enum([
  "low",
  "normal",
  "medium",
  "high",
  "critical",
  "urgent",
]);

export const generatedTaskStatusSchema = z.enum([
  "open",
  "in_progress",
  "completed",
  "done",
  "blocked",
  "cancelled",
]);

export const projectCompanyTypeSchema = z.enum([
  "YOUR_COMPANY",
  "VENDOR",
  "SUBCONTRACTOR",
  "SUPPLIER",
  "CONNECTED_COMPANY",
]);

export const createChangeOrderDescription =
  "Create a new prime contract change order (PCCO). Use when the user says " +
  "'create a change order', 'add a CO', or describes a scope change that needs " +
  "to be documented as a change order. Always show a preview and ask for " +
  "confirmation before writing. If projectId is unknown, call getPortfolioOverview first.";

export const createChangeOrderInputSchema = z.object({
  projectId: z.number().describe("Project ID — required"),
  contractId: z
    .string()
    .optional()
    .describe(
      "Prime contract ID (uuid) if known — prime_contract_change_orders.contract_id is a uuid FK, never a number",
    ),
  title: z.string().describe("Change order title"),
  totalAmount: z.number().optional().describe("Dollar amount — can be 0 if TBD"),
  status: z
    .enum(["draft", "pending", "submitted", "approved", "rejected", "void"])
    .default("draft")
    .describe("Initial status — defaults to draft"),
  confirmed: z
    .boolean()
    .default(false)
    .describe("Set to true only after user confirms the preview"),
  idempotencyKey: z
    .string()
    .optional()
    .describe("Optional idempotency key to prevent duplicate writes"),
});

export const createChangeEventDescription = renderChangeRequestToolDescription();

export const createChangeEventInputSchema = z.object({
  projectId: z.number().describe("Project ID — required"),
  title: z.string().min(1).describe("Short descriptive title"),
  description: z.string().optional().describe("Detailed description"),
  scope: z
    .string()
    .optional()
    .describe(
      "Native scope such as TBD, In Scope, Out of Scope, or legacy owner_change/design_error aliases.",
    ),
  type: z
    .string()
    .optional()
    .describe(
      "Native type such as Owner Change, Design Change, Allowance, Scope Gap, or supported legacy aliases.",
    ),
  status: z
    .string()
    .optional()
    .describe(
      "Native status such as Open, Pending Approval, Approved, Rejected, Closed, or Converted.",
    ),
  reason: z.string().optional().describe("Optional native reason."),
  origin: z.string().optional().describe("Optional native origin."),
  expectingRevenue: z
    .boolean()
    .optional()
    .describe("Whether revenue is expected. Defaults to true."),
  lineItemRevenueSource: z
    .string()
    .optional()
    .describe("Optional line item revenue calculation mode."),
  confirmed: z.boolean().default(false),
  idempotencyKey: z
    .string()
    .optional()
    .describe("Optional idempotency key to prevent duplicate writes"),
});

export const updateProjectStatusDescription =
  "Update a project's health status or phase. Use when the user says " +
  "'mark [project] as at-risk', 'update status to [value]', or " +
  "'[project] is now in [phase]'. Always confirm before writing.";

export const updateProjectStatusInputSchema = z.object({
  projectId: z.number().describe("Project ID"),
  healthStatus: z
    .enum(["on_track", "at_risk", "critical", "complete", "on_hold"])
    .optional()
    .describe("New health status"),
  phase: z
    .enum(["Estimating", "Planning", "Current", "Complete", "On Hold"])
    .optional()
    .describe("New project phase"),
  reason: z.string().optional().describe("Brief reason for the status change"),
  confirmed: z.boolean().default(false),
  idempotencyKey: z
    .string()
    .optional()
    .describe("Optional idempotency key to prevent duplicate writes"),
});

export const createRFIDescription =
  "Create a new Request for Information (RFI). Use when the user says " +
  "'create an RFI', 'log an RFI about [topic]', or describes a field " +
  "question that needs a formal answer from the design team. Preview before writing.";

export const createRFIInputSchema = z.object({
  projectId: z.number().describe("Project ID"),
  subject: z.string().describe("RFI subject / title"),
  question: z.string().describe("The actual question being asked"),
  ballInCourt: z.string().optional().describe("Who is responsible for answering"),
  dueDate: z.string().optional().describe("ISO date string for response due date"),
  costImpact: z.enum(["yes", "no", "tbd"]).optional().default("tbd"),
  scheduleImpact: z.enum(["yes", "no", "tbd"]).optional().default("tbd"),
  confirmed: z.boolean().default(false),
  idempotencyKey: z
    .string()
    .optional()
    .describe("Optional idempotency key to prevent duplicate writes"),
});

export const createTaskDescription =
  "Create a schedule/Gantt task backed by schedule_tasks. Use only when the user is creating " +
  "a project schedule activity, milestone, or Gantt item. For action items, follow-ups, reminders, " +
  "or Tasks page records, use createGeneratedTask instead. Always show a preview and ask for confirmation before writing.";

export const createTaskInputSchema = z.object({
  projectId: z.number().describe("Project ID"),
  name: z.string().describe("Task name / description"),
  assignee: z.string().optional().describe("Person responsible"),
  dueDate: z.string().optional().describe("ISO due date"),
  notes: z.string().optional().describe("Additional context"),
  priority: z.enum(["low", "normal", "high", "critical"]).default("normal"),
  confirmed: z.boolean().default(false),
  idempotencyKey: z
    .string()
    .optional()
    .describe("Optional idempotency key to prevent duplicate writes"),
});

export const createGeneratedTaskDescription =
  "Create an action item in the main Tasks page task register (public.tasks). " +
  "Use this for AI-generated follow-ups, reminders, accountability items, or user-created action items " +
  "that should appear on /tasks or /[projectId]/tasks. If the action item supports a known schedule/Gantt task, pass scheduleTaskId to link it. Preview before writing.";

export const createGeneratedTaskInputSchema = z.object({
  projectId: z.number().optional().describe("Project ID if the task belongs to a project"),
  scheduleTaskId: z
    .string()
    .uuid()
    .optional()
    .describe(
      "Optional schedule_tasks.id when this action item supports a specific schedule/Gantt activity",
    ),
  title: z.string().describe("Short task title"),
  description: z.string().optional().describe("Task detail or source context"),
  assignee: z.string().optional().describe("Person responsible"),
  dueDate: z.string().optional().describe("ISO due date"),
  priority: generatedTaskPrioritySchema.default("normal"),
  status: generatedTaskStatusSchema.default("open"),
  confirmed: z.boolean().default(false),
  idempotencyKey: z
    .string()
    .optional()
    .describe("Optional idempotency key to prevent duplicate writes"),
});

export const updateGeneratedTaskDescription =
  "Update an existing task in the main Tasks page task register (public.tasks). " +
  "Use when the user asks to modify, reassign, reprioritize, close, or change a due date for a Tasks page item. Preview before writing.";

export const updateGeneratedTaskInputSchema = z.object({
  taskId: z.string().uuid().describe("Task ID from public.tasks"),
  title: z.string().optional(),
  description: z.string().optional(),
  assignee: z.string().optional(),
  dueDate: z.string().nullable().optional(),
  priority: generatedTaskPrioritySchema.optional(),
  status: generatedTaskStatusSchema.optional(),
  confirmed: z.boolean().default(false),
  idempotencyKey: z.string().optional(),
});

export const deleteGeneratedTaskDescription =
  "Delete an existing task from the main Tasks page task register (public.tasks). Preview before writing.";

export const deleteGeneratedTaskInputSchema = z.object({
  taskId: z.string().uuid().describe("Task ID from public.tasks"),
  reason: z.string().optional().describe("Why the task should be deleted"),
  confirmed: z.boolean().default(false),
  idempotencyKey: z.string().optional(),
});

export const createProjectCompanyDescription =
  "Add a company to a project's directory. Use when the user says 'add [company] to this project', " +
  "'add a vendor/subcontractor/supplier', or provides company directory details. Reuses an existing global company by exact name when possible, assigns it to the project, and previews before writing.";

export const createProjectCompanyInputSchema = z.object({
  projectId: z.number().describe("Project ID"),
  name: z.string().describe("Company name"),
  companyType: projectCompanyTypeSchema.default("VENDOR"),
  emailAddress: z.string().email().optional().describe("Project directory email for the company"),
  businessPhone: z.string().optional().describe("Company business phone"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  website: z.string().optional(),
  confirmed: z.boolean().default(false),
  idempotencyKey: z.string().optional(),
});

export const createProjectContactDescription =
  "Add a contact to a project's directory. Use when the user says 'add [person] as a contact', " +
  "'add this vendor contact to the project', or provides contact details. Reuses an existing person by email, links them to the project directory, optionally links their company, and previews before writing.";

export const createProjectContactInputSchema = z.object({
  projectId: z.number().describe("Project ID"),
  firstName: z.string().describe("Contact first name"),
  lastName: z.string().describe("Contact last name"),
  email: z.string().email().optional(),
  jobTitle: z.string().optional(),
  phoneBusiness: z.string().optional(),
  phoneMobile: z.string().optional(),
  companyId: z.string().uuid().optional().describe("Existing companies.id if known"),
  companyName: z.string().optional().describe("Existing company name to link by exact name"),
  role: z
    .string()
    .optional()
    .describe("Project-specific role, e.g. Architect, Owner Rep, Electrical PM"),
  makePrimaryCompanyContact: z.boolean().default(false),
  confirmed: z.boolean().default(false),
  idempotencyKey: z.string().optional(),
});

export const flagProjectRiskDescription =
  "Flag a project risk or insight. Use when the user says 'flag a risk', " +
  "'log an issue', or 'mark this as a concern'. Creates an AI insight record " +
  "that shows up in the risk dashboard. Preview before writing.";

export const flagProjectRiskInputSchema = z.object({
  projectId: z.number().describe("Project ID"),
  title: z.string().describe("Risk title — short, specific"),
  description: z.string().describe("Full description of the risk"),
  severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  insightType: z
    .enum([
      "financial_risk",
      "schedule_risk",
      "scope_risk",
      "team_risk",
      "client_risk",
      "general",
    ])
    .default("general"),
  financialImpact: z.number().optional().describe("Estimated dollar impact"),
  timelineImpactDays: z.number().optional().describe("Estimated schedule impact in days"),
  confirmed: z.boolean().default(false),
  idempotencyKey: z.string().optional(),
});

export const updateRFIStatusDescription =
  "Update the status of an existing RFI. Use when the user says " +
  "'close RFI #[n]', 'mark RFI [n] as answered', or 'RFI [n] is resolved'. " +
  "Always preview before writing.";

export const updateRFIStatusInputSchema = z.object({
  rfiId: z.string().optional().describe("RFI UUID if known"),
  rfiNumber: z.number().optional().describe("RFI number (easier to get from user)"),
  projectId: z.number().describe("Project ID — needed to look up by number"),
  newStatus: z.enum(["open", "answered", "closed", "void"]).describe("New status"),
  response: z.string().optional().describe("Optional response text to record"),
  confirmed: z.boolean().default(false),
  idempotencyKey: z.string().optional(),
});

export const createMeetingNoteDescription =
  "Log notes from a meeting into the project record. Use when the user says " +
  "'log notes from today's meeting', 'record what we discussed', or " +
  "'save meeting notes for [project]'. Can pre-fill from Fireflies context if available. " +
  "Always preview before writing.";

export const createMeetingNoteInputSchema = z.object({
  projectId: z.number().describe("Project ID"),
  title: z.string().describe("Meeting title, e.g. 'OAC Meeting — March 2026'"),
  date: z.string().describe("ISO date string, e.g. '2026-03-23'"),
  summary: z.string().describe("Summary of what was discussed"),
  actionItems: z.string().optional().describe("Comma-separated action items from the meeting"),
  participants: z.string().optional().describe("Comma-separated list of attendees"),
  durationMinutes: z.number().optional().describe("Meeting duration in minutes"),
  confirmed: z.boolean().default(false),
  idempotencyKey: z.string().optional(),
});

export const createSubmittalDescription =
  "Create a new submittal. Use when the user says 'create a submittal for [spec section]', " +
  "'log a submittal', or 'we need to submit [material/equipment]'. " +
  "Always preview before writing.";

export const createSubmittalInputSchema = z.object({
  projectId: z.number().describe("Project ID"),
  title: z.string().describe("Submittal title, e.g. 'Structural Steel Shop Drawings'"),
  specSection: z.string().optional().describe("Spec section number, e.g. '05 12 00'"),
  dueDate: z.string().optional().describe("ISO due date"),
  submittedBy: z.string().default("TBD").describe("Subcontractor or party submitting"),
  status: z
    .enum([
      "Draft",
      "Open",
      "Distributed",
      "Closed",
      "submitted",
      "under_review",
      "requires_revision",
      "approved",
      "rejected",
      "superseded",
    ])
    .default("Draft"),
  confirmed: z.boolean().default(false),
  idempotencyKey: z.string().optional(),
});

export const logDailyReportDescription =
  "Create a daily log entry for a project. Use when the user says " +
  "'log today's daily report', 'record site activity for [date]', or " +
  "'add a daily log entry'. Weather conditions and notes are stored as JSON. " +
  "Always preview before writing.";

export const logDailyReportInputSchema = z.object({
  projectId: z.number().describe("Project ID"),
  logDate: z
    .string()
    .describe("ISO date, e.g. '2026-03-23'")
    .default(new Date().toISOString().split("T")[0]),
  weather: z.string().optional().describe("Weather description, e.g. 'Clear, 72°F'"),
  crewCount: z.number().optional().describe("Total workers on site"),
  workPerformed: z.string().optional().describe("Summary of work performed"),
  notes: z.string().optional().describe("Additional notes or observations"),
  confirmed: z.boolean().default(false),
  idempotencyKey: z.string().optional(),
});

export const generateProjectSummaryDescription =
  "Generate a comprehensive project status summary by pulling budget, schedule, " +
  "RFI, change order, and meeting data — then synthesizing it into a stored document. " +
  "Use when the user says 'give me a status summary', 'project report', or " +
  "'what's the status of [project]'. This creates a reusable document, not just a chat response.";

export const generateProjectSummaryInputSchema = z.object({
  projectId: z.number().optional().describe("Project ID (provide this OR projectName)"),
  projectName: z.string().optional().describe("Project name (fuzzy match)"),
  confirmed: z.boolean().default(false),
  idempotencyKey: z.string().optional(),
});

export const commitmentLineItemSchema = z.object({
  budgetCode: z.string().optional(),
  description: z.string().describe("SOV line item description"),
  amount: z.number().describe("Line item amount in dollars"),
  quantity: z.number().optional(),
  unitCost: z.number().optional(),
  uom: z.string().optional(),
  retainagePercent: z.number().optional(),
});

export const createCommitmentDescription =
  "Create a new commitment — either a subcontract (for labor/trade work) or a " +
  "purchase order (for materials or equipment). Use when the user says " +
  "'create a subcontract', 'add a PO', 'set up a commitment with [vendor]', " +
  "or describes awarding work to a subcontractor or supplier. " +
  "Always show a preview and ask for confirmation before writing. " +
  "If projectId is unknown, call getPortfolioOverview first.";

export const createCommitmentInputSchema = z.object({
  projectId: z.number().describe("Project ID — required"),
  type: z
    .enum(["subcontract", "purchase_order"])
    .describe(
      "Type of commitment: 'subcontract' for labor/trade work, 'purchase_order' for materials/equipment",
    ),
  title: z.string().describe("Commitment title, e.g. 'Electrical Work' or 'Structural Steel Supply'"),
  vendorName: z
    .string()
    .optional()
    .describe("Vendor or subcontractor company name — used to look up contract_company_id"),
  contractNumber: z
    .string()
    .optional()
    .describe("Contract number — auto-generated (SC-001 or PO-001) if not provided"),
  status: z
    .enum(["Draft", "Out for Bid", "Out for Signature", "Approved", "Complete", "Terminated", "Void"])
    .default("Draft")
    .describe("Initial status — defaults to Draft"),
  description: z.string().optional().describe("Scope description"),
  startDate: z.string().optional().describe("ISO start date, e.g. '2026-04-01'"),
  estimatedCompletionDate: z.string().optional().describe("ISO estimated completion date"),
  defaultRetainagePercent: z
    .number()
    .optional()
    .describe("Default retainage percentage, e.g. 10 for 10%"),
  lineItems: z
    .array(commitmentLineItemSchema)
    .optional()
    .describe("Optional SOV line items to create with the commitment after confirmation"),
  confirmed: z
    .boolean()
    .default(false)
    .describe("Set to true only after user confirms the preview"),
  idempotencyKey: z
    .string()
    .optional()
    .describe("Optional idempotency key to prevent duplicate writes"),
});

const outlookRoutingPolicy: AssistantToolRoutingPolicy = {
  useWhen: [
    "User asks about Outlook, inbox, mail, email, received messages, replies, unread items, or email triage.",
    "User asks what important emails came in today or this morning.",
  ],
  doNotUseWhen: [
    "User asks about Teams messages or chats.",
    "User asks about meeting transcripts or Fireflies meetings.",
  ],
  preferredFreshness:
    "Use live Microsoft Graph Outlook reads for inbox/date triage when available; use synced rows only as an explicit fallback.",
  emptyResultBehavior:
    "State that Outlook/email retrieval returned no matching rows or fell back, including the source/freshness caveat.",
  citationRule: "Cite as Outlook/email with sender, subject, and date.",
  regressionPrompts: [
    "what are my most important emails from today?",
    "anything urgent in my inbox this morning?",
  ],
};

const meetingRoutingPolicy: AssistantToolRoutingPolicy = {
  useWhen: [
    "User asks what was discussed, decided, raised, or assigned in meetings.",
    "User asks for Fireflies, meeting transcripts, OACs, huddles, or meeting intelligence.",
  ],
  doNotUseWhen: [
    "User asks specifically for Teams messages, chats, or DMs.",
    "User asks specifically for Outlook inbox or email results.",
  ],
  preferredFreshness:
    "Use date-aware meeting retrieval for today/yesterday/specific dates; use semantic meeting search for topical historical questions.",
  emptyResultBehavior:
    "State that meeting retrieval returned no matching rows and do not fill the gap with Teams/email unless the user requested cross-source context.",
  citationRule: "Cite as Fireflies/meeting with meeting title and date.",
  regressionPrompts: [
    "what meetings were held today?",
    "what did the Westfield OAC decide?",
  ],
};

const documentRoutingPolicy: AssistantToolRoutingPolicy = {
  useWhen: [
    "User asks to search across documents, RAG chunks, OneDrive/SharePoint files, specs, drawings, or broad unstructured evidence.",
    "User asks a cross-source investigation spanning more than one source family.",
  ],
  doNotUseWhen: [
    "A narrower source-specific path exists for same-day Teams, Outlook inbox, or meeting-date questions.",
    "User asks for structured project/accounting rows rather than unstructured evidence.",
  ],
  preferredFreshness:
    "Use source-specific live/structured retrieval before broad semantic search when the user names one current communication source.",
  emptyResultBehavior:
    "State that document/RAG search returned no matching passages and identify the queried source scope.",
  citationRule:
    "Cite as document/RAG result with title, source type, and date when available.",
  regressionPrompts: [
    "search documents for the insurance requirement",
    "research the emails, Teams, and meetings to see where this started",
  ],
};

const acumaticaRoutingPolicy: AssistantToolRoutingPolicy = {
  useWhen: [
    "User asks about Acumatica, accounting, AP/AR aging, cash, vendor spend, bills, invoices, purchase orders, or project budget from accounting data.",
  ],
  doNotUseWhen: [
    "User asks for meeting/email/Teams commentary about financial issues rather than accounting rows.",
    "User asks for Procore budget line workflow state rather than Acumatica truth.",
  ],
  preferredFreshness:
    "Use the structured Acumatica tool or sync-health-aware accounting source before interpreting communication evidence.",
  emptyResultBehavior:
    "State that Acumatica/accounting retrieval returned no rows or is stale, and do not invent financial totals.",
  citationRule:
    "Cite as Acumatica/accounting data with report/entity name and as-of time when available.",
  regressionPrompts: [
    "pull current AR aging from Acumatica",
    "which vendors have we spent the most with this year?",
  ],
};

export const assistantSourceReadToolDescriptors: AssistantToolDescriptor[] = [
  {
    ...sourceReadDescriptorDefaults,
    name: "getRecentEmails",
    description: getRecentEmailsDescription,
    owningAdapter: "project_tools",
    inputSchemaName: "getRecentEmails.input",
    outputSchemaName: "getRecentEmails.output",
    inputSchema: getRecentEmailsInputSchema,
    category: "operational",
    sourceFamilies: ["outlook", "email"],
    routingPolicy: outlookRoutingPolicy,
  },
  {
    ...sourceReadDescriptorDefaults,
    name: "searchEmails",
    description: searchEmailsDescription,
    owningAdapter: "project_tools",
    inputSchemaName: "searchEmails.input",
    outputSchemaName: "searchEmails.output",
    inputSchema: searchEmailsInputSchema,
    category: "document",
    sourceFamilies: ["outlook", "email", "document", "rag"],
    routingPolicy: outlookRoutingPolicy,
  },
  {
    ...sourceReadDescriptorDefaults,
    name: "searchTeamsMessages",
    description: searchTeamsMessagesDescription,
    owningAdapter: "project_tools",
    inputSchemaName: "searchTeamsMessages.input",
    outputSchemaName: "searchTeamsMessages.output",
    inputSchema: searchTeamsMessagesInputSchema,
    category: "operational",
    sourceFamilies: ["teams"],
    routingPolicy: {
      useWhen: [
        "User asks about Teams messages, DMs, chats, threads, conversations, or Teams chatter.",
        "User asks for recent or same-day Teams message insights.",
      ],
      doNotUseWhen: [
        "User asks about Fireflies meetings or meeting transcripts without Teams.",
        "User asks about Outlook inbox or email triage.",
      ],
      preferredFreshness:
        "Use Teams-specific retrieval that checks live Microsoft Graph first when available, then synced Teams RAG rows.",
      emptyResultBehavior:
        "State that Teams retrieval returned no matching rows and do not substitute meetings or emails as if they were Teams results.",
      citationRule:
        "Cite as Teams message/conversation with title or channel and date.",
      regressionPrompts: [
        "what insights can be found in the teams messages today?",
        "show me recent Teams chatter about Westfield",
      ],
    },
  },
  {
    ...sourceReadDescriptorDefaults,
    name: "searchMeetingsByTopic",
    description: searchMeetingsByTopicDescription,
    owningAdapter: "project_tools",
    inputSchemaName: "searchMeetingsByTopic.input",
    outputSchemaName: "searchMeetingsByTopic.output",
    inputSchema: searchMeetingsByTopicInputSchema,
    category: "operational",
    sourceFamilies: ["meeting", "fireflies"],
    routingPolicy: meetingRoutingPolicy,
  },
  {
    ...sourceReadDescriptorDefaults,
    name: "getMeetingDetails",
    description: getMeetingDetailsDescription,
    owningAdapter: "project_tools",
    inputSchemaName: "getMeetingDetails.input",
    outputSchemaName: "getMeetingDetails.output",
    inputSchema: getMeetingDetailsInputSchema,
    category: "operational",
    sourceFamilies: ["meeting", "fireflies"],
    routingPolicy: meetingRoutingPolicy,
  },
  {
    ...sourceReadDescriptorDefaults,
    name: "getMeetingsByDate",
    description: getMeetingsByDateDescription,
    owningAdapter: "project_tools",
    inputSchemaName: "getMeetingsByDate.input",
    outputSchemaName: "getMeetingsByDate.output",
    inputSchema: getMeetingsByDateInputSchema,
    category: "operational",
    sourceFamilies: ["meeting", "fireflies"],
    routingPolicy: meetingRoutingPolicy,
  },
  {
    ...sourceReadDescriptorDefaults,
    name: "semanticSearch",
    description: semanticSearchDescription,
    owningAdapter: "project_tools",
    inputSchemaName: "semanticSearch.input",
    outputSchemaName: "semanticSearch.output",
    inputSchema: semanticSearchInputSchema,
    category: "document",
    sourceFamilies: ["document", "rag"],
    routingPolicy: documentRoutingPolicy,
  },
  {
    ...sourceReadDescriptorDefaults,
    name: "searchExternalDocuments",
    description: searchExternalDocumentsDescription,
    owningAdapter: "project_tools",
    inputSchemaName: "searchExternalDocuments.input",
    outputSchemaName: "searchExternalDocuments.output",
    inputSchema: searchExternalDocumentsInputSchema,
    category: "document",
    sourceFamilies: ["document", "rag"],
    routingPolicy: documentRoutingPolicy,
  },
  {
    ...sourceReadDescriptorDefaults,
    name: "findProjectDocuments",
    description: findProjectDocumentsDescription,
    owningAdapter: "project_tools",
    inputSchemaName: "findProjectDocuments.input",
    outputSchemaName: "findProjectDocuments.output",
    inputSchema: findProjectDocumentsInputSchema,
    category: "document",
    sourceFamilies: ["document", "rag"],
    routingPolicy: documentRoutingPolicy,
  },
  {
    ...sourceReadDescriptorDefaults,
    name: "searchDocuments",
    description: searchDocumentsDescription,
    owningAdapter: "project_tools",
    inputSchemaName: "searchDocuments.input",
    outputSchemaName: "searchDocuments.output",
    inputSchema: searchDocumentsInputSchema,
    category: "document",
    sourceFamilies: ["document", "rag"],
    routingPolicy: documentRoutingPolicy,
  },
  {
    ...sourceReadDescriptorDefaults,
    name: "getAPAgingReport",
    description: getAPAgingReportDescription,
    owningAdapter: "project_tools",
    inputSchemaName: "getAPAgingReport.input",
    outputSchemaName: "getAPAgingReport.output",
    inputSchema: getAPAgingReportInputSchema,
    category: "financial",
    sourceFamilies: ["acumatica"],
    routingPolicy: acumaticaRoutingPolicy,
  },
  {
    ...sourceReadDescriptorDefaults,
    name: "getARAgingReport",
    description: getARAgingReportDescription,
    owningAdapter: "project_tools",
    inputSchemaName: "getARAgingReport.input",
    outputSchemaName: "getARAgingReport.output",
    inputSchema: getARAgingReportInputSchema,
    category: "financial",
    sourceFamilies: ["acumatica"],
    routingPolicy: acumaticaRoutingPolicy,
  },
  {
    ...sourceReadDescriptorDefaults,
    name: "getCashPositionReport",
    description: getCashPositionReportDescription,
    owningAdapter: "project_tools",
    inputSchemaName: "getCashPositionReport.input",
    outputSchemaName: "getCashPositionReport.output",
    inputSchema: getCashPositionReportInputSchema,
    category: "financial",
    sourceFamilies: ["acumatica"],
    routingPolicy: acumaticaRoutingPolicy,
  },
  {
    ...sourceReadDescriptorDefaults,
    name: "getVendorSpendReport",
    description: getVendorSpendReportDescription,
    owningAdapter: "project_tools",
    inputSchemaName: "getVendorSpendReport.input",
    outputSchemaName: "getVendorSpendReport.output",
    inputSchema: getVendorSpendReportInputSchema,
    category: "financial",
    sourceFamilies: ["acumatica"],
    routingPolicy: acumaticaRoutingPolicy,
  },
  {
    ...sourceReadDescriptorDefaults,
    name: "getRecentBills",
    description: getRecentBillsDescription,
    owningAdapter: "project_tools",
    inputSchemaName: "getRecentBills.input",
    outputSchemaName: "getRecentBills.output",
    inputSchema: getRecentBillsInputSchema,
    category: "financial",
    sourceFamilies: ["acumatica"],
    routingPolicy: acumaticaRoutingPolicy,
  },
  {
    ...sourceReadDescriptorDefaults,
    name: "getRecentInvoices",
    description: getRecentInvoicesDescription,
    owningAdapter: "project_tools",
    inputSchemaName: "getRecentInvoices.input",
    outputSchemaName: "getRecentInvoices.output",
    inputSchema: getRecentInvoicesInputSchema,
    category: "financial",
    sourceFamilies: ["acumatica"],
    routingPolicy: acumaticaRoutingPolicy,
  },
  {
    ...sourceReadDescriptorDefaults,
    name: "getAcumaticaProjectBudget",
    description: getAcumaticaProjectBudgetDescription,
    owningAdapter: "project_tools",
    inputSchemaName: "getAcumaticaProjectBudget.input",
    outputSchemaName: "getAcumaticaProjectBudget.output",
    inputSchema: getAcumaticaProjectBudgetInputSchema,
    category: "financial",
    sourceFamilies: ["acumatica"],
    routingPolicy: acumaticaRoutingPolicy,
  },
  {
    ...sourceReadDescriptorDefaults,
    name: "getAcumaticaProjectList",
    description: getAcumaticaProjectListDescription,
    owningAdapter: "project_tools",
    inputSchemaName: "getAcumaticaProjectList.input",
    outputSchemaName: "getAcumaticaProjectList.output",
    inputSchema: getAcumaticaProjectListInputSchema,
    category: "financial",
    sourceFamilies: ["acumatica"],
    routingPolicy: acumaticaRoutingPolicy,
  },
  {
    ...sourceReadDescriptorDefaults,
    name: "getPurchaseOrderSummary",
    description: getPurchaseOrderSummaryDescription,
    owningAdapter: "project_tools",
    inputSchemaName: "getPurchaseOrderSummary.input",
    outputSchemaName: "getPurchaseOrderSummary.output",
    inputSchema: getPurchaseOrderSummaryInputSchema,
    category: "financial",
    sourceFamilies: ["acumatica"],
    routingPolicy: acumaticaRoutingPolicy,
  },
];

export const assistantActionToolDescriptors: AssistantToolDescriptor[] = [
  {
    ...confirmedWriteDescriptorDefaults,
    name: "createChangeOrder",
    description: createChangeOrderDescription,
    owningAdapter: "action_tools",
    inputSchemaName: "createChangeOrder.input",
    outputSchemaName: "createChangeOrder.output",
    inputSchema: createChangeOrderInputSchema,
    category: "workflow",
    sourceFamilies: ["procore", "system"],
  },
  {
    ...confirmedWriteDescriptorDefaults,
    name: "createChangeEvent",
    description: createChangeEventDescription,
    owningAdapter: "action_tools",
    inputSchemaName: "createChangeEvent.input",
    outputSchemaName: "createChangeEvent.output",
    inputSchema: createChangeEventInputSchema,
    category: "workflow",
    sourceFamilies: ["procore", "system"],
  },
  {
    ...confirmedWriteDescriptorDefaults,
    name: "updateProjectStatus",
    description: updateProjectStatusDescription,
    owningAdapter: "action_tools",
    inputSchemaName: "updateProjectStatus.input",
    outputSchemaName: "updateProjectStatus.output",
    inputSchema: updateProjectStatusInputSchema,
    category: "workflow",
    sourceFamilies: ["procore", "system"],
  },
  {
    ...confirmedWriteDescriptorDefaults,
    name: "createRFI",
    description: createRFIDescription,
    owningAdapter: "action_tools",
    inputSchemaName: "createRFI.input",
    outputSchemaName: "createRFI.output",
    inputSchema: createRFIInputSchema,
    category: "workflow",
    sourceFamilies: ["procore", "system"],
  },
  {
    ...confirmedWriteDescriptorDefaults,
    name: "createTask",
    description: createTaskDescription,
    owningAdapter: "action_tools",
    inputSchemaName: "createTask.input",
    outputSchemaName: "createTask.output",
    inputSchema: createTaskInputSchema,
    category: "workflow",
    sourceFamilies: ["procore", "system"],
  },
  {
    ...confirmedWriteDescriptorDefaults,
    name: "createGeneratedTask",
    description: createGeneratedTaskDescription,
    owningAdapter: "action_tools",
    inputSchemaName: "createGeneratedTask.input",
    outputSchemaName: "createGeneratedTask.output",
    inputSchema: createGeneratedTaskInputSchema,
    category: "workflow",
    sourceFamilies: ["procore", "system"],
  },
  {
    ...confirmedWriteDescriptorDefaults,
    name: "updateGeneratedTask",
    description: updateGeneratedTaskDescription,
    owningAdapter: "action_tools",
    inputSchemaName: "updateGeneratedTask.input",
    outputSchemaName: "updateGeneratedTask.output",
    inputSchema: updateGeneratedTaskInputSchema,
    category: "workflow",
    sourceFamilies: ["procore", "system"],
  },
  {
    ...confirmedWriteDescriptorDefaults,
    name: "deleteGeneratedTask",
    description: deleteGeneratedTaskDescription,
    owningAdapter: "action_tools",
    inputSchemaName: "deleteGeneratedTask.input",
    outputSchemaName: "deleteGeneratedTask.output",
    inputSchema: deleteGeneratedTaskInputSchema,
    category: "workflow",
    sourceFamilies: ["procore", "system"],
  },
  {
    ...confirmedWriteDescriptorDefaults,
    name: "createProjectCompany",
    description: createProjectCompanyDescription,
    owningAdapter: "action_tools",
    inputSchemaName: "createProjectCompany.input",
    outputSchemaName: "createProjectCompany.output",
    inputSchema: createProjectCompanyInputSchema,
    category: "workflow",
    sourceFamilies: ["procore", "system"],
  },
  {
    ...confirmedWriteDescriptorDefaults,
    name: "createProjectContact",
    description: createProjectContactDescription,
    owningAdapter: "action_tools",
    inputSchemaName: "createProjectContact.input",
    outputSchemaName: "createProjectContact.output",
    inputSchema: createProjectContactInputSchema,
    category: "workflow",
    sourceFamilies: ["procore", "system"],
  },
  {
    ...confirmedWriteDescriptorDefaults,
    name: "flagProjectRisk",
    description: flagProjectRiskDescription,
    owningAdapter: "action_tools",
    inputSchemaName: "flagProjectRisk.input",
    outputSchemaName: "flagProjectRisk.output",
    inputSchema: flagProjectRiskInputSchema,
    category: "workflow",
    sourceFamilies: ["procore", "system"],
  },
  {
    ...confirmedWriteDescriptorDefaults,
    name: "updateRFIStatus",
    description: updateRFIStatusDescription,
    owningAdapter: "action_tools",
    inputSchemaName: "updateRFIStatus.input",
    outputSchemaName: "updateRFIStatus.output",
    inputSchema: updateRFIStatusInputSchema,
    category: "workflow",
    sourceFamilies: ["procore", "system"],
  },
  {
    ...confirmedWriteDescriptorDefaults,
    name: "createMeetingNote",
    description: createMeetingNoteDescription,
    owningAdapter: "action_tools",
    inputSchemaName: "createMeetingNote.input",
    outputSchemaName: "createMeetingNote.output",
    inputSchema: createMeetingNoteInputSchema,
    category: "workflow",
    sourceFamilies: ["procore", "system"],
  },
  {
    ...confirmedWriteDescriptorDefaults,
    name: "createSubmittal",
    description: createSubmittalDescription,
    owningAdapter: "action_tools",
    inputSchemaName: "createSubmittal.input",
    outputSchemaName: "createSubmittal.output",
    inputSchema: createSubmittalInputSchema,
    category: "workflow",
    sourceFamilies: ["procore", "system"],
  },
  {
    ...confirmedWriteDescriptorDefaults,
    name: "logDailyReport",
    description: logDailyReportDescription,
    owningAdapter: "action_tools",
    inputSchemaName: "logDailyReport.input",
    outputSchemaName: "logDailyReport.output",
    inputSchema: logDailyReportInputSchema,
    category: "workflow",
    sourceFamilies: ["procore", "system"],
  },
  {
    ...confirmedWriteDescriptorDefaults,
    name: "generateProjectSummary",
    description: generateProjectSummaryDescription,
    owningAdapter: "action_tools",
    inputSchemaName: "generateProjectSummary.input",
    outputSchemaName: "generateProjectSummary.output",
    inputSchema: generateProjectSummaryInputSchema,
    category: "workflow",
    sourceFamilies: ["procore", "system"],
  },
  {
    ...confirmedWriteDescriptorDefaults,
    name: "createCommitment",
    description: createCommitmentDescription,
    owningAdapter: "action_tools",
    inputSchemaName: "createCommitment.input",
    outputSchemaName: "createCommitment.output",
    inputSchema: createCommitmentInputSchema,
    category: "workflow",
    sourceFamilies: ["procore", "system"],
  },
];

export const assistantToolDescriptorByName = new Map(
  [...assistantSourceReadToolDescriptors, ...assistantActionToolDescriptors].map((descriptor) => [
    descriptor.name,
    descriptor,
  ]),
);

export const assistantSourceReadToolDescriptorByName =
  assistantToolDescriptorByName;

const READONLY_MCP_TOOL_PATTERNS = [
  /^get/i,
  /^list/i,
  /^read/i,
  /^search/i,
  /^query/i,
  /^retrieve/i,
  /^find/i,
  /^lookup/i,
];

const DANGEROUS_MCP_TOOL_PATTERNS = [
  /apply/i,
  /create/i,
  /delete/i,
  /drop/i,
  /execute[_-]?sql/i,
  /insert/i,
  /migration/i,
  /mutate/i,
  /remove/i,
  /run[_-]?sql/i,
  /truncate/i,
  /update/i,
  /upsert/i,
  /write/i,
];

export type AssistantMcpToolDescriptor = {
  serverName: string;
  toolName: string;
  prefixedName: string;
  enabled: boolean;
  effect: "read" | "allowlisted_artifact_write" | "denied";
  reason:
    | "server_allowlist"
    | "generic_read_only"
    | "not_in_server_allowlist"
    | "dangerous_mutation_pattern"
    | "not_read_only_pattern";
  metadata: {
    descriptorOwned: true;
    runtimeDiscovered: true;
    serverName: string;
    originalToolName: string;
  };
};

export function assistantMcpToolDescriptor(input: {
  serverName: string;
  toolName: string;
  allowedTools?: readonly string[];
}): AssistantMcpToolDescriptor {
  const prefixedName = `mcp_${input.serverName}_${input.toolName}`;
  const metadata = {
    descriptorOwned: true,
    runtimeDiscovered: true,
    serverName: input.serverName,
    originalToolName: input.toolName,
  } as const;

  if (input.allowedTools) {
    const enabled = input.allowedTools.includes(input.toolName);
    return {
      serverName: input.serverName,
      toolName: input.toolName,
      prefixedName,
      enabled,
      effect: enabled ? "allowlisted_artifact_write" : "denied",
      reason: enabled ? "server_allowlist" : "not_in_server_allowlist",
      metadata,
    };
  }

  if (
    DANGEROUS_MCP_TOOL_PATTERNS.some((pattern) => pattern.test(input.toolName))
  ) {
    return {
      serverName: input.serverName,
      toolName: input.toolName,
      prefixedName,
      enabled: false,
      effect: "denied",
      reason: "dangerous_mutation_pattern",
      metadata,
    };
  }

  const enabled = READONLY_MCP_TOOL_PATTERNS.some((pattern) =>
    pattern.test(input.toolName),
  );
  return {
    serverName: input.serverName,
    toolName: input.toolName,
    prefixedName,
    enabled,
    effect: enabled ? "read" : "denied",
    reason: enabled ? "generic_read_only" : "not_read_only_pattern",
    metadata,
  };
}

export function registryEntryFromAssistantToolDescriptor(
  descriptor: AssistantToolDescriptor,
): AssistantToolRegistryEntry {
  if (!descriptor.description.trim()) {
    throw new Error(
      `Assistant tool descriptor ${descriptor.name} is missing a description`,
    );
  }
  if (!descriptor.inputSchema) {
    throw new Error(
      `Assistant tool descriptor ${descriptor.name} is missing an input schema`,
    );
  }
  if (!descriptor.routingPolicy) {
    throw new Error(
      `Assistant tool descriptor ${descriptor.name} is missing routing policy`,
    );
  }

  return {
    name: descriptor.name,
    description: descriptor.description,
    owningAdapter: descriptor.owningAdapter,
    inputSchemaName: descriptor.inputSchemaName,
    outputSchemaName: descriptor.outputSchemaName,
    failureShape: descriptor.failureShape ?? "result_error",
    metadata: {
      runtimeFactory: true,
      descriptorOwned: true,
      inputSchemaOwned: true,
      ...descriptor.metadata,
    },
    owner: descriptor.owner,
    category: descriptor.category,
    capabilities: descriptor.capabilities,
    workflows: descriptor.workflows,
    actorModes: descriptor.actorModes,
    sourceFamilies: descriptor.sourceFamilies,
    allowedChannels: descriptor.allowedChannels,
    requiresProjectScope: descriptor.requiresProjectScope,
    requiresWritePermission: descriptor.requiresWritePermission,
    requiresDeliveryPermission: descriptor.requiresDeliveryPermission,
    evidencePolicy: descriptor.evidencePolicy,
    routingPolicy: descriptor.routingPolicy,
    factory: descriptor.factory,
  };
}
