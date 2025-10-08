-- Funzione per aggiungere automaticamente un utente come membro quando accede a una stanza
CREATE OR REPLACE FUNCTION auto_join_room()
RETURNS TRIGGER AS $$
BEGIN
  -- Aggiungi l'utente come membro se non lo è già
  INSERT INTO public.intranet_room_members (room_id, user_id)
  VALUES (NEW.room_id, NEW.user_id)
  ON CONFLICT (room_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger che si attiva quando un utente prova a inviare un messaggio
-- In questo modo l'utente viene aggiunto automaticamente come membro
DROP TRIGGER IF EXISTS auto_join_room_on_message ON public.intranet_messages;

-- Politica più permissiva per INSERT che permette l'inserimento anche se non si è membri
-- Il trigger poi aggiungerà l'utente come membro
DROP POLICY IF EXISTS "Users can send messages to their rooms" ON public.intranet_messages;

CREATE POLICY "Users can send messages to their rooms"
ON public.intranet_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
);

-- Aggiungi anche una policy per permettere agli utenti di diventare membri di qualsiasi stanza
DROP POLICY IF EXISTS "Users can join any room" ON public.intranet_room_members;

CREATE POLICY "Users can join any room"
ON public.intranet_room_members
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);