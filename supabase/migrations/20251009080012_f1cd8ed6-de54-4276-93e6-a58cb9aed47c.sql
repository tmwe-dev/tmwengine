-- Tabella per tracciare lo stato di lettura delle stanze per ogni utente
CREATE TABLE IF NOT EXISTS public.intranet_user_room_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.intranet_rooms(id) ON DELETE CASCADE,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, room_id)
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_user_room_status_user ON public.intranet_user_room_status(user_id);
CREATE INDEX IF NOT EXISTS idx_user_room_status_room ON public.intranet_user_room_status(room_id);

-- RLS policies
ALTER TABLE public.intranet_user_room_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own room status"
  ON public.intranet_user_room_status
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own room status"
  ON public.intranet_user_room_status
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own room status"
  ON public.intranet_user_room_status
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger per aggiornare updated_at
CREATE OR REPLACE FUNCTION update_user_room_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_room_status_updated_at
  BEFORE UPDATE ON public.intranet_user_room_status
  FOR EACH ROW
  EXECUTE FUNCTION update_user_room_status_updated_at();

-- Funzione per ottenere il numero di messaggi non letti
CREATE OR REPLACE FUNCTION public.get_unread_messages_count(p_user_id UUID, p_room_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_read TIMESTAMP WITH TIME ZONE;
  unread_count INTEGER;
BEGIN
  -- Ottieni l'ultimo timestamp di lettura
  SELECT last_read_at INTO last_read
  FROM public.intranet_user_room_status
  WHERE user_id = p_user_id AND room_id = p_room_id;
  
  -- Se non c'è record, conta tutti i messaggi della stanza
  IF last_read IS NULL THEN
    SELECT COUNT(*)::INTEGER INTO unread_count
    FROM public.intranet_messages
    WHERE room_id = p_room_id;
  ELSE
    -- Conta i messaggi dopo l'ultimo letto
    SELECT COUNT(*)::INTEGER INTO unread_count
    FROM public.intranet_messages
    WHERE room_id = p_room_id 
      AND created_at > last_read
      AND user_id != p_user_id; -- Non contare i propri messaggi
  END IF;
  
  RETURN COALESCE(unread_count, 0);
END;
$$;

-- Abilita realtime per la nuova tabella
ALTER PUBLICATION supabase_realtime ADD TABLE public.intranet_user_room_status;