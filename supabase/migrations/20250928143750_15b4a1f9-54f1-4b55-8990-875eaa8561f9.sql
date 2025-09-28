-- Funzione per trasferire multiple aziende dalle tabelle import alla rubrica 
-- mantenendo tutte le attività associate
CREATE OR REPLACE FUNCTION public.transfer_multiple_companies_to_rubrica(
    imported_contact_ids UUID[]
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    contact_id UUID;
    total_transferred INTEGER := 0;
    total_activities_transferred INTEGER := 0;
    transfer_result JSON;
    failed_transfers TEXT[] := '{}';
    result JSON;
BEGIN
    -- Itera attraverso ogni ID e trasferisce
    FOREACH contact_id IN ARRAY imported_contact_ids
    LOOP
        BEGIN
            -- Chiama la funzione singola per ogni contatto
            SELECT public.transfer_company_to_rubrica(contact_id) INTO transfer_result;
            
            -- Se il trasferimento è riuscito, aggiorna i contatori
            IF (transfer_result->>'success')::boolean THEN
                total_transferred := total_transferred + 1;
                total_activities_transferred := total_activities_transferred + 
                    (transfer_result->>'activities_transferred')::integer;
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                -- Registra il fallimento ma continua con gli altri
                failed_transfers := array_append(failed_transfers, contact_id::text || ': ' || SQLERRM);
        END;
    END LOOP;
    
    -- Prepara il risultato
    result := json_build_object(
        'success', true,
        'total_transferred', total_transferred,
        'total_activities_transferred', total_activities_transferred,
        'failed_transfers', failed_transfers,
        'message', format('%s aziende trasferite con %s attività associate.', 
                         total_transferred, total_activities_transferred)
    );
    
    RETURN result;
END;
$$;