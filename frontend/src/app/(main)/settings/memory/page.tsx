"use client";

import * as React from "react";
import { Brain, Trash2, Pencil, Check, X, RefreshCw } from "lucide-react";
import { PageShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MemoryType = "fact" | "preference" | "lesson" | "commitment" | "context";

interface Memory {
  id: string;
  type: MemoryType;
  content: string;
  confidence: number;
  importance: number;
  project_id: number | null;
  source: string;
  visibility: string;
  created_at: string;
  last_accessed_at: string | null;
  access_count: number;
}

const TYPE_LABELS: Record<MemoryType, string> = {
  preference: "Preference",
  fact: "Fact",
  lesson: "Lesson",
  commitment: "Commitment",
  context: "Context",
};

const TYPE_COLORS: Record<MemoryType, string> = {
  preference: "bg-violet-50 text-violet-700 border-violet-200",
  fact: "bg-blue-50 text-blue-700 border-blue-200",
  lesson: "bg-amber-50 text-amber-700 border-amber-200",
  commitment: "bg-red-50 text-red-700 border-red-200",
  context: "bg-slate-50 text-slate-600 border-slate-200",
};

// ---------------------------------------------------------------------------
// Memory row (editable)
// ---------------------------------------------------------------------------

function MemoryRow({
  memory,
  onDelete,
  onUpdate,
}: {
  memory: Memory;
  onDelete: (id: string) => void;
  onUpdate: (id: string, content: string, importance: number) => Promise<void>;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(memory.content);
  const [importance, setImportance] = React.useState(memory.importance);
  const [saving, setSaving] = React.useState(false);

  async function handleSave() {
    setSaving(true);
    await onUpdate(memory.id, draft, importance);
    setSaving(false);
    setEditing(false);
  }

  function handleCancel() {
    setDraft(memory.content);
    setImportance(memory.importance);
    setEditing(false);
  }

  const typeColor = TYPE_COLORS[memory.type] ?? "bg-muted text-muted-foreground";

  return (
    <div className="py-3.5 group">
      <div className="flex items-start gap-3">
        {/* Type badge */}
        <span
          className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide shrink-0 mt-0.5 ${typeColor}`}
        >
          {TYPE_LABELS[memory.type]}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="space-y-3">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="text-sm min-h-[60px] resize-none"
                autoFocus
              />
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">
                    Importance: {Math.round(importance * 100)}%
                  </p>
                  <Slider
                    value={[importance]}
                    min={0.1}
                    max={1}
                    step={0.05}
                    onValueChange={([v]) => setImportance(v)}
                    className="w-40"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saving || !draft.trim()}
                    className="h-7 text-xs"
                  >
                    <Check />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancel}
                    className="h-7 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-relaxed">{memory.content}</p>
          )}

          {/* Meta row */}
          {!editing && (
            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                {new Date(memory.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <span>·</span>
              <span>Importance {Math.round(memory.importance * 100)}%</span>
              {memory.access_count > 0 && (
                <>
                  <span>·</span>
                  <span>Used {memory.access_count}×</span>
                </>
              )}
              {memory.visibility === "team" && (
                <>
                  <span>·</span>
                  <Badge variant="outline" className="text-[10px] h-4 px-1">
                    Team
                  </Badge>
                </>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        {!editing && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setEditing(true)}
              title="Edit"
            >
              <Pencil />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(memory.id)}
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const TYPE_FILTERS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All types" },
  { value: "preference", label: "Preferences" },
  { value: "fact", label: "Facts" },
  { value: "lesson", label: "Lessons" },
  { value: "commitment", label: "Commitments" },
  { value: "context", label: "Context" },
];

export default function MemorySettingsPage() {
  const [memories, setMemories] = React.useState<Memory[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [typeFilter, setTypeFilter] = React.useState("all");

  async function loadMemories(type?: string) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (type && type !== "all") params.set("type", type);
      const res = await fetch(`/api/ai-assistant/memories?${params}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setMemories(data.memories ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setMemories([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadMemories(typeFilter);
  }, [typeFilter]);

  async function handleDelete(id: string) {
    const res = await fetch(`/api/ai-assistant/memories/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setMemories((prev) => prev.filter((m) => m.id !== id));
      setTotal((t) => t - 1);
    }
  }

  async function handleUpdate(id: string, content: string, importance: number) {
    const res = await fetch(`/api/ai-assistant/memories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, importance }),
    });
    if (res.ok) {
      setMemories((prev) =>
        prev.map((m) => (m.id === id ? { ...m, content, importance } : m)),
      );
    }
  }

  // Group by type for display
  const grouped = React.useMemo(() => {
    const map = new Map<MemoryType, Memory[]>();
    for (const m of memories) {
      if (!map.has(m.type)) map.set(m.type, []);
      map.get(m.type)!.push(m);
    }
    return map;
  }, [memories]);

  const typeOrder: MemoryType[] = ["preference", "commitment", "fact", "lesson", "context"];

  return (
    <PageShell variant="dashboard" title="AI Memory">
    <div className="px-8 py-8 max-w-4xl">
      {/* Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {total} {total === 1 ? "memory" : "memories"}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => loadMemories(typeFilter)}
          className="gap-1.5 text-muted-foreground"
        >
          <RefreshCw />
          Refresh
        </Button>
      </div>

      {/* Memory list */}
      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Loading memories…
        </div>
      ) : memories.length === 0 ? (
        <div className="py-12 text-center">
          <Brain className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {typeFilter === "all"
              ? "No memories yet. They'll appear here as you use the AI assistant."
              : `No ${typeFilter} memories yet.`}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {typeOrder.map((type) => {
            const items = grouped.get(type);
            if (!items?.length) return null;
            if (typeFilter !== "all" && typeFilter !== type) return null;
            return (
              <div key={type}>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {TYPE_LABELS[type]}
                  </h2>
                  <span className="text-xs text-muted-foreground/60">
                    {items.length}
                  </span>
                </div>
                <div className="rounded-lg border border-border bg-card px-4 divide-y divide-border">
                  {items.map((m) => (
                    <MemoryRow
                      key={m.id}
                      memory={m}
                      onDelete={handleDelete}
                      onUpdate={handleUpdate}
                    />
                  ))}
                </div>
                <Separator className="mt-6" />
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8 p-4 rounded-lg bg-muted/40 border border-border">
        <p className="text-xs text-muted-foreground">
          <strong>How this works:</strong> Alleato AI automatically captures memories
          during conversations — your preferences, project facts, patterns it notices,
          and commitments made. These are injected at the start of each session so the
          AI walks in already knowing your context. Preferences are always injected.
          Other memories are selected by relevance to your current question.
        </p>
      </div>
    </div>
    </PageShell>
  );
}
