"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CompanyContext {
  id: string;
  mission: string | null;
  vision: string | null;
  company_history: string | null;
  core_values: unknown[] | null;
  key_differentiators: unknown[] | null;
  competitive_landscape: unknown[] | null;
  target_markets: unknown[] | null;
  goals: unknown | null;
  okrs: unknown | null;
  strategic_initiatives: unknown | null;
  org_structure: unknown | null;
  policies: unknown | null;
  resource_constraints: unknown | null;
  annual_revenue_range: string | null;
  employee_count: number | null;
  founded_year: number | null;
  headquarters: string | null;
  service_areas: unknown[] | null;
  certifications: unknown[] | null;
  key_clients: unknown[] | null;
  notes: string | null;
  updated_at: string | null;
}

export type KnowledgeCategory =
  | "strategy"
  | "policy"
  | "process"
  | "market_intel"
  | "lessons_learned"
  | "best_practice"
  | "org_update"
  | "general";

export interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  category: KnowledgeCategory;
  tags: string[] | null;
  source: string | null;
  author_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Company Context (singleton profile)
// ---------------------------------------------------------------------------

export function useCompanyContext() {
  return useQuery({
    queryKey: ["company-context"],
    queryFn: async (): Promise<CompanyContext | null> => {
      const res = await fetch("/api/admin/company-context");
      if (!res.ok) throw new Error("Failed to fetch company context");
      const json = await res.json();
      return json.data;
    },
  });
}

export function useUpdateCompanyContext() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Partial<CompanyContext>) => {
      const res = await fetch("/api/admin/company-context", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update company context");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-context"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Knowledge Articles
// ---------------------------------------------------------------------------

export function useKnowledgeArticles(filters?: {
  category?: string;
  search?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.category && filters.category !== "all") {
    params.set("category", filters.category);
  }
  if (filters?.search) {
    params.set("search", filters.search);
  }

  return useQuery({
    queryKey: ["company-knowledge", filters?.category, filters?.search],
    queryFn: async (): Promise<KnowledgeArticle[]> => {
      const res = await fetch(
        `/api/admin/company-knowledge?${params.toString()}`,
      );
      if (!res.ok) throw new Error("Failed to fetch knowledge articles");
      const json = await res.json();
      return json.data;
    },
  });
}

export function useCreateKnowledgeArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      article: Pick<KnowledgeArticle, "title" | "content" | "category"> & {
        tags?: string[];
        source?: string;
      },
    ) => {
      const res = await fetch("/api/admin/company-knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(article),
      });
      if (!res.ok) throw new Error("Failed to create knowledge article");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-knowledge"] });
    },
  });
}

export function useUpdateKnowledgeArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      update: { id: string } & Partial<KnowledgeArticle>,
    ) => {
      const res = await fetch("/api/admin/company-knowledge", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      if (!res.ok) throw new Error("Failed to update knowledge article");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-knowledge"] });
    },
  });
}

export function useDeleteKnowledgeArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(
        `/api/admin/company-knowledge?id=${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Failed to delete knowledge article");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-knowledge"] });
    },
  });
}
