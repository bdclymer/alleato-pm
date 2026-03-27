/**
 * GOLDEN EXAMPLES — Never rendered. Read-only reference for AI coding agents.
 *
 * PURPOSE: This file contains the single correct implementation of every
 * common UI pattern in Alleato. When building any UI, copy from here.
 * Do not improvise. Do not freestyle. Do not look at old pages for patterns —
 * old pages may be wrong. This file is always right.
 *
 * RULE: If a pattern isn't in here, check DESIGN.md before writing it.
 * If it's not in DESIGN.md either, ask Megan before inventing something.
 *
 * Last verified: 2026-03-23
 */

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageShell } from "@/components/layout";
import { StatusBadge, KpiRow, SectionHeader, EmptyState, DataTable } from "@/components/ds";
import type { ReactNode } from "react";

// ─── NEVER DO THESE ──────────────────────────────────────────────────────────
// ❌ <button className="...">   → always use <Button>
// ❌ bg-white                   → always use bg-card or bg-background
// ❌ bg-gray-200, text-gray-600 → always use semantic tokens
// ❌ p-[10px], w-[380px]        → always use Tailwind scale (p-2, w-96)
// ❌ hex colors in className    → always use CSS variables / semantic tokens
// ❌ <div className="bg-card rounded-lg border border-border p-6"> everywhere
//    → this is the Card Trap. Use tonal elevation or SectionCard instead.
// ─────────────────────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════════
// 1. PAGE SHELL — Every page uses this. No exceptions.
// ═══════════════════════════════════════════════════════════════════════════

export function GoldenDashboardPage() {
  return (
    <PageShell variant="dashboard" title="Project Overview" actions={<Button>+ New Project</Button>}>
      {/* KPI row goes first on dashboard pages */}
      <KpiRow metrics={[
        { label: "CONTRACT VALUE", value: "$4.2M" },
        { label: "OPEN RFIs", value: "7" },
        { label: "BUDGET USED", value: "64%" },
        { label: "DAYS TO COMPLETION", value: "42" },
      ]} />
      {/* Content below */}
    </PageShell>
  );
}

export function GoldenTablePage() {
  return (
    <PageShell variant="table" title="Commitments" actions={<Button>+ New Commitment</Button>}>
      {/* UnifiedTablePage or DataTable goes here */}
      {null}
    </PageShell>
  );
}

export function GoldenFormPage() {
  return (
    // No actions prop on form pages — back arrow + save button inside form
    <PageShell variant="form" title="Create Change Order" onBack={() => {}}>
      <Card>
        <CardContent className="p-6 space-y-4">
          {/* Form fields */}
        </CardContent>
      </Card>
    </PageShell>
  );
}

