# 📊 Database Schema Documentation

**Last Updated:** 2025-01-15  
**Project:** CRM Pro - Findair  
**Database:** Supabase PostgreSQL

---

## 🗂️ Schema Overview

Il database è organizzato in diversi moduli funzionali:

- **Sistema AI e Chat** - Gestione conversazioni AI, laboratorio multi-agente, prompt
- **Sistema Utenti** - Autenticazione, ruoli, profili, credenziali
- **Sistema Intranet** - Chat interna, stanze, messaggi, gestione accessi
- **Sistema Email** - Provider email, messaggi, sincronizzazione, campagne
- **CRM e Contatti** - Rubrica, attività, importazioni, gestione contatti
- **Sistema Importazione** - Gestione file import, errori, normalizzazione

---

## 📋 Tables Index

### Sistema AI e Chat
- [config_ai](#config_ai) - Configurazioni AI providers
- [chat_conversations](#chat_conversations) - Conversazioni chat standard
- [chat_messages](#chat_messages) - Messaggi chat
- [chat_system_prompts](#chat_system_prompts) - Prompt di sistema chat
- [chat_usage_stats](#chat_usage_stats) - Statistiche utilizzo chat
- [chat_laboratory_conversations](#chat_laboratory_conversations) - Conversazioni laboratorio
- [chat_laboratory_messages](#chat_laboratory_messages) - Messaggi laboratorio
- [chat_laboratory_participants](#chat_laboratory_participants) - Partecipanti AI
- [chat_laboratory_system_prompts](#chat_laboratory_system_prompts) - Prompt laboratorio
- [chat_laboratory_usage_stats](#chat_laboratory_usage_stats) - Statistiche laboratorio

### Sistema Utenti e Ruoli
- [user_roles](#user_roles) - **CRITICO** - Ruoli utenti
- [user_profiles](#user_profiles) - Profili utente
- [user_tmwe_credentials](#user_tmwe_credentials) - Credenziali TMWE

### Sistema Intranet
- [intranet_rooms](#intranet_rooms) - Stanze chat
- [intranet_messages](#intranet_messages) - Messaggi intranet
- [intranet_room_members](#intranet_room_members) - Membri stanze
- [intranet_room_access_requests](#intranet_room_access_requests) - Richieste accesso
- [intranet_room_ai_prompts](#intranet_room_ai_prompts) - Prompt AI stanze
- [intranet_global_ai_prompt](#intranet_global_ai_prompt) - Prompt AI globale
- [intranet_user_room_status](#intranet_user_room_status) - Status lettura messaggi

### Sistema Email
- [email_messages](#email_messages) - Messaggi email
- [email_provider](#email_provider) - Configurazioni provider
- [email_provider_credenziali](#email_provider_credenziali) - Credenziali provider
- [email_attachments](#email_attachments) - Allegati email
- [email_sync_logs](#email_sync_logs) - Log sincronizzazioni
- [email_sync_progress](#email_sync_progress) - Progresso sync
- [email_sync_preferences](#email_sync_preferences) - Preferenze sync utente
- [email_templates](#email_templates) - Template email
- [email_campagne_queue](#email_campagne_queue) - Coda invio campagne
- [email_sender_groups](#email_sender_groups) - Gruppi mittenti
- [email_sender_rules](#email_sender_rules) - Regole classificazione
- [email_sender_actions](#email_sender_actions) - Azioni automatiche

### CRM e Contatti
- [rubrica](#rubrica) - Contatti principali
- [attivita](#attivita) - Attività CRM
- [attivita_archiviate](#attivita_archiviate) - Attività archiviate
- [imported_contacts](#imported_contacts) - Contatti importati
- [imported_contacts_archiviati](#imported_contacts_archiviati) - Contatti archiviati

### Sistema Importazione
- [file_imports](#file_imports) - File importati
- [import_logs](#import_logs) - Log importazioni
- [import_errors](#import_errors) - Errori importazione

### Configurazione
- [config_generale](#config_generale) - Configurazione generale sistema
- [page_system_prompts](#page_system_prompts) - Prompt per pagine specifiche

---

## 📝 Tables Details

### config_ai

**Purpose:** Gestisce le configurazioni dei provider AI (OpenAI, Anthropic, etc.)

**Columns:**
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| provider | text | NO | - | Nome provider (openai, anthropic, etc) |
| modello | text | NO | - | Nome modello (gpt-4, claude-3, etc) |
| api_key | text | NO | - | API key (encrypted) |
| attivo | boolean | NO | false | Se questa config è attiva |
| last_test_status | text | YES | - | Stato ultimo test |
| last_test_at | timestamp | YES | - | Data ultimo test |
| last_test_error | text | YES | - | Errore ultimo test |
| created_at | timestamp | NO | now() | Data creazione |
| updated_at | timestamp | NO | now() | Data ultimo aggiornamento |

**Relationships:** None

**RLS Policies:**
- `Allow all operations on config_ai`: Permette tutte le operazioni

**Last Modified:** 2025-01-10  
**Change:** Initial schema  
**Backup:** N/A (schema iniziale)

---

### user_roles

**Purpose:** **CRITICO** - Gestisce i ruoli degli utenti (admin, moderator, user) in modo sicuro

**Columns:**
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | uuid | NO | - | FK to auth.users |
| role | app_role | NO | - | Ruolo (enum: admin, moderator, user) |

**Relationships:**
- FK: `user_id` → `auth.users.id` (ON DELETE CASCADE)
- UNIQUE constraint su (user_id, role)

**RLS Policies:**
- Gestite tramite `SECURITY DEFINER` functions
- `has_role(_user_id, _role)` function per check sicuri
- `is_admin(_user_id)` function di convenience

**Security Notes:**
⚠️ **MAI** memorizzare ruoli su `user_profiles` o `auth.users`  
⚠️ **SEMPRE** usare `has_role()` function per validazioni  
⚠️ **MAI** fare check client-side dei ruoli

**Last Modified:** 2025-01-10  
**Change:** Initial schema with security definer functions  
**Backup:** N/A (schema iniziale)

---

### chat_laboratory_conversations

**Purpose:** Gestisce le conversazioni nel laboratorio multi-agente AI

**Columns:**
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| titolo | text | YES | - | Titolo conversazione |
| system_prompt_id | uuid | YES | - | FK to chat_laboratory_system_prompts |
| active_participants | jsonb | YES | [] | Array partecipanti attivi |
| current_turn_index | integer | YES | 0 | Indice turno corrente |
| last_speaker_index | integer | YES | 0 | Indice ultimo speaker |
| conversation_phase | text | YES | 'discussion' | Fase conversazione |
| response_mode | text | YES | 'all' | Modalità risposta (all/specific) |
| target_participant_type | text | YES | - | Tipo partecipante target |
| memoria_completa | boolean | YES | false | Se usa memoria completa |
| riassunto_contesto | text | YES | - | Riassunto contesto |
| final_summary | text | YES | - | Sintesi finale |
| created_at | timestamp | YES | now() | Data creazione |
| updated_at | timestamp | YES | now() | Data aggiornamento |

**Relationships:**
- FK: `system_prompt_id` → `chat_laboratory_system_prompts.id`

**RLS Policies:**
- `Allow all operations`: Accesso completo (authenticated users)

**Last Modified:** 2025-01-15  
**Change:** Aggiunto supporto generazione immagini  
**Backup:** `docs/DATABASE_BACKUPS/2025-01-15_pre-image-gen.md`

---

### chat_laboratory_messages

**Purpose:** Memorizza i messaggi nel laboratorio, incluse immagini generate e allegati

**Columns:**
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| conversation_id | uuid | NO | - | FK to chat_laboratory_conversations |
| sender_type | text | NO | - | Tipo sender (user/ai) |
| sender_name | text | NO | - | Nome sender |
| content | text | NO | - | Contenuto messaggio |
| images | jsonb | YES | [] | Array immagini allegate |
| generated_images | jsonb | YES | [] | Array immagini generate da AI |
| attachments | jsonb | YES | [] | Array allegati |
| is_visible_to_ai | boolean | YES | true | Se visibile agli AI |
| token_input | integer | YES | - | Token input utilizzati |
| token_output | integer | YES | - | Token output generati |
| tempo_risposta_ms | integer | YES | - | Tempo risposta in ms |
| created_at | timestamp | YES | now() | Data creazione |

**Relationships:**
- FK: `conversation_id` → `chat_laboratory_conversations.id`

**RLS Policies:**
- `Allow all operations`: Accesso completo

**Generated Images Format:**
```json
[
  {
    "url": "data:image/png;base64,...",
    "prompt": "Description of generated image",
    "model": "google/gemini-2.5-flash-image-preview",
    "timestamp": "2025-01-15T10:30:00Z"
  }
]
```

**Last Modified:** 2025-01-15  
**Change:** Aggiunto campo `generated_images` per supportare generazione immagini  
**Backup:** `docs/DATABASE_BACKUPS/2025-01-15_pre-image-gen.md`

---

### intranet_rooms

**Purpose:** Gestisce le stanze chat dell'intranet aziendale

**Columns:**
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| name | text | NO | - | Nome stanza |
| description | text | YES | - | Descrizione |
| is_private | boolean | NO | false | Se privata (1-to-1) |
| access_type | room_access_type | YES | 'private' | Tipo accesso |
| created_by | uuid | YES | - | Creatore stanza |
| created_at | timestamp | NO | now() | Data creazione |
| updated_at | timestamp | NO | now() | Data aggiornamento |

**Relationships:**
- FK: `created_by` → `auth.users.id`

**Access Types:**
- `public` - Accesso libero
- `private` - Solo membri
- `request` - Richiesta accesso necessaria

**RLS Policies:**
- Users can view rooms they are members of
- Only creators/admins can modify rooms

**Last Modified:** 2025-01-12  
**Change:** Aggiunto sistema richieste accesso  
**Backup:** `docs/DATABASE_BACKUPS/2025-01-12_access-requests.md`

---

### email_messages

**Purpose:** Memorizza tutti i messaggi email sincronizzati da TMWE

**Columns:**
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| message_id | text | NO | - | Message-ID univoco email |
| user_email | text | NO | - | Email utente (from user_profiles) |
| provider_id | uuid | NO | - | FK to email_provider |
| from_email | text | NO | - | Mittente |
| to_email | text | NO | - | Destinatario |
| cc_email | text | YES | - | CC |
| bcc_email | text | YES | - | BCC |
| subject | text | YES | - | Oggetto |
| body_text | text | YES | - | Corpo testo |
| body_html | text | YES | - | Corpo HTML |
| direzione | text | NO | - | in/out |
| cartella | text | YES | 'INBOX' | Cartella IMAP |
| stato | text | NO | 'nuovo' | Stato email |
| thread_id | text | YES | - | ID thread |
| in_reply_to | text | YES | - | In-Reply-To header |
| email_references | text | YES | - | References header |
| attachments | jsonb | YES | [] | Array allegati |
| flags | jsonb | YES | [] | Flag email |
| raw_headers | jsonb | YES | - | Headers raw |
| data_invio | timestamp | YES | - | Data invio |
| data_ricezione | timestamp | NO | - | Data ricezione |
| sync_status | text | YES | 'sincronizzato' | Status sync |
| message_hash | text | YES | - | Hash per dedup |
| is_shared_email | boolean | YES | false | Se email condivisa |
| shared_email_id | uuid | YES | - | FK to shared_emails |
| created_at | timestamp | NO | now() | Data creazione |
| updated_at | timestamp | NO | now() | Data aggiornamento |

**Relationships:**
- FK: `provider_id` → `email_provider.id`
- FK: `shared_email_id` → `shared_emails.id`

**RLS Policies:**
- Users can view own emails (via user_email match with user_profiles.tmwe_email)
- Users can view shared emails if member with can_read permission

**Indexes:**
- `idx_email_messages_user` on `user_email`
- `idx_email_messages_message_id` on `message_id`
- `idx_email_messages_thread` on `thread_id`

**Last Modified:** 2025-01-14  
**Change:** Aggiunto supporto email condivise  
**Backup:** `docs/DATABASE_BACKUPS/2025-01-14_shared-emails.md`

---

## 🔧 Database Functions

### has_role(_user_id uuid, _role app_role)

**Purpose:** Verifica se un utente ha un ruolo specifico (SECURITY DEFINER per evitare recursione RLS)

**Returns:** `boolean`

**Security:** `SECURITY DEFINER`

**Parameters:**
- `_user_id`: UUID dell'utente
- `_role`: Ruolo da verificare (app_role enum)

**Usage:**
```sql
-- In RLS policy
CREATE POLICY "Admins only"
ON some_table
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- In query
SELECT * FROM users WHERE has_role(id, 'moderator');
```

**Last Modified:** 2025-01-10  
**Note:** Funzione critica per sicurezza - MAI rimuovere o modificare senza backup

---

### get_or_create_private_room(user1_id uuid, user2_id uuid)

**Purpose:** Trova o crea una stanza privata 1-to-1 tra due utenti

**Returns:** `uuid` (room_id)

**Security:** `SECURITY DEFINER`

**Logic:**
1. Cerca stanza privata esistente tra i due utenti
2. Se non esiste, crea nuova stanza
3. Aggiunge entrambi gli utenti come membri
4. Crea impostazioni AI per la stanza

**Last Modified:** 2025-01-12

---

### update_updated_at_column()

**Purpose:** Trigger function per aggiornare automaticamente `updated_at`

**Returns:** `trigger`

**Usage:** Applicato a tutte le tabelle con campo `updated_at`

```sql
CREATE TRIGGER update_table_updated_at
BEFORE UPDATE ON table_name
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

---

## 📝 Database Changelog

### 2025-01-15: Image Generation Support
- **Tabelle modificate:** `chat_laboratory_messages`, `chat_laboratory_system_prompts`
- **Tipo modifica:** ADD COLUMN `generated_images`, UPDATE prompts
- **Motivo:** Supporto generazione immagini nel laboratorio AI
- **Backup:** `docs/DATABASE_BACKUPS/2025-01-15_pre-image-gen.md`
- **Impatto:** ChatLaboratory page, chat-laboratory-orchestrator edge function

### 2025-01-14: Shared Emails System
- **Tabelle modificate:** `email_messages`, nuove tabelle `shared_emails`, `shared_email_members`
- **Tipo modifica:** ADD TABLE, ADD COLUMN, UPDATE RLS
- **Motivo:** Supporto caselle email condivise tra team
- **Backup:** `docs/DATABASE_BACKUPS/2025-01-14_shared-emails.md`
- **Impatto:** TMWEEmailDashboard, email sync functions

### 2025-01-12: Access Request System
- **Tabelle modificate:** `intranet_rooms`, nuova `intranet_room_access_requests`
- **Tipo modifica:** ADD TABLE, ADD COLUMN `access_type`, CREATE TRIGGERS
- **Motivo:** Sistema richieste accesso alle stanze
- **Backup:** `docs/DATABASE_BACKUPS/2025-01-12_access-requests.md`
- **Impatto:** Intranet page, IntranetAdmin components

### 2025-01-10: Initial Schema
- **Tipo modifica:** CREATE DATABASE
- **Motivo:** Setup iniziale progetto
- **Backup:** N/A (schema iniziale)

---

## 🚨 Critical Notes

### Sicurezza
1. **Ruoli utente:** Sempre in `user_roles`, mai su `user_profiles`
2. **Admin check:** Sempre server-side con `has_role()`, mai client-side
3. **API Keys:** Mai nel database public, sempre in secrets o `config_ai` con encryption

### Performance
1. **Indexes:** Verificare sempre su colonne filtrate spesso
2. **RLS Policies:** Ottimizzare per evitare table scan
3. **JSONB:** Usare GIN indexes su campi JSONB filtrati

### Backup
1. **Pre-Migration:** Sempre creare backup in `DATABASE_BACKUPS/`
2. **Post-Migration:** Aggiornare questo file con changelog
3. **Testing:** Testare RLS policies con utenti diversi

---

**Maintainer:** Development Team  
**Review Schedule:** Ogni modifica database  
**Contact:** Vedi MASTER_RULES.md per procedure
