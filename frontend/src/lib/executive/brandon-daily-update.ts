import { createServiceClient } from "@/lib/supabase/service";
import {
  EMBEDDING,
  generateEmbedding,
  getOpenAI,
} from "@/lib/ai/tools/tool-utils";

type BriefTone = "neutral" | "good" | "watch" | "risk";
type BriefSource = "Email" | "Teams" | "Meeting" | "Document";

export type BrandonBriefItem = {
  title: string;
  summary: string;
  source: BriefSource;
  sourceDetail: string;
  date: string;
  project: string;
  owner?: string;
  status?: string;
  tone?: BriefTone;
  retrieval?: string;
};

export type BrandonBriefSourceCoverage = {
  label: BriefSource;
  detail: string;
  count: number;
  latest: string;
};

export type BrandonDailyUpdatePacket = {
  generatedAt: string;
  windowDays: number;
  retrievalOrder: string[];
  sections: {
    needsBrandon: BrandonBriefItem[];
    waitingOnOthers: BrandonBriefItem[];
    importantUpdates: BrandonBriefItem[];
  };
  sourceCoverage: BrandonBriefSourceCoverage[];
  retrievalNotes: string[];
};

type SourceGroup = {
  label: BriefSource;
  sourceTypes: string[];
  detail: string;
};

type QuerySpec = {
  section: keyof BrandonDailyUpdatePacket["sections"];
  title: string;
  query: string;
  owner?: string;
  status?: string;
  tone?: BriefTone;
};

type RagRow = {
  chunk_id?: string | null;
  document_id?: string | null;
  chunk_index?: number | null;
  chunk_text?: string | null;
  text?: string | null;
  similarity?: number | null;
  source_type?: string | null;
  doc_title?: string | null;
  doc_source?: string | null;
  doc_type?: string | null;
  doc_date?: string | null;
  doc_project_id?: number | null;
  doc_created_at?: string | null;
};

type DocumentMetaRow = {
  id: string;
  title: string | null;
  project: string | null;
  project_id: number | null;
  date: string | null;
  created_at: string | null;
  captured_at: string | null;
  source_system: string | null;
  source: string | null;
  type: string | null;
  category: string | null;
  summary: string | null;
  overview: string | null;
  action_items: string | null;
};

type RankedHit = {
  spec: QuerySpec;
  sourceGroup: SourceGroup;
  row: RagRow;
  metadata?: DocumentMetaRow;
  date: Date | null;
  similarity: number;
  text: string;
};

type RagRpcClient = {
  rpc: (
    name: "search_document_chunks",
    args: {
      query_embedding: string;
      filter_source_types: string[] | null;
      filter_project_id: number | null;
      match_count: number;
      match_threshold: number;
    },
  ) => Promise<{ data: RagRow[] | null; error: { message: string } | null }>;
};

const SOURCE_GROUPS: SourceGroup[] = [
  {
    label: "Email",
    sourceTypes: ["email"],
    detail: "Recent email chunks",
  },
  {
    label: "Teams",
    sourceTypes: ["teams_dm", "teams_channel"],
    detail: "Recent Teams direct and channel chunks",
  },
  {
    label: "Meeting",
    sourceTypes: [
      "meeting_transcript",
      "meeting_summary",
      "meeting_segment_summary",
      "meeting_section",
      "meeting_notes",
      "meeting_summary_embed",
    ],
    detail: "Recent Fireflies meeting chunks",
  },
];

const QUERY_SPECS: QuerySpec[] = [
  {
    section: "needsBrandon",
    title: "Insurance, license, COI, or permit blocks",
    query:
      "Brandon urgent insurance license suspended proof of workers compensation WC COI City of Indianapolis permit STR26-00599 action needed",
    owner: "Brandon / Maria / insurance contact",
    status: "Confirm cleared",
    tone: "risk",
  },
  {
    section: "needsBrandon",
    title: "Finance actions Brandon asked about",
    query:
      "Brandon wire form draw payment subcontractor paid unpaid finance status Misty Rob Wilmer forum 300000",
    owner: "Finance / project team",
    status: "Needs confirmation",
    tone: "watch",
  },
  {
    section: "needsBrandon",
    title: "Access removal or company property recovery",
    query:
      "Brandon fire employee remove access laptop hotel company property recover credentials access removal",
    owner: "Operations / IT",
    status: "Verify complete",
    tone: "risk",
  },
  {
    section: "waitingOnOthers",
    title: "Pricing, quote, or proposal waiting on someone else",
    query:
      "Brandon waiting on pricing quote proposal estimate building shell site work budget report loading docks parking spaces CECO Liverpool Union Collective",
    owner: "Estimating / vendor",
    status: "Waiting on pricing",
    tone: "watch",
  },
  {
    section: "waitingOnOthers",
    title: "Drawings, survey, or client design decisions pending",
    query:
      "waiting on drawings survey client feedback design approval door relocation lighting specs greenhouse civil surveyor project blocker",
    owner: "Project team / client",
    status: "Waiting on input",
    tone: "watch",
  },
  {
    section: "importantUpdates",
    title: "High-priority project or business issue",
    query:
      "high priority business issue material delay couplings safety upgrades Exotec Uniqlo GPC retainage check run payment risk urgent blocker",
    owner: "Project owner",
    status: "Monitor",
    tone: "watch",
  },
];

