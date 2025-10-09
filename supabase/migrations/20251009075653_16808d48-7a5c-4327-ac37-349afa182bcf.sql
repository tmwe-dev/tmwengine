-- Ricreo la funzione get_or_create_private_room con migliori gestione errori
CREATE OR REPLACE FUNCTION public.get_or_create_private_room(user1_id uuid, user2_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    VALUES (room_id, user1_id), (room_id, user2_id)
    ON CONFLICT (room_id, user_id) DO NOTHING;
    
    -- Crea le impostazioni AI per la stanza privata
    INSERT INTO public.intranet_room_ai_prompts (room_id)
    VALUES (room_id)
    ON CONFLICT (room_id) DO NOTHING;
  END IF;
  
  RETURN room_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Errore in get_or_create_private_room: %', SQLERRM;
    RAISE;
END;
$$;