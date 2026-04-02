"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useProjectChangeEvents } from "@/hooks/use-change-events";
import type { ChangeEvent } from "@/types/change-events";

// =============================================================================
// Types
// =============================================================================

export interface PrimeContractCO {
  id: number;
  project_id: number;
  pcco_number: string;
  title: string;
  status: string;
  total_amount: number | null;
  contract_id: number | null;
  prime_contract_id: number | null;
  executed: boolean | null;
  submitted_at: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string | null;
}

export type PipelineStage = "change_event" | "prime_co" | "commitment_co";

export interface StageSummary {
  stage: PipelineStage;
  label: string;
  total: number;
  active: number;
  value: number;
  items: PipelineItem[];
}

export interface PipelineItem {
  id: string;
  stage: PipelineStage;
  number: string;
  title: string;
  status: string;
  value: number;
  updatedAt: string;
}

export interface ChangeManagementMetrics {
  totalCEs: number;
  openCEs: number;
  totalPrimeCOs: number;
  approvedPrimeCOs: number;
  totalCommitmentCOs: number;
  approvedCommitmentCOs: number;
  netContractImpact: number;
  conversionRate: number;
  avgCycleTimeDays: number | null;
}

// =============================================================================
// Internal hooks
// =============================================================================

function usePrimeCOs(projectId: string) {
  return useQuery<PrimeContractCO[]>({
    queryKey: ["prime-contract-change-orders", projectId],
    queryFn: async () => {
      const res = await fetch(
        `/api/projects/${projectId}/prime-contract-change-orders`,
      );
      if (!res.ok) throw new Error("Failed to fetch Prime COs");
      return res.json();
    },
    enabled: !!projectId,
  });
}

