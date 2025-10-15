## Schema Pre-Migration: 2025-01-15

### Obiettivo Modifica
Rendere nullable le colonne `body_html` e `body_text` della tabella `email_messages` per permettere il download lazy dei contenuti email (solo metadati inizialmente).

### Tabelle Coinvolte
- `email_messages`

### DDL Corrente

```sql
CREATE TABLE public.email_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id text NOT NULL,
  user_email text NOT NULL,
  provider_id uuid NOT NULL,
  cartella text DEFAULT 'INBOX'::text,
  stato text NOT NULL DEFAULT 'nuovo'::text,
  direzione text NOT NULL,
  from_email text NOT NULL,
  to_email text NOT NULL,
  cc_email text,
  bcc_email text,
  subject text,
  body_html text,              -- CURRENTLY NOT NULL
  body_text text,              -- CURRENTLY NOT NULL
  data_invio timestamp with time zone,
  data_ricezione timestamp with time zone NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  flags jsonb DEFAULT '[]'::jsonb,
  raw_headers jsonb,
  thread_id text,
  in_reply_to text,
  email_references text,
  message_hash text,
  sync_status text DEFAULT 'sincronizzato'::text,
  is_shared_email boolean DEFAULT false,
  shared_email_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
```

### Indici Attivi

```sql
CREATE INDEX idx_email_messages_user_folder ON public.email_messages(user_email, cartella);
CREATE INDEX idx_email_messages_message_id ON public.email_messages(message_id);
CREATE INDEX idx_email_messages_thread_id ON public.email_messages(thread_id);
CREATE INDEX idx_email_messages_data ON public.email_messages(data_ricezione DESC);
```

### RLS Policies

```sql
-- Users can view own emails v3
CREATE POLICY "Users can view own emails v3" 
ON public.email_messages 
FOR SELECT 
USING (
  (user_email IN (
    SELECT user_profiles.tmwe_email
    FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
  )) 
  OR 
  (
    (is_shared_email = true) 
    AND (EXISTS (
      SELECT 1
      FROM shared_email_members
      WHERE (shared_email_members.shared_email_id = email_messages.shared_email_id) 
        AND (shared_email_members.user_id = auth.uid()) 
        AND (shared_email_members.can_read = true)
    ))
  )
);

-- Users can insert own emails v3
CREATE POLICY "Users can insert own emails v3" 
ON public.email_messages 
FOR INSERT 
WITH CHECK (
  user_email IN (
    SELECT user_profiles.tmwe_email
    FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
  )
);

-- Users can update own emails v3
CREATE POLICY "Users can update own emails v3" 
ON public.email_messages 
FOR UPDATE 
USING (
  user_email IN (
    SELECT user_profiles.tmwe_email
    FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
  )
);

-- Users can delete own emails v3
CREATE POLICY "Users can delete own emails v3" 
ON public.email_messages 
FOR DELETE 
USING (
  user_email IN (
    SELECT user_profiles.tmwe_email
    FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
  )
);
```

### Note
- Questa modifica è parte dell'ottimizzazione del download email
- Le colonne body_html e body_text diventeranno opzionali
- Il body sarà scaricato on-demand tramite lazy loading
- Riduzione prevista: 95% del traffico dati durante il sync iniziale
