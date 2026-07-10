// Builds the serializable view-model for the Daily Executive Brief from the real
// executive-brief packet — the same deep-read data that powers /executive.
//
// This replaces the old HTML-string builder (build-brief.ts). It produces plain
// data that a server component can hand to the client `<DailyBriefView>`, so the
// brief can be real, interactive React (hover menus, resolve, feedback, task
// CRUD) instead of `dangerouslySetInnerHTML`.
//
// Every item carries its resolved source chips (each linking to the real file)
// and, when its source is a `document_metadata` row, the id needed to anchor a
// created task.

import type {
  BrandonBriefItem,
  BrandonDailyUpdatePacket,
  ExecutiveOperatingBrief,
} from "@/lib/executive/brandon-daily-update";
import {
  citationLabel,
  cleanProse,
  dedupeCitations,
  fmtLongDate,
  fmtShortDate,
  fmtWeekday,
  itemKey,
  realAction,
  realWhy,
  resolveHref,
  resolveSourceDocumentId,
  severity,
  truncate,
  type BriefSeverity,
} from "./brief-format";

// ── view-model types ──────────────────────────────────────────────────────────

export type BriefSourceChip = {
  /** Compact chip label, e.g. "Meeting · Jul 8". */
  label: string;
  href: string | null;
  external: boolean;
  /** Source kind for the chip's leading glyph. */
  kind: string;
};

export type BriefItemVM = {
  /** Stable, position-independent key — the feedback subject id + resolve key. */
  key: string;
  title: string;
  summary: string;
  owner: string | null;
  status: string | null;
  tone: BriefSeverity;
  project: string | null;
  projectId: number | null;
  recommendedAction: string | null;
  sources: BriefSourceChip[];
  /** `document_metadata` id to anchor a created task to, when the source is one. */
  sourceDocId: string | null;
  /** True when this item was open yesterday and is still open today. */
  carried: boolean;
};

export type BriefActionVM = BriefItemVM & {
  /** Owner-facing due/status label for team rows (e.g. "Due Jul 14", "OVERDUE"). */
  due: string | null;
};

export type BriefProjectVM = {
  key: string;
  label: string;
  projectId: number | null;
  /** Eyebrow status label, e.g. "Needs your decision", "At risk", "Watch". */
  statusLabel: string;
  tone: BriefSeverity;
  oneLine: string;
  hasDecision: boolean;
  items: BriefItemVM[];
};

export type BriefAlsoMovingVM = {
  key: string;
  label: string;
  projectId: number | null;
  oneLine: string;
};

export type BriefResolvedVM = {
  key: string;
  title: string;
  project: string | null;
  summary: string;
};

export type DailyBriefModel = {
  masthead: {
    eyebrow: string;
    /** The hero headline — the edition date, e.g. "Thursday, July 9, 2026". */
    dateLabel: string;
    preparedFor: string;
    decisionsCount: number;
    projectsCount: number;
    coverage: {
      meetings: number;
      emails: number;
      teams: number;
      docs: number;
      total: number;
    };
    generatedLabel: string;
  };
  read: { thesis: string };
  decisions: BriefItemVM[];
  projects: BriefProjectVM[];
  alsoMoving: BriefAlsoMovingVM[];
  yourActions: BriefActionVM[];
  teamActions: BriefActionVM[];
  /** Keys already resolved today (from the feedback loop) — the client moves
   *  these into "Resolved today" and hides them from the active sections. */
  resolvedKeys: string[];
  /** Snapshots for resolved keys whose item isn't present in today's sections. */
  resolvedSeed: BriefResolvedVM[];
};

/** A real task created by the daily deep read — the operating record shared by
 *  /tasks and /daily-brief. When these are supplied, the brief's action lists
 *  are driven by them instead of re-derived from the review-gated candidates. */
export type DailyBriefTaskInput = {
  id: string;
  title: string;
  /** "brandon" → Brandon's own list; "team" → delegated work. */
  category: "brandon" | "team";
  assigneeName: string | null;
  projectName: string | null;
  projectId: number | null;
  priority: string | null;
  /** Owner-facing due label already formatted (e.g. "Due Jul 14"), or null. */
  due: string | null;
};

export type BuildBriefModelInput = {
  packet: BrandonDailyUpdatePacket;
  operatingBrief: ExecutiveOperatingBrief;
  /** Item keys that were open yesterday and are still open today. */
  carriedKeys?: Set<string>;
  /** Item keys already resolved today (from the feedback loop) — moved to Resolved. */
  resolvedKeys?: Set<string>;
  /** Snapshot for resolved items so the Resolved list renders without the item. */
  resolvedSeed?: BriefResolvedVM[];
  /** The owner the brief is prepared for — used to split "your" vs "team" work. */
  preparedFor?: string;
  /** Real deep-read tasks. When present, they own the action lists. */
  tasks?: DailyBriefTaskInput[];
};

