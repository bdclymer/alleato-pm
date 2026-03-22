"use client";

import * as React from "react";
import Link from "next/link";
import { Project } from "@/types/portfolio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  MapPin,
  Calendar,
  Building2,
  Search,
  ArrowUpRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type PortfolioScope = "all" | "client" | "internal";

const SCOPE_LABELS: Record<PortfolioScope, string> = {
  client: "Clients",
  internal: "Internal",
  all: "All",
};

const PROJECT_TABS = (id: string) => [
  { label: "Financial", href: `/${id}/budget` },
  { label: "Prime Contract", href: `/${id}/prime-contracts` },
  { label: "Changes", href: `/${id}/change-events` },
  { label: "Drawings", href: `/${id}/drawings` },
  { label: "Reports", href: `/${id}/reporting` },
  { label: "Meetings", href: `/${id}/meetings` },
  { label: "Schedule", href: `/${id}/schedule` },
];

function isInternalProjectType(type: string | null | undefined) {
  return type?.trim().toLowerCase() === "internal";
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  const d = m
    ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    : new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

// ── Left-panel row ────────────────────────────────────────────────────────
const ProjectRow = React.forwardRef<
  HTMLButtonElement,
  { project: Project; isSelected: boolean; onClick: () => void }
>(function ProjectRow({ project, isSelected, onClick }, ref) {
  return (
    <button
      ref={ref}
      // tabIndex -1 keeps rows out of the tab order so browser arrow-key
      // focus cycling doesn't interfere with our custom keyboard nav.
      tabIndex={-1}
      onClick={onClick}
      className={cn(
        "w-full text-left px-5 py-3.5 flex items-center justify-between",
        "border-b border-border/40 transition-colors outline-none",
        isSelected ? "bg-background" : "hover:bg-muted/70",
      )}
    >
      <div className="min-w-0 flex-1 pr-3">
        <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground font-medium mb-0.5 truncate">
          {project.client || "—"}
        </p>
        <p className="text-sm font-medium text-foreground truncate leading-tight">
          {project.name}
        </p>
      </div>
      {project.state && (
        <Badge
          variant="secondary"
          className="flex items-center gap-1 text-xs shrink-0 font-normal"
        >
          <MapPin className="h-2.5 w-2.5" />
          {project.state}
        </Badge>
      )}
    </button>
  );
});

// ── Right-panel detail ────────────────────────────────────────────────────
function ProjectDetail({
  project,
  onViewProject,
}: {
  project: Project;
  onViewProject: () => void;
}) {
  const tabs = PROJECT_TABS(project.id);
  return (
    <div className="px-10 py-8">
      <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold mb-2">
        {project.client || "—"}
      </p>

      <div className="flex items-start justify-between gap-4 mb-3">
        <h1 className="text-2xl font-semibold text-foreground leading-tight">
          {project.name}
        </h1>
        <Button size="sm" onClick={onViewProject} className="shrink-0 gap-1.5 mt-0.5">
          View Project
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex items-center gap-5 mb-10 text-sm text-muted-foreground flex-wrap">
        {project.client && (
          <span className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            {project.client}
          </span>
        )}
        {project.startDate && (
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            {formatDate(project.startDate)}
          </span>
        )}
        {project.state && (
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {project.state}
          </span>
        )}
      </div>

      <div className="flex gap-8 border-b border-border">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            className="pb-3 text-sm text-muted-foreground hover:text-foreground transition-colors border-b-2 border-transparent -mb-px whitespace-nowrap"
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function NoProjectSelected() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-1 text-muted-foreground">
      <p className="text-sm">Select a project to view details</p>
      <p className="text-xs opacity-60">Use ↑ ↓ to navigate</p>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function PortfolioPage() {
  const router = useRouter();

  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [scope, setScope] = React.useState<PortfolioScope>("client");

  // Index-based selection avoids stale-closure issues with keyboard nav
  const [selectedIdx, setSelectedIdx] = React.useState(0);

  // Refs
  const rowRefs = React.useRef<Map<string, HTMLButtonElement>>(new Map());
  const filteredLengthRef = React.useRef(0); // kept up-to-date for use in the keydown handler

  const setRowRef = React.useCallback(
    (id: string) => (el: HTMLButtonElement | null) => {
      if (el) rowRefs.current.set(id, el);
      else rowRefs.current.delete(id);
    },
    [],
  );

  // ── Data fetching ────────────────────────────────────────────────────────
  const mapProjectRow = React.useCallback((p: Record<string, unknown>): Project => {
    const s = (v: unknown, fb = "") =>
      typeof v === "string" ? v : typeof v === "number" ? String(v) : fb;
    const ns = (v: unknown) => (typeof v === "string" ? v : null);
    const nn = (v: unknown) => (typeof v === "number" ? v : null);
    const address = s(p.address);
    const phase = s(p.phase);
    const category = s(p.category);
    return {
      id: s(p.id, "0"),
      name: s(p.name, "Untitled Project"),
      jobNumber: s(p["job number"], s(p.id, "0")),
      client: s(p.client),
      startDate: ns(p["start date"]),
      state: s(p.state),
      phase,
      estRevenue: nn(p["est revenue"]),
      estProfit: nn(p["est profit"]),
      category,
      type: s(p.type, category || "General"),
      onedrive: s(p.onedrive),
      access: s(p.access),
      projectNumber: s(p["job number"], s(p.id, "0")),
      address,
      city: address ? address.split(",")[0] || "" : "",
      zip: "",
      phone: "",
      status: p.archived ? "Inactive" : "Active",
      stage: phase || "Unknown",
      notes: s(p.summary),
      isFlagged: false,
    };
  }, []);

  const fetchProjects = React.useCallback(async () => {
    try {
      setLoading(true);
      const allRows: Record<string, unknown>[] = [];
      let pg = 1;
      let totalPages = 1;
      while (pg <= totalPages) {
        const params = new URLSearchParams({ archived: "false", page: String(pg), limit: "100" });
        const res = await fetch(`/api/projects?${params}`);
        if (!res.ok) { setProjects([]); return; }
        const result = await res.json();
        allRows.push(...(Array.isArray(result.data) ? result.data : []));
        totalPages = Math.max(typeof result.meta?.totalPages === "number" ? result.meta.totalPages : 1, 1);
        pg++;
      }
      setProjects(allRows.map(mapProjectRow));
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    } finally {
      setLoading(false);
    }
  }, [mapProjectRow]);

  React.useEffect(() => { void fetchProjects(); }, [fetchProjects]);

  // ── Filtering ────────────────────────────────────────────────────────────
  const filteredProjects = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      const isInternal = isInternalProjectType(p.type);
      const scopeOk =
        scope === "all" ||
        (scope === "client" && !isInternal) ||
        (scope === "internal" && isInternal);
      if (!scopeOk) return false;
      if (!q) return true;
      return [p.name, p.jobNumber, p.client, p.state, p.phase, p.category]
        .some((v) => (v ?? "").toLowerCase().includes(q));
    });
  }, [projects, scope, search]);

  // Keep the ref in sync (used inside keydown handler without needing it in deps)
  React.useEffect(() => {
    filteredLengthRef.current = filteredProjects.length;
  }, [filteredProjects.length]);

  // Reset selection to top whenever filter/scope/search changes
  React.useEffect(() => {
    setSelectedIdx(0);
  }, [scope, search, projects]);

  // Clamp index so it's always valid (handles edge cases when list shrinks)
  const clampedIdx = Math.min(selectedIdx, Math.max(filteredProjects.length - 1, 0));
  const selectedProject = filteredProjects[clampedIdx] ?? null;

  // Scroll selected row into view whenever selection changes
  React.useEffect(() => {
    if (selectedProject) {
      rowRefs.current.get(selectedProject.id)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedProject?.id]); // intentional: only re-run on id change

  // Keyboard navigation — registered once, uses refs for current state
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      setSelectedIdx((i) => {
        const len = filteredLengthRef.current;
        if (len === 0) return 0;
        return e.key === "ArrowDown"
          ? Math.min(i + 1, len - 1)
          : Math.max(i - 1, 0);
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []); // empty — functional updater + ref means no closures needed

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* ── Left panel — only this scrolls ────────────────────────── */}
      <div className="w-80 flex-shrink-0 border-r border-border flex flex-col min-h-0 bg-muted/40">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h1 className="text-lg font-semibold text-foreground">Projects</h1>
          <span className="text-xs text-muted-foreground tabular-nums">
            {filteredProjects.length}
          </span>
        </div>

        {/* Search */}
        <div className="px-4 py-2.5 border-b border-border shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-8 h-8 text-sm bg-background/70"
              placeholder="Search projects…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Scope tabs */}
        <div className="flex border-b border-border text-xs shrink-0">
          {(["client", "internal", "all"] as PortfolioScope[]).map((s) => (
            <button
              key={s}
              tabIndex={-1}
              onClick={() => setScope(s)}
              className={cn(
                "flex-1 py-2 font-medium transition-colors outline-none",
                scope === s
                  ? "text-primary border-b-2 border-primary -mb-px"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {SCOPE_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Scrollable project list — ONLY element that scrolls */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
              Loading…
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
              No projects found
            </div>
          ) : (
            filteredProjects.map((project, idx) => (
              <ProjectRow
                key={project.id}
                ref={setRowRef(project.id)}
                project={project}
                isSelected={idx === clampedIdx}
                onClick={() => setSelectedIdx(idx)}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border shrink-0">
          <p className="text-xs text-muted-foreground">↑ ↓ to navigate</p>
          <Button
            size="sm"
            variant="ghost"
            tabIndex={-1}
            className="h-7 gap-1.5 text-xs outline-none"
            onClick={() => router.push("/create-project")}
          >
            <Plus className="h-3.5 w-3.5" />
            New Project
          </Button>
        </div>
      </div>

      {/* ── Right panel — no scroll ──────────────────────────────────
           overflow-y-auto + overscroll-contain: the panel CAN scroll
           (so wheel events are consumed here), but content fits so
           no scrollbar appears and nothing visually scrolls.         */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-background">
        {selectedProject ? (
          <ProjectDetail
            project={selectedProject}
            onViewProject={() => router.push(`/${selectedProject.id}/home`)}
          />
        ) : (
          <NoProjectSelected />
        )}
      </div>
    </div>
  );
}
