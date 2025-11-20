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
      ai_categorization_progress: {
        Row: {
          batch_id: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          last_processed_index: number | null
          processed_count: number
          started_at: string
          status: string
          total_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          batch_id: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          last_processed_index?: number | null
          processed_count?: number
          started_at?: string
          status?: string
          total_count: number
          updated_at?: string
          user_id: string
        }
        Update: {
          batch_id?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          last_processed_index?: number | null
          processed_count?: number
          started_at?: string
          status?: string
          total_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_categorization_suggestions: {
        Row: {
          accepted_at: string | null
          batch_id: string
          confidence: number | null
          cost_eur: number | null
          created_at: string | null
          id: string
          is_new_group: boolean | null
          model_used: string
          reasoning: string | null
          rejected_at: string | null
          sender_email: string
          status: string | null
          suggested_group_color: string | null
          suggested_group_icon: string | null
          suggested_group_id: string | null
          suggested_group_name: string
          suggested_group_type: string
          tokens_input: number | null
          tokens_output: number | null
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          batch_id: string
          confidence?: number | null
          cost_eur?: number | null
          created_at?: string | null
          id?: string
          is_new_group?: boolean | null
          model_used: string
          reasoning?: string | null
          rejected_at?: string | null
          sender_email: string
          status?: string | null
          suggested_group_color?: string | null
          suggested_group_icon?: string | null
          suggested_group_id?: string | null
          suggested_group_name: string
          suggested_group_type: string
          tokens_input?: number | null
          tokens_output?: number | null
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          batch_id?: string
          confidence?: number | null
          cost_eur?: number | null
          created_at?: string | null
          id?: string
          is_new_group?: boolean | null
          model_used?: string
          reasoning?: string | null
          rejected_at?: string | null
          sender_email?: string
          status?: string | null
          suggested_group_color?: string | null
          suggested_group_icon?: string | null
          suggested_group_id?: string | null
          suggested_group_name?: string
          suggested_group_type?: string
          tokens_input?: number | null
          tokens_output?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_categorization_suggestions_suggested_group_id_fkey"
            columns: ["suggested_group_id"]
            isOneToOne: false
            referencedRelation: "email_sender_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_collaboration_tasks: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          file: string | null
          files_modified: string[] | null
          id: string
          implementation_notes: string | null
          priority: string
          problem: string
          proposed_at: string | null
          proposed_by: string
          solution: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          file?: string | null
          files_modified?: string[] | null
          id?: string
          implementation_notes?: string | null
          priority: string
          problem: string
          proposed_at?: string | null
          proposed_by: string
          solution?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          file?: string | null
          files_modified?: string[] | null
          id?: string
          implementation_notes?: string | null
          priority?: string
          problem?: string
          proposed_at?: string | null
          proposed_by?: string
          solution?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_communication_preferences: {
        Row: {
          ai_model: string | null
          audio_quality_settings: Json | null
          created_at: string
          default_mic_recorder: string | null
          default_tts_voice_id: string | null
          id: string
          page_route: string | null
          selected_ai_agent: string | null
          updated_at: string
          user_id: string
          voice_agent_id: string | null
        }
        Insert: {
          ai_model?: string | null
          audio_quality_settings?: Json | null
          created_at?: string
          default_mic_recorder?: string | null
          default_tts_voice_id?: string | null
          id?: string
          page_route?: string | null
          selected_ai_agent?: string | null
          updated_at?: string
          user_id: string
          voice_agent_id?: string | null
        }
        Update: {
          ai_model?: string | null
          audio_quality_settings?: Json | null
          created_at?: string
          default_mic_recorder?: string | null
          default_tts_voice_id?: string | null
          id?: string
          page_route?: string | null
          selected_ai_agent?: string | null
          updated_at?: string
          user_id?: string
          voice_agent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_communication_preferences_voice_agent_id_fkey"
            columns: ["voice_agent_id"]
            isOneToOne: false
            referencedRelation: "elevenlabs_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_cost_tracking: {
        Row: {
          batch_id: string | null
          conversation_id: string | null
          cost_input_eur: number | null
          cost_output_eur: number | null
          cost_total_eur: number | null
          created_at: string | null
          id: string
          input_tokens: number
          lab_conversation_id: string | null
          model: string
          operation_metadata: Json | null
          operation_type: string | null
          output_tokens: number
          provider: string
          room_id: string | null
          user_id: string | null
        }
        Insert: {
          batch_id?: string | null
          conversation_id?: string | null
          cost_input_eur?: number | null
          cost_output_eur?: number | null
          cost_total_eur?: number | null
          created_at?: string | null
          id?: string
          input_tokens?: number
          lab_conversation_id?: string | null
          model: string
          operation_metadata?: Json | null
          operation_type?: string | null
          output_tokens?: number
          provider: string
          room_id?: string | null
          user_id?: string | null
        }
        Update: {
          batch_id?: string | null
          conversation_id?: string | null
          cost_input_eur?: number | null
          cost_output_eur?: number | null
          cost_total_eur?: number | null
          created_at?: string | null
          id?: string
          input_tokens?: number
          lab_conversation_id?: string | null
          model?: string
          operation_metadata?: Json | null
          operation_type?: string | null
          output_tokens?: number
          provider?: string
          room_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_pricing_config: {
        Row: {
          cost_input_eur: number
          cost_output_eur: number
          created_at: string | null
          id: string
          is_free: boolean
          last_sync_at: string | null
          model: string
          provider: string
          updated_at: string | null
          usd_eur_rate: number
        }
        Insert: {
          cost_input_eur?: number
          cost_output_eur?: number
          created_at?: string | null
          id?: string
          is_free?: boolean
          last_sync_at?: string | null
          model: string
          provider: string
          updated_at?: string | null
          usd_eur_rate?: number
        }
        Update: {
          cost_input_eur?: number
          cost_output_eur?: number
          created_at?: string | null
          id?: string
          is_free?: boolean
          last_sync_at?: string | null
          model?: string
          provider?: string
          updated_at?: string | null
          usd_eur_rate?: number
        }
        Relationships: []
      }
      ai_prompt_library: {
        Row: {
          ai_config_id: string | null
          category: string | null
          created_at: string | null
          created_by: string | null
          default_actions: Json | null
          id: string
          is_public: boolean | null
          last_used_at: string | null
          prompt_description: string | null
          prompt_name: string
          requires_company_data: boolean | null
          requires_contact_aliases: boolean | null
          requires_email_templates: boolean | null
          suggested_max_tokens: number | null
          suggested_temperature: number | null
          system_prompt: string
          tags: string[] | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          ai_config_id?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          default_actions?: Json | null
          id?: string
          is_public?: boolean | null
          last_used_at?: string | null
          prompt_description?: string | null
          prompt_name: string
          requires_company_data?: boolean | null
          requires_contact_aliases?: boolean | null
          requires_email_templates?: boolean | null
          suggested_max_tokens?: number | null
          suggested_temperature?: number | null
          system_prompt: string
          tags?: string[] | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          ai_config_id?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          default_actions?: Json | null
          id?: string
          is_public?: boolean | null
          last_used_at?: string | null
          prompt_description?: string | null
          prompt_name?: string
          requires_company_data?: boolean | null
          requires_contact_aliases?: boolean | null
          requires_email_templates?: boolean | null
          suggested_max_tokens?: number | null
          suggested_temperature?: number | null
          system_prompt?: string
          tags?: string[] | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_prompt_library_ai_config_id_fkey"
            columns: ["ai_config_id"]
            isOneToOne: false
            referencedRelation: "config_ai"
            referencedColumns: ["id"]
          },
        ]
      }
      attivita: {
        Row: {
          ai_confidence: number | null
          ai_reasoning: string | null
          assegnato_a: string | null
          campagna_id: string | null
          created_at: string
          created_by_ai: boolean | null
          creato_da: string | null
          data_creazione: string
          data_ultima_modifica: string | null
          descrizione: string
          id: string
          modifiche_log: Json | null
          note: string | null
          ora_creazione: string | null
          priorita: string
          rubrica_id: string | null
          scadenza: string | null
          selezionata: boolean | null
          stato: string
          tipo: string
          updated_at: string
        }
        Insert: {
          ai_confidence?: number | null
          ai_reasoning?: string | null
          assegnato_a?: string | null
          campagna_id?: string | null
          created_at?: string
          created_by_ai?: boolean | null
          creato_da?: string | null
          data_creazione?: string
          data_ultima_modifica?: string | null
          descrizione: string
          id?: string
          modifiche_log?: Json | null
          note?: string | null
          ora_creazione?: string | null
          priorita?: string
          rubrica_id?: string | null
          scadenza?: string | null
          selezionata?: boolean | null
          stato?: string
          tipo: string
          updated_at?: string
        }
        Update: {
          ai_confidence?: number | null
          ai_reasoning?: string | null
          assegnato_a?: string | null
          campagna_id?: string | null
          created_at?: string
          created_by_ai?: boolean | null
          creato_da?: string | null
          data_creazione?: string
          data_ultima_modifica?: string | null
          descrizione?: string
          id?: string
          modifiche_log?: Json | null
          note?: string | null
          ora_creazione?: string | null
          priorita?: string
          rubrica_id?: string | null
          scadenza?: string | null
          selezionata?: boolean | null
          stato?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attivita_campagna_id_fkey"
            columns: ["campagna_id"]
            isOneToOne: false
            referencedRelation: "campagne"
            referencedColumns: ["id"]
          },
        ]
      }
      attivita_archiviate: {
        Row: {
          archiviato_da: string | null
          assegnato_a: string | null
          attivita_id_originale: string
          created_at: string
          creato_da: string | null
          data_archiviazione: string
          data_creazione: string
          data_ultima_modifica: string | null
          descrizione: string
          id: string
          modifiche_log: Json | null
          motivo_archiviazione: string | null
          note: string | null
          ora_creazione: string | null
          priorita: string
          rubrica_id: string | null
          scadenza: string | null
          stato: string
          tipo: string
          updated_at: string
        }
        Insert: {
          archiviato_da?: string | null
          assegnato_a?: string | null
          attivita_id_originale: string
          created_at?: string
          creato_da?: string | null
          data_archiviazione?: string
          data_creazione?: string
          data_ultima_modifica?: string | null
          descrizione: string
          id?: string
          modifiche_log?: Json | null
          motivo_archiviazione?: string | null
          note?: string | null
          ora_creazione?: string | null
          priorita?: string
          rubrica_id?: string | null
          scadenza?: string | null
          stato?: string
          tipo: string
          updated_at?: string
        }
        Update: {
          archiviato_da?: string | null
          assegnato_a?: string | null
          attivita_id_originale?: string
          created_at?: string
          creato_da?: string | null
          data_archiviazione?: string
          data_creazione?: string
          data_ultima_modifica?: string | null
          descrizione?: string
          id?: string
          modifiche_log?: Json | null
          motivo_archiviazione?: string | null
          note?: string | null
          ora_creazione?: string | null
          priorita?: string
          rubrica_id?: string | null
          scadenza?: string | null
          stato?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      brain_ai_tasks: {
        Row: {
          agent_order: number
          assigned_agent: string
          completed_at: string | null
          conversation_id: string
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          input_data: Json
          output_data: Json | null
          previous_responses: Json | null
          round_number: number | null
          started_at: string | null
          status: string | null
          task_type: string
          user_id: string | null
        }
        Insert: {
          agent_order: number
          assigned_agent: string
          completed_at?: string | null
          conversation_id: string
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_data: Json
          output_data?: Json | null
          previous_responses?: Json | null
          round_number?: number | null
          started_at?: string | null
          status?: string | null
          task_type: string
          user_id?: string | null
        }
        Update: {
          agent_order?: number
          assigned_agent?: string
          completed_at?: string | null
          conversation_id?: string
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_data?: Json
          output_data?: Json | null
          previous_responses?: Json | null
          round_number?: number | null
          started_at?: string | null
          status?: string | null
          task_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brain_ai_tasks_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_laboratory_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      brain_code_scans: {
        Row: {
          completed_at: string | null
          created_at: string
          duplicates_detected: number
          files_scanned: number
          functions_found: number
          heavy_functions: number
          id: string
          scan_type: string
          shared_functions: number
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duplicates_detected?: number
          files_scanned?: number
          functions_found?: number
          heavy_functions?: number
          id?: string
          scan_type: string
          shared_functions?: number
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duplicates_detected?: number
          files_scanned?: number
          functions_found?: number
          heavy_functions?: number
          id?: string
          scan_type?: string
          shared_functions?: number
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      brain_function_analysis: {
        Row: {
          created_at: string
          cyclomatic_complexity: number
          dependencies: string[] | null
          duplicate_of: string | null
          file_path: string
          function_name: string
          function_signature: string
          id: string
          is_duplicate: boolean
          is_heavy: boolean
          is_shared: boolean
          lines_of_code: number
          scan_id: string
          share_count: number
          shared_in_files: string[] | null
        }
        Insert: {
          created_at?: string
          cyclomatic_complexity?: number
          dependencies?: string[] | null
          duplicate_of?: string | null
          file_path: string
          function_name: string
          function_signature: string
          id?: string
          is_duplicate?: boolean
          is_heavy?: boolean
          is_shared?: boolean
          lines_of_code?: number
          scan_id: string
          share_count?: number
          shared_in_files?: string[] | null
        }
        Update: {
          created_at?: string
          cyclomatic_complexity?: number
          dependencies?: string[] | null
          duplicate_of?: string | null
          file_path?: string
          function_name?: string
          function_signature?: string
          id?: string
          is_duplicate?: boolean
          is_heavy?: boolean
          is_shared?: boolean
          lines_of_code?: number
          scan_id?: string
          share_count?: number
          shared_in_files?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "brain_function_analysis_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "brain_code_scans"
            referencedColumns: ["id"]
          },
        ]
      }
      call_logs: {
        Row: {
          call_type: string
          callee_id: string
          caller_id: string
          connection_time_ms: number | null
          created_at: string
          duration_seconds: number | null
          error_message: string | null
          ice_candidates_count: number | null
          id: string
          metadata: Json | null
          room_id: string | null
          status: string
          updated_at: string
          video_quality: string | null
        }
        Insert: {
          call_type: string
          callee_id: string
          caller_id: string
          connection_time_ms?: number | null
          created_at?: string
          duration_seconds?: number | null
          error_message?: string | null
          ice_candidates_count?: number | null
          id?: string
          metadata?: Json | null
          room_id?: string | null
          status: string
          updated_at?: string
          video_quality?: string | null
        }
        Update: {
          call_type?: string
          callee_id?: string
          caller_id?: string
          connection_time_ms?: number | null
          created_at?: string
          duration_seconds?: number | null
          error_message?: string | null
          ice_candidates_count?: number | null
          id?: string
          metadata?: Json | null
          room_id?: string | null
          status?: string
          updated_at?: string
          video_quality?: string | null
        }
        Relationships: []
      }
      campagne: {
        Row: {
          budget: number | null
          created_at: string | null
          fine: string | null
          frequenza_tipo: string | null
          frequenza_valore: number | null
          id: string
          inizio: string | null
          max_email_giorno: number | null
          max_email_ora: number | null
          nome: string
          obiettivo: string | null
          ora_fine: string | null
          ora_inizio: string | null
          stato: string | null
          stato_invio: string | null
          updated_at: string | null
        }
        Insert: {
          budget?: number | null
          created_at?: string | null
          fine?: string | null
          frequenza_tipo?: string | null
          frequenza_valore?: number | null
          id?: string
          inizio?: string | null
          max_email_giorno?: number | null
          max_email_ora?: number | null
          nome: string
          obiettivo?: string | null
          ora_fine?: string | null
          ora_inizio?: string | null
          stato?: string | null
          stato_invio?: string | null
          updated_at?: string | null
        }
        Update: {
          budget?: number | null
          created_at?: string | null
          fine?: string | null
          frequenza_tipo?: string | null
          frequenza_valore?: number | null
          id?: string
          inizio?: string | null
          max_email_giorno?: number | null
          max_email_ora?: number | null
          nome?: string
          obiettivo?: string | null
          ora_fine?: string | null
          ora_inizio?: string | null
          stato?: string | null
          stato_invio?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string
          economy_mode: boolean | null
          id: string
          last_compaction_at: string | null
          last_token_update: string | null
          memoria_completa: boolean | null
          riassunto_contesto: string | null
          show_summaries_only: boolean | null
          system_prompt_id: string | null
          titolo: string | null
          token_count_current: number | null
          token_count_total: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          economy_mode?: boolean | null
          id?: string
          last_compaction_at?: string | null
          last_token_update?: string | null
          memoria_completa?: boolean | null
          riassunto_contesto?: string | null
          show_summaries_only?: boolean | null
          system_prompt_id?: string | null
          titolo?: string | null
          token_count_current?: number | null
          token_count_total?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          economy_mode?: boolean | null
          id?: string
          last_compaction_at?: string | null
          last_token_update?: string | null
          memoria_completa?: boolean | null
          riassunto_contesto?: string | null
          show_summaries_only?: boolean | null
          system_prompt_id?: string | null
          titolo?: string | null
          token_count_current?: number | null
          token_count_total?: number | null
          updated_at?: string
          user_id?: string | null
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
      chat_laboratory_albert_prompts: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          system_prompt: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          system_prompt: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          system_prompt?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      chat_laboratory_audio_responses: {
        Row: {
          agent_id: string
          audio_url: string
          created_at: string
          duration_seconds: number | null
          id: string
          message_id: string
          text_length: number | null
        }
        Insert: {
          agent_id: string
          audio_url: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          message_id: string
          text_length?: number | null
        }
        Update: {
          agent_id?: string
          audio_url?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          message_id?: string
          text_length?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_laboratory_audio_responses_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "elevenlabs_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_laboratory_audio_responses_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_laboratory_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_laboratory_bar_mode: {
        Row: {
          active_kb_id: string | null
          agent_interaction_mode: string | null
          audio_mode: string
          auto_advance_tabs: boolean | null
          auto_play_audio: boolean
          continuous_mic_enabled: boolean | null
          conversation_id: string
          conversation_pace: string
          conversation_style: string | null
          created_at: string
          enable_direct_call_detection: boolean | null
          enable_interruptions: boolean
          id: string
          interrupt_requested: boolean | null
          kb_navigation_history: Json | null
          mode: string
          operation_mode: string
          pause_between_turns_ms: number | null
          preset: string
          response_mode: string
          selected_topic: string | null
          turn_strategy: string | null
          updated_at: string
          user_id: string | null
          voice_enabled: boolean
        }
        Insert: {
          active_kb_id?: string | null
          agent_interaction_mode?: string | null
          audio_mode?: string
          auto_advance_tabs?: boolean | null
          auto_play_audio?: boolean
          continuous_mic_enabled?: boolean | null
          conversation_id: string
          conversation_pace?: string
          conversation_style?: string | null
          created_at?: string
          enable_direct_call_detection?: boolean | null
          enable_interruptions?: boolean
          id?: string
          interrupt_requested?: boolean | null
          kb_navigation_history?: Json | null
          mode?: string
          operation_mode?: string
          pause_between_turns_ms?: number | null
          preset?: string
          response_mode?: string
          selected_topic?: string | null
          turn_strategy?: string | null
          updated_at?: string
          user_id?: string | null
          voice_enabled?: boolean
        }
        Update: {
          active_kb_id?: string | null
          agent_interaction_mode?: string | null
          audio_mode?: string
          auto_advance_tabs?: boolean | null
          auto_play_audio?: boolean
          continuous_mic_enabled?: boolean | null
          conversation_id?: string
          conversation_pace?: string
          conversation_style?: string | null
          created_at?: string
          enable_direct_call_detection?: boolean | null
          enable_interruptions?: boolean
          id?: string
          interrupt_requested?: boolean | null
          kb_navigation_history?: Json | null
          mode?: string
          operation_mode?: string
          pause_between_turns_ms?: number | null
          preset?: string
          response_mode?: string
          selected_topic?: string | null
          turn_strategy?: string | null
          updated_at?: string
          user_id?: string | null
          voice_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "chat_laboratory_bar_mode_active_kb_id_fkey"
            columns: ["active_kb_id"]
            isOneToOne: false
            referencedRelation: "knowledge_bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_laboratory_bar_mode_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: true
            referencedRelation: "chat_laboratory_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_laboratory_calibration_configs: {
        Row: {
          base_delay_ms: number | null
          config_name: string
          context_limit: number | null
          conversation_style: string | null
          created_at: string | null
          economy_mode: boolean | null
          id: string
          is_active: boolean | null
          kb_match_count: number | null
          kb_match_threshold: number | null
          max_retries: number | null
          max_tokens: number | null
          smart_weights: Json | null
          temperature: number | null
          timeout_ms: number | null
          top_p: number | null
          turn_strategy: string | null
          updated_at: string | null
          vad_silence_duration: number | null
        }
        Insert: {
          base_delay_ms?: number | null
          config_name: string
          context_limit?: number | null
          conversation_style?: string | null
          created_at?: string | null
          economy_mode?: boolean | null
          id?: string
          is_active?: boolean | null
          kb_match_count?: number | null
          kb_match_threshold?: number | null
          max_retries?: number | null
          max_tokens?: number | null
          smart_weights?: Json | null
          temperature?: number | null
          timeout_ms?: number | null
          top_p?: number | null
          turn_strategy?: string | null
          updated_at?: string | null
          vad_silence_duration?: number | null
        }
        Update: {
          base_delay_ms?: number | null
          config_name?: string
          context_limit?: number | null
          conversation_style?: string | null
          created_at?: string | null
          economy_mode?: boolean | null
          id?: string
          is_active?: boolean | null
          kb_match_count?: number | null
          kb_match_threshold?: number | null
          max_retries?: number | null
          max_tokens?: number | null
          smart_weights?: Json | null
          temperature?: number | null
          timeout_ms?: number | null
          top_p?: number | null
          turn_strategy?: string | null
          updated_at?: string | null
          vad_silence_duration?: number | null
        }
        Relationships: []
      }
      chat_laboratory_composed_prompts: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          id: string
          name: string
          page_route: string | null
          section_ids: Json
          target_agent: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          id?: string
          name: string
          page_route?: string | null
          section_ids?: Json
          target_agent: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          id?: string
          name?: string
          page_route?: string | null
          section_ids?: Json
          target_agent?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      chat_laboratory_conversations: {
        Row: {
          active_participants: Json | null
          composed_prompt_id: string | null
          convergence_metrics: Json | null
          conversation_phase: string | null
          conversation_style: string | null
          created_at: string | null
          current_turn_index: number | null
          current_turn_interventions: Json | null
          economy_mode: boolean | null
          final_summary: string | null
          id: string
          is_paused: boolean | null
          last_compaction_at: string | null
          last_message_summarized: number | null
          last_speaker_index: number | null
          last_summarized_at: string | null
          last_token_update: string | null
          memoria_completa: boolean | null
          pause_between_agents_ms: number | null
          personality_section_id: string | null
          reduce_user_messages: boolean | null
          response_mode: string | null
          riassunto_contesto: string | null
          show_summaries_only: boolean | null
          summary_chunks: Json | null
          system_prompt_id: string | null
          target_participant_type: string | null
          titolo: string | null
          token_count_current: number | null
          token_count_total: number | null
          updated_at: string | null
          user_id: string | null
          vad_silence_duration: number | null
        }
        Insert: {
          active_participants?: Json | null
          composed_prompt_id?: string | null
          convergence_metrics?: Json | null
          conversation_phase?: string | null
          conversation_style?: string | null
          created_at?: string | null
          current_turn_index?: number | null
          current_turn_interventions?: Json | null
          economy_mode?: boolean | null
          final_summary?: string | null
          id?: string
          is_paused?: boolean | null
          last_compaction_at?: string | null
          last_message_summarized?: number | null
          last_speaker_index?: number | null
          last_summarized_at?: string | null
          last_token_update?: string | null
          memoria_completa?: boolean | null
          pause_between_agents_ms?: number | null
          personality_section_id?: string | null
          reduce_user_messages?: boolean | null
          response_mode?: string | null
          riassunto_contesto?: string | null
          show_summaries_only?: boolean | null
          summary_chunks?: Json | null
          system_prompt_id?: string | null
          target_participant_type?: string | null
          titolo?: string | null
          token_count_current?: number | null
          token_count_total?: number | null
          updated_at?: string | null
          user_id?: string | null
          vad_silence_duration?: number | null
        }
        Update: {
          active_participants?: Json | null
          composed_prompt_id?: string | null
          convergence_metrics?: Json | null
          conversation_phase?: string | null
          conversation_style?: string | null
          created_at?: string | null
          current_turn_index?: number | null
          current_turn_interventions?: Json | null
          economy_mode?: boolean | null
          final_summary?: string | null
          id?: string
          is_paused?: boolean | null
          last_compaction_at?: string | null
          last_message_summarized?: number | null
          last_speaker_index?: number | null
          last_summarized_at?: string | null
          last_token_update?: string | null
          memoria_completa?: boolean | null
          pause_between_agents_ms?: number | null
          personality_section_id?: string | null
          reduce_user_messages?: boolean | null
          response_mode?: string | null
          riassunto_contesto?: string | null
          show_summaries_only?: boolean | null
          summary_chunks?: Json | null
          system_prompt_id?: string | null
          target_participant_type?: string | null
          titolo?: string | null
          token_count_current?: number | null
          token_count_total?: number | null
          updated_at?: string | null
          user_id?: string | null
          vad_silence_duration?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_laboratory_conversations_composed_prompt_id_fkey"
            columns: ["composed_prompt_id"]
            isOneToOne: false
            referencedRelation: "chat_laboratory_composed_prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_laboratory_conversations_personality_section_id_fkey"
            columns: ["personality_section_id"]
            isOneToOne: false
            referencedRelation: "chat_laboratory_prompt_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_laboratory_conversations_system_prompt_id_fkey"
            columns: ["system_prompt_id"]
            isOneToOne: false
            referencedRelation: "chat_laboratory_system_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_laboratory_deliverables: {
        Row: {
          created_at: string | null
          file_size_bytes: number | null
          format: string
          generation_status: string | null
          id: string
          message_id: string
          metadata: Json | null
          parent_deliverable_id: string | null
          storage_path: string
          type: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          file_size_bytes?: number | null
          format: string
          generation_status?: string | null
          id?: string
          message_id: string
          metadata?: Json | null
          parent_deliverable_id?: string | null
          storage_path: string
          type: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          file_size_bytes?: number | null
          format?: string
          generation_status?: string | null
          id?: string
          message_id?: string
          metadata?: Json | null
          parent_deliverable_id?: string | null
          storage_path?: string
          type?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_laboratory_deliverables_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_laboratory_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_laboratory_deliverables_parent_deliverable_id_fkey"
            columns: ["parent_deliverable_id"]
            isOneToOne: false
            referencedRelation: "chat_laboratory_deliverables"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_laboratory_messages: {
        Row: {
          attachments: Json | null
          audio_url: string | null
          content: string
          content_summary: string | null
          content_user_friendly: string | null
          conversation_id: string
          created_at: string | null
          generated_images: Json | null
          id: string
          images: Json | null
          intent_tags: Json | null
          is_streaming: boolean | null
          is_summary_available: boolean | null
          is_visible_to_ai: boolean | null
          message_sequence: number | null
          sender_name: string
          sender_type: string
          tempo_risposta_ms: number | null
          token_input: number | null
          token_output: number | null
        }
        Insert: {
          attachments?: Json | null
          audio_url?: string | null
          content: string
          content_summary?: string | null
          content_user_friendly?: string | null
          conversation_id: string
          created_at?: string | null
          generated_images?: Json | null
          id?: string
          images?: Json | null
          intent_tags?: Json | null
          is_streaming?: boolean | null
          is_summary_available?: boolean | null
          is_visible_to_ai?: boolean | null
          message_sequence?: number | null
          sender_name: string
          sender_type: string
          tempo_risposta_ms?: number | null
          token_input?: number | null
          token_output?: number | null
        }
        Update: {
          attachments?: Json | null
          audio_url?: string | null
          content?: string
          content_summary?: string | null
          content_user_friendly?: string | null
          conversation_id?: string
          created_at?: string | null
          generated_images?: Json | null
          id?: string
          images?: Json | null
          intent_tags?: Json | null
          is_streaming?: boolean | null
          is_summary_available?: boolean | null
          is_visible_to_ai?: boolean | null
          message_sequence?: number | null
          sender_name?: string
          sender_type?: string
          tempo_risposta_ms?: number | null
          token_input?: number | null
          token_output?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_laboratory_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_laboratory_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_laboratory_participants: {
        Row: {
          conversation_id: string
          created_at: string | null
          has_responded_current_turn: boolean | null
          id: string
          is_active: boolean | null
          name: string
          response_count: number | null
          role_description: string | null
          role_name: string | null
          system_prompt: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          has_responded_current_turn?: boolean | null
          id?: string
          is_active?: boolean | null
          name: string
          response_count?: number | null
          role_description?: string | null
          role_name?: string | null
          system_prompt?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          has_responded_current_turn?: boolean | null
          id?: string
          is_active?: boolean | null
          name?: string
          response_count?: number | null
          role_description?: string | null
          role_name?: string | null
          system_prompt?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_laboratory_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_laboratory_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_laboratory_prompt_sections: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_active: boolean | null
          order_priority: number | null
          section_name: string
          section_type: string
          thumbnail_url: string | null
          topic_tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          order_priority?: number | null
          section_name: string
          section_type: string
          thumbnail_url?: string | null
          topic_tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          order_priority?: number | null
          section_name?: string
          section_type?: string
          thumbnail_url?: string | null
          topic_tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      chat_laboratory_system_prompts: {
        Row: {
          attivo: boolean | null
          contenuto: string
          created_at: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          attivo?: boolean | null
          contenuto: string
          created_at?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          attivo?: boolean | null
          contenuto?: string
          created_at?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      chat_laboratory_usage_stats: {
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
            foreignKeyName: "chat_laboratory_usage_stats_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_laboratory_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          attachments: Json | null
          content: string
          content_summary: string | null
          content_user_friendly: string | null
          conversation_id: string
          created_at: string
          generated_images: Json | null
          id: string
          images: Json | null
          is_summary_available: boolean | null
          model: string | null
          role: string
          tempo_risposta_ms: number | null
          token_input: number | null
          token_output: number | null
          tokens_used: number | null
        }
        Insert: {
          attachments?: Json | null
          content: string
          content_summary?: string | null
          content_user_friendly?: string | null
          conversation_id: string
          created_at?: string
          generated_images?: Json | null
          id?: string
          images?: Json | null
          is_summary_available?: boolean | null
          model?: string | null
          role: string
          tempo_risposta_ms?: number | null
          token_input?: number | null
          token_output?: number | null
          tokens_used?: number | null
        }
        Update: {
          attachments?: Json | null
          content?: string
          content_summary?: string | null
          content_user_friendly?: string | null
          conversation_id?: string
          created_at?: string
          generated_images?: Json | null
          id?: string
          images?: Json | null
          is_summary_available?: boolean | null
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
      company_logos: {
        Row: {
          created_at: string | null
          domain: string
          fetched_at: string | null
          logo_url: string | null
        }
        Insert: {
          created_at?: string | null
          domain: string
          fetched_at?: string | null
          logo_url?: string | null
        }
        Update: {
          created_at?: string | null
          domain?: string
          fetched_at?: string | null
          logo_url?: string | null
        }
        Relationships: []
      }
      company_logos_cache: {
        Row: {
          company_name: string | null
          created_at: string | null
          domain: string
          fetch_attempts: number | null
          id: string
          last_fetched_at: string | null
          logo_url: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string | null
          domain: string
          fetch_attempts?: number | null
          id?: string
          last_fetched_at?: string | null
          logo_url?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string | null
          domain?: string
          fetch_attempts?: number | null
          id?: string
          last_fetched_at?: string | null
          logo_url?: string | null
        }
        Relationships: []
      }
      config_ai: {
        Row: {
          api_key: string
          attivo: boolean
          created_at: string
          id: string
          last_test_at: string | null
          last_test_error: string | null
          last_test_status: string | null
          modello: string
          provider: string
          updated_at: string
        }
        Insert: {
          api_key: string
          attivo?: boolean
          created_at?: string
          id?: string
          last_test_at?: string | null
          last_test_error?: string | null
          last_test_status?: string | null
          modello: string
          provider: string
          updated_at?: string
        }
        Update: {
          api_key?: string
          attivo?: boolean
          created_at?: string
          id?: string
          last_test_at?: string | null
          last_test_error?: string | null
          last_test_status?: string | null
          modello?: string
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      config_generale: {
        Row: {
          cognome_utente: string | null
          compaction_trigger_messages: number | null
          compaction_trigger_tokens: number | null
          created_at: string
          email_utente: string | null
          formato_data: string
          id: string
          lingua_predefinita: string
          max_email_giorno: number
          max_token_conversazione: number | null
          memoria_messaggi: number | null
          memoria_ore: number | null
          mostra_statistiche: boolean | null
          nome_utente: string | null
          ruolo_utente: string | null
          telefono_utente: string | null
          timezone_fuso: string
          token_alert_threshold: number | null
          updated_at: string
          usa_riassunto: boolean | null
        }
        Insert: {
          cognome_utente?: string | null
          compaction_trigger_messages?: number | null
          compaction_trigger_tokens?: number | null
          created_at?: string
          email_utente?: string | null
          formato_data?: string
          id?: string
          lingua_predefinita?: string
          max_email_giorno?: number
          max_token_conversazione?: number | null
          memoria_messaggi?: number | null
          memoria_ore?: number | null
          mostra_statistiche?: boolean | null
          nome_utente?: string | null
          ruolo_utente?: string | null
          telefono_utente?: string | null
          timezone_fuso?: string
          token_alert_threshold?: number | null
          updated_at?: string
          usa_riassunto?: boolean | null
        }
        Update: {
          cognome_utente?: string | null
          compaction_trigger_messages?: number | null
          compaction_trigger_tokens?: number | null
          created_at?: string
          email_utente?: string | null
          formato_data?: string
          id?: string
          lingua_predefinita?: string
          max_email_giorno?: number
          max_token_conversazione?: number | null
          memoria_messaggi?: number | null
          memoria_ore?: number | null
          mostra_statistiche?: boolean | null
          nome_utente?: string | null
          ruolo_utente?: string | null
          telefono_utente?: string | null
          timezone_fuso?: string
          token_alert_threshold?: number | null
          updated_at?: string
          usa_riassunto?: boolean | null
        }
        Relationships: []
      }
      conversation_history: {
        Row: {
          conversation_summary: string | null
          created_at: string | null
          id: string
          last_5_exchanges: Json | null
          sender_email: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          conversation_summary?: string | null
          created_at?: string | null
          id?: string
          last_5_exchanges?: Json | null
          sender_email: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          conversation_summary?: string | null
          created_at?: string | null
          id?: string
          last_5_exchanges?: Json | null
          sender_email?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      debugging: {
        Row: {
          active_functions: number | null
          complexity_score: number | null
          components: Json | null
          created_at: string | null
          edge_functions_called: Json | null
          exports_detected: Json | null
          function_status_map: Json | null
          functions_detected: Json | null
          hardcoded_issues: Json | null
          hooks_detected: Json | null
          id: string
          imports_detected: Json | null
          inactive_functions: number | null
          linked_pages: Json | null
          naming_mismatches: Json | null
          notes: string | null
          orphan_functions: Json | null
          page_file_path: string | null
          page_name: string
          page_route: string
          queries_detected: Json | null
          scan_timestamp: string | null
          suspect_functions: number | null
          tables_used: Json | null
          total_functions: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          active_functions?: number | null
          complexity_score?: number | null
          components?: Json | null
          created_at?: string | null
          edge_functions_called?: Json | null
          exports_detected?: Json | null
          function_status_map?: Json | null
          functions_detected?: Json | null
          hardcoded_issues?: Json | null
          hooks_detected?: Json | null
          id?: string
          imports_detected?: Json | null
          inactive_functions?: number | null
          linked_pages?: Json | null
          naming_mismatches?: Json | null
          notes?: string | null
          orphan_functions?: Json | null
          page_file_path?: string | null
          page_name: string
          page_route: string
          queries_detected?: Json | null
          scan_timestamp?: string | null
          suspect_functions?: number | null
          tables_used?: Json | null
          total_functions?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          active_functions?: number | null
          complexity_score?: number | null
          components?: Json | null
          created_at?: string | null
          edge_functions_called?: Json | null
          exports_detected?: Json | null
          function_status_map?: Json | null
          functions_detected?: Json | null
          hardcoded_issues?: Json | null
          hooks_detected?: Json | null
          id?: string
          imports_detected?: Json | null
          inactive_functions?: number | null
          linked_pages?: Json | null
          naming_mismatches?: Json | null
          notes?: string | null
          orphan_functions?: Json | null
          page_file_path?: string | null
          page_name?: string
          page_route?: string
          queries_detected?: Json | null
          scan_timestamp?: string | null
          suspect_functions?: number | null
          tables_used?: Json | null
          total_functions?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      design_lab_audit_log: {
        Row: {
          action: string
          from_version: number | null
          id: string
          metadata: Json | null
          page_id: string
          performed_at: string | null
          performed_by: string
          to_version: number | null
        }
        Insert: {
          action: string
          from_version?: number | null
          id?: string
          metadata?: Json | null
          page_id: string
          performed_at?: string | null
          performed_by: string
          to_version?: number | null
        }
        Update: {
          action?: string
          from_version?: number | null
          id?: string
          metadata?: Json | null
          page_id?: string
          performed_at?: string | null
          performed_by?: string
          to_version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "design_lab_audit_log_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "design_lab_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      design_lab_components: {
        Row: {
          component_type: string
          created_at: string | null
          id: string
          order_index: number | null
          page_id: string
          parent_id: string | null
          position: Json
          props: Json | null
        }
        Insert: {
          component_type: string
          created_at?: string | null
          id?: string
          order_index?: number | null
          page_id: string
          parent_id?: string | null
          position: Json
          props?: Json | null
        }
        Update: {
          component_type?: string
          created_at?: string | null
          id?: string
          order_index?: number | null
          page_id?: string
          parent_id?: string | null
          position?: Json
          props?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "design_lab_components_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "design_lab_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_lab_components_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "design_lab_components"
            referencedColumns: ["id"]
          },
        ]
      }
      design_lab_extracted_components: {
        Row: {
          compatibility_context: Json | null
          complexity_level: string | null
          component_name: string
          component_type: string
          created_at: string
          dependencies: Json | null
          fields_schema: Json | null
          id: string
          is_reusable: boolean | null
          jsx_code: string
          position_in_source: Json | null
          preview_html: string | null
          props_schema: Json | null
          section: string | null
          source_page_id: string | null
          tags: string[] | null
          thumbnail_url: string | null
          ui_category: string | null
          usage_count: number | null
        }
        Insert: {
          compatibility_context?: Json | null
          complexity_level?: string | null
          component_name: string
          component_type: string
          created_at?: string
          dependencies?: Json | null
          fields_schema?: Json | null
          id?: string
          is_reusable?: boolean | null
          jsx_code: string
          position_in_source?: Json | null
          preview_html?: string | null
          props_schema?: Json | null
          section?: string | null
          source_page_id?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          ui_category?: string | null
          usage_count?: number | null
        }
        Update: {
          compatibility_context?: Json | null
          complexity_level?: string | null
          component_name?: string
          component_type?: string
          created_at?: string
          dependencies?: Json | null
          fields_schema?: Json | null
          id?: string
          is_reusable?: boolean | null
          jsx_code?: string
          position_in_source?: Json | null
          preview_html?: string | null
          props_schema?: Json | null
          section?: string | null
          source_page_id?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          ui_category?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "design_lab_extracted_components_source_page_id_fkey"
            columns: ["source_page_id"]
            isOneToOne: false
            referencedRelation: "design_lab_source_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      design_lab_extracted_functions: {
        Row: {
          applicable_to: string[] | null
          code_generic: string
          code_original: string
          compatible_contexts: string[] | null
          complexity_score: number | null
          component_id: string | null
          created_at: string
          dependencies: Json | null
          description: string | null
          event_handlers: Json | null
          function_name: string
          function_type: string
          id: string
          is_async: boolean | null
          parameters: Json | null
          return_type: string | null
          source_page_id: string | null
          tags: string[] | null
        }
        Insert: {
          applicable_to?: string[] | null
          code_generic: string
          code_original: string
          compatible_contexts?: string[] | null
          complexity_score?: number | null
          component_id?: string | null
          created_at?: string
          dependencies?: Json | null
          description?: string | null
          event_handlers?: Json | null
          function_name: string
          function_type: string
          id?: string
          is_async?: boolean | null
          parameters?: Json | null
          return_type?: string | null
          source_page_id?: string | null
          tags?: string[] | null
        }
        Update: {
          applicable_to?: string[] | null
          code_generic?: string
          code_original?: string
          compatible_contexts?: string[] | null
          complexity_score?: number | null
          component_id?: string | null
          created_at?: string
          dependencies?: Json | null
          description?: string | null
          event_handlers?: Json | null
          function_name?: string
          function_type?: string
          id?: string
          is_async?: boolean | null
          parameters?: Json | null
          return_type?: string | null
          source_page_id?: string | null
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "design_lab_extracted_functions_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "design_lab_extracted_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_lab_extracted_functions_source_page_id_fkey"
            columns: ["source_page_id"]
            isOneToOne: false
            referencedRelation: "design_lab_source_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      design_lab_hooks_library: {
        Row: {
          code_customizable: string
          code_original: string
          created_at: string
          dependencies: Json | null
          description: string | null
          hook_name: string
          hook_path: string
          id: string
          is_system_hook: boolean | null
          usage_example: string | null
        }
        Insert: {
          code_customizable: string
          code_original: string
          created_at?: string
          dependencies?: Json | null
          description?: string | null
          hook_name: string
          hook_path: string
          id?: string
          is_system_hook?: boolean | null
          usage_example?: string | null
        }
        Update: {
          code_customizable?: string
          code_original?: string
          created_at?: string
          dependencies?: Json | null
          description?: string | null
          hook_name?: string
          hook_path?: string
          id?: string
          is_system_hook?: boolean | null
          usage_example?: string | null
        }
        Relationships: []
      }
      design_lab_logic: {
        Row: {
          action_config: Json | null
          action_type: string
          component_id: string
          created_at: string | null
          event_type: string
          id: string
        }
        Insert: {
          action_config?: Json | null
          action_type: string
          component_id: string
          created_at?: string | null
          event_type: string
          id?: string
        }
        Update: {
          action_config?: Json | null
          action_type?: string
          component_id?: string
          created_at?: string | null
          event_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_lab_logic_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "design_lab_components"
            referencedColumns: ["id"]
          },
        ]
      }
      design_lab_page_configurations: {
        Row: {
          component_mappings: Json | null
          created_at: string | null
          function_bindings: Json | null
          id: string
          metadata: Json | null
          page_id: string
          source_page_id: string | null
          updated_at: string | null
          validation_rules: Json | null
        }
        Insert: {
          component_mappings?: Json | null
          created_at?: string | null
          function_bindings?: Json | null
          id?: string
          metadata?: Json | null
          page_id: string
          source_page_id?: string | null
          updated_at?: string | null
          validation_rules?: Json | null
        }
        Update: {
          component_mappings?: Json | null
          created_at?: string | null
          function_bindings?: Json | null
          id?: string
          metadata?: Json | null
          page_id?: string
          source_page_id?: string | null
          updated_at?: string | null
          validation_rules?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "design_lab_page_configurations_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: true
            referencedRelation: "design_lab_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_lab_page_configurations_source_page_id_fkey"
            columns: ["source_page_id"]
            isOneToOne: false
            referencedRelation: "design_lab_source_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      design_lab_pages: {
        Row: {
          config: Json | null
          created_at: string | null
          description: string | null
          id: string
          is_published: boolean | null
          is_template: boolean | null
          page_name: string
          published_at: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          version: number | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          is_template?: boolean | null
          page_name: string
          published_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          version?: number | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          is_template?: boolean | null
          page_name?: string
          published_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          version?: number | null
        }
        Relationships: []
      }
      design_lab_plugins: {
        Row: {
          category: string | null
          components_included: Json | null
          config_schema: Json | null
          created_at: string
          description: string | null
          export_path: string | null
          functions_included: Json | null
          generic_version: string
          hooks_included: Json | null
          id: string
          is_exported: boolean | null
          plugin_name: string
          plugin_type: string
          rating: number | null
          required_tables: Json | null
          supabase_version: string
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string
          usage_count: number | null
          user_id: string | null
          version: string | null
        }
        Insert: {
          category?: string | null
          components_included?: Json | null
          config_schema?: Json | null
          created_at?: string
          description?: string | null
          export_path?: string | null
          functions_included?: Json | null
          generic_version: string
          hooks_included?: Json | null
          id?: string
          is_exported?: boolean | null
          plugin_name: string
          plugin_type: string
          rating?: number | null
          required_tables?: Json | null
          supabase_version: string
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
          usage_count?: number | null
          user_id?: string | null
          version?: string | null
        }
        Update: {
          category?: string | null
          components_included?: Json | null
          config_schema?: Json | null
          created_at?: string
          description?: string | null
          export_path?: string | null
          functions_included?: Json | null
          generic_version?: string
          hooks_included?: Json | null
          id?: string
          is_exported?: boolean | null
          plugin_name?: string
          plugin_type?: string
          rating?: number | null
          required_tables?: Json | null
          supabase_version?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
          usage_count?: number | null
          user_id?: string | null
          version?: string | null
        }
        Relationships: []
      }
      design_lab_source_pages: {
        Row: {
          category: string | null
          complexity_score: number | null
          created_at: string
          description: string | null
          id: string
          page_name: string
          page_path: string
          scanned_at: string | null
          thumbnail_url: string | null
          total_components: number | null
          total_functions: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          complexity_score?: number | null
          created_at?: string
          description?: string | null
          id?: string
          page_name: string
          page_path: string
          scanned_at?: string | null
          thumbnail_url?: string | null
          total_components?: number | null
          total_functions?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          complexity_score?: number | null
          created_at?: string
          description?: string | null
          id?: string
          page_name?: string
          page_path?: string
          scanned_at?: string | null
          thumbnail_url?: string | null
          total_components?: number | null
          total_functions?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      document_chunks: {
        Row: {
          chunk_index: number
          chunk_text: string
          conversation_id: string | null
          created_at: string | null
          embedding: string | null
          file_name: string
          file_type: string
          id: string
          lab_conversation_id: string | null
          metadata: Json | null
          room_id: string | null
          updated_at: string | null
        }
        Insert: {
          chunk_index: number
          chunk_text: string
          conversation_id?: string | null
          created_at?: string | null
          embedding?: string | null
          file_name: string
          file_type: string
          id?: string
          lab_conversation_id?: string | null
          metadata?: Json | null
          room_id?: string | null
          updated_at?: string | null
        }
        Update: {
          chunk_index?: number
          chunk_text?: string
          conversation_id?: string | null
          created_at?: string | null
          embedding?: string | null
          file_name?: string
          file_type?: string
          id?: string
          lab_conversation_id?: string | null
          metadata?: Json | null
          room_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      edge_function_versions: {
        Row: {
          content: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          function_name: string
          id: string
          is_active: boolean | null
          version_number: number
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          function_name: string
          id?: string
          is_active?: boolean | null
          version_number: number
        }
        Update: {
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          function_name?: string
          id?: string
          is_active?: boolean | null
          version_number?: number
        }
        Relationships: []
      }
      elevenlabs_agents: {
        Row: {
          created_at: string
          elevenlabs_agent_id: string
          expertise_keywords: string[] | null
          id: string
          interruption_style: string
          is_active: boolean
          max_words_per_response: number
          name: string
          order_index: number
          prompt_id: string | null
          response_style: string
          speaking_pace: string
          text_generation_prompt: string
          text_generation_prompt_old_20250112: string | null
          updated_at: string
          user_id: string | null
          voice_id: string
        }
        Insert: {
          created_at?: string
          elevenlabs_agent_id: string
          expertise_keywords?: string[] | null
          id?: string
          interruption_style?: string
          is_active?: boolean
          max_words_per_response?: number
          name: string
          order_index?: number
          prompt_id?: string | null
          response_style?: string
          speaking_pace?: string
          text_generation_prompt: string
          text_generation_prompt_old_20250112?: string | null
          updated_at?: string
          user_id?: string | null
          voice_id: string
        }
        Update: {
          created_at?: string
          elevenlabs_agent_id?: string
          expertise_keywords?: string[] | null
          id?: string
          interruption_style?: string
          is_active?: boolean
          max_words_per_response?: number
          name?: string
          order_index?: number
          prompt_id?: string | null
          response_style?: string
          speaking_pace?: string
          text_generation_prompt?: string
          text_generation_prompt_old_20250112?: string | null
          updated_at?: string
          user_id?: string | null
          voice_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "elevenlabs_agents_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "chat_laboratory_prompt_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      elevenlabs_usage_limits: {
        Row: {
          cost_per_1000_chars: number
          created_at: string
          daily_character_limit: number
          daily_request_limit: number
          id: string
          tier: string
        }
        Insert: {
          cost_per_1000_chars: number
          created_at?: string
          daily_character_limit: number
          daily_request_limit: number
          id?: string
          tier: string
        }
        Update: {
          cost_per_1000_chars?: number
          created_at?: string
          daily_character_limit?: number
          daily_request_limit?: number
          id?: string
          tier?: string
        }
        Relationships: []
      }
      elevenlabs_usage_tracking: {
        Row: {
          characters_used: number
          cost_usd: number
          created_at: string
          date: string
          id: string
          requests_count: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          characters_used?: number
          cost_usd?: number
          created_at?: string
          date?: string
          id?: string
          requests_count?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          characters_used?: number
          cost_usd?: number
          created_at?: string
          date?: string
          id?: string
          requests_count?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      email_ai_classifications: {
        Row: {
          action_suggested: string | null
          ai_summary: string | null
          body_preview: string | null
          body_text: string | null
          category: string
          confidence: number
          created_at: string | null
          custom_prompt: string | null
          detected_patterns: string[] | null
          email_date: string | null
          email_id: string
          email_message_id: string | null
          email_uid: string
          folder_name: string | null
          has_attachments: boolean | null
          id: string
          is_verified: boolean | null
          keywords: string[] | null
          reasoning: string | null
          sender_domain: string
          sender_email: string
          sender_logo_url: string | null
          subject: string | null
          tags: string[] | null
          updated_at: string | null
          urgency: string | null
          user_email: string
        }
        Insert: {
          action_suggested?: string | null
          ai_summary?: string | null
          body_preview?: string | null
          body_text?: string | null
          category: string
          confidence: number
          created_at?: string | null
          custom_prompt?: string | null
          detected_patterns?: string[] | null
          email_date?: string | null
          email_id: string
          email_message_id?: string | null
          email_uid: string
          folder_name?: string | null
          has_attachments?: boolean | null
          id?: string
          is_verified?: boolean | null
          keywords?: string[] | null
          reasoning?: string | null
          sender_domain: string
          sender_email: string
          sender_logo_url?: string | null
          subject?: string | null
          tags?: string[] | null
          updated_at?: string | null
          urgency?: string | null
          user_email: string
        }
        Update: {
          action_suggested?: string | null
          ai_summary?: string | null
          body_preview?: string | null
          body_text?: string | null
          category?: string
          confidence?: number
          created_at?: string | null
          custom_prompt?: string | null
          detected_patterns?: string[] | null
          email_date?: string | null
          email_id?: string
          email_message_id?: string | null
          email_uid?: string
          folder_name?: string | null
          has_attachments?: boolean | null
          id?: string
          is_verified?: boolean | null
          keywords?: string[] | null
          reasoning?: string | null
          sender_domain?: string
          sender_email?: string
          sender_logo_url?: string | null
          subject?: string | null
          tags?: string[] | null
          updated_at?: string | null
          urgency?: string | null
          user_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_ai_classifications_email_message_id_fkey"
            columns: ["email_message_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_email_ai_classifications_email_messages"
            columns: ["email_id"]
            isOneToOne: true
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      email_ai_context_cache: {
        Row: {
          available_templates: Json | null
          cached_at: string | null
          company_data: Json | null
          contact_aliases: Json | null
          expires_at: string | null
          id: string
          rubrica_id: string | null
          sender_email: string
        }
        Insert: {
          available_templates?: Json | null
          cached_at?: string | null
          company_data?: Json | null
          contact_aliases?: Json | null
          expires_at?: string | null
          id?: string
          rubrica_id?: string | null
          sender_email: string
        }
        Update: {
          available_templates?: Json | null
          cached_at?: string | null
          company_data?: Json | null
          contact_aliases?: Json | null
          expires_at?: string | null
          id?: string
          rubrica_id?: string | null
          sender_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_ai_context_cache_rubrica_id_fkey"
            columns: ["rubrica_id"]
            isOneToOne: false
            referencedRelation: "rubrica"
            referencedColumns: ["id"]
          },
        ]
      }
      email_ai_execution_log: {
        Row: {
          ai_config_used: Json | null
          ai_reasoning: string | null
          ai_response: string | null
          confidence: number | null
          context_injected: Json | null
          created_at: string
          email_body_preview: string | null
          email_subject: string | null
          email_uid: string
          error_message: string | null
          executed_at: string | null
          id: string
          prompt_id: string | null
          prompt_used: string
          proposed_actions: Json | null
          sender_email: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          ai_config_used?: Json | null
          ai_reasoning?: string | null
          ai_response?: string | null
          confidence?: number | null
          context_injected?: Json | null
          created_at?: string
          email_body_preview?: string | null
          email_subject?: string | null
          email_uid: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          prompt_id?: string | null
          prompt_used: string
          proposed_actions?: Json | null
          sender_email: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          ai_config_used?: Json | null
          ai_reasoning?: string | null
          ai_response?: string | null
          confidence?: number | null
          context_injected?: Json | null
          created_at?: string
          email_body_preview?: string | null
          email_subject?: string | null
          email_uid?: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          prompt_id?: string | null
          prompt_used?: string
          proposed_actions?: Json | null
          sender_email?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_ai_execution_log_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "email_sender_ai_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_ai_learning_feedback: {
        Row: {
          action_type: string
          ai_suggestion: string
          confidence_score: number | null
          created_at: string | null
          email_category: string | null
          email_id: string | null
          feedback_notes: string | null
          id: string
          sender_email: string | null
          user_correction: string | null
          user_feedback: string
          user_id: string
        }
        Insert: {
          action_type: string
          ai_suggestion: string
          confidence_score?: number | null
          created_at?: string | null
          email_category?: string | null
          email_id?: string | null
          feedback_notes?: string | null
          id?: string
          sender_email?: string | null
          user_correction?: string | null
          user_feedback: string
          user_id: string
        }
        Update: {
          action_type?: string
          ai_suggestion?: string
          confidence_score?: number | null
          created_at?: string | null
          email_category?: string | null
          email_id?: string | null
          feedback_notes?: string | null
          id?: string
          sender_email?: string | null
          user_correction?: string | null
          user_feedback?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_ai_learning_feedback_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      email_ai_performance_metrics: {
        Row: {
          accuracy_rate: number | null
          approved_actions: number | null
          avg_confidence: number | null
          context_key: string | null
          id: string
          last_updated: string | null
          metric_type: string
          rejected_actions: number | null
          total_actions: number | null
          user_id: string
        }
        Insert: {
          accuracy_rate?: number | null
          approved_actions?: number | null
          avg_confidence?: number | null
          context_key?: string | null
          id?: string
          last_updated?: string | null
          metric_type: string
          rejected_actions?: number | null
          total_actions?: number | null
          user_id: string
        }
        Update: {
          accuracy_rate?: number | null
          approved_actions?: number | null
          avg_confidence?: number | null
          context_key?: string | null
          id?: string
          last_updated?: string | null
          metric_type?: string
          rejected_actions?: number | null
          total_actions?: number | null
          user_id?: string
        }
        Relationships: []
      }
      email_attachments: {
        Row: {
          created_at: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          nome: string
          updated_at: string
          user_email: string | null
        }
        Insert: {
          created_at?: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          nome: string
          updated_at?: string
          user_email?: string | null
        }
        Update: {
          created_at?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          nome?: string
          updated_at?: string
          user_email?: string | null
        }
        Relationships: []
      }
      email_auto_execution_log: {
        Row: {
          action_type: string
          confidence: number
          email_uid: string
          error_message: string | null
          executed_at: string | null
          id: string
          metadata: Json | null
          success: boolean | null
          user_id: string
        }
        Insert: {
          action_type: string
          confidence: number
          email_uid: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          metadata?: Json | null
          success?: boolean | null
          user_id: string
        }
        Update: {
          action_type?: string
          confidence?: number
          email_uid?: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          metadata?: Json | null
          success?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      email_automation_config: {
        Row: {
          allowed_auto_actions: string[] | null
          auto_execute_enabled: boolean | null
          confidence_threshold: number | null
          created_at: string | null
          id: string
          max_auto_actions_per_day: number | null
          require_confirmation_actions: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          allowed_auto_actions?: string[] | null
          auto_execute_enabled?: boolean | null
          confidence_threshold?: number | null
          created_at?: string | null
          id?: string
          max_auto_actions_per_day?: number | null
          require_confirmation_actions?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          allowed_auto_actions?: string[] | null
          auto_execute_enabled?: boolean | null
          confidence_threshold?: number | null
          created_at?: string | null
          id?: string
          max_auto_actions_per_day?: number | null
          require_confirmation_actions?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_campagne_queue: {
        Row: {
          campagna_nome: string
          corpo_html: string | null
          corpo_testo: string
          created_at: string | null
          creato_da: string | null
          data_ora_invio: string | null
          data_ora_programmata: string | null
          destinatario_azienda: string | null
          destinatario_email: string
          destinatario_nome: string | null
          destinatario_rubrica_id: string | null
          errore_dettaglio: string | null
          id: string
          intervallo_minuti: number | null
          max_tentativi: number | null
          message_id: string | null
          oggetto: string
          priorita: number | null
          stato: string | null
          tentativi_invio: number | null
          updated_at: string | null
        }
        Insert: {
          campagna_nome: string
          corpo_html?: string | null
          corpo_testo: string
          created_at?: string | null
          creato_da?: string | null
          data_ora_invio?: string | null
          data_ora_programmata?: string | null
          destinatario_azienda?: string | null
          destinatario_email: string
          destinatario_nome?: string | null
          destinatario_rubrica_id?: string | null
          errore_dettaglio?: string | null
          id?: string
          intervallo_minuti?: number | null
          max_tentativi?: number | null
          message_id?: string | null
          oggetto: string
          priorita?: number | null
          stato?: string | null
          tentativi_invio?: number | null
          updated_at?: string | null
        }
        Update: {
          campagna_nome?: string
          corpo_html?: string | null
          corpo_testo?: string
          created_at?: string | null
          creato_da?: string | null
          data_ora_invio?: string | null
          data_ora_programmata?: string | null
          destinatario_azienda?: string | null
          destinatario_email?: string
          destinatario_nome?: string | null
          destinatario_rubrica_id?: string | null
          errore_dettaglio?: string | null
          id?: string
          intervallo_minuti?: number | null
          max_tentativi?: number | null
          message_id?: string | null
          oggetto?: string
          priorita?: number | null
          stato?: string | null
          tentativi_invio?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_contextual_searches: {
        Row: {
          created_at: string | null
          email_id: string
          execution_time_ms: number | null
          id: string
          search_query: string
          search_result: Json | null
          search_type: string
          user_id: string
          was_successful: boolean | null
        }
        Insert: {
          created_at?: string | null
          email_id: string
          execution_time_ms?: number | null
          id?: string
          search_query: string
          search_result?: Json | null
          search_type: string
          user_id: string
          was_successful?: boolean | null
        }
        Update: {
          created_at?: string | null
          email_id?: string
          execution_time_ms?: number | null
          id?: string
          search_query?: string
          search_result?: Json | null
          search_type?: string
          user_id?: string
          was_successful?: boolean | null
        }
        Relationships: []
      }
      email_conversation_history: {
        Row: {
          conversation_summary: string | null
          created_at: string | null
          id: string
          last_email_at: string | null
          last_emails: Json | null
          relationship_status: string | null
          sender_email: string
          total_exchanges: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          conversation_summary?: string | null
          created_at?: string | null
          id?: string
          last_email_at?: string | null
          last_emails?: Json | null
          relationship_status?: string | null
          sender_email: string
          total_exchanges?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          conversation_summary?: string | null
          created_at?: string | null
          id?: string
          last_email_at?: string | null
          last_emails?: Json | null
          relationship_status?: string | null
          sender_email?: string
          total_exchanges?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_folder_locks: {
        Row: {
          created_at: string | null
          folder_name: string
          id: string
          is_locked: boolean | null
          locked_at: string | null
          updated_at: string | null
          user_email: string
        }
        Insert: {
          created_at?: string | null
          folder_name: string
          id?: string
          is_locked?: boolean | null
          locked_at?: string | null
          updated_at?: string | null
          user_email: string
        }
        Update: {
          created_at?: string | null
          folder_name?: string
          id?: string
          is_locked?: boolean | null
          locked_at?: string | null
          updated_at?: string | null
          user_email?: string
        }
        Relationships: []
      }
      email_import_errors: {
        Row: {
          created_at: string | null
          error_message: string
          error_type: string
          first_error_at: string | null
          folder_name: string
          id: string
          last_retry_at: string | null
          metadata: Json | null
          retry_count: number | null
          status: string | null
          uid: string
          updated_at: string | null
          user_email: string
        }
        Insert: {
          created_at?: string | null
          error_message: string
          error_type: string
          first_error_at?: string | null
          folder_name: string
          id?: string
          last_retry_at?: string | null
          metadata?: Json | null
          retry_count?: number | null
          status?: string | null
          uid: string
          updated_at?: string | null
          user_email: string
        }
        Update: {
          created_at?: string | null
          error_message?: string
          error_type?: string
          first_error_at?: string | null
          folder_name?: string
          id?: string
          last_retry_at?: string | null
          metadata?: Json | null
          retry_count?: number | null
          status?: string | null
          uid?: string
          updated_at?: string | null
          user_email?: string
        }
        Relationships: []
      }
      email_messages: {
        Row: {
          attachments: Json | null
          bcc_email: string | null
          body_html: string | null
          body_text: string | null
          cartella: string | null
          cc_email: string | null
          created_at: string
          data_invio: string | null
          data_ricezione: string
          deleted_from_server: boolean | null
          deleted_from_server_at: string | null
          direzione: string
          email_references: string | null
          flags: Json | null
          from_email: string
          id: string
          in_reply_to: string | null
          is_shared_email: boolean | null
          message_hash: string | null
          message_id: string
          provider_id: string
          raw_headers: Json | null
          shared_email_id: string | null
          stato: string
          subject: string | null
          sync_status: string | null
          thread_id: string | null
          to_email: string
          updated_at: string
          user_email: string
        }
        Insert: {
          attachments?: Json | null
          bcc_email?: string | null
          body_html?: string | null
          body_text?: string | null
          cartella?: string | null
          cc_email?: string | null
          created_at?: string
          data_invio?: string | null
          data_ricezione: string
          deleted_from_server?: boolean | null
          deleted_from_server_at?: string | null
          direzione: string
          email_references?: string | null
          flags?: Json | null
          from_email: string
          id?: string
          in_reply_to?: string | null
          is_shared_email?: boolean | null
          message_hash?: string | null
          message_id: string
          provider_id: string
          raw_headers?: Json | null
          shared_email_id?: string | null
          stato?: string
          subject?: string | null
          sync_status?: string | null
          thread_id?: string | null
          to_email: string
          updated_at?: string
          user_email: string
        }
        Update: {
          attachments?: Json | null
          bcc_email?: string | null
          body_html?: string | null
          body_text?: string | null
          cartella?: string | null
          cc_email?: string | null
          created_at?: string
          data_invio?: string | null
          data_ricezione?: string
          deleted_from_server?: boolean | null
          deleted_from_server_at?: string | null
          direzione?: string
          email_references?: string | null
          flags?: Json | null
          from_email?: string
          id?: string
          in_reply_to?: string | null
          is_shared_email?: boolean | null
          message_hash?: string | null
          message_id?: string
          provider_id?: string
          raw_headers?: Json | null
          shared_email_id?: string | null
          stato?: string
          subject?: string | null
          sync_status?: string | null
          thread_id?: string | null
          to_email?: string
          updated_at?: string
          user_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_messages_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "email_provider"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_messages_shared_email_id_fkey"
            columns: ["shared_email_id"]
            isOneToOne: false
            referencedRelation: "shared_email_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_messages_topics: {
        Row: {
          created_at: string | null
          email_id: string
          topic_id: string
        }
        Insert: {
          created_at?: string | null
          email_id: string
          topic_id: string
        }
        Update: {
          created_at?: string | null
          email_id?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_messages_topics_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      email_pending_actions: {
        Row: {
          action_payload: Json
          action_type: string
          confidence: number | null
          created_at: string | null
          email_id: string
          executed_at: string | null
          id: string
          reasoning: string
          rejection_reason: string | null
          sender_email: string
          status: string | null
          suggested_response: string | null
          updated_at: string | null
          user_id: string
          user_modifications: Json | null
        }
        Insert: {
          action_payload?: Json
          action_type: string
          confidence?: number | null
          created_at?: string | null
          email_id: string
          executed_at?: string | null
          id?: string
          reasoning: string
          rejection_reason?: string | null
          sender_email: string
          status?: string | null
          suggested_response?: string | null
          updated_at?: string | null
          user_id: string
          user_modifications?: Json | null
        }
        Update: {
          action_payload?: Json
          action_type?: string
          confidence?: number | null
          created_at?: string | null
          email_id?: string
          executed_at?: string | null
          id?: string
          reasoning?: string
          rejection_reason?: string | null
          sender_email?: string
          status?: string | null
          suggested_response?: string | null
          updated_at?: string | null
          user_id?: string
          user_modifications?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "email_pending_actions_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      email_provider: {
        Row: {
          attivo: boolean
          cartella_inbox: string | null
          cartella_sent: string | null
          created_at: string
          dominio_invio: string | null
          email_username: string | null
          id: string
          imap_porta: number | null
          imap_server: string | null
          imap_sicurezza: string | null
          inbound_route: string | null
          intervallo_sync_minuti: number | null
          max_email_sync: number | null
          outbound_endpoint: string | null
          provider: string
          smtp_porta: number | null
          smtp_server: string | null
          smtp_sicurezza: string | null
          tipo_provider: string | null
          updated_at: string
        }
        Insert: {
          attivo?: boolean
          cartella_inbox?: string | null
          cartella_sent?: string | null
          created_at?: string
          dominio_invio?: string | null
          email_username?: string | null
          id?: string
          imap_porta?: number | null
          imap_server?: string | null
          imap_sicurezza?: string | null
          inbound_route?: string | null
          intervallo_sync_minuti?: number | null
          max_email_sync?: number | null
          outbound_endpoint?: string | null
          provider: string
          smtp_porta?: number | null
          smtp_server?: string | null
          smtp_sicurezza?: string | null
          tipo_provider?: string | null
          updated_at?: string
        }
        Update: {
          attivo?: boolean
          cartella_inbox?: string | null
          cartella_sent?: string | null
          created_at?: string
          dominio_invio?: string | null
          email_username?: string | null
          id?: string
          imap_porta?: number | null
          imap_server?: string | null
          imap_sicurezza?: string | null
          inbound_route?: string | null
          intervallo_sync_minuti?: number | null
          max_email_sync?: number | null
          outbound_endpoint?: string | null
          provider?: string
          smtp_porta?: number | null
          smtp_server?: string | null
          smtp_sicurezza?: string | null
          tipo_provider?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_provider_credenziali: {
        Row: {
          api_key: string
          created_at: string
          email_password: string | null
          id: string
          oauth_refresh_token: string | null
          oauth_token: string | null
          provider_id: string
          updated_at: string
          webhook_secret: string | null
        }
        Insert: {
          api_key: string
          created_at?: string
          email_password?: string | null
          id?: string
          oauth_refresh_token?: string | null
          oauth_token?: string | null
          provider_id: string
          updated_at?: string
          webhook_secret?: string | null
        }
        Update: {
          api_key?: string
          created_at?: string
          email_password?: string | null
          id?: string
          oauth_refresh_token?: string | null
          oauth_token?: string | null
          provider_id?: string
          updated_at?: string
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_provider_credenziali_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: true
            referencedRelation: "email_provider"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sender_actions: {
        Row: {
          action_params: Json | null
          action_type: Database["public"]["Enums"]["email_action_type"]
          created_at: string
          id: string
          sender_email: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          action_params?: Json | null
          action_type: Database["public"]["Enums"]["email_action_type"]
          created_at?: string
          id?: string
          sender_email: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          action_params?: Json | null
          action_type?: Database["public"]["Enums"]["email_action_type"]
          created_at?: string
          id?: string
          sender_email?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      email_sender_ai_prompts: {
        Row: {
          ai_config_id: string | null
          ai_prompt: string
          base_action: string | null
          base_action_params: Json | null
          created_at: string
          custom_actions: Json | null
          custom_prompt_additions: string | null
          execution_count: number | null
          failure_count: number | null
          id: string
          is_active: boolean | null
          last_executed_at: string | null
          priority: number | null
          prompt_description: string | null
          prompt_library_id: string | null
          prompt_name: string | null
          requires_confirmation: boolean
          sender_email: string
          success_count: number | null
          updated_at: string
          use_company_data: boolean | null
          use_contact_aliases: boolean | null
          use_email_templates: boolean | null
          user_id: string | null
        }
        Insert: {
          ai_config_id?: string | null
          ai_prompt: string
          base_action?: string | null
          base_action_params?: Json | null
          created_at?: string
          custom_actions?: Json | null
          custom_prompt_additions?: string | null
          execution_count?: number | null
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          last_executed_at?: string | null
          priority?: number | null
          prompt_description?: string | null
          prompt_library_id?: string | null
          prompt_name?: string | null
          requires_confirmation?: boolean
          sender_email: string
          success_count?: number | null
          updated_at?: string
          use_company_data?: boolean | null
          use_contact_aliases?: boolean | null
          use_email_templates?: boolean | null
          user_id?: string | null
        }
        Update: {
          ai_config_id?: string | null
          ai_prompt?: string
          base_action?: string | null
          base_action_params?: Json | null
          created_at?: string
          custom_actions?: Json | null
          custom_prompt_additions?: string | null
          execution_count?: number | null
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          last_executed_at?: string | null
          priority?: number | null
          prompt_description?: string | null
          prompt_library_id?: string | null
          prompt_name?: string | null
          requires_confirmation?: boolean
          sender_email?: string
          success_count?: number | null
          updated_at?: string
          use_company_data?: boolean | null
          use_contact_aliases?: boolean | null
          use_email_templates?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_sender_ai_prompts_ai_config_id_fkey"
            columns: ["ai_config_id"]
            isOneToOne: false
            referencedRelation: "config_ai"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sender_ai_prompts_prompt_library_id_fkey"
            columns: ["prompt_library_id"]
            isOneToOne: false
            referencedRelation: "ai_prompt_library"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sender_grouping_suggestions: {
        Row: {
          analyzed_at: string | null
          created_at: string | null
          id: string
          sender_email: string
          status: string | null
          suggested_groups: Json
          updated_at: string | null
          user_email: string
        }
        Insert: {
          analyzed_at?: string | null
          created_at?: string | null
          id?: string
          sender_email: string
          status?: string | null
          suggested_groups?: Json
          updated_at?: string | null
          user_email: string
        }
        Update: {
          analyzed_at?: string | null
          created_at?: string | null
          id?: string
          sender_email?: string
          status?: string | null
          suggested_groups?: Json
          updated_at?: string | null
          user_email?: string
        }
        Relationships: []
      }
      email_sender_grouping_suggestions_backup_20250107: {
        Row: {
          analyzed_at: string | null
          created_at: string | null
          id: string | null
          sender_email: string | null
          status: string | null
          suggested_groups: Json | null
          updated_at: string | null
          user_email: string | null
        }
        Insert: {
          analyzed_at?: string | null
          created_at?: string | null
          id?: string | null
          sender_email?: string | null
          status?: string | null
          suggested_groups?: Json | null
          updated_at?: string | null
          user_email?: string | null
        }
        Update: {
          analyzed_at?: string | null
          created_at?: string | null
          id?: string | null
          sender_email?: string | null
          status?: string | null
          suggested_groups?: Json | null
          updated_at?: string | null
          user_email?: string | null
        }
        Relationships: []
      }
      email_sender_groups: {
        Row: {
          colore: string | null
          created_at: string
          descrizione: string | null
          icon: string | null
          id: string
          nome_gruppo: string
          prompt_library_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          colore?: string | null
          created_at?: string
          descrizione?: string | null
          icon?: string | null
          id?: string
          nome_gruppo: string
          prompt_library_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          colore?: string | null
          created_at?: string
          descrizione?: string | null
          icon?: string | null
          id?: string
          nome_gruppo?: string
          prompt_library_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sender_groups_prompt_library_id_fkey"
            columns: ["prompt_library_id"]
            isOneToOne: false
            referencedRelation: "ai_prompt_library"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sender_groups_context: {
        Row: {
          context_summary: string
          created_at: string
          data_sufficiency: number | null
          generated_at: string
          group_id: string
          id: string
          model_used: string | null
          needs_refresh: boolean | null
          pattern_clarity: number | null
          quality_score: number | null
          refresh_reason: string | null
          sample_count: number
          sender_count: number
          sender_patterns: Json
          updated_at: string
          user_email: string
        }
        Insert: {
          context_summary: string
          created_at?: string
          data_sufficiency?: number | null
          generated_at?: string
          group_id: string
          id?: string
          model_used?: string | null
          needs_refresh?: boolean | null
          pattern_clarity?: number | null
          quality_score?: number | null
          refresh_reason?: string | null
          sample_count?: number
          sender_count?: number
          sender_patterns?: Json
          updated_at?: string
          user_email: string
        }
        Update: {
          context_summary?: string
          created_at?: string
          data_sufficiency?: number | null
          generated_at?: string
          group_id?: string
          id?: string
          model_used?: string | null
          needs_refresh?: boolean | null
          pattern_clarity?: number | null
          quality_score?: number | null
          refresh_reason?: string | null
          sample_count?: number
          sender_count?: number
          sender_patterns?: Json
          updated_at?: string
          user_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sender_groups_context_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "email_sender_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sender_rules: {
        Row: {
          created_at: string
          group_id: string
          id: string
          sender_email: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          sender_email: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          sender_email?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_sender_rules_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "email_sender_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      email_ssl_config: {
        Row: {
          accept_self_signed: boolean
          ca_bundle: string | null
          created_at: string
          id: string
          provider_id: string
          updated_at: string
          verify_hostname: boolean
        }
        Insert: {
          accept_self_signed?: boolean
          ca_bundle?: string | null
          created_at?: string
          id?: string
          provider_id: string
          updated_at?: string
          verify_hostname?: boolean
        }
        Update: {
          accept_self_signed?: boolean
          ca_bundle?: string | null
          created_at?: string
          id?: string
          provider_id?: string
          updated_at?: string
          verify_hostname?: boolean
        }
        Relationships: []
      }
      email_sync_logs: {
        Row: {
          completed_batches: number | null
          created_at: string
          errori: Json | null
          id: string
          last_processed_offset: number | null
          messaggi_aggiornati: number | null
          messaggi_nuovi: number | null
          messaggi_sincronizzati: number | null
          provider_id: string
          stato: string
          sync_end: string | null
          sync_start: string
          tipo_sync: string
          total_batches: number | null
          user_email: string | null
        }
        Insert: {
          completed_batches?: number | null
          created_at?: string
          errori?: Json | null
          id?: string
          last_processed_offset?: number | null
          messaggi_aggiornati?: number | null
          messaggi_nuovi?: number | null
          messaggi_sincronizzati?: number | null
          provider_id: string
          stato?: string
          sync_end?: string | null
          sync_start?: string
          tipo_sync: string
          total_batches?: number | null
          user_email?: string | null
        }
        Update: {
          completed_batches?: number | null
          created_at?: string
          errori?: Json | null
          id?: string
          last_processed_offset?: number | null
          messaggi_aggiornati?: number | null
          messaggi_nuovi?: number | null
          messaggi_sincronizzati?: number | null
          provider_id?: string
          stato?: string
          sync_end?: string | null
          sync_start?: string
          tipo_sync?: string
          total_batches?: number | null
          user_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_sync_logs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "email_provider"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sync_preferences: {
        Row: {
          created_at: string | null
          date_filter_months: number | null
          default_sync_mode: string | null
          excluded_folders: Json | null
          id: string
          included_folders: Json | null
          last_sync_at: string | null
          updated_at: string | null
          user_email: string
        }
        Insert: {
          created_at?: string | null
          date_filter_months?: number | null
          default_sync_mode?: string | null
          excluded_folders?: Json | null
          id?: string
          included_folders?: Json | null
          last_sync_at?: string | null
          updated_at?: string | null
          user_email: string
        }
        Update: {
          created_at?: string | null
          date_filter_months?: number | null
          default_sync_mode?: string | null
          excluded_folders?: Json | null
          id?: string
          included_folders?: Json | null
          last_sync_at?: string | null
          updated_at?: string | null
          user_email?: string
        }
        Relationships: []
      }
      email_sync_progress: {
        Row: {
          batch_size: number
          completed_at: string | null
          completed_folders: Json | null
          current_batch: number
          current_folder: string | null
          downloaded_in_folder: number | null
          errors: Json | null
          eta: number | null
          folder_name: string
          folders_to_sync: Json | null
          id: string
          job_id: string | null
          last_offset: number
          processed_messages: number
          speed: number | null
          started_at: string
          status: string
          sync_log_id: string | null
          total_in_folder: number | null
          total_messages: number
          updated_at: string
          user_email: string | null
        }
        Insert: {
          batch_size?: number
          completed_at?: string | null
          completed_folders?: Json | null
          current_batch?: number
          current_folder?: string | null
          downloaded_in_folder?: number | null
          errors?: Json | null
          eta?: number | null
          folder_name: string
          folders_to_sync?: Json | null
          id?: string
          job_id?: string | null
          last_offset?: number
          processed_messages?: number
          speed?: number | null
          started_at?: string
          status?: string
          sync_log_id?: string | null
          total_in_folder?: number | null
          total_messages?: number
          updated_at?: string
          user_email?: string | null
        }
        Update: {
          batch_size?: number
          completed_at?: string | null
          completed_folders?: Json | null
          current_batch?: number
          current_folder?: string | null
          downloaded_in_folder?: number | null
          errors?: Json | null
          eta?: number | null
          folder_name?: string
          folders_to_sync?: Json | null
          id?: string
          job_id?: string | null
          last_offset?: number
          processed_messages?: number
          speed?: number | null
          started_at?: string
          status?: string
          sync_log_id?: string | null
          total_in_folder?: number | null
          total_messages?: number
          updated_at?: string
          user_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_sync_progress_sync_log_id_fkey"
            columns: ["sync_log_id"]
            isOneToOne: false
            referencedRelation: "email_sync_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      email_temp_index: {
        Row: {
          created_at: string
          date: string
          folder: string
          from_email: string
          from_name: string | null
          size: number | null
          status: string
          subject: string | null
          uid: string
          user_email: string
        }
        Insert: {
          created_at?: string
          date: string
          folder: string
          from_email: string
          from_name?: string | null
          size?: number | null
          status?: string
          subject?: string | null
          uid: string
          user_email: string
        }
        Update: {
          created_at?: string
          date?: string
          folder?: string
          from_email?: string
          from_name?: string | null
          size?: number | null
          status?: string
          subject?: string | null
          uid?: string
          user_email?: string
        }
        Relationships: []
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
      email_tools_config: {
        Row: {
          config_data: Json | null
          created_at: string | null
          id: string
          is_enabled: boolean | null
          tool_name: string
          tool_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          config_data?: Json | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          tool_name: string
          tool_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          config_data?: Json | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          tool_name?: string
          tool_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_topics: {
        Row: {
          context_summary: string | null
          created_at: string | null
          first_mention_at: string | null
          id: string
          last_mention_at: string | null
          mention_count: number | null
          metadata: Json | null
          related_emails: string[] | null
          topic_key: string
          topic_type: string
          topic_value: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          context_summary?: string | null
          created_at?: string | null
          first_mention_at?: string | null
          id?: string
          last_mention_at?: string | null
          mention_count?: number | null
          metadata?: Json | null
          related_emails?: string[] | null
          topic_key: string
          topic_type: string
          topic_value: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          context_summary?: string | null
          created_at?: string | null
          first_mention_at?: string | null
          id?: string
          last_mention_at?: string | null
          mention_count?: number | null
          metadata?: Json | null
          related_emails?: string[] | null
          topic_key?: string
          topic_type?: string
          topic_value?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      file_imports: {
        Row: {
          archived_at: string | null
          backup_file_path: string | null
          created_at: string
          deleted_at: string | null
          file_content: string
          file_name: string
          file_path: string
          file_size: number
          headers_detected: Json | null
          id: string
          import_log_id: string | null
          separator_detected: string | null
          stato: string
          total_rows: number | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          backup_file_path?: string | null
          created_at?: string
          deleted_at?: string | null
          file_content: string
          file_name: string
          file_path: string
          file_size: number
          headers_detected?: Json | null
          id?: string
          import_log_id?: string | null
          separator_detected?: string | null
          stato?: string
          total_rows?: number | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          backup_file_path?: string | null
          created_at?: string
          deleted_at?: string | null
          file_content?: string
          file_name?: string
          file_path?: string
          file_size?: number
          headers_detected?: Json | null
          id?: string
          import_log_id?: string | null
          separator_detected?: string | null
          stato?: string
          total_rows?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_imports_import_log_id_fkey"
            columns: ["import_log_id"]
            isOneToOne: false
            referencedRelation: "import_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      import_errors: {
        Row: {
          ai_suggestions: Json | null
          attempted_corrections: number | null
          corrected_data: Json | null
          created_at: string
          error_message: string | null
          error_type: string | null
          id: string
          import_log_id: string
          raw_data: Json
          row_number: number | null
          status: string | null
          updated_at: string
        }
        Insert: {
          ai_suggestions?: Json | null
          attempted_corrections?: number | null
          corrected_data?: Json | null
          created_at?: string
          error_message?: string | null
          error_type?: string | null
          id?: string
          import_log_id: string
          raw_data: Json
          row_number?: number | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          ai_suggestions?: Json | null
          attempted_corrections?: number | null
          corrected_data?: Json | null
          created_at?: string
          error_message?: string | null
          error_type?: string | null
          id?: string
          import_log_id?: string
          raw_data?: Json
          row_number?: number | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_errors_import_log_id_fkey"
            columns: ["import_log_id"]
            isOneToOne: false
            referencedRelation: "import_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      import_logs: {
        Row: {
          archived_at: string | null
          completed_at: string | null
          contatti_selezionati: number | null
          created_at: string
          deleted_at: string | null
          errori: Json | null
          file_name: string
          file_path: string
          final_file_id: string | null
          final_file_path: string | null
          id: string
          last_batch_at: string | null
          nome_tabella_temporanea: string | null
          normalization_method: string | null
          processing_batch: number | null
          righe_errori: number | null
          righe_importate: number | null
          righe_totali: number | null
          stato: string
          total_batches: number | null
          trasferiti_rubrica: boolean | null
          utente_id: string | null
        }
        Insert: {
          archived_at?: string | null
          completed_at?: string | null
          contatti_selezionati?: number | null
          created_at?: string
          deleted_at?: string | null
          errori?: Json | null
          file_name: string
          file_path: string
          final_file_id?: string | null
          final_file_path?: string | null
          id?: string
          last_batch_at?: string | null
          nome_tabella_temporanea?: string | null
          normalization_method?: string | null
          processing_batch?: number | null
          righe_errori?: number | null
          righe_importate?: number | null
          righe_totali?: number | null
          stato?: string
          total_batches?: number | null
          trasferiti_rubrica?: boolean | null
          utente_id?: string | null
        }
        Update: {
          archived_at?: string | null
          completed_at?: string | null
          contatti_selezionati?: number | null
          created_at?: string
          deleted_at?: string | null
          errori?: Json | null
          file_name?: string
          file_path?: string
          final_file_id?: string | null
          final_file_path?: string | null
          id?: string
          last_batch_at?: string | null
          nome_tabella_temporanea?: string | null
          normalization_method?: string | null
          processing_batch?: number | null
          righe_errori?: number | null
          righe_importate?: number | null
          righe_totali?: number | null
          stato?: string
          total_batches?: number | null
          trasferiti_rubrica?: boolean | null
          utente_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_logs_final_file_id_fkey"
            columns: ["final_file_id"]
            isOneToOne: false
            referencedRelation: "file_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      imported_contacts: {
        Row: {
          address: string | null
          agent_id: string | null
          alias: string | null
          archiviata: boolean | null
          cell: string | null
          city: string | null
          client_code: string | null
          commercial_anagrafiche_id: string | null
          company_alias: string | null
          company_name: string | null
          completed: boolean | null
          country: string | null
          created_at: string
          created_by: string | null
          email: string | null
          has_actions: boolean | null
          id: string
          import_log_id: string
          is_imported_to_rubrica: boolean | null
          last_contact: string | null
          meta_air_freight: boolean | null
          meta_client: boolean | null
          meta_contact_required_email: boolean | null
          meta_exclient: boolean | null
          meta_express: boolean | null
          meta_exworks: boolean | null
          meta_hight_value_customer: boolean | null
          meta_interested: boolean | null
          meta_presentation: boolean | null
          meta_reception_required_email: boolean | null
          meta_rejected: boolean | null
          meta_sea_freight: boolean | null
          meta_tutorial: boolean | null
          meta_wca: boolean | null
          name: string | null
          next_contact_date: string | null
          note: string | null
          origin: string | null
          original_id: string | null
          phone: string | null
          position: string | null
          row_number: number | null
          scheduled_contact: string | null
          state: string | null
          stato: string | null
          title: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          agent_id?: string | null
          alias?: string | null
          archiviata?: boolean | null
          cell?: string | null
          city?: string | null
          client_code?: string | null
          commercial_anagrafiche_id?: string | null
          company_alias?: string | null
          company_name?: string | null
          completed?: boolean | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          has_actions?: boolean | null
          id?: string
          import_log_id: string
          is_imported_to_rubrica?: boolean | null
          last_contact?: string | null
          meta_air_freight?: boolean | null
          meta_client?: boolean | null
          meta_contact_required_email?: boolean | null
          meta_exclient?: boolean | null
          meta_express?: boolean | null
          meta_exworks?: boolean | null
          meta_hight_value_customer?: boolean | null
          meta_interested?: boolean | null
          meta_presentation?: boolean | null
          meta_reception_required_email?: boolean | null
          meta_rejected?: boolean | null
          meta_sea_freight?: boolean | null
          meta_tutorial?: boolean | null
          meta_wca?: boolean | null
          name?: string | null
          next_contact_date?: string | null
          note?: string | null
          origin?: string | null
          original_id?: string | null
          phone?: string | null
          position?: string | null
          row_number?: number | null
          scheduled_contact?: string | null
          state?: string | null
          stato?: string | null
          title?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          agent_id?: string | null
          alias?: string | null
          archiviata?: boolean | null
          cell?: string | null
          city?: string | null
          client_code?: string | null
          commercial_anagrafiche_id?: string | null
          company_alias?: string | null
          company_name?: string | null
          completed?: boolean | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          has_actions?: boolean | null
          id?: string
          import_log_id?: string
          is_imported_to_rubrica?: boolean | null
          last_contact?: string | null
          meta_air_freight?: boolean | null
          meta_client?: boolean | null
          meta_contact_required_email?: boolean | null
          meta_exclient?: boolean | null
          meta_express?: boolean | null
          meta_exworks?: boolean | null
          meta_hight_value_customer?: boolean | null
          meta_interested?: boolean | null
          meta_presentation?: boolean | null
          meta_reception_required_email?: boolean | null
          meta_rejected?: boolean | null
          meta_sea_freight?: boolean | null
          meta_tutorial?: boolean | null
          meta_wca?: boolean | null
          name?: string | null
          next_contact_date?: string | null
          note?: string | null
          origin?: string | null
          original_id?: string | null
          phone?: string | null
          position?: string | null
          row_number?: number | null
          scheduled_contact?: string | null
          state?: string | null
          stato?: string | null
          title?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imported_contacts_import_log_id_fkey"
            columns: ["import_log_id"]
            isOneToOne: false
            referencedRelation: "import_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      imported_contacts_archiviati: {
        Row: {
          address: string | null
          agent_id: string | null
          alias: string | null
          archiviata: boolean | null
          archiviato_da: string | null
          cell: string | null
          city: string | null
          client_code: string | null
          commercial_anagrafiche_id: string | null
          company_alias: string | null
          company_name: string | null
          completed: boolean | null
          country: string | null
          created_at: string
          created_by: string | null
          data_archiviazione: string
          email: string | null
          has_actions: boolean | null
          id: string
          import_log_id: string | null
          imported_contact_id_originale: string
          is_imported_to_rubrica: boolean | null
          last_contact: string | null
          meta_air_freight: boolean | null
          meta_client: boolean | null
          meta_contact_required_email: boolean | null
          meta_exclient: boolean | null
          meta_express: boolean | null
          meta_exworks: boolean | null
          meta_hight_value_customer: boolean | null
          meta_interested: boolean | null
          meta_presentation: boolean | null
          meta_reception_required_email: boolean | null
          meta_rejected: boolean | null
          meta_sea_freight: boolean | null
          meta_tutorial: boolean | null
          meta_wca: boolean | null
          motivo_archiviazione: string | null
          name: string | null
          next_contact_date: string | null
          note: string | null
          origin: string | null
          original_id: string | null
          phone: string | null
          position: string | null
          row_number: number | null
          scheduled_contact: string | null
          state: string | null
          stato: string | null
          title: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          agent_id?: string | null
          alias?: string | null
          archiviata?: boolean | null
          archiviato_da?: string | null
          cell?: string | null
          city?: string | null
          client_code?: string | null
          commercial_anagrafiche_id?: string | null
          company_alias?: string | null
          company_name?: string | null
          completed?: boolean | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          data_archiviazione?: string
          email?: string | null
          has_actions?: boolean | null
          id?: string
          import_log_id?: string | null
          imported_contact_id_originale: string
          is_imported_to_rubrica?: boolean | null
          last_contact?: string | null
          meta_air_freight?: boolean | null
          meta_client?: boolean | null
          meta_contact_required_email?: boolean | null
          meta_exclient?: boolean | null
          meta_express?: boolean | null
          meta_exworks?: boolean | null
          meta_hight_value_customer?: boolean | null
          meta_interested?: boolean | null
          meta_presentation?: boolean | null
          meta_reception_required_email?: boolean | null
          meta_rejected?: boolean | null
          meta_sea_freight?: boolean | null
          meta_tutorial?: boolean | null
          meta_wca?: boolean | null
          motivo_archiviazione?: string | null
          name?: string | null
          next_contact_date?: string | null
          note?: string | null
          origin?: string | null
          original_id?: string | null
          phone?: string | null
          position?: string | null
          row_number?: number | null
          scheduled_contact?: string | null
          state?: string | null
          stato?: string | null
          title?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          agent_id?: string | null
          alias?: string | null
          archiviata?: boolean | null
          archiviato_da?: string | null
          cell?: string | null
          city?: string | null
          client_code?: string | null
          commercial_anagrafiche_id?: string | null
          company_alias?: string | null
          company_name?: string | null
          completed?: boolean | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          data_archiviazione?: string
          email?: string | null
          has_actions?: boolean | null
          id?: string
          import_log_id?: string | null
          imported_contact_id_originale?: string
          is_imported_to_rubrica?: boolean | null
          last_contact?: string | null
          meta_air_freight?: boolean | null
          meta_client?: boolean | null
          meta_contact_required_email?: boolean | null
          meta_exclient?: boolean | null
          meta_express?: boolean | null
          meta_exworks?: boolean | null
          meta_hight_value_customer?: boolean | null
          meta_interested?: boolean | null
          meta_presentation?: boolean | null
          meta_reception_required_email?: boolean | null
          meta_rejected?: boolean | null
          meta_sea_freight?: boolean | null
          meta_tutorial?: boolean | null
          meta_wca?: boolean | null
          motivo_archiviazione?: string | null
          name?: string | null
          next_contact_date?: string | null
          note?: string | null
          origin?: string | null
          original_id?: string | null
          phone?: string | null
          position?: string | null
          row_number?: number | null
          scheduled_contact?: string | null
          state?: string | null
          stato?: string | null
          title?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      intranet_global_ai_prompt: {
        Row: {
          attivo: boolean
          created_at: string
          id: string
          nome: string
          prompt_contenuto: string
          updated_at: string
        }
        Insert: {
          attivo?: boolean
          created_at?: string
          id?: string
          nome?: string
          prompt_contenuto: string
          updated_at?: string
        }
        Update: {
          attivo?: boolean
          created_at?: string
          id?: string
          nome?: string
          prompt_contenuto?: string
          updated_at?: string
        }
        Relationships: []
      }
      intranet_messages: {
        Row: {
          attachment_url: string | null
          content: string
          content_summary: string | null
          content_user_friendly: string | null
          created_at: string
          id: string
          is_summary_available: boolean | null
          is_system_message: boolean | null
          message_type: string
          room_id: string
          user_id: string
        }
        Insert: {
          attachment_url?: string | null
          content: string
          content_summary?: string | null
          content_user_friendly?: string | null
          created_at?: string
          id?: string
          is_summary_available?: boolean | null
          is_system_message?: boolean | null
          message_type?: string
          room_id: string
          user_id: string
        }
        Update: {
          attachment_url?: string | null
          content?: string
          content_summary?: string | null
          content_user_friendly?: string | null
          created_at?: string
          id?: string
          is_summary_available?: boolean | null
          is_system_message?: boolean | null
          message_type?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intranet_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "intranet_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      intranet_room_access_requests: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          is_invite: boolean
          message: string | null
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          room_id: string
          status: Database["public"]["Enums"]["access_request_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          is_invite?: boolean
          message?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          room_id: string
          status?: Database["public"]["Enums"]["access_request_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          is_invite?: boolean
          message?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          room_id?: string
          status?: Database["public"]["Enums"]["access_request_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intranet_room_access_requests_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "intranet_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      intranet_room_ai_prompts: {
        Row: {
          ai_context_messages: number
          ai_invocations_count: number
          ai_max_invocations: number
          created_at: string
          custom_prompt: string | null
          enable_ai: boolean
          enable_auto_speaker: boolean
          enable_moderation: boolean
          enable_suggestions: boolean
          enable_translation: boolean
          id: string
          is_using_standard: boolean
          moderation_prompt: string | null
          room_id: string
          updated_at: string
        }
        Insert: {
          ai_context_messages?: number
          ai_invocations_count?: number
          ai_max_invocations?: number
          created_at?: string
          custom_prompt?: string | null
          enable_ai?: boolean
          enable_auto_speaker?: boolean
          enable_moderation?: boolean
          enable_suggestions?: boolean
          enable_translation?: boolean
          id?: string
          is_using_standard?: boolean
          moderation_prompt?: string | null
          room_id: string
          updated_at?: string
        }
        Update: {
          ai_context_messages?: number
          ai_invocations_count?: number
          ai_max_invocations?: number
          created_at?: string
          custom_prompt?: string | null
          enable_ai?: boolean
          enable_auto_speaker?: boolean
          enable_moderation?: boolean
          enable_suggestions?: boolean
          enable_translation?: boolean
          id?: string
          is_using_standard?: boolean
          moderation_prompt?: string | null
          room_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intranet_room_ai_prompts_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: true
            referencedRelation: "intranet_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      intranet_room_members: {
        Row: {
          id: string
          joined_at: string
          room_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          room_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intranet_room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "intranet_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      intranet_rooms: {
        Row: {
          access_type: Database["public"]["Enums"]["room_access_type"]
          created_at: string
          created_by: string | null
          description: string | null
          economy_mode: boolean | null
          id: string
          is_private: boolean | null
          last_compaction_at: string | null
          last_token_update: string | null
          name: string
          show_summaries_only: boolean | null
          token_count_current: number | null
          token_count_total: number | null
          updated_at: string
        }
        Insert: {
          access_type?: Database["public"]["Enums"]["room_access_type"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          economy_mode?: boolean | null
          id?: string
          is_private?: boolean | null
          last_compaction_at?: string | null
          last_token_update?: string | null
          name: string
          show_summaries_only?: boolean | null
          token_count_current?: number | null
          token_count_total?: number | null
          updated_at?: string
        }
        Update: {
          access_type?: Database["public"]["Enums"]["room_access_type"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          economy_mode?: boolean | null
          id?: string
          is_private?: boolean | null
          last_compaction_at?: string | null
          last_token_update?: string | null
          name?: string
          show_summaries_only?: boolean | null
          token_count_current?: number | null
          token_count_total?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      intranet_user_room_status: {
        Row: {
          created_at: string | null
          id: string
          last_read_at: string | null
          room_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_read_at?: string | null
          room_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_read_at?: string | null
          room_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intranet_user_room_status_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "intranet_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base_documents: {
        Row: {
          access_count: number | null
          chunk_index: number | null
          content: string
          content_hash: string
          content_type: string
          created_at: string
          embedding: string | null
          file_path: string | null
          id: string
          kb_id: string
          metadata: Json | null
          tags: string[] | null
          title: string
          topic_tags: string[] | null
          updated_at: string
        }
        Insert: {
          access_count?: number | null
          chunk_index?: number | null
          content: string
          content_hash: string
          content_type?: string
          created_at?: string
          embedding?: string | null
          file_path?: string | null
          id?: string
          kb_id: string
          metadata?: Json | null
          tags?: string[] | null
          title: string
          topic_tags?: string[] | null
          updated_at?: string
        }
        Update: {
          access_count?: number | null
          chunk_index?: number | null
          content?: string
          content_hash?: string
          content_type?: string
          created_at?: string
          embedding?: string | null
          file_path?: string | null
          id?: string
          kb_id?: string
          metadata?: Json | null
          tags?: string[] | null
          title?: string
          topic_tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_documents_kb_id_fkey"
            columns: ["kb_id"]
            isOneToOne: false
            referencedRelation: "knowledge_bases"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_bases: {
        Row: {
          access_count: number | null
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          level: number
          name: string
          parent_id: string | null
          prompt_template: string
          slug: string
          tags: string[] | null
          transition_triggers: string[] | null
          updated_at: string
        }
        Insert: {
          access_count?: number | null
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          level?: number
          name: string
          parent_id?: string | null
          prompt_template: string
          slug: string
          tags?: string[] | null
          transition_triggers?: string[] | null
          updated_at?: string
        }
        Update: {
          access_count?: number | null
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          level?: number
          name?: string
          parent_id?: string | null
          prompt_template?: string
          slug?: string
          tags?: string[] | null
          transition_triggers?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_bases_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "knowledge_bases"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_edges: {
        Row: {
          conversation_id: string
          created_at: string
          edge_type: Database["public"]["Enums"]["knowledge_edge_type"]
          id: string
          metadata: Json | null
          source_node_id: string
          target_node_id: string
          weight: number | null
        }
        Insert: {
          conversation_id: string
          created_at?: string
          edge_type: Database["public"]["Enums"]["knowledge_edge_type"]
          id?: string
          metadata?: Json | null
          source_node_id: string
          target_node_id: string
          weight?: number | null
        }
        Update: {
          conversation_id?: string
          created_at?: string
          edge_type?: Database["public"]["Enums"]["knowledge_edge_type"]
          id?: string
          metadata?: Json | null
          source_node_id?: string
          target_node_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_edges_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_laboratory_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_edges_source_node_id_fkey"
            columns: ["source_node_id"]
            isOneToOne: false
            referencedRelation: "knowledge_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_edges_target_node_id_fkey"
            columns: ["target_node_id"]
            isOneToOne: false
            referencedRelation: "knowledge_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_nodes: {
        Row: {
          confidence: number | null
          conversation_id: string
          created_at: string
          embedding: string | null
          id: string
          metadata: Json | null
          node_type: Database["public"]["Enums"]["knowledge_node_type"]
          source_msg_id: string | null
          text: string
          updated_at: string
        }
        Insert: {
          confidence?: number | null
          conversation_id: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          node_type: Database["public"]["Enums"]["knowledge_node_type"]
          source_msg_id?: string | null
          text: string
          updated_at?: string
        }
        Update: {
          confidence?: number | null
          conversation_id?: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          node_type?: Database["public"]["Enums"]["knowledge_node_type"]
          source_msg_id?: string | null
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_nodes_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_laboratory_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_nodes_source_msg_id_fkey"
            columns: ["source_msg_id"]
            isOneToOne: false
            referencedRelation: "chat_laboratory_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      orchestrator_test_configs: {
        Row: {
          active_kb_id: string | null
          config_name: string
          created_at: string | null
          enable_direct_calls: boolean | null
          id: string
          is_favorite: boolean | null
          pause_between_turns_ms: number | null
          selected_topic: string | null
          turn_strategy: string | null
          updated_at: string | null
          user_id: string | null
          voice_enabled: boolean | null
        }
        Insert: {
          active_kb_id?: string | null
          config_name: string
          created_at?: string | null
          enable_direct_calls?: boolean | null
          id?: string
          is_favorite?: boolean | null
          pause_between_turns_ms?: number | null
          selected_topic?: string | null
          turn_strategy?: string | null
          updated_at?: string | null
          user_id?: string | null
          voice_enabled?: boolean | null
        }
        Update: {
          active_kb_id?: string | null
          config_name?: string
          created_at?: string | null
          enable_direct_calls?: boolean | null
          id?: string
          is_favorite?: boolean | null
          pause_between_turns_ms?: number | null
          selected_topic?: string | null
          turn_strategy?: string | null
          updated_at?: string | null
          user_id?: string | null
          voice_enabled?: boolean | null
        }
        Relationships: []
      }
      orchestrator_test_results: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          error_message: string | null
          id: string
          input_message: string
          response_time_ms: number | null
          selected_agent: string | null
          success: boolean | null
          test_config: Json
          tokens_input: number | null
          tokens_output: number | null
          user_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          input_message: string
          response_time_ms?: number | null
          selected_agent?: string | null
          success?: boolean | null
          test_config: Json
          tokens_input?: number | null
          tokens_output?: number | null
          user_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          input_message?: string
          response_time_ms?: number | null
          selected_agent?: string | null
          success?: boolean | null
          test_config?: Json
          tokens_input?: number | null
          tokens_output?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orchestrator_test_results_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_laboratory_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      page_system_prompts: {
        Row: {
          attivo: boolean
          created_at: string
          id: string
          page_name: string
          page_route: string
          system_prompt: string
          updated_at: string
        }
        Insert: {
          attivo?: boolean
          created_at?: string
          id?: string
          page_name: string
          page_route: string
          system_prompt: string
          updated_at?: string
        }
        Update: {
          attivo?: boolean
          created_at?: string
          id?: string
          page_name?: string
          page_route?: string
          system_prompt?: string
          updated_at?: string
        }
        Relationships: []
      }
      performance_profiles: {
        Row: {
          avg_response_time_ms: number | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          optimization_flags: Json
          profile_name: string
          source_benchmark_id: string | null
          source_test_name: string | null
          success_rate: number | null
          total_tests_run: number | null
          updated_at: string | null
          usage_count: number | null
          user_id: string
        }
        Insert: {
          avg_response_time_ms?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          optimization_flags?: Json
          profile_name: string
          source_benchmark_id?: string | null
          source_test_name?: string | null
          success_rate?: number | null
          total_tests_run?: number | null
          updated_at?: string | null
          usage_count?: number | null
          user_id: string
        }
        Update: {
          avg_response_time_ms?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          optimization_flags?: Json
          profile_name?: string
          source_benchmark_id?: string | null
          source_test_name?: string | null
          success_rate?: number | null
          total_tests_run?: number | null
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_profiles_source_benchmark_id_fkey"
            columns: ["source_benchmark_id"]
            isOneToOne: false
            referencedRelation: "tmwe_api_benchmark_results"
            referencedColumns: ["id"]
          },
        ]
      }
      project_history: {
        Row: {
          created_at: string | null
          file_modified: string | null
          id: string
          metadata: Json | null
          operation: string
          tables_modified: string[] | null
          timestamp: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          file_modified?: string | null
          id?: string
          metadata?: Json | null
          operation: string
          tables_modified?: string[] | null
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          file_modified?: string | null
          id?: string
          metadata?: Json | null
          operation?: string
          tables_modified?: string[] | null
          timestamp?: string
          user_id?: string | null
        }
        Relationships: []
      }
      project_source_files: {
        Row: {
          content: string
          content_search: unknown
          created_at: string | null
          exports: Json | null
          file_path: string
          file_size: number
          file_type: string
          has_hooks: boolean | null
          has_supabase_queries: boolean | null
          id: string
          imports: Json | null
          last_synced_at: string | null
          line_count: number
        }
        Insert: {
          content: string
          content_search?: unknown
          created_at?: string | null
          exports?: Json | null
          file_path: string
          file_size: number
          file_type: string
          has_hooks?: boolean | null
          has_supabase_queries?: boolean | null
          id?: string
          imports?: Json | null
          last_synced_at?: string | null
          line_count: number
        }
        Update: {
          content?: string
          content_search?: unknown
          created_at?: string | null
          exports?: Json | null
          file_path?: string
          file_size?: number
          file_type?: string
          has_hooks?: boolean | null
          has_supabase_queries?: boolean | null
          id?: string
          imports?: Json | null
          last_synced_at?: string | null
          line_count?: number
        }
        Relationships: []
      }
      rubrica: {
        Row: {
          alias: string | null
          archiviata: boolean | null
          azienda: string | null
          cellulare: string | null
          citta: string | null
          client_code: string | null
          company_alias: string | null
          completed: boolean | null
          created_at: string
          created_by: string | null
          email: string | null
          has_actions: boolean | null
          id: string
          indirizzo: string | null
          last_contact: string | null
          meta_air_freight: boolean | null
          meta_client: boolean | null
          meta_contact_required_email: boolean | null
          meta_exclient: boolean | null
          meta_express: boolean | null
          meta_exworks: boolean | null
          meta_hight_value_customer: boolean | null
          meta_interested: boolean | null
          meta_presentation: boolean | null
          meta_reception_required_email: boolean | null
          meta_rejected: boolean | null
          meta_sea_freight: boolean | null
          meta_tutorial: boolean | null
          meta_wca: boolean | null
          next_contact_date: string | null
          nome: string | null
          note: string | null
          origine: string | null
          paese: string | null
          position: string | null
          responsabile: string | null
          scheduled_contact: string | null
          state: string | null
          stato: string | null
          tags: string[] | null
          telefono: string | null
          title: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          alias?: string | null
          archiviata?: boolean | null
          azienda?: string | null
          cellulare?: string | null
          citta?: string | null
          client_code?: string | null
          company_alias?: string | null
          completed?: boolean | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          has_actions?: boolean | null
          id?: string
          indirizzo?: string | null
          last_contact?: string | null
          meta_air_freight?: boolean | null
          meta_client?: boolean | null
          meta_contact_required_email?: boolean | null
          meta_exclient?: boolean | null
          meta_express?: boolean | null
          meta_exworks?: boolean | null
          meta_hight_value_customer?: boolean | null
          meta_interested?: boolean | null
          meta_presentation?: boolean | null
          meta_reception_required_email?: boolean | null
          meta_rejected?: boolean | null
          meta_sea_freight?: boolean | null
          meta_tutorial?: boolean | null
          meta_wca?: boolean | null
          next_contact_date?: string | null
          nome?: string | null
          note?: string | null
          origine?: string | null
          paese?: string | null
          position?: string | null
          responsabile?: string | null
          scheduled_contact?: string | null
          state?: string | null
          stato?: string | null
          tags?: string[] | null
          telefono?: string | null
          title?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          alias?: string | null
          archiviata?: boolean | null
          azienda?: string | null
          cellulare?: string | null
          citta?: string | null
          client_code?: string | null
          company_alias?: string | null
          completed?: boolean | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          has_actions?: boolean | null
          id?: string
          indirizzo?: string | null
          last_contact?: string | null
          meta_air_freight?: boolean | null
          meta_client?: boolean | null
          meta_contact_required_email?: boolean | null
          meta_exclient?: boolean | null
          meta_express?: boolean | null
          meta_exworks?: boolean | null
          meta_hight_value_customer?: boolean | null
          meta_interested?: boolean | null
          meta_presentation?: boolean | null
          meta_reception_required_email?: boolean | null
          meta_rejected?: boolean | null
          meta_sea_freight?: boolean | null
          meta_tutorial?: boolean | null
          meta_wca?: boolean | null
          next_contact_date?: string | null
          nome?: string | null
          note?: string | null
          origine?: string | null
          paese?: string | null
          position?: string | null
          responsabile?: string | null
          scheduled_contact?: string | null
          state?: string | null
          stato?: string | null
          tags?: string[] | null
          telefono?: string | null
          title?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      rubrica_archiviata: {
        Row: {
          alias: string | null
          archiviata: boolean | null
          archiviato_da: string | null
          azienda: string | null
          cellulare: string | null
          citta: string | null
          client_code: string | null
          company_alias: string | null
          completed: boolean | null
          created_at: string
          created_by: string | null
          data_archiviazione: string
          email: string | null
          has_actions: boolean | null
          id: string
          indirizzo: string | null
          last_contact: string | null
          meta_air_freight: boolean | null
          meta_client: boolean | null
          meta_contact_required_email: boolean | null
          meta_exclient: boolean | null
          meta_express: boolean | null
          meta_exworks: boolean | null
          meta_hight_value_customer: boolean | null
          meta_interested: boolean | null
          meta_presentation: boolean | null
          meta_reception_required_email: boolean | null
          meta_rejected: boolean | null
          meta_sea_freight: boolean | null
          meta_tutorial: boolean | null
          meta_wca: boolean | null
          motivo_archiviazione: string | null
          next_contact_date: string | null
          nome: string | null
          note: string | null
          origine: string | null
          paese: string | null
          position: string | null
          responsabile: string | null
          rubrica_id_originale: string
          scheduled_contact: string | null
          state: string | null
          stato: string | null
          tags: string[] | null
          telefono: string | null
          title: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          alias?: string | null
          archiviata?: boolean | null
          archiviato_da?: string | null
          azienda?: string | null
          cellulare?: string | null
          citta?: string | null
          client_code?: string | null
          company_alias?: string | null
          completed?: boolean | null
          created_at?: string
          created_by?: string | null
          data_archiviazione?: string
          email?: string | null
          has_actions?: boolean | null
          id?: string
          indirizzo?: string | null
          last_contact?: string | null
          meta_air_freight?: boolean | null
          meta_client?: boolean | null
          meta_contact_required_email?: boolean | null
          meta_exclient?: boolean | null
          meta_express?: boolean | null
          meta_exworks?: boolean | null
          meta_hight_value_customer?: boolean | null
          meta_interested?: boolean | null
          meta_presentation?: boolean | null
          meta_reception_required_email?: boolean | null
          meta_rejected?: boolean | null
          meta_sea_freight?: boolean | null
          meta_tutorial?: boolean | null
          meta_wca?: boolean | null
          motivo_archiviazione?: string | null
          next_contact_date?: string | null
          nome?: string | null
          note?: string | null
          origine?: string | null
          paese?: string | null
          position?: string | null
          responsabile?: string | null
          rubrica_id_originale: string
          scheduled_contact?: string | null
          state?: string | null
          stato?: string | null
          tags?: string[] | null
          telefono?: string | null
          title?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          alias?: string | null
          archiviata?: boolean | null
          archiviato_da?: string | null
          azienda?: string | null
          cellulare?: string | null
          citta?: string | null
          client_code?: string | null
          company_alias?: string | null
          completed?: boolean | null
          created_at?: string
          created_by?: string | null
          data_archiviazione?: string
          email?: string | null
          has_actions?: boolean | null
          id?: string
          indirizzo?: string | null
          last_contact?: string | null
          meta_air_freight?: boolean | null
          meta_client?: boolean | null
          meta_contact_required_email?: boolean | null
          meta_exclient?: boolean | null
          meta_express?: boolean | null
          meta_exworks?: boolean | null
          meta_hight_value_customer?: boolean | null
          meta_interested?: boolean | null
          meta_presentation?: boolean | null
          meta_reception_required_email?: boolean | null
          meta_rejected?: boolean | null
          meta_sea_freight?: boolean | null
          meta_tutorial?: boolean | null
          meta_wca?: boolean | null
          motivo_archiviazione?: string | null
          next_contact_date?: string | null
          nome?: string | null
          note?: string | null
          origine?: string | null
          paese?: string | null
          position?: string | null
          responsabile?: string | null
          rubrica_id_originale?: string
          scheduled_contact?: string | null
          state?: string | null
          stato?: string | null
          tags?: string[] | null
          telefono?: string | null
          title?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      shared_email_accounts: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          email: string
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          email: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          email?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      shared_email_members: {
        Row: {
          can_read: boolean | null
          can_send: boolean | null
          id: string
          joined_at: string | null
          shared_email_id: string | null
          user_id: string | null
        }
        Insert: {
          can_read?: boolean | null
          can_send?: boolean | null
          id?: string
          joined_at?: string | null
          shared_email_id?: string | null
          user_id?: string | null
        }
        Update: {
          can_read?: boolean | null
          can_send?: boolean | null
          id?: string
          joined_at?: string | null
          shared_email_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_email_members_shared_email_id_fkey"
            columns: ["shared_email_id"]
            isOneToOne: false
            referencedRelation: "shared_email_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      system_actions: {
        Row: {
          action_id: string
          category: string | null
          created_at: string | null
          description: string | null
          example_config: Json | null
          icon: string | null
          id: string
          is_functional: boolean | null
          name: string
          required_config_schema: Json | null
          requires_auth: boolean | null
        }
        Insert: {
          action_id: string
          category?: string | null
          created_at?: string | null
          description?: string | null
          example_config?: Json | null
          icon?: string | null
          id?: string
          is_functional?: boolean | null
          name: string
          required_config_schema?: Json | null
          requires_auth?: boolean | null
        }
        Update: {
          action_id?: string
          category?: string | null
          created_at?: string | null
          description?: string | null
          example_config?: Json | null
          icon?: string | null
          id?: string
          is_functional?: boolean | null
          name?: string
          required_config_schema?: Json | null
          requires_auth?: boolean | null
        }
        Relationships: []
      }
      system_languages: {
        Row: {
          code: string
          created_at: string
          flag: string
          id: string
          is_active: boolean
          name: string
          native_name: string
          order_index: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          flag: string
          id?: string
          is_active?: boolean
          name: string
          native_name: string
          order_index?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          flag?: string
          id?: string
          is_active?: boolean
          name?: string
          native_name?: string
          order_index?: number
          updated_at?: string
        }
        Relationships: []
      }
      temp_ai_import: {
        Row: {
          created_at: string
          id: string
          import_log_id: string | null
          raw_data: Json
          row_number: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          import_log_id?: string | null
          raw_data: Json
          row_number?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          import_log_id?: string | null
          raw_data?: Json
          row_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "temp_ai_import_import_log_id_fkey"
            columns: ["import_log_id"]
            isOneToOne: false
            referencedRelation: "import_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      temp_ai_reviewed: {
        Row: {
          created_at: string
          id: string
          import_log_id: string | null
          normalized_data: Json | null
          raw_data: Json
          row_number: number | null
          validation_errors: Json | null
          validation_status: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          import_log_id?: string | null
          normalized_data?: Json | null
          raw_data: Json
          row_number?: number | null
          validation_errors?: Json | null
          validation_status?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          import_log_id?: string | null
          normalized_data?: Json | null
          raw_data?: Json
          row_number?: number | null
          validation_errors?: Json | null
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "temp_ai_reviewed_import_log_id_fkey"
            columns: ["import_log_id"]
            isOneToOne: false
            referencedRelation: "import_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      template_alias: {
        Row: {
          alias: string
          company_alias: string | null
          company_name: string
          created_at: string
          id: string
          name: string
          title: string | null
          updated_at: string
        }
        Insert: {
          alias: string
          company_alias?: string | null
          company_name: string
          created_at?: string
          id?: string
          name: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          alias?: string
          company_alias?: string | null
          company_name?: string
          created_at?: string
          id?: string
          name?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      thumbnail_generation_logs: {
        Row: {
          attempt_number: number | null
          component_id: string | null
          component_name: string
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          error_stack: string | null
          id: string
          status: string
        }
        Insert: {
          attempt_number?: number | null
          component_id?: string | null
          component_name: string
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          error_stack?: string | null
          id?: string
          status: string
        }
        Update: {
          attempt_number?: number | null
          component_id?: string | null
          component_name?: string
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          error_stack?: string | null
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "thumbnail_generation_logs_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "design_lab_extracted_components"
            referencedColumns: ["id"]
          },
        ]
      }
      tmwe_api_benchmark_results: {
        Row: {
          avg_response_time_ms: number | null
          browser_info: string | null
          category: string
          created_at: string | null
          execution_timestamp: string
          id: string
          overall_success_rate: number | null
          results: Json
          total_duration_seconds: number | null
          total_suites: number
          total_tests: number
          user_id: string | null
        }
        Insert: {
          avg_response_time_ms?: number | null
          browser_info?: string | null
          category: string
          created_at?: string | null
          execution_timestamp?: string
          id?: string
          overall_success_rate?: number | null
          results: Json
          total_duration_seconds?: number | null
          total_suites: number
          total_tests: number
          user_id?: string | null
        }
        Update: {
          avg_response_time_ms?: number | null
          browser_info?: string | null
          category?: string
          created_at?: string | null
          execution_timestamp?: string
          id?: string
          overall_success_rate?: number | null
          results?: Json
          total_duration_seconds?: number | null
          total_suites?: number
          total_tests?: number
          user_id?: string | null
        }
        Relationships: []
      }
      ui_component_backups: {
        Row: {
          animations: Json
          backup_date: string | null
          code_snippets: Json
          component_name: string
          component_type: string
          created_at: string | null
          created_by: string | null
          id: string
          interactive_elements: Json
          layout_properties: Json
          notes: string | null
          tags: string[] | null
          updated_at: string | null
          version: string
          visual_properties: Json
        }
        Insert: {
          animations?: Json
          backup_date?: string | null
          code_snippets?: Json
          component_name: string
          component_type: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          interactive_elements?: Json
          layout_properties?: Json
          notes?: string | null
          tags?: string[] | null
          updated_at?: string | null
          version: string
          visual_properties?: Json
        }
        Update: {
          animations?: Json
          backup_date?: string | null
          code_snippets?: Json
          component_name?: string
          component_type?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          interactive_elements?: Json
          layout_properties?: Json
          notes?: string | null
          tags?: string[] | null
          updated_at?: string | null
          version?: string
          visual_properties?: Json
        }
        Relationships: []
      }
      ui_style_configs: {
        Row: {
          attivo: boolean
          configurazione: Json
          contesto: string
          created_at: string
          descrizione: string | null
          id: string
          nome: string
          tipo: string
          updated_at: string
        }
        Insert: {
          attivo?: boolean
          configurazione: Json
          contesto: string
          created_at?: string
          descrizione?: string | null
          id?: string
          nome: string
          tipo: string
          updated_at?: string
        }
        Update: {
          attivo?: boolean
          configurazione?: Json
          contesto?: string
          created_at?: string
          descrizione?: string | null
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_notification_preferences: {
        Row: {
          created_at: string
          id: string
          onboarding_completed: boolean
          push_notifications_enabled: boolean
          push_token: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          onboarding_completed?: boolean
          push_notifications_enabled?: boolean
          push_token?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          onboarding_completed?: boolean
          push_notifications_enabled?: boolean
          push_token?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_personality_profile: {
        Row: {
          common_phrases: string[] | null
          created_at: string | null
          decision_patterns: Json | null
          formality_level: number | null
          id: string
          language_preferences: Json | null
          last_learning_at: string | null
          learned_behaviors: Json | null
          priority_keywords: string[] | null
          response_style: string | null
          signature_template: string | null
          tone_preference: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          common_phrases?: string[] | null
          created_at?: string | null
          decision_patterns?: Json | null
          formality_level?: number | null
          id?: string
          language_preferences?: Json | null
          last_learning_at?: string | null
          learned_behaviors?: Json | null
          priority_keywords?: string[] | null
          response_style?: string | null
          signature_template?: string | null
          tone_preference?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          common_phrases?: string[] | null
          created_at?: string | null
          decision_patterns?: Json | null
          formality_level?: number | null
          id?: string
          language_preferences?: Json | null
          last_learning_at?: string | null
          learned_behaviors?: Json | null
          priority_keywords?: string[] | null
          response_style?: string | null
          signature_template?: string | null
          tone_preference?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          auto_translate_writing: boolean
          availability_status: Database["public"]["Enums"]["user_availability_status"]
          company_context_ai: string | null
          company_context_updated_at: string | null
          company_description: string | null
          created_at: string
          display_name: string | null
          enable_auto_speaker: boolean
          id: string
          preferred_country: string | null
          preferred_elevenlabs_voice: string | null
          preferred_language: string
          reading_language: string
          status_color: string | null
          status_emoji: string | null
          status_message: string | null
          tmwe_email: string | null
          translation_mode: string
          tts_engine: string | null
          updated_at: string
          user_id: string
          writing_language: string
        }
        Insert: {
          auto_translate_writing?: boolean
          availability_status?: Database["public"]["Enums"]["user_availability_status"]
          company_context_ai?: string | null
          company_context_updated_at?: string | null
          company_description?: string | null
          created_at?: string
          display_name?: string | null
          enable_auto_speaker?: boolean
          id?: string
          preferred_country?: string | null
          preferred_elevenlabs_voice?: string | null
          preferred_language?: string
          reading_language?: string
          status_color?: string | null
          status_emoji?: string | null
          status_message?: string | null
          tmwe_email?: string | null
          translation_mode?: string
          tts_engine?: string | null
          updated_at?: string
          user_id: string
          writing_language?: string
        }
        Update: {
          auto_translate_writing?: boolean
          availability_status?: Database["public"]["Enums"]["user_availability_status"]
          company_context_ai?: string | null
          company_context_updated_at?: string | null
          company_description?: string | null
          created_at?: string
          display_name?: string | null
          enable_auto_speaker?: boolean
          id?: string
          preferred_country?: string | null
          preferred_elevenlabs_voice?: string | null
          preferred_language?: string
          reading_language?: string
          status_color?: string | null
          status_emoji?: string | null
          status_message?: string | null
          tmwe_email?: string | null
          translation_mode?: string
          tts_engine?: string | null
          updated_at?: string
          user_id?: string
          writing_language?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sync_preferences: {
        Row: {
          created_at: string | null
          date_filter_months: number | null
          default_sync_mode: string | null
          excluded_folders: Json | null
          id: string
          included_folders: Json | null
          updated_at: string | null
          user_email: string
        }
        Insert: {
          created_at?: string | null
          date_filter_months?: number | null
          default_sync_mode?: string | null
          excluded_folders?: Json | null
          id?: string
          included_folders?: Json | null
          updated_at?: string | null
          user_email: string
        }
        Update: {
          created_at?: string | null
          date_filter_months?: number | null
          default_sync_mode?: string | null
          excluded_folders?: Json | null
          id?: string
          included_folders?: Json | null
          updated_at?: string | null
          user_email?: string
        }
        Relationships: []
      }
      user_tmwe_credentials: {
        Row: {
          access_token: string
          client_id: string
          client_secret: string
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          refresh_token: string | null
          token_type: string | null
          updated_at: string | null
        }
        Insert: {
          access_token: string
          client_id: string
          client_secret: string
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          token_type?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          client_id?: string
          client_secret?: string
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          token_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      voice_agent_config: {
        Row: {
          agent_id: string | null
          created_at: string | null
          default_voice_id: string | null
          elevenlabs_api_key: string
          enabled: boolean | null
          id: string
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          default_voice_id?: string | null
          elevenlabs_api_key: string
          enabled?: boolean | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          default_voice_id?: string | null
          elevenlabs_api_key?: string
          enabled?: boolean | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      kb_hot_documents: {
        Row: {
          access_count: number | null
          chunk_index: number | null
          content: string | null
          content_hash: string | null
          content_type: string | null
          created_at: string | null
          embedding: string | null
          file_path: string | null
          id: string | null
          kb_id: string | null
          metadata: Json | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_documents_kb_id_fkey"
            columns: ["kb_id"]
            isOneToOne: false
            referencedRelation: "knowledge_bases"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      analyze_senders_aggregated: {
        Args: { p_user_email: string }
        Returns: {
          email_count: number
          first_seen: string
          from_email: string
          has_attachments: boolean
          last_seen: string
        }[]
      }
      bulk_insert_emails_turbo_v2: {
        Args: { p_records: Json }
        Returns: {
          execution_time_ms: number
          inserted_count: number
          skipped_count: number
        }[]
      }
      check_elevenlabs_quota: {
        Args: { p_characters: number; p_user_id: string }
        Returns: Json
      }
      check_temp_table_exists: {
        Args: { table_name: string }
        Returns: boolean
      }
      clean_expired_access_requests: { Args: never; Returns: undefined }
      create_activity_records: {
        Args: { activity_data: Json }
        Returns: undefined
      }
      get_email_folder_counts: {
        Args: { p_sync_status?: string; p_user_email: string }
        Returns: {
          cartella: string
          count: number
        }[]
      }
      get_or_create_private_room: {
        Args: { user1_id: string; user2_id: string }
        Returns: string
      }
      get_pending_requests_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_tables_with_counts: {
        Args: never
        Returns: {
          row_count: number
          table_name: string
        }[]
      }
      get_temp_table_data:
        | {
            Args: {
              page_limit?: number
              page_offset?: number
              table_name: string
            }
            Returns: Json
          }
        | { Args: { table_name: string }; Returns: Json }
      get_unread_messages_count: {
        Args: { p_room_id: string; p_user_id: string }
        Returns: number
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_users_email_counts: {
        Args: never
        Returns: {
          count: number
          email: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role_by_tmwe_email: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _tmwe_email: string
        }
        Returns: boolean
      }
      increment_elevenlabs_usage: {
        Args: { p_characters: number; p_cost: number; p_user_id: string }
        Returns: undefined
      }
      increment_prompt_library_usage: {
        Args: { prompt_id: string }
        Returns: undefined
      }
      increment_token_count: {
        Args: { p_id: string; p_table: string; p_tokens_to_add: number }
        Returns: number
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_room_member: {
        Args: { _room_id: string; _user_id: string }
        Returns: boolean
      }
      match_knowledge_nodes: {
        Args: {
          match_count?: number
          match_threshold?: number
          p_conversation_id?: string
          query_embedding: string
        }
        Returns: {
          confidence: number
          conversation_id: string
          id: string
          node_type: Database["public"]["Enums"]["knowledge_node_type"]
          similarity: number
          text: string
        }[]
      }
      reset_ai_invocations: { Args: { p_room_id: string }; Returns: undefined }
      reset_token_count: {
        Args: { p_id: string; p_table: string }
        Returns: undefined
      }
      search_document_chunks: {
        Args: {
          p_conversation_id?: string
          p_lab_conversation_id?: string
          p_match_count?: number
          p_match_threshold?: number
          p_query_embedding: string
          p_room_id?: string
        }
        Returns: {
          chunk_text: string
          file_name: string
          id: string
          similarity: number
        }[]
      }
      search_hot_documents: {
        Args: {
          p_match_count: number
          p_match_threshold: number
          p_query_embedding: string
        }
        Returns: {
          content: string
          id: string
          kb_id: string
          similarity: number
          title: string
        }[]
      }
      search_kb_documents: {
        Args: {
          p_kb_id: string
          p_match_count: number
          p_match_threshold: number
          p_query_embedding: string
        }
        Returns: {
          content: string
          id: string
          kb_id: string
          similarity: number
          title: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      transfer_company_to_rubrica: {
        Args: { imported_contact_id: string }
        Returns: Json
      }
      transfer_multiple_companies_to_rubrica: {
        Args: { imported_contact_ids: string[] }
        Returns: Json
      }
    }
    Enums: {
      access_request_status: "pending" | "approved" | "rejected"
      app_role: "admin" | "user"
      email_action_type:
        | "move_to_folder"
        | "mark_as_read"
        | "archive"
        | "delete"
        | "forward"
      knowledge_edge_type:
        | "supports"
        | "disputes"
        | "relates_to"
        | "derives"
        | "duplicates"
      knowledge_node_type:
        | "Topic"
        | "Claim"
        | "Evidence"
        | "Decision"
        | "Action"
      room_access_type: "public" | "request" | "private"
      user_availability_status: "online" | "busy" | "dnd" | "offline"
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
      access_request_status: ["pending", "approved", "rejected"],
      app_role: ["admin", "user"],
      email_action_type: [
        "move_to_folder",
        "mark_as_read",
        "archive",
        "delete",
        "forward",
      ],
      knowledge_edge_type: [
        "supports",
        "disputes",
        "relates_to",
        "derives",
        "duplicates",
      ],
      knowledge_node_type: ["Topic", "Claim", "Evidence", "Decision", "Action"],
      room_access_type: ["public", "request", "private"],
      user_availability_status: ["online", "busy", "dnd", "offline"],
    },
  },
} as const
