"use client";
/* eslint-disable design-system/no-raw-heading */

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ToolInfo {
  id: number;
  name: string;
  description: string | null;
  overview: string | null;
  procore_screenshot: string | null;
}

interface Feature {
  category: string;
  feature_key: string;
  feature_name: string;
  description: string | null;
  status: "implemented" | "partial" | "planned";
  sort_order: number;
}

interface FormField {
  form_name: string;
  field_name: string;
  field_type: string;
  required: boolean;
  description: string | null;
  sort_order: number;
}

interface ReferenceData {
  tool: ToolInfo | null;
  features: Feature[];
  formFields: FormField[];
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<Feature["status"], string> = {
  implemented: "bg-emerald-50 text-emerald-700 border-emerald-200",
  partial:     "bg-amber-50 text-amber-700 border-amber-200",
  planned:     "bg-muted text-muted-foreground border-border",
};

const STATUS_LABEL: Record<Feature["status"], string> = {
  implemented: "Implemented",
  partial:     "Partial",
  planned:     "Planned",
};

function StatusChip({ status }: { status: Feature["status"] }) {
  return (
    <span className={cn("text-[11px] font-medium px-1.5 py-0.5 rounded border", STATUS_STYLES[status])}>
      {STATUS_LABEL[status]}
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function ToolReferencePanel({ toolName }: { toolName: string }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ReferenceData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || data) return;
    setLoading(true);
    apiFetch(`/api/testing/tools/${toolName}`)
      .then((d) => setData(d as ReferenceData))
      .catch(() => setData({ tool: null, features: [], formFields: [] }))
      .finally(() => setLoading(false));
  }, [open, toolName, data]);

  // Group features by category
  const featuresByCategory = (data?.features ?? []).reduce<Record<string, Feature[]>>(
    (acc, f) => {
      (acc[f.category] ??= []).push(f);
      return acc;
    },
    {}
  );

  // Group form fields by form name
  const fieldsByForm = (data?.formFields ?? []).reduce<Record<string, FormField[]>>(
    (acc, f) => {
      (acc[f.form_name] ??= []).push(f);
      return acc;
    },
    {}
  );

  const hasData = data && (data.tool || data.features.length > 0 || data.formFields.length > 0);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-muted/50 hover:bg-muted transition-colors text-left"
      >
        <BookOpen className="size-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium text-foreground flex-1">Tool Reference</span>
        {open ? (
          <ChevronUp className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" />
        )}
      </button>

      {/* Panel body */}
      {open && (
        <div className="border-t border-border">
          {loading && (
            <div className="px-4 py-6 text-sm text-muted-foreground text-center">Loading…</div>
          )}

          {!loading && !hasData && (
            <div className="px-4 py-6 text-sm text-muted-foreground text-center">
              No reference data available for this tool yet.
            </div>
          )}

          {!loading && hasData && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent h-9 px-4 gap-1">
                <TabsTrigger value="overview"   className="text-xs h-7 data-[state=active]:bg-background data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">Overview</TabsTrigger>
                <TabsTrigger value="screenshots" className="text-xs h-7 data-[state=active]:bg-background data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">Screenshots</TabsTrigger>
                <TabsTrigger value="features"   className="text-xs h-7 data-[state=active]:bg-background data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                  Features {data.features.length > 0 && <span className="ml-1 text-muted-foreground">({data.features.length})</span>}
                </TabsTrigger>
                <TabsTrigger value="forms"      className="text-xs h-7 data-[state=active]:bg-background data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">Forms</TabsTrigger>
              </TabsList>

              {/* ── Overview ── */}
              <TabsContent value="overview" className="p-4 space-y-3 mt-0">
                {data.tool?.name && (
                  <h3 className="text-sm font-semibold text-foreground">{data.tool.name}</h3>
                )}
                {data.tool?.overview ? (
                  <p className="text-sm text-muted-foreground leading-relaxed">{data.tool.overview}</p>
                ) : data.tool?.description ? (
                  <p className="text-sm text-muted-foreground leading-relaxed">{data.tool.description}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No overview available.</p>
                )}
                {/* Implementation summary */}
                {data.features.length > 0 && (
                  <div className="flex gap-3 pt-1">
                    {(["implemented", "partial", "planned"] as const).map((s) => {
                      const count = data.features.filter((f) => f.status === s).length;
                      if (!count) return null;
                      return (
                        <div key={s} className={cn("text-xs px-2 py-1 rounded border font-medium", STATUS_STYLES[s])}>
                          {count} {STATUS_LABEL[s]}
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* ── Screenshots ── */}
              <TabsContent value="screenshots" className="p-4 mt-0">
                {data.tool?.procore_screenshot ? (
                  <img
                    src={data.tool.procore_screenshot}
                    alt={`${data.tool.name} screenshot`}
                    className="rounded-md border border-border w-full object-contain max-h-96"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                    <span className="text-sm">No screenshots added yet.</span>
                    <span className="text-xs">Add a screenshot URL to the procore_tools record.</span>
                  </div>
                )}
              </TabsContent>

              {/* ── Features ── */}
              <TabsContent value="features" className="mt-0 max-h-80 overflow-y-auto">
                {Object.keys(featuresByCategory).length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">No features added yet.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {Object.entries(featuresByCategory).map(([category, features]) => (
                      <div key={category}>
                        <div className="px-4 py-2 bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {category}
                        </div>
                        <div className="divide-y divide-border/50">
                          {features.map((f) => (
                            <div key={f.feature_key} className="flex items-start gap-3 px-4 py-2.5">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground">{f.feature_name}</p>
                                {f.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>
                                )}
                              </div>
                              <StatusChip status={f.status} />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* ── Forms ── */}
              <TabsContent value="forms" className="mt-0 max-h-80 overflow-y-auto">
                {Object.keys(fieldsByForm).length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">No form fields added yet.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {Object.entries(fieldsByForm).map(([formName, fields]) => (
                      <div key={formName}>
                        <div className="px-4 py-2 bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {formName}
                        </div>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-border/50 bg-muted/10">
                              <th className="text-left px-4 py-1.5 font-medium text-muted-foreground">Field</th>
                              <th className="text-left px-2 py-1.5 font-medium text-muted-foreground">Type</th>
                              <th className="text-left px-2 py-1.5 font-medium text-muted-foreground">Req</th>
                              <th className="text-left px-2 py-1.5 font-medium text-muted-foreground">Description</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/30">
                            {fields.map((f) => (
                              <tr key={f.field_name} className="hover:bg-muted/20">
                                <td className="px-4 py-2 font-mono text-foreground whitespace-nowrap">{f.field_name}</td>
                                <td className="px-2 py-2 text-muted-foreground whitespace-nowrap">{f.field_type}</td>
                                <td className="px-2 py-2">
                                  {f.required ? (
                                    <span className="text-destructive font-bold">✱</span>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </td>
                                <td className="px-2 py-2 text-muted-foreground">{f.description ?? "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      )}
    </div>
  );
}
