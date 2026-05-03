"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import type {
  ProgressReportAllListResponse,
  ProgressReportDetailResponse,
  ProgressReportListResponse,
} from "@/lib/progress-reports/types";

export const progressReportKeys = {
  globalList: () => ["progress-reports", "global-list"] as const,
  all: (projectId: number) => ["progress-reports", projectId] as const,
  list: (projectId: number) => ["progress-reports", projectId, "list"] as const,
  detail: (projectId: number, reportId: string) =>
    ["progress-reports", projectId, "detail", reportId] as const,
};

export function useAllProgressReports() {
  return useQuery({
    queryKey: progressReportKeys.globalList(),
    queryFn: ({ signal }) =>
      apiFetch<ProgressReportAllListResponse>("/api/progress-reports", { signal }),
  });
}

export function useProgressReports(projectId: number) {
  return useQuery({
    queryKey: progressReportKeys.list(projectId),
    queryFn: ({ signal }) =>
      apiFetch<ProgressReportListResponse>(
        `/api/projects/${projectId}/progress-reports`,
        { signal },
      ),
    enabled: Boolean(projectId),
  });
}

export function useProgressReport(projectId: number, reportId: string) {
  return useQuery({
    queryKey: progressReportKeys.detail(projectId, reportId),
    queryFn: ({ signal }) =>
      apiFetch<ProgressReportDetailResponse>(
        `/api/projects/${projectId}/progress-reports/${reportId}`,
        { signal },
      ),
    enabled: Boolean(projectId) && Boolean(reportId),
  });
}

export function useCreateProgressReport(projectId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body?: { weekStart?: string; weekEnd?: string }) =>
      apiFetch<{ reportId: string }>(
        `/api/projects/${projectId}/progress-reports`,
        {
          method: "POST",
          body: JSON.stringify(body ?? {}),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: progressReportKeys.all(projectId) });
      toast.success("Progress report draft created");
    },
    onError: (error: Error) => {
      toast.error("Could not create progress report", { description: error.message });
    },
  });
}

export function useUpdateProgressReport(projectId: number, reportId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<ProgressReportDetailResponse>(
        `/api/projects/${projectId}/progress-reports/${reportId}`,
        {
          method: "PUT",
          body: JSON.stringify(body),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: progressReportKeys.all(projectId) });
      queryClient.invalidateQueries({
        queryKey: progressReportKeys.detail(projectId, reportId),
      });
      toast.success("Progress report saved");
    },
    onError: (error: Error) => {
      toast.error("Could not save progress report", { description: error.message });
    },
  });
}
