import type { TaskStatus } from "@/types/scheduling";

export type ScheduleImportConfidence = "high" | "review_required";
export type ScheduleImportSourceFormat = "mpp" | "mpt" | "xml" | "xlsx" | "csv" | "pdf";

export type ScheduleImportTask = {
  external_id: string;
  parent_external_id: string | null;
  predecessor_external_ids?: string[];
  name: string;
  wbs_code: string | null;
  start_date: string | null;
  finish_date: string | null;
  duration_days: number | null;
  percent_complete: number;
  status: TaskStatus;
  is_milestone: boolean;
  sort_order: number;
};

export type ScheduleImportPreview = {
  tasks: ScheduleImportTask[];
  source_format: ScheduleImportSourceFormat;
  confidence: ScheduleImportConfidence;
  task_count: number;
  warnings: string[];
};

type TabularRow = Record<string, unknown>;

const HEADER_ALIASES: Record<string, keyof ScheduleImportTask | "predecessors"> = {
  activity: "name",
  "activity id": "external_id",
  "activity name": "name",
  "actual finish": "finish_date",
  "actual start": "start_date",
  complete: "percent_complete",
  "duration days": "duration_days",
  "end date": "finish_date",
  finish: "finish_date",
  "finish date": "finish_date",
  id: "external_id",
  milestone: "is_milestone",
  name: "name",
  "outline number": "wbs_code",
  "percent complete": "percent_complete",
  predecessor: "predecessors",
  predecessors: "predecessors",
  progress: "percent_complete",
  "start date": "start_date",
  start: "start_date",
  "task id": "external_id",
  "task name": "name",
  title: "name",
  wbs: "wbs_code",
  "wbs code": "wbs_code",
  "% complete": "percent_complete",
};

const LOW_VALUE_ROW_PATTERNS = [
  /^task\s*name$/i,
  /^name$/i,
  /^page\s+\d+/i,
  /^print(ed)?\s+/i,
  /^project\s*:/i,
  /^schedule\s*$/i,
  /^start\s+finish/i,
];

function cleanText(value: unknown): string {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeHeader(value: string): string {
  return value
    .replace(/[%()]/g, " ")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const cleaned = cleanText(value).replace(/[%,$]/g, "");
  if (!cleaned) return null;
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  const normalized = cleanText(value).toLowerCase();
  return ["1", "true", "yes", "y", "milestone"].includes(normalized);
}

function parseImportDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    return new Date(excelEpoch + value * 86_400_000).toISOString().slice(0, 10);
  }

  const text = cleanText(value);
  if (!text) return null;

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  const numericDate = text.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
  if (!numericDate) return null;

  const month = Number.parseInt(numericDate[1] ?? "", 10);
  const day = Number.parseInt(numericDate[2] ?? "", 10);
  let year = Number.parseInt(numericDate[3] ?? "", 10);
  if (year < 100) year += year >= 70 ? 1900 : 2000;

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function statusFromPercent(percentComplete: number): TaskStatus {
  if (percentComplete >= 100) return "complete";
  if (percentComplete > 0) return "in_progress";
  return "not_started";
}

function parentOutline(outline: string | null): string | null {
  if (!outline || !outline.includes(".")) return null;
  return outline.split(".").slice(0, -1).join(".");
}

function normalizePredecessors(value: unknown): string[] {
  const text = cleanText(value);
  if (!text) return [];
  return text
    .split(/[;,]/)
    .flatMap((part) => part.split(/\s+/))
    .map((part) => part.replace(/[A-Za-z]+$/g, "").trim())
    .filter(Boolean);
}

function isLowValueName(name: string): boolean {
  if (name.length < 3) return true;
  return LOW_VALUE_ROW_PATTERNS.some((pattern) => pattern.test(name));
}

