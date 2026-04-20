"use client";

import {
  StatusBadge,
  StatusDot,
  StatusText,
  KpiBlock,
  KpiRow,
  SectionHeader,
  AvatarStack,
  DataTable,
  EmptyState,
  Eyebrow,
} from "@/components/ds";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Sample data for table demo
// ---------------------------------------------------------------------------

interface SampleRow {
  id: number;
  name: string;
  status: string;
  amount: string;
  date: string;
}

const sampleRows: SampleRow[] = [
  { id: 1, name: "Westfield Collective", status: "Approved", amount: "$142,800", date: "Jan 15, 2026" },
  { id: 2, name: "Harbor View Towers", status: "Pending", amount: "$89,200", date: "Feb 3, 2026" },
  { id: 3, name: "Pine Street Renovation", status: "Draft", amount: "$234,500", date: "Feb 20, 2026" },
  { id: 4, name: "Downtown Commons", status: "Rejected", amount: "$67,100", date: "Mar 1, 2026" },
  { id: 5, name: "Riverside Plaza", status: "In Progress", amount: "$198,000", date: "Mar 3, 2026" },
];

// ---------------------------------------------------------------------------
// All domain statuses for the status showcase
// ---------------------------------------------------------------------------

const allStatuses = [
  "Approved", "Active", "Completed", "Paid",
  "Pending", "Pending Approval", "In Progress", "Submitted",
  "Rejected", "Overdue", "Cancelled",
  "Draft", "Inactive", "Archived",
];

// ---------------------------------------------------------------------------
// Subsection header used throughout this page
// ---------------------------------------------------------------------------

function SubHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/60">
      {children}
    </h3>
  );
}

// ---------------------------------------------------------------------------
// Section: Reference Components (now importing from @/components/ds)
// ---------------------------------------------------------------------------

