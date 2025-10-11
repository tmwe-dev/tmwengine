## Schema Pre-Migration: 2025-01-15

### Obiettivo Modifica
Documentazione dello stato attuale del database dopo implementazione supporto generazione immagini nel Chat Laboratory.

Questo backup serve come baseline per future modifiche.

---

## Tabelle Principali

### chat_laboratory_conversations

**DDL Corrente:**
```sql
CREATE TABLE public.chat_laboratory_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titolo text,
  system_prompt_id uuid REFERENCES chat_laboratory_system_prompts(id),
  active_participants jsonb DEFAULT '[]'::jsonb,
  current_turn_index integer DEFAULT 0,
  last_speaker_index integer DEFAULT 0,
  conversation_phase text DEFAULT 'discussion',
  response_mode text DEFAULT 'all',
  target_participant_type text,
  memoria_completa boolean DEFAULT false,
  riassunto_contesto text,
  final_summary text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

**Indexes:**
- PRIMARY KEY on `id`
- Foreign key index on `system_prompt_id`

**Trigger:**
```sql
CREATE TRIGGER update_chat_laboratory_updated_at
BEFORE UPDATE ON chat_laboratory_conversations
FOR EACH ROW
EXECUTE FUNCTION update_chat_laboratory_updated_at();
```

---

### chat_laboratory_messages

**DDL Corrente:**
```sql
CREATE TABLE public.chat_laboratory_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES chat_laboratory_conversations(id),
  sender_type text NOT NULL,
  sender_name text NOT NULL,
  content text NOT NULL,
  images jsonb DEFAULT '[]'::jsonb,
  generated_images jsonb DEFAULT '[]'::jsonb,  -- ✅ Aggiunto recentemente
  attachments jsonb DEFAULT '[]'::jsonb,
  is_visible_to_ai boolean DEFAULT true,
  token_input integer,
  token_output integer,
  tempo_risposta_ms integer,
  created_at timestamp with time zone DEFAULT now()
);
```

**Nota:** Campo `generated_images` aggiunto il 2025-01-15 per supportare generazione immagini AI.

**Indexes:**
- PRIMARY KEY on `id`
- Foreign key index on `conversation_id`

---

### chat_laboratory_participants

**DDL Corrente:**
```sql
CREATE TABLE public.chat_laboratory_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES chat_laboratory_conversations(id),
  type text NOT NULL,
  name text NOT NULL,
  role_name text DEFAULT 'Partecipante',
  role_description text,
  system_prompt text,
  is_active boolean DEFAULT true,
  response_count integer DEFAULT 0,
  has_responded_current_turn boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

**Trigger:**
```sql
CREATE TRIGGER update_chat_laboratory_updated_at
BEFORE UPDATE ON chat_laboratory_participants
FOR EACH ROW
EXECUTE FUNCTION update_chat_laboratory_updated_at();
```

---

### chat_laboratory_system_prompts

**DDL Corrente:**
```sql
CREATE TABLE public.chat_laboratory_system_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  contenuto text NOT NULL,
  attivo boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

**Contenuto Prompt Attivo (Snapshot):**
```
[Contenuto del system prompt include ora regole per generazione immagini]

--- REGOLE GENERAZIONE IMMAGINI ---
Quando l'utente richiede di generare un'immagine:
- NON commentare o continuare la conversazione
- La generazione immagini è un'azione diretta
- Dopo la generazione, aspetta la prossima richiesta utente
- Non fare analisi o discussioni sull'immagine generata
```

---

### chat_laboratory_usage_stats

**DDL Corrente:**
```sql
CREATE TABLE public.chat_laboratory_usage_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES chat_laboratory_conversations(id),
  data_utilizzo date NOT NULL DEFAULT CURRENT_DATE,
  numero_messaggi integer NOT NULL DEFAULT 0,
  token_totali_input integer NOT NULL DEFAULT 0,
  token_totali_output integer NOT NULL DEFAULT 0,
  tempo_totale_ms integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
```

---

## RLS Policies

### chat_laboratory_conversations
```sql
CREATE POLICY "Allow all operations on chat_laboratory_conversations"
ON chat_laboratory_conversations
FOR ALL
USING (true);
```

### chat_laboratory_messages
```sql
CREATE POLICY "Allow all operations on chat_laboratory_messages"
ON chat_laboratory_messages
FOR ALL
USING (true);
```

### chat_laboratory_participants
```sql
CREATE POLICY "Allow all operations on chat_laboratory_participants"
ON chat_laboratory_participants
FOR ALL
USING (true);
```

### chat_laboratory_system_prompts
```sql
CREATE POLICY "Allow all operations on chat_laboratory_system_prompts"
ON chat_laboratory_system_prompts
FOR ALL
USING (true);
```

### chat_laboratory_usage_stats
```sql
CREATE POLICY "Allow all operations on chat_laboratory_usage_stats"
ON chat_laboratory_usage_stats
FOR ALL
USING (true);
```

---

## Database Functions Coinvolte

### update_chat_laboratory_updated_at()

```sql
CREATE OR REPLACE FUNCTION public.update_chat_laboratory_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
```

**Utilizzo:** Trigger applicato a:
- `chat_laboratory_conversations`
- `chat_laboratory_participants`

---

## Dati di Esempio (Stato Attuale)

### Prompt di Sistema Attivo
```sql
SELECT id, nome, attivo, created_at 
FROM chat_laboratory_system_prompts 
WHERE attivo = true;
```

**Risultato atteso:**
- 1 prompt attivo con regole generazione immagini integrate

### Conteggio Messaggi con Immagini Generate
```sql
SELECT 
  COUNT(*) as total_messages,
  COUNT(CASE WHEN generated_images != '[]'::jsonb THEN 1 END) as messages_with_images
FROM chat_laboratory_messages;
```

---

## Note Pre-Modifica

**Data Backup:** 2025-01-15  
**Motivo:** Baseline dopo implementazione image generation  
**Modifiche Recenti:**
- Aggiunto campo `generated_images` a `chat_laboratory_messages`
- Aggiornato prompt di sistema con regole generazione immagini
- Creata edge function `generate-image`
- Modificata edge function `chat-laboratory-orchestrator` con skip logic

**Stato RLS:** Tutte le tabelle hanno policy permissiva (allow all)  
**Nota Sicurezza:** Considerare in futuro policies più restrittive basate su user ownership

---

## Rollback Plan

Se necessario rollback:

1. **Rimuovere campo generated_images:**
```sql
ALTER TABLE chat_laboratory_messages 
DROP COLUMN IF EXISTS generated_images;
```

2. **Ripristinare prompt precedente:**
```sql
UPDATE chat_laboratory_system_prompts
SET contenuto = [contenuto_precedente_senza_regole_immagini]
WHERE attivo = true;
```

3. **Disabilitare edge function:**
- Rimuovere `generate-image` function
- Rollback `chat-laboratory-orchestrator` a `index-old1.ts`

---

**Creato da:** Development Team  
**Prossima Review:** Prima della prossima modifica database  
**Link:** Documentato in `DATABASE_INFO.md` changelog
