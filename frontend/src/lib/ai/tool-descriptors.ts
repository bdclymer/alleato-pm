import { z } from "zod";
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
];

export const assistantSourceReadToolDescriptorByName = new Map(
  assistantSourceReadToolDescriptors.map((descriptor) => [
    descriptor.name,
    descriptor,
  ]),
);

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
    requiresProjectScope: descriptor.requiresProjectScope,
    requiresWritePermission: descriptor.requiresWritePermission,
    requiresDeliveryPermission: descriptor.requiresDeliveryPermission,
    evidencePolicy: descriptor.evidencePolicy,
    routingPolicy: descriptor.routingPolicy,
    factory: descriptor.factory,
  };
}
