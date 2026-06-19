import type {
  EvidenceRef,
  SourceHealthSnapshot,
  ToolDefinition,
} from "./contracts";

export type NormalizedSourceRecord = {
  sourceFamily: EvidenceRef["sourceFamily"];
  sourceId: string;
  sourceTitle: string;
  sourceUrl?: string | null;
  internalHref?: string | null;
  occurredAt?: string | null;
  excerpt: string;
  confidence: EvidenceRef["confidence"];
  projectId?: number | null;
  projectLabel?: string | null;
  metadata?: Record<string, unknown>;
};

export type SourceAdapterDefinition = {
  adapterId: string;
  title: string;
  sourceFamilies: EvidenceRef["sourceFamily"][];
  toolNames: string[];
  requiredForExecutiveBrief: boolean;
  defaultFreshnessMinutes: number;
  supportedHealthStates: SourceHealthSnapshot["status"][];
  outputRecordType: "evidence_ref";
  healthRecordType: "source_health_snapshot";
};

const REQUIRED_HEALTH_STATES: SourceHealthSnapshot["status"][] = [
  "loaded",
  "stale",
  "missing",
  "degraded",
  "failed",
  "skipped",
];

export const EXECUTIVE_DAILY_BRIEF_SOURCE_ADAPTERS: SourceAdapterDefinition[] = [
  {
    adapterId: "fireflies_meetings",
    title: "Fireflies meeting adapter",
    sourceFamilies: ["fireflies", "meeting"],
    toolNames: ["fetch-fireflies-meeting-sources"],
    requiredForExecutiveBrief: true,
    defaultFreshnessMinutes: 4_320,
    supportedHealthStates: REQUIRED_HEALTH_STATES,
    outputRecordType: "evidence_ref",
    healthRecordType: "source_health_snapshot",
  },
  {
    adapterId: "outlook_email",
    title: "Outlook email adapter",
    sourceFamilies: ["outlook", "email"],
    toolNames: ["fetch-outlook-email-sources"],
    requiredForExecutiveBrief: true,
    defaultFreshnessMinutes: 4_320,
    supportedHealthStates: REQUIRED_HEALTH_STATES,
    outputRecordType: "evidence_ref",
    healthRecordType: "source_health_snapshot",
  },
  {
    adapterId: "teams_messages",
    title: "Teams message adapter",
    sourceFamilies: ["teams"],
    toolNames: ["fetch-teams-message-sources"],
    requiredForExecutiveBrief: true,
    defaultFreshnessMinutes: 4_320,
    supportedHealthStates: REQUIRED_HEALTH_STATES,
    outputRecordType: "evidence_ref",
    healthRecordType: "source_health_snapshot",
  },
  {
    adapterId: "documents_rag",
    title: "Documents/RAG adapter",
    sourceFamilies: ["document", "rag"],
    toolNames: ["fetch-document-rag-sources"],
    requiredForExecutiveBrief: true,
    defaultFreshnessMinutes: 10_080,
    supportedHealthStates: REQUIRED_HEALTH_STATES,
    outputRecordType: "evidence_ref",
    healthRecordType: "source_health_snapshot",
  },
  {
    adapterId: "acumatica_financials",
    title: "Acumatica financial adapter",
    sourceFamilies: ["acumatica"],
    toolNames: ["fetch-acumatica-financial-sources"],
    requiredForExecutiveBrief: true,
    defaultFreshnessMinutes: 1_440,
    supportedHealthStates: REQUIRED_HEALTH_STATES,
    outputRecordType: "evidence_ref",
    healthRecordType: "source_health_snapshot",
  },
  {
    adapterId: "procore_project_data",
    title: "Procore/project data adapter",
    sourceFamilies: ["procore"],
    toolNames: ["fetch-procore-project-sources"],
    requiredForExecutiveBrief: false,
    defaultFreshnessMinutes: 10_080,
    supportedHealthStates: REQUIRED_HEALTH_STATES,
    outputRecordType: "evidence_ref",
    healthRecordType: "source_health_snapshot",
  },
  {
    adapterId: "project_intelligence_packets",
    title: "Project Intelligence packet adapter",
    sourceFamilies: [
      "project_intelligence",
      "intelligence_packet",
      "insight_card",
    ],
    toolNames: ["fetch-project-intelligence-sources"],
    requiredForExecutiveBrief: true,
    defaultFreshnessMinutes: 1_440,
    supportedHealthStates: REQUIRED_HEALTH_STATES,
    outputRecordType: "evidence_ref",
    healthRecordType: "source_health_snapshot",
  },
];

export function requiredExecutiveBriefSourceFamilies() {
  return Array.from(
    new Set(
      EXECUTIVE_DAILY_BRIEF_SOURCE_ADAPTERS.filter(
        (adapter) => adapter.requiredForExecutiveBrief,
      ).flatMap((adapter) => adapter.sourceFamilies),
    ),
  );
}

export function sourceAdapterToolDefinitions(): ToolDefinition[] {
  return EXECUTIVE_DAILY_BRIEF_SOURCE_ADAPTERS.flatMap((adapter) =>
    adapter.toolNames.map((toolName) => ({
      name: toolName,
      description: `${adapter.title} returns normalized source records and source health snapshots.`,
      owningAdapter: adapter.adapterId,
      inputSchemaName: `${adapter.adapterId}.input`,
      outputSchemaName: `${adapter.adapterId}.normalizedSourcesOutput`,
      failureShape: "status_payload" as const,
      metadata: {
        sourceFamilies: adapter.sourceFamilies,
        requiredForExecutiveBrief: adapter.requiredForExecutiveBrief,
        supportedHealthStates: adapter.supportedHealthStates,
      },
    })),
  );
}
