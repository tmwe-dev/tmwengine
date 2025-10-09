-- Passo 2: Inviti, Timeout, Badge Personalizzati (fix)

-- Aggiungi badge personalizzati per stati utente (se non esistono già)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_profiles' AND column_name = 'status_emoji') THEN
    ALTER TABLE public.user_profiles ADD COLUMN status_emoji text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_profiles' AND column_name = 'status_color') THEN
    ALTER TABLE public.user_profiles ADD COLUMN status_color text DEFAULT '#10b981';
  END IF;
END $$;

-- Funzione per pulire richieste scadute (7 giorni)
CREATE OR REPLACE FUNCTION clean_expired_access_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE intranet_room_access_requests
  SET status = 'rejected',
      reviewed_at = now()
  WHERE status = 'pending'
    AND requested_at < now() - interval '7 days';
END;
$$;

-- Funzione per contare richieste pendenti di un utente
CREATE OR REPLACE FUNCTION get_pending_requests_count(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_count integer;
BEGIN
  SELECT COUNT(*)::integer INTO request_count
  FROM intranet_room_access_requests
  WHERE user_id = p_user_id
    AND status = 'pending';
  
  RETURN COALESCE(request_count, 0);
END;
$$;

-- Funzione per auto-approvare richieste per stanze pubbliche
CREATE OR REPLACE FUNCTION auto_approve_public_room_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  room_access_type room_access_type;
BEGIN
  -- Ottieni il tipo di accesso della stanza
  SELECT access_type INTO room_access_type
  FROM intranet_rooms
  WHERE id = NEW.room_id;
  
  -- Se è una stanza pubblica, approva automaticamente
  IF room_access_type = 'public' THEN
    NEW.status := 'approved';
    NEW.reviewed_at := now();
    
    -- Aggiungi l'utente come membro della stanza
    INSERT INTO intranet_room_members (room_id, user_id)
    VALUES (NEW.room_id, NEW.user_id)
    ON CONFLICT (room_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger per auto-approvazione (drop se esiste)
DROP TRIGGER IF EXISTS trigger_auto_approve_public_rooms ON public.intranet_room_access_requests;

CREATE TRIGGER trigger_auto_approve_public_rooms
  BEFORE INSERT ON intranet_room_access_requests
  FOR EACH ROW
  EXECUTE FUNCTION auto_approve_public_room_request();

-- Trigger per aggiungere membro quando richiesta approvata
CREATE OR REPLACE FUNCTION add_member_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se lo stato cambia a 'approved', aggiungi come membro
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    INSERT INTO intranet_room_members (room_id, user_id)
    VALUES (NEW.room_id, NEW.user_id)
    ON CONFLICT (room_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_add_member_on_approval ON public.intranet_room_access_requests;

CREATE TRIGGER trigger_add_member_on_approval
  AFTER UPDATE ON intranet_room_access_requests
  FOR EACH ROW
  WHEN (NEW.status = 'approved' AND OLD.status = 'pending')
  EXECUTE FUNCTION add_member_on_approval();