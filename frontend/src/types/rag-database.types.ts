export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      document_attribution_candidates: {
        Row: {
          attribution_method: string
          candidate_project_id: number | null
          candidate_project_name: string | null
          candidate_target_id: string | null
          compiler_version: string | null
          confidence: number
          confidence_label: string | null
          created_at: string
          evidence: Json
          evidence_terms: string[]
          id: string
          matched_fields: string[]
          reasoning: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_document_id: string
          source_message_ids: string[]
          status: string
          updated_at: string
        }
        Insert: {
          attribution_method: string
          candidate_project_id?: number | null
          candidate_project_name?: string | null
          candidate_target_id?: string | null
          compiler_version?: string | null
          confidence: number
          confidence_label?: string | null
          created_at?: string
          evidence?: Json
          evidence_terms?: string[]
          id?: string
          matched_fields?: string[]
          reasoning?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_document_id: string
          source_message_ids?: string[]
          status?: string
          updated_at?: string
        }
        Update: {
          attribution_method?: string
          candidate_project_id?: number | null
          candidate_project_name?: string | null
          candidate_target_id?: string | null
          compiler_version?: string | null
          confidence?: number
          confidence_label?: string | null
          created_at?: string
          evidence?: Json
          evidence_terms?: string[]
          id?: string
          matched_fields?: string[]
          reasoning?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_document_id?: string
          source_message_ids?: string[]
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      document_chunks: {
        Row: {
          chunk_context: string | null
          chunk_id: string
          chunk_index: number
          content_hash: string | null
          contextualized_at: string | null
          created_at: string | null
          document_id: string
          embedding: unknown
          embedding_contextual: unknown
          metadata: Json | null
          source_type: string | null
          text: string
          updated_at: string | null
        }
        Insert: {
          chunk_context?: string | null
          chunk_id: string
          chunk_index: number
          content_hash?: string | null
          contextualized_at?: string | null
          created_at?: string | null
          document_id: string
          embedding?: unknown
          embedding_contextual?: unknown
          metadata?: Json | null
          source_type?: string | null
          text: string
          updated_at?: string | null
        }
        Update: {
          chunk_context?: string | null
          chunk_id?: string
          chunk_index?: number
          content_hash?: string | null
          contextualized_at?: string | null
          created_at?: string | null
          document_id?: string
          embedding?: unknown
          embedding_contextual?: unknown
          metadata?: Json | null
          source_type?: string | null
          text?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      fireflies_ingestion_jobs: {
        Row: {
          attempt_count: number
          created_at: string
          error_message: string | null
          fireflies_id: string
          id: string
          last_attempt_at: string | null
          metadata_id: string | null
          stage: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          error_message?: string | null
          fireflies_id: string
          id?: string
          last_attempt_at?: string | null
          metadata_id?: string | null
          stage?: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          error_message?: string | null
          fireflies_id?: string
          id?: string
          last_attempt_at?: string | null
          metadata_id?: string | null
          stage?: string
          updated_at?: string
        }
        Relationships: []
      }
      ingestion_dead_letter: {
        Row: {
          created_at: string
          error: string
          id: string
          payload: Json
        }
        Insert: {
          created_at?: string
          error: string
          id?: string
          payload: Json
        }
        Update: {
          created_at?: string
          error?: string
          id?: string
          payload?: Json
        }
        Relationships: []
      }
      ingestion_jobs: {
        Row: {
          content_hash: string | null
          document_id: string | null
          error: string | null
          finished_at: string | null
          fireflies_id: string | null
          id: string
          started_at: string | null
          status: string
        }
        Insert: {
          content_hash?: string | null
          document_id?: string | null
          error?: string | null
          finished_at?: string | null
          fireflies_id?: string | null
          id?: string
          started_at?: string | null
          status?: string
        }
        Update: {
          content_hash?: string | null
          document_id?: string | null
          error?: string | null
          finished_at?: string | null
          fireflies_id?: string | null
          id?: string
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      packet_refresh_jobs: {
        Row: {
          attempt_count: number
          compiler_version: string
          created_at: string
          finished_at: string | null
          id: string
          last_error: string | null
          output_packet_id: string | null
          priority: number
          queued_at: string
          reason: string
          started_at: string | null
          status: string
          target_id: string
          trigger_insight_card_id: string | null
          trigger_source_document_id: string | null
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          compiler_version: string
          created_at?: string
          finished_at?: string | null
          id?: string
          last_error?: string | null
          output_packet_id?: string | null
          priority?: number
          queued_at?: string
          reason: string
          started_at?: string | null
          status?: string
          target_id: string
          trigger_insight_card_id?: string | null
          trigger_source_document_id?: string | null
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          compiler_version?: string
          created_at?: string
          finished_at?: string | null
          id?: string
          last_error?: string | null
          output_packet_id?: string | null
          priority?: number
          queued_at?: string
          reason?: string
          started_at?: string | null
          status?: string
          target_id?: string
          trigger_insight_card_id?: string | null
          trigger_source_document_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rag_document_metadata: {
        Row: {
          app_document_id: string
          category: string | null
          content: string | null
          content_hash: string | null
          content_length: number | null
          created_at: string | null
          document_type: string | null
          embedding_status: string | null
          file_name: string | null
          fireflies_id: string | null
          id: string
          last_content_loaded_at: string | null
          last_indexed_at: string | null
          last_synced_at: string | null
          overview: string | null
          parsing_status: string | null
          processing_metadata: Json
          project_id: number | null
          raw_text: string | null
          source: string | null
          source_item_id: string | null
          source_metadata: Json
          source_system: string | null
          source_web_url: string | null
          storage_bucket: string | null
          storage_path: string | null
          summary: string | null
          summary_embedding: unknown
          title: string | null
          type: string | null
          updated_at: string | null
          url: string | null
        }
        Insert: {
          app_document_id: string
          category?: string | null
          content?: string | null
          content_hash?: string | null
          content_length?: number | null
          created_at?: string | null
          document_type?: string | null
          embedding_status?: string | null
          file_name?: string | null
          fireflies_id?: string | null
          id: string
          last_content_loaded_at?: string | null
          last_indexed_at?: string | null
          last_synced_at?: string | null
          overview?: string | null
          parsing_status?: string | null
          processing_metadata?: Json
          project_id?: number | null
          raw_text?: string | null
          source?: string | null
          source_item_id?: string | null
          source_metadata?: Json
          source_system?: string | null
          source_web_url?: string | null
          storage_bucket?: string | null
          storage_path?: string | null
          summary?: string | null
          summary_embedding?: unknown
          title?: string | null
          type?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          app_document_id?: string
          category?: string | null
          content?: string | null
          content_hash?: string | null
          content_length?: number | null
          created_at?: string | null
          document_type?: string | null
          embedding_status?: string | null
          file_name?: string | null
          fireflies_id?: string | null
          id?: string
          last_content_loaded_at?: string | null
          last_indexed_at?: string | null
          last_synced_at?: string | null
          overview?: string | null
          parsing_status?: string | null
          processing_metadata?: Json
          project_id?: number | null
          raw_text?: string | null
          source?: string | null
          source_item_id?: string | null
          source_metadata?: Json
          source_system?: string | null
          source_web_url?: string | null
          storage_bucket?: string | null
          storage_path?: string | null
          summary?: string | null
          summary_embedding?: unknown
          title?: string | null
          type?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Relationships: []
      }
      rag_pipeline_state: {
        Row: {
          created_at: string | null
          known_files: Json | null
          last_check_time: string | null
          last_run: string | null
          pipeline_id: string
          pipeline_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          known_files?: Json | null
          last_check_time?: string | null
          last_run?: string | null
          pipeline_id: string
          pipeline_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          known_files?: Json | null
          last_check_time?: string | null
          last_run?: string | null
          pipeline_id?: string
          pipeline_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      source_intelligence_jobs: {
        Row: {
          attempt_count: number
          compiler_version: string
          created_at: string
          finished_at: string | null
          id: string
          input_snapshot: Json
          job_type: string
          last_error: string | null
          output_summary: Json
          priority: number
          project_id: number | null
          queued_at: string
          source_document_id: string
          source_hash: string | null
          started_at: string | null
          status: string
          target_id: string | null
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          compiler_version: string
          created_at?: string
          finished_at?: string | null
          id?: string
          input_snapshot?: Json
          job_type: string
          last_error?: string | null
          output_summary?: Json
          priority?: number
          project_id?: number | null
          queued_at?: string
          source_document_id: string
          source_hash?: string | null
          started_at?: string | null
          status?: string
          target_id?: string | null
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          compiler_version?: string
          created_at?: string
          finished_at?: string | null
          id?: string
          input_snapshot?: Json
          job_type?: string
          last_error?: string | null
          output_summary?: Json
          priority?: number
          project_id?: number | null
          queued_at?: string
          source_document_id?: string
          source_hash?: string | null
          started_at?: string | null
          status?: string
          target_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      source_signal_candidates: {
        Row: {
          compiler_version: string
          confidence: string
          confidence_score: number
          created_at: string
          current_status: string
          excerpt: string | null
          extraction_json: Json
          id: string
          next_action: string | null
          normalized_signal_key: string
          project_id: number | null
          promoted_insight_card_id: string | null
          signal_type: string
          source_chunk_id: string | null
          source_document_id: string
          source_occurred_at: string | null
          stale_after: string | null
          status: string
          suggested_owner_label: string | null
          suggested_owner_person_id: string | null
          summary: string
          target_id: string | null
          title: string
          updated_at: string
          why_it_matters: string | null
        }
        Insert: {
          compiler_version: string
          confidence: string
          confidence_score: number
          created_at?: string
          current_status?: string
          excerpt?: string | null
          extraction_json?: Json
          id?: string
          next_action?: string | null
          normalized_signal_key: string
          project_id?: number | null
          promoted_insight_card_id?: string | null
          signal_type: string
          source_chunk_id?: string | null
          source_document_id: string
          source_occurred_at?: string | null
          stale_after?: string | null
          status?: string
          suggested_owner_label?: string | null
          suggested_owner_person_id?: string | null
          summary: string
          target_id?: string | null
          title: string
          updated_at?: string
          why_it_matters?: string | null
        }
        Update: {
          compiler_version?: string
          confidence?: string
          confidence_score?: number
          created_at?: string
          current_status?: string
          excerpt?: string | null
          extraction_json?: Json
          id?: string
          next_action?: string | null
          normalized_signal_key?: string
          project_id?: number | null
          promoted_insight_card_id?: string | null
          signal_type?: string
          source_chunk_id?: string | null
          source_document_id?: string
          source_occurred_at?: string | null
          stale_after?: string | null
          status?: string
          suggested_owner_label?: string | null
          suggested_owner_person_id?: string | null
          summary?: string
          target_id?: string | null
          title?: string
          updated_at?: string
          why_it_matters?: string | null
        }
        Relationships: []
      }
      source_sync_health_snapshots: {
        Row: {
          created_at: string
          generated_at: string
          id: string
          items_synced: number
          last_error_at: string | null
          last_error_message: string | null
          last_success_at: string | null
          last_sync_at: string | null
          metadata: Json
          resource_id: string
          resource_name: string | null
          source: string
          stale_minutes: number | null
          status: string
          uncompiled_count: number
          unembedded_count: number
          unprocessed_count: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          generated_at?: string
          id?: string
          items_synced?: number
          last_error_at?: string | null
          last_error_message?: string | null
          last_success_at?: string | null
          last_sync_at?: string | null
          metadata?: Json
          resource_id?: string
          resource_name?: string | null
          source: string
          stale_minutes?: number | null
          status?: string
          uncompiled_count?: number
          unembedded_count?: number
          unprocessed_count?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          generated_at?: string
          id?: string
          items_synced?: number
          last_error_at?: string | null
          last_error_message?: string | null
          last_success_at?: string | null
          last_sync_at?: string | null
          metadata?: Json
          resource_id?: string
          resource_name?: string | null
          source?: string
          stale_minutes?: number | null
          status?: string
          uncompiled_count?: number
          unembedded_count?: number
          unprocessed_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      source_sync_runs: {
        Row: {
          created_at: string
          error_code: string | null
          error_message: string | null
          finished_at: string | null
          id: string
          items_created: number
          items_failed: number
          items_seen: number
          items_skipped: number
          items_synced: number
          items_updated: number
          metadata: Json
          resource_id: string
          resource_name: string | null
          source: string
          stage: string
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          items_created?: number
          items_failed?: number
          items_seen?: number
          items_skipped?: number
          items_synced?: number
          items_updated?: number
          metadata?: Json
          resource_id?: string
          resource_name?: string | null
          source: string
          stage: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          items_created?: number
          items_failed?: number
          items_seen?: number
          items_skipped?: number
          items_synced?: number
          items_updated?: number
          metadata?: Json
          resource_id?: string
          resource_name?: string | null
          source?: string
          stage?: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_document_chunks: {
        Args: {
          filter_project_id?: number
          filter_source_types?: string[]
          match_count?: number
          match_threshold?: number
          query_embedding: unknown
        }
        Returns: {
          chunk_id: string
          chunk_index: number
          chunk_text: string
          doc_category: string
          doc_created_at: string
          doc_date: string
          doc_metadata: Json
          doc_project_id: number
          doc_source: string
          doc_title: string
          document_id: string
          similarity: number
          source_type: string
        }[]
      }
      search_document_chunks_contextual: {
        Args: {
          filter_project_id?: number
          filter_source_types?: string[]
          match_count?: number
          match_threshold?: number
          query_embedding: unknown
        }
        Returns: {
          chunk_id: string
          chunk_index: number
          chunk_text: string
          doc_category: string
          doc_created_at: string
          doc_date: string
          doc_metadata: Json
          doc_project_id: number
          doc_source: string
          doc_title: string
          document_id: string
          similarity: number
          source_type: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
