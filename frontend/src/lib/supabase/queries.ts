/**
 * Typed Database Query Helpers
 *
 * This module provides type-safe, reusable query functions for common database operations.
 * All functions use the service client to bypass RLS in server components.
 *
 * Benefits:
 * - Centralized query logic prevents duplication
 * - Type-safe return values from generated types
 * - Consistent error handling patterns
 * - Easy to test and mock
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

// =============================================================================
// Project Queries
// =============================================================================

export async function getProjectById(
  supabase: SupabaseClient<Database>,
  projectId: number,
) {
  return supabase
    .from("projects")
    .select(`
      id,
      name,
      project_number,
      client,
      client_id,
      phase,
      state,
      address,
      budget,
      budget_used,
      health_status,
      health_score,
      completion_percentage,
      project_manager,
      created_at,
      archived
    `)
    .eq("id", projectId)
    .single();
}

export async function getProjectWithDetails(
  supabase: SupabaseClient<Database>,
  projectId: number,
) {
  // Note: commitments table no longer exists - use subcontracts and purchase_orders
  return supabase
    .from("projects")
    .select(
      `
      *,
      project_tasks (count),
      subcontracts (count),
      purchase_orders (count),
      contracts (count)
    `,
    )
    .eq("id", projectId)
    .single();
}

// =============================================================================
// Task Queries
// =============================================================================

export async function getProjectTasks(
  supabase: SupabaseClient<Database>,
  projectId: number,
  options?: {
    status?: string;
    priority?: string;
    limit?: number;
  },
) {
  let query = supabase
    .from("project_tasks")
    .select("*")
    .eq("project_id", projectId);

  if (options?.status) {
    query = query.eq("status", options.status);
  }
  if (options?.priority) {
    query = query.eq("priority", options.priority);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  return query.order("created_at", { ascending: false });
}

// =============================================================================
// Meeting Queries
// =============================================================================

export async function getProjectMeetings(
  supabase: SupabaseClient<Database>,
  projectId: number,
  options?: {
    limit?: number;
  },
) {
  let query = supabase
    .from("document_metadata")
    .select("*")
    .eq("project_id", projectId)
    .eq("type", "meeting");

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  return query.order("date", { ascending: false });
}

export async function getMeetingById(
  supabase: SupabaseClient<Database>,
  meetingId: string,
) {
  return supabase
    .from("document_metadata")
    .select("*")
    .eq("id", meetingId)
    .single();
}

export async function getMeetingSegments(
  supabase: SupabaseClient<Database>,
  metadataId: string,
) {
  return supabase
    .from("meeting_segments")
    .select("*")
    .eq("metadata_id", metadataId)
    .order("segment_index", { ascending: true });
}

// =============================================================================
// Contract & Commitment Queries
// =============================================================================

export async function getProjectContracts(
  supabase: SupabaseClient<Database>,
  projectId: number,
) {
  return supabase
    .from("contracts")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
}

export async function getProjectCommitments(
  supabase: SupabaseClient<Database>,
  projectId: number,
) {
  // Query from commitments_unified view which combines subcontracts and purchase_orders
  return supabase
    .from("commitments_unified")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
}

export async function getProjectSubcontracts(
  supabase: SupabaseClient<Database>,
  projectId: number,
) {
  return supabase
    .from("subcontracts")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
}

export async function getProjectPurchaseOrders(
  supabase: SupabaseClient<Database>,
  projectId: number,
) {
  return supabase
    .from("purchase_orders")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
}

// =============================================================================
// RFI Queries
// =============================================================================

export async function getProjectRfis(
  supabase: SupabaseClient<Database>,
  projectId: number,
  options?: {
    status?: string;
    limit?: number;
  },
) {
  let query = supabase.from("rfis").select("*").eq("project_id", projectId);

  if (options?.status) {
    query = query.eq("status", options.status);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  return query.order("created_at", { ascending: false });
}

// =============================================================================
// Change Order Queries
// =============================================================================

export async function getProjectChangeOrders(
  supabase: SupabaseClient<Database>,
  projectId: number,
) {
  return supabase
    .from("change_orders")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
}

// =============================================================================
// Budget Queries
// =============================================================================

// Note: Budget queries use direct supabase calls to avoid deep type instantiation issues.
// Use supabase.from('budget_line_items').select('*').eq('project_id', numericProjectId) directly.

// =============================================================================
// Schedule Queries
// =============================================================================

export async function getProjectSchedule(
  supabase: SupabaseClient<Database>,
  projectId: number,
) {
  return supabase
    .from("schedule_tasks")
    .select("*")
    .eq("project_id", projectId)
    .order("start_date", { ascending: true });
}

// =============================================================================
// Insight Queries
// =============================================================================

export async function getProjectInsights(
  supabase: SupabaseClient<Database>,
  projectId: number,
  options?: {
    limit?: number;
  },
) {
  let query = supabase
    .from("ai_insights")
    .select("*")
    .eq("project_id", projectId);

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  return query.order("created_at", { ascending: false });
}

// =============================================================================
// Daily Log Queries
// =============================================================================

export async function getProjectDailyLogs(
  supabase: SupabaseClient<Database>,
  projectId: number,
  options?: {
    limit?: number;
  },
) {
  let query = supabase
    .from("daily_logs")
    .select("*")
    .eq("project_id", projectId);

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  return query.order("log_date", { ascending: false });
}
