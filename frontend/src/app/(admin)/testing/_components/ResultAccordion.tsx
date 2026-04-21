"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronRight, FlaskConical } from "lucide-react";
import { EmptyState } from "@/components/ds";
import { cn } from "@/lib/utils";
import type { TestResult, TestStatus } from "./types";

type FilterTab = "all" | "passed" | "failed";

function parseSteps(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split("\n")
    .filter(Boolean)
    .map((s) => s.replace(/^\d+[.)]\s*/, "").trim());
}

function StatusDot({ status }: { status: TestStatus }) {
  return (
    <span
      className={cn(
        "h-2 w-2 shrink-0 rounded-full",
        status === "pass" && "bg-success",
        status === "fail" && "bg-destructive",
        (status === "skip" || status === "not_tested") && "bg-muted-foreground/40",
      )}
      aria-hidden
    />
  );
}

function DetailSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-foreground/60">
        {label}
      </p>
      {children}
    </div>
  );
}

function ResultRow({ result }: { result: TestResult }) {
  const [open, setOpen] = useState(false);
  const tc = result.test_cases;
  const screenshots = result.test_screenshots ?? [];
  const steps = parseSteps(tc.steps);

  return (
    <li className={cn("rounded-md transition-colors", open && "bg-muted/40")}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group flex w-full items-center gap-3 px-3 py-3.5 text-left"
      >
        <StatusDot status={result.status} />
        <span className="w-10 shrink-0 font-mono text-xs text-muted-foreground">
          {tc.test_number}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground group-hover:text-primary">
          {tc.test_name}
        </span>
        {result.status === "fail" && result.notes && (
          <span className="hidden max-w-[280px] truncate text-xs text-muted-foreground sm:block">
            {result.notes}
          </span>
        )}
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-150",
            open && "rotate-90",
          )}
        />
      </button>

      {open && (
        <div className="space-y-4 px-3 pb-5 pl-[3.25rem]">
          {/* Screenshots */}
          {screenshots.length > 0 && (
            <DetailSection label={screenshots.length === 1 ? "Screenshot" : "Screenshots"}>
              <div className="flex flex-wrap gap-3">
                {screenshots.map((s) => (
                  <a
                    key={s.id}
                    href={s.public_url ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/img block overflow-hidden rounded-md border border-border"
                  >
                    {s.public_url ? (
                      <Image
                        src={s.public_url}
                        alt={s.label ?? "Test screenshot"}
                        width={320}
                        height={200}
                        className="h-40 w-80 object-cover transition-opacity group-hover/img:opacity-80"
                      />
                    ) : null}
                    {s.label && (
                      <p className="px-2 py-1 text-xs text-muted-foreground">{s.label}</p>
                    )}
                  </a>
                ))}
              </div>
            </DetailSection>
          )}

          {/* Actual result (notes from the tester) */}
          {result.notes && (
            <DetailSection label="Actual result">
              <p className="whitespace-pre-line text-sm text-foreground">{result.notes}</p>
            </DetailSection>
          )}

          {/* Expected result */}
          {tc.expected_result && (
            <DetailSection label="Expected result">
              <p className="whitespace-pre-line text-sm text-muted-foreground">{tc.expected_result}</p>
            </DetailSection>
          )}

          {/* Context */}
          {tc.context_note && (
            <DetailSection label="Context">
              <p className="text-sm text-muted-foreground">{tc.context_note}</p>
            </DetailSection>
          )}

          {/* Steps */}
          {steps.length > 0 && (
            <DetailSection label="Steps">
              <ol className="list-decimal list-inside space-y-1">
                {steps.map((step, i) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    {step}
                  </li>
                ))}
              </ol>
            </DetailSection>
          )}

          {/* Start URL */}
          {tc.start_url && (
            <DetailSection label="Start URL">
              <a
                href={tc.start_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary underline underline-offset-4 hover:text-primary/80"
                onClick={(e) => e.stopPropagation()}
              >
                {tc.start_url}
              </a>
            </DetailSection>
          )}
        </div>
      )}
    </li>
  );
}

export function ResultAccordion({ results }: { results: TestResult[] }) {
  const [tab, setTab] = useState<FilterTab>("all");

  const filtered = results.filter((r) => {
    if (tab === "passed") return r.status === "pass";
    if (tab === "failed") return r.status === "fail";
    return true;
  });

  const failCount = results.filter((r) => r.status === "fail").length;
  const passCount = results.filter((r) => r.status === "pass").length;

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "All", count: results.length },
    { key: "failed", label: "Failed", count: failCount },
    { key: "passed", label: "Passed", count: passCount },
  ];

  return (
    <div className="space-y-4">
      {/* Tab strip */}
      <div className="flex items-center gap-1 rounded-full bg-muted p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
              tab === t.key
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                tab === t.key
                  ? t.key === "failed"
                    ? "bg-destructive/10 text-destructive"
                    : t.key === "passed"
                    ? "bg-success/10 text-success"
                    : "bg-muted text-muted-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Rows */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<FlaskConical />}
          title={tab === "failed" ? "No failures" : tab === "passed" ? "No passes" : "No results"}
          description={
            tab === "failed"
              ? "All cases passed or were skipped."
              : tab === "passed"
              ? "No cases passed in this run."
              : "No results recorded."
          }
        />
      ) : (
        <ul className="space-y-0 divide-y divide-border">
          {filtered.map((r) => (
            <ResultRow key={r.id} result={r} />
          ))}
        </ul>
      )}
    </div>
  );
}