interface CommitmentCO {
  id: number;
  project_id: number | null;
  contract_id: number | null;
  co_number: string | null;
  title: string | null;
  description: string | null;
  amount: number | null;
  status: string | null;
  due_date: string | null;
  change_event_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

function useCommitmentCOs(projectId: string) {
  return useQuery<CommitmentCO[]>({
    queryKey: ["commitment-change-orders", projectId],
    queryFn: async () => {
      // No project-level list API for commitment COs — query Supabase directly
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data, error } = await supabase
        .from("contract_change_orders")
        .select("*")
        .eq("project_id", Number(projectId))
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!projectId,
  });
}

// =============================================================================
// Helpers
// =============================================================================

function isOpenCE(ce: ChangeEvent): boolean {
  const s = (ce.status ?? "").toLowerCase();
  return s !== "closed" && s !== "converted" && s !== "rejected";
}

function isApprovedPrimeCO(co: PrimeContractCO): boolean {
  const s = (co.status ?? "").toLowerCase();
  return s === "approved" || s === "executed";
}

function isApprovedCommitmentCO(co: CommitmentCO): boolean {
  const s = (co.status ?? "").toLowerCase();
  return s === "approved" || s === "executed";
}

function ceToPipelineItem(ce: ChangeEvent): PipelineItem {
  return {
    id: `ce-${ce.id}`,
    stage: "change_event",
    number: ce.number ?? `CE-${ce.id}`,
    title: ce.title ?? "Untitled",
    status: ce.status ?? "Open",
    value: ce.cost_rom ?? ce.rom ?? ce.total ?? 0,
    updatedAt: ce.updated_at ?? ce.created_at ?? "",
  };
}

function primeCOToPipelineItem(co: PrimeContractCO): PipelineItem {
  return {
    id: `pco-${co.id}`,
    stage: "prime_co",
    number: co.pcco_number ?? `PCCO-${co.id}`,
    title: co.title ?? "Untitled",
    status: co.status ?? "Draft",
    value: co.total_amount ?? 0,
    updatedAt: co.updated_at ?? co.created_at,
  };
}

function commitmentCOToPipelineItem(co: CommitmentCO): PipelineItem {
  return {
    id: `cco-${co.id}`,
    stage: "commitment_co",
    number: co.co_number ?? `CCO-${co.id}`,
    title: co.title ?? "Untitled",
    status: co.status ?? "draft",
    value: co.amount ?? 0,
    updatedAt: co.updated_at ?? co.created_at ?? "",
  };
}

function sortByDate(a: { updatedAt: string }, b: { updatedAt: string }) {
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

// =============================================================================
// Main hook
// =============================================================================

export function useChangeManagement(projectId: string) {
  const numericId = Number(projectId);
  const { changeEvents, isLoading: cesLoading } =
    useProjectChangeEvents(numericId);
  const { data: primeCOs, isLoading: primeCOsLoading } =
    usePrimeCOs(projectId);
  const { data: commitmentCOs, isLoading: commitmentCOsLoading } =
    useCommitmentCOs(projectId);

  const isLoading = cesLoading || primeCOsLoading || commitmentCOsLoading;

  const allCEs = changeEvents ?? [];
  const allPrimeCOs = primeCOs ?? [];
  const allCommitmentCOs = commitmentCOs ?? [];

  const metrics: ChangeManagementMetrics = useMemo(() => {
    const openCEs = allCEs.filter(isOpenCE).length;
    const approvedPrime = allPrimeCOs.filter(isApprovedPrimeCO);
    const approvedCommitment = allCommitmentCOs.filter(isApprovedCommitmentCO);
    const netImpact = approvedPrime.reduce(
      (sum, co) => sum + (co.total_amount ?? 0),
      0,
    );

    const convertedCEs = allCEs.filter(
      (ce) => (ce.status ?? "").toLowerCase() === "converted",
    ).length;
    const conversionRate =
      allCEs.length > 0 ? (convertedCEs / allCEs.length) * 100 : 0;

    // Avg cycle time: approved Prime COs with both created_at and approved_at
    const withDates = approvedPrime.filter((co) => co.approved_at);
    const avgCycle =
      withDates.length > 0
        ? withDates.reduce((sum, co) => {
            const created = new Date(co.created_at).getTime();
            const approved = new Date(co.approved_at!).getTime();
            return sum + (approved - created) / (1000 * 60 * 60 * 24);
          }, 0) / withDates.length
        : null;

    return {
      totalCEs: allCEs.length,
      openCEs,
      totalPrimeCOs: allPrimeCOs.length,
      approvedPrimeCOs: approvedPrime.length,
      totalCommitmentCOs: allCommitmentCOs.length,
      approvedCommitmentCOs: approvedCommitment.length,
      netContractImpact: netImpact,
      conversionRate,
      avgCycleTimeDays: avgCycle !== null ? Math.round(avgCycle) : null,
    };
  }, [allCEs, allPrimeCOs, allCommitmentCOs]);

  const stages: StageSummary[] = useMemo(() => {
    const ceItems = allCEs.map(ceToPipelineItem).sort(sortByDate);
    const primeItems = allPrimeCOs.map(primeCOToPipelineItem).sort(sortByDate);
    const commitItems = allCommitmentCOs
      .map(commitmentCOToPipelineItem)
      .sort(sortByDate);

    return [
      {
        stage: "change_event" as const,
        label: "Change Events",
        total: allCEs.length,
        active: allCEs.filter(isOpenCE).length,
        value: ceItems.reduce((s, i) => s + i.value, 0),
        items: ceItems,
      },
      {
        stage: "prime_co" as const,
        label: "Prime Contract COs",
        total: allPrimeCOs.length,
        active: allPrimeCOs.filter(isApprovedPrimeCO).length,
        value: primeItems.reduce((s, i) => s + i.value, 0),
        items: primeItems,
      },
      {
        stage: "commitment_co" as const,
        label: "Commitment COs",
        total: allCommitmentCOs.length,
        active: allCommitmentCOs.filter(isApprovedCommitmentCO).length,
        value: commitItems.reduce((s, i) => s + i.value, 0),
        items: commitItems,
      },
    ];
  }, [allCEs, allPrimeCOs, allCommitmentCOs]);

  const recentActivity: PipelineItem[] = useMemo(() => {
    const all = [
      ...allCEs.map(ceToPipelineItem),
      ...allPrimeCOs.map(primeCOToPipelineItem),
      ...allCommitmentCOs.map(commitmentCOToPipelineItem),
    ];
    return all
      .filter((i) => i.updatedAt)
      .sort(sortByDate)
      .slice(0, 10);
  }, [allCEs, allPrimeCOs, allCommitmentCOs]);

  return { isLoading, metrics, stages, recentActivity };
}
