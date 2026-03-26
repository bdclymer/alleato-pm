import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type Decision = Record<string, unknown>;
export type DocumentMetadata =
  Database["public"]["Tables"]["document_metadata"]["Row"];

export interface DecisionWithMetadata extends Decision {
  document_metadata: Pick<
    DocumentMetadata,
    "id" | "title" | "date" | "type" | "project"
  > | null;
}

/**
 * Get all decisions with meeting metadata, ordered by creation date (newest first)
 */
export async function getDecisions(): Promise<DecisionWithMetadata[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("decisions" as any)
    .select(
      `
      *,
      document_metadata:metadata_id (
        id,
        title,
        date,
        type,
        project
      )
    `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data as DecisionWithMetadata[];
}

/**
 * Get decisions by status
 */
export async function getDecisionsByStatus(status: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("decisions" as any)
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Get a single decision by ID
 */
export async function getDecisionById(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("decisions" as any)
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Get decisions by project
 */
export async function getDecisionsByProject(projectId: number) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("decisions" as any)
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}