/** Map a deep-read task row to the brief's action view model. */
function deepReadTaskToActionVM(task: DailyBriefTaskInput): BriefActionVM {
  return {
    key: `deepread-task:${task.id}`,
    title: cleanProse(task.title) || task.title,
    summary: "",
    owner: task.assigneeName,
    status: null,
    tone: task.priority === "high" ? "amber" : "info",
    project: task.projectName,
    projectId: task.projectId,
    recommendedAction: null,
    sources:
      task.projectId != null
        ? [
            {
              label: truncate(task.projectName || `Project ${task.projectId}`, 44),
              href: `/${task.projectId}`,
              external: false,
              kind: "Project",
            },
          ]
        : [],
    sourceDocId: null,
    carried: false,
    due: task.due,
  };
}

// ── helpers ─────────────────────────────────────────────────────────────────

function coverageCounts(packet: BrandonDailyUpdatePacket) {
  const counts = { Meeting: 0, Email: 0, Teams: 0, Document: 0 };
  for (const entry of packet.sourceCoverage ?? []) {
    if (entry.label in counts) {
      counts[entry.label as keyof typeof counts] += entry.count ?? 0;
    }
  }
  const total = (packet.sourceCoverage ?? []).reduce(
    (sum, entry) => sum + (entry.count ?? 0),
    0,
  );
  return {
    meetings: counts.Meeting,
    emails: counts.Email,
    teams: counts.Teams,
    docs: counts.Document,
    total,
  };
}

function itemSources(item: BrandonBriefItem, max = 3): BriefSourceChip[] {
  const citations = dedupeCitations(
    item.citations?.length
      ? item.citations
      : [
          {
            source: item.source,
            sourceDetail: item.sourceDetail,
            sourceUrl: item.sourceUrl,
            sourceId: item.sourceId,
            date: item.date,
          },
        ],
  ).slice(0, max);
  return citations.map((citation) => {
    const href = resolveHref(citation, item.projectInternalId);
    return {
      label: truncate(citationLabel(citation), 44),
      href,
      external: href ? /^https?:\/\//i.test(href) : false,
      kind: String(citation.source || "Source"),
    } satisfies BriefSourceChip;
  });
}

function toItemVM(
  item: BrandonBriefItem,
  carriedKeys: Set<string>,
): BriefItemVM {
  const key = itemKey(item);
  return {
    key,
    title: cleanProse(item.title) || item.title,
    summary: truncate(cleanProse(item.summary || realWhy(item.whyItMatters)), 320),
    owner: item.owner || null,
    status: item.status || null,
    tone: severity(item.tone ?? item.status),
    project: item.project || null,
    projectId: item.projectInternalId ?? null,
    recommendedAction: realAction(item.recommendedAction) || null,
    sources: itemSources(item),
    sourceDocId: resolveSourceDocumentId(item),
    carried: carriedKeys.has(key),
  };
}

/** Keep the first VM for each key — the same source item can surface in more
 *  than one packet section. */
function dedupeByKey<T extends { key: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    if (seen.has(item.key)) continue;
    seen.add(item.key);
    out.push(item);
  }
  return out;
}

function isOwnedByPreparedFor(
  owner: string | null | undefined,
  preparedFor: string,
): boolean {
  const value = (owner || "").trim().toLowerCase();
  if (!value) return true; // unassigned owner-facing work defaults to "yours"
  return value.includes(preparedFor.trim().toLowerCase());
}

// ── builder ─────────────────────────────────────────────────────────────────

