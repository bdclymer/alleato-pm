"use client";

import * as React from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ArrowRight, FileText, GitPullRequest, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjectPCOs, type PCO } from "@/hooks/use-pcos";
import { useProjectChangeEvents } from "@/hooks/use-change-events";
import type { ChangeEvent } from "@/types/change-events";
import { KpiRow, StatusBadge, Skeleton } from "@/components/ds";

// =============================================================================
// Types
// =============================================================================

interface ChangeManagementWidgetProps {
  projectId: string;
}

// =============================================================================
// Helpers
// =============================================================================

function formatCurrency(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${value < 0 ? "-" : ""}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${value < 0 ? "-" : ""}$${(abs / 1_000).toFixed(1)}K`;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function isActivePCO(pco: PCO): boolean {
  return pco.status !== "VOID" && pco.status !== "APPROVED";
}

function isOpenCE(ce: ChangeEvent): boolean {
  const s = (ce.status ?? "").toLowerCase();
  return s === "open" || s === "pending" || s === "in progress";
}

function isApprovedThisMonth(pco: PCO): boolean {
  if (pco.status !== "APPROVED" || !pco.approved_at) return false;
  const now = new Date();
  const approved = new Date(pco.approved_at);
  return approved.getMonth() === now.getMonth() && approved.getFullYear() === now.getFullYear();
}

// =============================================================================
// Sub-components
// =============================================================================

function KpiStrip({
  openCEs,
  activePCOs,
  approvedThisMonth,
  netImpact,
}: {
  openCEs: number;
  activePCOs: number;
  approvedThisMonth: number;
  netImpact: number;
}) {
  return (
    <KpiRow
      metrics={[
        { label: "Open Change Events", value: String(openCEs) },
        { label: "Active PCOs", value: String(activePCOs) },
        { label: "Approved This Month", value: String(approvedThisMonth) },
        { label: "Net Contract Impact", value: formatCurrency(netImpact) },
      ]}
    />
  );
}

function PipelineColumn({
  title,
  icon: Icon,
  count,
  items,
  renderItem,
  overflowHref,
}: {
  title: string;
  icon: React.ElementType;
  count: number;
  items: { id: string | number }[];
  renderItem: (item: any) => React.ReactNode;
  overflowHref?: string;
}) {
  const overflow = count - items.length;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{title}</span>
        </div>
        <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
          {count}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">
          No items
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {items.map((item) => (
            <React.Fragment key={item.id}>{renderItem(item)}</React.Fragment>
          ))}
        </div>
      )}
      {overflow > 0 && overflowHref && (
        <Link
          href={overflowHref}
          className="mt-1 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          +{overflow} more <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

function CECard({ ce }: { ce: ChangeEvent }) {
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-foreground">
          {ce.number ?? `CE-${ce.id}`}
        </span>
        {ce.type && <StatusBadge status={ce.type} variant="info" />}
      </div>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{ce.title}</p>
    </div>
  );
}

function PCOCard({ pco }: { pco: PCO }) {
  const displayStatus = pco.status.charAt(0) + pco.status.slice(1).toLowerCase().replace(/_/g, " ");
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-foreground">
          PCO-{pco.number}
        </span>
        <StatusBadge status={displayStatus} />
      </div>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{pco.title}</p>
      {pco.estimated_value != null && (
        <p className="mt-0.5 text-xs font-medium text-foreground">
          {formatCurrency(pco.estimated_value)}
        </p>
      )}
    </div>
  );
}

function RecentActivity({
  changeEvents,
  pcos,
}: {
  changeEvents: ChangeEvent[];
  pcos: PCO[];
}) {
  // Build a combined timeline from the most recently updated records
  const timeline = React.useMemo(() => {
    const ceItems = changeEvents.slice(0, 5).map((ce) => ({
      id: `ce-${ce.id}`,
      label: `CE ${ce.number ?? ce.id}: ${ce.title}`,
      status: ce.status ?? "Open",
      date: ce.updated_at ?? ce.created_at ?? "",
      type: "ce" as const,
    }));
    const pcoItems = pcos.slice(0, 5).map((pco) => ({
      id: `pco-${pco.id}`,
      label: `PCO-${pco.number}: ${pco.title}`,
      status: pco.status,
      date: pco.updated_at ?? pco.created_at,
      type: "pco" as const,
    }));
    return [...ceItems, ...pcoItems]
      .filter((item) => item.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [changeEvents, pcos]);

  if (timeline.length === 0) {
    return (
      <p className="py-3 text-center text-xs text-muted-foreground">
        No recent activity
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Recent Activity
      </span>
      <div className="flex flex-col gap-1.5">
        {timeline.map((item) => (
          <div key={item.id} className="flex items-center gap-2 text-xs">
            {item.type === "ce" ? (
              <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <GitPullRequest className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )}
            <span className="flex-1 truncate text-muted-foreground">
              {item.label}
            </span>
            <span className="shrink-0 text-muted-foreground/60">
              {item.date ? formatDistanceToNow(new Date(item.date), { addSuffix: true }) : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Main Widget
// =============================================================================

export function ChangeManagementWidget({ projectId }: ChangeManagementWidgetProps) {
  const numericId = Number(projectId);

  const { data: pcos, isLoading: pcosLoading } = useProjectPCOs(projectId);
  const { changeEvents, isLoading: cesLoading } = useProjectChangeEvents(numericId);

  const isLoading = pcosLoading || cesLoading;

  if (isLoading) return <LoadingSkeleton />;

  const allPcos = pcos ?? [];
  const openCEs = changeEvents.filter(isOpenCE);
  const activePCOs = allPcos.filter(isActivePCO);
  const approvedThisMonth = allPcos.filter(isApprovedThisMonth);
  const netImpact = allPcos
    .filter((p) => p.status === "APPROVED")
    .reduce((sum, p) => sum + (p.approved_value ?? p.estimated_value ?? 0), 0);

  const topCEs = openCEs.slice(0, 3);
  const topPCOs = activePCOs.slice(0, 3);

  return (
    <div className="flex flex-col gap-6">
      {/* KPI Strip */}
      <KpiStrip
        openCEs={openCEs.length}
        activePCOs={activePCOs.length}
        approvedThisMonth={approvedThisMonth.length}
        netImpact={netImpact}
      />

      {/* Pipeline Board */}
      <div className="grid gap-4 md:grid-cols-2">
        <PipelineColumn
          title="Change Events"
          icon={FileText}
          count={openCEs.length}
          items={topCEs}
          renderItem={(ce: ChangeEvent) => <CECard ce={ce} />}
          overflowHref={`/${projectId}/change-events`}
        />
        <PipelineColumn
          title="Potential COs"
          icon={ScrollText}
          count={activePCOs.length}
          items={topPCOs}
          renderItem={(pco: PCO) => <PCOCard pco={pco} />}
          overflowHref={`/${projectId}/change-orders/pco`}
        />
      </div>

      {/* Recent Activity */}
      <RecentActivity changeEvents={changeEvents} pcos={allPcos} />
    </div>
  );
}
