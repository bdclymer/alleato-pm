"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/types/database.types";

export interface PermissionTemplate {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean | null;
  scope: string | null;
  rules_json: Json;
  created_at: string | null;
  updated_at: string | null;
}

export function usePermissionTemplates(projectId?: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["permission-templates", projectId],
    queryFn: async () => {
      let query = supabase
        .from("permission_templates")
        .select("*")
        .order("name");

      // Filter by scope if projectId is provided
      if (projectId) {
        query = query.or(`scope.eq.project,scope.eq.global`);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      return (data || []) as PermissionTemplate[];
    },
    enabled: true,
  });
}
