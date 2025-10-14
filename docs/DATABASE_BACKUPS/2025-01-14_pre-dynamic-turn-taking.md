## Schema Pre-Migration: 2025-01-14

### Obiettivo Modifica
Implementare sistema **"Dynamic Turn-Taking"** per Bar Chat con gestione intelligente dei turni di conversazione tra agenti AI.

### Tabelle Coinvolte
- `chat_laboratory_bar_mode`

---

### DDL Corrente

#### Tabella: `chat_laboratory_bar_mode`

```sql
CREATE TABLE public.chat_laboratory_bar_mode (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  user_id uuid,
  mode text NOT NULL DEFAULT 'laboratory'::text,
  active_kb_id uuid,
  kb_navigation_history jsonb DEFAULT '[]'::jsonb,
  voice_enabled boolean NOT NULL DEFAULT false,
  auto_play_audio boolean NOT NULL DEFAULT true,
  conversation_pace text NOT NULL DEFAULT 'normal'::text,
  enable_interruptions boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  selected_topic text,
  interrupt_requested boolean DEFAULT false,
  continuous_mic_enabled boolean DEFAULT false,
  response_mode text NOT NULL DEFAULT 'sequential'::text,
  
  PRIMARY KEY (id),
  UNIQUE (conversation_id)
);
```

**Struttura Colonne PRIMA della Migrazione:**
| Column Name | Data Type | Nullable | Default |
|-------------|-----------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| conversation_id | uuid | NO | - |
| user_id | uuid | YES | - |
| mode | text | NO | 'laboratory'::text |
| active_kb_id | uuid | YES | - |
| kb_navigation_history | jsonb | YES | '[]'::jsonb |
| voice_enabled | boolean | NO | false |
| auto_play_audio | boolean | NO | true |
| conversation_pace | text | NO | 'normal'::text |
| enable_interruptions | boolean | NO | true |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| selected_topic | text | YES | - |
| interrupt_requested | boolean | YES | false |
| continuous_mic_enabled | boolean | YES | false |
| response_mode | text | NO | 'sequential'::text |

---

### Trigger Attivi

```sql
CREATE TRIGGER update_chat_laboratory_bar_mode_updated_at
BEFORE UPDATE ON public.chat_laboratory_bar_mode
FOR EACH ROW
EXECUTE FUNCTION public.update_chat_laboratory_updated_at();
```

---

### RLS Policies

```sql
-- Users can manage their own bar mode settings
CREATE POLICY "Users can manage their own bar mode settings"
ON public.chat_laboratory_bar_mode
FOR ALL
USING (auth.uid() = user_id);

-- Users can view their own bar mode settings
CREATE POLICY "Users can view their own bar mode settings"
ON public.chat_laboratory_bar_mode
FOR SELECT
USING (auth.uid() = user_id);
```

---

### Indexes

```sql
-- Nessun indice custom presente (solo chiave primaria e unique constraint su conversation_id)
```

---

### Modifiche Previste

La migrazione aggiungerà le seguenti colonne:

1. **turn_strategy** (text, NOT NULL, DEFAULT 'RANDOM_30')
   - Enum valori: 'RANDOM_30', 'ROUND_ROBIN', 'SMART_PRIORITY', 'INTERRUPT_BASED'
   - Strategia di selezione del prossimo speaker

2. **cognitive_buffers** (jsonb, DEFAULT '[]'::jsonb)
   - Buffer cognitivi per ogni agente con:
     - `agent_id`: ID agente
     - `pending_context`: Contesto pendente
     - `last_speak_time`: Timestamp ultima risposta
     - `priority_score`: Punteggio priorità (0.0-1.0)

3. **pause_between_turns_ms** (integer, DEFAULT 800)
   - Range: 400-2000 ms
   - Pausa configurabile tra turni agenti

4. **enable_direct_call_detection** (boolean, DEFAULT true)
   - Abilita rilevamento chiamate dirette (@nome_agente)

---

### Database Functions Esistenti

```sql
CREATE OR REPLACE FUNCTION public.update_chat_laboratory_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
```

---

### Note di Rollback

Per annullare la migrazione:

```sql
ALTER TABLE public.chat_laboratory_bar_mode 
  DROP COLUMN IF EXISTS turn_strategy,
  DROP COLUMN IF EXISTS cognitive_buffers,
  DROP COLUMN IF EXISTS pause_between_turns_ms,
  DROP COLUMN IF EXISTS enable_direct_call_detection;

DROP INDEX IF EXISTS idx_bar_mode_conversation_id;
```

---

**Backup Creato:** 2025-01-14 alle ore correnti  
**Autore:** AI System  
**Review:** ✅ Schema verificato prima della migrazione  
**Status:** READY FOR MIGRATION
