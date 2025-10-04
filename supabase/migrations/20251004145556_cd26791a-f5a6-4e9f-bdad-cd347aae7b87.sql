-- Crea enum per i tipi di azioni email
CREATE TYPE email_action_type AS ENUM (
  'move_to_folder',
  'mark_as_read',
  'archive',
  'delete',
  'forward'
);

-- Crea tabella per le azioni automatiche sui mittenti
CREATE TABLE public.email_sender_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_email TEXT NOT NULL,
  action_type email_action_type NOT NULL,
  action_params JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(sender_email)
);

-- Abilita RLS
ALTER TABLE public.email_sender_actions ENABLE ROW LEVEL SECURITY;

-- Policy per permettere tutte le operazioni
CREATE POLICY "Allow all operations on email_sender_actions"
ON public.email_sender_actions
FOR ALL
USING (true)
WITH CHECK (true);

-- Aggiungi commento
COMMENT ON TABLE public.email_sender_actions IS 'Azioni automatiche da applicare alle email in base al mittente';