export function normalizeScheduleRows(
  rows: TabularRow[],
  sourceFormat: "xlsx" | "csv",
): ScheduleImportPreview {
  const warnings: string[] = [];
  const tasks: ScheduleImportTask[] = [];
  const outlineToExternalId = new Map<string, string>();

  rows.forEach((row, index) => {
    const normalized: Record<string, unknown> = {};
    Object.entries(row).forEach(([header, value]) => {
      const alias = HEADER_ALIASES[normalizeHeader(header)];
      if (alias) normalized[alias] = value;
    });

    const name = cleanText(normalized.name);
    if (!name || isLowValueName(name)) return;

    const wbsCode = cleanText(normalized.wbs_code) || null;
    const externalId = cleanText(normalized.external_id) || wbsCode || String(index + 1);
    const percentComplete = Math.min(100, Math.max(0, Math.round(parseNumber(normalized.percent_complete) ?? 0)));
    const isMilestone = parseBoolean(normalized.is_milestone);
    const durationDays = isMilestone ? 0 : Math.round(parseNumber(normalized.duration_days) ?? 0) || null;

    if (wbsCode) outlineToExternalId.set(wbsCode, externalId);

    tasks.push({
      external_id: externalId,
      parent_external_id: null,
      predecessor_external_ids: normalizePredecessors(normalized.predecessors),
      name,
      wbs_code: wbsCode,
      start_date: parseImportDate(normalized.start_date),
      finish_date: parseImportDate(normalized.finish_date),
      duration_days: durationDays,
      percent_complete: percentComplete,
      status: statusFromPercent(percentComplete),
      is_milestone: isMilestone,
      sort_order: tasks.length + 1,
    });
  });

  const mappedTasks = tasks.map((task) => ({
    ...task,
    parent_external_id: outlineToExternalId.get(parentOutline(task.wbs_code) ?? "") ?? null,
  }));

  if (mappedTasks.length === 0) {
    throw new Error("No schedule tasks were found. Include a Task Name or Activity Name column and try again.");
  }

  if (mappedTasks.every((task) => !task.start_date && !task.finish_date)) {
    warnings.push("No start or finish dates were mapped. Review the source columns before importing.");
  }

  return {
    tasks: mappedTasks,
    source_format: sourceFormat,
    confidence: "high",
    task_count: mappedTasks.length,
    warnings,
  };
}

function extractDatesFromLine(line: string): string[] {
  const matches = [
    ...line.matchAll(/\b\d{4}-\d{1,2}-\d{1,2}\b/g),
    ...line.matchAll(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g),
    ...line.matchAll(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{2,4}\b/gi),
  ];

  return matches
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map((match) => match[0]);
}

function cleanPdfTaskName(line: string, firstDate: string): { name: string; wbsCode: string | null } {
  const beforeDate = line.slice(0, line.indexOf(firstDate)).trim();
  const withoutLeadingIndex = beforeDate.replace(/^\d+\s+/, "").trim();
  const wbsMatch = withoutLeadingIndex.match(/^(\d+(?:\.\d+)*)\s+(.+)$/);
  if (wbsMatch) {
    return { wbsCode: wbsMatch[1] ?? null, name: cleanText(wbsMatch[2]) };
  }
  return { wbsCode: null, name: cleanText(withoutLeadingIndex) };
}

export function normalizePdfScheduleText(text: string): ScheduleImportPreview {
  const warnings = [
    "PDF extraction is best effort. Review task names, dates, hierarchy, and dependencies before importing.",
  ];
  const tasks: ScheduleImportTask[] = [];
  const outlineToExternalId = new Map<string, string>();

  const lines = text
    .split(/\r?\n/)
    .map((line) => cleanText(line))
    .filter(Boolean);

  lines.forEach((line) => {
    const dates = extractDatesFromLine(line);
    if (dates.length < 2) return;

    const { name, wbsCode } = cleanPdfTaskName(line, dates[0] ?? "");
    if (!name || isLowValueName(name)) return;

    const externalId = wbsCode || String(tasks.length + 1);
    if (wbsCode) outlineToExternalId.set(wbsCode, externalId);

    tasks.push({
      external_id: externalId,
      parent_external_id: null,
      predecessor_external_ids: [],
      name,
      wbs_code: wbsCode,
      start_date: parseImportDate(dates[0]),
      finish_date: parseImportDate(dates[1]),
      duration_days: null,
      percent_complete: 0,
      status: "not_started",
      is_milestone: false,
      sort_order: tasks.length + 1,
    });
  });

  const mappedTasks = tasks.map((task) => ({
    ...task,
    parent_external_id: outlineToExternalId.get(parentOutline(task.wbs_code) ?? "") ?? null,
  }));

  if (mappedTasks.length === 0) {
    throw new Error(
      "No importable schedule rows were found in this PDF. Upload MPP, XML, Excel, or CSV for a reliable import, or export the PDF with visible task names plus start and finish dates.",
    );
  }

  return {
    tasks: mappedTasks,
    source_format: "pdf",
    confidence: "review_required",
    task_count: mappedTasks.length,
    warnings,
  };
}
