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
      attivita: {
        Row: {
          assegnato_a: string | null
          created_at: string
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
          assegnato_a?: string | null
          created_at?: string
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
          assegnato_a?: string | null
          created_at?: string
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
        Relationships: []
      }
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
          attachments: Json | null
          content: string
          conversation_id: string
          created_at: string
          generated_images: Json | null
          id: string
          images: Json | null
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
          conversation_id: string
          created_at?: string
          generated_images?: Json | null
          id?: string
          images?: Json | null
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
          conversation_id?: string
          created_at?: string
          generated_images?: Json | null
          id?: string
          images?: Json | null
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
          cognome_utente: string | null
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
          updated_at: string
          usa_riassunto: boolean | null
        }
        Insert: {
          cognome_utente?: string | null
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
          updated_at?: string
          usa_riassunto?: boolean | null
        }
        Update: {
          cognome_utente?: string | null
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
          updated_at?: string
          usa_riassunto?: boolean | null
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
          direzione: string
          email_references: string | null
          flags: Json | null
          from_email: string
          id: string
          in_reply_to: string | null
          message_hash: string | null
          message_id: string
          provider_id: string
          raw_headers: Json | null
          stato: string
          subject: string | null
          sync_status: string | null
          thread_id: string | null
          to_email: string
          updated_at: string
          user_email: string | null
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
          direzione: string
          email_references?: string | null
          flags?: Json | null
          from_email: string
          id?: string
          in_reply_to?: string | null
          message_hash?: string | null
          message_id: string
          provider_id: string
          raw_headers?: Json | null
          stato?: string
          subject?: string | null
          sync_status?: string | null
          thread_id?: string | null
          to_email: string
          updated_at?: string
          user_email?: string | null
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
          direzione?: string
          email_references?: string | null
          flags?: Json | null
          from_email?: string
          id?: string
          in_reply_to?: string | null
          message_hash?: string | null
          message_id?: string
          provider_id?: string
          raw_headers?: Json | null
          stato?: string
          subject?: string | null
          sync_status?: string | null
          thread_id?: string | null
          to_email?: string
          updated_at?: string
          user_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_messages_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "email_provider"
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
        }
        Insert: {
          action_params?: Json | null
          action_type: Database["public"]["Enums"]["email_action_type"]
          created_at?: string
          id?: string
          sender_email: string
          updated_at?: string
        }
        Update: {
          action_params?: Json | null
          action_type?: Database["public"]["Enums"]["email_action_type"]
          created_at?: string
          id?: string
          sender_email?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_sender_groups: {
        Row: {
          colore: string | null
          created_at: string
          descrizione: string | null
          id: string
          nome_gruppo: string
          updated_at: string
        }
        Insert: {
          colore?: string | null
          created_at?: string
          descrizione?: string | null
          id?: string
          nome_gruppo: string
          updated_at?: string
        }
        Update: {
          colore?: string | null
          created_at?: string
          descrizione?: string | null
          id?: string
          nome_gruppo?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_sender_rules: {
        Row: {
          created_at: string
          group_id: string
          id: string
          sender_email: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          sender_email: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          sender_email?: string
          updated_at?: string
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
      email_sync_progress: {
        Row: {
          batch_size: number
          completed_at: string | null
          current_batch: number
          errors: Json | null
          folder_name: string
          id: string
          last_offset: number
          processed_messages: number
          started_at: string
          status: string
          sync_log_id: string | null
          total_messages: number
          updated_at: string
          user_email: string | null
        }
        Insert: {
          batch_size?: number
          completed_at?: string | null
          current_batch?: number
          errors?: Json | null
          folder_name: string
          id?: string
          last_offset?: number
          processed_messages?: number
          started_at?: string
          status?: string
          sync_log_id?: string | null
          total_messages?: number
          updated_at?: string
          user_email?: string | null
        }
        Update: {
          batch_size?: number
          completed_at?: string | null
          current_batch?: number
          errors?: Json | null
          folder_name?: string
          id?: string
          last_offset?: number
          processed_messages?: number
          started_at?: string
          status?: string
          sync_log_id?: string | null
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
          created_at: string
          id: string
          message_type: string
          room_id: string
          user_id: string
        }
        Insert: {
          attachment_url?: string | null
          content: string
          created_at?: string
          id?: string
          message_type?: string
          room_id: string
          user_id: string
        }
        Update: {
          attachment_url?: string | null
          content?: string
          created_at?: string
          id?: string
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
      intranet_room_ai_prompts: {
        Row: {
          created_at: string
          custom_prompt: string | null
          enable_ai: boolean
          enable_auto_speaker: boolean
          enable_suggestions: boolean
          enable_translation: boolean
          id: string
          is_using_standard: boolean
          room_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_prompt?: string | null
          enable_ai?: boolean
          enable_auto_speaker?: boolean
          enable_suggestions?: boolean
          enable_translation?: boolean
          id?: string
          is_using_standard?: boolean
          room_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_prompt?: string | null
          enable_ai?: boolean
          enable_auto_speaker?: boolean
          enable_suggestions?: boolean
          enable_translation?: boolean
          id?: string
          is_using_standard?: boolean
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
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
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
      user_profiles: {
        Row: {
          auto_translate_writing: boolean
          created_at: string
          display_name: string | null
          enable_auto_speaker: boolean
          id: string
          preferred_language: string
          reading_language: string
          tmwe_email: string | null
          translation_mode: string
          updated_at: string
          user_id: string
          writing_language: string
        }
        Insert: {
          auto_translate_writing?: boolean
          created_at?: string
          display_name?: string | null
          enable_auto_speaker?: boolean
          id?: string
          preferred_language?: string
          reading_language?: string
          tmwe_email?: string | null
          translation_mode?: string
          updated_at?: string
          user_id: string
          writing_language?: string
        }
        Update: {
          auto_translate_writing?: boolean
          created_at?: string
          display_name?: string | null
          enable_auto_speaker?: boolean
          id?: string
          preferred_language?: string
          reading_language?: string
          tmwe_email?: string | null
          translation_mode?: string
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
      user_tmwe_credentials: {
        Row: {
          access_token: string
          client_id: string
          client_secret: string
          created_at: string | null
          email: string
          expires_at: number | null
          id: string
          refresh_token: string | null
          updated_at: string | null
        }
        Insert: {
          access_token: string
          client_id: string
          client_secret: string
          created_at?: string | null
          email: string
          expires_at?: number | null
          id?: string
          refresh_token?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          client_id?: string
          client_secret?: string
          created_at?: string | null
          email?: string
          expires_at?: number | null
          id?: string
          refresh_token?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_temp_table_exists: {
        Args: { table_name: string }
        Returns: boolean
      }
      create_activity_records: {
        Args: { activity_data: Json }
        Returns: undefined
      }
      get_tables_with_counts: {
        Args: Record<PropertyKey, never>
        Returns: {
          row_count: number
          table_name: string
        }[]
      }
      get_temp_table_data: {
        Args:
          | { page_limit?: number; page_offset?: number; table_name: string }
          | { table_name: string }
        Returns: Json
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
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
      is_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
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
      app_role: "admin" | "user"
      email_action_type:
        | "move_to_folder"
        | "mark_as_read"
        | "archive"
        | "delete"
        | "forward"
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
      app_role: ["admin", "user"],
      email_action_type: [
        "move_to_folder",
        "mark_as_read",
        "archive",
        "delete",
        "forward",
      ],
    },
  },
} as const
