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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          memoria_completa: boolean | null
          riassunto_contesto: string | null
          system_prompt_id: string | null
          titolo: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          memoria_completa?: boolean | null
          riassunto_contesto?: string | null
          system_prompt_id?: string | null
          titolo?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          memoria_completa?: boolean | null
          riassunto_contesto?: string | null
          system_prompt_id?: string | null
          titolo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_system_prompt_id_fkey"
            columns: ["system_prompt_id"]
            isOneToOne: false
            referencedRelation: "chat_system_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          model: string | null
          role: string
          tempo_risposta_ms: number | null
          token_input: number | null
          token_output: number | null
          tokens_used: number | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          model?: string | null
          role: string
          tempo_risposta_ms?: number | null
          token_input?: number | null
          token_output?: number | null
          tokens_used?: number | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          model?: string | null
          role?: string
          tempo_risposta_ms?: number | null
          token_input?: number | null
          token_output?: number | null
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_system_prompts: {
        Row: {
          attivo: boolean
          contenuto: string
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          attivo?: boolean
          contenuto: string
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          attivo?: boolean
          contenuto?: string
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_usage_stats: {
        Row: {
          conversation_id: string
          created_at: string
          data_utilizzo: string
          id: string
          numero_messaggi: number
          tempo_totale_ms: number
          token_totali_input: number
          token_totali_output: number
        }
        Insert: {
          conversation_id: string
          created_at?: string
          data_utilizzo?: string
          id?: string
          numero_messaggi?: number
          tempo_totale_ms?: number
          token_totali_input?: number
          token_totali_output?: number
        }
        Update: {
          conversation_id?: string
          created_at?: string
          data_utilizzo?: string
          id?: string
          numero_messaggi?: number
          tempo_totale_ms?: number
          token_totali_input?: number
          token_totali_output?: number
        }
        Relationships: [
          {
            foreignKeyName: "chat_usage_stats_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      config_ai: {
        Row: {
          api_key: string
          attivo: boolean
          created_at: string
          id: string
          modello: string
          provider: string
          updated_at: string
        }
        Insert: {
          api_key: string
          attivo?: boolean
          created_at?: string
          id?: string
          modello: string
          provider: string
          updated_at?: string
        }
        Update: {
          api_key?: string
          attivo?: boolean
          created_at?: string
          id?: string
          modello?: string
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      config_generale: {
        Row: {
          created_at: string
          formato_data: string
          id: string
          lingua_predefinita: string
          max_email_giorno: number
          max_token_conversazione: number | null
          memoria_messaggi: number | null
          memoria_ore: number | null
          mostra_statistiche: boolean | null
          timezone_fuso: string
          updated_at: string
          usa_riassunto: boolean | null
        }
        Insert: {
          created_at?: string
          formato_data?: string
          id?: string
          lingua_predefinita?: string
          max_email_giorno?: number
          max_token_conversazione?: number | null
          memoria_messaggi?: number | null
          memoria_ore?: number | null
          mostra_statistiche?: boolean | null
          timezone_fuso?: string
          updated_at?: string
          usa_riassunto?: boolean | null
        }
        Update: {
          created_at?: string
          formato_data?: string
          id?: string
          lingua_predefinita?: string
          max_email_giorno?: number
          max_token_conversazione?: number | null
          memoria_messaggi?: number | null
          memoria_ore?: number | null
          mostra_statistiche?: boolean | null
          timezone_fuso?: string
          updated_at?: string
          usa_riassunto?: boolean | null
        }
        Relationships: []
      }
      email_provider: {
        Row: {
          attivo: boolean
          created_at: string
          dominio_invio: string | null
          id: string
          inbound_route: string | null
          outbound_endpoint: string | null
          provider: string
          updated_at: string
        }
        Insert: {
          attivo?: boolean
          created_at?: string
          dominio_invio?: string | null
          id?: string
          inbound_route?: string | null
          outbound_endpoint?: string | null
          provider: string
          updated_at?: string
        }
        Update: {
          attivo?: boolean
          created_at?: string
          dominio_invio?: string | null
          id?: string
          inbound_route?: string | null
          outbound_endpoint?: string | null
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_provider_credenziali: {
        Row: {
          api_key: string
          created_at: string
          id: string
          provider_id: string
          updated_at: string
          webhook_secret: string | null
        }
        Insert: {
          api_key: string
          created_at?: string
          id?: string
          provider_id: string
          updated_at?: string
          webhook_secret?: string | null
        }
        Update: {
          api_key?: string
          created_at?: string
          id?: string
          provider_id?: string
          updated_at?: string
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_provider_credenziali_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "email_provider"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          attivo: boolean
          contenuto: string
          created_at: string
          id: string
          nome: string
          oggetto: string
          placeholder_disponibili: Json | null
          updated_at: string
        }
        Insert: {
          attivo?: boolean
          contenuto: string
          created_at?: string
          id?: string
          nome: string
          oggetto: string
          placeholder_disponibili?: Json | null
          updated_at?: string
        }
        Update: {
          attivo?: boolean
          contenuto?: string
          created_at?: string
          id?: string
          nome?: string
          oggetto?: string
          placeholder_disponibili?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      import_logs: {
        Row: {
          completed_at: string | null
          contatti_selezionati: number | null
          created_at: string
          errori: Json | null
          file_name: string
          file_path: string
          id: string
          nome_tabella_temporanea: string | null
          righe_errori: number | null
          righe_importate: number | null
          righe_totali: number | null
          stato: string
          trasferiti_rubrica: boolean | null
          utente_id: string | null
        }
        Insert: {
          completed_at?: string | null
          contatti_selezionati?: number | null
          created_at?: string
          errori?: Json | null
          file_name: string
          file_path: string
          id?: string
          nome_tabella_temporanea?: string | null
          righe_errori?: number | null
          righe_importate?: number | null
          righe_totali?: number | null
          stato?: string
          trasferiti_rubrica?: boolean | null
          utente_id?: string | null
        }
        Update: {
          completed_at?: string | null
          contatti_selezionati?: number | null
          created_at?: string
          errori?: Json | null
          file_name?: string
          file_path?: string
          id?: string
          nome_tabella_temporanea?: string | null
          righe_errori?: number | null
          righe_importate?: number | null
          righe_totali?: number | null
          stato?: string
          trasferiti_rubrica?: boolean | null
          utente_id?: string | null
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
