-- 1. RLS Policies per user_profiles: permettere a tutti gli utenti autenticati di vedere i profili
CREATE POLICY "Authenticated users can view all profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can view all profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- 2. Aggiungi colonna is_private alla tabella intranet_rooms
ALTER TABLE public.intranet_rooms 
ADD COLUMN is_private BOOLEAN DEFAULT false;

-- 3. Funzione helper per trovare o creare stanza privata tra due utenti
CREATE OR REPLACE FUNCTION public.get_or_create_private_room(
  user1_id UUID,
  user2_id UUID
) RETURNS UUID AS $$
DECLARE
  room_id UUID;
  user1_name TEXT;
  user2_name TEXT;
BEGIN
  -- Cerca stanza privata esistente tra i due utenti
  SELECT r.id INTO room_id
  FROM public.intranet_rooms r
  WHERE r.is_private = true
  AND EXISTS (
    SELECT 1 FROM public.intranet_room_members 
    WHERE room_id = r.id AND user_id = user1_id
  )
  AND EXISTS (
    SELECT 1 FROM public.intranet_room_members 
    WHERE room_id = r.id AND user_id = user2_id
  )
  AND (
    SELECT COUNT(*) FROM public.intranet_room_members 
    WHERE room_id = r.id
  ) = 2;
  
  -- Se la stanza non esiste, creala
  IF room_id IS NULL THEN
    -- Ottieni i nomi degli utenti
    SELECT display_name INTO user1_name
    FROM public.user_profiles
    WHERE user_id = user1_id;
    
    SELECT display_name INTO user2_name
    FROM public.user_profiles
    WHERE user_id = user2_id;
    
    -- Crea la stanza privata
    INSERT INTO public.intranet_rooms (name, description, is_private, created_by)
    VALUES (
      COALESCE(user1_name, 'Utente') || ' - ' || COALESCE(user2_name, 'Utente'),
      'Chat privata',
      true,
      user1_id
    )
    RETURNING id INTO room_id;
    
    -- Aggiungi entrambi gli utenti come membri
    INSERT INTO public.intranet_room_members (room_id, user_id)
    VALUES (room_id, user1_id), (room_id, user2_id);
  END IF;
  
  RETURN room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;