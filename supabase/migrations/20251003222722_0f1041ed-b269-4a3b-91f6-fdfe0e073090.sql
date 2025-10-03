-- Tabella per i gruppi di mittenti
CREATE TABLE IF NOT EXISTS public.email_sender_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_gruppo TEXT NOT NULL UNIQUE,
  descrizione TEXT,
  colore TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabella per le regole/associazioni mittente-gruppo
CREATE TABLE IF NOT EXISTS public.email_sender_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_email TEXT NOT NULL,
  group_id UUID NOT NULL REFERENCES public.email_sender_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(sender_email, group_id)
);

-- Indice per ricerche veloci
CREATE INDEX IF NOT EXISTS idx_email_sender_rules_email ON public.email_sender_rules(sender_email);
CREATE INDEX IF NOT EXISTS idx_email_sender_rules_group ON public.email_sender_rules(group_id);

-- Enable RLS
ALTER TABLE public.email_sender_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sender_rules ENABLE ROW LEVEL SECURITY;

-- Policies per email_sender_groups
CREATE POLICY "Allow all operations on email_sender_groups" 
ON public.email_sender_groups 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Policies per email_sender_rules
CREATE POLICY "Allow all operations on email_sender_rules" 
ON public.email_sender_rules 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Trigger per aggiornamento automatico updated_at
CREATE TRIGGER update_email_sender_groups_updated_at
BEFORE UPDATE ON public.email_sender_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_sender_rules_updated_at
BEFORE UPDATE ON public.email_sender_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();