const FALLBACK_KEYWORDS = [
  "Brandon",
  "insurance",
  "license",
  "workers compensation",
  "COI",
  "permit",
  "wire",
  "Wilmer",
  "subcontractor",
  "pricing",
  "quote",
  "proposal",
  "drawing",
  "survey",
  "client feedback",
  "couplings",
  "retainage",
];

function compactText(value: unknown, maxLength = 720): string {
  return String(value ?? "")
    .replace(/[\n\r\t ]+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: Date | null): string {
  if (!value) return "Unknown date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function isWithinWindow(value: Date | null, cutoff: Date): boolean {
  return value !== null && value.getTime() >= cutoff.getTime();
}

function sourceDetail(hit: RankedHit): string {
  const title = hit.row.doc_title ?? hit.metadata?.title ?? hit.spec.title;
  return compactText(title, 90);
}

function projectLabel(hit: RankedHit): string {
  const projectId = hit.row.doc_project_id ?? hit.metadata?.project_id ?? null;
  const project = hit.metadata?.project ?? null;
  if (projectId && project) return `${projectId} ${project}`;
  if (projectId) return String(projectId);
  return project ?? "Company";
}

function summarizeHit(hit: RankedHit): string {
  const text = hit.text;
  if (!text) return "Matched recent RAG source, but no usable snippet was available.";
  return text.endsWith(".") ? text : `${text}.`;
}

function buildItem(hit: RankedHit): BrandonBriefItem {
  return {
    title: hit.spec.title,
    summary: summarizeHit(hit),
    source: hit.sourceGroup.label,
    sourceDetail: sourceDetail(hit),
    date: formatDate(hit.date),
    project: projectLabel(hit),
    owner: hit.spec.owner,
    status: hit.spec.status,
    tone: hit.spec.tone,
    retrieval: `RAG: search_document_chunks(${hit.sourceGroup.sourceTypes.join(", ")}), sim ${hit.similarity.toFixed(3)}`,
  };
}

function makeFallbackItem(row: DocumentMetaRow): BrandonBriefItem {
  const text = compactText(row.summary ?? row.overview ?? row.action_items, 520);
  const source = row.source_system ?? row.source ?? row.type ?? row.category ?? "document_metadata";
  return {
    title: row.title ?? "Recent metadata fallback",
    summary: text || "Recent metadata matched the Brandon daily update keywords.",
    source: source.includes("team") ? "Teams" : source.includes("fireflies") ? "Meeting" : source.includes("outlook") || source.includes("email") ? "Email" : "Document",
    sourceDetail: "document_metadata fallback",
    date: formatDate(parseDate(row.date ?? row.created_at ?? row.captured_at)),
    project: row.project_id ? `${row.project_id}${row.project ? ` ${row.project}` : ""}` : (row.project ?? "Company"),
    status: "Fallback review",
    tone: "neutral",
    retrieval: "Fallback: recent document_metadata keyword match",
  };
}

async function runChunkSearch(
  queryEmbedding: string,
  sourceGroup: SourceGroup,
): Promise<RagRow[]> {
  const supabase = createServiceClient() as unknown as RagRpcClient;
  const { data, error } = await supabase.rpc("search_document_chunks", {
    query_embedding: queryEmbedding,
    filter_source_types: sourceGroup.sourceTypes,
    filter_project_id: null,
    match_count: 10,
    match_threshold: 0.08,
  });

  if (error) {
    throw new Error(
      `search_document_chunks failed for ${sourceGroup.label}: ${error.message}`,
    );
  }

  return data ?? [];
}

async function loadMetadata(documentIds: string[]): Promise<Map<string, DocumentMetaRow>> {
  if (documentIds.length === 0) return new Map();
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("document_metadata")
    .select(
      "id,title,project,project_id,date,created_at,captured_at,source_system,source,type,category,summary,overview,action_items",
    )
    .in("id", documentIds);

  if (error) {
    throw new Error(`document_metadata lookup failed: ${error.message}`);
  }

  return new Map(((data ?? []) as DocumentMetaRow[]).map((row) => [row.id, row]));
}

async function loadFallbackMetadata(cutoff: Date, limit = 8): Promise<DocumentMetaRow[]> {
  const supabase = createServiceClient();
  const cutoffIso = cutoff.toISOString();
  const { data, error } = await supabase
    .from("document_metadata")
    .select(
      "id,title,project,project_id,date,created_at,captured_at,source_system,source,type,category,summary,overview,action_items",
    )
    .gte("created_at", cutoffIso)
    .or(FALLBACK_KEYWORDS.map((keyword) => `summary.ilike.%${keyword}%`).join(","))
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return [];
  }

  return (data ?? []) as DocumentMetaRow[];
}

