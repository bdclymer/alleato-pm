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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      __drizzle_migrations: {
        Row: {
          created_at: string | null
          hash: string
        }
        Insert: {
          created_at?: string | null
          hash: string
        }
        Update: {
          created_at?: string | null
          hash?: string
        }
        Relationships: []
      }
      acumatica_ap_bill_lines: {
        Row: {
          account: string | null
          amount: number | null
          bill_id: number
          cost_code: string | null
          created_at: string
          description: string | null
          extended_cost: number | null
          id: number
          inventory_id: string | null
          line_nbr: number | null
          po_order_nbr: string | null
          po_order_type: string | null
          project_code: string | null
          project_task: string | null
          qty: number | null
          raw_payload: Json | null
          tax_category: string | null
          transaction_description: string | null
          unit_cost: number | null
          uom: string | null
        }
        Insert: {
          account?: string | null
          amount?: number | null
          bill_id: number
          cost_code?: string | null
          created_at?: string
          description?: string | null
          extended_cost?: number | null
          id?: number
          inventory_id?: string | null
          line_nbr?: number | null
          po_order_nbr?: string | null
          po_order_type?: string | null
          project_code?: string | null
          project_task?: string | null
          qty?: number | null
          raw_payload?: Json | null
          tax_category?: string | null
          transaction_description?: string | null
          unit_cost?: number | null
          uom?: string | null
        }
        Update: {
          account?: string | null
          amount?: number | null
          bill_id?: number
          cost_code?: string | null
          created_at?: string
          description?: string | null
          extended_cost?: number | null
          id?: number
          inventory_id?: string | null
          line_nbr?: number | null
          po_order_nbr?: string | null
          po_order_type?: string | null
          project_code?: string | null
          project_task?: string | null
          qty?: number | null
          raw_payload?: Json | null
          tax_category?: string | null
          transaction_description?: string | null
          unit_cost?: number | null
          uom?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acumatica_ap_bill_lines_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "acumatica_ap_bills"
            referencedColumns: ["id"]
          },
        ]
      }
      acumatica_ap_bills: {
        Row: {
          acumatica_sync_at: string | null
          amount: number | null
          approved_for_payment: boolean | null
          balance: number | null
          cash_account: string | null
          company_id: string | null
          created_at: string
          currency_id: string | null
          date: string | null
          description: string | null
          document_type: string | null
          due_date: string | null
          external_key: string
          hold: boolean | null
          id: number
          last_modified_at: string | null
          post_period: string | null
          project_code: string | null
          project_id: number | null
          raw_payload: Json | null
          reference_nbr: string
          status: string | null
          tax_total: number | null
          terms: string | null
          updated_at: string
          vendor_id: string | null
          vendor_ref: string | null
        }
        Insert: {
          acumatica_sync_at?: string | null
          amount?: number | null
          approved_for_payment?: boolean | null
          balance?: number | null
          cash_account?: string | null
          company_id?: string | null
          created_at?: string
          currency_id?: string | null
          date?: string | null
          description?: string | null
          document_type?: string | null
          due_date?: string | null
          external_key: string
          hold?: boolean | null
          id?: number
          last_modified_at?: string | null
          post_period?: string | null
          project_code?: string | null
          project_id?: number | null
          raw_payload?: Json | null
          reference_nbr: string
          status?: string | null
          tax_total?: number | null
          terms?: string | null
          updated_at?: string
          vendor_id?: string | null
          vendor_ref?: string | null
        }
        Update: {
          acumatica_sync_at?: string | null
          amount?: number | null
          approved_for_payment?: boolean | null
          balance?: number | null
          cash_account?: string | null
          company_id?: string | null
          created_at?: string
          currency_id?: string | null
          date?: string | null
          description?: string | null
          document_type?: string | null
          due_date?: string | null
          external_key?: string
          hold?: boolean | null
          id?: number
          last_modified_at?: string | null
          post_period?: string | null
          project_code?: string | null
          project_id?: number | null
          raw_payload?: Json | null
          reference_nbr?: string
          status?: string | null
          tax_total?: number | null
          terms?: string | null
          updated_at?: string
          vendor_id?: string | null
          vendor_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acumatica_ap_bills_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acumatica_ap_bills_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "acumatica_ap_bills_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acumatica_ap_bills_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acumatica_ap_bills_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "acumatica_ap_bills_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acumatica_ap_bills_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acumatica_ap_bills_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      acumatica_ar_invoice_lines: {
        Row: {
          account: string | null
          amount: number | null
          cost_code: string | null
          created_at: string | null
          discount_amount: number | null
          extended_price: number | null
          id: number
          invoice_id: number
          line_nbr: number | null
          project_task: string | null
          qty: number | null
          tax_category: string | null
          transaction_description: string | null
          unit_price: number | null
          uom: string | null
        }
        Insert: {
          account?: string | null
          amount?: number | null
          cost_code?: string | null
          created_at?: string | null
          discount_amount?: number | null
          extended_price?: number | null
          id?: number
          invoice_id: number
          line_nbr?: number | null
          project_task?: string | null
          qty?: number | null
          tax_category?: string | null
          transaction_description?: string | null
          unit_price?: number | null
          uom?: string | null
        }
        Update: {
          account?: string | null
          amount?: number | null
          cost_code?: string | null
          created_at?: string | null
          discount_amount?: number | null
          extended_price?: number | null
          id?: number
          invoice_id?: number
          line_nbr?: number | null
          project_task?: string | null
          qty?: number | null
          tax_category?: string | null
          transaction_description?: string | null
          unit_price?: number | null
          uom?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acumatica_ar_invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "acumatica_ar_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      acumatica_ar_invoices: {
        Row: {
          acumatica_sync_at: string | null
          amount: number | null
          balance: number | null
          billing_period: string | null
          billing_period_id: string | null
          company_id: string | null
          created_at: string | null
          customer: string | null
          date: string | null
          description: string | null
          due_date: string | null
          hold: boolean | null
          id: number
          link_ar_account: string | null
          post_period: string | null
          project: string | null
          project_id: number | null
          reference_nbr: string
          status: string | null
          tax_total: number | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          acumatica_sync_at?: string | null
          amount?: number | null
          balance?: number | null
          billing_period?: string | null
          billing_period_id?: string | null
          company_id?: string | null
          created_at?: string | null
          customer?: string | null
          date?: string | null
          description?: string | null
          due_date?: string | null
          hold?: boolean | null
          id?: number
          link_ar_account?: string | null
          post_period?: string | null
          project?: string | null
          project_id?: number | null
          reference_nbr: string
          status?: string | null
          tax_total?: number | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          acumatica_sync_at?: string | null
          amount?: number | null
          balance?: number | null
          billing_period?: string | null
          billing_period_id?: string | null
          company_id?: string | null
          created_at?: string | null
          customer?: string | null
          date?: string | null
          description?: string | null
          due_date?: string | null
          hold?: boolean | null
          id?: number
          link_ar_account?: string | null
          post_period?: string | null
          project?: string | null
          project_id?: number | null
          reference_nbr?: string
          status?: string | null
          tax_total?: number | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acumatica_ar_invoices_billing_period_id_fkey"
            columns: ["billing_period_id"]
            isOneToOne: false
            referencedRelation: "billing_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acumatica_ar_invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "acumatica_ar_invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acumatica_ar_invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acumatica_ar_invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "acumatica_ar_invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acumatica_ar_invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acumatica_ar_invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      acumatica_change_orders: {
        Row: {
          acumatica_sync_at: string | null
          change_date: string | null
          class: string | null
          commitments_change_total: number | null
          company_id: string | null
          completion_date: string | null
          contract_time_change_days: number | null
          cost_budget_change_total: number | null
          created_at: string
          customer_id: string | null
          description: string | null
          detailed_description: string | null
          external_key: string
          external_ref_nbr: string | null
          gross_margin: number | null
          gross_margin_amount: number | null
          hold: boolean | null
          id: number
          last_modified_at: string | null
          original_co_ref_nbr: string | null
          project_code: string | null
          project_id: number | null
          raw_payload: Json | null
          reference_nbr: string
          revenue_budget_change_total: number | null
          revenue_change_nbr: string | null
          reverse_status: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          acumatica_sync_at?: string | null
          change_date?: string | null
          class?: string | null
          commitments_change_total?: number | null
          company_id?: string | null
          completion_date?: string | null
          contract_time_change_days?: number | null
          cost_budget_change_total?: number | null
          created_at?: string
          customer_id?: string | null
          description?: string | null
          detailed_description?: string | null
          external_key: string
          external_ref_nbr?: string | null
          gross_margin?: number | null
          gross_margin_amount?: number | null
          hold?: boolean | null
          id?: number
          last_modified_at?: string | null
          original_co_ref_nbr?: string | null
          project_code?: string | null
          project_id?: number | null
          raw_payload?: Json | null
          reference_nbr: string
          revenue_budget_change_total?: number | null
          revenue_change_nbr?: string | null
          reverse_status?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          acumatica_sync_at?: string | null
          change_date?: string | null
          class?: string | null
          commitments_change_total?: number | null
          company_id?: string | null
          completion_date?: string | null
          contract_time_change_days?: number | null
          cost_budget_change_total?: number | null
          created_at?: string
          customer_id?: string | null
          description?: string | null
          detailed_description?: string | null
          external_key?: string
          external_ref_nbr?: string | null
          gross_margin?: number | null
          gross_margin_amount?: number | null
          hold?: boolean | null
          id?: number
          last_modified_at?: string | null
          original_co_ref_nbr?: string | null
          project_code?: string | null
          project_id?: number | null
          raw_payload?: Json | null
          reference_nbr?: string
          revenue_budget_change_total?: number | null
          revenue_change_nbr?: string | null
          reverse_status?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "acumatica_change_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acumatica_change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "acumatica_change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acumatica_change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acumatica_change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "acumatica_change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acumatica_change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acumatica_change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      acumatica_checks: {
        Row: {
          acumatica_sync_at: string | null
          application_date: string | null
          cash_account: string | null
          created_at: string
          currency_id: string | null
          description: string | null
          document_type: string | null
          external_key: string
          id: number
          last_modified_at: string | null
          payment_amount: number | null
          payment_method: string | null
          payment_ref: string | null
          raw_payload: Json | null
          reference_nbr: string
          status: string | null
          updated_at: string
          vendor_id: string | null
          vendor_name: string | null
        }
        Insert: {
          acumatica_sync_at?: string | null
          application_date?: string | null
          cash_account?: string | null
          created_at?: string
          currency_id?: string | null
          description?: string | null
          document_type?: string | null
          external_key: string
          id?: number
          last_modified_at?: string | null
          payment_amount?: number | null
          payment_method?: string | null
          payment_ref?: string | null
          raw_payload?: Json | null
          reference_nbr: string
          status?: string | null
          updated_at?: string
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Update: {
          acumatica_sync_at?: string | null
          application_date?: string | null
          cash_account?: string | null
          created_at?: string
          currency_id?: string | null
          description?: string | null
          document_type?: string | null
          external_key?: string
          id?: number
          last_modified_at?: string | null
          payment_amount?: number | null
          payment_method?: string | null
          payment_ref?: string | null
          raw_payload?: Json | null
          reference_nbr?: string
          status?: string | null
          updated_at?: string
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Relationships: []
      }
      acumatica_payments: {
        Row: {
          acumatica_sync_at: string | null
          application_date: string | null
          available_balance: number | null
          cash_account: string | null
          company_id: string | null
          created_at: string
          currency_id: string | null
          customer_id: string | null
          description: string | null
          document_type: string | null
          external_key: string
          external_ref: string | null
          hold: boolean | null
          id: number
          last_modified_at: string | null
          payment_amount: number | null
          payment_method: string | null
          payment_ref: string | null
          project_code: string | null
          project_id: number | null
          raw_payload: Json | null
          reference_nbr: string
          status: string | null
          updated_at: string
        }
        Insert: {
          acumatica_sync_at?: string | null
          application_date?: string | null
          available_balance?: number | null
          cash_account?: string | null
          company_id?: string | null
          created_at?: string
          currency_id?: string | null
          customer_id?: string | null
          description?: string | null
          document_type?: string | null
          external_key: string
          external_ref?: string | null
          hold?: boolean | null
          id?: number
          last_modified_at?: string | null
          payment_amount?: number | null
          payment_method?: string | null
          payment_ref?: string | null
          project_code?: string | null
          project_id?: number | null
          raw_payload?: Json | null
          reference_nbr: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          acumatica_sync_at?: string | null
          application_date?: string | null
          available_balance?: number | null
          cash_account?: string | null
          company_id?: string | null
          created_at?: string
          currency_id?: string | null
          customer_id?: string | null
          description?: string | null
          document_type?: string | null
          external_key?: string
          external_ref?: string | null
          hold?: boolean | null
          id?: number
          last_modified_at?: string | null
          payment_amount?: number | null
          payment_method?: string | null
          payment_ref?: string | null
          project_code?: string | null
          project_id?: number | null
          raw_payload?: Json | null
          reference_nbr?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "acumatica_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acumatica_payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "acumatica_payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acumatica_payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acumatica_payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "acumatica_payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acumatica_payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acumatica_payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      acumatica_project_budgets: {
        Row: {
          account_group: string | null
          actual_amount: number | null
          actual_plus_open_committed_amount: number | null
          acumatica_sync_at: string | null
          budgeted_co_amount: number | null
          committed_co_amount: number | null
          committed_invoiced_amount: number | null
          committed_open_amount: number | null
          company_id: string | null
          cost_at_completion: number | null
          cost_code: string | null
          cost_to_complete: number | null
          created_at: string
          description: string | null
          draft_invoices_amount: number | null
          external_key: string
          id: number
          inventory_id: string | null
          last_modified_at: string | null
          original_budgeted_amount: number | null
          original_committed_amount: number | null
          pending_invoice_amount: number | null
          percentage_of_completion: number | null
          project_code: string
          project_id: number | null
          project_task_id: string | null
          raw_payload: Json | null
          record_type: string | null
          retainage: number | null
          revised_budgeted_amount: number | null
          revised_committed_amount: number | null
          unit_rate: number | null
          uom: string | null
          updated_at: string
          variance_amount: number | null
        }
        Insert: {
          account_group?: string | null
          actual_amount?: number | null
          actual_plus_open_committed_amount?: number | null
          acumatica_sync_at?: string | null
          budgeted_co_amount?: number | null
          committed_co_amount?: number | null
          committed_invoiced_amount?: number | null
          committed_open_amount?: number | null
          company_id?: string | null
          cost_at_completion?: number | null
          cost_code?: string | null
          cost_to_complete?: number | null
          created_at?: string
          description?: string | null
          draft_invoices_amount?: number | null
          external_key: string
          id?: number
          inventory_id?: string | null
          last_modified_at?: string | null
          original_budgeted_amount?: number | null
          original_committed_amount?: number | null
          pending_invoice_amount?: number | null
          percentage_of_completion?: number | null
          project_code: string
          project_id?: number | null
          project_task_id?: string | null
          raw_payload?: Json | null
          record_type?: string | null
          retainage?: number | null
          revised_budgeted_amount?: number | null
          revised_committed_amount?: number | null
          unit_rate?: number | null
          uom?: string | null
          updated_at?: string
          variance_amount?: number | null
        }
        Update: {
          account_group?: string | null
          actual_amount?: number | null
          actual_plus_open_committed_amount?: number | null
          acumatica_sync_at?: string | null
          budgeted_co_amount?: number | null
          committed_co_amount?: number | null
          committed_invoiced_amount?: number | null
          committed_open_amount?: number | null
          company_id?: string | null
          cost_at_completion?: number | null
          cost_code?: string | null
          cost_to_complete?: number | null
          created_at?: string
          description?: string | null
          draft_invoices_amount?: number | null
          external_key?: string
          id?: number
          inventory_id?: string | null
          last_modified_at?: string | null
          original_budgeted_amount?: number | null
          original_committed_amount?: number | null
          pending_invoice_amount?: number | null
          percentage_of_completion?: number | null
          project_code?: string
          project_id?: number | null
          project_task_id?: string | null
          raw_payload?: Json | null
          record_type?: string | null
          retainage?: number | null
          revised_budgeted_amount?: number | null
          revised_committed_amount?: number | null
          unit_rate?: number | null
          uom?: string | null
          updated_at?: string
          variance_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "acumatica_project_budgets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acumatica_project_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "acumatica_project_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acumatica_project_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acumatica_project_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "acumatica_project_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acumatica_project_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acumatica_project_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      acumatica_purchase_orders: {
        Row: {
          acumatica_sync_at: string | null
          company_id: string | null
          control_total: number | null
          created_at: string
          currency_id: string | null
          date: string | null
          description: string | null
          external_key: string
          hold: boolean | null
          id: number
          last_modified_at: string | null
          line_total: number | null
          order_nbr: string
          order_total: number | null
          order_type: string | null
          project_code: string | null
          project_id: number | null
          promised_on: string | null
          raw_payload: Json | null
          status: string | null
          tax_total: number | null
          terms: string | null
          updated_at: string
          vendor_acumatica_id: string | null
          vendor_id: string | null
          vendor_ref: string | null
          vendor_uuid: string | null
        }
        Insert: {
          acumatica_sync_at?: string | null
          company_id?: string | null
          control_total?: number | null
          created_at?: string
          currency_id?: string | null
          date?: string | null
          description?: string | null
          external_key: string
          hold?: boolean | null
          id?: number
          last_modified_at?: string | null
          line_total?: number | null
          order_nbr: string
          order_total?: number | null
          order_type?: string | null
          project_code?: string | null
          project_id?: number | null
          promised_on?: string | null
          raw_payload?: Json | null
          status?: string | null
          tax_total?: number | null
          terms?: string | null
          updated_at?: string
          vendor_acumatica_id?: string | null
          vendor_id?: string | null
          vendor_ref?: string | null
          vendor_uuid?: string | null
        }
        Update: {
          acumatica_sync_at?: string | null
          company_id?: string | null
          control_total?: number | null
          created_at?: string
          currency_id?: string | null
          date?: string | null
          description?: string | null
          external_key?: string
          hold?: boolean | null
          id?: number
          last_modified_at?: string | null
          line_total?: number | null
          order_nbr?: string
          order_total?: number | null
          order_type?: string | null
          project_code?: string | null
          project_id?: number | null
          promised_on?: string | null
          raw_payload?: Json | null
          status?: string | null
          tax_total?: number | null
          terms?: string | null
          updated_at?: string
          vendor_acumatica_id?: string | null
          vendor_id?: string | null
          vendor_ref?: string | null
          vendor_uuid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acumatica_purchase_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acumatica_purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "acumatica_purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acumatica_purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acumatica_purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "acumatica_purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acumatica_purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acumatica_purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acumatica_purchase_orders_vendor_uuid_fkey"
            columns: ["vendor_uuid"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      acumatica_subcontracts: {
        Row: {
          acumatica_sync_at: string | null
          apply_retainage: boolean | null
          company_id: string | null
          control_total: number | null
          created_at: string
          currency_id: string | null
          date: string | null
          description: string | null
          discount_total: number | null
          external_key: string
          id: number
          last_modified_at: string | null
          line_total: number | null
          owner: string | null
          project_code: string | null
          project_id: number | null
          raw_payload: Json | null
          retainage_pct: number | null
          retainage_total: number | null
          start_date: string | null
          status: string | null
          subcontract_nbr: string
          subcontract_total: number | null
          tax_total: number | null
          terms: string | null
          updated_at: string
          vendor_acumatica_id: string | null
          vendor_id: string | null
          vendor_ref: string | null
          vendor_uuid: string | null
        }
        Insert: {
          acumatica_sync_at?: string | null
          apply_retainage?: boolean | null
          company_id?: string | null
          control_total?: number | null
          created_at?: string
          currency_id?: string | null
          date?: string | null
          description?: string | null
          discount_total?: number | null
          external_key: string
          id?: number
          last_modified_at?: string | null
          line_total?: number | null
          owner?: string | null
          project_code?: string | null
          project_id?: number | null
          raw_payload?: Json | null
          retainage_pct?: number | null
          retainage_total?: number | null
          start_date?: string | null
          status?: string | null
          subcontract_nbr: string
          subcontract_total?: number | null
          tax_total?: number | null
          terms?: string | null
          updated_at?: string
          vendor_acumatica_id?: string | null
          vendor_id?: string | null
          vendor_ref?: string | null
          vendor_uuid?: string | null
        }
        Update: {
          acumatica_sync_at?: string | null
          apply_retainage?: boolean | null
          company_id?: string | null
          control_total?: number | null
          created_at?: string
          currency_id?: string | null
          date?: string | null
          description?: string | null
          discount_total?: number | null
          external_key?: string
          id?: number
          last_modified_at?: string | null
          line_total?: number | null
          owner?: string | null
          project_code?: string | null
          project_id?: number | null
          raw_payload?: Json | null
          retainage_pct?: number | null
          retainage_total?: number | null
          start_date?: string | null
          status?: string | null
          subcontract_nbr?: string
          subcontract_total?: number | null
          tax_total?: number | null
          terms?: string | null
          updated_at?: string
          vendor_acumatica_id?: string | null
          vendor_id?: string | null
          vendor_ref?: string | null
          vendor_uuid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acumatica_subcontracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acumatica_subcontracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "acumatica_subcontracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acumatica_subcontracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acumatica_subcontracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "acumatica_subcontracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acumatica_subcontracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acumatica_subcontracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acumatica_subcontracts_vendor_uuid_fkey"
            columns: ["vendor_uuid"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      acumatica_sync_state: {
        Row: {
          entity_name: string
          last_cursor: string | null
          last_error: string | null
          last_started_at: string | null
          last_stats: Json | null
          last_success_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          entity_name: string
          last_cursor?: string | null
          last_error?: string | null
          last_started_at?: string | null
          last_stats?: Json | null
          last_success_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          entity_name?: string
          last_cursor?: string | null
          last_error?: string | null
          last_started_at?: string | null
          last_stats?: Json | null
          last_success_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_feedback_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          feedback_item_id: string
          id: string
          mentions: string[] | null
          screenshot_path: string | null
          screenshot_url: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          feedback_item_id: string
          id?: string
          mentions?: string[] | null
          screenshot_path?: string | null
          screenshot_url?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          feedback_item_id?: string
          id?: string
          mentions?: string[] | null
          screenshot_path?: string | null
          screenshot_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_feedback_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_feedback_comments_feedback_item_id_fkey"
            columns: ["feedback_item_id"]
            isOneToOne: false
            referencedRelation: "admin_feedback_items"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_feedback_items: {
        Row: {
          agent_context: Json | null
          comment: string
          created_at: string
          created_by: string
          dom_path: string | null
          github_issue_number: number | null
          github_issue_state: string | null
          github_issue_url: string | null
          id: string
          metadata: Json
          page_path: string
          page_title: string | null
          page_url: string
          project_id: number | null
          request_type: string
          screenshot_path: string | null
          screenshot_url: string | null
          severity: string | null
          status: string
          target_id: string | null
          target_rect: Json | null
          target_selector: string
          target_tag: string | null
          target_text: string | null
          title: string
          tool_id: number | null
          updated_at: string
        }
        Insert: {
          agent_context?: Json | null
          comment: string
          created_at?: string
          created_by: string
          dom_path?: string | null
          github_issue_number?: number | null
          github_issue_state?: string | null
          github_issue_url?: string | null
          id?: string
          metadata?: Json
          page_path: string
          page_title?: string | null
          page_url: string
          project_id?: number | null
          request_type?: string
          screenshot_path?: string | null
          screenshot_url?: string | null
          severity?: string | null
          status?: string
          target_id?: string | null
          target_rect?: Json | null
          target_selector: string
          target_tag?: string | null
          target_text?: string | null
          title: string
          tool_id?: number | null
          updated_at?: string
        }
        Update: {
          agent_context?: Json | null
          comment?: string
          created_at?: string
          created_by?: string
          dom_path?: string | null
          github_issue_number?: number | null
          github_issue_state?: string | null
          github_issue_url?: string | null
          id?: string
          metadata?: Json
          page_path?: string
          page_title?: string | null
          page_url?: string
          project_id?: number | null
          request_type?: string
          screenshot_path?: string | null
          screenshot_url?: string | null
          severity?: string | null
          status?: string
          target_id?: string | null
          target_rect?: Json | null
          target_selector?: string
          target_tag?: string | null
          target_text?: string | null
          title?: string
          tool_id?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_feedback_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_feedback_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "admin_feedback_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_feedback_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_feedback_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "admin_feedback_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_feedback_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_feedback_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_feedback_items_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "procore_tools"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_view_backups: {
        Row: {
          backed_up_at: string | null
          definition: string | null
          view_name: string
        }
        Insert: {
          backed_up_at?: string | null
          definition?: string | null
          view_name: string
        }
        Update: {
          backed_up_at?: string | null
          definition?: string | null
          view_name?: string
        }
        Relationships: []
      }
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
        Insert: {
          completed_at?: string | null
          confidence_metrics?: Json | null
          config?: Json | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          input_data?: Json | null
          job_type: string
          model_version?: string | null
          processing_time_ms?: number | null
          results?: Json | null
          started_at?: string | null
          status?: string | null
          submittal_id: string
        }
        Update: {
          completed_at?: string | null
          confidence_metrics?: Json | null
          config?: Json | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          input_data?: Json | null
          job_type?: string
          model_version?: string | null
          processing_time_ms?: number | null
          results?: Json | null
          started_at?: string | null
          status?: string | null
          submittal_id?: string
        }
        Relationships: [
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
        Insert: {
          assigned_to?: string | null
          assignee?: string | null
          business_impact?: string | null
          chunks_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          cross_project_impact?: number[] | null
          dependencies?: Json | null
          description: string
          document_id?: string | null
          due_date?: string | null
          exact_quotes?: Json | null
          exact_quotes_text?: string | null
          financial_impact?: number | null
          id?: number
          insight_type?: string | null
          meeting_date?: string | null
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
          title: string
          urgency_indicators?: string[] | null
        }
        Update: {
          assigned_to?: string | null
          assignee?: string | null
          business_impact?: string | null
          chunks_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          cross_project_impact?: number[] | null
          dependencies?: Json | null
          description?: string
          document_id?: string | null
          due_date?: string | null
          exact_quotes?: Json | null
          exact_quotes_text?: string | null
          financial_impact?: number | null
          id?: number
          insight_type?: string | null
          meeting_date?: string | null
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
          title?: string
          urgency_indicators?: string[] | null
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
      ai_memories: {
        Row: {
          access_count: number
          confidence: number
          content: string
          created_at: string
          embedding: unknown
          expires_at: string | null
          id: string
          importance: number
          is_active: boolean
          last_accessed_at: string | null
          meeting_id: string | null
          project_id: number | null
          source: string
          superseded_by: string | null
          type: string
          user_id: string
          visibility: string
        }
        Insert: {
          access_count?: number
          confidence?: number
          content: string
          created_at?: string
          embedding?: unknown
          expires_at?: string | null
          id?: string
          importance?: number
          is_active?: boolean
          last_accessed_at?: string | null
          meeting_id?: string | null
          project_id?: number | null
          source?: string
          superseded_by?: string | null
          type: string
          user_id: string
          visibility?: string
        }
        Update: {
          access_count?: number
          confidence?: number
          content?: string
          created_at?: string
          embedding?: unknown
          expires_at?: string | null
          id?: string
          importance?: number
          is_active?: boolean
          last_accessed_at?: string | null
          meeting_id?: string | null
          project_id?: number | null
          source?: string
          superseded_by?: string | null
          type?: string
          user_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_memories_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "document_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_memories_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "document_metadata_manual_only"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_memories_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "ai_memories_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_memories_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_memories_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "ai_memories_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_memories_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_memories_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_memories_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "ai_memories"
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
        Insert: {
          config?: Json | null
          created_at?: string | null
          deployment_date?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          model_type: string
          name: string
          performance_metrics?: Json | null
          version: string
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          deployment_date?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          model_type?: string
          name?: string
          performance_metrics?: Json | null
          version?: string
        }
        Relationships: []
      }
      app_capability_actions: {
        Row: {
          action_id: string
          capability_id: string
        }
        Insert: {
          action_id: string
          capability_id: string
        }
        Update: {
          action_id?: string
          capability_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_capability_actions_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "app_system_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_capability_actions_capability_id_fkey"
            columns: ["capability_id"]
            isOneToOne: false
            referencedRelation: "app_functional_capabilities"
            referencedColumns: ["id"]
          },
        ]
      }
      app_commands: {
        Row: {
          command_key: string
          confidence_score: number | null
          created_at: string | null
          description: string | null
          id: string
          label: string | null
          module: string
          source_action_ids: string[] | null
        }
        Insert: {
          command_key: string
          confidence_score?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          label?: string | null
          module: string
          source_action_ids?: string[] | null
        }
        Update: {
          command_key?: string
          confidence_score?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          label?: string | null
          module?: string
          source_action_ids?: string[] | null
        }
        Relationships: []
      }
      app_crawl_sessions: {
        Row: {
          completed_at: string | null
          crawler_version: string | null
          id: string
          module: string
          notes: string | null
          source_app: string
          started_at: string
        }
        Insert: {
          completed_at?: string | null
          crawler_version?: string | null
          id?: string
          module: string
          notes?: string | null
          source_app: string
          started_at?: string
        }
        Update: {
          completed_at?: string | null
          crawler_version?: string | null
          id?: string
          module?: string
          notes?: string | null
          source_app?: string
          started_at?: string
        }
        Relationships: []
      }
      app_functional_capabilities: {
        Row: {
          description: string | null
          domain: string
          id: string
          name: string
        }
        Insert: {
          description?: string | null
          domain: string
          id?: string
          name: string
        }
        Update: {
          description?: string | null
          domain?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      app_page_links: {
        Row: {
          from_page: string | null
          id: string
          link_text: string | null
          to_url: string | null
        }
        Insert: {
          from_page?: string | null
          id?: string
          link_text?: string | null
          to_url?: string | null
        }
        Update: {
          from_page?: string | null
          id?: string
          link_text?: string | null
          to_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_page_links_from_page_fkey"
            columns: ["from_page"]
            isOneToOne: false
            referencedRelation: "app_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      app_pages: {
        Row: {
          category: string | null
          crawl_session_id: string | null
          created_at: string | null
          dom_path: string | null
          h1: string | null
          id: string
          name: string
          page_id: string
          screenshot_path: string | null
          title: string | null
          url: string
        }
        Insert: {
          category?: string | null
          crawl_session_id?: string | null
          created_at?: string | null
          dom_path?: string | null
          h1?: string | null
          id?: string
          name: string
          page_id: string
          screenshot_path?: string | null
          title?: string | null
          url: string
        }
        Update: {
          category?: string | null
          crawl_session_id?: string | null
          created_at?: string | null
          dom_path?: string | null
          h1?: string | null
          id?: string
          name?: string
          page_id?: string
          screenshot_path?: string | null
          title?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_pages_crawl_session_id_fkey"
            columns: ["crawl_session_id"]
            isOneToOne: false
            referencedRelation: "app_crawl_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      app_parity_checks: {
        Row: {
          compared_app: string | null
          crawl_session_id: string | null
          created_at: string | null
          id: string
          missing_actions: Json | null
          missing_features: Json | null
          module: string | null
          parity_score: number | null
        }
        Insert: {
          compared_app?: string | null
          crawl_session_id?: string | null
          created_at?: string | null
          id?: string
          missing_actions?: Json | null
          missing_features?: Json | null
          module?: string | null
          parity_score?: number | null
        }
        Update: {
          compared_app?: string | null
          crawl_session_id?: string | null
          created_at?: string | null
          id?: string
          missing_actions?: Json | null
          missing_features?: Json | null
          module?: string | null
          parity_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "app_parity_checks_crawl_session_id_fkey"
            columns: ["crawl_session_id"]
            isOneToOne: false
            referencedRelation: "app_crawl_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      app_roles: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      app_schedule_bulk_operations: {
        Row: {
          command_key: string
          executed_at: string | null
          id: string
          payload: Json | null
          task_ids: string[]
        }
        Insert: {
          command_key: string
          executed_at?: string | null
          id?: string
          payload?: Json | null
          task_ids: string[]
        }
        Update: {
          command_key?: string
          executed_at?: string | null
          id?: string
          payload?: Json | null
          task_ids?: string[]
        }
        Relationships: []
      }
      app_schedule_task_hierarchy: {
        Row: {
          child_task_id: string | null
          id: string
          parent_task_id: string | null
          sort_order: number
        }
        Insert: {
          child_task_id?: string | null
          id?: string
          parent_task_id?: string | null
          sort_order: number
        }
        Update: {
          child_task_id?: string | null
          id?: string
          parent_task_id?: string | null
          sort_order?: number
        }
        Relationships: []
      }
      app_state_transitions: {
        Row: {
          conditions: string | null
          from_state: string | null
          id: string
          to_state: string | null
          triggered_by_action: string | null
        }
        Insert: {
          conditions?: string | null
          from_state?: string | null
          id?: string
          to_state?: string | null
          triggered_by_action?: string | null
        }
        Update: {
          conditions?: string | null
          from_state?: string | null
          id?: string
          to_state?: string | null
          triggered_by_action?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_state_transitions_triggered_by_action_fkey"
            columns: ["triggered_by_action"]
            isOneToOne: false
            referencedRelation: "app_system_actions"
            referencedColumns: ["id"]
          },
        ]
      }
      app_system_actions: {
        Row: {
          action_type: string | null
          affects_resource: string | null
          created_at: string | null
          endpoint: string | null
          http_method: string | null
          id: string
          label: string | null
          page_id: string | null
          payload_schema: Json | null
          permission_scope: string | null
          response_schema: Json | null
          source: string | null
          trigger_type: string | null
        }
        Insert: {
          action_type?: string | null
          affects_resource?: string | null
          created_at?: string | null
          endpoint?: string | null
          http_method?: string | null
          id?: string
          label?: string | null
          page_id?: string | null
          payload_schema?: Json | null
          permission_scope?: string | null
          response_schema?: Json | null
          source?: string | null
          trigger_type?: string | null
        }
        Update: {
          action_type?: string | null
          affects_resource?: string | null
          created_at?: string | null
          endpoint?: string | null
          http_method?: string | null
          id?: string
          label?: string | null
          page_id?: string | null
          payload_schema?: Json | null
          permission_scope?: string | null
          response_schema?: Json | null
          source?: string | null
          trigger_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_system_actions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "app_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      app_system_states: {
        Row: {
          description: string | null
          id: string
          resource: string
          state: string
        }
        Insert: {
          description?: string | null
          id?: string
          resource: string
          state: string
        }
        Update: {
          description?: string | null
          id?: string
          resource?: string
          state?: string
        }
        Relationships: []
      }
      app_ui_components: {
        Row: {
          classes: string | null
          component_type: string
          created_at: string | null
          html_tag: string | null
          id: string
          index_on_page: number | null
          page_id: string | null
          role: string | null
          selector: string | null
          text_content: string | null
        }
        Insert: {
          classes?: string | null
          component_type: string
          created_at?: string | null
          html_tag?: string | null
          id?: string
          index_on_page?: number | null
          page_id?: string | null
          role?: string | null
          selector?: string | null
          text_content?: string | null
        }
        Update: {
          classes?: string | null
          component_type?: string
          created_at?: string | null
          html_tag?: string | null
          id?: string
          index_on_page?: number | null
          page_id?: string | null
          role?: string | null
          selector?: string | null
          text_content?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_ui_components_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "app_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      app_ui_table_columns: {
        Row: {
          computed: boolean | null
          editable: boolean | null
          id: string
          inferred_type: string | null
          name: string
          position: number | null
          required: boolean | null
          ui_table_id: string | null
        }
        Insert: {
          computed?: boolean | null
          editable?: boolean | null
          id?: string
          inferred_type?: string | null
          name: string
          position?: number | null
          required?: boolean | null
          ui_table_id?: string | null
        }
        Update: {
          computed?: boolean | null
          editable?: boolean | null
          id?: string
          inferred_type?: string | null
          name?: string
          position?: number | null
          required?: boolean | null
          ui_table_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_ui_table_columns_ui_table_id_fkey"
            columns: ["ui_table_id"]
            isOneToOne: false
            referencedRelation: "app_ui_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      app_ui_tables: {
        Row: {
          css_classes: string | null
          html_id: string | null
          id: string
          name: string | null
          page_id: string | null
          row_count: number | null
          table_index: number | null
        }
        Insert: {
          css_classes?: string | null
          html_id?: string | null
          id?: string
          name?: string | null
          page_id?: string | null
          row_count?: number | null
          table_index?: number | null
        }
        Update: {
          css_classes?: string | null
          html_id?: string | null
          id?: string
          name?: string | null
          page_id?: string | null
          row_count?: number | null
          table_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "app_ui_tables_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "app_pages"
            referencedColumns: ["id"]
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
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
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
          name: string | null
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
          name?: string | null
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
          name?: string | null
          period_number?: number
          project_id?: number | null
          start_date?: string
          updated_at?: string | null
        }
        Relationships: [
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
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_periods_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
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
      bot_user_mappings: {
        Row: {
          created_at: string
          display_name: string | null
          id: number
          platform: string
          platform_user_id: string
          supabase_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: never
          platform: string
          platform_user_id: string
          supabase_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: never
          platform?: string
          platform_user_id?: string
          supabase_user_id?: string
          updated_at?: string
        }
        Relationships: []
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
      budget_line_forecasts: {
        Row: {
          budget_line_id: string
          burn_rate: number | null
          created_at: string
          created_by: string | null
          curve_id: string | null
          forecast_date: string
          forecast_to_complete: number
          forecasted_cost: number
          ftc_method: string
          id: string
          manual_override: boolean | null
          percent_complete: number | null
          projected_final_cost: number
          updated_at: string
          variance_at_completion: number
        }
        Insert: {
          budget_line_id: string
          burn_rate?: number | null
          created_at?: string
          created_by?: string | null
          curve_id?: string | null
          forecast_date: string
          forecast_to_complete?: number
          forecasted_cost?: number
          ftc_method?: string
          id?: string
          manual_override?: boolean | null
          percent_complete?: number | null
          projected_final_cost?: number
          updated_at?: string
          variance_at_completion?: number
        }
        Update: {
          budget_line_id?: string
          burn_rate?: number | null
          created_at?: string
          created_by?: string | null
          curve_id?: string | null
          forecast_date?: string
          forecast_to_complete?: number
          forecasted_cost?: number
          ftc_method?: string
          id?: string
          manual_override?: boolean | null
          percent_complete?: number | null
          projected_final_cost?: number
          updated_at?: string
          variance_at_completion?: number
        }
        Relationships: [
          {
            foreignKeyName: "budget_line_forecasts_budget_line_id_fkey"
            columns: ["budget_line_id"]
            isOneToOne: false
            referencedRelation: "budget_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_line_forecasts_curve_id_fkey"
            columns: ["curve_id"]
            isOneToOne: false
            referencedRelation: "forecasting_curves"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_line_history: {
        Row: {
          budget_line_id: string
          change_type: string
          changed_at: string
          changed_by: string | null
          field_name: string
          id: string
          new_value: string | null
          notes: string | null
          old_value: string | null
          project_id: number
        }
        Insert: {
          budget_line_id: string
          change_type: string
          changed_at?: string
          changed_by?: string | null
          field_name: string
          id?: string
          new_value?: string | null
          notes?: string | null
          old_value?: string | null
          project_id: number
        }
        Update: {
          budget_line_id?: string
          change_type?: string
          changed_at?: string
          changed_by?: string | null
          field_name?: string
          id?: string
          new_value?: string | null
          notes?: string | null
          old_value?: string | null
          project_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "budget_line_history_budget_line_id_fkey"
            columns: ["budget_line_id"]
            isOneToOne: false
            referencedRelation: "budget_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_line_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "budget_line_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_line_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_line_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "budget_line_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_line_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_line_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_line_item_history: {
        Row: {
          budget_code: string
          budget_line_item_id: string
          changed_field: string | null
          description: string
          event_type: string
          from_value: string | null
          id: string
          notes: string | null
          performed_at: string
          performed_by: string | null
          performed_by_name: string | null
          project_id: number
          source: string
          to_value: string | null
        }
        Insert: {
          budget_code: string
          budget_line_item_id: string
          changed_field?: string | null
          description: string
          event_type: string
          from_value?: string | null
          id?: string
          notes?: string | null
          performed_at?: string
          performed_by?: string | null
          performed_by_name?: string | null
          project_id: number
          source?: string
          to_value?: string | null
        }
        Update: {
          budget_code?: string
          budget_line_item_id?: string
          changed_field?: string | null
          description?: string
          event_type?: string
          from_value?: string | null
          id?: string
          notes?: string | null
          performed_at?: string
          performed_by?: string | null
          performed_by_name?: string | null
          project_id?: number
          source?: string
          to_value?: string | null
        }
        Relationships: []
      }
      budget_lines: {
        Row: {
          cost_code_id: string
          cost_type_id: string
          created_at: string
          created_by: string | null
          default_curve_id: string | null
          default_ftc_method: string | null
          description: string | null
          forecasting_enabled: boolean
          id: string
          original_amount: number
          project_budget_code_id: string | null
          project_id: number
          quantity: number | null
          sub_job_id: string | null
          sub_job_key: string | null
          unit_cost: number | null
          unit_of_measure: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cost_code_id: string
          cost_type_id: string
          created_at?: string
          created_by?: string | null
          default_curve_id?: string | null
          default_ftc_method?: string | null
          description?: string | null
          forecasting_enabled?: boolean
          id?: string
          original_amount?: number
          project_budget_code_id?: string | null
          project_id: number
          quantity?: number | null
          sub_job_id?: string | null
          sub_job_key?: string | null
          unit_cost?: number | null
          unit_of_measure?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cost_code_id?: string
          cost_type_id?: string
          created_at?: string
          created_by?: string | null
          default_curve_id?: string | null
          default_ftc_method?: string | null
          description?: string | null
          forecasting_enabled?: boolean
          id?: string
          original_amount?: number
          project_budget_code_id?: string | null
          project_id?: number
          quantity?: number | null
          sub_job_id?: string | null
          sub_job_key?: string | null
          unit_cost?: number | null
          unit_of_measure?: string | null
          updated_at?: string
          updated_by?: string | null
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
            foreignKeyName: "budget_lines_default_curve_id_fkey"
            columns: ["default_curve_id"]
            isOneToOne: false
            referencedRelation: "forecasting_curves"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_project_budget_code_id_fkey"
            columns: ["project_budget_code_id"]
            isOneToOne: false
            referencedRelation: "project_budget_codes"
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
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
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
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_mod_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
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
      budget_modification_lines: {
        Row: {
          amount: number
          budget_line_id: string
          budget_modification_id: string
          created_at: string
          id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          budget_line_id: string
          budget_modification_id: string
          created_at?: string
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          budget_line_id?: string
          budget_modification_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_modification_lines_budget_line_id_fkey"
            columns: ["budget_line_id"]
            isOneToOne: false
            referencedRelation: "budget_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_modification_lines_budget_modification_id_fkey"
            columns: ["budget_modification_id"]
            isOneToOne: false
            referencedRelation: "budget_modifications"
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
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_modifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
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
      budget_snapshots: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          grand_totals: Json
          id: string
          is_baseline: boolean | null
          line_items: Json
          name: string
          project_id: number
          snapshot_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          grand_totals: Json
          id?: string
          is_baseline?: boolean | null
          line_items: Json
          name: string
          project_id: number
          snapshot_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          grand_totals?: Json
          id?: string
          is_baseline?: boolean | null
          line_items?: Json
          name?: string
          project_id?: number
          snapshot_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "budget_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "budget_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_view_columns: {
        Row: {
          column_key: string
          created_at: string | null
          display_name: string | null
          display_order: number
          id: string
          is_locked: boolean | null
          is_visible: boolean | null
          updated_at: string | null
          view_id: string
          width: number | null
        }
        Insert: {
          column_key: string
          created_at?: string | null
          display_name?: string | null
          display_order?: number
          id?: string
          is_locked?: boolean | null
          is_visible?: boolean | null
          updated_at?: string | null
          view_id: string
          width?: number | null
        }
        Update: {
          column_key?: string
          created_at?: string | null
          display_name?: string | null
          display_order?: number
          id?: string
          is_locked?: boolean | null
          is_visible?: boolean | null
          updated_at?: string | null
          view_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_view_columns_view_id_fkey"
            columns: ["view_id"]
            isOneToOne: false
            referencedRelation: "budget_views"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_views: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean | null
          is_system: boolean | null
          name: string
          project_id: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          is_system?: boolean | null
          name: string
          project_id: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          is_system?: boolean | null
          name?: string
          project_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_views_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "budget_views_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_views_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_views_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "budget_views_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_views_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_views_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      cco_attachments: {
        Row: {
          cco_id: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          cco_id: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          cco_id?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cco_attachments_cco_id_fkey"
            columns: ["cco_id"]
            isOneToOne: false
            referencedRelation: "contract_change_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      change_event_approvals: {
        Row: {
          approval_status: string
          approver_id: string
          change_event_id: string
          comments: string | null
          created_at: string
          id: string
          responded_at: string | null
        }
        Insert: {
          approval_status?: string
          approver_id: string
          change_event_id: string
          comments?: string | null
          created_at?: string
          id?: string
          responded_at?: string | null
        }
        Update: {
          approval_status?: string
          approver_id?: string
          change_event_id?: string
          comments?: string | null
          created_at?: string
          id?: string
          responded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "change_event_approvals_change_event_id_fkey"
            columns: ["change_event_id"]
            isOneToOne: false
            referencedRelation: "change_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_event_approvals_change_event_id_fkey"
            columns: ["change_event_id"]
            isOneToOne: false
            referencedRelation: "change_events_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      change_event_attachments: {
        Row: {
          change_event_id: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          change_event_id: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          change_event_id?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "change_event_attachments_change_event_id_fkey"
            columns: ["change_event_id"]
            isOneToOne: false
            referencedRelation: "change_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_event_attachments_change_event_id_fkey"
            columns: ["change_event_id"]
            isOneToOne: false
            referencedRelation: "change_events_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      change_event_history: {
        Row: {
          change_event_id: string
          change_type: string
          changed_at: string
          changed_by: string | null
          field_name: string
          id: string
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          change_event_id: string
          change_type: string
          changed_at?: string
          changed_by?: string | null
          field_name: string
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          change_event_id?: string
          change_type?: string
          changed_at?: string
          changed_by?: string | null
          field_name?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "change_event_history_change_event_id_fkey"
            columns: ["change_event_id"]
            isOneToOne: false
            referencedRelation: "change_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_event_history_change_event_id_fkey"
            columns: ["change_event_id"]
            isOneToOne: false
            referencedRelation: "change_events_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      change_event_line_items: {
        Row: {
          budget_code_id: string | null
          change_event_id: string
          contract_id: string | null
          cost_rom: number | null
          created_at: string
          description: string | null
          id: string
          non_committed_cost: number | null
          quantity: number | null
          revenue_rom: number | null
          sort_order: number
          unit_cost: number | null
          unit_of_measure: string | null
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          budget_code_id?: string | null
          change_event_id: string
          contract_id?: string | null
          cost_rom?: number | null
          created_at?: string
          description?: string | null
          id?: string
          non_committed_cost?: number | null
          quantity?: number | null
          revenue_rom?: number | null
          sort_order?: number
          unit_cost?: number | null
          unit_of_measure?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          budget_code_id?: string | null
          change_event_id?: string
          contract_id?: string | null
          cost_rom?: number | null
          created_at?: string
          description?: string | null
          id?: string
          non_committed_cost?: number | null
          quantity?: number | null
          revenue_rom?: number | null
          sort_order?: number
          unit_cost?: number | null
          unit_of_measure?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "change_event_line_items_budget_code_id_fkey"
            columns: ["budget_code_id"]
            isOneToOne: false
            referencedRelation: "budget_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_event_line_items_change_event_id_fkey"
            columns: ["change_event_id"]
            isOneToOne: false
            referencedRelation: "change_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_event_line_items_change_event_id_fkey"
            columns: ["change_event_id"]
            isOneToOne: false
            referencedRelation: "change_events_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_event_line_items_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "prime_contract_financial_summary"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "change_event_line_items_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "prime_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_event_line_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      change_event_rfq_responses: {
        Row: {
          created_at: string
          created_by: string | null
          extended_amount: number
          id: string
          line_item_id: string | null
          notes: string | null
          responder_company_id: string | null
          responder_contact_id: string | null
          rfq_id: string
          status: string
          submitted_at: string | null
          unit_price: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          extended_amount?: number
          id?: string
          line_item_id?: string | null
          notes?: string | null
          responder_company_id?: string | null
          responder_contact_id?: string | null
          rfq_id: string
          status?: string
          submitted_at?: string | null
          unit_price?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          extended_amount?: number
          id?: string
          line_item_id?: string | null
          notes?: string | null
          responder_company_id?: string | null
          responder_contact_id?: string | null
          rfq_id?: string
          status?: string
          submitted_at?: string | null
          unit_price?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "change_event_rfq_responses_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "change_event_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_event_rfq_responses_responder_company_id_fkey"
            columns: ["responder_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_event_rfq_responses_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "change_event_rfqs"
            referencedColumns: ["id"]
          },
        ]
      }
      change_event_rfqs: {
        Row: {
          assigned_company_id: string | null
          assigned_contact_id: string | null
          change_event_id: string
          created_at: string
          created_by: string
          due_date: string
          estimated_total_amount: number
          id: string
          include_attachments: boolean
          notes: string | null
          project_id: number
          response_received_at: string | null
          rfq_number: string
          sent_at: string | null
          status: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          assigned_company_id?: string | null
          assigned_contact_id?: string | null
          change_event_id: string
          created_at?: string
          created_by: string
          due_date?: string
          estimated_total_amount?: number
          id?: string
          include_attachments?: boolean
          notes?: string | null
          project_id: number
          response_received_at?: string | null
          rfq_number: string
          sent_at?: string | null
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          assigned_company_id?: string | null
          assigned_contact_id?: string | null
          change_event_id?: string
          created_at?: string
          created_by?: string
          due_date?: string
          estimated_total_amount?: number
          id?: string
          include_attachments?: boolean
          notes?: string | null
          project_id?: number
          response_received_at?: string | null
          rfq_number?: string
          sent_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "change_event_rfqs_assigned_company_id_fkey"
            columns: ["assigned_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_event_rfqs_change_event_id_fkey"
            columns: ["change_event_id"]
            isOneToOne: false
            referencedRelation: "change_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_event_rfqs_change_event_id_fkey"
            columns: ["change_event_id"]
            isOneToOne: false
            referencedRelation: "change_events_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_event_rfqs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "change_event_rfqs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_event_rfqs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_event_rfqs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "change_event_rfqs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_event_rfqs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_event_rfqs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      change_events: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          expecting_revenue: boolean
          id: string
          line_item_revenue_source: string | null
          number: string
          origin: string | null
          prime_contract_id: string | null
          project_id: number
          reason: string | null
          scope: string
          status: string
          title: string
          type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          expecting_revenue?: boolean
          id?: string
          line_item_revenue_source?: string | null
          number: string
          origin?: string | null
          prime_contract_id?: string | null
          project_id: number
          reason?: string | null
          scope: string
          status?: string
          title: string
          type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          expecting_revenue?: boolean
          id?: string
          line_item_revenue_source?: string | null
          number?: string
          origin?: string | null
          prime_contract_id?: string | null
          project_id?: number
          reason?: string | null
          scope?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "change_events_prime_contract_id_fkey"
            columns: ["prime_contract_id"]
            isOneToOne: false
            referencedRelation: "prime_contract_financial_summary"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "change_events_prime_contract_id_fkey"
            columns: ["prime_contract_id"]
            isOneToOne: false
            referencedRelation: "prime_contracts"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
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
      commitment_change_order_lines: {
        Row: {
          amount: number
          budget_line_id: string | null
          commitment_change_order_id: string
          cost_code_id: string | null
          cost_type_id: string | null
          created_at: string
          description: string | null
          id: string
          updated_at: string
        }
        Insert: {
          amount: number
          budget_line_id?: string | null
          commitment_change_order_id: string
          cost_code_id?: string | null
          cost_type_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          budget_line_id?: string | null
          commitment_change_order_id?: string
          cost_code_id?: string | null
          cost_type_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commitment_change_order_lines_budget_line_id_fkey"
            columns: ["budget_line_id"]
            isOneToOne: false
            referencedRelation: "budget_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitment_change_order_lines_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitment_change_order_lines_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes_with_division_title"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitment_change_order_lines_cost_type_id_fkey"
            columns: ["cost_type_id"]
            isOneToOne: false
            referencedRelation: "cost_code_types"
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
          customer_id: string | null
          id: string
          logo_url: string | null
          metadata: Json | null
          name: string
          notes: string | null
          state: string | null
          status: string | null
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
          customer_id?: string | null
          id?: string
          logo_url?: string | null
          metadata?: Json | null
          name: string
          notes?: string | null
          state?: string | null
          status?: string | null
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
          customer_id?: string | null
          id?: string
          logo_url?: string | null
          metadata?: Json | null
          name?: string
          notes?: string | null
          state?: string | null
          status?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      company_context: {
        Row: {
          annual_revenue_range: string | null
          certifications: Json | null
          company_history: string | null
          competitive_landscape: Json | null
          core_values: Json | null
          employee_count: number | null
          founded_year: number | null
          goals: Json | null
          headquarters: string | null
          id: string
          key_clients: Json | null
          key_differentiators: Json | null
          mission: string | null
          notes: string | null
          okrs: Json | null
          org_structure: Json | null
          policies: Json | null
          resource_constraints: Json | null
          service_areas: Json | null
          strategic_initiatives: Json | null
          target_markets: Json | null
          updated_at: string | null
          vision: string | null
        }
        Insert: {
          annual_revenue_range?: string | null
          certifications?: Json | null
          company_history?: string | null
          competitive_landscape?: Json | null
          core_values?: Json | null
          employee_count?: number | null
          founded_year?: number | null
          goals?: Json | null
          headquarters?: string | null
          id?: string
          key_clients?: Json | null
          key_differentiators?: Json | null
          mission?: string | null
          notes?: string | null
          okrs?: Json | null
          org_structure?: Json | null
          policies?: Json | null
          resource_constraints?: Json | null
          service_areas?: Json | null
          strategic_initiatives?: Json | null
          target_markets?: Json | null
          updated_at?: string | null
          vision?: string | null
        }
        Update: {
          annual_revenue_range?: string | null
          certifications?: Json | null
          company_history?: string | null
          competitive_landscape?: Json | null
          core_values?: Json | null
          employee_count?: number | null
          founded_year?: number | null
          goals?: Json | null
          headquarters?: string | null
          id?: string
          key_clients?: Json | null
          key_differentiators?: Json | null
          mission?: string | null
          notes?: string | null
          okrs?: Json | null
          org_structure?: Json | null
          policies?: Json | null
          resource_constraints?: Json | null
          service_areas?: Json | null
          strategic_initiatives?: Json | null
          target_markets?: Json | null
          updated_at?: string | null
          vision?: string | null
        }
        Relationships: []
      }
      company_knowledge: {
        Row: {
          author_id: string | null
          category: string
          content: string
          created_at: string | null
          embedding: unknown
          id: string
          is_active: boolean | null
          meeting_id: string | null
          origin: string
          project_id: number | null
          source: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          category: string
          content: string
          created_at?: string | null
          embedding?: unknown
          id?: string
          is_active?: boolean | null
          meeting_id?: string | null
          origin?: string
          project_id?: number | null
          source?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          category?: string
          content?: string
          created_at?: string | null
          embedding?: unknown
          id?: string
          is_active?: boolean | null
          meeting_id?: string | null
          origin?: string
          project_id?: number | null
          source?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_knowledge_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "document_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_knowledge_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "document_metadata_manual_only"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_knowledge_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "company_knowledge_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_knowledge_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_knowledge_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "company_knowledge_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_knowledge_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_knowledge_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_billing_periods: {
        Row: {
          billing_date: string
          contract_id: string
          created_at: string
          current_payment_due: number | null
          end_date: string
          id: string
          net_payment_due: number | null
          notes: string | null
          period_number: number
          retention_amount: number
          retention_percentage: number
          start_date: string
          status: string
          stored_materials: number
          updated_at: string
          work_completed: number
        }
        Insert: {
          billing_date: string
          contract_id: string
          created_at?: string
          current_payment_due?: number | null
          end_date: string
          id?: string
          net_payment_due?: number | null
          notes?: string | null
          period_number: number
          retention_amount?: number
          retention_percentage?: number
          start_date: string
          status?: string
          stored_materials?: number
          updated_at?: string
          work_completed?: number
        }
        Update: {
          billing_date?: string
          contract_id?: string
          created_at?: string
          current_payment_due?: number | null
          end_date?: string
          id?: string
          net_payment_due?: number | null
          notes?: string | null
          period_number?: number
          retention_amount?: number
          retention_percentage?: number
          start_date?: string
          status?: string
          stored_materials?: number
          updated_at?: string
          work_completed?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_billing_periods_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "prime_contract_financial_summary"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "contract_billing_periods_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "prime_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_change_orders: {
        Row: {
          acumatica_external_key: string | null
          amount: number
          approved_by: string | null
          approved_date: string | null
          change_order_number: string
          contract_id: string
          created_at: string
          description: string
          id: string
          rejection_reason: string | null
          requested_by: string | null
          requested_date: string
          status: string
          updated_at: string
        }
        Insert: {
          acumatica_external_key?: string | null
          amount: number
          approved_by?: string | null
          approved_date?: string | null
          change_order_number: string
          contract_id: string
          created_at?: string
          description: string
          id?: string
          rejection_reason?: string | null
          requested_by?: string | null
          requested_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          acumatica_external_key?: string | null
          amount?: number
          approved_by?: string | null
          approved_date?: string | null
          change_order_number?: string
          contract_id?: string
          created_at?: string
          description?: string
          id?: string
          rejection_reason?: string | null
          requested_by?: string | null
          requested_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_change_orders_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "prime_contract_financial_summary"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "contract_change_orders_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "prime_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_documents: {
        Row: {
          contract_id: string
          created_at: string
          document_name: string
          document_type: string
          file_path: string
          file_size: number | null
          id: string
          is_current_version: boolean
          mime_type: string | null
          notes: string | null
          updated_at: string
          uploaded_at: string
          uploaded_by: string | null
          version: number
        }
        Insert: {
          contract_id: string
          created_at?: string
          document_name: string
          document_type: string
          file_path: string
          file_size?: number | null
          id?: string
          is_current_version?: boolean
          mime_type?: string | null
          notes?: string | null
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Update: {
          contract_id?: string
          created_at?: string
          document_name?: string
          document_type?: string
          file_path?: string
          file_size?: number | null
          id?: string
          is_current_version?: boolean
          mime_type?: string | null
          notes?: string | null
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_documents_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "prime_contract_financial_summary"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "contract_documents_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "prime_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_line_items: {
        Row: {
          budget_code_id: string | null
          contract_id: string
          cost_code_id: string | null
          created_at: string
          description: string
          id: string
          line_number: number
          quantity: number | null
          total_cost: number | null
          unit_cost: number | null
          unit_of_measure: string | null
          updated_at: string
        }
        Insert: {
          budget_code_id?: string | null
          contract_id: string
          cost_code_id?: string | null
          created_at?: string
          description: string
          id?: string
          line_number: number
          quantity?: number | null
          total_cost?: number | null
          unit_cost?: number | null
          unit_of_measure?: string | null
          updated_at?: string
        }
        Update: {
          budget_code_id?: string | null
          contract_id?: string
          cost_code_id?: string | null
          created_at?: string
          description?: string
          id?: string
          line_number?: number
          quantity?: number | null
          total_cost?: number | null
          unit_cost?: number | null
          unit_of_measure?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_line_items_budget_code_id_fkey"
            columns: ["budget_code_id"]
            isOneToOne: false
            referencedRelation: "project_cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_line_items_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "prime_contract_financial_summary"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "contract_line_items_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "prime_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_payments: {
        Row: {
          amount: number
          approved_by: string | null
          approved_date: string | null
          billing_period_id: string | null
          check_number: string | null
          contract_id: string
          created_at: string
          id: string
          notes: string | null
          paid_date: string | null
          payment_date: string
          payment_number: string
          payment_type: string
          reference_number: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          approved_by?: string | null
          approved_date?: string | null
          billing_period_id?: string | null
          check_number?: string | null
          contract_id: string
          created_at?: string
          id?: string
          notes?: string | null
          paid_date?: string | null
          payment_date: string
          payment_number: string
          payment_type?: string
          reference_number?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_by?: string | null
          approved_date?: string | null
          billing_period_id?: string | null
          check_number?: string | null
          contract_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          paid_date?: string | null
          payment_date?: string
          payment_number?: string
          payment_type?: string
          reference_number?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_payments_billing_period_id_fkey"
            columns: ["billing_period_id"]
            isOneToOne: false
            referencedRelation: "contract_billing_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "prime_contract_financial_summary"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "contract_payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "prime_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_snapshots: {
        Row: {
          contract_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          reason: string | null
          snapshot_data: Json
          snapshot_date: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          reason?: string | null
          snapshot_data: Json
          snapshot_date?: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          reason?: string | null
          snapshot_data?: Json
          snapshot_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_snapshots_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "prime_contract_financial_summary"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "contract_snapshots_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "prime_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_views: {
        Row: {
          columns: Json | null
          company_id: string
          created_at: string
          description: string | null
          filters: Json | null
          id: string
          is_default: boolean
          is_shared: boolean
          sort_order: Json | null
          updated_at: string
          user_id: string
          view_name: string
        }
        Insert: {
          columns?: Json | null
          company_id: string
          created_at?: string
          description?: string | null
          filters?: Json | null
          id?: string
          is_default?: boolean
          is_shared?: boolean
          sort_order?: Json | null
          updated_at?: string
          user_id: string
          view_name: string
        }
        Update: {
          columns?: Json | null
          company_id?: string
          created_at?: string
          description?: string | null
          filters?: Json | null
          id?: string
          is_default?: boolean
          is_shared?: boolean
          sort_order?: Json | null
          updated_at?: string
          user_id?: string
          view_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_views_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
        Relationships: []
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
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
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
      database_tables_catalog: {
        Row: {
          category: string | null
          created_at: string | null
          primary_keys: string | null
          rls_enabled: boolean | null
          row_count: number | null
          schema: string | null
          schema_name: string
          status: string | null
          table_comment: string | null
          table_name: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          primary_keys?: string | null
          rls_enabled?: boolean | null
          row_count?: number | null
          schema?: string | null
          schema_name: string
          status?: string | null
          table_comment?: string | null
          table_name: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          primary_keys?: string | null
          rls_enabled?: boolean | null
          row_count?: number | null
          schema?: string | null
          schema_name?: string
          status?: string | null
          table_comment?: string | null
          table_name?: string
        }
        Relationships: []
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
      design_violations: {
        Row: {
          created_at: string | null
          element_description: string | null
          element_selector: string | null
          fixed_at: string | null
          fixed_in_file: string | null
          id: string
          notes: string | null
          priority: string | null
          route: string
          screenshot_url: string | null
          status: string | null
          submitted_by: string | null
          updated_at: string | null
          violation_type: string
        }
        Insert: {
          created_at?: string | null
          element_description?: string | null
          element_selector?: string | null
          fixed_at?: string | null
          fixed_in_file?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          route: string
          screenshot_url?: string | null
          status?: string | null
          submitted_by?: string | null
          updated_at?: string | null
          violation_type: string
        }
        Update: {
          created_at?: string | null
          element_description?: string | null
          element_selector?: string | null
          fixed_at?: string | null
          fixed_in_file?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          route?: string
          screenshot_url?: string | null
          status?: string | null
          submitted_by?: string | null
          updated_at?: string | null
          violation_type?: string
        }
        Relationships: []
      }
      dev_annotations: {
        Row: {
          ai_replied_at: string | null
          ai_reply: string | null
          comment: string
          component_hint: string | null
          created_at: string | null
          created_by: string | null
          element_selector: string | null
          id: string
          resolved_at: string | null
          route: string
          screenshot_url: string | null
          status: string | null
        }
        Insert: {
          ai_replied_at?: string | null
          ai_reply?: string | null
          comment: string
          component_hint?: string | null
          created_at?: string | null
          created_by?: string | null
          element_selector?: string | null
          id?: string
          resolved_at?: string | null
          route: string
          screenshot_url?: string | null
          status?: string | null
        }
        Update: {
          ai_replied_at?: string | null
          ai_reply?: string | null
          comment?: string
          component_hint?: string | null
          created_at?: string | null
          created_by?: string | null
          element_selector?: string | null
          id?: string
          resolved_at?: string | null
          route?: string
          screenshot_url?: string | null
          status?: string | null
        }
        Relationships: []
      }
      direct_cost_line_items: {
        Row: {
          budget_code_id: string
          created_at: string
          description: string | null
          direct_cost_id: string
          id: string
          line_order: number
          line_total: number | null
          quantity: number
          unit_cost: number
          uom: string | null
          updated_at: string
        }
        Insert: {
          budget_code_id: string
          created_at?: string
          description?: string | null
          direct_cost_id: string
          id?: string
          line_order: number
          line_total?: number | null
          quantity?: number
          unit_cost: number
          uom?: string | null
          updated_at?: string
        }
        Update: {
          budget_code_id?: string
          created_at?: string
          description?: string | null
          direct_cost_id?: string
          id?: string
          line_order?: number
          line_total?: number | null
          quantity?: number
          unit_cost?: number
          uom?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_cost_line_items_direct_cost_id_fkey"
            columns: ["direct_cost_id"]
            isOneToOne: false
            referencedRelation: "direct_costs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_cost_line_items_direct_cost_id_fkey"
            columns: ["direct_cost_id"]
            isOneToOne: false
            referencedRelation: "direct_costs_with_project"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_costs: {
        Row: {
          acumatica_doc_type: string | null
          acumatica_document_key: string | null
          acumatica_financial_period: string | null
          acumatica_ref_nbr: string | null
          acumatica_sync_at: string | null
          cost_type: string
          created_at: string
          created_by_user_id: string
          date: string
          description: string | null
          employee_id: string | null
          id: string
          invoice_number: string | null
          is_deleted: boolean | null
          paid_date: string | null
          project_id: number
          received_date: string | null
          status: string
          terms: string | null
          total_amount: number
          updated_at: string
          updated_by_user_id: string
          vendor_id: string | null
        }
        Insert: {
          acumatica_doc_type?: string | null
          acumatica_document_key?: string | null
          acumatica_financial_period?: string | null
          acumatica_ref_nbr?: string | null
          acumatica_sync_at?: string | null
          cost_type: string
          created_at?: string
          created_by_user_id: string
          date: string
          description?: string | null
          employee_id?: string | null
          id?: string
          invoice_number?: string | null
          is_deleted?: boolean | null
          paid_date?: string | null
          project_id: number
          received_date?: string | null
          status?: string
          terms?: string | null
          total_amount?: number
          updated_at?: string
          updated_by_user_id: string
          vendor_id?: string | null
        }
        Update: {
          acumatica_doc_type?: string | null
          acumatica_document_key?: string | null
          acumatica_financial_period?: string | null
          acumatica_ref_nbr?: string | null
          acumatica_sync_at?: string | null
          cost_type?: string
          created_at?: string
          created_by_user_id?: string
          date?: string
          description?: string | null
          employee_id?: string | null
          id?: string
          invoice_number?: string | null
          is_deleted?: boolean | null
          paid_date?: string | null
          project_id?: number
          received_date?: string | null
          status?: string
          terms?: string | null
          total_amount?: number
          updated_at?: string
          updated_by_user_id?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "direct_costs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_costs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_costs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_costs_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
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
            referencedRelation: "submittals"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_group_members: {
        Row: {
          created_at: string | null
          group_id: string
          id: string
          person_id: string
        }
        Insert: {
          created_at?: string | null
          group_id: string
          id?: string
          person_id: string
        }
        Update: {
          created_at?: string | null
          group_id?: string
          id?: string
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "distribution_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "distribution_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_group_members_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_groups: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          project_id: number
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          project_id: number
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          project_id?: number
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distribution_groups_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "distribution_groups_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_groups_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_groups_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "distribution_groups_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_groups_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_groups_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
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
          embedding: unknown
          metadata: Json | null
          source_type: string | null
          text: string
          updated_at: string | null
        }
        Insert: {
          chunk_id: string
          chunk_index: number
          content_hash?: string | null
          created_at?: string | null
          document_id: string
          embedding?: unknown
          metadata?: Json | null
          source_type?: string | null
          text: string
          updated_at?: string | null
        }
        Update: {
          chunk_id?: string
          chunk_index?: number
          content_hash?: string | null
          created_at?: string | null
          document_id?: string
          embedding?: unknown
          metadata?: Json | null
          source_type?: string | null
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
          analytics: Json | null
          audio: string | null
          bullet_points: string | null
          calendar_type: string | null
          captured_at: string | null
          category: string | null
          channels: Json | null
          content: string | null
          content_hash: string | null
          created_at: string | null
          date: string | null
          decisions: Json | null
          description: string | null
          duration_minutes: number | null
          extended_sections: Json | null
          file_id: number | null
          file_name: string | null
          file_path: string | null
          fireflies_id: string | null
          fireflies_link: string | null
          host_email: string | null
          id: string
          is_silent_meeting: boolean | null
          key_topics: Json | null
          keywords: string[] | null
          meeting_attendance: Json | null
          meeting_attendees: Json | null
          meeting_link: string | null
          meeting_type: string | null
          notes: string | null
          organizer_email: string | null
          outline: string | null
          overview: string | null
          participants: string | null
          participants_array: string[] | null
          phase: string
          privacy: string | null
          project: string | null
          project_id: number | null
          raw_text: string | null
          sentiment: Json | null
          source: string | null
          speakers: Json | null
          status: string | null
          storage_bucket: string | null
          summary: string | null
          summary_bullets: Json | null
          summary_embedding: unknown
          tags: string | null
          title: string | null
          topics_discussed: string[] | null
          transcript_chapters: string | null
          type: string | null
          url: string | null
          video: string | null
        }
        Insert: {
          access_level?: string | null
          action_items?: string | null
          analytics?: Json | null
          audio?: string | null
          bullet_points?: string | null
          calendar_type?: string | null
          captured_at?: string | null
          category?: string | null
          channels?: Json | null
          content?: string | null
          content_hash?: string | null
          created_at?: string | null
          date?: string | null
          decisions?: Json | null
          description?: string | null
          duration_minutes?: number | null
          extended_sections?: Json | null
          file_id?: number | null
          file_name?: string | null
          file_path?: string | null
          fireflies_id?: string | null
          fireflies_link?: string | null
          host_email?: string | null
          id: string
          is_silent_meeting?: boolean | null
          key_topics?: Json | null
          keywords?: string[] | null
          meeting_attendance?: Json | null
          meeting_attendees?: Json | null
          meeting_link?: string | null
          meeting_type?: string | null
          notes?: string | null
          organizer_email?: string | null
          outline?: string | null
          overview?: string | null
          participants?: string | null
          participants_array?: string[] | null
          phase?: string
          privacy?: string | null
          project?: string | null
          project_id?: number | null
          raw_text?: string | null
          sentiment?: Json | null
          source?: string | null
          speakers?: Json | null
          status?: string | null
          storage_bucket?: string | null
          summary?: string | null
          summary_bullets?: Json | null
          summary_embedding?: unknown
          tags?: string | null
          title?: string | null
          topics_discussed?: string[] | null
          transcript_chapters?: string | null
          type?: string | null
          url?: string | null
          video?: string | null
        }
        Update: {
          access_level?: string | null
          action_items?: string | null
          analytics?: Json | null
          audio?: string | null
          bullet_points?: string | null
          calendar_type?: string | null
          captured_at?: string | null
          category?: string | null
          channels?: Json | null
          content?: string | null
          content_hash?: string | null
          created_at?: string | null
          date?: string | null
          decisions?: Json | null
          description?: string | null
          duration_minutes?: number | null
          extended_sections?: Json | null
          file_id?: number | null
          file_name?: string | null
          file_path?: string | null
          fireflies_id?: string | null
          fireflies_link?: string | null
          host_email?: string | null
          id?: string
          is_silent_meeting?: boolean | null
          key_topics?: Json | null
          keywords?: string[] | null
          meeting_attendance?: Json | null
          meeting_attendees?: Json | null
          meeting_link?: string | null
          meeting_type?: string | null
          notes?: string | null
          organizer_email?: string | null
          outline?: string | null
          overview?: string | null
          participants?: string | null
          participants_array?: string[] | null
          phase?: string
          privacy?: string | null
          project?: string | null
          project_id?: number | null
          raw_text?: string | null
          sentiment?: Json | null
          source?: string | null
          speakers?: Json | null
          status?: string | null
          storage_bucket?: string | null
          summary?: string | null
          summary_bullets?: Json | null
          summary_embedding?: unknown
          tags?: string | null
          title?: string | null
          topics_discussed?: string[] | null
          transcript_chapters?: string | null
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
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_metadata_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
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
          file_name: string | null
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
          file_name?: string | null
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
          file_name?: string | null
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
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
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
      drawing_areas: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          parent_area_id: string | null
          project_id: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          parent_area_id?: string | null
          project_id: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          parent_area_id?: string | null
          project_id?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drawing_areas_parent_area_id_fkey"
            columns: ["parent_area_id"]
            isOneToOne: false
            referencedRelation: "drawing_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawing_areas_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "drawing_areas_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawing_areas_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawing_areas_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "drawing_areas_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawing_areas_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawing_areas_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      drawing_downloads: {
        Row: {
          downloaded_at: string
          downloaded_by: string
          drawing_revision_id: string
          id: string
          ip_address: unknown
          user_agent: string | null
        }
        Insert: {
          downloaded_at?: string
          downloaded_by: string
          drawing_revision_id: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
        }
        Update: {
          downloaded_at?: string
          downloaded_by?: string
          drawing_revision_id?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drawing_downloads_drawing_revision_id_fkey"
            columns: ["drawing_revision_id"]
            isOneToOne: false
            referencedRelation: "drawing_log"
            referencedColumns: ["revision_id"]
          },
          {
            foreignKeyName: "drawing_downloads_drawing_revision_id_fkey"
            columns: ["drawing_revision_id"]
            isOneToOne: false
            referencedRelation: "drawing_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      drawing_markup_pins: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          drawing_id: string
          entity_id: string | null
          entity_label: string | null
          entity_number: string | null
          entity_status: string | null
          id: string
          page: number
          pin_type: string
          project_id: number
          updated_at: string | null
          x_pct: number
          y_pct: number
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          drawing_id: string
          entity_id?: string | null
          entity_label?: string | null
          entity_number?: string | null
          entity_status?: string | null
          id?: string
          page?: number
          pin_type?: string
          project_id: number
          updated_at?: string | null
          x_pct: number
          y_pct: number
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          drawing_id?: string
          entity_id?: string | null
          entity_label?: string | null
          entity_number?: string | null
          entity_status?: string | null
          id?: string
          page?: number
          pin_type?: string
          project_id?: number
          updated_at?: string | null
          x_pct?: number
          y_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "drawing_markup_pins_drawing_id_fkey"
            columns: ["drawing_id"]
            isOneToOne: false
            referencedRelation: "drawing_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawing_markup_pins_drawing_id_fkey"
            columns: ["drawing_id"]
            isOneToOne: false
            referencedRelation: "drawings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawing_markup_pins_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "drawing_markup_pins_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawing_markup_pins_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawing_markup_pins_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "drawing_markup_pins_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawing_markup_pins_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawing_markup_pins_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      drawing_related_items: {
        Row: {
          created_at: string
          created_by: string
          drawing_id: string
          id: string
          related_id: string
          related_type: string
        }
        Insert: {
          created_at?: string
          created_by: string
          drawing_id: string
          id?: string
          related_id: string
          related_type: string
        }
        Update: {
          created_at?: string
          created_by?: string
          drawing_id?: string
          id?: string
          related_id?: string
          related_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "drawing_related_items_drawing_id_fkey"
            columns: ["drawing_id"]
            isOneToOne: false
            referencedRelation: "drawing_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawing_related_items_drawing_id_fkey"
            columns: ["drawing_id"]
            isOneToOne: false
            referencedRelation: "drawings"
            referencedColumns: ["id"]
          },
        ]
      }
      drawing_revisions: {
        Row: {
          created_at: string
          description: string | null
          drawing_date: string | null
          drawing_id: string
          drawing_set_id: string | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          is_current_revision: boolean
          received_date: string
          revision_number: string
          status: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          drawing_date?: string | null
          drawing_id: string
          drawing_set_id?: string | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          is_current_revision?: boolean
          received_date?: string
          revision_number?: string
          status?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          description?: string | null
          drawing_date?: string | null
          drawing_id?: string
          drawing_set_id?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          is_current_revision?: boolean
          received_date?: string
          revision_number?: string
          status?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "drawing_revisions_drawing_id_fkey"
            columns: ["drawing_id"]
            isOneToOne: false
            referencedRelation: "drawing_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawing_revisions_drawing_id_fkey"
            columns: ["drawing_id"]
            isOneToOne: false
            referencedRelation: "drawings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawing_revisions_drawing_set_id_fkey"
            columns: ["drawing_set_id"]
            isOneToOne: false
            referencedRelation: "drawing_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      drawing_sets: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          issued_at: string
          name: string
          project_id: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          issued_at: string
          name: string
          project_id: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          issued_at?: string
          name?: string
          project_id?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drawing_sets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "drawing_sets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawing_sets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawing_sets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "drawing_sets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawing_sets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawing_sets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      drawing_sketches: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          drawing_revision_id: string
          file_url: string
          id: string
          name: string
          sketch_date: string
          sketch_number: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          drawing_revision_id: string
          file_url: string
          id?: string
          name: string
          sketch_date?: string
          sketch_number: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          drawing_revision_id?: string
          file_url?: string
          id?: string
          name?: string
          sketch_date?: string
          sketch_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "drawing_sketches_drawing_revision_id_fkey"
            columns: ["drawing_revision_id"]
            isOneToOne: false
            referencedRelation: "drawing_log"
            referencedColumns: ["revision_id"]
          },
          {
            foreignKeyName: "drawing_sketches_drawing_revision_id_fkey"
            columns: ["drawing_revision_id"]
            isOneToOne: false
            referencedRelation: "drawing_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      drawings: {
        Row: {
          area_id: string | null
          created_at: string
          created_by: string
          current_revision_id: string | null
          discipline: string | null
          drawing_number: string
          drawing_type: string | null
          id: string
          project_id: number
          title: string
          updated_at: string
        }
        Insert: {
          area_id?: string | null
          created_at?: string
          created_by: string
          current_revision_id?: string | null
          discipline?: string | null
          drawing_number: string
          drawing_type?: string | null
          id?: string
          project_id: number
          title: string
          updated_at?: string
        }
        Update: {
          area_id?: string | null
          created_at?: string
          created_by?: string
          current_revision_id?: string | null
          discipline?: string | null
          drawing_number?: string
          drawing_type?: string | null
          id?: string
          project_id?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drawings_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "drawing_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "drawings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "drawings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_drawings_current_revision"
            columns: ["current_revision_id"]
            isOneToOne: false
            referencedRelation: "drawing_log"
            referencedColumns: ["revision_id"]
          },
          {
            foreignKeyName: "fk_drawings_current_revision"
            columns: ["current_revision_id"]
            isOneToOne: false
            referencedRelation: "drawing_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      email_attachments: {
        Row: {
          content_type: string | null
          created_at: string | null
          email_id: number
          file_name: string
          file_size: number | null
          file_url: string
          id: number
        }
        Insert: {
          content_type?: string | null
          created_at?: string | null
          email_id: number
          file_name: string
          file_size?: number | null
          file_url: string
          id?: never
        }
        Update: {
          content_type?: string | null
          created_at?: string | null
          email_id?: number
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: never
        }
        Relationships: [
          {
            foreignKeyName: "email_attachments_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "project_emails"
            referencedColumns: ["id"]
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
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "erp_sync_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
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
      estimate_allowances: {
        Row: {
          allowance_id: number
          allowance_number: number
          amount: number
          created_at: string
          description: string
          estimate_id: number
          scope_type: string | null
          sort_order: number
        }
        Insert: {
          allowance_id?: number
          allowance_number: number
          amount?: number
          created_at?: string
          description: string
          estimate_id: number
          scope_type?: string | null
          sort_order?: number
        }
        Update: {
          allowance_id?: number
          allowance_number?: number
          amount?: number
          created_at?: string
          description?: string
          estimate_id?: number
          scope_type?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "estimate_allowances_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["estimate_id"]
          },
        ]
      }
      estimate_alternates: {
        Row: {
          alternate_id: number
          alternate_number: number
          alternate_type: string
          amount: number
          created_at: string
          description: string
          estimate_id: number
          sort_order: number
        }
        Insert: {
          alternate_id?: number
          alternate_number: number
          alternate_type?: string
          amount?: number
          created_at?: string
          description: string
          estimate_id: number
          sort_order?: number
        }
        Update: {
          alternate_id?: number
          alternate_number?: number
          alternate_type?: string
          amount?: number
          created_at?: string
          description?: string
          estimate_id?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "estimate_alternates_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["estimate_id"]
          },
        ]
      }
      estimate_line_items: {
        Row: {
          comment_type: string | null
          comments: string | null
          created_at: string
          depth: number | null
          description: string | null
          division_code: string
          equipment_cost: number | null
          equipment_duration: number | null
          equipment_rate: number | null
          equipment_unit: string | null
          estimate_id: number
          gc_cost_code: string | null
          labor_cost: number | null
          labor_crew_size: number | null
          labor_hours: number | null
          labor_man_hours: number | null
          labor_rate: number | null
          length: number | null
          line_item_id: number
          line_number: number | null
          material_cost: number | null
          material_unit_price: number | null
          number_of_each: number | null
          quantity: number | null
          sort_order: number
          subcontract_cost: number | null
          subcontract_unit_price: number | null
          total_cost: number | null
          unit: string | null
          updated_at: string
          vendor_name: string | null
          width: number | null
        }
        Insert: {
          comment_type?: string | null
          comments?: string | null
          created_at?: string
          depth?: number | null
          description?: string | null
          division_code: string
          equipment_cost?: number | null
          equipment_duration?: number | null
          equipment_rate?: number | null
          equipment_unit?: string | null
          estimate_id: number
          gc_cost_code?: string | null
          labor_cost?: number | null
          labor_crew_size?: number | null
          labor_hours?: number | null
          labor_man_hours?: number | null
          labor_rate?: number | null
          length?: number | null
          line_item_id?: number
          line_number?: number | null
          material_cost?: number | null
          material_unit_price?: number | null
          number_of_each?: number | null
          quantity?: number | null
          sort_order?: number
          subcontract_cost?: number | null
          subcontract_unit_price?: number | null
          total_cost?: number | null
          unit?: string | null
          updated_at?: string
          vendor_name?: string | null
          width?: number | null
        }
        Update: {
          comment_type?: string | null
          comments?: string | null
          created_at?: string
          depth?: number | null
          description?: string | null
          division_code?: string
          equipment_cost?: number | null
          equipment_duration?: number | null
          equipment_rate?: number | null
          equipment_unit?: string | null
          estimate_id?: number
          gc_cost_code?: string | null
          labor_cost?: number | null
          labor_crew_size?: number | null
          labor_hours?: number | null
          labor_man_hours?: number | null
          labor_rate?: number | null
          length?: number | null
          line_item_id?: number
          line_number?: number | null
          material_cost?: number | null
          material_unit_price?: number | null
          number_of_each?: number | null
          quantity?: number | null
          sort_order?: number
          subcontract_cost?: number | null
          subcontract_unit_price?: number | null
          total_cost?: number | null
          unit?: string | null
          updated_at?: string
          vendor_name?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "estimate_line_items_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["estimate_id"]
          },
        ]
      }
      estimates: {
        Row: {
          contingency_amount: number
          created_at: string
          created_by: string | null
          estimate_date: string | null
          estimate_id: number
          estimate_number: string | null
          estimate_type: string | null
          estimator: string | null
          fee_rate: number
          insurance_rate: number
          is_deleted: boolean
          location: string | null
          notes: string | null
          project_duration_weeks: number | null
          project_id: number
          revision: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          contingency_amount?: number
          created_at?: string
          created_by?: string | null
          estimate_date?: string | null
          estimate_id?: number
          estimate_number?: string | null
          estimate_type?: string | null
          estimator?: string | null
          fee_rate?: number
          insurance_rate?: number
          is_deleted?: boolean
          location?: string | null
          notes?: string | null
          project_duration_weeks?: number | null
          project_id: number
          revision?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          contingency_amount?: number
          created_at?: string
          created_by?: string | null
          estimate_date?: string | null
          estimate_id?: number
          estimate_number?: string | null
          estimate_type?: string | null
          estimator?: string | null
          fee_rate?: number
          insurance_rate?: number
          is_deleted?: boolean
          location?: string | null
          notes?: string | null
          project_duration_weeks?: number | null
          project_id?: number
          revision?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "estimates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "estimates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          category: string | null
          content: string
          created_at: string
          embedding: string | null
          id: string
          metadata: Json | null
          project_id: number | null
          status: string | null
          title: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          embedding?: string | null
          id: string
          metadata?: Json | null
          project_id?: number | null
          status?: string | null
          title?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          project_id?: number | null
          status?: string | null
          title?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
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
      forecasting_curves: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          curve_config: Json
          curve_type: string
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          curve_config?: Json
          curve_type: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          curve_config?: Json
          curve_type?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forecasting_curves_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      graph_sync_state: {
        Row: {
          created_at: string
          delta_token: string | null
          error_message: string | null
          id: string
          items_synced: number
          last_sync_at: string | null
          resource_id: string
          resource_name: string | null
          source: string
          sync_status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delta_token?: string | null
          error_message?: string | null
          id?: string
          items_synced?: number
          last_sync_at?: string | null
          resource_id: string
          resource_name?: string | null
          source: string
          sync_status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delta_token?: string | null
          error_message?: string | null
          id?: string
          items_synced?: number
          last_sync_at?: string | null
          resource_id?: string
          resource_name?: string | null
          source?: string
          sync_status?: string
          updated_at?: string
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
      initiative_cards: {
        Row: {
          assignee: string | null
          assignee_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          dispatch_status: string | null
          due_date: string | null
          external_id: string | null
          github_issue_url: string | null
          id: string
          labels: string[] | null
          linked_record_id: string | null
          linked_record_type: string | null
          priority: string
          sort_order: number
          source: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee?: string | null
          assignee_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          dispatch_status?: string | null
          due_date?: string | null
          external_id?: string | null
          github_issue_url?: string | null
          id?: string
          labels?: string[] | null
          linked_record_id?: string | null
          linked_record_type?: string | null
          priority?: string
          sort_order?: number
          source?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee?: string | null
          assignee_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          dispatch_status?: string | null
          due_date?: string | null
          external_id?: string | null
          github_issue_url?: string | null
          id?: string
          labels?: string[] | null
          linked_record_id?: string | null
          linked_record_type?: string | null
          priority?: string
          sort_order?: number
          source?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "initiative_cards_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "people"
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
      insights: {
        Row: {
          created_at: string
          description: string
          details: Json | null
          embedding: unknown
          id: string
          metadata_id: string | null
          owner_name: string | null
          project_id: number | null
          project_ids: number[] | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          details?: Json | null
          embedding?: unknown
          id?: string
          metadata_id?: string | null
          owner_name?: string | null
          project_id?: number | null
          project_ids?: number[] | null
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          details?: Json | null
          embedding?: unknown
          id?: string
          metadata_id?: string | null
          owner_name?: string | null
          project_id?: number | null
          project_ids?: number[] | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insights_metadata_id_fkey"
            columns: ["metadata_id"]
            isOneToOne: false
            referencedRelation: "document_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insights_metadata_id_fkey"
            columns: ["metadata_id"]
            isOneToOne: false
            referencedRelation: "document_metadata_manual_only"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insights_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "insights_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insights_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insights_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "insights_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insights_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insights_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
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
      meeting_preps: {
        Row: {
          content: string
          created_at: string | null
          generated_by: string
          generation_time_ms: number | null
          id: string
          meeting_id: string
          model_used: string | null
          project_id: number | null
          updated_at: string | null
          version: number
        }
        Insert: {
          content?: string
          created_at?: string | null
          generated_by?: string
          generation_time_ms?: number | null
          id?: string
          meeting_id: string
          model_used?: string | null
          project_id?: number | null
          updated_at?: string | null
          version?: number
        }
        Update: {
          content?: string
          created_at?: string | null
          generated_by?: string
          generation_time_ms?: number | null
          id?: string
          meeting_id?: string
          model_used?: string | null
          project_id?: number | null
          updated_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "meeting_preps_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: true
            referencedRelation: "document_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_preps_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: true
            referencedRelation: "document_metadata_manual_only"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_preps_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "meeting_preps_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_preps_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_preps_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "meeting_preps_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_preps_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_preps_project_id_fkey"
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
          data_class: string[] | null
          decisions: Json
          end_index: number
          enriched_at: string | null
          enrichment_model: string | null
          id: string
          mentioned_people: string[] | null
          metadata_id: string
          project_ids: number[] | null
          project_impact: string[] | null
          risks: Json
          segment_index: number
          sentiment: string | null
          start_index: number
          summary: string | null
          summary_embedding: unknown
          tasks: Json
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_class?: string[] | null
          decisions?: Json
          end_index: number
          enriched_at?: string | null
          enrichment_model?: string | null
          id?: string
          mentioned_people?: string[] | null
          metadata_id: string
          project_ids?: number[] | null
          project_impact?: string[] | null
          risks?: Json
          segment_index: number
          sentiment?: string | null
          start_index: number
          summary?: string | null
          summary_embedding?: unknown
          tasks?: Json
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_class?: string[] | null
          decisions?: Json
          end_index?: number
          enriched_at?: string | null
          enrichment_model?: string | null
          id?: string
          mentioned_people?: string[] | null
          metadata_id?: string
          project_ids?: number[] | null
          project_impact?: string[] | null
          risks?: Json
          segment_index?: number
          sentiment?: string | null
          start_index?: number
          summary?: string | null
          summary_embedding?: unknown
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
          created_at: string | null
          embedding: unknown
          id: number
          memory_type: string | null
          metadata: Json | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          embedding?: unknown
          id?: number
          memory_type?: string | null
          metadata?: Json | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          embedding?: unknown
          id?: number
          memory_type?: string | null
          metadata?: Json | null
          session_id?: string | null
          user_id?: string | null
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
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_project_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
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
          acumatica_line_nbr: number | null
          approved_amount: number | null
          category: string | null
          created_at: string | null
          description: string | null
          id: number
          invoice_id: number
          updated_at: string
        }
        Insert: {
          acumatica_line_nbr?: number | null
          approved_amount?: number | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: number
          invoice_id: number
          updated_at?: string
        }
        Update: {
          acumatica_line_nbr?: number | null
          approved_amount?: number | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: number
          invoice_id?: number
          updated_at?: string
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
          acumatica_doc_type: string | null
          acumatica_ref_nbr: string | null
          acumatica_sync_at: string | null
          approved_at: string | null
          billing_date: string | null
          billing_period_id: string | null
          contract_id: string | null
          created_at: string | null
          due_date: string | null
          gross_amount: number | null
          id: number
          invoice_number: string | null
          net_amount: number | null
          paid_amount: number | null
          percent_complete: number | null
          period_end: string | null
          period_start: string | null
          prime_contract_id: string | null
          status: string | null
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          acumatica_doc_type?: string | null
          acumatica_ref_nbr?: string | null
          acumatica_sync_at?: string | null
          approved_at?: string | null
          billing_date?: string | null
          billing_period_id?: string | null
          contract_id?: string | null
          created_at?: string | null
          due_date?: string | null
          gross_amount?: number | null
          id?: number
          invoice_number?: string | null
          net_amount?: number | null
          paid_amount?: number | null
          percent_complete?: number | null
          period_end?: string | null
          period_start?: string | null
          prime_contract_id?: string | null
          status?: string | null
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          acumatica_doc_type?: string | null
          acumatica_ref_nbr?: string | null
          acumatica_sync_at?: string | null
          approved_at?: string | null
          billing_date?: string | null
          billing_period_id?: string | null
          contract_id?: string | null
          created_at?: string | null
          due_date?: string | null
          gross_amount?: number | null
          id?: number
          invoice_number?: string | null
          net_amount?: number | null
          paid_amount?: number | null
          percent_complete?: number | null
          period_end?: string | null
          period_start?: string | null
          prime_contract_id?: string | null
          status?: string | null
          submitted_at?: string | null
          updated_at?: string
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
            referencedRelation: "prime_contract_financial_summary"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "owner_invoices_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "prime_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_invoices_prime_contract_id_fkey"
            columns: ["prime_contract_id"]
            isOneToOne: false
            referencedRelation: "prime_contract_financial_summary"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "owner_invoices_prime_contract_id_fkey"
            columns: ["prime_contract_id"]
            isOneToOne: false
            referencedRelation: "prime_contracts"
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
          contract_id: string
          created_at: string | null
          id: number
          invoice_id: number | null
          method: string | null
          payment_date: string
          reference_number: string | null
        }
        Insert: {
          amount: number
          contract_id: string
          created_at?: string | null
          id?: number
          invoice_id?: number | null
          method?: string | null
          payment_date: string
          reference_number?: string | null
        }
        Update: {
          amount?: number
          contract_id?: string
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
            referencedRelation: "prime_contract_financial_summary"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "payment_transactions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "prime_contracts"
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
      pcco_attachments: {
        Row: {
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          pcco_id: number
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          file_name: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          pcco_id: number
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          pcco_id?: number
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pcco_attachments_pcco_id_fkey"
            columns: ["pcco_id"]
            isOneToOne: false
            referencedRelation: "prime_contract_change_orders"
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
        Relationships: []
      }
      people: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          auth_user_id: string | null
          business_unit: string | null
          city: string | null
          company: string | null
          company_id: string | null
          country: string | null
          created_at: string | null
          email: string | null
          first_name: string
          id: string
          job_title: string | null
          last_name: string
          linkedin: string | null
          metadata: Json | null
          notes: string | null
          person_type: string
          phone_business: string | null
          phone_mobile: string | null
          profile_photo_url: string | null
          state: string | null
          status: string | null
          updated_at: string | null
          zip: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          auth_user_id?: string | null
          business_unit?: string | null
          city?: string | null
          company?: string | null
          company_id?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          first_name: string
          id?: string
          job_title?: string | null
          last_name: string
          linkedin?: string | null
          metadata?: Json | null
          notes?: string | null
          person_type: string
          phone_business?: string | null
          phone_mobile?: string | null
          profile_photo_url?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          auth_user_id?: string | null
          business_unit?: string | null
          city?: string | null
          company?: string | null
          company_id?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string
          id?: string
          job_title?: string | null
          last_name?: string
          linkedin?: string | null
          metadata?: Json | null
          notes?: string | null
          person_type?: string
          phone_business?: string | null
          phone_mobile?: string | null
          profile_photo_url?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_templates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_system: boolean | null
          name: string
          rules_json: Json
          scope: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          rules_json?: Json
          scope?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          rules_json?: Json
          scope?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pipeline_config: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value?: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      prime_contract_change_orders: {
        Row: {
          acumatica_external_key: string | null
          approved_at: string | null
          contract_id: string | null
          created_at: string | null
          executed: boolean | null
          id: number
          pcco_number: string | null
          prime_contract_id: string | null
          project_id: number | null
          status: string | null
          submitted_at: string | null
          title: string
          total_amount: number | null
        }
        Insert: {
          acumatica_external_key?: string | null
          approved_at?: string | null
          contract_id?: string | null
          created_at?: string | null
          executed?: boolean | null
          id?: number
          pcco_number?: string | null
          prime_contract_id?: string | null
          project_id?: number | null
          status?: string | null
          submitted_at?: string | null
          title: string
          total_amount?: number | null
        }
        Update: {
          acumatica_external_key?: string | null
          approved_at?: string | null
          contract_id?: string | null
          created_at?: string | null
          executed?: boolean | null
          id?: number
          pcco_number?: string | null
          prime_contract_id?: string | null
          project_id?: number | null
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
            referencedRelation: "prime_contract_financial_summary"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "prime_contract_change_orders_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "prime_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contract_change_orders_prime_contract_id_fkey"
            columns: ["prime_contract_id"]
            isOneToOne: false
            referencedRelation: "prime_contract_financial_summary"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "prime_contract_change_orders_prime_contract_id_fkey"
            columns: ["prime_contract_id"]
            isOneToOne: false
            referencedRelation: "prime_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contract_change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "prime_contract_change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contract_change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contract_change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "prime_contract_change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contract_change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contract_change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      prime_contract_payment_applications: {
        Row: {
          amount: number
          application_number: string
          approved_at: string | null
          approved_by: string | null
          contract_id: string
          created_at: string
          id: string
          net_amount: number | null
          notes: string | null
          period_from: string | null
          period_to: string | null
          project_id: number
          retention_amount: number
          status: string
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          application_number: string
          approved_at?: string | null
          approved_by?: string | null
          contract_id: string
          created_at?: string
          id?: string
          net_amount?: number | null
          notes?: string | null
          period_from?: string | null
          period_to?: string | null
          project_id: number
          retention_amount?: number
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          application_number?: string
          approved_at?: string | null
          approved_by?: string | null
          contract_id?: string
          created_at?: string
          id?: string
          net_amount?: number | null
          notes?: string | null
          period_from?: string | null
          period_to?: string | null
          project_id?: number
          retention_amount?: number
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prime_contract_payment_applications_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "prime_contract_financial_summary"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "prime_contract_payment_applications_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "prime_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contract_payment_applications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "prime_contract_payment_applications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contract_payment_applications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contract_payment_applications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "prime_contract_payment_applications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contract_payment_applications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contract_payment_applications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      prime_contract_payments: {
        Row: {
          acumatica_doc_type: string | null
          acumatica_ref_nbr: string | null
          acumatica_sync_at: string | null
          amount: number
          contract_id: string
          created_at: string
          id: string
          method: string | null
          notes: string | null
          payment_application_id: string | null
          payment_date: string
          payment_number: string | null
          project_id: number
          reference_number: string | null
          updated_at: string
        }
        Insert: {
          acumatica_doc_type?: string | null
          acumatica_ref_nbr?: string | null
          acumatica_sync_at?: string | null
          amount: number
          contract_id: string
          created_at?: string
          id?: string
          method?: string | null
          notes?: string | null
          payment_application_id?: string | null
          payment_date: string
          payment_number?: string | null
          project_id: number
          reference_number?: string | null
          updated_at?: string
        }
        Update: {
          acumatica_doc_type?: string | null
          acumatica_ref_nbr?: string | null
          acumatica_sync_at?: string | null
          amount?: number
          contract_id?: string
          created_at?: string
          id?: string
          method?: string | null
          notes?: string | null
          payment_application_id?: string | null
          payment_date?: string
          payment_number?: string | null
          project_id?: number
          reference_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prime_contract_payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "prime_contract_financial_summary"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "prime_contract_payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "prime_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contract_payments_payment_application_id_fkey"
            columns: ["payment_application_id"]
            isOneToOne: false
            referencedRelation: "prime_contract_payment_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contract_payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "prime_contract_payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contract_payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contract_payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "prime_contract_payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contract_payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contract_payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      prime_contract_project_settings: {
        Row: {
          allow_standard_users_create_pcco: boolean
          allow_standard_users_create_pco: boolean
          co_tier_count: number
          created_at: string
          default_distribution_pcco: string | null
          default_distribution_pco: string | null
          default_distribution_prime_contract: string | null
          id: string
          project_id: number
          show_markup_on_co_pdf: boolean
          show_markup_on_invoice_pdf: boolean
          sov_always_editable: boolean
          updated_at: string
        }
        Insert: {
          allow_standard_users_create_pcco?: boolean
          allow_standard_users_create_pco?: boolean
          co_tier_count?: number
          created_at?: string
          default_distribution_pcco?: string | null
          default_distribution_pco?: string | null
          default_distribution_prime_contract?: string | null
          id?: string
          project_id: number
          show_markup_on_co_pdf?: boolean
          show_markup_on_invoice_pdf?: boolean
          sov_always_editable?: boolean
          updated_at?: string
        }
        Update: {
          allow_standard_users_create_pcco?: boolean
          allow_standard_users_create_pco?: boolean
          co_tier_count?: number
          created_at?: string
          default_distribution_pcco?: string | null
          default_distribution_pco?: string | null
          default_distribution_prime_contract?: string | null
          id?: string
          project_id?: number
          show_markup_on_co_pdf?: boolean
          show_markup_on_invoice_pdf?: boolean
          sov_always_editable?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prime_contract_project_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "prime_contract_project_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contract_project_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contract_project_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "prime_contract_project_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contract_project_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contract_project_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      prime_contract_sovs: {
        Row: {
          budget_code_id: string | null
          contract_id: string
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
          budget_code_id?: string | null
          contract_id: string
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
          budget_code_id?: string | null
          contract_id?: string
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
            foreignKeyName: "prime_contract_sovs_budget_code_id_fkey"
            columns: ["budget_code_id"]
            isOneToOne: false
            referencedRelation: "project_budget_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contract_sovs_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "prime_contract_financial_summary"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "prime_contract_sovs_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "prime_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contract_sovs_cost_code_fkey"
            columns: ["cost_code"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contract_sovs_cost_code_fkey"
            columns: ["cost_code"]
            isOneToOne: false
            referencedRelation: "cost_codes_with_division_title"
            referencedColumns: ["id"]
          },
        ]
      }
      prime_contracts: {
        Row: {
          actual_completion_date: string | null
          architect_engineer_id: string | null
          billing_schedule: string | null
          client_id: string | null
          contract_company_id: string | null
          contract_number: string
          contract_termination_date: string | null
          contractor_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          exclusions: string | null
          executed: boolean
          executed_at: string | null
          id: string
          inclusions: string | null
          is_private: boolean
          original_contract_value: number
          payment_terms: string | null
          project_id: number
          retention_percentage: number | null
          revised_contract_value: number
          signed_contract_received_date: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["prime_contract_status_v2"]
          substantial_completion_date: string | null
          title: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          actual_completion_date?: string | null
          architect_engineer_id?: string | null
          billing_schedule?: string | null
          client_id?: string | null
          contract_company_id?: string | null
          contract_number: string
          contract_termination_date?: string | null
          contractor_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          exclusions?: string | null
          executed?: boolean
          executed_at?: string | null
          id?: string
          inclusions?: string | null
          is_private?: boolean
          original_contract_value?: number
          payment_terms?: string | null
          project_id: number
          retention_percentage?: number | null
          revised_contract_value?: number
          signed_contract_received_date?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["prime_contract_status_v2"]
          substantial_completion_date?: string | null
          title: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          actual_completion_date?: string | null
          architect_engineer_id?: string | null
          billing_schedule?: string | null
          client_id?: string | null
          contract_company_id?: string | null
          contract_number?: string
          contract_termination_date?: string | null
          contractor_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          exclusions?: string | null
          executed?: boolean
          executed_at?: string | null
          id?: string
          inclusions?: string | null
          is_private?: boolean
          original_contract_value?: number
          payment_terms?: string | null
          project_id?: number
          retention_percentage?: number | null
          revised_contract_value?: number
          signed_contract_received_date?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["prime_contract_status_v2"]
          substantial_completion_date?: string | null
          title?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prime_contracts_architect_engineer_id_fkey"
            columns: ["architect_engineer_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contracts_client_company_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contracts_contract_company_id_fkey"
            columns: ["contract_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contracts_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "prime_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "prime_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contracts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
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
          category: string | null
          complexity: string | null
          created_at: string
          description: string | null
          estimated_hours: number | null
          id: string
          include_in_rebuild: boolean | null
          match_score: number | null
          module_id: string | null
          name: string
          page_count: number | null
          priority: string | null
          procore_tool_url: string | null
          screenshot_ids: string[] | null
          slug: string | null
          status: string | null
          tabs: string | null
          updated_at: string | null
        }
        Insert: {
          ai_enhancement_notes?: string | null
          ai_enhancement_possible?: boolean | null
          category?: string | null
          complexity?: string | null
          created_at?: string
          description?: string | null
          estimated_hours?: number | null
          id?: string
          include_in_rebuild?: boolean | null
          match_score?: number | null
          module_id?: string | null
          name: string
          page_count?: number | null
          priority?: string | null
          procore_tool_url?: string | null
          screenshot_ids?: string[] | null
          slug?: string | null
          status?: string | null
          tabs?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_enhancement_notes?: string | null
          ai_enhancement_possible?: boolean | null
          category?: string | null
          complexity?: string | null
          created_at?: string
          description?: string | null
          estimated_hours?: number | null
          id?: string
          include_in_rebuild?: boolean | null
          match_score?: number | null
          module_id?: string | null
          name?: string
          page_count?: number | null
          priority?: string | null
          procore_tool_url?: string | null
          screenshot_ids?: string[] | null
          slug?: string | null
          status?: string | null
          tabs?: string | null
          updated_at?: string | null
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
          id: string
          key_features: Json | null
          name: string
          notes: string | null
          procore_link: string | null
          prp_folder: string | null
          rebuild_notes: string | null
          status: string | null
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
          id?: string
          key_features?: Json | null
          name: string
          notes?: string | null
          procore_link?: string | null
          prp_folder?: string | null
          rebuild_notes?: string | null
          status?: string | null
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
          id?: string
          key_features?: Json | null
          name?: string
          notes?: string | null
          procore_link?: string | null
          prp_folder?: string | null
          rebuild_notes?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      procore_pages: {
        Row: {
          alleato_route: string | null
          alleato_url: string | null
          button_count: number | null
          created_at: string | null
          dom_path: string | null
          feature_id: string | null
          form_field_count: number | null
          id: string
          implementation_notes: string | null
          linear_issue_id: string | null
          metadata_path: string | null
          name: string
          page_type: string | null
          procore_url: string | null
          screenshot_path: string | null
          slug: string
          status: string | null
          table_column_count: number | null
          tool_id: number | null
          updated_at: string | null
        }
        Insert: {
          alleato_route?: string | null
          alleato_url?: string | null
          button_count?: number | null
          created_at?: string | null
          dom_path?: string | null
          feature_id?: string | null
          form_field_count?: number | null
          id?: string
          implementation_notes?: string | null
          linear_issue_id?: string | null
          metadata_path?: string | null
          name: string
          page_type?: string | null
          procore_url?: string | null
          screenshot_path?: string | null
          slug: string
          status?: string | null
          table_column_count?: number | null
          tool_id?: number | null
          updated_at?: string | null
        }
        Update: {
          alleato_route?: string | null
          alleato_url?: string | null
          button_count?: number | null
          created_at?: string | null
          dom_path?: string | null
          feature_id?: string | null
          form_field_count?: number | null
          id?: string
          implementation_notes?: string | null
          linear_issue_id?: string | null
          metadata_path?: string | null
          name?: string
          page_type?: string | null
          procore_url?: string | null
          screenshot_path?: string | null
          slug?: string
          status?: string | null
          table_column_count?: number | null
          tool_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procore_pages_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "procore_features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procore_pages_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "procore_tools"
            referencedColumns: ["id"]
          },
        ]
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
          new_url: string | null
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
          new_url?: string | null
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
          new_url?: string | null
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
      procore_tools: {
        Row: {
          action_buttons: string | null
          category: string
          created_at: string
          description: string | null
          id: number
          name: string
          new_link: string | null
          page_layout: string | null
          procore_link: string | null
          procore_screenshot: string | null
          procore_workflow: string | null
          prp_path: string | null
          slug: string
          status: string
          test_results: string | null
          tutorials: string | null
          updated_at: string
        }
        Insert: {
          action_buttons?: string | null
          category: string
          created_at?: string
          description?: string | null
          id?: never
          name: string
          new_link?: string | null
          page_layout?: string | null
          procore_link?: string | null
          procore_screenshot?: string | null
          procore_workflow?: string | null
          prp_path?: string | null
          slug: string
          status?: string
          test_results?: string | null
          tutorials?: string | null
          updated_at?: string
        }
        Update: {
          action_buttons?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: never
          name?: string
          new_link?: string | null
          page_layout?: string | null
          procore_link?: string | null
          procore_screenshot?: string | null
          procore_workflow?: string | null
          prp_path?: string | null
          slug?: string
          status?: string
          test_results?: string | null
          tutorials?: string | null
          updated_at?: string
        }
        Relationships: []
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
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_briefings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
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
      project_budget_codes: {
        Row: {
          cost_code_id: string
          cost_type_id: string
          created_at: string
          created_by: string | null
          description: string
          description_mode: string
          id: string
          is_active: boolean
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
          description: string
          description_mode?: string
          id?: string
          is_active?: boolean
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
          description?: string
          description_mode?: string
          id?: string
          is_active?: boolean
          project_id?: number
          sub_job_id?: string | null
          sub_job_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_budget_codes_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_budget_codes_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes_with_division_title"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_budget_codes_cost_type_id_fkey"
            columns: ["cost_type_id"]
            isOneToOne: false
            referencedRelation: "cost_code_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_budget_codes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_budget_codes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_budget_codes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_budget_codes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_budget_codes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_budget_codes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_budget_codes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_budget_codes_sub_job_id_fkey"
            columns: ["sub_job_id"]
            isOneToOne: false
            referencedRelation: "sub_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      project_companies: {
        Row: {
          business_phone: string | null
          company_id: string
          company_type: string | null
          created_at: string | null
          email_address: string | null
          erp_vendor_id: string | null
          id: string
          logo_url: string | null
          primary_contact_id: string | null
          project_id: number
          status: string | null
          updated_at: string | null
        }
        Insert: {
          business_phone?: string | null
          company_id: string
          company_type?: string | null
          created_at?: string | null
          email_address?: string | null
          erp_vendor_id?: string | null
          id?: string
          logo_url?: string | null
          primary_contact_id?: string | null
          project_id: number
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          business_phone?: string | null
          company_id?: string
          company_type?: string | null
          created_at?: string | null
          email_address?: string | null
          erp_vendor_id?: string | null
          id?: string
          logo_url?: string | null
          primary_contact_id?: string | null
          project_id?: number
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_companies_primary_contact_id_fkey"
            columns: ["primary_contact_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_companies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_companies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_companies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_companies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_companies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_companies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_companies_project_id_fkey"
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
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_cost_codes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
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
      project_directory_memberships: {
        Row: {
          created_at: string | null
          employee_id: string | null
          id: string
          invite_expires_at: string | null
          invite_status: string | null
          invite_token: string | null
          invited_at: string | null
          is_employee_of_company: boolean | null
          is_insurance_manager: boolean | null
          last_invited_at: string | null
          metadata: Json | null
          permission_template_id: string | null
          person_id: string
          project_id: number
          role: string | null
          status: string | null
          updated_at: string | null
          user_type: string
        }
        Insert: {
          created_at?: string | null
          employee_id?: string | null
          id?: string
          invite_expires_at?: string | null
          invite_status?: string | null
          invite_token?: string | null
          invited_at?: string | null
          is_employee_of_company?: boolean | null
          is_insurance_manager?: boolean | null
          last_invited_at?: string | null
          metadata?: Json | null
          permission_template_id?: string | null
          person_id: string
          project_id: number
          role?: string | null
          status?: string | null
          updated_at?: string | null
          user_type?: string
        }
        Update: {
          created_at?: string | null
          employee_id?: string | null
          id?: string
          invite_expires_at?: string | null
          invite_status?: string | null
          invite_token?: string | null
          invited_at?: string | null
          is_employee_of_company?: boolean | null
          is_insurance_manager?: boolean | null
          last_invited_at?: string | null
          metadata?: Json | null
          permission_template_id?: string | null
          person_id?: string
          project_id?: number
          role?: string | null
          status?: string | null
          updated_at?: string | null
          user_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_directory_memberships_permission_template_id_fkey"
            columns: ["permission_template_id"]
            isOneToOne: false
            referencedRelation: "permission_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_directory_memberships_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_directory_memberships_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_directory_memberships_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_directory_memberships_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_directory_memberships_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_directory_memberships_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_directory_memberships_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_directory_memberships_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      project_documents: {
        Row: {
          category: string | null
          content_type: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          file_name: string
          file_size: number | null
          file_url: string
          folder: string | null
          id: number
          is_private: boolean | null
          project_id: number
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          title: string
          updated_at: string | null
          uploaded_by: string | null
          version: number | null
        }
        Insert: {
          category?: string | null
          content_type?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          folder?: string | null
          id?: never
          is_private?: boolean | null
          project_id: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title: string
          updated_at?: string | null
          uploaded_by?: string | null
          version?: number | null
        }
        Update: {
          category?: string | null
          content_type?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          folder?: string | null
          id?: never
          is_private?: boolean | null
          project_id?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title?: string
          updated_at?: string | null
          uploaded_by?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      project_emails: {
        Row: {
          bcc_list: string[] | null
          body: string | null
          body_html: string | null
          cc_list: string[] | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          distribution_group: string | null
          from_email: string | null
          from_name: string | null
          has_attachments: boolean | null
          id: number
          is_private: boolean | null
          is_starred: boolean | null
          project_id: number
          received_at: string | null
          related_id: string | null
          related_tool: string | null
          sent_at: string | null
          status: string
          subject: string
          thread_id: string | null
          to_list: string[] | null
          updated_at: string | null
        }
        Insert: {
          bcc_list?: string[] | null
          body?: string | null
          body_html?: string | null
          cc_list?: string[] | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          distribution_group?: string | null
          from_email?: string | null
          from_name?: string | null
          has_attachments?: boolean | null
          id?: never
          is_private?: boolean | null
          is_starred?: boolean | null
          project_id: number
          received_at?: string | null
          related_id?: string | null
          related_tool?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          thread_id?: string | null
          to_list?: string[] | null
          updated_at?: string | null
        }
        Update: {
          bcc_list?: string[] | null
          body?: string | null
          body_html?: string | null
          cc_list?: string[] | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          distribution_group?: string | null
          from_email?: string | null
          from_name?: string | null
          has_attachments?: boolean | null
          id?: never
          is_private?: boolean | null
          is_starred?: boolean | null
          project_id?: number
          received_at?: string | null
          related_id?: string | null
          related_tool?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          thread_id?: string | null
          to_list?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_emails_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_emails_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_emails_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_emails_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_emails_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_emails_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_emails_project_id_fkey"
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
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_insights_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
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
      project_photos: {
        Row: {
          album: string | null
          content_type: string | null
          created_at: string | null
          created_by: string | null
          date_taken: string | null
          deleted_at: string | null
          description: string | null
          file_name: string
          file_size: number | null
          file_url: string
          height: number | null
          id: number
          is_private: boolean | null
          location: string | null
          project_id: number
          starred: boolean | null
          tags: string[] | null
          title: string
          trade: string | null
          updated_at: string | null
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          album?: string | null
          content_type?: string | null
          created_at?: string | null
          created_by?: string | null
          date_taken?: string | null
          deleted_at?: string | null
          description?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          height?: number | null
          id?: never
          is_private?: boolean | null
          location?: string | null
          project_id: number
          starred?: boolean | null
          tags?: string[] | null
          title?: string
          trade?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          album?: string | null
          content_type?: string | null
          created_at?: string | null
          created_by?: string | null
          date_taken?: string | null
          deleted_at?: string | null
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          height?: number | null
          id?: never
          is_private?: boolean | null
          location?: string | null
          project_id?: number
          starred?: boolean | null
          tags?: string[] | null
          title?: string
          trade?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_photos_project_id_fkey"
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
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_resources_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
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
      project_risk_snapshots: {
        Row: {
          aging_rfis: number | null
          created_at: string
          critical_risks: number | null
          id: string
          open_issues: number | null
          open_risks: number | null
          overdue_tasks: number | null
          project_id: number
          risk_narrative: string | null
          risk_score: number | null
          snapshot_date: string
          trend: string | null
          unresolved_insights: number | null
        }
        Insert: {
          aging_rfis?: number | null
          created_at?: string
          critical_risks?: number | null
          id?: string
          open_issues?: number | null
          open_risks?: number | null
          overdue_tasks?: number | null
          project_id: number
          risk_narrative?: string | null
          risk_score?: number | null
          snapshot_date?: string
          trend?: string | null
          unresolved_insights?: number | null
        }
        Update: {
          aging_rfis?: number | null
          created_at?: string
          critical_risks?: number | null
          id?: string
          open_issues?: number | null
          open_risks?: number | null
          overdue_tasks?: number | null
          project_id?: number
          risk_narrative?: string | null
          risk_score?: number | null
          snapshot_date?: string
          trend?: string | null
          unresolved_insights?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_risk_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_risk_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_risk_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_risk_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_risk_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_risk_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_risk_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      project_role_members: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          person_id: string
          project_role_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          person_id: string
          project_role_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          person_id?: string
          project_role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_role_members_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_role_members_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_role_members_project_role_id_fkey"
            columns: ["project_role_id"]
            isOneToOne: false
            referencedRelation: "project_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_roles: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          project_id: number
          role_name: string
          role_type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          project_id: number
          role_name: string
          role_type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          project_id?: number
          role_name?: string
          role_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_roles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_roles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_roles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_roles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_roles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_roles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_roles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      project_transmittals: {
        Row: {
          ball_in_court: string | null
          copies_sent: number | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          delivery_method: string | null
          due_date: string | null
          from_company: string | null
          from_contact: string | null
          id: number
          is_private: boolean | null
          number: string
          project_id: number
          received_date: string | null
          remarks: string | null
          sent_date: string | null
          status: string
          subject: string
          to_company: string | null
          to_contact: string | null
          updated_at: string | null
        }
        Insert: {
          ball_in_court?: string | null
          copies_sent?: number | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          delivery_method?: string | null
          due_date?: string | null
          from_company?: string | null
          from_contact?: string | null
          id?: never
          is_private?: boolean | null
          number: string
          project_id: number
          received_date?: string | null
          remarks?: string | null
          sent_date?: string | null
          status?: string
          subject: string
          to_company?: string | null
          to_contact?: string | null
          updated_at?: string | null
        }
        Update: {
          ball_in_court?: string | null
          copies_sent?: number | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          delivery_method?: string | null
          due_date?: string | null
          from_company?: string | null
          from_contact?: string | null
          id?: never
          is_private?: boolean | null
          number?: string
          project_id?: number
          received_date?: string | null
          remarks?: string | null
          sent_date?: string | null
          status?: string
          subject?: string
          to_company?: string | null
          to_contact?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_transmittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_transmittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_transmittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_transmittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_transmittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_transmittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_transmittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      project_vendors: {
        Row: {
          added_at: string
          added_by: string | null
          id: string
          notes: string | null
          project_id: number
          vendor_id: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          id?: string
          notes?: string | null
          project_id: number
          vendor_id: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          id?: string
          notes?: string | null
          project_id?: number
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_vendors_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_vendors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_vendors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_vendors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_vendors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_vendors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_vendors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_vendors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_vendors_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          access: string | null
          acumatica_project_id: string | null
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
          client_id: string | null
          company_id: string | null
          completion_percentage: number | null
          created_at: string
          current_phase: string | null
          delivery_method: string | null
          document_count: number
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
          acumatica_project_id?: string | null
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
          client_id?: string | null
          company_id?: string | null
          completion_percentage?: number | null
          created_at?: string
          current_phase?: string | null
          delivery_method?: string | null
          document_count?: number
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
          acumatica_project_id?: string | null
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
          client_id?: string | null
          company_id?: string | null
          completion_percentage?: number | null
          created_at?: string
          current_phase?: string | null
          delivery_method?: string | null
          document_count?: number
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
            foreignKeyName: "projects_client_company_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
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
          client_id: string | null
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
          client_id?: string | null
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
          client_id?: string | null
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
            foreignKeyName: "prospects_client_company_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
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
      punch_items: {
        Row: {
          assignee_company: string | null
          assignee_id: string | null
          ball_in_court: string | null
          closed_by_id: string | null
          created_at: string
          created_by: string | null
          date_closed: string | null
          date_notified: string | null
          date_resolved: string | null
          description: string | null
          due_date: string | null
          final_approver_id: string | null
          id: string
          is_deleted: boolean | null
          is_private: boolean | null
          location: string | null
          number: number
          priority: string | null
          project_id: number
          punch_item_manager_id: string | null
          reference: string | null
          status: string
          title: string
          trade: string | null
          type: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          assignee_company?: string | null
          assignee_id?: string | null
          ball_in_court?: string | null
          closed_by_id?: string | null
          created_at?: string
          created_by?: string | null
          date_closed?: string | null
          date_notified?: string | null
          date_resolved?: string | null
          description?: string | null
          due_date?: string | null
          final_approver_id?: string | null
          id?: string
          is_deleted?: boolean | null
          is_private?: boolean | null
          location?: string | null
          number: number
          priority?: string | null
          project_id: number
          punch_item_manager_id?: string | null
          reference?: string | null
          status?: string
          title: string
          trade?: string | null
          type?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          assignee_company?: string | null
          assignee_id?: string | null
          ball_in_court?: string | null
          closed_by_id?: string | null
          created_at?: string
          created_by?: string | null
          date_closed?: string | null
          date_notified?: string | null
          date_resolved?: string | null
          description?: string | null
          due_date?: string | null
          final_approver_id?: string | null
          id?: string
          is_deleted?: boolean | null
          is_private?: boolean | null
          location?: string | null
          number?: number
          priority?: string | null
          project_id?: number
          punch_item_manager_id?: string | null
          reference?: string | null
          status?: string
          title?: string
          trade?: string | null
          type?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "punch_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "punch_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "punch_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_sov_items: {
        Row: {
          acumatica_line_nbr: number | null
          amount: number
          billed_to_date: number
          budget_code: string | null
          change_event_line_item: string | null
          created_at: string | null
          description: string | null
          id: string
          line_number: number
          purchase_order_id: string
          quantity: number | null
          sort_order: number | null
          unit_cost: number | null
          uom: string | null
          updated_at: string | null
        }
        Insert: {
          acumatica_line_nbr?: number | null
          amount?: number
          billed_to_date?: number
          budget_code?: string | null
          change_event_line_item?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          line_number: number
          purchase_order_id: string
          quantity?: number | null
          sort_order?: number | null
          unit_cost?: number | null
          uom?: string | null
          updated_at?: string | null
        }
        Update: {
          acumatica_line_nbr?: number | null
          amount?: number
          billed_to_date?: number
          budget_code?: string | null
          change_event_line_item?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          line_number?: number
          purchase_order_id?: string
          quantity?: number | null
          sort_order?: number | null
          unit_cost?: number | null
          uom?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_sov_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_sov_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders_with_totals"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          accounting_method: string | null
          acumatica_external_key: string | null
          allow_non_admin_view_sov_items: boolean | null
          assigned_to: string | null
          bill_to: string | null
          contract_company_id: string | null
          contract_date: string | null
          contract_number: string
          created_at: string | null
          created_by: string | null
          default_retainage_percent: number | null
          deleted_at: string | null
          delivery_date: string | null
          description: string | null
          executed: boolean
          id: string
          invoice_contact_ids: string[] | null
          is_private: boolean | null
          issued_on_date: string | null
          non_admin_user_ids: string[] | null
          payment_terms: string | null
          project_id: number
          ship_to: string | null
          ship_via: string | null
          signed_po_received_date: string | null
          status: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          accounting_method?: string | null
          acumatica_external_key?: string | null
          allow_non_admin_view_sov_items?: boolean | null
          assigned_to?: string | null
          bill_to?: string | null
          contract_company_id?: string | null
          contract_date?: string | null
          contract_number: string
          created_at?: string | null
          created_by?: string | null
          default_retainage_percent?: number | null
          deleted_at?: string | null
          delivery_date?: string | null
          description?: string | null
          executed?: boolean
          id?: string
          invoice_contact_ids?: string[] | null
          is_private?: boolean | null
          issued_on_date?: string | null
          non_admin_user_ids?: string[] | null
          payment_terms?: string | null
          project_id: number
          ship_to?: string | null
          ship_via?: string | null
          signed_po_received_date?: string | null
          status?: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          accounting_method?: string | null
          acumatica_external_key?: string | null
          allow_non_admin_view_sov_items?: boolean | null
          assigned_to?: string | null
          bill_to?: string | null
          contract_company_id?: string | null
          contract_date?: string | null
          contract_number?: string
          created_at?: string | null
          created_by?: string | null
          default_retainage_percent?: number | null
          deleted_at?: string | null
          delivery_date?: string | null
          description?: string | null
          executed?: boolean
          id?: string
          invoice_contact_ids?: string[] | null
          is_private?: boolean | null
          issued_on_date?: string | null
          non_admin_user_ids?: string[] | null
          payment_terms?: string | null
          project_id?: number
          ship_to?: string | null
          ship_via?: string | null
          signed_po_received_date?: string | null
          status?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_contract_company_id_fkey"
            columns: ["contract_company_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_page_audit: {
        Row: {
          action_buttons: string | null
          assigned_to: string | null
          auto_status: string
          created_at: string | null
          documentation: string | null
          header_component: string | null
          id: string
          last_scanned_at: string | null
          layout_type: string | null
          manual_status: string | null
          notes: string | null
          page_name: string
          page_path: string
          page_type: string
          priority: number | null
          procore_screenshot: string | null
          stage: string | null
          tabs: string | null
          updated_at: string | null
        }
        Insert: {
          action_buttons?: string | null
          assigned_to?: string | null
          auto_status?: string
          created_at?: string | null
          documentation?: string | null
          header_component?: string | null
          id?: string
          last_scanned_at?: string | null
          layout_type?: string | null
          manual_status?: string | null
          notes?: string | null
          page_name: string
          page_path: string
          page_type?: string
          priority?: number | null
          procore_screenshot?: string | null
          stage?: string | null
          tabs?: string | null
          updated_at?: string | null
        }
        Update: {
          action_buttons?: string | null
          assigned_to?: string | null
          auto_status?: string
          created_at?: string | null
          documentation?: string | null
          header_component?: string | null
          id?: string
          last_scanned_at?: string | null
          layout_type?: string | null
          manual_status?: string | null
          notes?: string | null
          page_name?: string
          page_path?: string
          page_type?: string
          priority?: number | null
          procore_screenshot?: string | null
          stage?: string | null
          tabs?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qto_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
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
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qtos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
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
          drawing_number: string | null
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
          drawing_number?: string | null
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
          drawing_number?: string | null
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
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_deadlines: {
        Row: {
          created_at: string | null
          deadline_date: string
          deadline_type: string | null
          id: string
          task_id: string
        }
        Insert: {
          created_at?: string | null
          deadline_date: string
          deadline_type?: string | null
          id?: string
          task_id: string
        }
        Update: {
          created_at?: string | null
          deadline_date?: string
          deadline_type?: string | null
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_deadlines_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: true
            referencedRelation: "schedule_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_dependencies: {
        Row: {
          created_at: string | null
          dependency_type: string
          id: string
          lag_days: number | null
          predecessor_task_id: string
          task_id: string
        }
        Insert: {
          created_at?: string | null
          dependency_type?: string
          id?: string
          lag_days?: number | null
          predecessor_task_id: string
          task_id: string
        }
        Update: {
          created_at?: string | null
          dependency_type?: string
          id?: string
          lag_days?: number | null
          predecessor_task_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_dependencies_predecessor_task_id_fkey"
            columns: ["predecessor_task_id"]
            isOneToOne: false
            referencedRelation: "schedule_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_dependencies_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "schedule_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_of_values: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          commitment_id: string | null
          contract_id: string | null
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
          contract_id?: string | null
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
          contract_id?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_of_values_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "prime_contract_financial_summary"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "schedule_of_values_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "prime_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_tasks: {
        Row: {
          constraint_date: string | null
          constraint_type: string | null
          created_at: string | null
          duration_days: number | null
          finish_date: string | null
          id: string
          is_milestone: boolean | null
          name: string
          parent_task_id: string | null
          percent_complete: number | null
          project_id: number
          sort_order: number | null
          start_date: string | null
          status: string | null
          updated_at: string | null
          wbs_code: string | null
        }
        Insert: {
          constraint_date?: string | null
          constraint_type?: string | null
          created_at?: string | null
          duration_days?: number | null
          finish_date?: string | null
          id?: string
          is_milestone?: boolean | null
          name: string
          parent_task_id?: string | null
          percent_complete?: number | null
          project_id: number
          sort_order?: number | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
          wbs_code?: string | null
        }
        Update: {
          constraint_date?: string | null
          constraint_type?: string | null
          created_at?: string | null
          duration_days?: number | null
          finish_date?: string | null
          id?: string
          is_milestone?: boolean | null
          name?: string
          parent_task_id?: string | null
          percent_complete?: number | null
          project_id?: number
          sort_order?: number | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
          wbs_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "schedule_tasks"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
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
          category: string | null
          created_at: string
          source_id: string
          summary: string | null
          total_word_count: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          source_id: string
          summary?: string | null
          total_word_count?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
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
      specification_area_sections: {
        Row: {
          area_id: number
          created_at: string
          id: number
          section_id: number
        }
        Insert: {
          area_id: number
          created_at?: string
          id?: number
          section_id: number
        }
        Update: {
          area_id?: number
          created_at?: string
          id?: number
          section_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "specification_area_sections_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "specification_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specification_area_sections_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "specification_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      specification_areas: {
        Row: {
          created_at: string
          description: string | null
          id: number
          name: string
          project_id: number
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: number
          name: string
          project_id: number
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: number
          name?: string
          project_id?: number
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "specification_areas_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "specification_areas_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specification_areas_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specification_areas_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "specification_areas_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specification_areas_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specification_areas_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      specification_section_revisions: {
        Row: {
          content: string | null
          file_name: string
          file_size: number
          file_type: string | null
          file_url: string
          id: number
          notes: string | null
          revision_number: number
          section_id: number
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          content?: string | null
          file_name: string
          file_size: number
          file_type?: string | null
          file_url: string
          id?: number
          notes?: string | null
          revision_number: number
          section_id: number
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          content?: string | null
          file_name?: string
          file_size?: number
          file_type?: string | null
          file_url?: string
          id?: number
          notes?: string | null
          revision_number?: number
          section_id?: number
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "specification_section_revisions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "specification_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      specification_sections: {
        Row: {
          created_at: string
          created_by: string | null
          current_revision_id: number | null
          description: string | null
          id: number
          project_id: number
          section_number: string
          status: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_revision_id?: number | null
          description?: string | null
          id?: number
          project_id: number
          section_number: string
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_revision_id?: number | null
          description?: string | null
          id?: number
          project_id?: number
          section_number?: string
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_sections_current_revision"
            columns: ["current_revision_id"]
            isOneToOne: false
            referencedRelation: "specification_section_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specification_sections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "specification_sections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specification_sections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specification_sections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "specification_sections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specification_sections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specification_sections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      specification_subscribers: {
        Row: {
          id: number
          section_id: number
          subscribed_at: string
          user_id: string
        }
        Insert: {
          id?: number
          section_id: number
          subscribed_at?: string
          user_id: string
        }
        Update: {
          id?: number
          section_id?: number
          subscribed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "specification_subscribers_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "specification_sections"
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
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
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
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
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
      subcontract_attachments: {
        Row: {
          file_name: string
          file_size: number | null
          file_type: string | null
          id: string
          storage_path: string
          subcontract_id: string
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          file_name: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          storage_path: string
          subcontract_id: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          storage_path?: string
          subcontract_id?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcontract_attachments_subcontract_id_fkey"
            columns: ["subcontract_id"]
            isOneToOne: false
            referencedRelation: "subcontracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontract_attachments_subcontract_id_fkey"
            columns: ["subcontract_id"]
            isOneToOne: false
            referencedRelation: "subcontracts_with_totals"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontract_sov_items: {
        Row: {
          acumatica_line_nbr: number | null
          amount: number | null
          billed_to_date: number | null
          budget_code: string | null
          change_event_line_item: string | null
          created_at: string | null
          description: string | null
          id: string
          line_number: number | null
          sort_order: number | null
          subcontract_id: string
          updated_at: string | null
        }
        Insert: {
          acumatica_line_nbr?: number | null
          amount?: number | null
          billed_to_date?: number | null
          budget_code?: string | null
          change_event_line_item?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          line_number?: number | null
          sort_order?: number | null
          subcontract_id: string
          updated_at?: string | null
        }
        Update: {
          acumatica_line_nbr?: number | null
          amount?: number | null
          billed_to_date?: number | null
          budget_code?: string | null
          change_event_line_item?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          line_number?: number | null
          sort_order?: number | null
          subcontract_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcontract_sov_items_subcontract_id_fkey"
            columns: ["subcontract_id"]
            isOneToOne: false
            referencedRelation: "subcontracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontract_sov_items_subcontract_id_fkey"
            columns: ["subcontract_id"]
            isOneToOne: false
            referencedRelation: "subcontracts_with_totals"
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
      subcontracts: {
        Row: {
          actual_completion_date: string | null
          acumatica_external_key: string | null
          allow_non_admin_view_sov_items: boolean | null
          contract_company_id: string | null
          contract_date: string | null
          contract_number: string
          created_at: string | null
          created_by: string | null
          default_retainage_percent: number | null
          deleted_at: string | null
          description: string | null
          estimated_completion_date: string | null
          exclusions: string | null
          executed: boolean
          id: string
          inclusions: string | null
          invoice_contact_ids: string[] | null
          is_private: boolean | null
          issued_on_date: string | null
          non_admin_user_ids: string[] | null
          project: string | null
          project_id: number
          signed_contract_received_date: string | null
          start_date: string | null
          status: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          actual_completion_date?: string | null
          acumatica_external_key?: string | null
          allow_non_admin_view_sov_items?: boolean | null
          contract_company_id?: string | null
          contract_date?: string | null
          contract_number: string
          created_at?: string | null
          created_by?: string | null
          default_retainage_percent?: number | null
          deleted_at?: string | null
          description?: string | null
          estimated_completion_date?: string | null
          exclusions?: string | null
          executed?: boolean
          id?: string
          inclusions?: string | null
          invoice_contact_ids?: string[] | null
          is_private?: boolean | null
          issued_on_date?: string | null
          non_admin_user_ids?: string[] | null
          project?: string | null
          project_id: number
          signed_contract_received_date?: string | null
          start_date?: string | null
          status?: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_completion_date?: string | null
          acumatica_external_key?: string | null
          allow_non_admin_view_sov_items?: boolean | null
          contract_company_id?: string | null
          contract_date?: string | null
          contract_number?: string
          created_at?: string | null
          created_by?: string | null
          default_retainage_percent?: number | null
          deleted_at?: string | null
          description?: string | null
          estimated_completion_date?: string | null
          exclusions?: string | null
          executed?: boolean
          id?: string
          inclusions?: string | null
          invoice_contact_ids?: string[] | null
          is_private?: boolean | null
          issued_on_date?: string | null
          non_admin_user_ids?: string[] | null
          project?: string | null
          project_id?: number
          signed_contract_received_date?: string | null
          start_date?: string | null
          status?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcontracts_contract_company_id_fkey"
            columns: ["contract_company_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "subcontracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "subcontracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_analytics_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
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
            referencedRelation: "submittals"
            referencedColumns: ["id"]
          },
        ]
      }
      submittal_attachments: {
        Row: {
          content_type: string | null
          created_at: string | null
          distribution_id: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          is_current: boolean | null
          response_id: string | null
          submittal_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          content_type?: string | null
          created_at?: string | null
          distribution_id?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          is_current?: boolean | null
          response_id?: string | null
          submittal_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          content_type?: string | null
          created_at?: string | null
          distribution_id?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          is_current?: boolean | null
          response_id?: string | null
          submittal_id?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submittal_attachments_distribution_id_fkey"
            columns: ["distribution_id"]
            isOneToOne: false
            referencedRelation: "submittal_distributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_attachments_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "submittal_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_attachments_submittal_id_fkey"
            columns: ["submittal_id"]
            isOneToOne: false
            referencedRelation: "submittals"
            referencedColumns: ["id"]
          },
        ]
      }
      submittal_distribution_recipients: {
        Row: {
          distribution_id: string
          id: string
          recipient_id: string
        }
        Insert: {
          distribution_id: string
          id?: string
          recipient_id: string
        }
        Update: {
          distribution_id?: string
          id?: string
          recipient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submittal_distribution_recipients_distribution_id_fkey"
            columns: ["distribution_id"]
            isOneToOne: false
            referencedRelation: "submittal_distributions"
            referencedColumns: ["id"]
          },
        ]
      }
      submittal_distributions: {
        Row: {
          distributed_at: string | null
          from_id: string
          id: string
          message: string | null
          submittal_id: string
        }
        Insert: {
          distributed_at?: string | null
          from_id: string
          id?: string
          message?: string | null
          submittal_id: string
        }
        Update: {
          distributed_at?: string | null
          from_id?: string
          id?: string
          message?: string | null
          submittal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submittal_distributions_submittal_id_fkey"
            columns: ["submittal_id"]
            isOneToOne: false
            referencedRelation: "submittals"
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
            referencedRelation: "submittals"
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
            foreignKeyName: "submittal_history_submittal_id_fkey"
            columns: ["submittal_id"]
            isOneToOne: false
            referencedRelation: "submittals"
            referencedColumns: ["id"]
          },
        ]
      }
      submittal_linked_drawings: {
        Row: {
          drawing_id: string
          id: string
          submittal_id: string
        }
        Insert: {
          drawing_id: string
          id?: string
          submittal_id: string
        }
        Update: {
          drawing_id?: string
          id?: string
          submittal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submittal_linked_drawings_submittal_id_fkey"
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
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
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
            referencedRelation: "submittals"
            referencedColumns: ["id"]
          },
        ]
      }
      submittal_packages: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          project_id: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          project_id: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          project_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submittal_packages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "submittal_packages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_packages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_packages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "submittal_packages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_packages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_packages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
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
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_performance_metrics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
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
      submittal_responses: {
        Row: {
          comments: string | null
          created_at: string | null
          id: string
          responded_at: string | null
          responder_id: string
          response_status: string
          submittal_id: string
          updated_at: string | null
          workflow_step_id: string | null
        }
        Insert: {
          comments?: string | null
          created_at?: string | null
          id?: string
          responded_at?: string | null
          responder_id: string
          response_status?: string
          submittal_id: string
          updated_at?: string | null
          workflow_step_id?: string | null
        }
        Update: {
          comments?: string | null
          created_at?: string | null
          id?: string
          responded_at?: string | null
          responder_id?: string
          response_status?: string
          submittal_id?: string
          updated_at?: string | null
          workflow_step_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submittal_responses_submittal_id_fkey"
            columns: ["submittal_id"]
            isOneToOne: false
            referencedRelation: "submittals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_responses_workflow_step_id_fkey"
            columns: ["workflow_step_id"]
            isOneToOne: false
            referencedRelation: "submittal_workflow_steps"
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
      submittal_workflow_steps: {
        Row: {
          created_at: string | null
          id: string
          step_order: number
          step_type: string
          submittal_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          step_order: number
          step_type?: string
          submittal_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          step_order?: number
          step_type?: string
          submittal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submittal_workflow_steps_submittal_id_fkey"
            columns: ["submittal_id"]
            isOneToOne: false
            referencedRelation: "submittals"
            referencedColumns: ["id"]
          },
        ]
      }
      submittals: {
        Row: {
          ball_in_court: string | null
          cost_code_id: number | null
          created_at: string | null
          created_by: string | null
          current_version: number | null
          deleted_at: string | null
          description: string | null
          division: string | null
          final_due_date: string | null
          id: string
          is_private: boolean
          lead_time: number | null
          location_id: number | null
          metadata: Json | null
          priority: string | null
          project_id: number
          received_from_id: string | null
          required_approval_date: string | null
          required_on_site_date: string | null
          responsible_contractor_id: number | null
          revision: number
          sent_date: string | null
          specification_id: string | null
          specification_section: string | null
          status: string | null
          submission_date: string | null
          submittal_manager_id: string | null
          submittal_number: string
          submittal_package_id: string | null
          submittal_type: string | null
          submittal_type_id: string | null
          submitted_by: string
          submitter_company: string | null
          title: string
          total_versions: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          ball_in_court?: string | null
          cost_code_id?: number | null
          created_at?: string | null
          created_by?: string | null
          current_version?: number | null
          deleted_at?: string | null
          description?: string | null
          division?: string | null
          final_due_date?: string | null
          id?: string
          is_private?: boolean
          lead_time?: number | null
          location_id?: number | null
          metadata?: Json | null
          priority?: string | null
          project_id: number
          received_from_id?: string | null
          required_approval_date?: string | null
          required_on_site_date?: string | null
          responsible_contractor_id?: number | null
          revision?: number
          sent_date?: string | null
          specification_id?: string | null
          specification_section?: string | null
          status?: string | null
          submission_date?: string | null
          submittal_manager_id?: string | null
          submittal_number: string
          submittal_package_id?: string | null
          submittal_type?: string | null
          submittal_type_id?: string | null
          submitted_by: string
          submitter_company?: string | null
          title: string
          total_versions?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          ball_in_court?: string | null
          cost_code_id?: number | null
          created_at?: string | null
          created_by?: string | null
          current_version?: number | null
          deleted_at?: string | null
          description?: string | null
          division?: string | null
          final_due_date?: string | null
          id?: string
          is_private?: boolean
          lead_time?: number | null
          location_id?: number | null
          metadata?: Json | null
          priority?: string | null
          project_id?: number
          received_from_id?: string | null
          required_approval_date?: string | null
          required_on_site_date?: string | null
          responsible_contractor_id?: number | null
          revision?: number
          sent_date?: string | null
          specification_id?: string | null
          specification_section?: string | null
          status?: string | null
          submission_date?: string | null
          submittal_manager_id?: string | null
          submittal_number?: string
          submittal_package_id?: string | null
          submittal_type?: string | null
          submittal_type_id?: string | null
          submitted_by?: string
          submitter_company?: string | null
          title?: string
          total_versions?: number | null
          updated_at?: string | null
          updated_by?: string | null
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
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
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
            foreignKeyName: "submittals_submittal_package_id_fkey"
            columns: ["submittal_package_id"]
            isOneToOne: false
            referencedRelation: "submittal_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_submittal_type_id_fkey"
            columns: ["submittal_type_id"]
            isOneToOne: false
            referencedRelation: "submittal_types"
            referencedColumns: ["id"]
          },
        ]
      }
      support_article_chunks: {
        Row: {
          article_id: number
          chunk_index: number
          chunk_text: string
          created_at: string | null
          embedding: unknown
          heading: string | null
          id: number
          token_count: number | null
        }
        Insert: {
          article_id: number
          chunk_index: number
          chunk_text: string
          created_at?: string | null
          embedding?: unknown
          heading?: string | null
          id?: never
          token_count?: number | null
        }
        Update: {
          article_id?: number
          chunk_index?: number
          chunk_text?: string
          created_at?: string | null
          embedding?: unknown
          heading?: string | null
          id?: never
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "support_article_chunks_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "support_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_articles: {
        Row: {
          breadcrumb: string[] | null
          category: string | null
          content_hash: string
          created_at: string | null
          description: string | null
          fts: unknown
          id: number
          last_crawled_at: string | null
          markdown_content: string
          slug: string | null
          source_updated_at: string | null
          subcategory: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          url: string
          word_count: number | null
        }
        Insert: {
          breadcrumb?: string[] | null
          category?: string | null
          content_hash: string
          created_at?: string | null
          description?: string | null
          fts?: unknown
          id?: never
          last_crawled_at?: string | null
          markdown_content: string
          slug?: string | null
          source_updated_at?: string | null
          subcategory?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          url: string
          word_count?: number | null
        }
        Update: {
          breadcrumb?: string[] | null
          category?: string | null
          content_hash?: string
          created_at?: string | null
          description?: string | null
          fts?: unknown
          id?: never
          last_crawled_at?: string | null
          markdown_content?: string
          slug?: string | null
          source_updated_at?: string | null
          subcategory?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          url?: string
          word_count?: number | null
        }
        Relationships: []
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
      table_metadata: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          display_name: string
          icon_name: string
          id: string
          is_visible: boolean | null
          sort_order: number | null
          table_name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_name: string
          icon_name: string
          id?: string
          is_visible?: boolean | null
          sort_order?: number | null
          table_name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_name?: string
          icon_name?: string
          id?: string
          is_visible?: boolean | null
          sort_order?: number | null
          table_name?: string
          updated_at?: string
          updated_by?: string | null
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
          embedding: unknown
          file_name: string | null
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
          embedding?: unknown
          file_name?: string | null
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
          embedding?: unknown
          file_name?: string | null
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
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
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
      team_chat_messages: {
        Row: {
          channel_id: string
          content: string
          created_at: string
          id: string
          user_id: string | null
          user_name: string
        }
        Insert: {
          channel_id: string
          content: string
          created_at?: string
          id?: string
          user_id?: string | null
          user_name: string
        }
        Update: {
          channel_id?: string
          content?: string
          created_at?: string
          id?: string
          user_id?: string | null
          user_name?: string
        }
        Relationships: []
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
      transmittal_items: {
        Row: {
          created_at: string | null
          id: number
          item_title: string
          item_type: string
          quantity: number | null
          remarks: string | null
          revision: string | null
          transmittal_id: number
        }
        Insert: {
          created_at?: string | null
          id?: never
          item_title: string
          item_type?: string
          quantity?: number | null
          remarks?: string | null
          revision?: string | null
          transmittal_id: number
        }
        Update: {
          created_at?: string | null
          id?: never
          item_title?: string
          item_type?: string
          quantity?: number | null
          remarks?: string | null
          revision?: string | null
          transmittal_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "transmittal_items_transmittal_id_fkey"
            columns: ["transmittal_id"]
            isOneToOne: false
            referencedRelation: "project_transmittals"
            referencedColumns: ["id"]
          },
        ]
      }
      user_directory_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission_level: string
          person_id: string
          project_id: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission_level?: string
          person_id: string
          project_id: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          permission_level?: string
          person_id?: string
          project_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_directory_permissions_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_directory_permissions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "user_directory_permissions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_directory_permissions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_directory_permissions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "user_directory_permissions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_directory_permissions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_directory_permissions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      user_email_notifications: {
        Row: {
          created_at: string | null
          daily_log_default: boolean | null
          delay_log_default: boolean | null
          emails_default: boolean | null
          id: string
          person_id: string
          project_id: number
          punchlist_items_default: boolean | null
          rfis_default: boolean | null
          submittals_default: boolean | null
          updated_at: string | null
          weather_delay_email: boolean | null
          weather_delay_phone: boolean | null
        }
        Insert: {
          created_at?: string | null
          daily_log_default?: boolean | null
          delay_log_default?: boolean | null
          emails_default?: boolean | null
          id?: string
          person_id: string
          project_id: number
          punchlist_items_default?: boolean | null
          rfis_default?: boolean | null
          submittals_default?: boolean | null
          updated_at?: string | null
          weather_delay_email?: boolean | null
          weather_delay_phone?: boolean | null
        }
        Update: {
          created_at?: string | null
          daily_log_default?: boolean | null
          delay_log_default?: boolean | null
          emails_default?: boolean | null
          id?: string
          person_id?: string
          project_id?: number
          punchlist_items_default?: boolean | null
          rfis_default?: boolean | null
          submittals_default?: boolean | null
          updated_at?: string | null
          weather_delay_email?: boolean | null
          weather_delay_phone?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "user_email_notifications_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_email_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "user_email_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_email_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_email_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "user_email_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_email_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_email_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
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
      user_project_preferences: {
        Row: {
          created_at: string | null
          id: string
          preferences: Json
          project_id: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          preferences?: Json
          project_id: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          preferences?: Json
          project_id?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_project_preferences_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "user_project_preferences_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_project_preferences_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_project_preferences_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "user_project_preferences_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_project_preferences_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_project_preferences_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      user_project_roles: {
        Row: {
          assigned_at: string | null
          id: string
          membership_id: string
          role_name: string
        }
        Insert: {
          assigned_at?: string | null
          id?: string
          membership_id: string
          role_name: string
        }
        Update: {
          assigned_at?: string | null
          id?: string
          membership_id?: string
          role_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_project_roles_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "project_directory_memberships"
            referencedColumns: ["id"]
          },
        ]
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
      user_schedule_notifications: {
        Row: {
          all_project_tasks_weekly: boolean | null
          created_at: string | null
          id: string
          person_id: string
          project_id: number
          project_schedule_lookahead_weekly: boolean | null
          resource_tasks_assigned_to_id: string | null
          updated_at: string | null
          upon_schedule_change_requests: boolean | null
          upon_schedule_changes: boolean | null
        }
        Insert: {
          all_project_tasks_weekly?: boolean | null
          created_at?: string | null
          id?: string
          person_id: string
          project_id: number
          project_schedule_lookahead_weekly?: boolean | null
          resource_tasks_assigned_to_id?: string | null
          updated_at?: string | null
          upon_schedule_change_requests?: boolean | null
          upon_schedule_changes?: boolean | null
        }
        Update: {
          all_project_tasks_weekly?: boolean | null
          created_at?: string | null
          id?: string
          person_id?: string
          project_id?: number
          project_schedule_lookahead_weekly?: boolean | null
          resource_tasks_assigned_to_id?: string | null
          updated_at?: string | null
          upon_schedule_change_requests?: boolean | null
          upon_schedule_changes?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "user_schedule_notifications_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_schedule_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "user_schedule_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_schedule_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_schedule_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "user_schedule_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_schedule_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_schedule_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_schedule_notifications_resource_tasks_assigned_to_id_fkey"
            columns: ["resource_tasks_assigned_to_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      users_auth: {
        Row: {
          auth_user_id: string
          last_login_at: string | null
          person_id: string
        }
        Insert: {
          auth_user_id: string
          last_login_at?: string | null
          person_id: string
        }
        Update: {
          auth_user_id?: string
          last_login_at?: string | null
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_auth_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          acumatica_sync_at: string | null
          acumatica_vendor_id: string | null
          address: string | null
          ap_account: string | null
          cash_account: string | null
          city: string | null
          company_id: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          id: string
          is_1099_vendor: boolean | null
          is_active: boolean
          is_foreign_entity: boolean | null
          is_labor_union: boolean | null
          is_tax_agency: boolean | null
          legal_name: string | null
          name: string
          notes: string | null
          payment_method: string | null
          state: string | null
          tax_id: string | null
          terms: string | null
          updated_at: string
          vendor_class: string | null
          zip_code: string | null
        }
        Insert: {
          acumatica_sync_at?: string | null
          acumatica_vendor_id?: string | null
          address?: string | null
          ap_account?: string | null
          cash_account?: string | null
          city?: string | null
          company_id: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_1099_vendor?: boolean | null
          is_active?: boolean
          is_foreign_entity?: boolean | null
          is_labor_union?: boolean | null
          is_tax_agency?: boolean | null
          legal_name?: string | null
          name: string
          notes?: string | null
          payment_method?: string | null
          state?: string | null
          tax_id?: string | null
          terms?: string | null
          updated_at?: string
          vendor_class?: string | null
          zip_code?: string | null
        }
        Update: {
          acumatica_sync_at?: string | null
          acumatica_vendor_id?: string | null
          address?: string | null
          ap_account?: string | null
          cash_account?: string | null
          city?: string | null
          company_id?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_1099_vendor?: boolean | null
          is_active?: boolean
          is_foreign_entity?: boolean | null
          is_labor_union?: boolean | null
          is_tax_agency?: boolean | null
          legal_name?: string | null
          name?: string
          notes?: string | null
          payment_method?: string | null
          state?: string | null
          tax_id?: string | null
          terms?: string | null
          updated_at?: string
          vendor_class?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vertical_markup_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
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
      change_events_summary: {
        Row: {
          attachment_count: number | null
          created_at: string | null
          created_by: string | null
          expecting_revenue: boolean | null
          id: string | null
          line_item_count: number | null
          number: string | null
          origin: string | null
          project_id: number | null
          rfq_count: number | null
          status: string | null
          title: string | null
          total_cost_rom: number | null
          total_non_committed_cost: number | null
          total_revenue_rom: number | null
          total_rfq_amount: number | null
          type: string | null
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
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
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
      commitments_unified: {
        Row: {
          allow_non_admin_view_sov_items: boolean | null
          commitment_type: string | null
          contract_company_id: string | null
          contract_date: string | null
          contract_number: string | null
          created_at: string | null
          created_by: string | null
          default_retainage_percent: number | null
          deleted_at: string | null
          description: string | null
          executed: boolean | null
          id: string | null
          invoice_contact_ids: string[] | null
          is_private: boolean | null
          issued_on_date: string | null
          non_admin_user_ids: string[] | null
          project_id: number | null
          status: string | null
          title: string | null
          updated_at: string | null
        }
        Relationships: []
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
      direct_costs_with_project: {
        Row: {
          acumatica_doc_type: string | null
          acumatica_document_key: string | null
          acumatica_financial_period: string | null
          acumatica_ref_nbr: string | null
          acumatica_sync_at: string | null
          cost_type: string | null
          created_at: string | null
          created_by_user_id: string | null
          date: string | null
          description: string | null
          employee_id: string | null
          id: string | null
          invoice_number: string | null
          is_deleted: boolean | null
          paid_date: string | null
          project_id: number | null
          project_name: string | null
          received_date: string | null
          status: string | null
          terms: string | null
          total_amount: number | null
          updated_at: string | null
          updated_by_user_id: string | null
          vendor_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "direct_costs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_costs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_costs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_costs_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
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
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_metadata_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
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
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_metadata_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
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
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
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
      drawing_areas_with_counts: {
        Row: {
          depth: number | null
          description: string | null
          drawing_count: number | null
          id: string | null
          name: string | null
          parent_area_id: string | null
          path: string[] | null
          project_id: number | null
          sort_order: number | null
        }
        Relationships: []
      }
      drawing_log: {
        Row: {
          area_id: string | null
          area_name: string | null
          discipline: string | null
          drawing_created_at: string | null
          drawing_date: string | null
          drawing_number: string | null
          drawing_type: string | null
          drawing_updated_at: string | null
          file_name: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string | null
          project_id: number | null
          received_date: string | null
          revision_created_at: string | null
          revision_description: string | null
          revision_id: string | null
          revision_number: string | null
          set_name: string | null
          status: string | null
          title: string | null
          uploaded_by: string | null
          uploaded_by_email: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drawings_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "drawing_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "drawings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "drawings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_project_id_fkey"
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
      prime_contract_financial_summary: {
        Row: {
          approved_change_orders: number | null
          client_id: string | null
          contract_id: string | null
          contract_number: string | null
          draft_change_orders: number | null
          executed: boolean | null
          invoiced_amount: number | null
          original_contract_amount: number | null
          payments_received: number | null
          pending_change_orders: number | null
          pending_revised_contract_amount: number | null
          percent_paid: number | null
          private: boolean | null
          project_id: number | null
          remaining_balance: number | null
          revised_contract_amount: number | null
          status: Database["public"]["Enums"]["prime_contract_status_v2"] | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prime_contracts_client_company_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "prime_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "prime_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
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
          screenshot_count: number | null
        }
        Relationships: []
      }
      procore_rebuild_estimate: {
        Row: {
          category: string | null
          module_count: number | null
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
      project_document_counts_matview: {
        Row: {
          document_count: number | null
          project_id: number | null
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
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_metadata_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
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
      project_risk_current: {
        Row: {
          aging_rfis: number | null
          created_at: string | null
          critical_risks: number | null
          id: string | null
          open_issues: number | null
          open_risks: number | null
          overdue_tasks: number | null
          project_id: number | null
          project_name: string | null
          risk_narrative: string | null
          risk_score: number | null
          snapshot_date: string | null
          trend: string | null
          unresolved_insights: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_risk_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_risk_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_risk_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_risk_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_risk_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_risk_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_risk_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      project_risk_deteriorating: {
        Row: {
          deteriorating_days: number | null
          project_id: number | null
          project_name: string | null
          risk_narrative: string | null
          risk_score: number | null
          snapshot_date: string | null
          trend: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_risk_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_risk_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_risk_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_risk_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_risk_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_risk_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_risk_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      projects_with_counts: {
        Row: {
          access: string | null
          address: string | null
          aliases: string[] | null
          archived: boolean | null
          archived_at: string | null
          archived_by: string | null
          budget: number | null
          budget_locked: boolean | null
          budget_locked_at: string | null
          budget_locked_by: string | null
          budget_used: number | null
          category: string | null
          client: string | null
          client_id: string | null
          completion_percentage: number | null
          created_at: string | null
          current_phase: string | null
          delivery_method: string | null
          document_count: number | null
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
        Relationships: [
          {
            foreignKeyName: "projects_client_company_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders_with_totals: {
        Row: {
          accounting_method: string | null
          allow_non_admin_view_sov_items: boolean | null
          assigned_to: string | null
          bill_to: string | null
          company_name: string | null
          company_type: string | null
          contract_company_id: string | null
          contract_date: string | null
          contract_number: string | null
          created_at: string | null
          created_by: string | null
          default_retainage_percent: number | null
          delivery_date: string | null
          description: string | null
          executed: boolean | null
          id: string | null
          invoice_contact_ids: string[] | null
          is_private: boolean | null
          issued_on_date: string | null
          non_admin_user_ids: string[] | null
          payment_terms: string | null
          project_id: number | null
          ship_to: string | null
          ship_via: string | null
          signed_po_received_date: string | null
          sov_line_count: number | null
          status: string | null
          title: string | null
          total_amount_remaining: number | null
          total_billed_to_date: number | null
          total_sov_amount: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_contract_company_id_fkey"
            columns: ["contract_company_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
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
      subcontracts_with_totals: {
        Row: {
          actual_completion_date: string | null
          allow_non_admin_view_sov_items: boolean | null
          attachment_count: number | null
          company_name: string | null
          company_type: string | null
          contract_company_id: string | null
          contract_date: string | null
          contract_number: string | null
          created_at: string | null
          created_by: string | null
          default_retainage_percent: number | null
          description: string | null
          estimated_completion_date: string | null
          exclusions: string | null
          executed: boolean | null
          id: string | null
          inclusions: string | null
          invoice_contact_ids: string[] | null
          is_private: boolean | null
          issued_on_date: string | null
          non_admin_user_ids: string[] | null
          project_id: number | null
          signed_contract_received_date: string | null
          sov_line_count: number | null
          start_date: string | null
          status: string | null
          title: string | null
          total_amount_remaining: number | null
          total_billed_to_date: number | null
          total_sov_amount: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcontracts_contract_company_id_fkey"
            columns: ["contract_company_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_activity_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "subcontracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_health_dashboard_no_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_issue_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "subcontracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "submittal_project_dashboard"
            referencedColumns: ["id"]
          },
        ]
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
      v_estimate_division_totals: {
        Row: {
          division_code: string | null
          division_name: string | null
          division_total: number | null
          equipment_total: number | null
          estimate_id: number | null
          labor_total: number | null
          line_count: number | null
          material_total: number | null
          subcontract_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "estimate_line_items_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["estimate_id"]
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
      clone_budget_view: {
        Args: {
          new_description?: string
          new_name: string
          source_view_id: string
        }
        Returns: string
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
      create_budget_snapshot:
        | {
            Args: {
              p_description?: string
              p_is_baseline?: boolean
              p_project_id: number
              p_snapshot_name: string
              p_snapshot_type?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_description?: string
              p_name: string
              p_project_id: number
              p_set_as_baseline?: boolean
              p_type?: string
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
      create_specification_revision: {
        Args: {
          p_content?: string
          p_file_name: string
          p_file_size: number
          p_file_type: string
          p_file_url: string
          p_notes?: string
          p_section_id: number
          p_uploaded_by: string
        }
        Returns: {
          content: string | null
          file_name: string
          file_size: number
          file_type: string | null
          file_url: string
          id: number
          notes: string | null
          revision_number: number
          section_id: number
          uploaded_at: string
          uploaded_by: string
        }
        SetofOptions: {
          from: "*"
          to: "specification_section_revisions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      decay_memory_confidence: {
        Args: never
        Returns: {
          decayed_count: number
          expired_count: number
        }[]
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
      expire_ai_memories: { Args: never; Returns: number }
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
      find_duplicate_memory: {
        Args: {
          p_type: string
          p_user_id: string
          query_embedding: string
          similarity_threshold?: number
        }
        Returns: {
          confidence: number
          content: string
          id: string
          importance: number
          similarity: number
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
      fulltext_search_support_articles: {
        Args: { result_limit?: number; search_query: string }
        Returns: {
          breadcrumb: string[]
          category: string
          description: string
          id: number
          rank: number
          slug: string
          subcategory: string
          title: string
          url: string
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
      get_distribution_group_member_count: {
        Args: { p_group_id: string }
        Returns: number
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
      get_next_change_event_number:
        | {
            Args: { p_project_id: number }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.get_next_change_event_number(p_project_id => int8), public.get_next_change_event_number(p_project_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { p_project_id: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.get_next_change_event_number(p_project_id => int8), public.get_next_change_event_number(p_project_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
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
      get_project_company_user_count: {
        Args: { p_company_id: string; p_project_id: number }
        Returns: number
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
      get_project_team: {
        Args: { p_project_id: number }
        Returns: {
          company_name: string
          email: string
          first_name: string
          full_name: string
          id: string
          last_name: string
          person_id: string
          phone_mobile: string
          phone_office: string
          role: string
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
      match_document_metadata_by_summary: {
        Args: {
          match_count?: number
          match_threshold?: number
          p_project_id?: number
          query_embedding: unknown
        }
        Returns: {
          date: string
          id: string
          project_id: number
          similarity: number
          source: string
          summary: string
          title: string
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
      qa_effective_status: {
        Args: { page: Database["public"]["Tables"]["qa_page_audit"]["Row"] }
        Returns: string
      }
      refresh_budget_rollup:
        | {
            Args: { p_project_id?: number }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.refresh_budget_rollup(p_project_id => int8), public.refresh_budget_rollup(p_project_id => int4). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { p_project_id?: number }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.refresh_budget_rollup(p_project_id => int8), public.refresh_budget_rollup(p_project_id => int4). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      refresh_contract_financial_summary: { Args: never; Returns: undefined }
      refresh_search_vectors: { Args: never; Returns: undefined }
      search_ai_memories: {
        Args: {
          filter_project_id?: number
          filter_type?: string
          match_count?: number
          match_threshold?: number
          p_user_id: string
          query_embedding: string
        }
        Returns: {
          confidence: number
          content: string
          created_at: string
          id: string
          importance: number
          meeting_id: string
          project_id: number
          similarity: number
          source: string
          type: string
        }[]
      }
      search_all_knowledge: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: unknown
        }
        Returns: {
          created_at: string
          description: string
          details: Json
          id: string
          metadata_id: string
          owner_name: string
          project_id: number
          project_ids: number[]
          similarity: number
          source_table: string
          status: string
          type: string
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
      search_conversation_memories: {
        Args: {
          filter_user_id?: string
          match_count?: number
          query_embedding: unknown
        }
        Returns: {
          content: string
          id: number
          metadata: Json
          similarity: number
        }[]
      }
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
      search_document_chunks_by_category: {
        Args: {
          filter_category: string
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
          doc_participants: string
          doc_project_id: number
          doc_source: string
          doc_tags: string
          doc_title: string
          doc_type: string
          document_id: string
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
      search_knowledge_base: {
        Args: {
          filter_category?: string
          filter_project_id?: number
          match_count?: number
          match_threshold?: number
          query_embedding: unknown
        }
        Returns: {
          category: string
          content: string
          created_at: string
          id: string
          meeting_id: string
          origin: string
          project_id: number
          similarity: number
          source: string
          tags: string[]
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
      search_support_articles: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: unknown
        }
        Returns: {
          article_id: number
          breadcrumb: string[]
          category: string
          chunk_id: number
          chunk_text: string
          heading: string
          similarity: number
          slug: string
          subcategory: string
          title: string
          url: string
        }[]
      }
      search_team_memories: {
        Args: {
          filter_type?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          confidence: number
          content: string
          created_at: string
          id: string
          importance: number
          project_id: number
          similarity: number
          source: string
          type: string
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
      touch_ai_memories: { Args: { memory_ids: string[] }; Returns: undefined }
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
      invoice_status:
        | "draft"
        | "pending"
        | "approved"
        | "paid"
        | "void"
        | "under_review"
        | "revise_and_resubmit"
        | "not_invited"
        | "invited"
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
      payment_status: "received" | "void"
      prime_contract_co_status:
        | "draft"
        | "pending"
        | "approved"
        | "rejected"
        | "void"
      prime_contract_sov_status: "draft" | "approved" | "locked"
      prime_contract_status:
        | "draft"
        | "approved"
        | "complete"
        | "void"
        | "closed"
        | "not_ready"
      prime_contract_status_v2:
        | "draft"
        | "out_for_bid"
        | "out_for_signature"
        | "approved"
        | "complete"
        | "terminated"
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
      invoice_status: [
        "draft",
        "pending",
        "approved",
        "paid",
        "void",
        "under_review",
        "revise_and_resubmit",
        "not_invited",
        "invited",
      ],
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
      payment_status: ["received", "void"],
      prime_contract_co_status: [
        "draft",
        "pending",
        "approved",
        "rejected",
        "void",
      ],
      prime_contract_sov_status: ["draft", "approved", "locked"],
      prime_contract_status: [
        "draft",
        "approved",
        "complete",
        "void",
        "closed",
        "not_ready",
      ],
      prime_contract_status_v2: [
        "draft",
        "out_for_bid",
        "out_for_signature",
        "approved",
        "complete",
        "terminated",
      ],
      project_status: ["active", "inactive", "complete"],
      task_status: ["todo", "doing", "review", "done"],
    },
  },
} as const
