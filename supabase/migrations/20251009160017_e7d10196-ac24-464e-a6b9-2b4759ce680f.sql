-- Tabella per attività archiviate
CREATE TABLE IF NOT EXISTS public.attivita_archiviate (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attivita_id_originale uuid NOT NULL,
  rubrica_id uuid,
  tipo character varying NOT NULL,
  descrizione text NOT NULL,
  stato character varying NOT NULL DEFAULT 'aperta',
  scadenza timestamp with time zone,
  priorita character varying NOT NULL DEFAULT 'media',
  note text,
  creato_da uuid,
  assegnato_a uuid,
  data_creazione timestamp with time zone NOT NULL DEFAULT now(),
  ora_creazione time without time zone,
  data_ultima_modifica timestamp with time zone,
  modifiche_log jsonb DEFAULT '[]'::jsonb,
  data_archiviazione timestamp with time zone NOT NULL DEFAULT now(),
  motivo_archiviazione text,
  archiviato_da uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabella per clienti archiviati dalla rubrica
CREATE TABLE IF NOT EXISTS public.rubrica_archiviata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rubrica_id_originale uuid NOT NULL,
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
  state text,
  note text,
  origine text,
  client_code text,
  position text,
  title text,
  alias text,
  company_alias text,
  stato text,
  tags text[],
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
  archiviata boolean DEFAULT false,
  completed boolean DEFAULT false,
  has_actions boolean DEFAULT false,
  last_contact date,
  scheduled_contact date,
  next_contact_date date,
  created_by text,
  data_archiviazione timestamp with time zone NOT NULL DEFAULT now(),
  motivo_archiviazione text,
  archiviato_da uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabella per contatti importati archiviati
CREATE TABLE IF NOT EXISTS public.imported_contacts_archiviati (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  imported_contact_id_originale uuid NOT NULL,
  import_log_id uuid,
  row_number integer,
  original_id text,
  name text,
  company_name text,
  title text,
  position text,
  alias text,
  company_alias text,
  email text,
  phone text,
  cell text,
  address text,
  city text,
  state text,
  zip_code text,
  country text,
  note text,
  origin text,
  client_code text,
  agent_id text,
  created_by text,
  stato text,
  commercial_anagrafiche_id text,
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
  archiviata boolean DEFAULT false,
  completed boolean DEFAULT false,
  has_actions boolean DEFAULT false,
  last_contact date,
  scheduled_contact date,
  next_contact_date date,
  is_imported_to_rubrica boolean DEFAULT false,
  data_archiviazione timestamp with time zone NOT NULL DEFAULT now(),
  motivo_archiviazione text,
  archiviato_da uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attivita_archiviate ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubrica_archiviata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imported_contacts_archiviati ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow all operations on attivita_archiviate"
ON public.attivita_archiviate
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all operations on rubrica_archiviata"
ON public.rubrica_archiviata
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all operations on imported_contacts_archiviati"
ON public.imported_contacts_archiviati
FOR ALL
USING (true)
WITH CHECK (true);

-- Indici per migliorare le performance
CREATE INDEX idx_attivita_archiviate_rubrica_id ON public.attivita_archiviate(rubrica_id);
CREATE INDEX idx_attivita_archiviate_originale ON public.attivita_archiviate(attivita_id_originale);
CREATE INDEX idx_rubrica_archiviata_originale ON public.rubrica_archiviata(rubrica_id_originale);
CREATE INDEX idx_imported_contacts_archiviati_originale ON public.imported_contacts_archiviati(imported_contact_id_originale);