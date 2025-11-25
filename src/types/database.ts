// Supabaseデータベースの型定義
export type Database = {
  public: {
    Tables: {
      sessions: {
        Row: {
          id: string
          session_id: string
          line_user_id?: string
          parent_name?: string
          parent_phone?: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          session_id: string
          line_user_id?: string
          parent_name?: string
          parent_phone?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          line_user_id?: string
          parent_name?: string
          parent_phone?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      questionnaires: {
        Row: {
          id: string
          session_id: string
          child_name: string
          child_age: number
          child_gender: string
          parent_name: string
          parent_phone: string
          medical_history: string[]
          concerns: string[]
          ideal_goals: string[]
          notes?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          session_id: string
          child_name: string
          child_age: number
          child_gender: string
          parent_name: string
          parent_phone: string
          medical_history?: string[]
          concerns?: string[]
          ideal_goals?: string[]
          notes?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          child_name?: string
          child_age?: number
          child_gender?: string
          parent_name?: string
          parent_phone?: string
          medical_history?: string[]
          concerns?: string[]
          ideal_goals?: string[]
          notes?: string
          created_at?: string
          updated_at?: string
        }
      }
      diagnoses: {
        Row: {
          id: string
          session_id: string
          posture_analysis?: any
          oral_analysis?: any
          diagnosis_items?: any
          ai_analysis?: string
          staff_notes?: string
          photos?: any[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          session_id: string
          posture_analysis?: any
          oral_analysis?: any
          diagnosis_items?: any
          ai_analysis?: string
          staff_notes?: string
          photos?: any[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          posture_analysis?: any
          oral_analysis?: any
          diagnosis_items?: any
          ai_analysis?: string
          staff_notes?: string
          photos?: any[]
          created_at?: string
          updated_at?: string
        }
      }
      reports: {
        Row: {
          id: string
          session_id: string
          pdf_url?: string
          line_sent_at?: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          pdf_url?: string
          line_sent_at?: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          pdf_url?: string
          line_sent_at?: string
          status?: string
          created_at?: string
        }
      }
      // 新しい動的フォーム関連テーブル
      events: {
        Row: {
          id: string
          event_id: string
          name: string
          description?: string
          start_date?: string
          end_date?: string
          venue?: string
          status: string
          created_by?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          name: string
          description?: string
          start_date?: string
          end_date?: string
          venue?: string
          status?: string
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          name?: string
          description?: string
          start_date?: string
          end_date?: string
          venue?: string
          status?: string
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      form_schemas: {
        Row: {
          id: string
          schema_id: string
          event_id?: string
          form_type: string
          name: string
          description?: string
          version: string
          is_active: boolean
          config: any
          created_by?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          schema_id: string
          event_id?: string
          form_type: string
          name: string
          description?: string
          version?: string
          is_active?: boolean
          config: any
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          schema_id?: string
          event_id?: string
          form_type?: string
          name?: string
          description?: string
          version?: string
          is_active?: boolean
          config?: any
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      form_responses: {
        Row: {
          id: string
          response_id: string
          schema_id?: string
          session_id?: string
          user_id?: string
          event_id?: string
          response_data: any
          metadata?: any
          submitted_at: string
          created_at: string
        }
        Insert: {
          id?: string
          response_id: string
          schema_id?: string
          session_id?: string
          user_id?: string
          event_id?: string
          response_data: any
          metadata?: any
          submitted_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          response_id?: string
          schema_id?: string
          session_id?: string
          user_id?: string
          event_id?: string
          response_data?: any
          metadata?: any
          submitted_at?: string
          created_at?: string
        }
      }
      form_fields: {
        Row: {
          id: string
          schema_id: string
          field_id: string
          field_name: string
          field_type: string
          field_config?: any
          display_order?: number
          is_required: boolean
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          schema_id: string
          field_id: string
          field_name: string
          field_type: string
          field_config?: any
          display_order?: number
          is_required?: boolean
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          schema_id?: string
          field_id?: string
          field_name?: string
          field_type?: string
          field_config?: any
          display_order?: number
          is_required?: boolean
          is_active?: boolean
          created_at?: string
        }
      }
      form_schema_versions: {
        Row: {
          id: string
          schema_id: string
          version: string
          config: any
          change_log?: string
          created_by?: string
          created_at: string
        }
        Insert: {
          id?: string
          schema_id: string
          version: string
          config: any
          change_log?: string
          created_by?: string
          created_at?: string
        }
        Update: {
          id?: string
          schema_id?: string
          version?: string
          config?: any
          change_log?: string
          created_by?: string
          created_at?: string
        }
      }
      form_cache: {
        Row: {
          id: string
          cache_key: string
          cache_data?: any
          expires_at?: string
          created_at: string
        }
        Insert: {
          id?: string
          cache_key: string
          cache_data?: any
          expires_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          cache_key?: string
          cache_data?: any
          expires_at?: string
          created_at?: string
        }
      }
    }
    Views: {
      user_responses_view: {
        Row: {
          id: string
          response_id: string
          session_id: string
          submitted_at: string
          parent_name: string | null
          parent_phone: string | null
          event_name: string | null
          form_name: string | null
          form_type: string | null
          response_data: any
          metadata: any | null
        }
      }
      diagnosis_analytics_view: {
        Row: {
          session_id: string | null
          parent_name: string | null
          parent_phone: string | null
          event_name: string | null
          submitted_at: string | null
          posture_score: number | null
          oral_score: number | null
          overall_score: number | null
          notes: string | null
          ai_analysis: string | null
        }
      }
      form_analytics_view: {
        Row: {
          form_type: string | null
          form_name: string | null
          event_name: string | null
          total_responses: number | null
          avg_completion_time: number | null
          unique_users: number | null
          response_date: string | null
        }
      }
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