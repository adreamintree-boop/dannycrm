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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_requests: {
        Row: {
          buyer_id: string | null
          created_at: string
          credit_cost: number
          error_message: string | null
          id: string
          input_json: Json | null
          output_json: Json | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          buyer_id?: string | null
          created_at?: string
          credit_cost?: number
          error_message?: string | null
          id?: string
          input_json?: Json | null
          output_json?: Json | null
          status?: string
          type: string
          user_id: string
        }
        Update: {
          buyer_id?: string | null
          created_at?: string
          credit_cost?: number
          error_message?: string | null
          id?: string
          input_json?: Json | null
          output_json?: Json | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_requests_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "crm_buyers"
            referencedColumns: ["id"]
          },
        ]
      }
      bl_search_charged_rows: {
        Row: {
          charged_at: string
          id: string
          row_fingerprint: string
          session_id: string
          user_id: string
        }
        Insert: {
          charged_at?: string
          id?: string
          row_fingerprint: string
          session_id: string
          user_id: string
        }
        Update: {
          charged_at?: string
          id?: string
          row_fingerprint?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bl_search_charged_rows_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "bl_search_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      bl_search_history: {
        Row: {
          created_at: string
          date_from: string | null
          date_to: string | null
          filters_json: Json | null
          id: string
          keyword: string
          last_opened_at: string
          last_viewed_page: number | null
          query_hash: string
          result_total_count: number | null
          search_type: Database["public"]["Enums"]["bl_search_type"]
          user_id: string
          viewed_row_ids: Json | null
        }
        Insert: {
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          filters_json?: Json | null
          id?: string
          keyword?: string
          last_opened_at?: string
          last_viewed_page?: number | null
          query_hash: string
          result_total_count?: number | null
          search_type: Database["public"]["Enums"]["bl_search_type"]
          user_id: string
          viewed_row_ids?: Json | null
        }
        Update: {
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          filters_json?: Json | null
          id?: string
          keyword?: string
          last_opened_at?: string
          last_viewed_page?: number | null
          query_hash?: string
          result_total_count?: number | null
          search_type?: Database["public"]["Enums"]["bl_search_type"]
          user_id?: string
          viewed_row_ids?: Json | null
        }
        Relationships: []
      }
      bl_search_sessions: {
        Row: {
          created_at: string
          id: string
          search_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          search_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          search_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      company_products: {
        Row: {
          created_at: string
          id: string
          product_description: string | null
          product_name: string
          survey_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_description?: string | null
          product_name: string
          survey_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_description?: string | null
          product_name?: string
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_products_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "company_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      company_surveys: {
        Row: {
          catalog_file_url: string | null
          certifications: string[] | null
          company_description: string | null
          company_website: string | null
          core_strengths: string | null
          created_at: string
          employee_count: string | null
          existing_markets: string[] | null
          export_experience: string | null
          id: string
          intro_file_url: string | null
          target_regions: string[] | null
          updated_at: string
          user_id: string
          year_founded: number | null
        }
        Insert: {
          catalog_file_url?: string | null
          certifications?: string[] | null
          company_description?: string | null
          company_website?: string | null
          core_strengths?: string | null
          created_at?: string
          employee_count?: string | null
          existing_markets?: string[] | null
          export_experience?: string | null
          id?: string
          intro_file_url?: string | null
          target_regions?: string[] | null
          updated_at?: string
          user_id: string
          year_founded?: number | null
        }
        Update: {
          catalog_file_url?: string | null
          certifications?: string[] | null
          company_description?: string | null
          company_website?: string | null
          core_strengths?: string | null
          created_at?: string
          employee_count?: string | null
          existing_markets?: string[] | null
          export_experience?: string | null
          id?: string
          intro_file_url?: string | null
          target_regions?: string[] | null
          updated_at?: string
          user_id?: string
          year_founded?: number | null
        }
        Relationships: []
      }
      country_master: {
        Row: {
          created_at: string
          id: string
          iso2: string
          iso3: string | null
          name_en: string
          name_ko: string
          region: string | null
          search_text: string
          subregion: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          iso2: string
          iso3?: string | null
          name_en: string
          name_ko: string
          region?: string | null
          search_text: string
          subregion?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          iso2?: string
          iso3?: string | null
          name_en?: string
          name_ko?: string
          region?: string | null
          search_text?: string
          subregion?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      credit_ledger: {
        Row: {
          action_type: Database["public"]["Enums"]["credit_action_type"]
          amount: number
          created_at: string
          id: string
          meta: Json | null
          request_id: string | null
          user_id: string
        }
        Insert: {
          action_type: Database["public"]["Enums"]["credit_action_type"]
          amount: number
          created_at?: string
          id?: string
          meta?: Json | null
          request_id?: string | null
          user_id: string
        }
        Update: {
          action_type?: Database["public"]["Enums"]["credit_action_type"]
          amount?: number
          created_at?: string
          id?: string
          meta?: Json | null
          request_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      crm_buyers: {
        Row: {
          activity_count: number
          address: string | null
          bl_destination_country: string | null
          bl_hs_code: string | null
          bl_origin_country: string | null
          bl_product_desc: string | null
          bl_row_fingerprint: string | null
          company_email: string | null
          company_name: string
          company_phone: string | null
          country: string | null
          created_at: string
          facebook_url: string | null
          id: string
          linkedin_url: string | null
          project_id: string | null
          region: string | null
          source: string
          stage: string
          updated_at: string
          user_id: string
          website: string | null
          youtube_url: string | null
        }
        Insert: {
          activity_count?: number
          address?: string | null
          bl_destination_country?: string | null
          bl_hs_code?: string | null
          bl_origin_country?: string | null
          bl_product_desc?: string | null
          bl_row_fingerprint?: string | null
          company_email?: string | null
          company_name: string
          company_phone?: string | null
          country?: string | null
          created_at?: string
          facebook_url?: string | null
          id?: string
          linkedin_url?: string | null
          project_id?: string | null
          region?: string | null
          source?: string
          stage?: string
          updated_at?: string
          user_id: string
          website?: string | null
          youtube_url?: string | null
        }
        Update: {
          activity_count?: number
          address?: string | null
          bl_destination_country?: string | null
          bl_hs_code?: string | null
          bl_origin_country?: string | null
          bl_product_desc?: string | null
          bl_row_fingerprint?: string | null
          company_email?: string | null
          company_name?: string
          company_phone?: string | null
          country?: string | null
          created_at?: string
          facebook_url?: string | null
          id?: string
          linkedin_url?: string | null
          project_id?: string | null
          region?: string | null
          source?: string
          stage?: string
          updated_at?: string
          user_id?: string
          website?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_buyers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      email_accounts: {
        Row: {
          created_at: string
          email_address: string
          grant_id: string
          id: string
          provider: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_address: string
          grant_id: string
          id?: string
          provider?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_address?: string
          grant_id?: string
          id?: string
          provider?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_activity_log: {
        Row: {
          action: string
          created_at: string
          id: string
          message_id: string | null
          meta: Json | null
          thread_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          message_id?: string | null
          meta?: Json | null
          thread_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          message_id?: string | null
          meta?: Json | null
          thread_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_activity_log_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_activity_log_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "email_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      email_messages: {
        Row: {
          bcc_emails: Json | null
          body: string
          cc_emails: Json | null
          created_at: string
          direction: string
          from_email: string
          from_name: string | null
          id: string
          is_logged_to_crm: boolean
          is_read: boolean
          is_starred: boolean
          mailbox: string
          owner_user_id: string
          snippet: string | null
          subject: string
          thread_id: string | null
          to_emails: Json
        }
        Insert: {
          bcc_emails?: Json | null
          body?: string
          cc_emails?: Json | null
          created_at?: string
          direction?: string
          from_email: string
          from_name?: string | null
          id?: string
          is_logged_to_crm?: boolean
          is_read?: boolean
          is_starred?: boolean
          mailbox?: string
          owner_user_id: string
          snippet?: string | null
          subject: string
          thread_id?: string | null
          to_emails?: Json
        }
        Update: {
          bcc_emails?: Json | null
          body?: string
          cc_emails?: Json | null
          created_at?: string
          direction?: string
          from_email?: string
          from_name?: string | null
          id?: string
          is_logged_to_crm?: boolean
          is_read?: boolean
          is_starred?: boolean
          mailbox?: string
          owner_user_id?: string
          snippet?: string | null
          subject?: string
          thread_id?: string | null
          to_emails?: Json
        }
        Relationships: [
          {
            foreignKeyName: "email_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "email_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      email_script_runs: {
        Row: {
          body: string
          buyer_id: string | null
          created_at: string
          id: string
          internal_json: Json
          stage: string
          subject_lines: Json
          user_id: string
        }
        Insert: {
          body: string
          buyer_id?: string | null
          created_at?: string
          id?: string
          internal_json?: Json
          stage: string
          subject_lines?: Json
          user_id: string
        }
        Update: {
          body?: string
          buyer_id?: string | null
          created_at?: string
          id?: string
          internal_json?: Json
          stage?: string
          subject_lines?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_script_runs_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "crm_buyers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_threads: {
        Row: {
          created_at: string
          id: string
          owner_user_id: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_user_id: string
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_user_id?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      move_history: {
        Row: {
          author: string
          category: string
          created_at: string
          description: string
          id: string
          project_id: string | null
          user_id: string
        }
        Insert: {
          author: string
          category: string
          created_at?: string
          description: string
          id?: string
          project_id?: string | null
          user_id: string
        }
        Update: {
          author?: string
          category?: string
          created_at?: string
          description?: string
          id?: string
          project_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "move_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string
          department: string | null
          email: string | null
          email_domain: string | null
          email_local: string | null
          full_name: string | null
          id: string
          is_first_login: boolean
          phone_country_code: string | null
          phone_number: string | null
          role_position: string | null
          updated_at: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          email_domain?: string | null
          email_local?: string | null
          full_name?: string | null
          id: string
          is_first_login?: boolean
          phone_country_code?: string | null
          phone_number?: string | null
          role_position?: string | null
          updated_at?: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          email_domain?: string | null
          email_local?: string | null
          full_name?: string | null
          id?: string
          is_first_login?: boolean
          phone_country_code?: string | null
          phone_number?: string | null
          role_position?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          project_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          project_name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          project_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sales_activity_logs: {
        Row: {
          bcc_emails: Json | null
          body_html: string | null
          body_text: string | null
          buyer_id: string | null
          cc_emails: Json | null
          content: string | null
          created_at: string
          created_by: string
          direction: string
          email_message_id: string | null
          from_email: string | null
          id: string
          nylas_message_id: string | null
          nylas_thread_id: string | null
          occurred_at: string
          project_id: string | null
          snippet: string | null
          source: string
          title: string
          to_emails: Json | null
        }
        Insert: {
          bcc_emails?: Json | null
          body_html?: string | null
          body_text?: string | null
          buyer_id?: string | null
          cc_emails?: Json | null
          content?: string | null
          created_at?: string
          created_by: string
          direction: string
          email_message_id?: string | null
          from_email?: string | null
          id?: string
          nylas_message_id?: string | null
          nylas_thread_id?: string | null
          occurred_at?: string
          project_id?: string | null
          snippet?: string | null
          source?: string
          title: string
          to_emails?: Json | null
        }
        Update: {
          bcc_emails?: Json | null
          body_html?: string | null
          body_text?: string | null
          buyer_id?: string | null
          cc_emails?: Json | null
          content?: string | null
          created_at?: string
          created_by?: string
          direction?: string
          email_message_id?: string | null
          from_email?: string | null
          id?: string
          nylas_message_id?: string | null
          nylas_thread_id?: string | null
          occurred_at?: string
          project_id?: string | null
          snippet?: string | null
          source?: string
          title?: string
          to_emails?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_activity_logs_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "crm_buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_activity_logs_email_message_id_fkey"
            columns: ["email_message_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_activity_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_reports: {
        Row: {
          content: string
          created_at: string
          credit_cost: number
          id: string
          model: string | null
          product_name: string | null
          report_json: Json | null
          sections: Json | null
          status: string
          summary_markdown: string | null
          survey_id: string | null
          target_regions: string[] | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          credit_cost?: number
          id?: string
          model?: string | null
          product_name?: string | null
          report_json?: Json | null
          sections?: Json | null
          status?: string
          summary_markdown?: string | null
          survey_id?: string | null
          target_regions?: string[] | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          credit_cost?: number
          id?: string
          model?: string | null
          product_name?: string | null
          report_json?: Json | null
          sections?: Json | null
          status?: string
          summary_markdown?: string | null
          survey_id?: string | null
          target_regions?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategy_reports_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "company_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_files: {
        Row: {
          file_size: number
          file_type: string
          id: string
          mime_type: string
          original_file_name: string
          storage_path: string
          survey_id: string | null
          uploaded_at: string
          user_id: string
        }
        Insert: {
          file_size: number
          file_type: string
          id?: string
          mime_type: string
          original_file_name: string
          storage_path: string
          survey_id?: string | null
          uploaded_at?: string
          user_id: string
        }
        Update: {
          file_size?: number
          file_type?: string
          id?: string
          mime_type?: string
          original_file_name?: string
          storage_path?: string
          survey_id?: string | null
          uploaded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_files_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "company_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      user_credits: {
        Row: {
          balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      charge_bl_search_page: {
        Args: {
          p_meta?: Json
          p_page_number: number
          p_request_id: string
          p_row_fingerprints: string[]
          p_search_key: string
          p_user_id: string
        }
        Returns: {
          charged_count: number
          error_message: string
          new_balance: number
          success: boolean
        }[]
      }
      cleanup_old_bl_sessions: { Args: never; Returns: undefined }
      deduct_credits: {
        Args: {
          p_action_type: Database["public"]["Enums"]["credit_action_type"]
          p_amount: number
          p_meta?: Json
          p_request_id: string
          p_user_id: string
        }
        Returns: {
          error_message: string
          new_balance: number
          success: boolean
        }[]
      }
      get_credit_balance: { Args: { p_user_id: string }; Returns: number }
    }
    Enums: {
      bl_search_type: "bl" | "product" | "hs_code" | "importer" | "exporter"
      credit_action_type: "INIT_GRANT" | "BL_SEARCH" | "STRATEGY" | "AI_ENRICH"
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
      bl_search_type: ["bl", "product", "hs_code", "importer", "exporter"],
      credit_action_type: ["INIT_GRANT", "BL_SEARCH", "STRATEGY", "AI_ENRICH"],
    },
  },
} as const
