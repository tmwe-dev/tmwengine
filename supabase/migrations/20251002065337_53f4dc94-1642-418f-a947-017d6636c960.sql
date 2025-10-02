-- Crea tabella archivio_indirizzi per contatti archiviati
CREATE TABLE public.archivio_indirizzi (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  record_originale_id uuid NOT NULL,
  tipo_origine text NOT NULL, -- 'rubrica' o 'imported_contacts'
  nome text,
  azienda text,
  responsabile text,
  email text,
  telefono text,
  cellulare text,
  indirizzo text,
  citta text,
  paese text,
  zip_code text,
  position text,
  title text,
  alias text,
  company_alias text,
  note text,
  tags text[],
  origine text,
  client_code text,
  stato text,
  meta_client boolean DEFAULT false,
  meta_express boolean DEFAULT false,
  meta_sea_freight boolean DEFAULT false,
  meta_air_freight boolean DEFAULT false,
  meta_interested boolean DEFAULT false,
  meta_reception_required_email boolean DEFAULT false,
  meta_contact_required_email boolean DEFAULT false,
  meta_presentation boolean DEFAULT false,
  meta_exworks boolean DEFAULT false,
  meta_hight_value_customer boolean DEFAULT false,
  meta_tutorial boolean DEFAULT false,
  meta_rejected boolean DEFAULT false,
  meta_wca boolean DEFAULT false,
  meta_exclient boolean DEFAULT false,
  has_actions boolean DEFAULT false,
  completed boolean DEFAULT false,
  last_contact date,
  scheduled_contact date,
  next_contact_date date,
  created_by text,
  data_archiviazione timestamp with time zone NOT NULL DEFAULT now(),
  archiviato_da uuid REFERENCES auth.users(id),
  motivo_archiviazione text,
  dati_completi jsonb, -- backup completo del record originale
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Crea tabella archivio_attivita per attività archiviate
CREATE TABLE public.archivio_attivita (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attivita_originale_id uuid NOT NULL,
  archivio_indirizzo_id uuid REFERENCES public.archivio_indirizzi(id) ON DELETE CASCADE,
  rubrica_id uuid, -- ID del contatto originale
  tipo character varying NOT NULL,
  descrizione text NOT NULL,
  stato character varying NOT NULL,
  scadenza timestamp with time zone,
  priorita character varying NOT NULL,
  assegnato_a uuid,
  creato_da uuid,
  note text,
  data_creazione timestamp with time zone,
  ora_creazione time without time zone,
  data_ultima_modifica timestamp with time zone,
  modifiche_log jsonb DEFAULT '[]'::jsonb,
  data_archiviazione timestamp with time zone NOT NULL DEFAULT now(),
  archiviato_da uuid REFERENCES auth.users(id),
  dati_completi jsonb, -- backup completo dell'attività originale
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Abilita RLS sulle tabelle archivio
ALTER TABLE public.archivio_indirizzi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archivio_attivita ENABLE ROW LEVEL SECURITY;

-- Policy per archivio_indirizzi
CREATE POLICY "Allow all operations on archivio_indirizzi"
  ON public.archivio_indirizzi
  FOR ALL
  USING (true);

-- Policy per archivio_attivita
CREATE POLICY "Allow all operations on archivio_attivita"
  ON public.archivio_attivita
  FOR ALL
  USING (true);

-- Funzione per archiviare un contatto da rubrica con le sue attività
CREATE OR REPLACE FUNCTION public.archivia_contatto_rubrica(
  _rubrica_id uuid,
  _motivo text DEFAULT NULL,
  _user_id uuid DEFAULT auth.uid()
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  contatto_record RECORD;
  archivio_id uuid;
  attivita_archiviate integer := 0;
  attivita_record RECORD;
BEGIN
  -- Recupera il contatto dalla rubrica
  SELECT * INTO contatto_record
  FROM public.rubrica
  WHERE id = _rubrica_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contatto non trovato con ID: %', _rubrica_id;
  END IF;
  
  -- Inserisce il contatto nell'archivio
  INSERT INTO public.archivio_indirizzi (
    record_originale_id,
    tipo_origine,
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
    position,
    title,
    alias,
    company_alias,
    note,
    tags,
    origine,
    client_code,
    stato,
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
    has_actions,
    completed,
    last_contact,
    scheduled_contact,
    next_contact_date,
    created_by,
    archiviato_da,
    motivo_archiviazione,
    dati_completi
  ) VALUES (
    contatto_record.id,
    'rubrica',
    contatto_record.nome,
    contatto_record.azienda,
    contatto_record.responsabile,
    contatto_record.email,
    contatto_record.telefono,
    contatto_record.cellulare,
    contatto_record.indirizzo,
    contatto_record.citta,
    contatto_record.paese,
    contatto_record.zip_code,
    contatto_record.position,
    contatto_record.title,
    contatto_record.alias,
    contatto_record.company_alias,
    contatto_record.note,
    contatto_record.tags,
    contatto_record.origine,
    contatto_record.client_code,
    contatto_record.stato,
    contatto_record.meta_client,
    contatto_record.meta_express,
    contatto_record.meta_sea_freight,
    contatto_record.meta_air_freight,
    contatto_record.meta_interested,
    contatto_record.meta_reception_required_email,
    contatto_record.meta_contact_required_email,
    contatto_record.meta_presentation,
    contatto_record.meta_exworks,
    contatto_record.meta_hight_value_customer,
    contatto_record.meta_tutorial,
    contatto_record.meta_rejected,
    contatto_record.meta_wca,
    contatto_record.meta_exclient,
    contatto_record.has_actions,
    contatto_record.completed,
    contatto_record.last_contact,
    contatto_record.scheduled_contact,
    contatto_record.next_contact_date,
    contatto_record.created_by,
    _user_id,
    _motivo,
    row_to_json(contatto_record)::jsonb
  ) RETURNING id INTO archivio_id;
  
  -- Archivia le attività associate
  FOR attivita_record IN
    SELECT * FROM public.attivita
    WHERE rubrica_id = _rubrica_id
  LOOP
    INSERT INTO public.archivio_attivita (
      attivita_originale_id,
      archivio_indirizzo_id,
      rubrica_id,
      tipo,
      descrizione,
      stato,
      scadenza,
      priorita,
      assegnato_a,
      creato_da,
      note,
      data_creazione,
      ora_creazione,
      data_ultima_modifica,
      modifiche_log,
      archiviato_da,
      dati_completi
    ) VALUES (
      attivita_record.id,
      archivio_id,
      attivita_record.rubrica_id,
      attivita_record.tipo,
      attivita_record.descrizione,
      attivita_record.stato,
      attivita_record.scadenza,
      attivita_record.priorita,
      attivita_record.assegnato_a,
      attivita_record.creato_da,
      attivita_record.note,
      attivita_record.data_creazione,
      attivita_record.ora_creazione,
      attivita_record.data_ultima_modifica,
      attivita_record.modifiche_log,
      _user_id,
      row_to_json(attivita_record)::jsonb
    );
    
    attivita_archiviate := attivita_archiviate + 1;
  END LOOP;
  
  -- Elimina le attività associate
  DELETE FROM public.attivita WHERE rubrica_id = _rubrica_id;
  
  -- Elimina il contatto dalla rubrica
  DELETE FROM public.rubrica WHERE id = _rubrica_id;
  
  RETURN json_build_object(
    'success', true,
    'archivio_id', archivio_id,
    'attivita_archiviate', attivita_archiviate,
    'message', format('Contatto archiviato con %s attività', attivita_archiviate)
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Errore durante l''archiviazione: %', SQLERRM;
END;
$$;

-- Funzione per archiviare un contatto importato con le sue attività
CREATE OR REPLACE FUNCTION public.archivia_contatto_importato(
  _imported_contact_id uuid,
  _motivo text DEFAULT NULL,
  _user_id uuid DEFAULT auth.uid()
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  contatto_record RECORD;
  archivio_id uuid;
  attivita_archiviate integer := 0;
  attivita_record RECORD;
BEGIN
  -- Recupera il contatto importato
  SELECT * INTO contatto_record
  FROM public.imported_contacts
  WHERE id = _imported_contact_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contatto importato non trovato con ID: %', _imported_contact_id;
  END IF;
  
  -- Inserisce il contatto nell'archivio
  INSERT INTO public.archivio_indirizzi (
    record_originale_id,
    tipo_origine,
    nome,
    azienda,
    email,
    telefono,
    cellulare,
    indirizzo,
    citta,
    paese,
    zip_code,
    position,
    title,
    alias,
    company_alias,
    note,
    origine,
    client_code,
    stato,
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
    has_actions,
    completed,
    last_contact,
    scheduled_contact,
    next_contact_date,
    created_by,
    archiviato_da,
    motivo_archiviazione,
    dati_completi
  ) VALUES (
    contatto_record.id,
    'imported_contacts',
    contatto_record.name,
    contatto_record.company_name,
    contatto_record.email,
    contatto_record.phone,
    contatto_record.cell,
    contatto_record.address,
    contatto_record.city,
    contatto_record.country,
    contatto_record.zip_code,
    contatto_record.position,
    contatto_record.title,
    contatto_record.alias,
    contatto_record.company_alias,
    contatto_record.note,
    contatto_record.origin,
    contatto_record.client_code,
    contatto_record.stato,
    contatto_record.meta_client,
    contatto_record.meta_express,
    contatto_record.meta_sea_freight,
    contatto_record.meta_air_freight,
    contatto_record.meta_interested,
    contatto_record.meta_reception_required_email,
    contatto_record.meta_contact_required_email,
    contatto_record.meta_presentation,
    contatto_record.meta_exworks,
    contatto_record.meta_hight_value_customer,
    contatto_record.meta_tutorial,
    contatto_record.meta_rejected,
    contatto_record.meta_wca,
    contatto_record.meta_exclient,
    contatto_record.has_actions,
    contatto_record.completed,
    contatto_record.last_contact,
    contatto_record.scheduled_contact,
    contatto_record.next_contact_date,
    contatto_record.created_by,
    _user_id,
    _motivo,
    row_to_json(contatto_record)::jsonb
  ) RETURNING id INTO archivio_id;
  
  -- Archivia le attività associate
  FOR attivita_record IN
    SELECT * FROM public.attivita
    WHERE rubrica_id = _imported_contact_id
  LOOP
    INSERT INTO public.archivio_attivita (
      attivita_originale_id,
      archivio_indirizzo_id,
      rubrica_id,
      tipo,
      descrizione,
      stato,
      scadenza,
      priorita,
      assegnato_a,
      creato_da,
      note,
      data_creazione,
      ora_creazione,
      data_ultima_modifica,
      modifiche_log,
      archiviato_da,
      dati_completi
    ) VALUES (
      attivita_record.id,
      archivio_id,
      attivita_record.rubrica_id,
      attivita_record.tipo,
      attivita_record.descrizione,
      attivita_record.stato,
      attivita_record.scadenza,
      attivita_record.priorita,
      attivita_record.assegnato_a,
      attivita_record.creato_da,
      attivita_record.note,
      attivita_record.data_creazione,
      attivita_record.ora_creazione,
      attivita_record.data_ultima_modifica,
      attivita_record.modifiche_log,
      _user_id,
      row_to_json(attivita_record)::jsonb
    );
    
    attivita_archiviate := attivita_archiviate + 1;
  END LOOP;
  
  -- Elimina le attività associate
  DELETE FROM public.attivita WHERE rubrica_id = _imported_contact_id;
  
  -- Elimina il contatto importato
  DELETE FROM public.imported_contacts WHERE id = _imported_contact_id;
  
  RETURN json_build_object(
    'success', true,
    'archivio_id', archivio_id,
    'attivita_archiviate', attivita_archiviate,
    'message', format('Contatto archiviato con %s attività', attivita_archiviate)
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Errore durante l''archiviazione: %', SQLERRM;
END;
$$;

-- Indici per migliorare le performance
CREATE INDEX idx_archivio_indirizzi_record_originale ON public.archivio_indirizzi(record_originale_id);
CREATE INDEX idx_archivio_indirizzi_tipo_origine ON public.archivio_indirizzi(tipo_origine);
CREATE INDEX idx_archivio_indirizzi_data_archiviazione ON public.archivio_indirizzi(data_archiviazione);
CREATE INDEX idx_archivio_attivita_archivio_indirizzo ON public.archivio_attivita(archivio_indirizzo_id);
CREATE INDEX idx_archivio_attivita_attivita_originale ON public.archivio_attivita(attivita_originale_id);

-- Trigger per updated_at
CREATE TRIGGER update_archivio_indirizzi_updated_at
  BEFORE UPDATE ON public.archivio_indirizzi
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_archivio_attivita_updated_at
  BEFORE UPDATE ON public.archivio_attivita
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();