export function buildBriefModel(input: BuildBriefModelInput): DailyBriefModel {
  const {
    packet,
    operatingBrief,
    carriedKeys = new Set<string>(),
    resolvedKeys = new Set<string>(),
    resolvedSeed = [],
    preparedFor = "Brandon",
  } = input;

  // ── Decisions ("Needs you today") ──────────────────────────────────────────
  const decisions = dedupeByKey(
    packet.sections.needsBrandon.map((item) => toItemVM(item, carriedKeys)),
  );

  // ── By-project grouping ─────────────────────────────────────────────────────
  type Group = {
    label: string;
    projectId: number | null;
    items: BrandonBriefItem[];
    seen: Set<string>;
    hasDecision: boolean;
  };
  const groups = new Map<string, Group>();
  const decisionGroupKeys = new Set(
    packet.sections.needsBrandon.map((item) =>
      String(
        item.projectInternalId ??
          (item.project || "Internal / cross-project").trim().toLowerCase(),
      ),
    ),
  );
  const all = [
    ...packet.sections.needsBrandon,
    ...packet.sections.waitingOnOthers,
    ...packet.sections.importantUpdates,
  ];
  for (const item of all) {
    const label = (item.project || "Internal / cross-project").trim();
    const key = String(item.projectInternalId ?? label.toLowerCase());
    const ik = itemKey(item);
    const existing = groups.get(key);
    if (existing) {
      // The same item can appear in more than one packet section — only show it
      // once per project.
      if (existing.seen.has(ik)) continue;
      existing.seen.add(ik);
      existing.items.push(item);
    } else {
      groups.set(key, {
        label,
        projectId: item.projectInternalId ?? null,
        items: [item],
        seen: new Set([ik]),
        hasDecision: decisionGroupKeys.has(key),
      });
    }
  }

  const groupTone = (items: BrandonBriefItem[]): BriefSeverity =>
    items.reduce<BriefSeverity>((acc, item) => {
      const sev = severity(item.tone ?? item.status);
      if (acc === "crit" || sev === "crit") return "crit";
      if (acc === "amber" || sev === "amber") return "amber";
      return acc;
    }, "info");

  const ordered = Array.from(groups.entries()).sort((a, b) => {
    const aHot = a[1].hasDecision ? 1 : 0;
    const bHot = b[1].hasDecision ? 1 : 0;
    if (aHot !== bHot) return bHot - aHot;
    return b[1].items.length - a[1].items.length;
  });

  const projects: BriefProjectVM[] = [];
  const alsoMoving: BriefAlsoMovingVM[] = [];
  for (const [key, group] of ordered) {
    const tone = groupTone(group.items);
    const oneLine = truncate(
      cleanProse(group.items[0].summary) || group.items[0].title,
      140,
    );
    // "Needs attention" = a decision is open OR something is crit/amber.
    // Everything else is on-track momentum → the collapsed "Also moving" list.
    const needsAttention = group.hasDecision || tone !== "info";
    if (needsAttention) {
      const statusLabel = group.hasDecision
        ? "Needs your decision"
        : tone === "crit"
          ? "At risk"
          : "Watch";
      projects.push({
        key,
        label: group.label,
        projectId: group.projectId,
        statusLabel,
        tone,
        oneLine,
        hasDecision: group.hasDecision,
        items: group.items.map((item) => toItemVM(item, carriedKeys)),
      });
    } else {
      alsoMoving.push({
        key,
        label: group.label,
        projectId: group.projectId,
        oneLine,
      });
    }
  }

  // ── Action items (your vs team) ─────────────────────────────────────────────
  // Team = work owned by others (waitingOnOthers). Yours = the concrete next
  // moves that fall to the owner: decision recommended-actions + cash/schedule
  // watch next-actions with no other owner.
  const seenAction = new Set<string>();
  const yourActions: BriefActionVM[] = [];
  const pushYour = (item: BrandonBriefItem, text: string | null) => {
    const clean = cleanProse(text);
    if (!clean) return;
    const dedupe = clean.toLowerCase();
    if (seenAction.has(dedupe)) return;
    if (!isOwnedByPreparedFor(item.owner, preparedFor)) return;
    seenAction.add(dedupe);
    const vm = toItemVM(item, carriedKeys);
    yourActions.push({ ...vm, title: clean, summary: "", due: null });
  };
  for (const item of packet.sections.needsBrandon) {
    pushYour(item, realAction(item.recommendedAction));
  }
  for (const risk of operatingBrief.cashAndMarginWatch) {
    pushYour(risk.item, realAction(risk.nextAction));
  }
  for (const risk of operatingBrief.projectRiskRadar) {
    pushYour(risk.item, realAction(risk.nextAction));
  }

  const teamActions: BriefActionVM[] = dedupeByKey(
    packet.sections.waitingOnOthers.map((item) => {
      const vm = toItemVM(item, carriedKeys);
      const dueRaw = (item.status || "").trim();
      return {
        ...vm,
        title: vm.title,
        summary: truncate(cleanProse(item.summary), 200),
        due: dueRaw || null,
      };
    }),
  );

  const coverage = coverageCounts(packet);

  // When the deep read has created real tasks, they own the action lists — one
  // operating record shared with /tasks — instead of the review-gated derivation
  // above (kept as the fallback for packets processed before this pipeline).
  const deepReadTasks = input.tasks ?? [];
  const useDeepReadTasks = deepReadTasks.length > 0;
  const deepReadYour = deepReadTasks
    .filter((task) => task.category === "brandon")
    .map(deepReadTaskToActionVM);
  const deepReadTeam = deepReadTasks
    .filter((task) => task.category === "team")
    .map(deepReadTaskToActionVM);

  return {
    masthead: {
      eyebrow: "Alleato Group · The Morning Brief",
      dateLabel: mastheadDate(packet.generatedAt),
      preparedFor,
      decisionsCount: decisions.length,
      projectsCount: groups.size,
      coverage,
      generatedLabel: fmtShortDate(packet.generatedAt),
    },
    read: {
      thesis: operatingBrief.startHere.length
        ? operatingBrief.startHere.map((line) => cleanProse(line)).join(" ")
        : "Today's operating picture across the active portfolio, traced to source.",
    },
    decisions,
    projects,
    alsoMoving,
    yourActions: (useDeepReadTasks ? deepReadYour : yourActions).slice(0, 12),
    teamActions: (useDeepReadTasks ? deepReadTeam : teamActions).slice(0, 20),
    resolvedKeys: Array.from(resolvedKeys),
    resolvedSeed,
  };
}

/** "Thursday, July 9, 2026" — the masthead date. */
function mastheadDate(value: string | null | undefined): string {
  const weekday = fmtWeekday(value);
  const long = fmtLongDate(value);
  return weekday && long ? `${weekday}, ${long}` : long || weekday;
}
