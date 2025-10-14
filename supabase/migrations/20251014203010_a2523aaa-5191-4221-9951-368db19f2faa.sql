-- Fix ambiguous column reference in get_or_create_private_room function
CREATE OR REPLACE FUNCTION public.get_or_create_private_room(user1_id uuid, user2_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_room_id UUID;
  user1_name TEXT;
  user2_name TEXT;
BEGIN
  -- Cerca stanza privata esistente tra i due utenti
  SELECT r.id INTO v_room_id
  FROM public.intranet_rooms r
  WHERE r.is_private = true
  AND EXISTS (
    SELECT 1 FROM public.intranet_room_members m1
    WHERE m1.room_id = r.id AND m1.user_id = user1_id
  )
  AND EXISTS (
    SELECT 1 FROM public.intranet_room_members m2
    WHERE m2.room_id = r.id AND m2.user_id = user2_id
  )
  AND (
    SELECT COUNT(*) FROM public.intranet_room_members m3
    WHERE m3.room_id = r.id
  ) = 2;
  
  -- Se la stanza non esiste, creala
  IF v_room_id IS NULL THEN
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
    RETURNING id INTO v_room_id;
    
    -- Aggiungi entrambi gli utenti come membri
    INSERT INTO public.intranet_room_members (room_id, user_id)
    VALUES (v_room_id, user1_id), (v_room_id, user2_id)
    ON CONFLICT (room_id, user_id) DO NOTHING;
    
    -- Crea le impostazioni AI per la stanza privata
    INSERT INTO public.intranet_room_ai_prompts (room_id)
    VALUES (v_room_id)
    ON CONFLICT (room_id) DO NOTHING;
  END IF;
  
  RETURN v_room_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Errore in get_or_create_private_room: %', SQLERRM;
    RAISE;
END;
$function$;