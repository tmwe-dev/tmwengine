-- Trigger che aggiunge automaticamente l'utente come membro quando invia un messaggio
CREATE OR REPLACE FUNCTION public.auto_join_room_before_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Aggiungi l'utente come membro se non lo è già
  INSERT INTO public.intranet_room_members (room_id, user_id)
  VALUES (NEW.room_id, NEW.user_id)
  ON CONFLICT (room_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Crea il trigger BEFORE INSERT sui messaggi
DROP TRIGGER IF EXISTS auto_join_room_before_message_trigger ON public.intranet_messages;

CREATE TRIGGER auto_join_room_before_message_trigger
BEFORE INSERT ON public.intranet_messages
FOR EACH ROW
EXECUTE FUNCTION public.auto_join_room_before_message();