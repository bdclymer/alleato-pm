"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";

interface LayoutLink {
  href: string;
  label: string;
  desc: string;
}

const tablePages: LayoutLink[] = [
  { href: "/67/budget", label: "Budget", desc: "Full-width data grid with toolbar" },
  { href: "/67/commitments", label: "Commitments", desc: "Table with status badges and filters" },
  { href: "/67/direct-costs", label: "Direct Costs", desc: "Financial data table" },
  { href: "/67/schedule", label: "Schedule", desc: "Task list with dates" },
  { href: "/67/prime-contracts", label: "Prime Contracts", desc: "Contract list with actions" },
  { href: "/67/specifications", label: "Specifications", desc: "Document table" },
];

const formPages: LayoutLink[] = [
  { href: "/67/commitments/new", label: "New Commitment", desc: "Narrow form (672px)" },
  { href: "/67/prime-contracts/new", label: "New Prime Contract", desc: "Contract creation form" },
  { href: "/67/direct-costs/new", label: "New Direct Cost", desc: "Cost entry form" },
  { href: "/67/budget/line-item/new", label: "New Budget Line Item", desc: "Budget entry form" },
];

const contentPages: LayoutLink[] = [
  { href: "/67/home", label: "Project Home", desc: "Dashboard with KPI metrics" },
  { href: "/67/reporting", label: "Reporting", desc: "Reports and analytics" },
  { href: "/67/client-dashboard", label: "Client Dashboard", desc: "Client-facing overview" },
];

const crossProjectPages: LayoutLink[] = [
  { href: "/projects", label: "Projects", desc: "Cross-project list view" },
  { href: "/meetings", label: "Meetings", desc: "Cross-project meeting list" },
  { href: "/drawings", label: "Drawings", desc: "Cross-project drawings" },
  { href: "/rfis", label: "RFIs", desc: "Cross-project RFI list" },
  { href: "/daily-logs", label: "Daily Logs", desc: "Cross-project daily logs" },
];

function LinkGrid({ links }: { links: LayoutLink[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="group flex items-start gap-3 rounded-lg bg-card p-4 shadow-sm transition-all hover:shadow-sm hover:bg-muted"
        >
          <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
          <div>
            <p className="text-sm font-medium text-foreground group-hover:text-primary">
              {link.label}
            </p>
            <p className="text-xs text-muted-foreground">{link.desc}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

export function LayoutExamplesSection() {
  return (
    <section id="layouts" className="scroll-mt-8">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-8 pb-4 border-b border-border">
        <span className="font-mono text-[11px] font-medium text-muted-foreground/40 w-6 shrink-0">
          10
        </span>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Layout Examples
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Every page uses one of 4 archetypes. Click any link to see the
            layout in action. All use ProjectPageHeader + PageContainer.
          </p>
        </div>
      </div>

      {/* Table Page */}
      <div className="mb-8">
        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/60">
          Table Page
        </h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Full-width layout (maxWidth=&quot;full&quot;). For lists, data grids, budgets, directories.
        </p>
        <LinkGrid links={tablePages} />
      </div>

      {/* Form Page */}
      <div className="mb-8">
        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/60">
          Form Page
        </h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Narrow layout (FormContainer, 672px). For create/edit forms.
        </p>
        <LinkGrid links={formPages} />
      </div>

      {/* Content Page */}
      <div className="mb-8">
        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/60">
          Content Page
        </h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Standard width (maxWidth=&quot;xl&quot;, 1280px). For dashboards, reports, detail views.
        </p>
        <LinkGrid links={contentPages} />
      </div>

      {/* Cross-Project Tables */}
      <div>
        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/60">
          Tables Layout (Cross-Project)
        </h3>
        <p className="mb-4 text-xs text-muted-foreground">
          (tables) route group — minimal layout with table-optimized padding.
        </p>
        <LinkGrid links={crossProjectPages} />
      </div>
    </section>
  );
}
