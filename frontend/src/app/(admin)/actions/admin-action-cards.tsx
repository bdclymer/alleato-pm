"use client";

import * as React from "react";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Database,
  FlaskConical,
  Bug,
  Zap,
  Brain,
  Flag,
  FileText,
  ClipboardList,
} from "lucide-react";

// ── Status badge ──────────────────────────────────────────────────────────────

type ActionStatus = "idle" | "running" | "success" | "error";

function StatusBadge({ status, message }: { status: ActionStatus; message?: string }) {
  if (status === "idle") return null;
  return (
    <div
      className={cn(
        "flex items-start gap-1.5 rounded-md px-2.5 py-2 text-xs",
        status === "running" && "bg-muted text-muted-foreground",
        status === "success" && "bg-status-success/10 text-status-success",
        status === "error" && "bg-destructive/10 text-destructive",
      )}
    >
      {status === "running" && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin mt-0.5" />}
      {status === "success" && <CheckCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
      {status === "error" && <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
      <span className="leading-snug">{message ?? (status === "running" ? "Running…" : status === "success" ? "Done" : "Failed")}</span>
    </div>
  );
}

// ── Generic action card shell ─────────────────────────────────────────────────

function ActionCard({
  title,
  badge,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  badge?: string;
  description: string;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4 rounded-xl bg-muted/20 p-5">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {badge && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

// ── 1. Accounting sync ────────────────────────────────────────────────────────

function AccountingSyncCard() {
  const [status, setStatus] = React.useState<ActionStatus>("idle");
  const [message, setMessage] = React.useState("");
  const [mode, setMode] = React.useState<"incremental" | "full">("incremental");

  const run = async () => {
    setStatus("running");
    setMessage("Syncing Acumatica → Supabase…");
    try {
      const secret = process.env.NEXT_PUBLIC_ACCOUNTING_SYNC_SECRET ?? "";
      const res = await fetch("/api/accounting/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({ mode }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) throw new Error((data.error as string) ?? res.statusText);
      setStatus("success");
      setMessage(typeof data.message === "string" ? data.message : "Sync complete.");
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Sync failed.");
    }
  };

  return (
    <ActionCard
      title="Acumatica Sync"
      badge="Accounting"
      icon={Database}
      description="Pull the latest data from Acumatica into Supabase. Runs automatically twice daily (6am + 6pm ET)."
    >
      <div className="flex items-center gap-2">
        <Select
          value={mode}
          onValueChange={(value: "incremental" | "full") => setMode(value)}
        >
          <SelectTrigger size="sm" className="flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="incremental">Incremental</SelectItem>
            <SelectItem value="full">Full re-sync</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={run} disabled={status === "running"}>
          {status === "running" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Sync
        </Button>
      </div>
      <StatusBadge status={status} message={message} />
    </ActionCard>
  );
}

// ── 2. RAG evaluation ─────────────────────────────────────────────────────────

type RagEvalType = "l1" | "l2" | "reranker" | "coverage" | "e2e";

const RAG_EVAL_LABELS: Record<RagEvalType, string> = {
  l1: "L1 — Retrieval precision",
  l2: "L2 — Answer faithfulness",
  reranker: "Reranker quality",
  coverage: "Coverage scan",
  e2e: "End-to-end",
};

function RagEvalCard() {
  const [status, setStatus] = React.useState<ActionStatus>("idle");
  const [message, setMessage] = React.useState("");
  const [evalType, setEvalType] = React.useState<RagEvalType>("l1");

  const run = async () => {
    setStatus("running");
    setMessage(`Running ${evalType} eval — this may take a minute…`);
    try {
      const data = await apiFetch<{ message?: string }>("/api/admin/rag-eval/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: evalType }),
      });
      setStatus("success");
      setMessage(data.message ?? "Eval complete. Check the results table.");
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Eval failed.");
    }
  };

  return (
    <ActionCard
      title="RAG Evaluation"
      badge="AI"
      icon={FlaskConical}
      description="Run retrieval quality evals against the RAG pipeline. Local dev only — returns 503 on Vercel."
    >
      <div className="flex items-center gap-2">
        <Select
          value={evalType}
          onValueChange={(value: RagEvalType) => setEvalType(value)}
        >
          <SelectTrigger size="sm" className="flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(RAG_EVAL_LABELS).map(([k, label]) => (
              <SelectItem key={k} value={k}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={run} disabled={status === "running"}>
          {status === "running" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
          Run
        </Button>
      </div>
      <StatusBadge status={status} message={message} />
    </ActionCard>
  );
}

// ── 3. Procore crawl ──────────────────────────────────────────────────────────

const PROCORE_TOOL_SLUGS = [
  "budget", "change-events", "change-orders", "commitments",
  "direct-costs", "drawings", "estimates", "invoicing",
  "prime-contracts", "rfis", "submittals",
];

function ProcoreCrawlCard() {
  const [status, setStatus] = React.useState<ActionStatus>("idle");
  const [message, setMessage] = React.useState("");
  const [slug, setSlug] = React.useState("rfis");
  const [customSlug, setCustomSlug] = React.useState("");

  const effectiveSlug = slug === "__custom__" ? customSlug.trim() : slug;

  const run = async () => {
    if (!effectiveSlug) return;
    setStatus("running");
    setMessage(`Crawling Procore "${effectiveSlug}"…`);
    try {
      const data = await apiFetch<{ message?: string }>("/api/admin/feedback/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: effectiveSlug }),
      });
      setStatus("success");
      setMessage(data.message ?? `Crawl complete for "${effectiveSlug}".`);
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Crawl failed.");
    }
  };

  return (
    <ActionCard
      title="Procore Crawl"
      badge="Scraper"
      icon={Bug}
      description="Run a deep Procore crawl for a tool to capture screenshots and a field manifest."
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Select value={slug} onValueChange={setSlug}>
            <SelectTrigger size="sm" className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROCORE_TOOL_SLUGS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
              <SelectItem value="__custom__">Custom slug...</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={run}
            disabled={status === "running" || !effectiveSlug}
          >
            {status === "running" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bug className="h-3.5 w-3.5" />}
            Crawl
          </Button>
        </div>
        {slug === "__custom__" && (
          <Input
            placeholder="e.g. schedule"
            value={customSlug}
            onChange={(e) => setCustomSlug(e.target.value)}
            className="h-8 text-sm"
          />
        )}
      </div>
      <StatusBadge status={status} message={message} />
    </ActionCard>
  );
}

// ── 4. Executive brief regenerate ─────────────────────────────────────────────

function RegenerateBriefCard() {
  const [status, setStatus] = React.useState<ActionStatus>("idle");
  const [message, setMessage] = React.useState("");
  const [days, setDays] = React.useState(3);

  const run = async () => {
    setStatus("running");
    setMessage(`Regenerating ${days}-day executive brief…`);
    try {
      const data = await apiFetch<{ message?: string }>("/api/executive/brandon-daily-update", {
        method: "GET",
      });
      setStatus("success");
      setMessage("Brief regenerated. Reload the executive page to see it.");
      void data;
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Regeneration failed.");
    }
  };

  return (
    <ActionCard
      title="Regenerate Brief"
      badge="AI"
      icon={RefreshCw}
      description="Force-regenerate the Brandon executive brief for a given look-back window."
    >
      <div className="flex items-center gap-2">
        <Select
          value={String(days)}
          onValueChange={(value) => setDays(Number(value))}
        >
          <SelectTrigger size="sm" className="flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 day</SelectItem>
            <SelectItem value="3">3 days (default)</SelectItem>
            <SelectItem value="7">7 days</SelectItem>
            <SelectItem value="14">14 days</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={run} disabled={status === "running"}>
          {status === "running" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Generate
        </Button>
      </div>
      <StatusBadge status={status} message={message} />
    </ActionCard>
  );
}

// ── 5. Extract Brandon tasks ──────────────────────────────────────────────────

function ExtractBrandonTasksCard() {
  const [status, setStatus] = React.useState<ActionStatus>("idle");
  const [message, setMessage] = React.useState("");
  const [days, setDays] = React.useState(3);

  const run = async () => {
    setStatus("running");
    setMessage(`Scanning last ${days} day(s) for Brandon-assigned tasks…`);
    try {
      const data = await apiFetch<{ inserted?: number; skipped?: number; docsProcessed?: number }>(
        `/api/admin/cron/extract-brandon-tasks?days=${days}`,
        { method: "POST" }
      );
      setStatus("success");
      setMessage(
        `Scanned ${data.docsProcessed ?? 0} docs — inserted ${data.inserted ?? 0} tasks, skipped ${data.skipped ?? 0} duplicates.`
      );
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Extraction failed.");
    }
  };

  return (
    <ActionCard
      title="Extract Brandon Tasks"
      badge="AI"
      icon={ClipboardList}
      description="Scan recent meetings, emails, and Teams messages for tasks Brandon has assigned to team members."
    >
      <div className="flex items-center gap-2">
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger size="sm" className="flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 day</SelectItem>
            <SelectItem value="3">3 days (default)</SelectItem>
            <SelectItem value="7">7 days</SelectItem>
            <SelectItem value="14">14 days</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={run} disabled={status === "running"}>
          {status === "running" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ClipboardList className="h-3.5 w-3.5" />
          )}
          Extract
        </Button>
      </div>
      <StatusBadge status={status} message={message} />
    </ActionCard>
  );
}

// ── 6. Intelligence compiler ──────────────────────────────────────────────────

function IntelligenceCompilerCard() {
  const [status, setStatus] = React.useState<ActionStatus>("idle");
  const [message, setMessage] = React.useState("");
  const [sourceLimit, setSourceLimit] = React.useState("5");
  const [packetLimit, setPacketLimit] = React.useState("5");

  const run = async () => {
    setStatus("running");
    setMessage("Running intelligence compiler…");
    try {
      const data = await apiFetch<{ message?: string }>("/api/admin/intelligence-compiler/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceLimit: Number(sourceLimit),
          packetLimit: Number(packetLimit),
          dryRun: false,
          background: true,
        }),
      });
      setStatus("success");
      setMessage(data.message ?? "Compiler started. Check /admin/intelligence-compiler for status.");
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Compiler failed.");
    }
  };

  return (
    <ActionCard
      title="Intelligence Compiler"
      badge="AI"
      icon={Brain}
      description="Generate AI intelligence packets for the executive dashboard. Runs on-demand — not scheduled."
    >
      <div className="flex items-center gap-2">
        <Select value={sourceLimit} onValueChange={setSourceLimit}>
          <SelectTrigger size="sm" className="flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">3 sources</SelectItem>
            <SelectItem value="5">5 sources (default)</SelectItem>
            <SelectItem value="10">10 sources</SelectItem>
            <SelectItem value="25">25 sources</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={run} disabled={status === "running"}>
          {status === "running" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
          Run
        </Button>
      </div>
      <StatusBadge status={status} message={message} />
    </ActionCard>
  );
}

// ── 6. Daily flags ────────────────────────────────────────────────────────────

function DailyFlagsCard() {
  const [status, setStatus] = React.useState<ActionStatus>("idle");
  const [message, setMessage] = React.useState("");

  const run = async () => {
    setStatus("running");
    setMessage("Scanning all projects for flags…");
    try {
      const data = await apiFetch<{ message?: string; stats?: Record<string, number> }>(
        "/api/admin/cron/daily-flags",
        { method: "POST" },
      );
      const stats = data.stats
        ? ` (${Object.entries(data.stats)
            .map(([k, v]) => `${v} ${k}`)
            .join(", ")})`
        : "";
      setStatus("success");
      setMessage(data.message ?? `Flags generated.${stats}`);
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Failed.");
    }
  };

  return (
    <ActionCard
      title="Daily Flags"
      badge="Cron"
      icon={Flag}
      description="Scan all active projects for budget variances >10%, past-due RFIs, late tasks, and stale change events. Runs automatically at 6am UTC."
    >
      <Button size="sm" onClick={run} disabled={status === "running"} className="w-full">
        {status === "running" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Flag className="h-3.5 w-3.5" />}
        Run Now
      </Button>
      <StatusBadge status={status} message={message} />
    </ActionCard>
  );
}

// ── 7. Progress report drafts ─────────────────────────────────────────────────

function ProgressReportDraftsCard() {
  const [status, setStatus] = React.useState<ActionStatus>("idle");
  const [message, setMessage] = React.useState("");

  const run = async () => {
    setStatus("running");
    setMessage("Creating progress report drafts…");
    try {
      const data = await apiFetch<{ message?: string }>("/api/admin/cron/progress-reports", {
        method: "POST",
      });
      setStatus("success");
      setMessage(data.message ?? "Draft reports created for all active projects.");
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Failed.");
    }
  };

  return (
    <ActionCard
      title="Progress Report Drafts"
      badge="Cron"
      icon={FileText}
      description="Auto-create a draft progress report for every active project missing one this week. Safe to re-run — idempotent. Runs automatically every Monday."
    >
      <Button size="sm" onClick={run} disabled={status === "running"} className="w-full">
        {status === "running" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
        Run Now
      </Button>
      <StatusBadge status={status} message={message} />
    </ActionCard>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function AdminActionCards() {
  return (
    <>
      <RegenerateBriefCard />
      <ExtractBrandonTasksCard />
      <AccountingSyncCard />
      <IntelligenceCompilerCard />
      <DailyFlagsCard />
      <ProgressReportDraftsCard />
      <RagEvalCard />
      <ProcoreCrawlCard />
    </>
  );
}