export function ReferenceComponentsSection() {
  return (
    <section id="reference" className="scroll-mt-8">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-8 pb-4 border-b border-border">
        <span className="font-mono text-[11px] font-medium text-muted-foreground/40 w-6 shrink-0">
          11
        </span>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Design System Components
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Production components from <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">@/components/ds</code>.
            Import everything from this single path — never from <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">@/components/ui/</code> directly.
          </p>
        </div>
      </div>

      {/* ================================================================
          STATUS INDICATORS — The most critical ds/ components
          ================================================================ */}
      <div className="mb-12">
        <SubHeader>StatusBadge — Automatic status → color mapping</SubHeader>
        <p className="mb-4 text-xs text-muted-foreground">
          Pass any status string. Colors are baked in. No manual variant selection.
        </p>

        {/* All statuses grid */}
        <div className="rounded-lg bg-card p-6">
          <div className="flex flex-wrap gap-2">
            {allStatuses.map((status) => (
              <StatusBadge key={status} status={status} />
            ))}
          </div>

          {/* Usage code */}
          <div className="mt-6 rounded-md bg-muted/50 p-4">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Usage</p>
            <code className="text-xs font-mono text-foreground">
              {'import { StatusBadge } from "@/components/ds"'}
            </code>
            <br />
            <code className="text-xs font-mono text-muted-foreground">
              {'<StatusBadge status="Approved" />  // green automatically'}
            </code>
            <br />
            <code className="text-xs font-mono text-muted-foreground">
              {'<StatusBadge status="Draft" />     // neutral automatically'}
            </code>
          </div>
        </div>
      </div>

      {/* StatusDot */}
      <div className="mb-12">
        <SubHeader>StatusDot — Minimal inline dot for tables</SubHeader>
        <div className="rounded-lg bg-card p-6">
          <div className="flex flex-wrap gap-6">
            <StatusDot status="Active" />
            <StatusDot status="Pending" />
            <StatusDot status="Rejected" />
            <StatusDot status="Draft" />
            <StatusDot status="Completed" />
          </div>
        </div>
      </div>

      {/* StatusText */}
      <div className="mb-12">
        <SubHeader>StatusText — Plain muted text (no pill, no color)</SubHeader>
        <div className="rounded-lg bg-card p-6">
          <div className="flex flex-wrap gap-6">
            <StatusText status="Not synced" />
            <StatusText status="No ERP status" />
            <StatusText status="N/A" />
          </div>
        </div>
      </div>

      {/* ================================================================
          EYEBROW — Tier 1 text element
          ================================================================ */}
      <div className="mb-12">
        <SubHeader>Eyebrow — 11px uppercase label (Tier 1 text)</SubHeader>
        <div className="rounded-lg bg-card p-6 space-y-4">
          <div>
            <Eyebrow>Total Budget</Eyebrow>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">$9.3M</p>
          </div>
          <div>
            <Eyebrow>Project Status</Eyebrow>
            <p className="mt-1 text-lg font-semibold tracking-tight text-foreground">In Progress</p>
          </div>
        </div>
      </div>

      {/* ================================================================
          KPI BLOCK — Metric display
          ================================================================ */}
      <div className="mb-12">
        <SubHeader>KpiBlock — Single metric with 3-tier hierarchy</SubHeader>
        <div className="grid grid-cols-3 gap-12 rounded-lg bg-card p-6">
          <KpiBlock
            label="Total Budget"
            value="$9.3M"
            context="Original contract value"
          />
          <KpiBlock
            label="Revenue"
            value="$24K"
            delta={{ value: "12.4%", positive: true }}
            context="vs $21.3K last month"
          />
          <KpiBlock
            label="Margin"
            value="18.2%"
            delta={{ value: "3.1%", positive: false }}
            context="Down from 21.3%"
          />
        </div>
      </div>

      {/* KPI Row */}
      <div className="mb-12">
        <SubHeader>KpiRow — Shared container with dividers (avoids card trap)</SubHeader>
        <KpiRow
          metrics={[
            { label: "Total Budget", value: "$9.3M", context: "Original contract value" },
            { label: "Committed", value: "$4.1M", delta: { value: "44%", positive: false }, context: "44% allocated" },
            { label: "Remaining", value: "$5.2M", delta: { value: "56%", positive: true }, context: "56% unallocated" },
            { label: "Open Items", value: "12", context: "Pending approval" },
          ]}
        />
      </div>

      {/* ================================================================
          SECTION HEADER
          ================================================================ */}
      <div className="mb-12">
        <SubHeader>SectionHeader — Title + count + action</SubHeader>
        <div className="space-y-4 rounded-lg bg-card p-6">
          <SectionHeader
            title="Meetings"
            count={57}
            action={{ label: "View all", href: "#" }}
          />
          <div className="border-t border-border" />
          <SectionHeader title="Recent Activity" />
          <div className="border-t border-border" />
          <SectionHeader
            title="Documents"
            count={234}
            action={{ label: "Upload", onClick: () => {} }}
          />
        </div>
      </div>

      {/* ================================================================
          DATA TABLE
          ================================================================ */}
      <div className="mb-12">
        <SubHeader>DataTable — The ONE table component</SubHeader>
        <p className="mb-4 text-xs text-muted-foreground">
          11px uppercase headers, primary column emphasis, row hover, tabular-nums for currency. Status via StatusBadge.
        </p>
        <div className="rounded-lg bg-card p-6">
          <DataTable<SampleRow>
            columns={[
              { key: "name", header: "Project", primary: true, render: (row) => row.name },
              {
                key: "status",
                header: "Status",
                render: (row) => <StatusBadge status={row.status} />,
              },
              { key: "amount", header: "Contract Value", align: "right", render: (row) => row.amount },
              { key: "date", header: "Date", render: (row) => row.date },
            ]}
            rows={sampleRows}
            onRowClick={(row) => alert(`Clicked: ${row.name}`)}
          />
        </div>

        {/* Table with StatusDot instead */}
        <div className="mt-6 rounded-lg bg-card p-6">
          <p className="mb-4 text-xs text-muted-foreground">Same table, using StatusDot instead of StatusBadge:</p>
          <DataTable<SampleRow>
            columns={[
              { key: "name", header: "Project", primary: true, render: (row) => row.name },
              {
                key: "status",
                header: "Status",
                render: (row) => <StatusDot status={row.status} />,
              },
              { key: "amount", header: "Value", align: "right", render: (row) => row.amount },
            ]}
            rows={sampleRows.slice(0, 3)}
          />
        </div>
      </div>

      {/* ================================================================
          AVATAR STACK
          ================================================================ */}
      <div className="mb-12">
        <SubHeader>AvatarStack — Overlapping initials</SubHeader>
        <div className="rounded-lg bg-card p-6">
          <div className="flex items-end gap-12">
            <div>
              <p className="mb-2 text-xs text-muted-foreground">Small (default)</p>
              <AvatarStack avatars={["BC", "JD", "MH", "AL", "TK"]} max={3} size="sm" />
            </div>
            <div>
              <p className="mb-2 text-xs text-muted-foreground">Medium</p>
              <AvatarStack avatars={["BC", "JD", "MH", "AL", "TK", "RP"]} max={4} size="md" />
            </div>
            <div>
              <p className="mb-2 text-xs text-muted-foreground">No overflow</p>
              <AvatarStack avatars={["BC", "JD"]} size="md" />
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================
          EMPTY STATE
          ================================================================ */}
      <div className="mb-12">
        <SubHeader>EmptyState — Icon + title + description + action</SubHeader>
        <div className="rounded-lg bg-card">
          <EmptyState
            icon={<FileText className="h-6 w-6 text-muted-foreground" />}
            title="No direct costs yet"
            description="Add your first direct cost to start tracking expenses for this project."
            action={
              <Button size="sm" variant="outline" onClick={() => {}}>
                <Plus />
                Add Direct Cost
              </Button>
            }
          />
        </div>
      </div>

      {/* ================================================================
          IMPORT REFERENCE
          ================================================================ */}
      <div className="rounded-lg border border-border bg-muted/30 p-6">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60">
          Single import path
        </p>
        <div className="space-y-1">
          <code className="block text-xs font-mono text-foreground">
            {'import {'}
          </code>
          <code className="block pl-4 text-xs font-mono text-muted-foreground">
            {'StatusBadge, StatusDot, StatusText,'}
          </code>
          <code className="block pl-4 text-xs font-mono text-muted-foreground">
            {'KpiBlock, KpiRow,'}
          </code>
          <code className="block pl-4 text-xs font-mono text-muted-foreground">
            {'DataTable, SectionHeader, AvatarStack,'}
          </code>
          <code className="block pl-4 text-xs font-mono text-muted-foreground">
            {'EmptyState, Eyebrow,'}
          </code>
          <code className="block pl-4 text-xs font-mono text-muted-foreground">
            {'Button, Badge, Input, Select, // ...shadcn re-exports'}
          </code>
          <code className="block text-xs font-mono text-foreground">
            {'} from "@/components/ds"'}
          </code>
        </div>
      </div>
    </section>
  );
}
