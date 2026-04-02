"use client";
import { useState, useEffect, useCallback } from "react";
import { PageContainer, ProjectPageHeader } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Violation = {
  id: string;
  created_at: string;
  route: string;
  element_description: string | null;
  element_selector: string | null;
  violation_type: string;
  notes: string | null;
  screenshot_url: string | null;
  status: string;
  priority: string;
  fixed_in_file: string | null;
  fixed_at: string | null;
};

const TYPE_LABELS: Record<string, string> = {
  wrong_button: "Wrong button",
  bg_white: "bg-card",
  card_trap: "Card trap",
  wrong_text_hierarchy: "Text hierarchy",
  hardcoded_color: "Hardcoded color",
  arbitrary_spacing: "Arbitrary spacing",
  missing_token: "Missing token",
  wrong_component: "Wrong component",
  inconsistent_pattern: "Inconsistent pattern",
  other: "Other",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400",
  fixed: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400",
  wont_fix: "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400",
};

export default function DesignViolationsPage() {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [filter, setFilter] = useState<string>("open");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Violation | null>(null);

  const fetchViolations = useCallback(async () => {
    setLoading(true);
    try {
      const status = filter === "all" ? "open,in_progress,fixed,wont_fix" : filter;
      const res = await fetch(`/api/dev/violations?status=${status}`);
      if (res.ok) {
        const { violations: data } = await res.json();
        setViolations(data ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchViolations(); }, [fetchViolations]);

  async function updateStatus(id: string, status: string, fixedInFile?: string) {
    await fetch("/api/dev/violations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, fixedInFile }),
    });
    setSelected(null);
    fetchViolations();
  }

  // Group by route for easy scanning
  const grouped = violations.reduce<Record<string, Violation[]>>((acc, v) => {
    (acc[v.route] = acc[v.route] || []).push(v);
    return acc;
  }, {});

  const stats = {
    open: violations.filter(v => v.status === "open").length,
    in_progress: violations.filter(v => v.status === "in_progress").length,
    fixed: violations.filter(v => v.status === "fixed").length,
  };

  return (
    <>
      <ProjectPageHeader
        title="Design Violations"
        description="Flagged design system violations — right-click any element in dev mode to flag"
        actions={
          <div className="flex items-center gap-2 text-sm">
            {stats.open > 0 && <span className="text-red-600 font-medium">{stats.open} open</span>}
            {stats.in_progress > 0 && <span className="text-amber-600 font-medium">{stats.in_progress} in progress</span>}
            {stats.fixed > 0 && <span className="text-green-600 font-medium">{stats.fixed} fixed</span>}
          </div>
        }
      />
      <PageContainer>
        {/* Filter tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-border pb-3">
          {["open", "in_progress", "fixed", "wont_fix", "all"].map(s => (
            <Button
              key={s}
              variant={filter === s ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                filter === s
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {s === "wont_fix" ? "Won't fix" : s === "in_progress" ? "In progress" : s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>

        {loading && <p className="text-sm text-muted-foreground">Loading...</p>}

        {!loading && violations.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">🎨</div>
            <p className="text-sm font-medium text-foreground">No violations</p>
            <p className="text-xs text-muted-foreground mt-1">
              Right-click any element in dev mode to flag a design violation
            </p>
          </div>
        )}

        {/* Grouped by route */}
        <div className="space-y-6">
          {Object.entries(grouped).map(([route, items]) => (
            <div key={route}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {route}
                </span>
                <span className="text-xs text-muted-foreground">{items.length} item{items.length > 1 ? "s" : ""}</span>
              </div>
              <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
                {items.map(v => (
                  <div
                    key={v.id}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setSelected(selected?.id === v.id ? null : v)}
                  >
                    {/* Status dot */}
                    <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                      v.status === "open" ? "bg-red-500" :
                      v.status === "in_progress" ? "bg-amber-500" :
                      v.status === "fixed" ? "bg-green-500" : "bg-zinc-400"
                    }`} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${STATUS_COLORS[v.status]}`}>
                          {v.status === "wont_fix" ? "Won't fix" : v.status.replace("_", " ")}
                        </span>
                        <span className="text-xs font-medium text-foreground">
                          {TYPE_LABELS[v.violation_type] ?? v.violation_type}
                        </span>
                        {v.priority === "high" && (
                          <span className="text-[10px] text-red-600 font-medium">HIGH</span>
                        )}
                      </div>
                      {v.element_description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{v.element_description}</p>
                      )}
                      {v.notes && (
                        <p className="text-xs text-foreground mt-1 italic">"{v.notes}"</p>
                      )}
                    </div>

                    <span className="text-[10px] text-muted-foreground flex-shrink-0">
                      {new Date(v.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>

              {/* Expanded detail for selected item */}
              {selected && items.find(i => i.id === selected.id) && (
                <div className="mt-2 border border-border rounded-lg p-4 bg-muted/30 space-y-3">
                  {selected.element_selector && (
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Selector</p>
                      <code className="text-xs font-mono text-foreground bg-muted px-2 py-1 rounded block">
                        {selected.element_selector}
                      </code>
                    </div>
                  )}
                  {selected.screenshot_url && (
                    <img src={selected.screenshot_url} alt="Screenshot" className="rounded border border-border max-h-40 object-cover" />
                  )}
                  {selected.fixed_in_file && (
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Fixed in</p>
                      <code className="text-xs font-mono text-foreground">{selected.fixed_in_file}</code>
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    {selected.status === "open" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => updateStatus(selected.id, "in_progress")}>
                          Mark in progress
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => updateStatus(selected.id, "wont_fix")}>
                          Won't fix
                        </Button>
                      </>
                    )}
                    {selected.status === "in_progress" && (
                      <Button size="sm" onClick={() => updateStatus(selected.id, "fixed")}>
                        Mark fixed
                      </Button>
                    )}
                    {(selected.status === "fixed" || selected.status === "wont_fix") && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(selected.id, "open")}>
                        Re-open
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </PageContainer>
    </>
  );
}