export function GoldenDetailPage({ status }: { status: string }) {
  return (
    <PageShell
      variant="detail"
      title="Prime Contract #1042"
      statusBadge={<StatusBadge status={status} />}
    >
      {/* Tabs or line items */}
      {null}
    </PageShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. BUTTONS — Always <Button>. Never <button>. Never raw anchor styled as button.
// ═══════════════════════════════════════════════════════════════════════════

export function GoldenButtons() {
  return (
    <div className="flex items-center gap-3">
      {/* PRIMARY — one per page/section max */}
      <Button variant="default">Save Changes</Button>

      {/* SECONDARY — supporting actions */}
      <Button variant="outline">Cancel</Button>

      {/* GHOST — low emphasis, toolbar actions */}
      <Button variant="ghost" size="sm">Edit</Button>

      {/* DESTRUCTIVE — delete/remove only */}
      <Button variant="destructive" size="sm">Delete</Button>

      {/* ICON — no text, use size="icon" */}
      <Button variant="ghost" size="icon" aria-label="More options">
        {/* icon component here */}
      </Button>

      {/* SMALL — table rows, compact contexts */}
      <Button variant="outline" size="sm">View</Button>

      {/* LOADING STATE — always disable and show indicator */}
      <Button disabled>
        <span className="animate-spin mr-2">⟳</span>
        Saving...
      </Button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. TEXT HIERARCHY — 4 tiers, always use all 3+ on any given screen section
// ═══════════════════════════════════════════════════════════════════════════

export function GoldenTextHierarchy() {
  return (
    <div>
      {/* Tier 1 — Eyebrow / section label */}
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        FINANCIAL SUMMARY
      </p>

      {/* Tier 2 — Heading / primary value */}
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        Contract Value
      </h2>

      {/* Tier 2 variant — large KPI number */}
      <p className="text-3xl font-semibold tracking-tight text-foreground">
        $4,250,000
      </p>

      {/* Tier 3 — Body / supporting text */}
      <p className="text-sm text-muted-foreground">
        Original contract plus 3 approved change orders
      </p>

      {/* Tier 4 — Meta / timestamp / footnote */}
      <p className="text-xs text-muted-foreground/60">
        Last updated 2 hours ago
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. SURFACE / CARD PATTERNS — Tonal elevation, not border boxes everywhere
// ═══════════════════════════════════════════════════════════════════════════

export function GoldenSurfaces() {
  return (
    <div className="space-y-4">

      {/* ✅ KPI bento — shared surface, internal dividers only */}
      {/* eslint-disable-next-line design-system/no-design-violations -- golden example showing bento pattern with intentional shared border */}
      <div className="overflow-hidden rounded-lg border border-border bg-card divide-x divide-border">
        <div className="grid grid-cols-4">
          <div className="px-6 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">CONTRACT</p>
            <p className="text-2xl font-semibold tracking-tight text-foreground mt-1">$4.2M</p>
          </div>
          {/* repeat for other KPIs */}
        </div>
      </div>

      {/* ✅ Content section — tonal background, no border */}
      <div className="rounded-lg bg-muted/50 p-6">
        <SectionHeader title="Recent Activity" />
        {/* content */}
      </div>

      {/* ✅ Hover-interactive row — ghost background on hover */}
      <div className="rounded-md px-4 py-3 hover:bg-accent transition-colors cursor-pointer">
        <p className="text-sm font-medium text-foreground">Change Order #12</p>
        <p className="text-xs text-muted-foreground">Submitted 2 days ago</p>
      </div>

      {/* ✅ Prominent card — ONE border, used sparingly */}
      <Card>
        <CardHeader>
          <CardTitle>Contract Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {/* content */}
        </CardContent>
      </Card>

      {/* ❌ NEVER THIS — the card trap */}
      {/*
      <div className="bg-card rounded-lg border border-border p-6">  // wrong
        <div className="bg-card rounded-lg border border-border p-6">  // doubly wrong
        </div>
      </div>
      */}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. STATUS BADGES — Always use StatusBadge. Never hand-roll colors.
// ═══════════════════════════════════════════════════════════════════════════

export function GoldenStatusBadges() {
  return (
    <div className="flex items-center gap-2">
      {/* StatusBadge handles all color mapping automatically */}
      <StatusBadge status="Draft" />
      <StatusBadge status="Approved" />
      <StatusBadge status="Pending" />
      <StatusBadge status="Rejected" />
      <StatusBadge status="In Progress" />
      <StatusBadge status="Complete" />

      {/* ❌ NEVER hand-roll status colors like this: */}
      {/* <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded">Active</span> */}
      {/* Use StatusBadge — it handles dark mode, consistent sizing, all statuses */}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. EMPTY STATES — Always use EmptyState component. Never raw "No data" text.
// ═══════════════════════════════════════════════════════════════════════════

export function GoldenEmptyState() {
  return (
    <EmptyState
      icon={null}
      title="No change orders yet"
      description="Change orders will appear here once they're created."
      action={{ label: "+ Create Change Order", onClick: () => {} }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. LOADING STATES — Skeleton, not spinner in content areas
// ═══════════════════════════════════════════════════════════════════════════

export function GoldenLoadingState() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 bg-muted rounded w-1/3" />
      <div className="h-4 bg-muted rounded w-2/3" />
      <div className="h-4 bg-muted rounded w-1/2" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. FORM FIELDS — Always label + input + error message pattern
// ═══════════════════════════════════════════════════════════════════════════

export function GoldenFormField({ label, error, children }: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 9. TABLE ROWS — Consistent padding, hover state, text hierarchy in cells
// ═══════════════════════════════════════════════════════════════════════════

export function GoldenTableRow({ title, subtitle, status, amount, date }: {
  title: string;
  subtitle?: string;
  status: string;
  amount?: string;
  date?: string;
}) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border last:border-0">
      {/* Main content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{title}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>
      {/* Amount */}
      {amount && (
        <p className="text-sm font-medium text-foreground tabular-nums">{amount}</p>
      )}
      {/* Status */}
      <StatusBadge status={status} />
      {/* Date */}
      {date && (
        <p className="text-xs text-muted-foreground/60 flex-shrink-0">{date}</p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 10. SECTION DIVIDER — Use this between major sections, not more cards
// ═══════════════════════════════════════════════════════════════════════════

export function GoldenSectionDivider({ title, action }: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border mb-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
}
