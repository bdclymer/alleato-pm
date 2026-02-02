# Database Schema

      ai_analysis_jobs: {
        Row: {
          completed_at: string | null
          confidence_metrics: Json | null
          config: Json | null
          created_at: string | null
          error_message: string | null
          id: string
          input_data: Json | null
          job_type: string
          model_version: string | null
          processing_time_ms: number | null
          results: Json | null
          started_at: string | null
          status: string | null
          submittal_id: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_analysis_jobs_submittal_id_fkey"
            columns: ["submittal_id"]
            isOneToOne: false
            referencedRelation: "active_submittals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_analysis_jobs_submittal_id_fkey"
            columns: ["submittal_id"]
            isOneToOne: false
            referencedRelation: "submittals"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_insights: {
        Row: {
          assigned_to: string | null
          assignee: string | null
          business_impact: string | null
          chunks_id: string | null
          confidence_score: number | null
          created_at: string | null
          cross_project_impact: number[] | null
          dependencies: Json | null
          description: string
          document_id: string | null
          due_date: string | null
          exact_quotes: Json | null
          exact_quotes_text: string | null
          financial_impact: number | null
          id: number
          insight_type: string | null
          meeting_date: string | null
          meeting_id: string | null
          meeting_name: string | null
          metadata: Json | null
          numerical_data: Json | null
          project_id: number | null
          project_name: string | null
          resolved: number | null
          resolved_at: string | null
          severity: string | null
          source_meetings: string | null
          stakeholders_affected: string[] | null
          status: string | null
          timeline_impact_days: number | null
          title: string
          urgency_indicators: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_chunks_id_fkey"
            columns: ["chunks_id"]
            isOneToOne: false
            referencedRelation: "chunks"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_models: {
        Row: {
          config: Json | null
          created_at: string | null
          deployment_date: string | null
          description: string | null
          id: string
          is_active: boolean | null
          model_type: string
          name: string
          performance_metrics: Json | null
          version: string
        }
        Relationships: []
      }
      ai_tasks: {
        Row: {
          assignee: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          metadata: Json
          project_id: number | null
          source_document_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "ai_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "ai_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "document_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "document_metadata_manual_only"
            referencedColumns: ["id"]
          },
        ]
      }
      app_users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          email_verified: boolean | null
          full_name: string | null
          id: string
          name: string | null
          password_hash: string
          role: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          email_verified?: boolean | null
          full_name?: string | null
          id?: string
          name?: string | null
          password_hash: string
          role?: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          email_verified?: boolean | null
          full_name?: string | null
          id?: string
          name?: string | null
          password_hash?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      archon_code_examples: {
        Row: {
          chunk_number: number
          content: string
          created_at: string
          embedding: string | null
          id: number
          metadata: Json
          source_id: string
          summary: string
          url: string
        }
        Insert: {
          chunk_number: number
          content: string
          created_at?: string
          embedding?: string | null
          id?: number
          metadata?: Json
          source_id: string
          summary: string
          url: string
        }
        Update: {
          chunk_number?: number
          content?: string
          created_at?: string
          embedding?: string | null
          id?: number
          metadata?: Json
          source_id?: string
          summary?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "archon_code_examples_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "archon_sources"
            referencedColumns: ["source_id"]
          },
        ]
      }
      archon_crawled_pages: {
        Row: {
          chunk_number: number
          content: string
          created_at: string
          embedding: string | null
          id: number
          metadata: Json
          source_id: string
          url: string
        }
        Insert: {
          chunk_number: number
          content: string
          created_at?: string
          embedding?: string | null
          id?: number
          metadata?: Json
          source_id: string
          url: string
        }
        Update: {
          chunk_number?: number
          content?: string
          created_at?: string
          embedding?: string | null
          id?: number
          metadata?: Json
          source_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "archon_crawled_pages_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "archon_sources"
            referencedColumns: ["source_id"]
          },
        ]
      }

      asrs_blocks: {
        Row: {
          block_type: string
          html: string | null
          id: string
          meta: Json | null
          ordinal: number
          section_id: string
          source_text: string | null
        }
        Insert: {
          block_type: string
          html?: string | null
          id?: string
          meta?: Json | null
          ordinal: number
          section_id: string
          source_text?: string | null
        }
        Update: {
          block_type?: string
          html?: string | null
          id?: string
          meta?: Json | null
          ordinal?: number
          section_id?: string
          source_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asrs_blocks_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "asrs_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      asrs_configurations: {
        Row: {
          asrs_type: string
          config_name: string
          container_types: string[] | null
          cost_multiplier: number | null
          created_at: string | null
          id: string
          max_height_ft: number | null
          typical_applications: string[] | null
        }
        Insert: {
          asrs_type: string
          config_name: string
          container_types?: string[] | null
          cost_multiplier?: number | null
          created_at?: string | null
          id?: string
          max_height_ft?: number | null
          typical_applications?: string[] | null
        }
        Update: {
          asrs_type?: string
          config_name?: string
          container_types?: string[] | null
          cost_multiplier?: number | null
          created_at?: string | null
          id?: string
          max_height_ft?: number | null
          typical_applications?: string[] | null
        }
        Relationships: []
      }
      asrs_decision_matrix: {
        Row: {
          asrs_type: string
          container_type: string
          created_at: string | null
          figure_number: number
          id: string
          max_depth_ft: number
          max_spacing_ft: number
          page_number: number
          requires_flue_spaces: boolean | null
          requires_vertical_barriers: boolean | null
          sprinkler_count: number
          sprinkler_numbering: string | null
          title: string | null
        }
        Insert: {
          asrs_type: string
          container_type: string
          created_at?: string | null
          figure_number: number
          id?: string
          max_depth_ft: number
          max_spacing_ft: number
          page_number: number
          requires_flue_spaces?: boolean | null
          requires_vertical_barriers?: boolean | null
          sprinkler_count: number
          sprinkler_numbering?: string | null
          title?: string | null
        }
        Update: {
          asrs_type?: string
          container_type?: string
          created_at?: string | null
          figure_number?: number
          id?: string
          max_depth_ft?: number
          max_spacing_ft?: number
          page_number?: number
          requires_flue_spaces?: boolean | null
          requires_vertical_barriers?: boolean | null
          sprinkler_count?: number
          sprinkler_numbering?: string | null
          title?: string | null
        }
        Relationships: []
      }
      asrs_logic_cards: {
        Row: {
          citations: Json
          clause_id: string | null
          decision: Json
          doc: string
          id: number
          inputs: Json
          inserted_at: string
          page: number | null
          preconditions: Json
          purpose: string
          related_figure_ids: string[] | null
          related_table_ids: string[] | null
          section_id: string | null
          updated_at: string
          version: string
        }
        Insert: {
          citations: Json
          clause_id?: string | null
          decision: Json
          doc?: string
          id?: number
          inputs: Json
          inserted_at?: string
          page?: number | null
          preconditions: Json
          purpose: string
          related_figure_ids?: string[] | null
          related_table_ids?: string[] | null
          section_id?: string | null
          updated_at?: string
          version?: string
        }
        Update: {
          citations?: Json
          clause_id?: string | null
          decision?: Json
          doc?: string
          id?: number
          inputs?: Json
          inserted_at?: string
          page?: number | null
          preconditions?: Json
          purpose?: string
          related_figure_ids?: string[] | null
          related_table_ids?: string[] | null
          section_id?: string | null
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "asrs_logic_cards_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "asrs_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      asrs_protection_rules: {
        Row: {
          area_ft2: number | null
          asrs_type: string | null
          ceiling_height_max: number | null
          ceiling_height_min: number | null
          commodity_class: string | null
          container_material: string | null
          container_top: string | null
          container_wall: string | null
          density_gpm_ft2: number | null
          id: string
          k_factor: number | null
          notes: string | null
          pressure_psi: number | null
          section_id: string
          sprinkler_scheme: string | null
        }
        Insert: {
          area_ft2?: number | null
          asrs_type?: string | null
          ceiling_height_max?: number | null
          ceiling_height_min?: number | null
          commodity_class?: string | null
          container_material?: string | null
          container_top?: string | null
          container_wall?: string | null
          density_gpm_ft2?: number | null
          id?: string
          k_factor?: number | null
          notes?: string | null
          pressure_psi?: number | null
          section_id: string
          sprinkler_scheme?: string | null
        }
        Update: {
          area_ft2?: number | null
          asrs_type?: string | null
          ceiling_height_max?: number | null
          ceiling_height_min?: number | null
          commodity_class?: string | null
          container_material?: string | null
          container_top?: string | null
          container_wall?: string | null
          density_gpm_ft2?: number | null
          id?: string
          k_factor?: number | null
          notes?: string | null
          pressure_psi?: number | null
          section_id?: string
          sprinkler_scheme?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asrs_protection_rules_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "asrs_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      asrs_sections: {
        Row: {
          id: string
          number: string
          parent_id: string | null
          slug: string
          sort_key: number
          title: string
        }
        Insert: {
          id?: string
          number: string
          parent_id?: string | null
          slug: string
          sort_key: number
          title: string
        }
        Update: {
          id?: string
          number?: string
          parent_id?: string | null
          slug?: string
          sort_key?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "asrs_sections_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "asrs_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          attached_to_id: string | null
          attached_to_table: string | null
          file_name: string | null
          id: string
          project_id: number | null
          uploaded_at: string | null
          uploaded_by: string | null
          url: string | null
        }
        Insert: {
          attached_to_id?: string | null
          attached_to_table?: string | null
          file_name?: string | null
          id?: string
          project_id?: number | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          url?: string | null
        }
        Update: {
          attached_to_id?: string | null
          attached_to_table?: string | null
          file_name?: string | null
          id?: string
          project_id?: number | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attachments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "attachments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "attachments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_periods: {
        Row: {
          closed_by: string | null
          closed_date: string | null
          created_at: string | null
          end_date: string
          id: string
          is_closed: boolean | null
          period_number: number
          project_id: number | null
          start_date: string
          updated_at: string | null
        }
        Insert: {
          closed_by?: string | null
          closed_date?: string | null
          created_at?: string | null
          end_date: string
          id?: string
          is_closed?: boolean | null
          period_number: number
          project_id?: number | null
          start_date: string
          updated_at?: string | null
        }
        Update: {
          closed_by?: string | null
          closed_date?: string | null
          created_at?: string | null
          end_date?: string
          id?: string
          is_closed?: boolean | null
          period_number?: number
          project_id?: number | null
          start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_periods_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_periods_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "billing_periods_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_periods_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_periods_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "billing_periods_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_periods_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_periods_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      block_embeddings: {
        Row: {
          block_id: string
          embedding: string | null
        }
        Insert: {
          block_id: string
          embedding?: string | null
        }
        Update: {
          block_id?: string
          embedding?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "block_embeddings_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: true
            referencedRelation: "asrs_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      briefing_runs: {
        Row: {
          briefing_id: string | null
          error: string | null
          finished_at: string | null
          id: string
          input_doc_ids: string[] | null
          project_id: number | null
          started_at: string | null
          status: string | null
          token_usage: Json | null
        }
        Insert: {
          briefing_id?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          input_doc_ids?: string[] | null
          project_id?: number | null
          started_at?: string | null
          status?: string | null
          token_usage?: Json | null
        }
        Update: {
          briefing_id?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          input_doc_ids?: string[] | null
          project_id?: number | null
          started_at?: string | null
          status?: string | null
          token_usage?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "briefing_runs_briefing_id_fkey"
            columns: ["briefing_id"]
            isOneToOne: false
            referencedRelation: "project_briefings"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_lines: {
        Row: {
          cost_code_id: string
          cost_type_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          original_amount: number
          project_id: number
          sub_job_id: string | null
          sub_job_key: string | null
          updated_at: string
        }
        Insert: {
          cost_code_id: string
          cost_type_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          original_amount?: number
          project_id: number
          sub_job_id?: string | null
          sub_job_key?: string | null
          updated_at?: string
        }
        Update: {
          cost_code_id?: string
          cost_type_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          original_amount?: number
          project_id?: number
          sub_job_id?: string | null
          sub_job_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_lines_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes_with_division_title"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_cost_type_id_fkey"
            columns: ["cost_type_id"]
            isOneToOne: false
            referencedRelation: "cost_code_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "budget_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "budget_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_sub_job_id_fkey"
            columns: ["sub_job_id"]
            isOneToOne: false
            referencedRelation: "sub_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_mod_lines: {
        Row: {
          amount: number
          budget_modification_id: string
          cost_code_id: string
          cost_type_id: string
          created_at: string
          description: string | null
          id: string
          project_id: number
          sub_job_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          budget_modification_id: string
          cost_code_id: string
          cost_type_id: string
          created_at?: string
          description?: string | null
          id?: string
          project_id: number
          sub_job_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          budget_modification_id?: string
          cost_code_id?: string
          cost_type_id?: string
          created_at?: string
          description?: string | null
          id?: string
          project_id?: number
          sub_job_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_mod_lines_budget_modification_id_fkey"
            columns: ["budget_modification_id"]
            isOneToOne: false
            referencedRelation: "budget_modifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_mod_lines_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_mod_lines_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes_with_division_title"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_mod_lines_cost_type_id_fkey"
            columns: ["cost_type_id"]
            isOneToOne: false
            referencedRelation: "cost_code_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_mod_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "budget_mod_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_mod_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_mod_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "budget_mod_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_mod_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_mod_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_mod_lines_sub_job_id_fkey"
            columns: ["sub_job_id"]
            isOneToOne: false
            referencedRelation: "sub_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_modifications: {
        Row: {
          created_at: string
          created_by: string | null
          effective_date: string | null
          id: string
          number: string
          project_id: number
          reason: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effective_date?: string | null
          id?: string
          number: string
          project_id: number
          reason?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effective_date?: string | null
          id?: string
          number?: string
          project_id?: number
          reason?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_modifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "budget_modifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_modifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_modifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "budget_modifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_modifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_modifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      change_event_line_items: {
        Row: {
          change_event_id: number
          cost_code: string | null
          created_at: string | null
          description: string | null
          final_amount: number | null
          id: number
          quantity: number | null
          rom_amount: number | null
          unit_cost: number | null
          uom: string | null
        }
        Insert: {
          change_event_id: number
          cost_code?: string | null
          created_at?: string | null
          description?: string | null
          final_amount?: number | null
          id?: number
          quantity?: number | null
          rom_amount?: number | null
          unit_cost?: number | null
          uom?: string | null
        }
        Update: {
          change_event_id?: number
          cost_code?: string | null
          created_at?: string | null
          description?: string | null
          final_amount?: number | null
          id?: number
          quantity?: number | null
          rom_amount?: number | null
          unit_cost?: number | null
          uom?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "change_event_line_items_change_event_id_fkey"
            columns: ["change_event_id"]
            isOneToOne: false
            referencedRelation: "change_events"
            referencedColumns: ["id"]
          },
        ]
      }
      change_events: {
        Row: {
          created_at: string | null
          event_number: string | null
          id: number
          notes: string | null
          project_id: number
          reason: string | null
          scope: string | null
          status: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          event_number?: string | null
          id?: number
          notes?: string | null
          project_id: number
          reason?: string | null
          scope?: string | null
          status?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          event_number?: string | null
          id?: number
          notes?: string | null
          project_id?: number
          reason?: string | null
          scope?: string | null
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "change_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "change_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      change_order_approvals: {
        Row: {
          approver: string | null
          change_order_id: number
          comment: string | null
          decided_at: string | null
          decision: string | null
          id: number
          role: string | null
        }
        Insert: {
          approver?: string | null
          change_order_id: number
          comment?: string | null
          decided_at?: string | null
          decision?: string | null
          id?: number
          role?: string | null
        }
        Update: {
          approver?: string | null
          change_order_id?: number
          comment?: string | null
          decided_at?: string | null
          decision?: string | null
          id?: number
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "change_order_approvals_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      change_order_costs: {
        Row: {
          change_order_id: number
          contingency: number | null
          id: number
          labor: number | null
          materials: number | null
          overhead: number | null
          subcontractor: number | null
          total_cost: number | null
          updated_at: string | null
        }
        Insert: {
          change_order_id: number
          contingency?: number | null
          id?: number
          labor?: number | null
          materials?: number | null
          overhead?: number | null
          subcontractor?: number | null
          total_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          change_order_id?: number
          contingency?: number | null
          id?: number
          labor?: number | null
          materials?: number | null
          overhead?: number | null
          subcontractor?: number | null
          total_cost?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "change_order_costs_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      change_order_lines: {
        Row: {
          amount: number
          change_order_id: number
          cost_code_id: string
          cost_type_id: string
          created_at: string
          description: string | null
          id: string
          project_id: number
          sub_job_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          change_order_id: number
          cost_code_id: string
          cost_type_id: string
          created_at?: string
          description?: string | null
          id?: string
          project_id: number
          sub_job_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          change_order_id?: number
          cost_code_id?: string
          cost_type_id?: string
          created_at?: string
          description?: string | null
          id?: string
          project_id?: number
          sub_job_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_order_lines_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_lines_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_lines_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes_with_division_title"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_lines_cost_type_id_fkey"
            columns: ["cost_type_id"]
            isOneToOne: false
            referencedRelation: "cost_code_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "change_order_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "change_order_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_lines_sub_job_id_fkey"
            columns: ["sub_job_id"]
            isOneToOne: false
            referencedRelation: "sub_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      change_orders: {
        Row: {
          apply_vertical_markup: boolean | null
          approved_at: string | null
          approved_by: string | null
          co_number: string | null
          created_at: string | null
          description: string | null
          id: number
          project_id: number
          status: string | null
          submitted_at: string | null
          submitted_by: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          apply_vertical_markup?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          co_number?: string | null
          created_at?: string | null
          description?: string | null
          id?: number
          project_id: number
          status?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          apply_vertical_markup?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          co_number?: string | null
          created_at?: string | null
          description?: string | null
          id?: number
          project_id?: number
          status?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_history: {
        Row: {
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
          session_id: string
          sources: Json | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
          session_id: string
          sources?: Json | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
          session_id?: string
          sources?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
          session_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
          session_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          context: Json | null
          created_at: string | null
          id: string
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      chat_thread_attachment_files: {
        Row: {
          attachment_id: string
          created_at: string
          filename: string | null
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          thread_id: string | null
        }
        Insert: {
          attachment_id: string
          created_at?: string
          filename?: string | null
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          thread_id?: string | null
        }
        Update: {
          attachment_id?: string
          created_at?: string
          filename?: string | null
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_thread_attachment_files_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: true
            referencedRelation: "chat_thread_attachments"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_thread_attachments: {
        Row: {
          created_at: string
          filename: string | null
          id: string
          mime_type: string | null
          payload: Json | null
          thread_id: string | null
        }
        Insert: {
          created_at?: string
          filename?: string | null
          id: string
          mime_type?: string | null
          payload?: Json | null
          thread_id?: string | null
        }
        Update: {
          created_at?: string
          filename?: string | null
          id?: string
          mime_type?: string | null
          payload?: Json | null
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_thread_attachments_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_thread_feedback: {
        Row: {
          created_at: string
          feedback: string
          id: string
          item_ids: string[]
          metadata: Json
          thread_id: string
        }
        Insert: {
          created_at?: string
          feedback: string
          id?: string
          item_ids: string[]
          metadata?: Json
          thread_id: string
        }
        Update: {
          created_at?: string
          feedback?: string
          id?: string
          item_ids?: string[]
          metadata?: Json
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_thread_feedback_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_thread_items: {
        Row: {
          created_at: string
          id: string
          item_type: string
          payload: Json
          thread_id: string
        }
        Insert: {
          created_at?: string
          id: string
          item_type: string
          payload: Json
          thread_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_type?: string
          payload?: Json
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_thread_items_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          metadata?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          updated_at?: string
        }
        Relationships: []
      }
      chats: {
        Row: {
          id: string
        }
        Insert: {
          id: string
        }
        Update: {
          id?: string
        }
        Relationships: []
      }
      chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string | null
          document_id: string
          document_title: string | null
          embedding: string | null
          id: string
          metadata: Json | null
          token_count: number | null
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string | null
          document_id: string
          document_title?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          token_count?: number | null
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string | null
          document_id?: string
          document_title?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents_ordered_view"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          code: string | null
          company_id: string | null
          created_at: string
          id: number
          name: string | null
          status: string | null
        }
        Insert: {
          code?: string | null
          company_id?: string | null
          created_at?: string
          id?: number
          name?: string | null
          status?: string | null
        }
        Update: {
          code?: string | null
          company_id?: string | null
          created_at?: string
          id?: number
          name?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      code_examples: {
        Row: {
          chunk_number: number
          content: string
          created_at: string
          embedding: string | null
          id: number
          metadata: Json
          source_id: string
          summary: string
          url: string
        }
        Insert: {
          chunk_number: number
          content: string
          created_at?: string
          embedding?: string | null
          id?: number
          metadata?: Json
          source_id: string
          summary: string
          url: string
        }
        Update: {
          chunk_number?: number
          content?: string
          created_at?: string
          embedding?: string | null
          id?: number
          metadata?: Json
          source_id?: string
          summary?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "code_examples_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["source_id"]
          },
        ]
      }
      commitment_changes: {
        Row: {
          amount: number
          approved_at: string | null
          budget_item_id: string
          commitment_id: string
          created_at: string
          id: string
          status: string | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          budget_item_id: string
          commitment_id: string
          created_at?: string
          id?: string
          status?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          budget_item_id?: string
          commitment_id?: string
          created_at?: string
          id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commitment_changes_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitments"
            referencedColumns: ["id"]
          },
        ]
      }
      commitments: {
        Row: {
          budget_item_id: string
          contract_amount: number
          created_at: string
          executed_at: string | null
          id: string
          project_id: number
          retention_percentage: number | null
          status: string | null
          vendor_id: string | null
        }
        Insert: {
          budget_item_id: string
          contract_amount: number
          created_at?: string
          executed_at?: string | null
          id?: string
          project_id: number
          retention_percentage?: number | null
          status?: string | null
          vendor_id?: string | null
        }
        Update: {
          budget_item_id?: string
          contract_amount?: number
          created_at?: string
          executed_at?: string | null
          id?: string
          project_id?: number
          retention_percentage?: number | null
          status?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commitments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "commitments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "commitments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          city: string | null
          created_at: string | null
          currency_code: string | null
          currency_symbol: string | null
          id: string
          name: string
          notes: string | null
          state: string | null
          title: string | null
          type: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          currency_code?: string | null
          currency_symbol?: string | null
          id?: string
          name: string
          notes?: string | null
          state?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          currency_code?: string | null
          currency_symbol?: string | null
          id?: string
          name?: string
          notes?: string | null
          state?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      company_context: {
        Row: {
          goals: Json | null
          id: string
          okrs: Json | null
          org_structure: Json | null
          policies: Json | null
          resource_constraints: Json | null
          strategic_initiatives: Json | null
          updated_at: string | null
        }
        Insert: {
          goals?: Json | null
          id?: string
          okrs?: Json | null
          org_structure?: Json | null
          policies?: Json | null
          resource_constraints?: Json | null
          strategic_initiatives?: Json | null
          updated_at?: string | null
        }
        Update: {
          goals?: Json | null
          id?: string
          okrs?: Json | null
          org_structure?: Json | null
          policies?: Json | null
          resource_constraints?: Json | null
          strategic_initiatives?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          address: string | null
          birthday: string | null
          city: string | null
          company_id: string | null
          company_name: string | null
          country: string | null
          created_at: string
          department: string | null
          email: string | null
          first_name: string | null
          id: number
          job_title: string | null
          last_name: string | null
          metadata: Json | null
          notes: string | null
          phone: string | null
          projects: string[] | null
          state: string | null
          type: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          birthday?: string | null
          city?: string | null
          company_id?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          first_name?: string | null
          id?: number
          job_title?: string | null
          last_name?: string | null
          metadata?: Json | null
          notes?: string | null
          phone?: string | null
          projects?: string[] | null
          state?: string | null
          type?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          birthday?: string | null
          city?: string | null
          company_id?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          first_name?: string | null
          id?: number
          job_title?: string | null
          last_name?: string | null
          metadata?: Json | null
          notes?: string | null
          phone?: string | null
          projects?: string[] | null
          state?: string | null
          type?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          actual_completion_date: string | null
          apply_vertical_markup: boolean | null
          approved_change_orders: number | null
          architect_engineer_id: number | null
          attachment_count: number | null
          client_id: number
          contract_number: string | null
          contract_termination_date: string | null
          contractor_id: number | null
          created_at: string
          default_retainage: number | null
          description: string | null
          draft_change_orders: number | null
          erp_status: string | null
          estimated_completion_date: string | null
          exclusions: string | null
          executed: boolean | null
          id: number
          inclusions: string | null
          invoiced_amount: number | null
          notes: string | null
          original_contract_amount: number | null
          owner_client_id: number | null
          payments_received: number | null
          pending_change_orders: number | null
          percent_paid: number | null
          private: boolean | null
          project_id: number
          remaining_balance: number | null
          retention_percentage: number | null
          revised_contract_amount: number | null
          signed_contract_received_date: string | null
          start_date: string | null
          status: string | null
          substantial_completion_date: string | null
          title: string
        }
        Insert: {
          actual_completion_date?: string | null
          apply_vertical_markup?: boolean | null
          approved_change_orders?: number | null
          architect_engineer_id?: number | null
          attachment_count?: number | null
          client_id: number
          contract_number?: string | null
          contract_termination_date?: string | null
          contractor_id?: number | null
          created_at?: string
          default_retainage?: number | null
          description?: string | null
          draft_change_orders?: number | null
          erp_status?: string | null
          estimated_completion_date?: string | null
          exclusions?: string | null
          executed?: boolean | null
          id?: number
          inclusions?: string | null
          invoiced_amount?: number | null
          notes?: string | null
          original_contract_amount?: number | null
          owner_client_id?: number | null
          payments_received?: number | null
          pending_change_orders?: number | null
          percent_paid?: number | null
          private?: boolean | null
          project_id: number
          remaining_balance?: number | null
          retention_percentage?: number | null
          revised_contract_amount?: number | null
          signed_contract_received_date?: string | null
          start_date?: string | null
          status?: string | null
          substantial_completion_date?: string | null
          title: string
        }
        Update: {
          actual_completion_date?: string | null
          apply_vertical_markup?: boolean | null
          approved_change_orders?: number | null
          architect_engineer_id?: number | null
          attachment_count?: number | null
          client_id?: number
          contract_number?: string | null
          contract_termination_date?: string | null
          contractor_id?: number | null
          created_at?: string
          default_retainage?: number | null
          description?: string | null
          draft_change_orders?: number | null
          erp_status?: string | null
          estimated_completion_date?: string | null
          exclusions?: string | null
          executed?: boolean | null
          id?: number
          inclusions?: string | null
          invoiced_amount?: number | null
          notes?: string | null
          original_contract_amount?: number | null
          owner_client_id?: number | null
          payments_received?: number | null
          pending_change_orders?: number | null
          percent_paid?: number | null
          private?: boolean | null
          project_id?: number
          remaining_balance?: number | null
          retention_percentage?: number | null
          revised_contract_amount?: number | null
          signed_contract_received_date?: string | null
          start_date?: string | null
          status?: string | null
          substantial_completion_date?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_architect_engineer_id_fkey"
            columns: ["architect_engineer_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_owner_client_id_fkey"
            columns: ["owner_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          is_archived: boolean | null
          last_message_at: string | null
          metadata: Json | null
          session_id: string
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          is_archived?: boolean | null
          last_message_at?: string | null
          metadata?: Json | null
          session_id: string
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          is_archived?: boolean | null
          last_message_at?: string | null
          metadata?: Json | null
          session_id?: string
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_code_division_updates_audit: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          division_id: string
          id: string
          new_title: string | null
          updated_count: number | null
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          division_id: string
          id?: string
          new_title?: string | null
          updated_count?: number | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          division_id?: string
          id?: string
          new_title?: string | null
          updated_count?: number | null
        }
        Relationships: []
      }
      cost_code_divisions: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      cost_code_types: {
        Row: {
          category: string | null
          code: string
          created_at: string | null
          description: string
          id: string
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string | null
          description: string
          id?: string
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string | null
          description?: string
          id?: string
        }
        Relationships: []
      }
      cost_codes: {
        Row: {
          created_at: string | null
          division_id: string
          division_title: string | null
          id: string
          status: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          division_id: string
          division_title?: string | null
          id: string
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          division_id?: string
          division_title?: string | null
          id?: string
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_codes_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "cost_code_divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_factors: {
        Row: {
          base_cost_per_unit: number | null
          complexity_multiplier: number | null
          factor_name: string
          factor_type: string
          id: string
          unit_type: string | null
          updated_at: string | null
        }
        Insert: {
          base_cost_per_unit?: number | null
          complexity_multiplier?: number | null
          factor_name: string
          factor_type: string
          id?: string
          unit_type?: string | null
          updated_at?: string | null
        }
        Update: {
          base_cost_per_unit?: number | null
          complexity_multiplier?: number | null
          factor_name?: string
          factor_type?: string
          id?: string
          unit_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cost_forecasts: {
        Row: {
          budget_item_id: string | null
          created_at: string | null
          created_by: string | null
          forecast_date: string
          forecast_to_complete: number
          id: string
          notes: string | null
        }
        Insert: {
          budget_item_id?: string | null
          created_at?: string | null
          created_by?: string | null
          forecast_date: string
          forecast_to_complete: number
          id?: string
          notes?: string | null
        }
        Update: {
          budget_item_id?: string | null
          created_at?: string | null
          created_by?: string | null
          forecast_date?: string
          forecast_to_complete?: number
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_forecasts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      crawled_pages: {
        Row: {
          chunk_number: number
          content: string
          created_at: string
          embedding: string | null
          id: number
          metadata: Json
          source_id: string
          url: string
        }
        Insert: {
          chunk_number: number
          content: string
          created_at?: string
          embedding?: string | null
          id?: number
          metadata?: Json
          source_id: string
          url: string
        }
        Update: {
          chunk_number?: number
          content?: string
          created_at?: string
          embedding?: string | null
          id?: number
          metadata?: Json
          source_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "crawled_pages_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["source_id"]
          },
        ]
      }
      daily_log_equipment: {
        Row: {
          created_at: string | null
          daily_log_id: string | null
          equipment_name: string
          hours_idle: number | null
          hours_operated: number | null
          id: string
          notes: string | null
        }
        Insert: {
          created_at?: string | null
          daily_log_id?: string | null
          equipment_name: string
          hours_idle?: number | null
          hours_operated?: number | null
          id?: string
          notes?: string | null
        }
        Update: {
          created_at?: string | null
          daily_log_id?: string | null
          equipment_name?: string
          hours_idle?: number | null
          hours_operated?: number | null
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_log_equipment_daily_log_id_fkey"
            columns: ["daily_log_id"]
            isOneToOne: false
            referencedRelation: "daily_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_log_manpower: {
        Row: {
          company_id: string | null
          created_at: string | null
          daily_log_id: string | null
          hours_worked: number | null
          id: string
          trade: string | null
          workers_count: number
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          daily_log_id?: string | null
          hours_worked?: number | null
          id?: string
          trade?: string | null
          workers_count: number
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          daily_log_id?: string | null
          hours_worked?: number | null
          id?: string
          trade?: string | null
          workers_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_log_manpower_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_log_manpower_daily_log_id_fkey"
            columns: ["daily_log_id"]
            isOneToOne: false
            referencedRelation: "daily_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_log_notes: {
        Row: {
          category: string | null
          created_at: string | null
          daily_log_id: string | null
          description: string
          id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          daily_log_id?: string | null
          description: string
          id?: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          daily_log_id?: string | null
          description?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_log_notes_daily_log_id_fkey"
            columns: ["daily_log_id"]
            isOneToOne: false
            referencedRelation: "daily_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_logs: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          log_date: string
          project_id: number | null
          updated_at: string | null
          weather_conditions: Json | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          log_date: string
          project_id?: number | null
          updated_at?: string | null
          weather_conditions?: Json | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          log_date?: string
          project_id?: number | null
          updated_at?: string | null
          weather_conditions?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "daily_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "daily_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_recaps: {
        Row: {
          blockers: Json | null
          commitments: Json | null
          created_at: string | null
          date_range_end: string
          date_range_start: string
          decisions: Json | null
          generation_time_seconds: number | null
          id: string
          meeting_count: number | null
          meetings_analyzed: Json | null
          model_used: string | null
          project_count: number | null
          recap_date: string
          recap_html: string | null
          recap_text: string
          recipients: Json | null
          risks: Json | null
          sent_at: string | null
          sent_email: boolean | null
          sent_teams: boolean | null
          wins: Json | null
        }
        Insert: {
          blockers?: Json | null
          commitments?: Json | null
          created_at?: string | null
          date_range_end: string
          date_range_start: string
          decisions?: Json | null
          generation_time_seconds?: number | null
          id?: string
          meeting_count?: number | null
          meetings_analyzed?: Json | null
          model_used?: string | null
          project_count?: number | null
          recap_date: string
          recap_html?: string | null
          recap_text: string
          recipients?: Json | null
          risks?: Json | null
          sent_at?: string | null
          sent_email?: boolean | null
          sent_teams?: boolean | null
          wins?: Json | null
        }
        Update: {
          blockers?: Json | null
          commitments?: Json | null
          created_at?: string | null
          date_range_end?: string
          date_range_start?: string
          decisions?: Json | null
          generation_time_seconds?: number | null
          id?: string
          meeting_count?: number | null
          meetings_analyzed?: Json | null
          model_used?: string | null
          project_count?: number | null
          recap_date?: string
          recap_html?: string | null
          recap_text?: string
          recipients?: Json | null
          risks?: Json | null
          sent_at?: string | null
          sent_email?: boolean | null
          sent_teams?: boolean | null
          wins?: Json | null
        }
        Relationships: []
      }
      decisions: {
        Row: {
          client_id: number | null
          created_at: string
          description: string
          effective_date: string | null
          embedding: string | null
          id: string
          impact: string | null
          metadata_id: string
          owner_email: string | null
          owner_name: string | null
          project_id: number | null
          project_ids: number[] | null
          rationale: string | null
          segment_id: string | null
          source_chunk_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_id?: number | null
          created_at?: string
          description: string
          effective_date?: string | null
          embedding?: string | null
          id?: string
          impact?: string | null
          metadata_id: string
          owner_email?: string | null
          owner_name?: string | null
          project_id?: number | null
          project_ids?: number[] | null
          rationale?: string | null
          segment_id?: string | null
          source_chunk_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: number | null
          created_at?: string
          description?: string
          effective_date?: string | null
          embedding?: string | null
          id?: string
          impact?: string | null
          metadata_id?: string
          owner_email?: string | null
          owner_name?: string | null
          project_id?: number | null
          project_ids?: number[] | null
          rationale?: string | null
          segment_id?: string | null
          source_chunk_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "decisions_metadata_id_fkey"
            columns: ["metadata_id"]
            isOneToOne: false
            referencedRelation: "document_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisions_metadata_id_fkey"
            columns: ["metadata_id"]
            isOneToOne: false
            referencedRelation: "document_metadata_manual_only"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisions_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "meeting_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisions_source_chunk_id_fkey"
            columns: ["source_chunk_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisions_source_chunk_id_fkey"
            columns: ["source_chunk_id"]
            isOneToOne: false
            referencedRelation: "documents_ordered_view"
            referencedColumns: ["id"]
          },
        ]
      }
      design_recommendations: {
        Row: {
          created_at: string | null
          description: string
          id: string
          implementation_effort: string | null
          potential_savings: number | null
          priority_level: string
          project_id: string | null
          recommendation_type: string
          technical_details: Json | null
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          implementation_effort?: string | null
          potential_savings?: number | null
          priority_level: string
          project_id?: string | null
          recommendation_type: string
          technical_details?: Json | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          implementation_effort?: string | null
          potential_savings?: number | null
          priority_level?: string
          project_id?: string | null
          recommendation_type?: string
          technical_details?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_project_id"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "user_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_cost_line_items: {
        Row: {
          amount: number
          approved: boolean | null
          approved_at: string | null
          approved_by: string | null
          budget_code_id: string | null
          cost_code_id: string | null
          cost_type: string | null
          created_at: string | null
          created_by: string | null
          description: string
          id: string
          invoice_number: string | null
          project_id: number
          transaction_date: string
          updated_at: string | null
          vendor_name: string | null
        }
        Insert: {
          amount?: number
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          budget_code_id?: string | null
          cost_code_id?: string | null
          cost_type?: string | null
          created_at?: string | null
          created_by?: string | null
          description: string
          id?: string
          invoice_number?: string | null
          project_id: number
          transaction_date: string
          updated_at?: string | null
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          budget_code_id?: string | null
          cost_code_id?: string | null
          cost_type?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          id?: string
          invoice_number?: string | null
          project_id?: number
          transaction_date?: string
          updated_at?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "direct_cost_line_items_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_cost_line_items_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes_with_division_title"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_cost_line_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "direct_cost_line_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_cost_line_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_cost_line_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "direct_cost_line_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_cost_line_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_cost_line_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_costs: {
        Row: {
          amount: number
          budget_item_id: string
          cost_type: string | null
          created_at: string
          description: string | null
          id: string
          incurred_date: string | null
          project_id: number
          vendor_id: string | null
        }
        Insert: {
          amount: number
          budget_item_id: string
          cost_type?: string | null
          created_at?: string
          description?: string | null
          id?: string
          incurred_date?: string | null
          project_id: number
          vendor_id?: string | null
        }
        Update: {
          amount?: number
          budget_item_id?: string
          cost_type?: string | null
          created_at?: string
          description?: string | null
          id?: string
          incurred_date?: string | null
          project_id?: number
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "direct_costs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "direct_costs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_costs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_costs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "direct_costs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_costs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_costs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      discrepancies: {
        Row: {
          ai_model_version: string | null
          confidence_score: number | null
          created_at: string | null
          description: string
          discrepancy_type: string
          document_id: string | null
          id: string
          identified_by: string | null
          location_in_doc: Json | null
          severity: string
          spec_requirement: string | null
          specification_id: string | null
          status: string | null
          submittal_content: string | null
          submittal_id: string
          suggested_resolution: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          ai_model_version?: string | null
          confidence_score?: number | null
          created_at?: string | null
          description: string
          discrepancy_type: string
          document_id?: string | null
          id?: string
          identified_by?: string | null
          location_in_doc?: Json | null
          severity: string
          spec_requirement?: string | null
          specification_id?: string | null
          status?: string | null
          submittal_content?: string | null
          submittal_id: string
          suggested_resolution?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          ai_model_version?: string | null
          confidence_score?: number | null
          created_at?: string | null
          description?: string
          discrepancy_type?: string
          document_id?: string | null
          id?: string
          identified_by?: string | null
          location_in_doc?: Json | null
          severity?: string
          spec_requirement?: string | null
          specification_id?: string | null
          status?: string | null
          submittal_content?: string | null
          submittal_id?: string
          suggested_resolution?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discrepancies_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "submittal_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discrepancies_specification_id_fkey"
            columns: ["specification_id"]
            isOneToOne: false
            referencedRelation: "specifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discrepancies_submittal_id_fkey"
            columns: ["submittal_id"]
            isOneToOne: false
            referencedRelation: "active_submittals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discrepancies_submittal_id_fkey"
            columns: ["submittal_id"]
            isOneToOne: false
            referencedRelation: "submittals"
            referencedColumns: ["id"]
          },
        ]
      }
      document_chunks: {
        Row: {
          chunk_id: string
          chunk_index: number
          content_hash: string | null
          created_at: string | null
          document_id: string
          embedding: string | null
          metadata: Json | null
          text: string
          updated_at: string | null
        }
        Insert: {
          chunk_id: string
          chunk_index: number
          content_hash?: string | null
          created_at?: string | null
          document_id: string
          embedding?: string | null
          metadata?: Json | null
          text: string
          updated_at?: string | null
        }
        Update: {
          chunk_id?: string
          chunk_index?: number
          content_hash?: string | null
          created_at?: string | null
          document_id?: string
          embedding?: string | null
          metadata?: Json | null
          text?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      document_executive_summaries: {
        Row: {
          budget_discussions: Json | null
          competitive_intel: Json | null
          confidence_average: number | null
          cost_implications: number | null
          created_at: string | null
          critical_deadlines: Json | null
          critical_path_items: number | null
          decisions_made: Json | null
          delay_risks: Json | null
          document_id: string
          executive_summary: string
          financial_decisions_count: number | null
          id: number
          performance_issues: Json | null
          project_id: number | null
          relationship_changes: Json | null
          revenue_impact: number | null
          stakeholder_feedback_count: number | null
          strategic_pivots: Json | null
          timeline_concerns_count: number | null
          total_insights: number | null
          updated_at: string | null
        }
        Insert: {
          budget_discussions?: Json | null
          competitive_intel?: Json | null
          confidence_average?: number | null
          cost_implications?: number | null
          created_at?: string | null
          critical_deadlines?: Json | null
          critical_path_items?: number | null
          decisions_made?: Json | null
          delay_risks?: Json | null
          document_id: string
          executive_summary: string
          financial_decisions_count?: number | null
          id?: number
          performance_issues?: Json | null
          project_id?: number | null
          relationship_changes?: Json | null
          revenue_impact?: number | null
          stakeholder_feedback_count?: number | null
          strategic_pivots?: Json | null
          timeline_concerns_count?: number | null
          total_insights?: number | null
          updated_at?: string | null
        }
        Update: {
          budget_discussions?: Json | null
          competitive_intel?: Json | null
          confidence_average?: number | null
          cost_implications?: number | null
          created_at?: string | null
          critical_deadlines?: Json | null
          critical_path_items?: number | null
          decisions_made?: Json | null
          delay_risks?: Json | null
          document_id?: string
          executive_summary?: string
          financial_decisions_count?: number | null
          id?: number
          performance_issues?: Json | null
          project_id?: number | null
          relationship_changes?: Json | null
          revenue_impact?: number | null
          stakeholder_feedback_count?: number | null
          strategic_pivots?: Json | null
          timeline_concerns_count?: number | null
          total_insights?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      document_group_access: {
        Row: {
          access_level: string
          document_id: string
          group_id: string
        }
        Insert: {
          access_level?: string
          document_id: string
          group_id: string
        }
        Update: {
          access_level?: string
          document_id?: string
          group_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_group_access_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_group_access_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document_metadata_manual_only"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_group_access_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      document_insights: {
        Row: {
          assignee: string | null
          business_impact: string | null
          confidence_score: number | null
          created_at: string | null
          critical_path_impact: boolean | null
          cross_project_impact: number[] | null
          dependencies: string[] | null
          description: string
          doc_title: string | null
          document_date: string | null
          document_id: string
          due_date: string | null
          exact_quotes: string[] | null
          financial_impact: number | null
          generated_by: string
          id: string
          insight_type: string
          metadata: Json | null
          numerical_data: Json | null
          project_id: number | null
          project_name: string | null
          resolved: boolean | null
          severity: string | null
          source_meetings: string[] | null
          stakeholders_affected: string[] | null
          title: string
          urgency_indicators: string[] | null
        }
        Insert: {
          assignee?: string | null
          business_impact?: string | null
          confidence_score?: number | null
          created_at?: string | null
          critical_path_impact?: boolean | null
          cross_project_impact?: number[] | null
          dependencies?: string[] | null
          description: string
          doc_title?: string | null
          document_date?: string | null
          document_id: string
          due_date?: string | null
          exact_quotes?: string[] | null
          financial_impact?: number | null
          generated_by?: string
          id?: string
          insight_type: string
          metadata?: Json | null
          numerical_data?: Json | null
          project_id?: number | null
          project_name?: string | null
          resolved?: boolean | null
          severity?: string | null
          source_meetings?: string[] | null
          stakeholders_affected?: string[] | null
          title: string
          urgency_indicators?: string[] | null
        }
        Update: {
          assignee?: string | null
          business_impact?: string | null
          confidence_score?: number | null
          created_at?: string | null
          critical_path_impact?: boolean | null
          cross_project_impact?: number[] | null
          dependencies?: string[] | null
          description?: string
          doc_title?: string | null
          document_date?: string | null
          document_id?: string
          due_date?: string | null
          exact_quotes?: string[] | null
          financial_impact?: number | null
          generated_by?: string
          id?: string
          insight_type?: string
          metadata?: Json | null
          numerical_data?: Json | null
          project_id?: number | null
          project_name?: string | null
          resolved?: boolean | null
          severity?: string | null
          source_meetings?: string[] | null
          stakeholders_affected?: string[] | null
          title?: string
          urgency_indicators?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "document_insights_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_insights_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document_metadata_manual_only"
            referencedColumns: ["id"]
          },
        ]
      }
      document_metadata: {
        Row: {
          access_level: string | null
          action_items: string | null
          audio: string | null
          bullet_points: string | null
          captured_at: string | null
          category: string | null
          content: string | null
          content_hash: string | null
          created_at: string | null
          date: string | null
          description: string | null
          duration_minutes: number | null
          file_id: number | null
          fireflies_id: string | null
          fireflies_link: string | null
          id: string
          overview: string | null
          participants: string | null
          participants_array: string[] | null
          phase: string
          project: string | null
          project_id: number | null
          source: string | null
          status: string | null
          summary: string | null
          tags: string | null
          title: string | null
          type: string | null
          url: string | null
          video: string | null
        }
        Insert: {
          access_level?: string | null
          action_items?: string | null
          audio?: string | null
          bullet_points?: string | null
          captured_at?: string | null
          category?: string | null
          content?: string | null
          content_hash?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          duration_minutes?: number | null
          file_id?: number | null
          fireflies_id?: string | null
          fireflies_link?: string | null
          id: string
          overview?: string | null
          participants?: string | null
          participants_array?: string[] | null
          phase?: string
          project?: string | null
          project_id?: number | null
          source?: string | null
          status?: string | null
          summary?: string | null
          tags?: string | null
          title?: string | null
          type?: string | null
          url?: string | null
          video?: string | null
        }
        Update: {
          access_level?: string | null
          action_items?: string | null
          audio?: string | null
          bullet_points?: string | null
          captured_at?: string | null
          category?: string | null
          content?: string | null
          content_hash?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          duration_minutes?: number | null
          file_id?: number | null
          fireflies_id?: string | null
          fireflies_link?: string | null
          id?: string
          overview?: string | null
          participants?: string | null
          participants_array?: string[] | null
          phase?: string
          project?: string | null
          project_id?: number | null
          source?: string | null
          status?: string | null
          summary?: string | null
          tags?: string | null
          title?: string | null
          type?: string | null
          url?: string | null
          video?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_metadata_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "document_metadata_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_metadata_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_metadata_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "document_metadata_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_metadata_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_metadata_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      document_rows: {
        Row: {
          dataset_id: string | null
          id: number
          row_data: Json | null
        }
        Insert: {
          dataset_id?: string | null
          id?: number
          row_data?: Json | null
        }
        Update: {
          dataset_id?: string | null
          id?: number
          row_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "document_rows_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "document_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_rows_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "document_metadata_manual_only"
            referencedColumns: ["id"]
          },
        ]
      }
      document_user_access: {
        Row: {
          access_level: string
          document_id: string
          user_id: string
        }
        Insert: {
          access_level?: string
          document_id: string
          user_id: string
        }
        Update: {
          access_level?: string
          document_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_user_access_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_user_access_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document_metadata_manual_only"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          content: string
          created_at: string | null
          embedding: string | null
          file_date: string | null
          file_id: string
          fireflies_id: string | null
          id: string
          metadata: Json | null
          processing_status: string | null
          project: string | null
          project_id: number | null
          project_ids: number[] | null
          source: string | null
          storage_object_id: string | null
          title: string | null
          updated_at: string | null
          url: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          embedding?: string | null
          file_date?: string | null
          file_id: string
          fireflies_id?: string | null
          id?: string
          metadata?: Json | null
          processing_status?: string | null
          project?: string | null
          project_id?: number | null
          project_ids?: number[] | null
          source?: string | null
          storage_object_id?: string | null
          title?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          embedding?: string | null
          file_date?: string | null
          file_id?: string
          fireflies_id?: string | null
          id?: string
          metadata?: Json | null
          processing_status?: string | null
          project?: string | null
          project_id?: number | null
          project_ids?: number[] | null
          source?: string | null
          storage_object_id?: string | null
          title?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "document_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "document_metadata_manual_only"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          company_card: number | null
          created_at: string
          department: string | null
          email: string | null
          first_name: string | null
          id: number
          job_title: string | null
          last_name: string | null
          phone: string | null
          phone_allowance: number | null
          photo: string | null
          salery: string | null
          start_date: string | null
          supervisor: number | null
          supervisor_name: string | null
          truck_allowance: number | null
          updated_at: string
        }
        Insert: {
          company_card?: number | null
          created_at?: string
          department?: string | null
          email?: string | null
          first_name?: string | null
          id?: number
          job_title?: string | null
          last_name?: string | null
          phone?: string | null
          phone_allowance?: number | null
          photo?: string | null
          salery?: string | null
          start_date?: string | null
          supervisor?: number | null
          supervisor_name?: string | null
          truck_allowance?: number | null
          updated_at?: string
        }
        Update: {
          company_card?: number | null
          created_at?: string
          department?: string | null
          email?: string | null
          first_name?: string | null
          id?: number
          job_title?: string | null
          last_name?: string | null
          phone?: string | null
          phone_allowance?: number | null
          photo?: string | null
          salery?: string | null
          start_date?: string | null
          supervisor?: number | null
          supervisor_name?: string | null
          truck_allowance?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_supervisor_fkey"
            columns: ["supervisor"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_supervisor_fkey"
            columns: ["supervisor"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["manager_id"]
          },
        ]
      }
      erp_sync_log: {
        Row: {
          created_at: string
          erp_system: string | null
          id: string
          last_direct_cost_sync: string | null
          last_job_cost_sync: string | null
          payload: Json | null
          project_id: number
          sync_status: string | null
        }
        Insert: {
          created_at?: string
          erp_system?: string | null
          id?: string
          last_direct_cost_sync?: string | null
          last_job_cost_sync?: string | null
          payload?: Json | null
          project_id: number
          sync_status?: string | null
        }
        Update: {
          created_at?: string
          erp_system?: string | null
          id?: string
          last_direct_cost_sync?: string | null
          last_job_cost_sync?: string | null
          payload?: Json | null
          project_id?: number
          sync_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "erp_sync_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "erp_sync_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "erp_sync_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "erp_sync_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "erp_sync_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "erp_sync_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "erp_sync_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          content: string
          created_at: string
          embedding: string | null
          id: string
          metadata: Json | null
          status: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          content: string
          created_at?: string
          embedding?: string | null
          id: string
          metadata?: Json | null
          status?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          status?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      financial_contracts: {
        Row: {
          change_order_amount: number | null
          company_id: string | null
          contract_amount: number | null
          contract_number: string
          contract_type: string
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          project_id: number | null
          revised_amount: number | null
          start_date: string | null
          status: string | null
          subcontractor_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          change_order_amount?: number | null
          company_id?: string | null
          contract_amount?: number | null
          contract_number: string
          contract_type: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          project_id?: number | null
          revised_amount?: number | null
          start_date?: string | null
          status?: string | null
          subcontractor_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          change_order_amount?: number | null
          company_id?: string | null
          contract_amount?: number | null
          contract_number?: string
          contract_type?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          project_id?: number | null
          revised_amount?: number | null
          start_date?: string | null
          status?: string | null
          subcontractor_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "financial_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "financial_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_contracts_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_contracts_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors_summary"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "fireflies_ingestion_jobs_metadata_id_fkey"
            columns: ["metadata_id"]
            isOneToOne: false
            referencedRelation: "document_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fireflies_ingestion_jobs_metadata_id_fkey"
            columns: ["metadata_id"]
            isOneToOne: false
            referencedRelation: "document_metadata_manual_only"
            referencedColumns: ["id"]
          },
        ]
      }
      fm_blocks: {
        Row: {
          block_type: string
          created_at: string | null
          html: string
          id: string
          inline_figures: number[] | null
          inline_tables: string[] | null
          meta: Json | null
          ordinal: number
          page_reference: number | null
          search_vector: unknown
          section_id: string
          source_text: string
        }
        Insert: {
          block_type: string
          created_at?: string | null
          html: string
          id: string
          inline_figures?: number[] | null
          inline_tables?: string[] | null
          meta?: Json | null
          ordinal: number
          page_reference?: number | null
          search_vector?: unknown
          section_id: string
          source_text: string
        }
        Update: {
          block_type?: string
          created_at?: string | null
          html?: string
          id?: string
          inline_figures?: number[] | null
          inline_tables?: string[] | null
          meta?: Json | null
          ordinal?: number
          page_reference?: number | null
          search_vector?: unknown
          section_id?: string
          source_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "fm_blocks_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "fm_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      fm_cost_factors: {
        Row: {
          base_cost_per_unit: number | null
          complexity_multiplier: number | null
          component_type: string
          factor_name: string
          id: string
          last_updated: string | null
          region_adjustments: Json | null
          unit_type: string | null
        }
        Insert: {
          base_cost_per_unit?: number | null
          complexity_multiplier?: number | null
          component_type: string
          factor_name: string
          id?: string
          last_updated?: string | null
          region_adjustments?: Json | null
          unit_type?: string | null
        }
        Update: {
          base_cost_per_unit?: number | null
          complexity_multiplier?: number | null
          component_type?: string
          factor_name?: string
          id?: string
          last_updated?: string | null
          region_adjustments?: Json | null
          unit_type?: string | null
        }
        Relationships: []
      }
      fm_documents: {
        Row: {
          content: string | null
          created_at: string | null
          document_type: string | null
          embedding: string | null
          filename: string | null
          id: string
          metadata: Json | null
          processing_notes: string | null
          processing_status: string | null
          related_table_ids: string[] | null
          source: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          document_type?: string | null
          embedding?: string | null
          filename?: string | null
          id?: string
          metadata?: Json | null
          processing_notes?: string | null
          processing_status?: string | null
          related_table_ids?: string[] | null
          source?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          document_type?: string | null
          embedding?: string | null
          filename?: string | null
          id?: string
          metadata?: Json | null
          processing_notes?: string | null
          processing_status?: string | null
          related_table_ids?: string[] | null
          source?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      fm_form_submissions: {
        Row: {
          contact_info: Json | null
          cost_analysis: Json | null
          created_at: string | null
          id: string
          lead_score: number | null
          lead_status: string | null
          matched_table_ids: string[] | null
          parsed_requirements: Json | null
          project_details: Json | null
          recommendations: Json | null
          selected_configuration: Json | null
          session_id: string | null
          similarity_scores: number[] | null
          updated_at: string | null
          user_input: Json
        }
        Insert: {
          contact_info?: Json | null
          cost_analysis?: Json | null
          created_at?: string | null
          id?: string
          lead_score?: number | null
          lead_status?: string | null
          matched_table_ids?: string[] | null
          parsed_requirements?: Json | null
          project_details?: Json | null
          recommendations?: Json | null
          selected_configuration?: Json | null
          session_id?: string | null
          similarity_scores?: number[] | null
          updated_at?: string | null
          user_input: Json
        }
        Update: {
          contact_info?: Json | null
          cost_analysis?: Json | null
          created_at?: string | null
          id?: string
          lead_score?: number | null
          lead_status?: string | null
          matched_table_ids?: string[] | null
          parsed_requirements?: Json | null
          project_details?: Json | null
          recommendations?: Json | null
          selected_configuration?: Json | null
          session_id?: string | null
          similarity_scores?: number[] | null
          updated_at?: string | null
          user_input?: Json
        }
        Relationships: []
      }
      fm_global_figures: {
        Row: {
          aisle_width_ft: number | null
          applicable_commodities: string[] | null
          asrs_type: string
          axis_titles: string[] | null
          axis_units: string[] | null
          callouts_labels: string[] | null
          ceiling_height_ft: number | null
          clean_caption: string
          container_type: string | null
          created_at: string | null
          embedded_tables: Json | null
          embedding: string | null
          figure_number: number
          figure_type: string
          footnotes: string[] | null
          id: string
          image: string | null
          machine_readable_claims: Json | null
          max_depth_ft: number | null
          max_depth_m: number | null
          max_spacing_ft: number | null
          max_spacing_m: number | null
          normalized_summary: string
          page_number: number | null
          related_tables: number[] | null
          search_keywords: string[] | null
          section_reference: string | null
          section_references: string[] | null
          special_conditions: string[] | null
          system_requirements: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          aisle_width_ft?: number | null
          applicable_commodities?: string[] | null
          asrs_type: string
          axis_titles?: string[] | null
          axis_units?: string[] | null
          callouts_labels?: string[] | null
          ceiling_height_ft?: number | null
          clean_caption: string
          container_type?: string | null
          created_at?: string | null
          embedded_tables?: Json | null
          embedding?: string | null
          figure_number: number
          figure_type: string
          footnotes?: string[] | null
          id?: string
          image?: string | null
          machine_readable_claims?: Json | null
          max_depth_ft?: number | null
          max_depth_m?: number | null
          max_spacing_ft?: number | null
          max_spacing_m?: number | null
          normalized_summary: string
          page_number?: number | null
          related_tables?: number[] | null
          search_keywords?: string[] | null
          section_reference?: string | null
          section_references?: string[] | null
          special_conditions?: string[] | null
          system_requirements?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          aisle_width_ft?: number | null
          applicable_commodities?: string[] | null
          asrs_type?: string
          axis_titles?: string[] | null
          axis_units?: string[] | null
          callouts_labels?: string[] | null
          ceiling_height_ft?: number | null
          clean_caption?: string
          container_type?: string | null
          created_at?: string | null
          embedded_tables?: Json | null
          embedding?: string | null
          figure_number?: number
          figure_type?: string
          footnotes?: string[] | null
          id?: string
          image?: string | null
          machine_readable_claims?: Json | null
          max_depth_ft?: number | null
          max_depth_m?: number | null
          max_spacing_ft?: number | null
          max_spacing_m?: number | null
          normalized_summary?: string
          page_number?: number | null
          related_tables?: number[] | null
          search_keywords?: string[] | null
          section_reference?: string | null
          section_references?: string[] | null
          special_conditions?: string[] | null
          system_requirements?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      fm_global_tables: {
        Row: {
          aisle_width_requirements: string | null
          applicable_figures: number[] | null
          asrs_type: string
          ceiling_height_max_ft: number | null
          ceiling_height_min_ft: number | null
          commodity_types: string[] | null
          container_type: string | null
          created_at: string | null
          design_parameters: Json | null
          estimated_page_number: number | null
          extraction_status: string | null
          figures: string | null
          id: string
          image: string | null
          protection_scheme: string
          rack_configuration: Json | null
          raw_data: Json | null
          section_references: string[] | null
          special_conditions: string[] | null
          sprinkler_specifications: Json | null
          storage_height_max_ft: number | null
          system_type: string
          table_id: string
          table_number: number
          title: string
          updated_at: string | null
        }
        Insert: {
          aisle_width_requirements?: string | null
          applicable_figures?: number[] | null
          asrs_type: string
          ceiling_height_max_ft?: number | null
          ceiling_height_min_ft?: number | null
          commodity_types?: string[] | null
          container_type?: string | null
          created_at?: string | null
          design_parameters?: Json | null
          estimated_page_number?: number | null
          extraction_status?: string | null
          figures?: string | null
          id?: string
          image?: string | null
          protection_scheme: string
          rack_configuration?: Json | null
          raw_data?: Json | null
          section_references?: string[] | null
          special_conditions?: string[] | null
          sprinkler_specifications?: Json | null
          storage_height_max_ft?: number | null
          system_type: string
          table_id: string
          table_number: number
          title: string
          updated_at?: string | null
        }
        Update: {
          aisle_width_requirements?: string | null
          applicable_figures?: number[] | null
          asrs_type?: string
          ceiling_height_max_ft?: number | null
          ceiling_height_min_ft?: number | null
          commodity_types?: string[] | null
          container_type?: string | null
          created_at?: string | null
          design_parameters?: Json | null
          estimated_page_number?: number | null
          extraction_status?: string | null
          figures?: string | null
          id?: string
          image?: string | null
          protection_scheme?: string
          rack_configuration?: Json | null
          raw_data?: Json | null
          section_references?: string[] | null
          special_conditions?: string[] | null
          sprinkler_specifications?: Json | null
          storage_height_max_ft?: number | null
          system_type?: string
          table_id?: string
          table_number?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fm_global_tables_figures_fkey"
            columns: ["figures"]
            isOneToOne: false
            referencedRelation: "fm_global_figures"
            referencedColumns: ["id"]
          },
        ]
      }
      fm_optimization_rules: {
        Row: {
          created_at: string | null
          description: string | null
          estimated_savings_max: number | null
          estimated_savings_min: number | null
          id: string
          implementation_difficulty: string | null
          is_active: boolean | null
          priority_level: number | null
          rule_name: string
          suggested_changes: Json | null
          trigger_conditions: Json | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          estimated_savings_max?: number | null
          estimated_savings_min?: number | null
          id?: string
          implementation_difficulty?: string | null
          is_active?: boolean | null
          priority_level?: number | null
          rule_name: string
          suggested_changes?: Json | null
          trigger_conditions?: Json | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          estimated_savings_max?: number | null
          estimated_savings_min?: number | null
          id?: string
          implementation_difficulty?: string | null
          is_active?: boolean | null
          priority_level?: number | null
          rule_name?: string
          suggested_changes?: Json | null
          trigger_conditions?: Json | null
        }
        Relationships: []
      }
      fm_optimization_suggestions: {
        Row: {
          applicable_codes: string[] | null
          created_at: string | null
          description: string | null
          estimated_savings: number | null
          form_submission_id: string | null
          id: string
          implementation_effort: string | null
          original_config: Json | null
          risk_level: string | null
          suggested_config: Json | null
          suggestion_type: string
          technical_justification: string | null
          title: string
        }
        Insert: {
          applicable_codes?: string[] | null
          created_at?: string | null
          description?: string | null
          estimated_savings?: number | null
          form_submission_id?: string | null
          id?: string
          implementation_effort?: string | null
          original_config?: Json | null
          risk_level?: string | null
          suggested_config?: Json | null
          suggestion_type: string
          technical_justification?: string | null
          title: string
        }
        Update: {
          applicable_codes?: string[] | null
          created_at?: string | null
          description?: string | null
          estimated_savings?: number | null
          form_submission_id?: string | null
          id?: string
          implementation_effort?: string | null
          original_config?: Json | null
          risk_level?: string | null
          suggested_config?: Json | null
          suggestion_type?: string
          technical_justification?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "fm_optimization_suggestions_form_submission_id_fkey"
            columns: ["form_submission_id"]
            isOneToOne: false
            referencedRelation: "fm_form_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      fm_sections: {
        Row: {
          breadcrumb_display: string[] | null
          created_at: string | null
          id: string
          is_visible: boolean | null
          number: string
          page_end: number
          page_start: number
          parent_id: string | null
          section_path: string[] | null
          section_type: string | null
          slug: string
          sort_key: number
          title: string
          updated_at: string | null
        }
        Insert: {
          breadcrumb_display?: string[] | null
          created_at?: string | null
          id: string
          is_visible?: boolean | null
          number: string
          page_end: number
          page_start: number
          parent_id?: string | null
          section_path?: string[] | null
          section_type?: string | null
          slug: string
          sort_key: number
          title: string
          updated_at?: string | null
        }
        Update: {
          breadcrumb_display?: string[] | null
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
          number?: string
          page_end?: number
          page_start?: number
          parent_id?: string | null
          section_path?: string[] | null
          section_type?: string | null
          slug?: string
          sort_key?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fm_sections_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "fm_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      fm_sprinkler_configs: {
        Row: {
          aisle_width_ft: number | null
          ceiling_height_ft: number
          coverage_type: string | null
          created_at: string | null
          design_area_sqft: number | null
          id: string
          k_factor: number | null
          k_factor_type: string | null
          notes: string | null
          orientation: string | null
          pressure_bar: number | null
          pressure_psi: number | null
          response_type: string | null
          spacing_ft: number | null
          special_conditions: string[] | null
          sprinkler_count: number | null
          storage_height_ft: number | null
          table_id: string
          temperature_rating: number | null
        }
        Insert: {
          aisle_width_ft?: number | null
          ceiling_height_ft: number
          coverage_type?: string | null
          created_at?: string | null
          design_area_sqft?: number | null
          id?: string
          k_factor?: number | null
          k_factor_type?: string | null
          notes?: string | null
          orientation?: string | null
          pressure_bar?: number | null
          pressure_psi?: number | null
          response_type?: string | null
          spacing_ft?: number | null
          special_conditions?: string[] | null
          sprinkler_count?: number | null
          storage_height_ft?: number | null
          table_id: string
          temperature_rating?: number | null
        }
        Update: {
          aisle_width_ft?: number | null
          ceiling_height_ft?: number
          coverage_type?: string | null
          created_at?: string | null
          design_area_sqft?: number | null
          id?: string
          k_factor?: number | null
          k_factor_type?: string | null
          notes?: string | null
          orientation?: string | null
          pressure_bar?: number | null
          pressure_psi?: number | null
          response_type?: string | null
          spacing_ft?: number | null
          special_conditions?: string[] | null
          sprinkler_count?: number | null
          storage_height_ft?: number | null
          table_id?: string
          temperature_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fm_sprinkler_configs_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "fm_global_tables"
            referencedColumns: ["table_id"]
          },
        ]
      }
      fm_table_vectors: {
        Row: {
          content_text: string
          content_type: string
          created_at: string | null
          embedding: string
          id: string
          metadata: Json | null
          table_id: string
        }
        Insert: {
          content_text: string
          content_type: string
          created_at?: string | null
          embedding: string
          id?: string
          metadata?: Json | null
          table_id: string
        }
        Update: {
          content_text?: string
          content_type?: string
          created_at?: string | null
          embedding?: string
          id?: string
          metadata?: Json | null
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fm_table_vectors_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "fm_global_tables"
            referencedColumns: ["table_id"]
          },
        ]
      }
      fm_text_chunks: {
        Row: {
          chunk_size: number | null
          chunk_summary: string | null
          clause_id: string | null
          complexity_score: number | null
          compliance_type: string | null
          content_type: string
          cost_impact: string | null
          created_at: string | null
          doc_id: string
          doc_version: string
          embedding: string | null
          extracted_requirements: string[] | null
          id: string
          page_number: number | null
          raw_text: string
          related_figures: number[] | null
          related_sections: string[] | null
          related_tables: string[] | null
          savings_opportunities: string[] | null
          search_keywords: string[] | null
          section_path: string[] | null
          topics: string[] | null
          updated_at: string | null
        }
        Insert: {
          chunk_size?: number | null
          chunk_summary?: string | null
          clause_id?: string | null
          complexity_score?: number | null
          compliance_type?: string | null
          content_type?: string
          cost_impact?: string | null
          created_at?: string | null
          doc_id?: string
          doc_version?: string
          embedding?: string | null
          extracted_requirements?: string[] | null
          id?: string
          page_number?: number | null
          raw_text: string
          related_figures?: number[] | null
          related_sections?: string[] | null
          related_tables?: string[] | null
          savings_opportunities?: string[] | null
          search_keywords?: string[] | null
          section_path?: string[] | null
          topics?: string[] | null
          updated_at?: string | null
        }
        Update: {
          chunk_size?: number | null
          chunk_summary?: string | null
          clause_id?: string | null
          complexity_score?: number | null
          compliance_type?: string | null
          content_type?: string
          cost_impact?: string | null
          created_at?: string | null
          doc_id?: string
          doc_version?: string
          embedding?: string | null
          extracted_requirements?: string[] | null
          id?: string
          page_number?: number | null
          raw_text?: string
          related_figures?: number[] | null
          related_sections?: string[] | null
          related_tables?: string[] | null
          savings_opportunities?: string[] | null
          search_keywords?: string[] | null
          section_path?: string[] | null
          topics?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      forecasting: {
        Row: {
          budget_item_id: string
          created_at: string
          created_by: string | null
          estimated_completion_cost: number | null
          forecast_to_complete: number | null
          id: string
          projected_costs: number | null
        }
        Insert: {
          budget_item_id: string
          created_at?: string
          created_by?: string | null
          estimated_completion_cost?: number | null
          forecast_to_complete?: number | null
          id?: string
          projected_costs?: number | null
        }
        Update: {
          budget_item_id?: string
          created_at?: string
          created_by?: string | null
          estimated_completion_cost?: number | null
          forecast_to_complete?: number | null
          id?: string
          projected_costs?: number | null
        }
        Relationships: []
      }
      group_members: {
        Row: {
          group_id: string
          role: string | null
          user_id: string
        }
        Insert: {
          group_id: string
          role?: string | null
          user_id: string
        }
        Update: {
          group_id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
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
        Relationships: [
          {
            foreignKeyName: "ingestion_jobs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingestion_jobs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document_metadata_manual_only"
            referencedColumns: ["id"]
          },
        ]
      }
      initiatives: {
        Row: {
          actual_completion: string | null
          aliases: string[] | null
          budget: number | null
          budget_used: number | null
          category: string
          completion_percentage: number | null
          created_at: string | null
          description: string | null
          documentation_links: string[] | null
          id: number
          keywords: string[] | null
          name: string
          notes: string | null
          owner: string | null
          priority: string | null
          related_project_ids: number[] | null
          stakeholders: string[] | null
          start_date: string | null
          status: string | null
          target_completion: string | null
          team_members: string[] | null
          updated_at: string | null
        }
        Insert: {
          actual_completion?: string | null
          aliases?: string[] | null
          budget?: number | null
          budget_used?: number | null
          category: string
          completion_percentage?: number | null
          created_at?: string | null
          description?: string | null
          documentation_links?: string[] | null
          id?: number
          keywords?: string[] | null
          name: string
          notes?: string | null
          owner?: string | null
          priority?: string | null
          related_project_ids?: number[] | null
          stakeholders?: string[] | null
          start_date?: string | null
          status?: string | null
          target_completion?: string | null
          team_members?: string[] | null
          updated_at?: string | null
        }
        Update: {
          actual_completion?: string | null
          aliases?: string[] | null
          budget?: number | null
          budget_used?: number | null
          category?: string
          completion_percentage?: number | null
          created_at?: string | null
          description?: string | null
          documentation_links?: string[] | null
          id?: number
          keywords?: string[] | null
          name?: string
          notes?: string | null
          owner?: string | null
          priority?: string | null
          related_project_ids?: number[] | null
          stakeholders?: string[] | null
          start_date?: string | null
          status?: string | null
          target_completion?: string | null
          team_members?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      issues: {
        Row: {
          category: Database["public"]["Enums"]["issue_category"]
          created_at: string
          date_reported: string | null
          date_resolved: string | null
          description: string | null
          direct_cost: number | null
          id: number
          indirect_cost: number | null
          notes: string | null
          project_id: number
          reported_by: string | null
          severity: Database["public"]["Enums"]["issue_severity"] | null
          status: Database["public"]["Enums"]["issue_status"] | null
          title: string
          total_cost: number | null
        }
        Insert: {
          category: Database["public"]["Enums"]["issue_category"]
          created_at?: string
          date_reported?: string | null
          date_resolved?: string | null
          description?: string | null
          direct_cost?: number | null
          id?: number
          indirect_cost?: number | null
          notes?: string | null
          project_id: number
          reported_by?: string | null
          severity?: Database["public"]["Enums"]["issue_severity"] | null
          status?: Database["public"]["Enums"]["issue_status"] | null
          title: string
          total_cost?: number | null
        }
        Update: {
          category?: Database["public"]["Enums"]["issue_category"]
          created_at?: string
          date_reported?: string | null
          date_resolved?: string | null
          description?: string | null
          direct_cost?: number | null
          id?: number
          indirect_cost?: number | null
          notes?: string | null
          project_id?: number
          reported_by?: string | null
          severity?: Database["public"]["Enums"]["issue_severity"] | null
          status?: Database["public"]["Enums"]["issue_status"] | null
          title?: string
          total_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "issues_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "issues_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "issues_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_segments: {
        Row: {
          created_at: string
          decisions: Json
          end_index: number
          id: string
          metadata_id: string
          project_ids: number[] | null
          risks: Json
          segment_index: number
          start_index: number
          summary: string | null
          summary_embedding: string | null
          tasks: Json
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          decisions?: Json
          end_index: number
          id?: string
          metadata_id: string
          project_ids?: number[] | null
          risks?: Json
          segment_index: number
          start_index: number
          summary?: string | null
          summary_embedding?: string | null
          tasks?: Json
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          decisions?: Json
          end_index?: number
          id?: string
          metadata_id?: string
          project_ids?: number[] | null
          risks?: Json
          segment_index?: number
          start_index?: number
          summary?: string | null
          summary_embedding?: string | null
          tasks?: Json
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_segments_metadata_id_fkey"
            columns: ["metadata_id"]
            isOneToOne: false
            referencedRelation: "document_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_segments_metadata_id_fkey"
            columns: ["metadata_id"]
            isOneToOne: false
            referencedRelation: "document_metadata_manual_only"
            referencedColumns: ["id"]
          },
        ]
      }
      memories: {
        Row: {
          content: string | null
          embedding: string | null
          id: number
          metadata: Json | null
        }
        Insert: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Update: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          computed_session_user_id: string | null
          created_at: string | null
          id: number
          message: Json
          message_data: string | null
          session_id: string
        }
        Insert: {
          computed_session_user_id?: string | null
          created_at?: string | null
          id?: never
          message: Json
          message_data?: string | null
          session_id: string
        }
        Update: {
          computed_session_user_id?: string | null
          created_at?: string | null
          id?: never
          message?: Json
          message_data?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["session_id"]
          },
        ]
      }
      nods_page: {
        Row: {
          checksum: string | null
          id: number
          meta: Json | null
          parent_page_id: number | null
          path: string
          source: string | null
          type: string | null
        }
        Insert: {
          checksum?: string | null
          id?: number
          meta?: Json | null
          parent_page_id?: number | null
          path: string
          source?: string | null
          type?: string | null
        }
        Update: {
          checksum?: string | null
          id?: number
          meta?: Json | null
          parent_page_id?: number | null
          path?: string
          source?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nods_page_parent_page_id_fkey"
            columns: ["parent_page_id"]
            isOneToOne: false
            referencedRelation: "nods_page"
            referencedColumns: ["id"]
          },
        ]
      }
      nods_page_section: {
        Row: {
          content: string | null
          embedding: string | null
          heading: string | null
          id: number
          page_id: number
          slug: string | null
          token_count: number | null
        }
        Insert: {
          content?: string | null
          embedding?: string | null
          heading?: string | null
          id?: number
          page_id: number
          slug?: string | null
          token_count?: number | null
        }
        Update: {
          content?: string | null
          embedding?: string | null
          heading?: string | null
          id?: number
          page_id?: number
          slug?: string | null
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nods_page_section_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "nods_page"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          archived: boolean | null
          body: string | null
          created_at: string | null
          created_by: string | null
          id: number
          project_id: number
          title: string | null
          updated_at: string | null
        }
        Insert: {
          archived?: boolean | null
          body?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: number
          project_id: number
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          archived?: boolean | null
          body?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: number
          project_id?: number
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_project_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "notes_project_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_project_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_project_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "notes_project_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_project_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_project_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          client_id: number | null
          created_at: string
          description: string
          embedding: string | null
          id: string
          metadata_id: string
          next_step: string | null
          owner_email: string | null
          owner_name: string | null
          project_id: number | null
          project_ids: number[] | null
          segment_id: string | null
          source_chunk_id: string | null
          status: string
          type: string | null
          updated_at: string
        }
        Insert: {
          client_id?: number | null
          created_at?: string
          description: string
          embedding?: string | null
          id?: string
          metadata_id: string
          next_step?: string | null
          owner_email?: string | null
          owner_name?: string | null
          project_id?: number | null
          project_ids?: number[] | null
          segment_id?: string | null
          source_chunk_id?: string | null
          status?: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: number | null
          created_at?: string
          description?: string
          embedding?: string | null
          id?: string
          metadata_id?: string
          next_step?: string | null
          owner_email?: string | null
          owner_name?: string | null
          project_id?: number | null
          project_ids?: number[] | null
          segment_id?: string | null
          source_chunk_id?: string | null
          status?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_metadata_id_fkey"
            columns: ["metadata_id"]
            isOneToOne: false
            referencedRelation: "document_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_metadata_id_fkey"
            columns: ["metadata_id"]
            isOneToOne: false
            referencedRelation: "document_metadata_manual_only"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "meeting_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_source_chunk_id_fkey"
            columns: ["source_chunk_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_source_chunk_id_fkey"
            columns: ["source_chunk_id"]
            isOneToOne: false
            referencedRelation: "documents_ordered_view"
            referencedColumns: ["id"]
          },
        ]
      }
      optimization_rules: {
        Row: {
          condition_from: Json | null
          condition_to: Json | null
          cost_impact: number | null
          description: string | null
          embedding: string | null
          id: number
        }
        Insert: {
          condition_from?: Json | null
          condition_to?: Json | null
          cost_impact?: number | null
          description?: string | null
          embedding?: string | null
          id?: number
        }
        Update: {
          condition_from?: Json | null
          condition_to?: Json | null
          cost_impact?: number | null
          description?: string | null
          embedding?: string | null
          id?: number
        }
        Relationships: []
      }
      owner_invoice_line_items: {
        Row: {
          approved_amount: number | null
          category: string | null
          created_at: string | null
          description: string | null
          id: number
          invoice_id: number
        }
        Insert: {
          approved_amount?: number | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: number
          invoice_id: number
        }
        Update: {
          approved_amount?: number | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: number
          invoice_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "owner_invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "owner_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_invoices: {
        Row: {
          approved_at: string | null
          billing_period_id: string | null
          contract_id: number
          created_at: string | null
          id: number
          invoice_number: string | null
          period_end: string | null
          period_start: string | null
          status: string | null
          submitted_at: string | null
        }
        Insert: {
          approved_at?: string | null
          billing_period_id?: string | null
          contract_id: number
          created_at?: string | null
          id?: number
          invoice_number?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string | null
          submitted_at?: string | null
        }
        Update: {
          approved_at?: string | null
          billing_period_id?: string | null
          contract_id?: number
          created_at?: string | null
          id?: number
          invoice_number?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "owner_invoices_billing_period_id_fkey"
            columns: ["billing_period_id"]
            isOneToOne: false
            referencedRelation: "billing_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_invoices_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_financial_summary"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "owner_invoices_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_financial_summary_mv"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "owner_invoices_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      parts: {
        Row: {
          createdAt: string
          data_weather_id: string | null
          data_weather_location: string | null
          data_weather_temperature: number | null
          data_weather_weather: string | null
          file_filename: string | null
          file_mediaType: string | null
          file_url: string | null
          id: string
          messageId: string
          order: number
          providerMetadata: Json | null
          reasoning_text: string | null
          source_document_filename: string | null
          source_document_mediaType: string | null
          source_document_sourceId: string | null
          source_document_title: string | null
          source_url_sourceId: string | null
          source_url_title: string | null
          source_url_url: string | null
          text_text: string | null
          tool_errorText: string | null
          tool_getLocation_input: Json | null
          tool_getLocation_output: Json | null
          tool_getWeatherInformation_input: Json | null
          tool_getWeatherInformation_output: Json | null
          tool_state: string | null
          tool_toolCallId: string | null
          type: string
        }
        Insert: {
          createdAt?: string
          data_weather_id?: string | null
          data_weather_location?: string | null
          data_weather_temperature?: number | null
          data_weather_weather?: string | null
          file_filename?: string | null
          file_mediaType?: string | null
          file_url?: string | null
          id: string
          messageId: string
          order?: number
          providerMetadata?: Json | null
          reasoning_text?: string | null
          source_document_filename?: string | null
          source_document_mediaType?: string | null
          source_document_sourceId?: string | null
          source_document_title?: string | null
          source_url_sourceId?: string | null
          source_url_title?: string | null
          source_url_url?: string | null
          text_text?: string | null
          tool_errorText?: string | null
          tool_getLocation_input?: Json | null
          tool_getLocation_output?: Json | null
          tool_getWeatherInformation_input?: Json | null
          tool_getWeatherInformation_output?: Json | null
          tool_state?: string | null
          tool_toolCallId?: string | null
          type: string
        }
        Update: {
          createdAt?: string
          data_weather_id?: string | null
          data_weather_location?: string | null
          data_weather_temperature?: number | null
          data_weather_weather?: string | null
          file_filename?: string | null
          file_mediaType?: string | null
          file_url?: string | null
          id?: string
          messageId?: string
          order?: number
          providerMetadata?: Json | null
          reasoning_text?: string | null
          source_document_filename?: string | null
          source_document_mediaType?: string | null
          source_document_sourceId?: string | null
          source_document_title?: string | null
          source_url_sourceId?: string | null
          source_url_title?: string | null
          source_url_url?: string | null
          text_text?: string | null
          tool_errorText?: string | null
          tool_getLocation_input?: Json | null
          tool_getLocation_output?: Json | null
          tool_getWeatherInformation_input?: Json | null
          tool_getWeatherInformation_output?: Json | null
          tool_state?: string | null
          tool_toolCallId?: string | null
          type?: string
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount: number
          contract_id: number
          created_at: string | null
          id: number
          invoice_id: number | null
          method: string | null
          payment_date: string
          reference_number: string | null
        }
        Insert: {
          amount: number
          contract_id: number
          created_at?: string | null
          id?: number
          invoice_id?: number | null
          method?: string | null
          payment_date: string
          reference_number?: string | null
        }
        Update: {
          amount?: number
          contract_id?: number
          created_at?: string | null
          id?: number
          invoice_id?: number | null
          method?: string | null
          payment_date?: string
          reference_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_financial_summary"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "payment_transactions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_financial_summary_mv"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "payment_transactions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "owner_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      pcco_line_items: {
        Row: {
          cost_code: string | null
          created_at: string | null
          description: string | null
          id: number
          line_amount: number | null
          pcco_id: number
          pco_id: number | null
          quantity: number | null
          unit_cost: number | null
          uom: string | null
        }
        Insert: {
          cost_code?: string | null
          created_at?: string | null
          description?: string | null
          id?: number
          line_amount?: number | null
          pcco_id: number
          pco_id?: number | null
          quantity?: number | null
          unit_cost?: number | null
          uom?: string | null
        }
        Update: {
          cost_code?: string | null
          created_at?: string | null
          description?: string | null
          id?: number
          line_amount?: number | null
          pcco_id?: number
          pco_id?: number | null
          quantity?: number | null
          unit_cost?: number | null
          uom?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pcco_line_items_pcco_id_fkey"
            columns: ["pcco_id"]
            isOneToOne: false
            referencedRelation: "prime_contract_change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pcco_line_items_pco_id_fkey"
            columns: ["pco_id"]
            isOneToOne: false
            referencedRelation: "prime_potential_change_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      pco_line_items: {
        Row: {
          change_event_line_item_id: number | null
          cost_code: string | null
          created_at: string | null
          description: string | null
          id: number
          line_amount: number | null
          pco_id: number
          quantity: number | null
          unit_cost: number | null
          uom: string | null
        }
        Insert: {
          change_event_line_item_id?: number | null
          cost_code?: string | null
          created_at?: string | null
          description?: string | null
          id?: number
          line_amount?: number | null
          pco_id: number
          quantity?: number | null
          unit_cost?: number | null
          uom?: string | null
        }
        Update: {
          change_event_line_item_id?: number | null
          cost_code?: string | null
          created_at?: string | null
          description?: string | null
          id?: number
          line_amount?: number | null
          pco_id?: number
          quantity?: number | null
          unit_cost?: number | null
          uom?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pco_line_items_change_event_line_item_id_fkey"
            columns: ["change_event_line_item_id"]
            isOneToOne: false
            referencedRelation: "change_event_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pco_line_items_pco_id_fkey"
            columns: ["pco_id"]
            isOneToOne: false
            referencedRelation: "prime_potential_change_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      prime_contract_change_orders: {
        Row: {
          approved_at: string | null
          contract_id: number
          created_at: string | null
          executed: boolean | null
          id: number
          pcco_number: string | null
          status: string | null
          submitted_at: string | null
          title: string
          total_amount: number | null
        }
        Insert: {
          approved_at?: string | null
          contract_id: number
          created_at?: string | null
          executed?: boolean | null
          id?: number
          pcco_number?: string | null
          status?: string | null
          submitted_at?: string | null
          title: string
          total_amount?: number | null
        }
        Update: {
          approved_at?: string | null
          contract_id?: number
          created_at?: string | null
          executed?: boolean | null
          id?: number
          pcco_number?: string | null
          status?: string | null
          submitted_at?: string | null
          title?: string
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prime_contract_change_orders_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_financial_summary"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "prime_contract_change_orders_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_financial_summary_mv"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "prime_contract_change_orders_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      prime_contract_sovs: {
        Row: {
          contract_id: number
          cost_code: string | null
          created_at: string
          description: string | null
          id: number
          line_amount: number | null
          quantity: number | null
          sort_order: number | null
          unit_cost: number | null
          uom: string | null
        }
        Insert: {
          contract_id: number
          cost_code?: string | null
          created_at?: string
          description?: string | null
          id?: number
          line_amount?: number | null
          quantity?: number | null
          sort_order?: number | null
          unit_cost?: number | null
          uom?: string | null
        }
        Update: {
          contract_id?: number
          cost_code?: string | null
          created_at?: string
          description?: string | null
          id?: number
          line_amount?: number | null
          quantity?: number | null
          sort_order?: number | null
          unit_cost?: number | null
          uom?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prime_contract_sovs_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_financial_summary"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "prime_contract_sovs_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_financial_summary_mv"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "prime_contract_sovs_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      prime_potential_change_orders: {
        Row: {
          approved_at: string | null
          change_event_id: number | null
          contract_id: number
          created_at: string | null
          id: number
          notes: string | null
          pco_number: string | null
          project_id: number
          reason: string | null
          scope: string | null
          status: string | null
          submitted_at: string | null
          title: string
        }
        Insert: {
          approved_at?: string | null
          change_event_id?: number | null
          contract_id: number
          created_at?: string | null
          id?: number
          notes?: string | null
          pco_number?: string | null
          project_id: number
          reason?: string | null
          scope?: string | null
          status?: string | null
          submitted_at?: string | null
          title: string
        }
        Update: {
          approved_at?: string | null
          change_event_id?: number | null
          contract_id?: number
          created_at?: string | null
          id?: number
          notes?: string | null
          pco_number?: string | null
          project_id?: number
          reason?: string | null
          scope?: string | null
          status?: string | null
          submitted_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "prime_potential_change_orders_change_event_id_fkey"
            columns: ["change_event_id"]
            isOneToOne: false
            referencedRelation: "change_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_potential_change_orders_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_financial_summary"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "prime_potential_change_orders_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_financial_summary_mv"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "prime_potential_change_orders_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_potential_change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "prime_potential_change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_potential_change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_potential_change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "prime_potential_change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_potential_change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_potential_change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      processing_queue: {
        Row: {
          attempts: number | null
          completed_at: string | null
          config: Json | null
          created_at: string | null
          document_id: string
          error_message: string | null
          id: string
          job_type: string
          max_attempts: number | null
          priority: number | null
          started_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          attempts?: number | null
          completed_at?: string | null
          config?: Json | null
          created_at?: string | null
          document_id: string
          error_message?: string | null
          id?: string
          job_type: string
          max_attempts?: number | null
          priority?: number | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          attempts?: number | null
          completed_at?: string | null
          config?: Json | null
          created_at?: string | null
          document_id?: string
          error_message?: string | null
          id?: string
          job_type?: string
          max_attempts?: number | null
          priority?: number | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      procore_capture_sessions: {
        Row: {
          capture_type: string
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          started_at: string
          status: string
          total_screenshots: number | null
        }
        Insert: {
          capture_type: string
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          started_at?: string
          status?: string
          total_screenshots?: number | null
        }
        Update: {
          capture_type?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          started_at?: string
          status?: string
          total_screenshots?: number | null
        }
        Relationships: []
      }
      procore_components: {
        Row: {
          component_name: string | null
          component_type: string
          content: string | null
          created_at: string
          height: number | null
          id: string
          local_path: string | null
          screenshot_id: string | null
          storage_path: string | null
          styles: Json | null
          width: number | null
          x: number | null
          y: number | null
        }
        Insert: {
          component_name?: string | null
          component_type: string
          content?: string | null
          created_at?: string
          height?: number | null
          id?: string
          local_path?: string | null
          screenshot_id?: string | null
          storage_path?: string | null
          styles?: Json | null
          width?: number | null
          x?: number | null
          y?: number | null
        }
        Update: {
          component_name?: string | null
          component_type?: string
          content?: string | null
          created_at?: string
          height?: number | null
          id?: string
          local_path?: string | null
          screenshot_id?: string | null
          storage_path?: string | null
          styles?: Json | null
          width?: number | null
          x?: number | null
          y?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "procore_components_screenshot_id_fkey"
            columns: ["screenshot_id"]
            isOneToOne: false
            referencedRelation: "procore_screenshots"
            referencedColumns: ["id"]
          },
        ]
      }
      procore_features: {
        Row: {
          ai_enhancement_notes: string | null
          ai_enhancement_possible: boolean | null
          complexity: string | null
          created_at: string
          description: string | null
          estimated_hours: number | null
          id: string
          include_in_rebuild: boolean | null
          module_id: string | null
          name: string
          screenshot_ids: string[] | null
        }
        Insert: {
          ai_enhancement_notes?: string | null
          ai_enhancement_possible?: boolean | null
          complexity?: string | null
          created_at?: string
          description?: string | null
          estimated_hours?: number | null
          id?: string
          include_in_rebuild?: boolean | null
          module_id?: string | null
          name: string
          screenshot_ids?: string[] | null
        }
        Update: {
          ai_enhancement_notes?: string | null
          ai_enhancement_possible?: boolean | null
          complexity?: string | null
          created_at?: string
          description?: string | null
          estimated_hours?: number | null
          id?: string
          include_in_rebuild?: boolean | null
          module_id?: string | null
          name?: string
          screenshot_ids?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "procore_features_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "procore_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      procore_modules: {
        Row: {
          app_path: string | null
          category: string
          complexity: string | null
          created_at: string
          dependencies: Json | null
          display_name: string
          docs_url: string | null
          estimated_build_weeks: number | null
          id: string
          key_features: Json | null
          name: string
          notes: string | null
          priority: string | null
          rebuild_notes: string | null
          updated_at: string
        }
        Insert: {
          app_path?: string | null
          category: string
          complexity?: string | null
          created_at?: string
          dependencies?: Json | null
          display_name: string
          docs_url?: string | null
          estimated_build_weeks?: number | null
          id?: string
          key_features?: Json | null
          name: string
          notes?: string | null
          priority?: string | null
          rebuild_notes?: string | null
          updated_at?: string
        }
        Update: {
          app_path?: string | null
          category?: string
          complexity?: string | null
          created_at?: string
          dependencies?: Json | null
          display_name?: string
          docs_url?: string | null
          estimated_build_weeks?: number | null
          id?: string
          key_features?: Json | null
          name?: string
          notes?: string | null
          priority?: string | null
          rebuild_notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      procore_screenshots: {
        Row: {
          ai_analysis: Json | null
          captured_at: string
          category: string
          color_palette: Json | null
          created_at: string
          description: string | null
          detected_components: Json | null
          file_size_bytes: number | null
          fullpage_height: number | null
          fullpage_path: string | null
          fullpage_storage_path: string | null
          id: string
          name: string
          page_title: string | null
          session_id: string | null
          source_url: string | null
          subcategory: string | null
          updated_at: string
          viewport_height: number | null
          viewport_path: string | null
          viewport_storage_path: string | null
          viewport_width: number | null
        }
        Insert: {
          ai_analysis?: Json | null
          captured_at?: string
          category: string
          color_palette?: Json | null
          created_at?: string
          description?: string | null
          detected_components?: Json | null
          file_size_bytes?: number | null
          fullpage_height?: number | null
          fullpage_path?: string | null
          fullpage_storage_path?: string | null
          id?: string
          name: string
          page_title?: string | null
          session_id?: string | null
          source_url?: string | null
          subcategory?: string | null
          updated_at?: string
          viewport_height?: number | null
          viewport_path?: string | null
          viewport_storage_path?: string | null
          viewport_width?: number | null
        }
        Update: {
          ai_analysis?: Json | null
          captured_at?: string
          category?: string
          color_palette?: Json | null
          created_at?: string
          description?: string | null
          detected_components?: Json | null
          file_size_bytes?: number | null
          fullpage_height?: number | null
          fullpage_path?: string | null
          fullpage_storage_path?: string | null
          id?: string
          name?: string
          page_title?: string | null
          session_id?: string | null
          source_url?: string | null
          subcategory?: string | null
          updated_at?: string
          viewport_height?: number | null
          viewport_path?: string | null
          viewport_storage_path?: string | null
          viewport_width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "procore_screenshots_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "procore_capture_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          id: string
          updated_at: string | null
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      project: {
        Row: {
          access: string | null
          address: string | null
          archived: boolean
          archived_at: string | null
          archived_by: string | null
          budget: number | null
          budget_locked: boolean | null
          budget_locked_at: string | null
          budget_locked_by: string | null
          budget_used: number | null
          category: string | null
          client: string | null
          client_id: number | null
          completion_percentage: number | null
          created_at: string
          delivery_method: string | null
          erp_last_direct_cost_sync: string | null
          erp_last_job_cost_sync: string | null
          erp_sync_status: string | null
          erp_system: string | null
          est_completion: string | null
          est_profit: number | null
          est_revenue: number | null
          health_score: number | null
          health_status: string | null
          id: number
          job_number: string | null
          keywords: string[] | null
          name: string | null
          name_code: string | null
          onedrive: string | null
          phase: string | null
          project_manager: number | null
          project_number: string | null
          project_sector: string | null
          stakeholders: Json | null
          start_date: string | null
          state: string | null
          summary: string | null
          summary_metadata: Json | null
          summary_updated_at: string | null
          team_members: string[] | null
          type: string | null
          work_scope: string | null
        }
        Insert: {
          access?: string | null
          address?: string | null
          archived?: boolean
          archived_at?: string | null
          archived_by?: string | null
          budget?: number | null
          budget_locked?: boolean | null
          budget_locked_at?: string | null
          budget_locked_by?: string | null
          budget_used?: number | null
          category?: string | null
          client?: string | null
          client_id?: number | null
          completion_percentage?: number | null
          created_at?: string
          delivery_method?: string | null
          erp_last_direct_cost_sync?: string | null
          erp_last_job_cost_sync?: string | null
          erp_sync_status?: string | null
          erp_system?: string | null
          est_completion?: string | null
          est_profit?: number | null
          est_revenue?: number | null
          health_score?: number | null
          health_status?: string | null
          id?: number
          job_number?: string | null
          keywords?: string[] | null
          name?: string | null
          name_code?: string | null
          onedrive?: string | null
          phase?: string | null
          project_manager?: number | null
          project_number?: string | null
          project_sector?: string | null
          stakeholders?: Json | null
          start_date?: string | null
          state?: string | null
          summary?: string | null
          summary_metadata?: Json | null
          summary_updated_at?: string | null
          team_members?: string[] | null
          type?: string | null
          work_scope?: string | null
        }
        Update: {
          access?: string | null
          address?: string | null
          archived?: boolean
          archived_at?: string | null
          archived_by?: string | null
          budget?: number | null
          budget_locked?: boolean | null
          budget_locked_at?: string | null
          budget_locked_by?: string | null
          budget_used?: number | null
          category?: string | null
          client?: string | null
          client_id?: number | null
          completion_percentage?: number | null
          created_at?: string
          delivery_method?: string | null
          erp_last_direct_cost_sync?: string | null
          erp_last_job_cost_sync?: string | null
          erp_sync_status?: string | null
          erp_system?: string | null
          est_completion?: string | null
          est_profit?: number | null
          est_revenue?: number | null
          health_score?: number | null
          health_status?: string | null
          id?: number
          job_number?: string | null
          keywords?: string[] | null
          name?: string | null
          name_code?: string | null
          onedrive?: string | null
          phase?: string | null
          project_manager?: number | null
          project_number?: string | null
          project_sector?: string | null
          stakeholders?: Json | null
          start_date?: string | null
          state?: string | null
          summary?: string | null
          summary_metadata?: Json | null
          summary_updated_at?: string | null
          team_members?: string[] | null
          type?: string | null
          work_scope?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_budget_locked_by_fkey"
            columns: ["budget_locked_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_project_manager_fkey"
            columns: ["project_manager"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_project_manager_fkey"
            columns: ["project_manager"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["manager_id"]
          },
        ]
      }
      project_briefings: {
        Row: {
          briefing_content: string
          briefing_type: string | null
          generated_at: string
          generated_by: string | null
          id: string
          project_id: number
          source_documents: string[]
          token_count: number | null
          version: number | null
        }
        Insert: {
          briefing_content: string
          briefing_type?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          project_id: number
          source_documents: string[]
          token_count?: number | null
          version?: number | null
        }
        Update: {
          briefing_content?: string
          briefing_type?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          project_id?: number
          source_documents?: string[]
          token_count?: number | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_briefings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_briefings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_briefings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_briefings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_briefings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_briefings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_briefings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      project_cost_codes: {
        Row: {
          cost_code_id: string
          cost_type_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          project_id: number
        }
        Insert: {
          cost_code_id: string
          cost_type_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          project_id: number
        }
        Update: {
          cost_code_id?: string
          cost_type_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          project_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_cost_codes_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_cost_codes_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes_with_division_title"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_cost_codes_cost_type_id_fkey"
            columns: ["cost_type_id"]
            isOneToOne: false
            referencedRelation: "cost_code_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_cost_codes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_cost_codes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_cost_codes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_cost_codes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_cost_codes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_cost_codes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_cost_codes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      project_directory: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          permissions: Json | null
          project_id: number | null
          role: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          permissions?: Json | null
          project_id?: number | null
          role: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          permissions?: Json | null
          project_id?: number | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_directory_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_directory_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_directory_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_directory_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_directory_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_directory_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_directory_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_directory_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      project_insights: {
        Row: {
          captured_at: string
          created_at: string
          detail: Json
          id: string
          metadata: Json
          project_id: number
          severity: string | null
          source_document_ids: string[] | null
          summary: string
        }
        Insert: {
          captured_at?: string
          created_at?: string
          detail?: Json
          id?: string
          metadata?: Json
          project_id: number
          severity?: string | null
          source_document_ids?: string[] | null
          summary: string
        }
        Update: {
          captured_at?: string
          created_at?: string
          detail?: Json
          id?: string
          metadata?: Json
          project_id?: number
          severity?: string | null
          source_document_ids?: string[] | null
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_insights_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_insights_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_insights_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_insights_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_insights_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_insights_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_insights_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          access: string
          created_at: string | null
          id: string
          permissions: Json | null
          project_id: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access: string
          created_at?: string | null
          id?: string
          permissions?: Json | null
          project_id: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access?: string
          created_at?: string | null
          id?: string
          permissions?: Json | null
          project_id?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      project_resources: {
        Row: {
          created_at: string
          description: string | null
          id: number
          project_id: number | null
          title: string | null
          type: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: number
          project_id?: number | null
          title?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: number
          project_id?: number | null
          title?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_resources_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_resources_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_resources_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_resources_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_resources_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_resources_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_resources_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          due_date: string | null
          id: string
          priority: string | null
          project_id: number | null
          status: string | null
          task_description: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          project_id?: number | null
          status?: string | null
          task_description: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          project_id?: number | null
          status?: string | null
          task_description?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      project_users: {
        Row: {
          assigned_at: string | null
          id: string
          permissions: Json | null
          project_id: number
          role: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          id?: string
          permissions?: Json | null
          project_id: number
          role: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          id?: string
          permissions?: Json | null
          project_id?: number
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_users_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_users_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_users_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_users_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_users_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_users_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_users_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          access: string | null
          address: string | null
          aliases: string[] | null
          archived: boolean
          archived_at: string | null
          archived_by: string | null
          budget: number | null
          budget_locked: boolean | null
          budget_locked_at: string | null
          budget_locked_by: string | null
          budget_used: number | null
          category: string | null
          client: string | null
          client_id: number | null
          completion_percentage: number | null
          created_at: string
          current_phase: string | null
          delivery_method: string | null
          erp_last_direct_cost_sync: string | null
          erp_last_job_cost_sync: string | null
          erp_sync_status: string | null
          erp_system: string | null
          "est completion": string | null
          "est profit": number | null
          "est revenue": number | null
          health_score: number | null
          health_status: string | null
          id: number
          "job number": string | null
          name: string | null
          name_code: string | null
          onedrive: string | null
          phase: string | null
          project_manager: number | null
          project_number: string | null
          project_sector: string | null
          stakeholders: Json | null
          "start date": string | null
          state: string | null
          summary: string | null
          summary_metadata: Json | null
          summary_updated_at: string | null
          team_members: string[] | null
          type: string | null
          work_scope: string | null
        }
        Insert: {
          access?: string | null
          address?: string | null
          aliases?: string[] | null
          archived?: boolean
          archived_at?: string | null
          archived_by?: string | null
          budget?: number | null
          budget_locked?: boolean | null
          budget_locked_at?: string | null
          budget_locked_by?: string | null
          budget_used?: number | null
          category?: string | null
          client?: string | null
          client_id?: number | null
          completion_percentage?: number | null
          created_at?: string
          current_phase?: string | null
          delivery_method?: string | null
          erp_last_direct_cost_sync?: string | null
          erp_last_job_cost_sync?: string | null
          erp_sync_status?: string | null
          erp_system?: string | null
          "est completion"?: string | null
          "est profit"?: number | null
          "est revenue"?: number | null
          health_score?: number | null
          health_status?: string | null
          id?: number
          "job number"?: string | null
          name?: string | null
          name_code?: string | null
          onedrive?: string | null
          phase?: string | null
          project_manager?: number | null
          project_number?: string | null
          project_sector?: string | null
          stakeholders?: Json | null
          "start date"?: string | null
          state?: string | null
          summary?: string | null
          summary_metadata?: Json | null
          summary_updated_at?: string | null
          team_members?: string[] | null
          type?: string | null
          work_scope?: string | null
        }
        Update: {
          access?: string | null
          address?: string | null
          aliases?: string[] | null
          archived?: boolean
          archived_at?: string | null
          archived_by?: string | null
          budget?: number | null
          budget_locked?: boolean | null
          budget_locked_at?: string | null
          budget_locked_by?: string | null
          budget_used?: number | null
          category?: string | null
          client?: string | null
          client_id?: number | null
          completion_percentage?: number | null
          created_at?: string
          current_phase?: string | null
          delivery_method?: string | null
          erp_last_direct_cost_sync?: string | null
          erp_last_job_cost_sync?: string | null
          erp_sync_status?: string | null
          erp_system?: string | null
          "est completion"?: string | null
          "est profit"?: number | null
          "est revenue"?: number | null
          health_score?: number | null
          health_status?: string | null
          id?: number
          "job number"?: string | null
          name?: string | null
          name_code?: string | null
          onedrive?: string | null
          phase?: string | null
          project_manager?: number | null
          project_number?: string | null
          project_sector?: string | null
          stakeholders?: Json | null
          "start date"?: string | null
          state?: string | null
          summary?: string | null
          summary_metadata?: Json | null
          summary_updated_at?: string | null
          team_members?: string[] | null
          type?: string | null
          work_scope?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_budget_locked_by_fkey"
            columns: ["budget_locked_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_project_manager_fkey"
            columns: ["project_manager"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_project_manager_fkey"
            columns: ["project_manager"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["manager_id"]
          },
        ]
      }
      projects_audit: {
        Row: {
          changed_at: string
          changed_by: string | null
          changed_columns: string[] | null
          id: string
          metadata: Json | null
          new_data: Json | null
          old_data: Json | null
          operation: string
          project_id: number | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          changed_columns?: string[] | null
          id?: string
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          operation: string
          project_id?: number | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          changed_columns?: string[] | null
          id?: string
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          operation?: string
          project_id?: number | null
        }
        Relationships: []
      }
      prospects: {
        Row: {
          ai_score: number | null
          ai_summary: string | null
          assigned_to: string | null
          client_id: number | null
          company_name: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          contact_title: string | null
          created_at: string
          estimated_project_value: number | null
          estimated_start_date: string | null
          id: number
          industry: string | null
          last_contacted: string | null
          lead_source: string | null
          metadata: Json | null
          next_follow_up: string | null
          notes: string | null
          probability: number | null
          project_id: number | null
          project_type: string | null
          referral_contact: string | null
          status: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          ai_score?: number | null
          ai_summary?: string | null
          assigned_to?: string | null
          client_id?: number | null
          company_name: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_title?: string | null
          created_at?: string
          estimated_project_value?: number | null
          estimated_start_date?: string | null
          id?: number
          industry?: string | null
          last_contacted?: string | null
          lead_source?: string | null
          metadata?: Json | null
          next_follow_up?: string | null
          notes?: string | null
          probability?: number | null
          project_id?: number | null
          project_type?: string | null
          referral_contact?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          ai_score?: number | null
          ai_summary?: string | null
          assigned_to?: string | null
          client_id?: number | null
          company_name?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_title?: string | null
          created_at?: string
          estimated_project_value?: number | null
          estimated_start_date?: string | null
          id?: number
          industry?: string | null
          last_contacted?: string | null
          lead_source?: string | null
          metadata?: Json | null
          next_follow_up?: string | null
          notes?: string | null
          probability?: number | null
          project_id?: number | null
          project_type?: string | null
          referral_contact?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "prospects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "prospects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      Prospects: {
        Row: {
          contact: number | null
          created_at: string
          id: number
          status: string | null
          title: string | null
        }
        Insert: {
          contact?: number | null
          created_at?: string
          id?: number
          status?: string | null
          title?: string | null
        }
        Update: {
          contact?: number | null
          created_at?: string
          id?: number
          status?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Prospects_contact_fkey"
            columns: ["contact"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      qto_items: {
        Row: {
          cost_code: string | null
          created_at: string | null
          description: string | null
          division: string | null
          extended_cost: number | null
          id: number
          item_code: string | null
          project_id: number
          qto_id: number
          quantity: number | null
          source_reference: string | null
          unit: string | null
          unit_cost: number | null
        }
        Insert: {
          cost_code?: string | null
          created_at?: string | null
          description?: string | null
          division?: string | null
          extended_cost?: number | null
          id?: number
          item_code?: string | null
          project_id: number
          qto_id: number
          quantity?: number | null
          source_reference?: string | null
          unit?: string | null
          unit_cost?: number | null
        }
        Update: {
          cost_code?: string | null
          created_at?: string | null
          description?: string | null
          division?: string | null
          extended_cost?: number | null
          id?: number
          item_code?: string | null
          project_id?: number
          qto_id?: number
          quantity?: number | null
          source_reference?: string | null
          unit?: string | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "qto_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "qto_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qto_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qto_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "qto_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qto_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qto_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qto_items_qto_id_fkey"
            columns: ["qto_id"]
            isOneToOne: false
            referencedRelation: "qtos"
            referencedColumns: ["id"]
          },
        ]
      }
      qtos: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: number
          notes: string | null
          project_id: number
          status: string | null
          title: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: number
          notes?: string | null
          project_id: number
          status?: string | null
          title?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: number
          notes?: string | null
          project_id?: number
          status?: string | null
          title?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "qtos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "qtos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qtos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qtos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "qtos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qtos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qtos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
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
      requests: {
        Row: {
          id: string
          timestamp: string | null
          user_id: string
          user_query: string
        }
        Insert: {
          id: string
          timestamp?: string | null
          user_id: string
          user_query: string
        }
        Update: {
          id?: string
          timestamp?: string | null
          user_id?: string
          user_query?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      review_comments: {
        Row: {
          comment: string
          comment_type: string | null
          created_at: string | null
          created_by: string
          discrepancy_id: string | null
          document_id: string | null
          id: string
          location_in_doc: Json | null
          priority: string | null
          review_id: string
          status: string | null
        }
        Insert: {
          comment: string
          comment_type?: string | null
          created_at?: string | null
          created_by: string
          discrepancy_id?: string | null
          document_id?: string | null
          id?: string
          location_in_doc?: Json | null
          priority?: string | null
          review_id: string
          status?: string | null
        }
        Update: {
          comment?: string
          comment_type?: string | null
          created_at?: string | null
          created_by?: string
          discrepancy_id?: string | null
          document_id?: string | null
          id?: string
          location_in_doc?: Json | null
          priority?: string | null
          review_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_comments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_comments_discrepancy_id_fkey"
            columns: ["discrepancy_id"]
            isOneToOne: false
            referencedRelation: "discrepancies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_comments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "submittal_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_comments_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comments: string | null
          completed_at: string | null
          created_at: string | null
          decision: string | null
          due_date: string | null
          id: string
          review_criteria_met: Json | null
          review_type: string
          reviewer_id: string
          started_at: string | null
          status: string | null
          submittal_id: string
        }
        Insert: {
          comments?: string | null
          completed_at?: string | null
          created_at?: string | null
          decision?: string | null
          due_date?: string | null
          id?: string
          review_criteria_met?: Json | null
          review_type: string
          reviewer_id: string
          started_at?: string | null
          status?: string | null
          submittal_id: string
        }
        Update: {
          comments?: string | null
          completed_at?: string | null
          created_at?: string | null
          decision?: string | null
          due_date?: string | null
          id?: string
          review_criteria_met?: Json | null
          review_type?: string
          reviewer_id?: string
          started_at?: string | null
          status?: string | null
          submittal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_submittal_id_fkey"
            columns: ["submittal_id"]
            isOneToOne: false
            referencedRelation: "active_submittals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_submittal_id_fkey"
            columns: ["submittal_id"]
            isOneToOne: false
            referencedRelation: "submittals"
            referencedColumns: ["id"]
          },
        ]
      }
      rfi_assignees: {
        Row: {
          created_at: string
          employee_id: number
          is_primary: boolean
          rfi_id: string
        }
        Insert: {
          created_at?: string
          employee_id: number
          is_primary?: boolean
          rfi_id: string
        }
        Update: {
          created_at?: string
          employee_id?: number
          is_primary?: boolean
          rfi_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfi_assignees_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfi_assignees_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["manager_id"]
          },
          {
            foreignKeyName: "rfi_assignees_rfi_id_fkey"
            columns: ["rfi_id"]
            isOneToOne: false
            referencedRelation: "rfis"
            referencedColumns: ["id"]
          },
        ]
      }
      rfis: {
        Row: {
          assignees: string[] | null
          ball_in_court: string | null
          ball_in_court_employee_id: number | null
          closed_date: string | null
          cost_code: string | null
          cost_impact: string | null
          created_at: string
          created_by: string | null
          created_by_employee_id: number | null
          date_initiated: string | null
          distribution_list: string[] | null
          due_date: string | null
          id: string
          is_private: boolean
          location: string | null
          number: number
          project_id: number
          question: string
          received_from: string | null
          reference: string | null
          responsible_contractor: string | null
          rfi_manager: string | null
          rfi_manager_employee_id: number | null
          rfi_stage: string | null
          schedule_impact: string | null
          specification: string | null
          status: string
          sub_job: string | null
          subject: string
          updated_at: string
        }
        Insert: {
          assignees?: string[] | null
          ball_in_court?: string | null
          ball_in_court_employee_id?: number | null
          closed_date?: string | null
          cost_code?: string | null
          cost_impact?: string | null
          created_at?: string
          created_by?: string | null
          created_by_employee_id?: number | null
          date_initiated?: string | null
          distribution_list?: string[] | null
          due_date?: string | null
          id?: string
          is_private?: boolean
          location?: string | null
          number: number
          project_id: number
          question: string
          received_from?: string | null
          reference?: string | null
          responsible_contractor?: string | null
          rfi_manager?: string | null
          rfi_manager_employee_id?: number | null
          rfi_stage?: string | null
          schedule_impact?: string | null
          specification?: string | null
          status?: string
          sub_job?: string | null
          subject: string
          updated_at?: string
        }
        Update: {
          assignees?: string[] | null
          ball_in_court?: string | null
          ball_in_court_employee_id?: number | null
          closed_date?: string | null
          cost_code?: string | null
          cost_impact?: string | null
          created_at?: string
          created_by?: string | null
          created_by_employee_id?: number | null
          date_initiated?: string | null
          distribution_list?: string[] | null
          due_date?: string | null
          id?: string
          is_private?: boolean
          location?: string | null
          number?: number
          project_id?: number
          question?: string
          received_from?: string | null
          reference?: string | null
          responsible_contractor?: string | null
          rfi_manager?: string | null
          rfi_manager_employee_id?: number | null
          rfi_stage?: string | null
          schedule_impact?: string | null
          specification?: string | null
          status?: string
          sub_job?: string | null
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfis_ball_in_court_employee_id_fkey"
            columns: ["ball_in_court_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_ball_in_court_employee_id_fkey"
            columns: ["ball_in_court_employee_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["manager_id"]
          },
          {
            foreignKeyName: "rfis_created_by_employee_id_fkey"
            columns: ["created_by_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_created_by_employee_id_fkey"
            columns: ["created_by_employee_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["manager_id"]
          },
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_rfi_manager_employee_id_fkey"
            columns: ["rfi_manager_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_rfi_manager_employee_id_fkey"
            columns: ["rfi_manager_employee_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["manager_id"]
          },
        ]
      }
      risks: {
        Row: {
          category: string | null
          client_id: number | null
          created_at: string
          description: string
          embedding: string | null
          id: string
          impact: string | null
          likelihood: string | null
          metadata_id: string
          mitigation_plan: string | null
          owner_email: string | null
          owner_name: string | null
          project_id: number | null
          project_ids: number[] | null
          segment_id: string | null
          source_chunk_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          client_id?: number | null
          created_at?: string
          description: string
          embedding?: string | null
          id?: string
          impact?: string | null
          likelihood?: string | null
          metadata_id: string
          mitigation_plan?: string | null
          owner_email?: string | null
          owner_name?: string | null
          project_id?: number | null
          project_ids?: number[] | null
          segment_id?: string | null
          source_chunk_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          client_id?: number | null
          created_at?: string
          description?: string
          embedding?: string | null
          id?: string
          impact?: string | null
          likelihood?: string | null
          metadata_id?: string
          mitigation_plan?: string | null
          owner_email?: string | null
          owner_name?: string | null
          project_id?: number | null
          project_ids?: number[] | null
          segment_id?: string | null
          source_chunk_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "risks_metadata_id_fkey"
            columns: ["metadata_id"]
            isOneToOne: false
            referencedRelation: "document_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risks_metadata_id_fkey"
            columns: ["metadata_id"]
            isOneToOne: false
            referencedRelation: "document_metadata_manual_only"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risks_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "meeting_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risks_source_chunk_id_fkey"
            columns: ["source_chunk_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risks_source_chunk_id_fkey"
            columns: ["source_chunk_id"]
            isOneToOne: false
            referencedRelation: "documents_ordered_view"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_of_values: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          commitment_id: string | null
          contract_id: number | null
          created_at: string | null
          id: string
          status: string | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          commitment_id?: string | null
          contract_id?: number | null
          created_at?: string | null
          id?: string
          status?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          commitment_id?: string | null
          contract_id?: number | null
          created_at?: string | null
          id?: string
          status?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_of_values_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_of_values_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_of_values_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_financial_summary"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "schedule_of_values_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_financial_summary_mv"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "schedule_of_values_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_progress_updates: {
        Row: {
          actual_finish: string | null
          actual_hours: number | null
          actual_start: string | null
          id: number
          notes: string | null
          percent_complete: number | null
          reported_at: string | null
          reported_by: string | null
          task_id: number
        }
        Insert: {
          actual_finish?: string | null
          actual_hours?: number | null
          actual_start?: string | null
          id?: number
          notes?: string | null
          percent_complete?: number | null
          reported_at?: string | null
          reported_by?: string | null
          task_id: number
        }
        Update: {
          actual_finish?: string | null
          actual_hours?: number | null
          actual_start?: string | null
          id?: number
          notes?: string | null
          percent_complete?: number | null
          reported_at?: string | null
          reported_by?: string | null
          task_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "schedule_progress_updates_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "schedule_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_resources: {
        Row: {
          cost: number | null
          created_at: string | null
          id: number
          rate: number | null
          resource_id: string | null
          resource_type: string | null
          role: string | null
          task_id: number
          unit_type: string | null
          units: number | null
        }
        Insert: {
          cost?: number | null
          created_at?: string | null
          id?: number
          rate?: number | null
          resource_id?: string | null
          resource_type?: string | null
          role?: string | null
          task_id: number
          unit_type?: string | null
          units?: number | null
        }
        Update: {
          cost?: number | null
          created_at?: string | null
          id?: number
          rate?: number | null
          resource_id?: string | null
          resource_type?: string | null
          role?: string | null
          task_id?: number
          unit_type?: string | null
          units?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_resources_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "schedule_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_task_dependencies: {
        Row: {
          dependency_type: string | null
          id: number
          predecessor_task_id: number
          task_id: number
        }
        Insert: {
          dependency_type?: string | null
          id?: number
          predecessor_task_id: number
          task_id: number
        }
        Update: {
          dependency_type?: string | null
          id?: number
          predecessor_task_id?: number
          task_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "schedule_task_dependencies_predecessor_task_id_fkey"
            columns: ["predecessor_task_id"]
            isOneToOne: false
            referencedRelation: "schedule_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_task_dependencies_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "schedule_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_tasks: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          duration_days: number | null
          finish_date: string | null
          float_order: number | null
          id: number
          name: string
          parent_task_id: number | null
          percent_complete: number | null
          predecessor_ids: string | null
          project_id: number
          schedule_id: number
          sequence: number | null
          start_date: string | null
          task_type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_days?: number | null
          finish_date?: string | null
          float_order?: number | null
          id?: number
          name: string
          parent_task_id?: number | null
          percent_complete?: number | null
          predecessor_ids?: string | null
          project_id: number
          schedule_id: number
          sequence?: number | null
          start_date?: string | null
          task_type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_days?: number | null
          finish_date?: string | null
          float_order?: number | null
          id?: number
          name?: string
          parent_task_id?: number | null
          percent_complete?: number | null
          predecessor_ids?: string | null
          project_id?: number
          schedule_id?: number
          sequence?: number | null
          start_date?: string | null
          task_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "schedule_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "schedule_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          created_at: string
          source_id: string
          summary: string | null
          total_word_count: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          source_id: string
          summary?: string | null
          total_word_count?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          source_id?: string
          summary?: string | null
          total_word_count?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      sov_line_items: {
        Row: {
          cost_code_id: string | null
          created_at: string | null
          description: string
          id: string
          line_number: number
          scheduled_value: number
          sov_id: string | null
          updated_at: string | null
        }
        Insert: {
          cost_code_id?: string | null
          created_at?: string | null
          description: string
          id?: string
          line_number: number
          scheduled_value?: number
          sov_id?: string | null
          updated_at?: string | null
        }
        Update: {
          cost_code_id?: string | null
          created_at?: string | null
          description?: string
          id?: string
          line_number?: number
          scheduled_value?: number
          sov_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sov_line_items_sov_id_fkey"
            columns: ["sov_id"]
            isOneToOne: false
            referencedRelation: "schedule_of_values"
            referencedColumns: ["id"]
          },
        ]
      }
      specifications: {
        Row: {
          ai_summary: string | null
          content: string | null
          created_at: string | null
          division: string | null
          document_url: string | null
          id: string
          keywords: string[] | null
          project_id: number
          requirements: Json | null
          section_number: string
          section_title: string
          specification_type: string | null
          status: string | null
          updated_at: string | null
          version: string | null
        }
        Insert: {
          ai_summary?: string | null
          content?: string | null
          created_at?: string | null
          division?: string | null
          document_url?: string | null
          id?: string
          keywords?: string[] | null
          project_id: number
          requirements?: Json | null
          section_number: string
          section_title: string
          specification_type?: string | null
          status?: string | null
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          ai_summary?: string | null
          content?: string | null
          created_at?: string | null
          division?: string | null
          document_url?: string | null
          id?: string
          keywords?: string[] | null
          project_id?: number
          requirements?: Json | null
          section_number?: string
          section_title?: string
          specification_type?: string | null
          status?: string | null
          updated_at?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "specifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "specifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "specifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_jobs: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          project_id: number
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          project_id: number
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          project_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sub_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "sub_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "sub_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractor_contacts: {
        Row: {
          contact_type: string | null
          created_at: string | null
          email: string | null
          id: string
          is_primary: boolean | null
          mobile_phone: string | null
          name: string
          notes: string | null
          phone: string | null
          subcontractor_id: string | null
          title: string | null
        }
        Insert: {
          contact_type?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          mobile_phone?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          subcontractor_id?: string | null
          title?: string | null
        }
        Update: {
          contact_type?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          mobile_phone?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          subcontractor_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcontractor_contacts_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_contacts_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractor_documents: {
        Row: {
          document_name: string
          document_type: string
          expiration_date: string | null
          file_url: string | null
          id: string
          is_current: boolean | null
          subcontractor_id: string | null
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          document_name: string
          document_type: string
          expiration_date?: string | null
          file_url?: string | null
          id?: string
          is_current?: boolean | null
          subcontractor_id?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          document_name?: string
          document_type?: string
          expiration_date?: string | null
          file_url?: string | null
          id?: string
          is_current?: boolean | null
          subcontractor_id?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcontractor_documents_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_documents_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractor_projects: {
        Row: {
          completion_date: string | null
          created_at: string | null
          id: string
          notes: string | null
          on_budget: boolean | null
          on_time: boolean | null
          project_name: string
          project_rating: number | null
          project_value: number | null
          safety_incidents: number | null
          start_date: string | null
          subcontractor_id: string | null
        }
        Insert: {
          completion_date?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          on_budget?: boolean | null
          on_time?: boolean | null
          project_name: string
          project_rating?: number | null
          project_value?: number | null
          safety_incidents?: number | null
          start_date?: string | null
          subcontractor_id?: string | null
        }
        Update: {
          completion_date?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          on_budget?: boolean | null
          on_time?: boolean | null
          project_name?: string
          project_rating?: number | null
          project_value?: number | null
          safety_incidents?: number | null
          start_date?: string | null
          subcontractor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcontractor_projects_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_projects_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractors: {
        Row: {
          address_line_1: string | null
          address_line_2: string | null
          alleato_projects_completed: number | null
          annual_revenue_range: string | null
          asrs_experience_years: number | null
          avg_project_rating: number | null
          background_check_policy: boolean | null
          bim_capabilities: boolean | null
          bonding_capacity: number | null
          cad_software_proficiency: string[] | null
          city: string | null
          company_name: string
          company_type: string | null
          concurrent_projects_capacity: number | null
          country: string | null
          created_at: string | null
          created_by: string | null
          credit_rating: string | null
          dba_name: string | null
          digital_collaboration_tools: string[] | null
          drug_testing_program: boolean | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          employee_count: number | null
          fm_global_certified: boolean | null
          hourly_rates_range: string | null
          id: string
          insurance_general_liability: number | null
          insurance_professional_liability: number | null
          insurance_workers_comp: boolean | null
          internal_notes: string | null
          legal_business_name: string | null
          license_expiration_date: string | null
          markup_percentage: number | null
          master_agreement_date: string | null
          master_agreement_signed: boolean | null
          max_project_size: string | null
          nfpa_certifications: string[] | null
          on_time_completion_rate: number | null
          osha_training_current: boolean | null
          postal_code: string | null
          preferred_payment_terms: string | null
          preferred_project_types: string[] | null
          preferred_vendor: boolean | null
          primary_contact_email: string | null
          primary_contact_name: string
          primary_contact_phone: string | null
          primary_contact_title: string | null
          project_management_software: string[] | null
          quality_certifications: string[] | null
          safety_incident_rate: number | null
          secondary_contact_email: string | null
          secondary_contact_name: string | null
          secondary_contact_phone: string | null
          service_areas: string[] | null
          special_requirements: string | null
          specialties: string[] | null
          sprinkler_contractor_license: string | null
          state_province: string | null
          status: string | null
          strengths: string[] | null
          tax_id: string | null
          tier_level: string | null
          travel_radius_miles: number | null
          updated_at: string | null
          updated_by: string | null
          weaknesses: string[] | null
          years_in_business: number | null
        }
        Insert: {
          address_line_1?: string | null
          address_line_2?: string | null
          alleato_projects_completed?: number | null
          annual_revenue_range?: string | null
          asrs_experience_years?: number | null
          avg_project_rating?: number | null
          background_check_policy?: boolean | null
          bim_capabilities?: boolean | null
          bonding_capacity?: number | null
          cad_software_proficiency?: string[] | null
          city?: string | null
          company_name: string
          company_type?: string | null
          concurrent_projects_capacity?: number | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          credit_rating?: string | null
          dba_name?: string | null
          digital_collaboration_tools?: string[] | null
          drug_testing_program?: boolean | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          employee_count?: number | null
          fm_global_certified?: boolean | null
          hourly_rates_range?: string | null
          id?: string
          insurance_general_liability?: number | null
          insurance_professional_liability?: number | null
          insurance_workers_comp?: boolean | null
          internal_notes?: string | null
          legal_business_name?: string | null
          license_expiration_date?: string | null
          markup_percentage?: number | null
          master_agreement_date?: string | null
          master_agreement_signed?: boolean | null
          max_project_size?: string | null
          nfpa_certifications?: string[] | null
          on_time_completion_rate?: number | null
          osha_training_current?: boolean | null
          postal_code?: string | null
          preferred_payment_terms?: string | null
          preferred_project_types?: string[] | null
          preferred_vendor?: boolean | null
          primary_contact_email?: string | null
          primary_contact_name: string
          primary_contact_phone?: string | null
          primary_contact_title?: string | null
          project_management_software?: string[] | null
          quality_certifications?: string[] | null
          safety_incident_rate?: number | null
          secondary_contact_email?: string | null
          secondary_contact_name?: string | null
          secondary_contact_phone?: string | null
          service_areas?: string[] | null
          special_requirements?: string | null
          specialties?: string[] | null
          sprinkler_contractor_license?: string | null
          state_province?: string | null
          status?: string | null
          strengths?: string[] | null
          tax_id?: string | null
          tier_level?: string | null
          travel_radius_miles?: number | null
          updated_at?: string | null
          updated_by?: string | null
          weaknesses?: string[] | null
          years_in_business?: number | null
        }
        Update: {
          address_line_1?: string | null
          address_line_2?: string | null
          alleato_projects_completed?: number | null
          annual_revenue_range?: string | null
          asrs_experience_years?: number | null
          avg_project_rating?: number | null
          background_check_policy?: boolean | null
          bim_capabilities?: boolean | null
          bonding_capacity?: number | null
          cad_software_proficiency?: string[] | null
          city?: string | null
          company_name?: string
          company_type?: string | null
          concurrent_projects_capacity?: number | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          credit_rating?: string | null
          dba_name?: string | null
          digital_collaboration_tools?: string[] | null
          drug_testing_program?: boolean | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          employee_count?: number | null
          fm_global_certified?: boolean | null
          hourly_rates_range?: string | null
          id?: string
          insurance_general_liability?: number | null
          insurance_professional_liability?: number | null
          insurance_workers_comp?: boolean | null
          internal_notes?: string | null
          legal_business_name?: string | null
          license_expiration_date?: string | null
          markup_percentage?: number | null
          master_agreement_date?: string | null
          master_agreement_signed?: boolean | null
          max_project_size?: string | null
          nfpa_certifications?: string[] | null
          on_time_completion_rate?: number | null
          osha_training_current?: boolean | null
          postal_code?: string | null
          preferred_payment_terms?: string | null
          preferred_project_types?: string[] | null
          preferred_vendor?: boolean | null
          primary_contact_email?: string | null
          primary_contact_name?: string
          primary_contact_phone?: string | null
          primary_contact_title?: string | null
          project_management_software?: string[] | null
          quality_certifications?: string[] | null
          safety_incident_rate?: number | null
          secondary_contact_email?: string | null
          secondary_contact_name?: string | null
          secondary_contact_phone?: string | null
          service_areas?: string[] | null
          special_requirements?: string | null
          specialties?: string[] | null
          sprinkler_contractor_license?: string | null
          state_province?: string | null
          status?: string | null
          strengths?: string[] | null
          tax_id?: string | null
          tier_level?: string | null
          travel_radius_miles?: number | null
          updated_at?: string | null
          updated_by?: string | null
          weaknesses?: string[] | null
          years_in_business?: number | null
        }
        Relationships: []
      }
      submittal_analytics_events: {
        Row: {
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown
          occurred_at: string | null
          project_id: number | null
          session_id: string | null
          submittal_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown
          occurred_at?: string | null
          project_id?: number | null
          session_id?: string | null
          submittal_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown
          occurred_at?: string | null
          project_id?: number | null
          session_id?: string | null
          submittal_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submittal_analytics_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "submittal_analytics_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_analytics_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_analytics_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "submittal_analytics_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_analytics_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_analytics_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_analytics_events_submittal_id_fkey"
            columns: ["submittal_id"]
            isOneToOne: false
            referencedRelation: "active_submittals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_analytics_events_submittal_id_fkey"
            columns: ["submittal_id"]
            isOneToOne: false
            referencedRelation: "submittals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      submittal_documents: {
        Row: {
          ai_analysis: Json | null
          document_name: string
          document_type: string | null
          extracted_text: string | null
          file_size_bytes: number | null
          file_url: string
          id: string
          mime_type: string | null
          page_count: number | null
          submittal_id: string
          uploaded_at: string | null
          uploaded_by: string
          version: number | null
        }
        Insert: {
          ai_analysis?: Json | null
          document_name: string
          document_type?: string | null
          extracted_text?: string | null
          file_size_bytes?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          page_count?: number | null
          submittal_id: string
          uploaded_at?: string | null
          uploaded_by: string
          version?: number | null
        }
        Update: {
          ai_analysis?: Json | null
          document_name?: string
          document_type?: string | null
          extracted_text?: string | null
          file_size_bytes?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          page_count?: number | null
          submittal_id?: string
          uploaded_at?: string | null
          uploaded_by?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "submittal_documents_submittal_id_fkey"
            columns: ["submittal_id"]
            isOneToOne: false
            referencedRelation: "active_submittals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_documents_submittal_id_fkey"
            columns: ["submittal_id"]
            isOneToOne: false
            referencedRelation: "submittals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      submittal_history: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string | null
          changes: Json | null
          description: string | null
          id: string
          metadata: Json | null
          new_status: string | null
          occurred_at: string | null
          previous_status: string | null
          submittal_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type?: string | null
          changes?: Json | null
          description?: string | null
          id?: string
          metadata?: Json | null
          new_status?: string | null
          occurred_at?: string | null
          previous_status?: string | null
          submittal_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string | null
          changes?: Json | null
          description?: string | null
          id?: string
          metadata?: Json | null
          new_status?: string | null
          occurred_at?: string | null
          previous_status?: string | null
          submittal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submittal_history_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_history_submittal_id_fkey"
            columns: ["submittal_id"]
            isOneToOne: false
            referencedRelation: "active_submittals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_history_submittal_id_fkey"
            columns: ["submittal_id"]
            isOneToOne: false
            referencedRelation: "submittals"
            referencedColumns: ["id"]
          },
        ]
      }
      submittal_notifications: {
        Row: {
          created_at: string | null
          delivery_methods: string[] | null
          id: string
          is_read: boolean | null
          message: string | null
          notification_type: string
          priority: string | null
          project_id: number | null
          scheduled_for: string | null
          sent_at: string | null
          submittal_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          delivery_methods?: string[] | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          notification_type: string
          priority?: string | null
          project_id?: number | null
          scheduled_for?: string | null
          sent_at?: string | null
          submittal_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          delivery_methods?: string[] | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          notification_type?: string
          priority?: string | null
          project_id?: number | null
          scheduled_for?: string | null
          sent_at?: string | null
          submittal_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submittal_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "submittal_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "submittal_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_notifications_submittal_id_fkey"
            columns: ["submittal_id"]
            isOneToOne: false
            referencedRelation: "active_submittals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_notifications_submittal_id_fkey"
            columns: ["submittal_id"]
            isOneToOne: false
            referencedRelation: "submittals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      submittal_performance_metrics: {
        Row: {
          calculated_at: string | null
          id: string
          metadata: Json | null
          metric_name: string
          metric_type: string
          period_end: string | null
          period_start: string | null
          project_id: number | null
          unit: string | null
          value: number | null
        }
        Insert: {
          calculated_at?: string | null
          id?: string
          metadata?: Json | null
          metric_name: string
          metric_type: string
          period_end?: string | null
          period_start?: string | null
          project_id?: number | null
          unit?: string | null
          value?: number | null
        }
        Update: {
          calculated_at?: string | null
          id?: string
          metadata?: Json | null
          metric_name?: string
          metric_type?: string
          period_end?: string | null
          period_start?: string | null
          project_id?: number | null
          unit?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "submittal_performance_metrics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "submittal_performance_metrics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_performance_metrics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_performance_metrics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "submittal_performance_metrics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_performance_metrics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_performance_metrics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      submittal_types: {
        Row: {
          ai_analysis_config: Json | null
          category: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          required_documents: string[] | null
          review_criteria: Json | null
        }
        Insert: {
          ai_analysis_config?: Json | null
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          required_documents?: string[] | null
          review_criteria?: Json | null
        }
        Update: {
          ai_analysis_config?: Json | null
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          required_documents?: string[] | null
          review_criteria?: Json | null
        }
        Relationships: []
      }
      submittals: {
        Row: {
          created_at: string | null
          current_version: number | null
          description: string | null
          id: string
          metadata: Json | null
          priority: string | null
          project_id: number
          required_approval_date: string | null
          specification_id: string | null
          status: string | null
          submission_date: string | null
          submittal_number: string
          submittal_type_id: string
          submitted_by: string
          submitter_company: string | null
          title: string
          total_versions: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_version?: number | null
          description?: string | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          project_id: number
          required_approval_date?: string | null
          specification_id?: string | null
          status?: string | null
          submission_date?: string | null
          submittal_number: string
          submittal_type_id: string
          submitted_by: string
          submitter_company?: string | null
          title: string
          total_versions?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_version?: number | null
          description?: string | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          project_id?: number
          required_approval_date?: string | null
          specification_id?: string | null
          status?: string | null
          submission_date?: string | null
          submittal_number?: string
          submittal_type_id?: string
          submitted_by?: string
          submitter_company?: string | null
          title?: string
          total_versions?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_specification_id_fkey"
            columns: ["specification_id"]
            isOneToOne: false
            referencedRelation: "specifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_submittal_type_id_fkey"
            columns: ["submittal_type_id"]
            isOneToOne: false
            referencedRelation: "submittal_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_status: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          last_successful_sync_at: string | null
          last_sync_at: string | null
          metadata: Json | null
          status: string | null
          sync_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_successful_sync_at?: string | null
          last_sync_at?: string | null
          metadata?: Json | null
          status?: string | null
          sync_type?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_successful_sync_at?: string | null
          last_sync_at?: string | null
          metadata?: Json | null
          status?: string | null
          sync_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assignee_email: string | null
          assignee_name: string | null
          client_id: number | null
          created_at: string
          description: string
          due_date: string | null
          embedding: string | null
          id: string
          metadata_id: string
          priority: string | null
          project_id: number | null
          project_ids: number[] | null
          segment_id: string | null
          source_chunk_id: string | null
          source_system: string
          status: string
          updated_at: string
        }
        Insert: {
          assignee_email?: string | null
          assignee_name?: string | null
          client_id?: number | null
          created_at?: string
          description: string
          due_date?: string | null
          embedding?: string | null
          id?: string
          metadata_id: string
          priority?: string | null
          project_id?: number | null
          project_ids?: number[] | null
          segment_id?: string | null
          source_chunk_id?: string | null
          source_system?: string
          status?: string
          updated_at?: string
        }
        Update: {
          assignee_email?: string | null
          assignee_name?: string | null
          client_id?: number | null
          created_at?: string
          description?: string
          due_date?: string | null
          embedding?: string | null
          id?: string
          metadata_id?: string
          priority?: string | null
          project_id?: number | null
          project_ids?: number[] | null
          segment_id?: string | null
          source_chunk_id?: string | null
          source_system?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_metadata_id_fkey"
            columns: ["metadata_id"]
            isOneToOne: false
            referencedRelation: "document_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_metadata_id_fkey"
            columns: ["metadata_id"]
            isOneToOne: false
            referencedRelation: "document_metadata_manual_only"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "meeting_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_source_chunk_id_fkey"
            columns: ["source_chunk_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_source_chunk_id_fkey"
            columns: ["source_chunk_id"]
            isOneToOne: false
            referencedRelation: "documents_ordered_view"
            referencedColumns: ["id"]
          },
        ]
      }
      todos: {
        Row: {
          id: number
          inserted_at: string
          is_complete: boolean | null
          task: string | null
          user_id: string
        }
        Insert: {
          id?: number
          inserted_at?: string
          is_complete?: boolean | null
          task?: string | null
          user_id: string
        }
        Update: {
          id?: number
          inserted_at?: string
          is_complete?: boolean | null
          task?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_admin: boolean | null
          role: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_admin?: boolean | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_projects: {
        Row: {
          company_name: string | null
          contact_phone: string | null
          created_at: string | null
          estimated_value: number | null
          id: string
          lead_score: number | null
          project_data: Json
          project_name: string | null
          status: string | null
          updated_at: string | null
          user_email: string | null
        }
        Insert: {
          company_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          estimated_value?: number | null
          id?: string
          lead_score?: number | null
          project_data: Json
          project_name?: string | null
          status?: string | null
          updated_at?: string | null
          user_email?: string | null
        }
        Update: {
          company_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          estimated_value?: number | null
          id?: string
          lead_score?: number | null
          project_data?: Json
          project_name?: string | null
          status?: string | null
          updated_at?: string | null
          user_email?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          email: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      vertical_markup: {
        Row: {
          calculation_order: number
          compound: boolean | null
          created_at: string | null
          id: string
          markup_type: string
          percentage: number
          project_id: number | null
          updated_at: string | null
        }
        Insert: {
          calculation_order: number
          compound?: boolean | null
          created_at?: string | null
          id?: string
          markup_type: string
          percentage: number
          project_id?: number | null
          updated_at?: string | null
        }
        Update: {
          calculation_order?: number
          compound?: boolean | null
          created_at?: string | null
          id?: string
          markup_type?: string
          percentage?: number
          project_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vertical_markup_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "vertical_markup_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vertical_markup_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vertical_markup_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "vertical_markup_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vertical_markup_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vertical_markup_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      actionable_insights: {
        Row: {
          assignee: string | null
          business_impact: string | null
          confidence_score: number | null
          created_at: string | null
          critical_path_impact: boolean | null
          cross_project_impact: number[] | null
          dependencies: string[] | null
          description: string | null
          doc_title: string | null
          document_id: string | null
          document_title: string | null
          document_type: string | null
          due_date: string | null
          exact_quotes: string[] | null
          financial_impact: number | null
          generated_by: string | null
          id: string | null
          insight_type: string | null
          meeting_date: string | null
          metadata: Json | null
          numerical_data: Json | null
          project_id: number | null
          project_name: string | null
          resolved: boolean | null
          severity: string | null
          source_meetings: string[] | null
          stakeholders_affected: string[] | null
          title: string | null
          urgency_indicators: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "document_insights_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_insights_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document_metadata_manual_only"
            referencedColumns: ["id"]
          },
        ]
      }
      active_submittals: {
        Row: {
          created_at: string | null
          critical_discrepancies: number | null
          current_version: number | null
          description: string | null
          discrepancy_count: number | null
          id: string | null
          metadata: Json | null
          priority: string | null
          project_id: number | null
          project_name: string | null
          required_approval_date: string | null
          specification_id: string | null
          status: string | null
          submission_date: string | null
          submittal_number: string | null
          submittal_type_id: string | null
          submittal_type_name: string | null
          submitted_by: string | null
          submitted_by_email: string | null
          submitter_company: string | null
          title: string | null
          total_versions: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_specification_id_fkey"
            columns: ["specification_id"]
            isOneToOne: false
            referencedRelation: "specifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_submittal_type_id_fkey"
            columns: ["submittal_type_id"]
            isOneToOne: false
            referencedRelation: "submittal_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_insights_today: {
        Row: {
          assigned_to: string | null
          assignee: string | null
          business_impact: string | null
          confidence_score: number | null
          created_at: string | null
          cross_project_impact: number[] | null
          dependencies: Json | null
          description: string | null
          document_id: string | null
          due_date: string | null
          exact_quotes: Json | null
          financial_impact: number | null
          id: number | null
          insight_type: string | null
          meeting_id: string | null
          meeting_name: string | null
          metadata: Json | null
          numerical_data: Json | null
          project_id: number | null
          project_name: string | null
          resolved: number | null
          resolved_at: string | null
          severity: string | null
          source_meetings: string | null
          stakeholders_affected: string[] | null
          status: string | null
          timeline_impact_days: number | null
          title: string | null
          urgency_indicators: string[] | null
        }
        Insert: {
          assigned_to?: string | null
          assignee?: string | null
          business_impact?: string | null
          confidence_score?: number | null
          created_at?: string | null
          cross_project_impact?: number[] | null
          dependencies?: Json | null
          description?: string | null
          document_id?: string | null
          due_date?: string | null
          exact_quotes?: Json | null
          financial_impact?: number | null
          id?: number | null
          insight_type?: string | null
          meeting_id?: string | null
          meeting_name?: string | null
          metadata?: Json | null
          numerical_data?: Json | null
          project_id?: number | null
          project_name?: string | null
          resolved?: number | null
          resolved_at?: string | null
          severity?: string | null
          source_meetings?: string | null
          stakeholders_affected?: string[] | null
          status?: string | null
          timeline_impact_days?: number | null
          title?: string | null
          urgency_indicators?: string[] | null
        }
        Update: {
          assigned_to?: string | null
          assignee?: string | null
          business_impact?: string | null
          confidence_score?: number | null
          created_at?: string | null
          cross_project_impact?: number[] | null
          dependencies?: Json | null
          description?: string | null
          document_id?: string | null
          due_date?: string | null
          exact_quotes?: Json | null
          financial_impact?: number | null
          id?: number | null
          insight_type?: string | null
          meeting_id?: string | null
          meeting_name?: string | null
          metadata?: Json | null
          numerical_data?: Json | null
          project_id?: number | null
          project_name?: string | null
          resolved?: number | null
          resolved_at?: string | null
          severity?: string | null
          source_meetings?: string | null
          stakeholders_affected?: string[] | null
          status?: string | null
          timeline_impact_days?: number | null
          title?: string | null
          urgency_indicators?: string[] | null
        }
        Relationships: []
      }
      ai_insights_with_project: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          description: string | null
          id: number | null
          insight_type: string | null
          meeting_id: string | null
          project_id: number | null
          project_name: string | null
          resolved: number | null
          severity: string | null
          source_meetings: string | null
          title: string | null
        }
        Relationships: []
      }
      contract_financial_summary: {
        Row: {
          approved_change_orders: number | null
          client_id: number | null
          contract_id: number | null
          contract_number: string | null
          draft_change_orders: number | null
          erp_status: string | null
          executed: boolean | null
          invoiced_amount: number | null
          original_contract_amount: number | null
          payments_received: number | null
          pending_change_orders: number | null
          percent_paid: number | null
          private: boolean | null
          remaining_balance: number | null
          revised_contract_amount: number | null
          status: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_financial_summary_mv: {
        Row: {
          approved_change_orders: number | null
          client_id: number | null
          contract_id: number | null
          contract_number: string | null
          draft_change_orders: number | null
          erp_status: string | null
          executed: boolean | null
          invoiced_amount: number | null
          original_contract_amount: number | null
          payments_received: number | null
          pending_change_orders: number | null
          percent_paid: number | null
          private: boolean | null
          project_id: number | null
          remaining_balance: number | null
          revised_contract_amount: number | null
          status: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_by_category: {
        Row: {
          avg_cost: number | null
          category: Database["public"]["Enums"]["issue_category"] | null
          issue_count: number | null
          total_cost: number | null
        }
        Relationships: []
      }
      cost_codes_with_division_title: {
        Row: {
          created_at: string | null
          division_id: string | null
          division_title: string | null
          division_title_current: string | null
          id: string | null
          status: string | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_codes_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "cost_code_divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      document_metadata_manual_only: {
        Row: {
          access_level: string | null
          action_items: string | null
          audio: string | null
          bullet_points: string | null
          captured_at: string | null
          category: string | null
          content: string | null
          content_hash: string | null
          created_at: string | null
          date: string | null
          description: string | null
          duration_minutes: number | null
          file_id: number | null
          fireflies_id: string | null
          fireflies_link: string | null
          id: string | null
          overview: string | null
          participants: string | null
          participants_array: string[] | null
          phase: string | null
          project: string | null
          project_id: number | null
          source: string | null
          status: string | null
          summary: string | null
          tags: string | null
          title: string | null
          type: string | null
          url: string | null
          video: string | null
        }
        Insert: {
          access_level?: string | null
          action_items?: string | null
          audio?: string | null
          bullet_points?: string | null
          captured_at?: string | null
          category?: string | null
          content?: string | null
          content_hash?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          duration_minutes?: number | null
          file_id?: number | null
          fireflies_id?: string | null
          fireflies_link?: string | null
          id?: string | null
          overview?: string | null
          participants?: string | null
          participants_array?: string[] | null
          phase?: string | null
          project?: string | null
          project_id?: number | null
          source?: string | null
          status?: string | null
          summary?: string | null
          tags?: string | null
          title?: string | null
          type?: string | null
          url?: string | null
          video?: string | null
        }
        Update: {
          access_level?: string | null
          action_items?: string | null
          audio?: string | null
          bullet_points?: string | null
          captured_at?: string | null
          category?: string | null
          content?: string | null
          content_hash?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          duration_minutes?: number | null
          file_id?: number | null
          fireflies_id?: string | null
          fireflies_link?: string | null
          id?: string | null
          overview?: string | null
          participants?: string | null
          participants_array?: string[] | null
          phase?: string | null
          project?: string | null
          project_id?: number | null
          source?: string | null
          status?: string | null
          summary?: string | null
          tags?: string | null
          title?: string | null
          type?: string | null
          url?: string | null
          video?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_metadata_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "document_metadata_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_metadata_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_metadata_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "document_metadata_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_metadata_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_metadata_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      document_metadata_view_no_summary: {
        Row: {
          date: string | null
          fireflies_id: string | null
          fireflies_link: string | null
          project: string | null
          project_id: number | null
          title: string | null
        }
        Insert: {
          date?: string | null
          fireflies_id?: string | null
          fireflies_link?: string | null
          project?: string | null
          project_id?: number | null
          title?: string | null
        }
        Update: {
          date?: string | null
          fireflies_id?: string | null
          fireflies_link?: string | null
          project?: string | null
          project_id?: number | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_metadata_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "document_metadata_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_metadata_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_metadata_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "document_metadata_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_metadata_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_metadata_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      documents_ordered_view: {
        Row: {
          created_at: string | null
          date: string | null
          fireflies_id: string | null
          id: string | null
          project: string | null
          project_id: number | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          fireflies_id?: string | null
          id?: string | null
          project?: string | null
          project_id?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string | null
          fireflies_id?: string | null
          id?: string | null
          project?: string | null
          project_id?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      figure_statistics: {
        Row: {
          metric: string | null
          value: string | null
        }
        Relationships: []
      }
      figure_summary: {
        Row: {
          asrs_type: string | null
          container_type: string | null
          figure_number: number | null
          figure_type: string | null
          keyword_count: number | null
          keywords: string | null
          max_depth: string | null
          max_spacing: string | null
          normalized_summary: string | null
          page_number: number | null
          related_tables: number[] | null
          title: string | null
        }
        Insert: {
          asrs_type?: string | null
          container_type?: string | null
          figure_number?: number | null
          figure_type?: string | null
          keyword_count?: never
          keywords?: never
          max_depth?: never
          max_spacing?: never
          normalized_summary?: string | null
          page_number?: number | null
          related_tables?: number[] | null
          title?: string | null
        }
        Update: {
          asrs_type?: string | null
          container_type?: string | null
          figure_number?: number | null
          figure_type?: string | null
          keyword_count?: never
          keywords?: never
          max_depth?: never
          max_spacing?: never
          normalized_summary?: string | null
          page_number?: number | null
          related_tables?: number[] | null
          title?: string | null
        }
        Relationships: []
      }
      open_tasks_view: {
        Row: {
          assignee: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string | null
          metadata: Json | null
          project_id: number | null
          project_name: string | null
          source_document_id: string | null
          source_document_title: string | null
          status: string | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "ai_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "ai_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "document_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "document_metadata_manual_only"
            referencedColumns: ["id"]
          },
        ]
      }
      procore_capture_summary: {
        Row: {
          category: string | null
          complexity: string | null
          display_name: string | null
          last_captured: string | null
          module_name: string | null
          priority: string | null
          screenshot_count: number | null
        }
        Relationships: []
      }
      procore_rebuild_estimate: {
        Row: {
          category: string | null
          module_count: number | null
          must_have_weeks: number | null
          nice_to_have_weeks: number | null
          total_weeks: number | null
        }
        Relationships: []
      }
      project_activity_view: {
        Row: {
          last_meeting_at: string | null
          last_task_update: string | null
          meeting_count: number | null
          name: string | null
          open_tasks: number | null
          project_id: number | null
        }
        Relationships: []
      }
      project_health_dashboard: {
        Row: {
          budget_utilization: number | null
          completion_percentage: number | null
          current_phase: string | null
          "est completion": string | null
          health_score: number | null
          health_status: string | null
          id: number | null
          last_document_date: string | null
          name: string | null
          open_critical_items: number | null
          recent_documents_count: number | null
          summary: string | null
          summary_updated_at: string | null
          total_insights_count: number | null
        }
        Insert: {
          budget_utilization?: never
          completion_percentage?: number | null
          current_phase?: string | null
          "est completion"?: string | null
          health_score?: number | null
          health_status?: string | null
          id?: number | null
          last_document_date?: never
          name?: string | null
          open_critical_items?: never
          recent_documents_count?: never
          summary?: string | null
          summary_updated_at?: string | null
          total_insights_count?: never
        }
        Update: {
          budget_utilization?: never
          completion_percentage?: number | null
          current_phase?: string | null
          "est completion"?: string | null
          health_score?: number | null
          health_status?: string | null
          id?: number | null
          last_document_date?: never
          name?: string | null
          open_critical_items?: never
          recent_documents_count?: never
          summary?: string | null
          summary_updated_at?: string | null
          total_insights_count?: never
        }
        Relationships: []
      }
      project_health_dashboard_no_summary: {
        Row: {
          budget_utilization: number | null
          completion_percentage: number | null
          current_phase: string | null
          "est completion": string | null
          health_score: number | null
          health_status: string | null
          id: number | null
          last_document_date: string | null
          name: string | null
          open_critical_items: number | null
          recent_documents_count: number | null
          summary_updated_at: string | null
          total_insights_count: number | null
        }
        Insert: {
          budget_utilization?: never
          completion_percentage?: number | null
          current_phase?: string | null
          "est completion"?: string | null
          health_score?: number | null
          health_status?: string | null
          id?: number | null
          last_document_date?: never
          name?: string | null
          open_critical_items?: never
          recent_documents_count?: never
          summary_updated_at?: string | null
          total_insights_count?: never
        }
        Update: {
          budget_utilization?: never
          completion_percentage?: number | null
          current_phase?: string | null
          "est completion"?: string | null
          health_score?: number | null
          health_status?: string | null
          id?: number | null
          last_document_date?: never
          name?: string | null
          open_critical_items?: never
          recent_documents_count?: never
          summary_updated_at?: string | null
          total_insights_count?: never
        }
        Relationships: []
      }
      project_issue_summary: {
        Row: {
          avg_cost_per_issue: number | null
          project_id: number | null
          project_name: string | null
          total_cost: number | null
          total_issues: number | null
        }
        Relationships: []
      }
      project_with_manager: {
        Row: {
          access: string | null
          address: string | null
          aliases: string[] | null
          archived: boolean | null
          archived_at: string | null
          archived_by: string | null
          budget: number | null
          budget_used: number | null
          category: string | null
          client: string | null
          client_id: number | null
          completion_percentage: number | null
          created_at: string | null
          current_phase: string | null
          erp_last_direct_cost_sync: string | null
          erp_last_job_cost_sync: string | null
          erp_sync_status: string | null
          erp_system: string | null
          "est completion": string | null
          "est profit": number | null
          "est revenue": number | null
          health_score: number | null
          health_status: string | null
          id: number | null
          "job number": string | null
          manager_email: string | null
          manager_id: number | null
          manager_name: string | null
          name: string | null
          onedrive: string | null
          phase: string | null
          project_manager: number | null
          "start date": string | null
          state: string | null
          summary: string | null
          summary_metadata: Json | null
          summary_updated_at: string | null
          team_members: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_project_manager_fkey"
            columns: ["project_manager"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_project_manager_fkey"
            columns: ["project_manager"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["manager_id"]
          },
        ]
      }
      sov_line_items_with_percentage: {
        Row: {
          cost_code_id: string | null
          created_at: string | null
          description: string | null
          id: string | null
          line_number: number | null
          percentage: number | null
          scheduled_value: number | null
          sov_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sov_line_items_sov_id_fkey"
            columns: ["sov_id"]
            isOneToOne: false
            referencedRelation: "schedule_of_values"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractors_summary: {
        Row: {
          asrs_experience_years: number | null
          avg_rating: number | null
          company_name: string | null
          fm_global_certified: boolean | null
          id: string | null
          on_time_percentage: number | null
          primary_contact_email: string | null
          primary_contact_name: string | null
          service_areas: string[] | null
          specialties: string[] | null
          status: string | null
          tier_level: string | null
          total_projects: number | null
        }
        Relationships: []
      }
      submittal_project_dashboard: {
        Row: {
          approved_submittals: number | null
          avg_review_time_days: number | null
          critical_discrepancies: number | null
          id: number | null
          name: string | null
          needs_revision: number | null
          pending_submittals: number | null
          status: string | null
          total_discrepancies: number | null
          total_submittals: number | null
          under_review: number | null
        }
        Relationships: []
      }
      v_budget_lines: {
        Row: {
          approved_co_total: number | null
          budget_mod_total: number | null
          cost_code_id: string | null
          cost_type_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string | null
          original_amount: number | null
          project_id: number | null
          revised_budget: number | null
          sub_job_id: string | null
          updated_at: string | null
        }
        Insert: {
          approved_co_total?: never
          budget_mod_total?: never
          cost_code_id?: string | null
          cost_type_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string | null
          original_amount?: number | null
          project_id?: number | null
          revised_budget?: never
          sub_job_id?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_co_total?: never
          budget_mod_total?: never
          cost_code_id?: string | null
          cost_type_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string | null
          original_amount?: number | null
          project_id?: number | null
          revised_budget?: never
          sub_job_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_lines_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes_with_division_title"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_cost_type_id_fkey"
            columns: ["cost_type_id"]
            isOneToOne: false
            referencedRelation: "cost_code_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "budget_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "budget_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_with_manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_sub_job_id_fkey"
            columns: ["sub_job_id"]
            isOneToOne: false
            referencedRelation: "sub_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      archive_task: {
        Args: { archived_by_param?: string; task_id_param: string }
        Returns: boolean
      }
      auto_archive_old_chats: { Args: never; Returns: number }
      backfill_meeting_participants_to_contacts: {
        Args: never
        Returns: {
          total_contacts_added: number
          unique_emails: string[]
        }[]
      }
      batch_update_project_assignments: {
        Args: { p_assignments: Json }
        Returns: {
          document_id: string
          error_message: string
          success: boolean
        }[]
      }
      compare_budget_snapshots: {
        Args: { p_snapshot_id_1: string; p_snapshot_id_2: string }
        Returns: {
          budget_code_id: string
          cost_code_description: string
          cost_code_id: string
          delta_original_budget: number
          delta_projected_costs: number
          delta_projected_over_under: number
          delta_revised_budget: number
          original_budget_1: number
          original_budget_2: number
          projected_costs_1: number
          projected_costs_2: number
          projected_over_under_1: number
          projected_over_under_2: number
          revised_budget_1: number
          revised_budget_2: number
        }[]
      }
      convert_embeddings_to_vector: { Args: never; Returns: undefined }
      create_budget_snapshot: {
        Args: {
          p_description?: string
          p_is_baseline?: boolean
          p_project_id: number
          p_snapshot_name: string
          p_snapshot_type?: string
        }
        Returns: string
      }
      create_conversation_with_message: {
        Args: {
          p_agent_type: string
          p_content: string
          p_metadata?: Json
          p_role: string
          p_title: string
        }
        Returns: string
      }
      email_to_names: {
        Args: { email: string }
        Returns: {
          first_name: string
          last_name: string
        }[]
      }
      enhanced_match_chunks: {
        Args: {
          date_after?: string
          doc_type_filter?: string
          match_count?: number
          project_filter?: number
          query_embedding: string
        }
        Returns: {
          chunk_id: string
          content: string
          created_at: string
          document_id: string
          document_source: string
          document_title: string
          metadata: Json
          similarity: number
        }[]
      }
      execute_custom_sql: { Args: { sql_query: string }; Returns: Json }
      extract_names: {
        Args: { participant: string }
        Returns: {
          first_name: string
          last_name: string
        }[]
      }
      find_duplicate_insights: {
        Args: { p_similarity_threshold?: number }
        Returns: {
          insight1_id: number
          insight2_id: number
          same_document: boolean
          same_project: boolean
          similarity_score: number
          title1: string
          title2: string
        }[]
      }
      find_sprinkler_requirements:
        | {
            Args: {
              p_asrs_type?: string
              p_ceiling_height_ft?: number
              p_commodity_class?: string
              p_k_factor?: number
              p_system_type?: string
            }
            Returns: {
              ceiling_height_ft: number
              k_factor: number
              k_type: string
              pressure_bar: number
              pressure_psi: number
              special_conditions: string[]
              sprinkler_count: number
              sprinkler_orientation: string
              sprinkler_response: string
              table_id: string
              table_number: number
              title: string
            }[]
          }
        | {
            Args: {
              p_asrs_type?: string
              p_ceiling_height_ft?: number
              p_commodity_class?: string
              p_system_type?: string
              p_tolerance_ft?: number
            }
            Returns: {
              height_match_type: string
              k_factor: number
              pressure_psi: number
              special_conditions: string[]
              sprinkler_count: number
              table_id: string
              table_number: number
              title: string
            }[]
          }
      full_text_search_meetings: {
        Args: { match_count?: number; search_query: string }
        Returns: {
          category: string
          content: string
          date: string
          id: string
          participants: string
          rank: number
          title: string
        }[]
      }
      generate_optimization_recommendations: {
        Args: { project_data: Json }
        Returns: {
          implementation_effort: string
          priority: string
          recommendation: string
          savings_potential: number
          technical_details: Json
        }[]
      }
      generate_optimizations: {
        Args: { p_user_input: Json }
        Returns: {
          description: string
          estimated_savings: number
          implementation_effort: string
          optimization_type: string
          title: string
        }[]
      }
      get_all_project_documents: {
        Args: { in_project_id: number }
        Returns: {
          content: string
          date: string
          duration_minutes: number
          id: string
          participants: string
          project_id: number
          summary: string
          title: string
          url: string
        }[]
      }
      get_asrs_figure_options: {
        Args: never
        Returns: {
          asrs_types: string[]
          container_types: string[]
          orientation_types: string[]
          rack_depths: string[]
          spacings: string[]
        }[]
      }
      get_conversation_with_history: {
        Args: { p_conversation_id: string }
        Returns: {
          agent_type: string
          content: string
          conversation_created_at: string
          conversation_id: string
          message_created_at: string
          message_id: string
          message_metadata: Json
          role: string
          title: string
        }[]
      }
      get_document_chunks: {
        Args: { doc_id: string }
        Returns: {
          chunk_id: string
          chunk_index: number
          content: string
          metadata: Json
        }[]
      }
      get_document_insights_page: {
        Args: {
          in_cursor_created_at: string
          in_cursor_id: string
          in_page_size: number
          in_search: string
          in_sort_by: string
          in_sort_dir: string
        }
        Returns: {
          confidence_score: number
          document_date: string
          document_id: string
          document_summary: string
          document_title: string
          document_url: string
          insight_created_at: string
          insight_description: string
          insight_id: string
          insight_title: string
          insight_type: string
          project_id: string
          project_name: string
          total_count: number
        }[]
      }
      get_figures_by_config: {
        Args: {
          p_asrs_type: string
          p_container_type: string
          p_orientation_type?: string
        }
        Returns: {
          figure_number: string
          max_horizontal_spacing: string
          name: string
          order_number: number
          rack_row_depth: string
        }[]
      }
      get_fm_global_references_by_topic: {
        Args: { limit_count?: number; topic: string }
        Returns: {
          asrs_relevance: string
          reference_number: string
          reference_type: string
          section: string
          title: string
        }[]
      }
      get_insights_processing_stats: {
        Args: { p_days_back?: number }
        Returns: {
          avg_insights_per_document: number
          processed_documents: number
          processing_rate: number
          recent_activity: Json
          top_categories: Json
          total_documents: number
          total_insights: number
        }[]
      }
      get_meeting_analytics: {
        Args: never
        Returns: {
          avg_duration_minutes: number
          meetings_by_category: Json
          recent_meetings_count: number
          top_participants: Json
          total_meetings: number
        }[]
      }
      get_meeting_frequency_stats: {
        Args: { p_days_back?: number }
        Returns: {
          meeting_count: number
          period_date: string
          total_duration_minutes: number
          unique_participants: number
        }[]
      }
      get_meeting_statistics: {
        Args: never
        Returns: {
          avg_duration_minutes: number
          meetings_this_week: number
          open_risks: number
          pending_actions: number
          total_meetings: number
          total_participants: number
        }[]
      }
      get_page_parents: {
        Args: { page_id: number }
        Returns: {
          id: number
          meta: Json
          parent_page_id: number
          path: string
        }[]
      }
      get_pending_documents: {
        Args: {
          p_category?: string
          p_date_from?: string
          p_date_to?: string
          p_exclude_processed?: boolean
          p_limit?: number
          p_project_id?: number
        }
        Returns: {
          action_items: string
          bullet_points: string
          category: string
          content: string
          content_length: number
          date: string
          duration_minutes: number
          entities: Json
          has_existing_insights: boolean
          id: string
          outline: string
          participants: string
          project: string
          project_id: number
          title: string
        }[]
      }
      get_priority_insights: {
        Args: { p_limit?: number; p_project_id?: number }
        Returns: {
          assignee: string
          confidence_score: number
          days_until_due: number
          description: string
          document_id: string
          due_date: string
          id: string
          insight_type: string
          project_id: number
          severity: string
          title: string
        }[]
      }
      get_project_documents_page: {
        Args: {
          in_cursor_date: string
          in_cursor_id: string
          in_page_size: number
          in_project_id: number
          in_search: string
          in_sort_by: string
          in_sort_dir: string
        }
        Returns: {
          content: string
          date: string
          duration_minutes: number
          id: string
          next_cursor_date: string
          next_cursor_id: string
          participants: string
          project_id: number
          summary: string
          title: string
          total_count: number
          url: string
        }[]
      }
      get_project_matching_context: {
        Args: never
        Returns: {
          active_keywords: string[]
          aliases: string[]
          category: string
          description: string
          id: number
          keywords: string[]
          name: string
          phase: string
          stakeholders: string[]
          team_members: string[]
        }[]
      }
      get_projects_needing_summary_update: {
        Args: { hours_threshold?: number }
        Returns: {
          hours_since_update: number
          last_update: string
          project_id: number
          project_name: string
        }[]
      }
      get_recent_project_insights: {
        Args: { p_days_back?: number; p_limit?: number; p_project_id: string }
        Returns: {
          assigned_to: string
          content: string
          created_at: string
          due_date: string
          insight_id: string
          insight_type: string
          meeting_date: string
          meeting_id: string
          meeting_title: string
          priority: string
          status: string
        }[]
      }
      get_related_content: {
        Args: { chunk_id: string; max_results?: number }
        Returns: {
          content_type: string
          page_number: number
          relevance_score: number
          summary: string
          title: string
        }[]
      }
      get_user_chat_stats: {
        Args: { p_user_id: string }
        Returns: {
          active_chats: number
          archived_chats: number
          starred_chats: number
          total_chats: number
          total_messages: number
          total_tokens_used: number
        }[]
      }
      hybrid_search:
        | {
            Args: {
              filter_project_id?: number
              match_count?: number
              query_embedding: string
            }
            Returns: {
              description: string
              id: string
              metadata_id: string
              project_id: number
              similarity: number
              source_type: string
            }[]
          }
        | {
            Args: {
              match_count?: number
              query_embedding: string
              query_text: string
              text_weight?: number
            }
            Returns: {
              chunk_id: string
              combined_score: number
              content: string
              document_id: string
              document_source: string
              document_title: string
              metadata: Json
              text_similarity: number
              vector_similarity: number
            }[]
          }
      hybrid_search_fm_global: {
        Args: {
          filter_asrs_type?: string
          match_count?: number
          query_embedding: string
          query_text: string
          text_weight?: number
        }
        Returns: {
          asrs_topic: string
          combined_score: number
          content: string
          design_parameter: string
          figure_number: string
          metadata: Json
          reference_title: string
          regulation_section: string
          source_id: string
          source_type: string
          table_number: string
          text_similarity: number
          vector_id: string
          vector_similarity: number
        }[]
      }
      increment_session_tokens: {
        Args: { session_id: string; tokens_to_add: number }
        Returns: undefined
      }
      interpolate_sprinkler_requirements: {
        Args: { p_table_id: string; p_target_height_ft: number }
        Returns: {
          interpolated_count: number
          interpolated_height_ft: number
          interpolated_pressure: number
          k_factor: number
          k_type: string
          lower_height_ft: number
          note: string
          table_id: string
          upper_height_ft: number
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      mark_document_processed: {
        Args: {
          p_document_id: string
          p_insights_count?: number
          p_projects_assigned?: number
        }
        Returns: boolean
      }
      match_archon_code_examples: {
        Args: {
          filter?: Json
          match_count?: number
          query_embedding: string
          source_filter?: string
        }
        Returns: {
          chunk_number: number
          content: string
          id: number
          metadata: Json
          similarity: number
          source_id: string
          summary: string
          url: string
        }[]
      }
      match_archon_crawled_pages: {
        Args: {
          filter?: Json
          match_count?: number
          query_embedding: string
          source_filter?: string
        }
        Returns: {
          chunk_number: number
          content: string
          id: number
          metadata: Json
          similarity: number
          source_id: string
          url: string
        }[]
      }
      match_chunks: {
        Args: { match_count?: number; query_embedding: string }
        Returns: {
          chunk_id: string
          content: string
          document_id: string
          document_source: string
          document_title: string
          metadata: Json
          similarity: number
        }[]
      }
      match_code_examples: {
        Args: {
          filter?: Json
          match_count?: number
          query_embedding: string
          source_filter?: string
        }
        Returns: {
          chunk_number: number
          content: string
          id: number
          metadata: Json
          similarity: number
          source_id: string
          summary: string
          url: string
        }[]
      }
      match_crawled_pages: {
        Args: {
          filter?: Json
          match_count?: number
          query_embedding: string
          source_filter?: string
        }
        Returns: {
          chunk_number: number
          content: string
          id: number
          metadata: Json
          similarity: number
          source_id: string
          url: string
        }[]
      }
      match_decisions: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          created_at: string
          description: string
          effective_date: string
          id: string
          impact: string
          metadata_id: string
          owner_name: string
          project_id: number
          project_ids: number[]
          rationale: string
          segment_id: string
          similarity: number
          status: string
        }[]
      }
      match_decisions_by_project: {
        Args: {
          filter_project_ids: number[]
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          created_at: string
          description: string
          effective_date: string
          id: string
          impact: string
          metadata_id: string
          owner_name: string
          project_id: number
          project_ids: number[]
          rationale: string
          segment_id: string
          similarity: number
          status: string
        }[]
      }
      match_document_chunks: {
        Args: {
          filter_document_ids?: string[]
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          chunk_id: string
          chunk_index: number
          created_at: string
          document_id: string
          metadata: Json
          similarity: number
          text: string
        }[]
      }
      match_documents:
        | {
            Args: {
              filter?: Json
              match_count?: number
              query_embedding: string
            }
            Returns: {
              content: string
              id: string
              metadata: Json
              similarity: number
            }[]
          }
        | {
            Args: {
              filter_doc_type?: string
              filter_metadata_ids?: string[]
              filter_project_id?: number
              match_count?: number
              match_threshold?: number
              query_embedding: string
            }
            Returns: {
              chunk_index: number
              content: string
              doc_type: string
              id: string
              meeting_date: string
              metadata_id: string
              project_id: number
              segment_id: string
              similarity: number
              tags: string[]
            }[]
          }
      match_documents_enhanced: {
        Args: {
          category_filter?: string
          date_after_filter?: string
          match_count?: number
          participants_filter?: string
          project_filter?: string
          query_embedding: string
          year_filter?: number
        }
        Returns: {
          content: string
          id: string
          metadata: Json
          similarity: number
        }[]
      }
      match_documents_full: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          created_at: string
          file_date: string
          file_id: string
          id: number
          metadata: Json
          project_id: number
          project_ids: number[]
          similarity: number
          source: string
          title: string
        }[]
      }
      match_files: {
        Args: { filter?: Json; match_count?: number; query_embedding: string }
        Returns: {
          content: string
          id: number
          metadata: Json
          similarity: number
        }[]
      }
      match_fm_documents: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          metadata: Json
          similarity: number
          title: string
        }[]
      }
      match_fm_global_vectors: {
        Args: {
          filter_asrs_type?: string
          filter_source_type?: string
          match_count?: number
          query_embedding: string
        }
        Returns: {
          asrs_topic: string
          content: string
          design_parameter: string
          figure_number: string
          metadata: Json
          reference_title: string
          regulation_section: string
          similarity: number
          source_id: string
          source_type: string
          table_number: string
          vector_id: string
        }[]
      }
      match_fm_tables:
        | {
            Args: {
              match_count?: number
              match_threshold?: number
              query_embedding: string
            }
            Returns: {
              asrs_type: string
              metadata: Json
              similarity: number
              system_type: string
              table_id: string
              title: string
            }[]
          }
        | {
            Args: {
              match_count?: number
              match_threshold?: number
              query_embedding: string
            }
            Returns: {
              content_text: string
              content_type: string
              metadata: Json
              similarity: number
              table_id: string
            }[]
          }
      match_meeting_chunks: {
        Args: {
          match_count?: number
          match_threshold?: number
          p_meeting_id?: string
          p_project_id?: number
          query_embedding: string
        }
        Returns: {
          chunk_index: number
          content: string
          end_timestamp: number
          id: string
          meeting_id: string
          project_id: number
          similarity: number
          speaker_info: Json
          start_timestamp: number
        }[]
      }
      match_meeting_chunks_with_project: {
        Args: {
          match_count?: number
          match_threshold?: number
          p_project_id?: number
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          meeting_id: string
          project_id: number
          similarity: number
          speaker_info: Json
          start_timestamp: number
        }[]
      }
      match_meeting_segments: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          created_at: string
          decisions: Json
          id: string
          metadata_id: string
          project_ids: number[]
          risks: Json
          segment_index: number
          similarity: number
          summary: string
          tasks: Json
          title: string
        }[]
      }
      match_meeting_segments_by_project: {
        Args: {
          filter_project_ids: number[]
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          created_at: string
          decisions: Json
          id: string
          metadata_id: string
          project_ids: number[]
          risks: Json
          segment_index: number
          similarity: number
          summary: string
          tasks: Json
          title: string
        }[]
      }
      match_meetings: {
        Args: {
          after_date?: string
          filter_project_id?: number
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          fireflies_id: string
          id: string
          project_id: number
          similarity: number
          started_at: string
          themes: string[]
          title: string
        }[]
      }
      match_memories: {
        Args: { filter?: Json; match_count?: number; query_embedding: string }
        Returns: {
          content: string
          id: number
          metadata: Json
          similarity: number
        }[]
      }
      match_opportunities: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          created_at: string
          description: string
          id: string
          metadata_id: string
          next_step: string
          owner_name: string
          project_id: number
          project_ids: number[]
          segment_id: string
          similarity: number
          status: string
          type: string
        }[]
      }
      match_page_sections: {
        Args: {
          embedding: string
          match_count: number
          match_threshold: number
          min_content_length: number
        }
        Returns: {
          content: string
          heading: string
          id: number
          page_id: number
          similarity: number
          slug: string
        }[]
      }
      match_recent_documents: {
        Args: {
          days_back?: number
          match_count?: number
          query_embedding: string
        }
        Returns: {
          content: string
          document_date: string
          id: string
          metadata: Json
          similarity: number
        }[]
      }
      match_risks: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          category: string
          created_at: string
          description: string
          id: string
          impact: string
          likelihood: string
          metadata_id: string
          mitigation_plan: string
          owner_name: string
          project_id: number
          project_ids: number[]
          segment_id: string
          similarity: number
          status: string
        }[]
      }
      match_risks_by_project: {
        Args: {
          filter_project_ids: number[]
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          category: string
          created_at: string
          description: string
          id: string
          impact: string
          likelihood: string
          metadata_id: string
          mitigation_plan: string
          owner_name: string
          project_id: number
          project_ids: number[]
          segment_id: string
          similarity: number
          status: string
        }[]
      }
      match_segments: {
        Args: {
          filter_metadata_ids?: string[]
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          id: string
          metadata_id: string
          segment_index: number
          similarity: number
          summary: string
          title: string
        }[]
      }
      match_tasks: {
        Args: {
          filter_assignee?: string
          filter_project_id?: number
          filter_status?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          assignee_name: string
          created_at: string
          description: string
          due_date: string
          id: string
          metadata_id: string
          priority: string
          project_id: number
          similarity: number
          status: string
        }[]
      }
      normalize_exact_quotes: { Args: { in_json: Json }; Returns: string }
      refresh_budget_rollup: {
        Args: { p_project_id?: number }
        Returns: undefined
      }
      refresh_contract_financial_summary: { Args: never; Returns: undefined }
      refresh_search_vectors: { Args: never; Returns: undefined }
      search_all_knowledge: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          created_at: string
          metadata: Json
          project_ids: number[]
          record_id: string
          similarity: number
          source_table: string
        }[]
      }
      search_asrs_figures: {
        Args: {
          p_asrs_type?: string
          p_container_type?: string
          p_orientation_type?: string
          p_rack_depth?: string
          p_search_text?: string
          p_spacing?: string
        }
        Returns: {
          asrs_type: string
          container_type: string
          figure_number: string
          id: string
          max_horizontal_spacing: string
          name: string
          order_number: number
          orientation_type: string
          rack_row_depth: string
          relevance_score: number
        }[]
      }
      search_by_category: {
        Args: {
          category: string
          match_count?: number
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          meeting_category: string
          metadata: Json
          similarity: number
        }[]
      }
      search_by_participants: {
        Args: {
          match_count?: number
          participant_name: string
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          metadata: Json
          participants: string
          similarity: number
        }[]
      }
      search_documentation: {
        Args: {
          limit_count?: number
          query_text: string
          section_filter?: string
        }
        Returns: {
          block_content: string
          page_reference: number
          rank: number
          section_id: string
          section_slug: string
          section_title: string
        }[]
      }
      search_fm_global_all: {
        Args: {
          match_count?: number
          query_embedding: string
          query_text: string
        }
        Returns: {
          content: string
          metadata: Json
          similarity: number
          source_id: string
          source_table: string
          source_type: string
          title: string
        }[]
      }
      search_meeting_chunks:
        | {
            Args: {
              chunk_types?: string[]
              date_from?: string
              date_to?: string
              match_count?: number
              match_threshold?: number
              project_filter?: number
              query_embedding: string
            }
            Returns: {
              chunk_id: string
              chunk_index: number
              chunk_text: string
              chunk_type: string
              meeting_date: string
              meeting_id: string
              meeting_title: string
              metadata: Json
              project_id: number
              rank_score: number
              similarity: number
              speakers: Json
            }[]
          }
        | {
            Args: {
              match_count?: number
              match_threshold?: number
              project_filter?: string
              query_embedding: string
            }
            Returns: {
              chunk_end_time: number
              chunk_index: number
              chunk_start_time: number
              chunk_text: string
              id: string
              meeting_date: string
              meeting_id: string
              meeting_title: string
              project_id: string
              project_title: string
              similarity: number
              speaker_info: Json
            }[]
          }
      search_meeting_chunks_semantic: {
        Args: {
          filter_meeting_id?: string
          filter_project_id?: number
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          chunk_content: string
          chunk_id: string
          chunk_index: number
          meeting_date: string
          meeting_id: string
          meeting_title: string
          project_id: number
          similarity: number
          speaker_info: Json
        }[]
      }
      search_meeting_embeddings: {
        Args: {
          match_count?: number
          match_threshold?: number
          project_filter?: number
          query_embedding: string
        }
        Returns: {
          chunk_index: number
          meeting_id: string
          metadata: Json
          similarity: number
        }[]
      }
      search_text_chunks: {
        Args: {
          compliance_filter?: string
          cost_impact_filter?: string
          embedding_vector?: string
          match_threshold?: number
          max_results?: number
          page_filter?: number
          search_query: string
        }
        Returns: {
          chunk_summary: string
          clause_id: string
          cost_impact: string
          id: string
          page_number: number
          raw_text: string
          savings_opportunities: string[]
          similarity: number
          topics: string[]
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      suggest_project_assignments: {
        Args: {
          p_document_content: string
          p_document_title?: string
          p_participants?: string
          p_top_matches?: number
        }
        Returns: {
          match_reasons: string[]
          match_score: number
          project_id: number
          project_name: string
        }[]
      }
      text_search_chunks: {
        Args: { match_count?: number; search_query: string }
        Returns: {
          chunk_id: string
          chunk_summary: string
          content: string
          doc_id: string
          page_number: number
          related_figures: string[]
          related_tables: string[]
          section_path: string[]
        }[]
      }
      text2ltree: { Args: { "": string }; Returns: unknown }
      update_document_project_assignment: {
        Args: {
          p_confidence?: number
          p_document_id: string
          p_project_id: number
          p_reasoning?: string
        }
        Returns: boolean
      }
      validate_project_assignment: {
        Args: { p_document_id: string; p_project_id: number }
        Returns: {
          confidence: number
          is_valid: boolean
          validation_notes: string[]
        }[]
      }
      vector_search: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          meeting_id: string
          similarity: number
        }[]
      }
    }
    Enums: {
      billing_period_status: "open" | "closed" | "approved"
      budget_status: "locked" | "unlocked"
      calculation_method: "unit_price" | "lump_sum" | "percentage"
      change_event_status: "open" | "closed"
      change_order_status: "draft" | "pending" | "approved" | "void"
      commitment_type: "subcontract" | "purchase_order" | "service_order"
      company_type: "vendor" | "subcontractor" | "owner" | "architect" | "other"
      contract_status:
        | "draft"
        | "pending"
        | "executed"
        | "closed"
        | "terminated"
      contract_type: "prime_contract" | "commitment"
      erp_sync_status: "pending" | "synced" | "failed" | "resyncing"
      invoice_status: "draft" | "pending" | "approved" | "paid" | "void"
      issue_category:
        | "Design"
        | "Submittal"
        | "Scheduling"
        | "Procurement"
        | "Installation"
        | "Safety"
        | "Change Order"
        | "Other"
      issue_severity: "Low" | "Medium" | "High" | "Critical"
      issue_status: "Open" | "In Progress" | "Resolved" | "Pending Verification"
      project_status: "active" | "inactive" | "complete"
      task_status: "todo" | "doing" | "review" | "done"
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
    Enums: {
      billing_period_status: ["open", "closed", "approved"],
      budget_status: ["locked", "unlocked"],
      calculation_method: ["unit_price", "lump_sum", "percentage"],
      change_event_status: ["open", "closed"],
      change_order_status: ["draft", "pending", "approved", "void"],
      commitment_type: ["subcontract", "purchase_order", "service_order"],
      company_type: ["vendor", "subcontractor", "owner", "architect", "other"],
      contract_status: ["draft", "pending", "executed", "closed", "terminated"],
      contract_type: ["prime_contract", "commitment"],
      erp_sync_status: ["pending", "synced", "failed", "resyncing"],
      invoice_status: ["draft", "pending", "approved", "paid", "void"],
      issue_category: [
        "Design",
        "Submittal",
        "Scheduling",
        "Procurement",
        "Installation",
        "Safety",
        "Change Order",
        "Other",
      ],
      issue_severity: ["Low", "Medium", "High", "Critical"],
      issue_status: ["Open", "In Progress", "Resolved", "Pending Verification"],
      project_status: ["active", "inactive", "complete"],
      task_status: ["todo", "doing", "review", "done"],
    },
  },
} as const
