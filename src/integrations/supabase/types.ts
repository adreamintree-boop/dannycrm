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
      crm_buyers: {
        Row: {
          activity_count: number
          company_name: string
          country: string | null
          created_at: string
          id: string
          project_id: string | null
          region: string | null
          source: string
          stage: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_count?: number
          company_name: string
          country?: string | null
          created_at?: string
          id?: string
          project_id?: string | null
          region?: string | null
          source?: string
          stage?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_count?: number
          company_name?: string
          country?: string | null
          created_at?: string
          id?: string
          project_id?: string | null
          region?: string | null
          source?: string
          stage?: string
          updated_at?: string
          user_id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
