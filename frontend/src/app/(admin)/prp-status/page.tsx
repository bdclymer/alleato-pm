"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/layout";
import { apiFetch } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2, Circle, XCircle, Minus } from "lucide-react";
import type { ToolPrpStatus } from "@/app/api/admin/prp-status/route";

function Check({ value }: { value: boolean | null }) {
  if (value === null) return <Minus className="h-4 w-4 text-muted-foreground/40" />;
  if (value) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  return <Circle className="h-4 w-4 text-muted-foreground/30" />;
}

function ValidationCell({ passed }: { passed: boolean | null }) {
  if (passed === null) return <Circle className="h-4 w-4 text-muted-foreground/30" />;
  if (passed) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  return <XCircle className="h-4 w-4 text-destructive" />;
}

function RouteCount({ count }: { count: number }) {
  if (count === 0) return <span className="text-muted-foreground/40 text-xs">—</span>;
  return <span className="text-xs tabular-nums text-muted-foreground">{count}</span>;
}

const COLUMNS = [
  { key: "label",            label: "Tool",           tip: null },
  { key: "apiRoutes",        label: "Routes",         tip: "API route count" },
  { key: "hasPrp",           label: "PRP",            tip: "prp-create — feature spec written" },
  { key: "hasAudit",         label: "Audit",          tip: "prp-audit — gap analysis + AUDIT.md" },
  { key: "hasTasks",         label: "Tasks",          tip: "TASKS.md generated from audit" },
  { key: "tasksComplete",    label: "Impl",           tip: "All TASKS.md items checked off" },
  { key: "hasTestScenarios", label: "Scenarios",      tip: "prp-test-scenarios — TEST-SCENARIOS.md" },
  { key: "hasValidationReport", label: "Validated",   tip: "prp-validate — VALIDATION-REPORT.md exists" },
  { key: "validationPassed", label: "Pass",           tip: "Validation result: PASS ✅" },
] as const;

export default function PrpStatusPage() {
  const [data, setData] = useState<ToolPrpStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<ToolPrpStatus[]>("/api/admin/prp-status")
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const passCount = data.filter((t) => t.validationPassed).length;
  const total = data.length;

  return (
    <PageShell variant="dashboard" title="PRP Pipeline Status">
      <div className="space-y-6">
        {/* Summary row */}
        {!loading && (
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span>
              <span className="font-medium text-foreground">{passCount}</span> / {total} validated
            </span>
            <span>
              <span className="font-medium text-foreground">
                {data.filter((t) => t.tasksComplete).length}
              </span>{" "}
              / {total} implemented
            </span>
            <span>
              <span className="font-medium text-foreground">
                {data.filter((t) => t.hasPrp).length}
              </span>{" "}
              / {total} have PRP doc
            </span>
          </div>
        )}

        {/* Pipeline legend */}
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground border-b border-border pb-4">
          {COLUMNS.filter((c) => c.tip).map((c) => (
            <span key={c.key}>
              <span className="font-medium text-foreground">{c.label}</span> — {c.tip}
            </span>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {COLUMNS.map((col) => (
                  <TableHead key={col.key} className={col.key === "label" ? "w-48" : "w-24 text-center"}>
                    {col.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => {
                const isFullyDone = row.validationPassed;
                return (
                  <TableRow
                    key={row.tool}
                    className={isFullyDone ? "bg-green-500/5" : undefined}
                  >
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell className="text-center">
                      <RouteCount count={row.apiRoutes} />
                    </TableCell>
                    <TableCell className="text-center">
                      <Check value={row.hasPrp} />
                    </TableCell>
                    <TableCell className="text-center">
                      <Check value={row.hasAudit} />
                    </TableCell>
                    <TableCell className="text-center">
                      <Check value={row.hasTasks} />
                    </TableCell>
                    <TableCell className="text-center">
                      <Check value={row.tasksComplete} />
                    </TableCell>
                    <TableCell className="text-center">
                      <Check value={row.hasTestScenarios} />
                    </TableCell>
                    <TableCell className="text-center">
                      <Check value={row.hasValidationReport} />
                    </TableCell>
                    <TableCell className="text-center">
                      <ValidationCell passed={row.validationPassed} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </PageShell>
  );
}
