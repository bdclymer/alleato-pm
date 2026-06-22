"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { PageShell } from "@/components/layout";
import { EmptyState } from "@/components/ds";
import {
  Sparkles,
  Zap,
  Wrench,
  Clock,
  Search,
  Brain,
  DollarSign,
  Calendar,
  Users,
  Shield,
  Layout,
  Database,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UpdateType = "new" | "improved" | "fixed" | "coming-soon";
type UpdateArea =
  | "ai"
  | "financial"
  | "operations"
  | "ui"
  | "infrastructure"
  | "integrations"
  | "security";

interface UpdateEntry {
  type: UpdateType;
  area: UpdateArea;
  title: string;
  description: string;
}

interface Release {
  version: string;
  date: string;
  label?: string;
  entries: UpdateEntry[];
}

// ---------------------------------------------------------------------------
// Changelog data
// ---------------------------------------------------------------------------

const RELEASES: Release[] = [
  {
    version: "1.8.0",
    date: "Mar 13, 2026",
    label: "Latest",
    entries: [
      {
        type: "new",
        area: "ai",
        title: "AI Memory System",
        description:
          "Alleato AI now remembers context across sessions. Preferences, project facts, lessons, and commitments are stored as typed memories with pgvector embeddings, automatically surfaced in each conversation.",
      },
      {
        type: "new",
        area: "ai",
        title: "Soul & Identity Layers",
        description:
          "The AI assistant now has a distinct voice and self-concept — direct, specific, and fluent in construction PM. Personality is separated from operational instructions for independent evolution.",
      },
      {
        type: "new",
        area: "ai",
        title: "Memory Admin UI",
        description:
          "View, edit, and delete everything the AI remembers about you in Settings → AI → Memory. Inline editing with importance sliders and type filtering.",
      },
      {
        type: "new",
        area: "ai",
        title: "Post-Conversation Memory Extraction",
        description:
          "After each AI session, GPT-4.1-nano analyzes the transcript and extracts up to 5 durable memories — zero user-facing latency via Next.js after() hook.",
      },
      {
        type: "new",
        area: "ai",
        title: "Meeting-Triggered Memory Extraction",
        description:
          "When a meeting is ingested via Fireflies, the pipeline extracts team-visible facts, lessons, and commitments automatically and stores them for the whole team.",
      },
      {
        type: "new",
        area: "ai",
        title: "Memory Deduplication",
        description:
          "Duplicate memories are prevented via similarity-threshold RPC (0.88 cosine). When a near-duplicate is found, the existing memory is updated rather than creating a new one.",
      },
      {
        type: "new",
        area: "ai",
        title: "Commitment → Action Item Bridge",
        description:
          "Commitment-type memories automatically create action items in AI Insights so nothing falls through the cracks.",
      },
      {
        type: "new",
        area: "infrastructure",
        title: "Confidence Decay Cron",
        description:
          "A weekly cron (Sundays 4am) decays importance and confidence on stale, rarely-accessed memories — preventing the AI from giving outdated context undue weight.",
      },
    ],
  },
  {
    version: "1.7.0",
    date: "Mar 5, 2026",
    entries: [
      {
        type: "new",
        area: "ai",
        title: "Council Mode (C-Suite AI Panel)",
        description:
          "Engage multiple AI personas simultaneously — CFO, COO, CRO, CHRO, VP BD — for multi-angle analysis on any project decision.",
      },
      {
        type: "new",
        area: "ai",
        title: "Company Knowledge Base",
        description:
          "Upload SOPs, templates, and company docs. The AI retrieves relevant internal knowledge as context during conversations.",
      },
      {
        type: "new",
        area: "ai",
        title: "AI Strategist",
        description:
          "A dedicated AI assistant page with conversation history, suggested prompts, and full access to project and financial data via tool calls.",
      },
      {
        type: "improved",
        area: "ai",
        title: "RAG Tool Expansion",
        description:
          "Added 7 new RAG tools: budget analysis, change event tracking, commitment lookup, schedule risk, RFI aging, punchlist status, and subcontractor performance.",
      },
      {
        type: "new",
        area: "operations",
        title: "Meetings — Company-Wide View",
        description:
          "View all meetings across projects from a single table. Filter by project, host, or date range.",
      },
      {
        type: "improved",
        area: "ui",
        title: "Sidebar Navigation Overhaul",
        description:
          "Grouped navigation with Financial, Operations, Company, and Admin sections. Icon-based collapsed mode with hover tooltips.",
      },
      {
        type: "fixed",
        area: "infrastructure",
        title: "Vercel Build — Deep Type Instantiation Errors",
        description:
          "Resolved TypeScript errors from excessively deep type instantiation in retired collaboration-demo components that were blocking production deploys.",
      },
    ],
  },
  {
    version: "1.6.0",
    date: "Feb 20, 2026",
    entries: [
      {
        type: "new",
        area: "operations",
        title: "Estimates Module",
        description:
          "Create and manage project estimates with line items, trade breakdowns, and PDF export. Estimates can be linked to projects and versioned.",
      },
      {
        type: "new",
        area: "operations",
        title: "Prospects Pipeline",
        description:
          "Track potential projects from lead to bid with a Kanban-style pipeline, contact associations, and probability weighting.",
      },
      {
        type: "new",
        area: "operations",
        title: "Company-Wide Task Board",
        description:
          "Tasks across all projects aggregated into a single board. Assignee filtering, due date tracking, and priority levels.",
      },
      {
        type: "improved",
        area: "financial",
        title: "Budget — Unified Table Page",
        description:
          "Budget migrated to the UnifiedTablePage component. Column visibility toggles, search, CSV export, and inline status editing.",
      },
      {
        type: "improved",
        area: "financial",
        title: "Direct Costs — Form Stability",
        description:
          "Fixed DirectCostForm hanging on creation. Resolved race condition in cost code lookup that caused the submit handler to silently fail.",
      },
      {
        type: "fixed",
        area: "operations",
        title: "Sidebar Links — No Project Selected",
        description:
          "Sidebar links no longer 404 when no project is selected. Company-level routes now resolve correctly without a projectId segment.",
      },
    ],
  },
  {
    version: "1.5.0",
    date: "Feb 5, 2026",
    entries: [
      {
        type: "new",
        area: "integrations",
        title: "Fireflies Meeting Ingestion",
        description:
          "Automatic ingestion of Fireflies.ai meeting transcripts. Speaker diarization, topic extraction, and action item detection run post-ingestion.",
      },
      {
        type: "new",
        area: "integrations",
        title: "Acumatica Accounting Integration",
        description:
          "Connect Acumatica ERP for two-way financial sync. Invoices, commitments, and change orders flow between systems. Cookie-based auth with persistent sessions.",
      },
      {
        type: "new",
        area: "ai",
        title: "Daily Digest",
        description:
          "Automated daily summary delivered to the AI Strategist each morning — overdue items, budget alerts, upcoming milestones, and open RFIs.",
      },
      {
        type: "improved",
        area: "financial",
        title: "Prime Contracts — API Routes",
        description:
          "Built full CRUD API layer for Prime Contracts (previously 0 API routes). Create, read, update, delete now all functional with RLS-secured endpoints.",
      },
      {
        type: "improved",
        area: "financial",
        title: "Invoicing — Table Migration",
        description:
          "Invoicing migrated from deprecated DataTablePage to UnifiedTablePage for consistency with other financial tools.",
      },
      {
        type: "improved",
        area: "financial",
        title: "Change Events & Change Orders",
        description:
          "Linked change events to change orders with approval workflow. Status transitions enforced at the API layer.",
      },
    ],
  },
  {
    version: "1.4.0",
    date: "Jan 15, 2026",
    entries: [
      {
        type: "new",
        area: "ui",
        title: "Design System — Token Enforcement",
        description:
          "ESLint rules now enforce design system compliance as build errors: no hardcoded colors, no arbitrary spacing, semantic token requirements. Prevents visual drift across the app.",
      },
      {
        type: "new",
        area: "ui",
        title: "Unified Table Page Component",
        description:
          "Shared table infrastructure for all financial tools — consistent search, column visibility, export, and toolbar patterns across Budget, Commitments, Change Orders, and more.",
      },
      {
        type: "new",
        area: "security",
        title: "Row-Level Security Rollout",
        description:
          "RLS policies applied to all core tables. Users can only access data within their workspace. Service-role bypass for background jobs.",
      },
      {
        type: "improved",
        area: "operations",
        title: "Schedule — Gantt View",
        description:
          "Timeline Gantt view for project schedule. Task dependencies rendered as arrows, critical path highlighted, drag-to-reschedule support.",
      },
      {
        type: "new",
        area: "infrastructure",
        title: "Supabase Types Gate",
        description:
          "Automated type generation from live schema (npm run db:types) enforced before any database work. Prevents FK type mismatches and missing column errors.",
      },
    ],
  },
  {
    version: "1.3.0",
    date: "Dec 10, 2025",
    entries: [
      {
        type: "new",
        area: "operations",
        title: "RFIs & Submittals",
        description:
          "Full RFI workflow with question/answer threading, due dates, ball-in-court tracking, and Procore sync. Submittals with revision tracking and approval chains.",
      },
      {
        type: "new",
        area: "operations",
        title: "Punch List",
        description:
          "Create, assign, and close punch list items with photo attachments, location tagging, and trade categorization.",
      },
      {
        type: "new",
        area: "financial",
        title: "Commitments — Subcontract & PO Management",
        description:
          "Manage subcontracts and purchase orders with line items, retention tracking, and change order linkage. Approval workflow with status gating.",
      },
      {
        type: "improved",
        area: "ui",
        title: "Project Home Dashboard",
        description:
          "Redesigned project home with KPI blocks, budget health indicator, schedule status, and open items summary. Data-driven from live project state.",
      },
    ],
  },
  {
    version: "1.2.0",
    date: "Nov 1, 2025",
    entries: [
      {
        type: "new",
        area: "financial",
        title: "Budget Module",
        description:
          "Project budget with line items, cost codes, budget vs. actual tracking, and SOV management. Integrated with commitments and change events for real-time variance.",
      },
      {
        type: "new",
        area: "operations",
        title: "Project Directory",
        description:
          "Company and contact management at the project level. Role assignments, vendor categories, insurance tracking.",
      },
      {
        type: "new",
        area: "operations",
        title: "Document Management",
        description:
          "Project document storage with folder structure, version history, and permission-based access. PDF preview and bulk download.",
      },
      {
        type: "new",
        area: "infrastructure",
        title: "Multi-Project Architecture",
        description:
          "Platform rebuilt around multi-project support with project-scoped routing (/[projectId]/tool), permission modules, and per-project RLS.",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_META: Record<
  UpdateType,
  { label: string; icon: React.ElementType; className: string }
> = {
  new: {
    label: "New",
    icon: Sparkles,
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  improved: {
    label: "Improved",
    icon: Zap,
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  fixed: {
    label: "Fixed",
    icon: Wrench,
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  "coming-soon": {
    label: "Coming Soon",
    icon: Clock,
    className: "bg-violet-50 text-violet-700 border-violet-200",
  },
};

const AREA_META: Record<
  UpdateArea,
  { label: string; icon: React.ElementType }
> = {
  ai: { label: "AI", icon: Brain },
  financial: { label: "Financial", icon: DollarSign },
  operations: { label: "Operations", icon: Calendar },
  ui: { label: "UI / UX", icon: Layout },
  infrastructure: { label: "Infrastructure", icon: Database },
  integrations: { label: "Integrations", icon: Users },
  security: { label: "Security", icon: Shield },
};

const AREA_FILTERS = [
  { value: "all", label: "All areas" },
  ...Object.entries(AREA_META).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

const TYPE_FILTERS = [
  { value: "all", label: "All types" },
  { value: "new", label: "New" },
  { value: "improved", label: "Improved" },
  { value: "fixed", label: "Fixed" },
  { value: "coming-soon", label: "Coming Soon" },
];

// ---------------------------------------------------------------------------
// Entry card
// ---------------------------------------------------------------------------

function UpdateCard({ entry }: { entry: UpdateEntry }) {
  const typeMeta = TYPE_META[entry.type];
  const areaMeta = AREA_META[entry.area];
  const TypeIcon = typeMeta.icon;
  const AreaIcon = areaMeta.icon;

  return (
    <div className="flex gap-4 py-4 group">
      {/* Type icon */}
      <div
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border",
          typeMeta.className
        )}
      >
        <TypeIcon className="h-3.5 w-3.5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-foreground">
            {entry.title}
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              typeMeta.className
            )}
          >
            {typeMeta.label}
          </span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {entry.description}
        </p>
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground/60">
          <AreaIcon className="h-3 w-3" />
          <span>{areaMeta.label}</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Release block
// ---------------------------------------------------------------------------

function ReleaseBlock({
  release,
  entries,
}: {
  release: Release;
  entries: UpdateEntry[];
}) {
  if (entries.length === 0) return null;

  return (
    <div className="flex gap-6">
      {/* Left: version + date */}
      <div className="w-32 shrink-0 pt-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tabular-nums text-foreground">
            v{release.version}
          </span>
          {release.label && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              {release.label}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{release.date}</p>
      </div>

      {/* Right: entries */}
      <div className="flex-1 rounded-lg border border-border bg-card px-5 divide-y divide-border/60">
        {entries.map((entry, i) => (
          <UpdateCard key={i} entry={entry} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function UpdatesPage() {
  const [search, setSearch] = React.useState("");
  const [areaFilter, setAreaFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState("all");

  const filteredReleases = React.useMemo(() => {
    return RELEASES.map((release) => {
      const entries = release.entries.filter((entry) => {
        if (areaFilter !== "all" && entry.area !== areaFilter) return false;
        if (typeFilter !== "all" && entry.type !== typeFilter) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          return (
            entry.title.toLowerCase().includes(q) ||
            entry.description.toLowerCase().includes(q)
          );
        }
        return true;
      });
      return { release, entries };
    }).filter(({ entries }) => entries.length > 0);
  }, [search, areaFilter, typeFilter]);


  return (
    <PageShell variant="detail" title="What's New" description="A running log of features added, improved, and fixed across all areas of the platform.">
    <div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-8">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search updates…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
        <Select value={areaFilter} onValueChange={setAreaFilter}>
          <SelectTrigger className="h-8 w-40 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AREA_FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 w-40 text-sm">
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
      </div>

      {/* Release timeline */}
      {filteredReleases.length === 0 ? (
        <EmptyState
          icon={<Sparkles />}
          title="No updates match your filters"
          description="Try adjusting the filters to find what you're looking for."
        />
      ) : (
        <div className="space-y-6">
          {filteredReleases.map(({ release, entries }) => (
            <ReleaseBlock
              key={release.version}
              release={release}
              entries={entries}
            />
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="mt-10 flex flex-wrap items-center gap-4 pt-6 border-t border-border">
        <span className="text-xs text-muted-foreground font-medium">Legend:</span>
        {Object.entries(TYPE_META).map(([key, meta]) => {
          const Icon = meta.icon;
          return (
            <span
              key={key}
              className={cn(
                "inline-flex items-center gap-1.5 rounded border px-2 py-1 text-xs font-medium",
                meta.className
              )}
            >
              <Icon className="h-3 w-3" />
              {meta.label}
            </span>
          );
        })}
      </div>
    </div>
    </PageShell>
  );
}
