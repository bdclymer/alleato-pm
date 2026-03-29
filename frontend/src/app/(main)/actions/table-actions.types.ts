import type { Database } from "@/types/database.types";

// Generic types for table operations
export type TableName = keyof Database["public"]["Tables"];

export type TableRow<T extends TableName> = Database["public"]["Tables"][T]["Row"];
export type TableInsert<T extends TableName> = Database["public"]["Tables"][T]["Insert"];
export type TableUpdate<T extends TableName> = Database["public"]["Tables"][T]["Update"];

// Specific table data types
export interface MeetingData {
  title?: string;
  date?: string;
  location?: string;
  attendees?: string[];
  notes?: string;
  status?: "scheduled" | "completed" | "cancelled";
}

export interface ProjectData {
  name?: string;
  project_number?: string;
  client?: string;
  client_id?: string;
  phase?: string;
  state?: string;
  address?: string;
  budget?: number;
  health_status?: string;
  health_score?: number;
  completion_percentage?: number;
  project_manager?: number;
  archived?: boolean;
}

export interface CompanyData {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  type?: string;
  phone?: string;
  email?: string;
  website?: string;
}

// Response types
export interface ActionResponse<T = unknown> {
  success?: boolean;
  error?: string;
  data?: T;
}

export type UpdateResponse = ActionResponse;
export type DeleteResponse = ActionResponse;
export type CreateResponse<T> = ActionResponse<T>;