-- Funzione per creare record attività
CREATE OR REPLACE FUNCTION public.create_activity_records(activity_data jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    activity jsonb;
BEGIN
    -- Itera attraverso ogni attività e inseriscila
    FOR activity IN SELECT * FROM jsonb_array_elements(activity_data)
    LOOP
        INSERT INTO public.attivita (
            rubrica_id,
            tipo,
            descrizione,
            stato,
            scadenza,
            priorita,
            assegnato_a,
            creato_da
        ) VALUES (
            (activity->>'rubrica_id')::uuid,
            activity->>'tipo',
            activity->>'descrizione',
            activity->>'stato',
            CASE 
                WHEN activity->>'scadenza' IS NOT NULL 
                THEN (activity->>'scadenza')::timestamp with time zone
                ELSE NULL
            END,
            activity->>'priorita',
            CASE 
                WHEN activity->>'assegnato_a' IS NOT NULL 
                THEN (activity->>'assegnato_a')::uuid
                ELSE NULL
            END,
            CASE 
                WHEN activity->>'creato_da' IS NOT NULL 
                THEN (activity->>'creato_da')::uuid
                ELSE NULL
            END
        );
    END LOOP;
END;
$$;