function dedupeHits(hits: RankedHit[]): RankedHit[] {
  const byDocument = new Map<string, RankedHit>();
  for (const hit of hits) {
    const documentId = hit.row.document_id ?? hit.row.chunk_id ?? hit.text;
    const existing = byDocument.get(documentId);
    if (!existing || hit.similarity > existing.similarity) {
      byDocument.set(documentId, hit);
    }
  }
  return [...byDocument.values()].sort((a, b) => b.similarity - a.similarity);
}

function assignHitsToSections(
  hits: RankedHit[],
  fallbacks: BrandonBriefItem[],
): BrandonDailyUpdatePacket["sections"] {
  const sections: BrandonDailyUpdatePacket["sections"] = {
    needsBrandon: [],
    waitingOnOthers: [],
    importantUpdates: [],
  };

  for (const hit of hits) {
    const section = sections[hit.spec.section];
    if (section.length >= (hit.spec.section === "needsBrandon" ? 4 : 3)) {
      continue;
    }
    section.push(buildItem(hit));
  }

  for (const fallback of fallbacks) {
    if (sections.importantUpdates.length >= 3) break;
    sections.importantUpdates.push(fallback);
  }

  return sections;
}

function buildCoverage(hits: RankedHit[]): BrandonBriefSourceCoverage[] {
  return SOURCE_GROUPS.map((group) => {
    const groupHits = hits.filter((hit) => hit.sourceGroup.label === group.label);
    const latest = groupHits
      .map((hit) => hit.date)
      .filter((date): date is Date => date !== null)
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
    return {
      label: group.label,
      detail: group.detail,
      count: groupHits.length,
      latest: formatDate(latest),
    };
  });
}

export async function generateBrandonDailyUpdate(
  options: { windowDays?: number } = {},
): Promise<BrandonDailyUpdatePacket> {
  const windowDays = options.windowDays ?? 2;
  const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const openai = getOpenAI();

  const rawHits: Array<{
    spec: QuerySpec;
    sourceGroup: SourceGroup;
    row: RagRow;
  }> = [];

  for (const spec of QUERY_SPECS) {
    const queryEmbedding = await generateEmbedding(openai, spec.query, EMBEDDING.LARGE);
    for (const sourceGroup of SOURCE_GROUPS) {
      const rows = await runChunkSearch(queryEmbedding, sourceGroup);
      rawHits.push(...rows.map((row) => ({ spec, sourceGroup, row })));
    }
  }

  const documentIds = [
    ...new Set(rawHits.map((hit) => hit.row.document_id).filter(Boolean) as string[]),
  ];
  const metadata = await loadMetadata(documentIds);

  const rankedHits = rawHits
    .map((hit): RankedHit => {
      const meta = hit.row.document_id ? metadata.get(hit.row.document_id) : undefined;
      const date = parseDate(
        hit.row.doc_date ?? meta?.date ?? meta?.created_at ?? meta?.captured_at,
      );
      const text = compactText(
        hit.row.chunk_text ?? hit.row.text ?? meta?.summary ?? meta?.overview ?? meta?.action_items,
      );
      return {
        ...hit,
        metadata: meta,
        date,
        similarity: hit.row.similarity ?? 0,
        text,
      };
    })
    .filter((hit) => hit.text.length > 30)
    .filter((hit) => isWithinWindow(hit.date, cutoff))
    .filter((hit) => hit.similarity >= 0.25);

  const dedupedHits = dedupeHits(rankedHits);
  const fallbackRows = await loadFallbackMetadata(cutoff);
  const fallbackItems = fallbackRows.map(makeFallbackItem);

  return {
    generatedAt: new Date().toISOString(),
    windowDays,
    retrievalOrder: [
      "1. Recent email chunks",
      "2. Recent Teams chunks",
      "3. Recent meeting chunks",
      "4. Recent document_metadata fallback",
      "5. Older knowledge/insights only as secondary context",
    ],
    sections: assignHitsToSections(dedupedHits, fallbackItems),
    sourceCoverage: buildCoverage(dedupedHits),
    retrievalNotes: [
      "Primary retrieval uses source-filtered search_document_chunks so stale broad knowledge does not dominate.",
      "Items below the similarity/date threshold are excluded unless they appear in recent metadata fallback.",
      "search_all_knowledge is intentionally not the lead path for this daily update.",
    ],
  };
}
