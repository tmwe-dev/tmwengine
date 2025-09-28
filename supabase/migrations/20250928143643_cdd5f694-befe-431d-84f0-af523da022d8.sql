-- Funzione per trasferire un'azienda dalle tabelle import alla rubrica 
-- mantenendo tutte le attività associate
CREATE OR REPLACE FUNCTION public.transfer_company_to_rubrica(
    imported_contact_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_rubrica_id UUID;
    imported_contact RECORD;
    activity_count INTEGER := 0;
    result JSON;
BEGIN
    -- Recupera i dati del contatto importato
    SELECT * INTO imported_contact 
    FROM public.imported_contacts 
    WHERE id = imported_contact_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Contatto importato non trovato con ID: %', imported_contact_id;
    END IF;
    
    -- Inserisce il nuovo record nella rubrica
    INSERT INTO public.rubrica (
        nome,
        azienda,
        responsabile,
        email,
        telefono,
        cellulare,
        indirizzo,
        citta,
        paese,
        zip_code,
        note,
        origine,
        client_code,
        position,
        title,
        alias,
        company_alias,
        meta_client,
        meta_express,
        meta_sea_freight,
        meta_air_freight,
        meta_interested,
        meta_reception_required_email,
        meta_contact_required_email,
        meta_presentation,
        meta_exworks,
        meta_hight_value_customer,
        meta_tutorial,
        meta_rejected,
        meta_wca,
        meta_exclient,
        archiviata,
        completed,
        has_actions,
        last_contact,
        scheduled_contact,
        next_contact_date,
        created_by,
        stato
    ) VALUES (
        imported_contact.name,
        imported_contact.company_name,
        '', -- responsabile
        imported_contact.email,
        imported_contact.phone,
        imported_contact.cell,
        imported_contact.address,
        imported_contact.city,
        imported_contact.country,
        imported_contact.zip_code,
        imported_contact.note,
        imported_contact.origin,
        imported_contact.client_code,
        imported_contact.position,
        imported_contact.title,
        imported_contact.alias,
        imported_contact.company_alias,
        imported_contact.meta_client,
        imported_contact.meta_express,
        imported_contact.meta_sea_freight,
        imported_contact.meta_air_freight,
        imported_contact.meta_interested,
        imported_contact.meta_reception_required_email,
        imported_contact.meta_contact_required_email,
        imported_contact.meta_presentation,
        imported_contact.meta_exworks,
        imported_contact.meta_hight_value_customer,
        imported_contact.meta_tutorial,
        imported_contact.meta_rejected,
        imported_contact.meta_wca,
        imported_contact.meta_exclient,
        imported_contact.archiviata,
        imported_contact.completed,
        imported_contact.has_actions,
        imported_contact.last_contact,
        imported_contact.scheduled_contact,
        imported_contact.next_contact_date,
        imported_contact.created_by,
        'A' -- stato attivo
    ) RETURNING id INTO new_rubrica_id;
    
    -- Trasferisce le attività associate (se esistono nella tabella attivita)
    UPDATE public.attivita 
    SET rubrica_id = new_rubrica_id
    WHERE rubrica_id = imported_contact_id;
    
    -- Conta le attività trasferite
    GET DIAGNOSTICS activity_count = ROW_COUNT;
    
    -- Elimina il contatto dalle tabelle import
    DELETE FROM public.imported_contacts WHERE id = imported_contact_id;
    
    -- Prepara il risultato
    result := json_build_object(
        'success', true,
        'new_rubrica_id', new_rubrica_id,
        'activities_transferred', activity_count,
        'message', format('Azienda trasferita con successo. %s attività associate.', activity_count)
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Rollback automatico in caso di errore
        RAISE EXCEPTION 'Errore durante il trasferimento: %', SQLERRM;
END;
$$;