export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.4'
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      copy_events: {
        Row: {
          copier_ip: string | null
          created_at: string
          handle_id: string
          id: string
        }
        Insert: {
          copier_ip?: string | null
          created_at?: string
          handle_id: string
          id?: string
        }
        Update: {
          copier_ip?: string | null
          created_at?: string
          handle_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'copy_events_handle_id_fkey'
            columns: ['handle_id']
            isOneToOne: false
            referencedRelation: 'handles'
            referencedColumns: ['id']
          },
        ]
      }
      handles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          claude_md: string | null
          copies_this_month: number
          copies_this_week: number
          copies_total: number
          created_at: string
          cursor_rules: string | null
          display_name: string | null
          github_username: string | null
          handle: string
          id: string
          location: string | null
          percentile: number | null
          updated_at: string
          use_json: Json | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          claude_md?: string | null
          copies_this_month?: number
          copies_this_week?: number
          copies_total?: number
          created_at?: string
          cursor_rules?: string | null
          display_name?: string | null
          github_username?: string | null
          handle: string
          id?: string
          location?: string | null
          percentile?: number | null
          updated_at?: string
          use_json?: Json | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          claude_md?: string | null
          copies_this_month?: number
          copies_this_week?: number
          copies_total?: number
          created_at?: string
          cursor_rules?: string | null
          display_name?: string | null
          github_username?: string | null
          handle?: string
          id?: string
          location?: string | null
          percentile?: number | null
          updated_at?: string
          use_json?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      install_events: {
        Row: {
          created_at: string
          handle_id: string | null
          id: string
          tool_id: string
        }
        Insert: {
          created_at?: string
          handle_id?: string | null
          id?: string
          tool_id: string
        }
        Update: {
          created_at?: string
          handle_id?: string | null
          id?: string
          tool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'install_events_handle_id_fkey'
            columns: ['handle_id']
            isOneToOne: false
            referencedRelation: 'handles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'install_events_tool_id_fkey'
            columns: ['tool_id']
            isOneToOne: false
            referencedRelation: 'tools'
            referencedColumns: ['id']
          },
        ]
      }
      tools: {
        Row: {
          config: Json | null
          created_at: string
          description: string | null
          display_name: string
          id: string
          installs_this_week: number
          installs_total: number
          name: string
          score: number
          source: string
          type: string
          version: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          installs_this_week?: number
          installs_total?: number
          name: string
          score?: number
          source: string
          type: string
          version?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          installs_this_week?: number
          installs_total?: number
          name?: string
          score?: number
          source?: string
          type?: string
          version?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_copy_counters: {
        Args: { p_handle_id: string }
        Returns: undefined
      }
      increment_install_counters: {
        Args: { p_tool_id: string }
        Returns: undefined
      }
      recalculate_percentiles: { Args: never; Returns: undefined }
      reset_monthly_counters: { Args: never; Returns: undefined }
      reset_weekly_counters: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
