"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import {
  Loader2,
  Upload,
} from "lucide-react";
import { PageShell } from "@/components/layout";
import { SectionRuleHeading } from "@/components/layout/spacing";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { appToast as toast } from "@/lib/toast/app-toast";
import { apiFetch } from "@/lib/api-client";
import { InfoAlert } from "@/components/ds/InfoAlert";

type MicrosoftProjectImportTask = {
  external_id: string;
  parent_external_id: string | null;
  name: string;
  wbs_code: string | null;
  start_date: string | null;
  finish_date: string | null;
  duration_days: number | null;
  percent_complete: number;
  status: "not_started" | "in_progress" | "complete";
  is_milestone: boolean;
  sort_order: number;
};

type ImportResult = {
  imported: number;
  deletedExisting?: number;
  failed: number;
  errors?: Array<{ index: number; name: string; error: string }>;
};

const SCHEDULE_IMPORT_FILE_LIMIT_BYTES = 50 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

function getText(parent: Element, tagName: string): string | null {
  return parent.getElementsByTagName(tagName)[0]?.textContent?.trim() || null;
}

function parseProjectDate(value: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function parseProjectDuration(value: string | null): number | null {
  if (!value) return null;

  const dayMatch = value.match(/P(?:(\d+)D)?/);
  const hourMatch = value.match(/T(?:(\d+)H)?(?:(\d+)M)?/);
  const days = dayMatch?.[1] ? Number.parseInt(dayMatch[1], 10) : 0;
  const hours = hourMatch?.[1] ? Number.parseInt(hourMatch[1], 10) : 0;
  const minutes = hourMatch?.[2] ? Number.parseInt(hourMatch[2], 10) : 0;
  const totalDays = days + Math.ceil((hours + minutes / 60) / 8);

  return Number.isFinite(totalDays) ? totalDays : null;
}

function parsePercentComplete(value: string | null): number {
  if (!value) return 0;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(100, Math.max(0, parsed));
}

function isProjectTruthy(value: string | null): boolean {
  return value === "1" || value?.toLowerCase() === "true";
}

function parentOutline(outline: string | null): string | null {
  if (!outline || !outline.includes(".")) return null;
  return outline.split(".").slice(0, -1).join(".");
}

function looksLikePdfToken(name: string): boolean {
  const s = name.trim();
  if (/^\/[A-Za-z]/.test(s)) return true;
  if (/^-?\d+\.?\d*$/.test(s)) return true;
  if (s.includes("<<") || s.includes(">>")) return true;
  return false;
}

function parseMicrosoftProjectXml(xml: string): MicrosoftProjectImportTask[] {
  if (xml.trimStart().startsWith("%PDF")) {
    throw new Error("This file is a PDF. Upload a Microsoft Project .mpp, .mpt, or XML file.");
  }

  const document = new DOMParser().parseFromString(xml, "application/xml");
  const parserError = document.getElementsByTagName("parsererror")[0];

  if (parserError) {
    throw new Error("This file is not valid Microsoft Project XML.");
  }

  const tasks = Array.from(document.getElementsByTagName("Task"));
  const outlineToExternalId = new Map<string, string>();
  const parsedTasks = tasks
    .map((task, index) => {
      const name = getText(task, "Name");
      const active = getText(task, "Active");

      if (!name || active === "0" || looksLikePdfToken(name)) return null;

      const uid = getText(task, "UID") || getText(task, "ID") || String(index + 1);
      const outline = getText(task, "OutlineNumber");
      const externalId = outline || uid;

      if (outline) {
        outlineToExternalId.set(outline, externalId);
      }

      const percentComplete = parsePercentComplete(getText(task, "PercentComplete"));
      const isMilestone = isProjectTruthy(getText(task, "Milestone"));
      const durationDays = isMilestone ? 0 : parseProjectDuration(getText(task, "Duration"));

      return {
        external_id: externalId,
        parent_external_id: null,
        name,
        wbs_code: outline,
        start_date: parseProjectDate(getText(task, "Start")),
        finish_date: parseProjectDate(getText(task, "Finish")),
        duration_days: durationDays,
        percent_complete: percentComplete,
        status:
          percentComplete >= 100
            ? "complete"
            : percentComplete > 0
              ? "in_progress"
              : "not_started",
        is_milestone: isMilestone,
        sort_order: index + 1,
      } satisfies MicrosoftProjectImportTask;
    })
    .filter((task): task is NonNullable<typeof task> => task !== null);

  return parsedTasks.map((task) => ({
    ...task,
    parent_external_id:
      outlineToExternalId.get(parentOutline(task.wbs_code) ?? "") ?? null,
  })) as MicrosoftProjectImportTask[];
}

export default function MicrosoftProjectScheduleImportPage() {
  const params = useParams()!;
  const projectId = params.projectId as string;
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [tasks, setTasks] = React.useState<MicrosoftProjectImportTask[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [isConverting, setIsConverting] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const [existingTaskCount, setExistingTaskCount] = React.useState(0);
  const [replaceExisting, setReplaceExisting] = React.useState(true);
  const [result, setResult] = React.useState<ImportResult | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const refreshExistingTaskCount = React.useCallback(async () => {
    const payload = await apiFetch<{ pagination?: { total_records?: number } }>(
      `/api/projects/${projectId}/scheduling/tasks?limit=1`,
    );
    setExistingTaskCount(payload.pagination?.total_records ?? 0);
  }, [projectId]);

  React.useEffect(() => {
    refreshExistingTaskCount().catch((err) => {
      setError(err instanceof Error ? err.message : "Unable to check the current schedule.");
    });
  }, [refreshExistingTaskCount]);

  const convertMicrosoftProjectFile = React.useCallback(
    async (file: File) => {
      setIsConverting(true);
      try {
        if (file.size > SCHEDULE_IMPORT_FILE_LIMIT_BYTES) {
          throw new Error(
            `Schedule files must be smaller than ${formatFileSize(SCHEDULE_IMPORT_FILE_LIMIT_BYTES)}.`,
          );
        }

        const formData = new FormData();
        formData.append("file", file);

        const { convertUrl } = await apiFetch<{ convertUrl: string }>(
          `/api/projects/${projectId}/scheduling/tasks/convert-token`,
          { method: "POST" },
        );

        const response = await fetch(convertUrl, {
          method: "POST",
          body: formData,
        });

        const payload = await response.json().catch(() => ({})) as {
          tasks?: MicrosoftProjectImportTask[];
          detail?: string;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(
            payload.detail ||
              payload.error ||
              `Microsoft Project conversion failed (HTTP ${response.status}).`,
          );
        }

        const convertedTasks = (payload?.tasks ?? []) as MicrosoftProjectImportTask[];
        if (!Array.isArray(convertedTasks) || convertedTasks.length === 0) {
          throw new Error("No active Microsoft Project tasks were found in this file.");
        }

        setTasks(convertedTasks);
      } finally {
        setIsConverting(false);
      }
    },
    [projectId],
  );

  const handleFileSelect = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      setError(null);
      setResult(null);
      setTasks([]);
      setFileName(file?.name ?? null);

      if (!file) return;

      const lowerFileName = file.name.toLowerCase();
      const isXml = lowerFileName.endsWith(".xml");
      const isNativeProjectFile = lowerFileName.endsWith(".mpp") || lowerFileName.endsWith(".mpt");

      if (!isXml && !isNativeProjectFile) {
        setError("Upload a Microsoft Project .mpp, .mpt, or XML file.");
        return;
      }

      try {
        if (isNativeProjectFile) {
          await convertMicrosoftProjectFile(file);
          return;
        }

        const content = await file.text();
        const parsedTasks = parseMicrosoftProjectXml(content);

        if (parsedTasks.length === 0) {
          setError("No active Microsoft Project tasks were found in this file.");
          return;
        }

        setTasks(parsedTasks);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to parse Microsoft Project file.");
      }
    },
    [convertMicrosoftProjectFile],
  );

  const handleImport = React.useCallback(async () => {
    if (tasks.length === 0) {
      setError("Select a Microsoft Project file before importing.");
      return;
    }

    if (existingTaskCount > 0 && !replaceExisting) {
      setError("This project already has schedule tasks. Choose replace before importing this Microsoft Project file.");
      return;
    }

    setIsImporting(true);
    setError(null);
    setResult(null);

    try {
      const payload = await apiFetch<{ imported: number; failed: number }>(
        `/api/projects/${projectId}/scheduling/tasks/import`,
        { method: "POST", body: JSON.stringify({ tasks, replaceExisting }) },
      );

      setResult(payload);
      toast.success(`Imported ${payload?.imported ?? 0} Microsoft Project tasks`);
      setTasks([]);
      setFileName(null);
      await refreshExistingTaskCount();
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Microsoft Project import failed.");
    } finally {
      setIsImporting(false);
    }
  }, [existingTaskCount, projectId, refreshExistingTaskCount, replaceExisting, tasks]);

  const previewTasks = tasks.slice(0, 8);

  return (
    <PageShell
      variant="detail"
      title="Microsoft Project Import"
      description="Import schedule tasks from a native Microsoft Project file or XML export while the internal scheduler remains available separately."
      actions={undefined}
    >
      <section className="space-y-4">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="space-y-2">
            <Label htmlFor="microsoft-project-file">Microsoft Project file</Label>
            <Input
              ref={fileInputRef}
              id="microsoft-project-file"
              type="file"
              accept=".mpp,.mpt,.xml,application/vnd.ms-project,text/xml,application/xml"
              onChange={handleFileSelect}
              className="min-h-11"
            />
          </div>
          <Button
            type="button"
            onClick={handleImport}
            disabled={isConverting || isImporting || tasks.length === 0}
            className="min-h-11"
          >
            {isConverting || isImporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {isConverting ? "Converting..." : "Import Tasks"}
          </Button>
        </div>
        {existingTaskCount > 0 && (
          <InfoAlert
            variant="warning"
            icon={
              <Checkbox
                id="replace-existing-schedule"
                checked={replaceExisting}
                onCheckedChange={(checked) => setReplaceExisting(checked === true)}
                className="mt-0.5"
              />
            }
          >
            <div className="space-y-1">
              <Label htmlFor="replace-existing-schedule" className="font-medium">
                Replace current schedule
              </Label>
              <p>
                This project already has {existingTaskCount} schedule tasks. Importing a Microsoft Project file will replace them instead of appending duplicates.
              </p>
            </div>
          </InfoAlert>
        )}
      </section>

      {error && (
        <InfoAlert variant="error">{error}</InfoAlert>
      )}

      {result && (
        <InfoAlert variant="success">
          {result.deletedExisting ? `Replaced ${result.deletedExisting} existing tasks and imported ${result.imported} tasks` : `Imported ${result.imported} tasks`}
          {result.failed > 0 ? `; ${result.failed} failed.` : "."}
        </InfoAlert>
      )}

      {tasks.length > 0 && (
        <section className="space-y-4">
          <div>
            <SectionRuleHeading label="Import Preview" className="mb-1 pb-0" />
            <p className="text-sm text-muted-foreground">
              {fileName} - {tasks.length} tasks ready
            </p>
          </div>

          <div className="overflow-hidden rounded-md border">
            <div className="grid grid-cols-[minmax(10rem,1fr)_7rem_7rem_5rem] gap-3 bg-muted/50 px-4 py-2 text-xs font-medium uppercase text-muted-foreground max-sm:hidden">
              <span>Task</span>
              <span>Start</span>
              <span>Finish</span>
              <span className="text-right">Done</span>
            </div>
            <div className="divide-y">
              {previewTasks.map((task) => (
                <div
                  key={task.external_id}
                  className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[minmax(10rem,1fr)_7rem_7rem_5rem] sm:gap-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{task.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {task.wbs_code ?? "No WBS"}
                      {task.parent_external_id ? " / nested task" : ""}
                    </p>
                  </div>
                  <span className="text-muted-foreground">{task.start_date ?? "-"}</span>
                  <span className="text-muted-foreground">{task.finish_date ?? "-"}</span>
                  <span className="text-right text-muted-foreground max-sm:text-left">
                    {task.percent_complete}%
                  </span>
                </div>
              ))}
              {tasks.length > previewTasks.length && (
                <div className="px-4 py-3 text-sm text-muted-foreground">
                  {tasks.length - previewTasks.length} more tasks will be imported.
                </div>
              )}
            </div>
          </div>
        </section>
      )}
      {isConverting && (
        <section className="space-y-2">
          <SectionRuleHeading label="Import Preview" className="mb-1 pb-0" />
          <p className="text-sm text-muted-foreground">
            {fileName} - converting Microsoft Project file.
          </p>
        </section>
      )}
    </PageShell>
  );
}
