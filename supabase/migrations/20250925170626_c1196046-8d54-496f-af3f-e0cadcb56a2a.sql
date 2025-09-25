-- Creo la tabella rubrica per gestire tutti i contatti
CREATE TABLE public.rubrica (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Dati personali del contatto
  responsabile TEXT,
  nome TEXT,
  alias TEXT,
  position TEXT,
  title TEXT,
  
  -- Contatti
  telefono TEXT,
  cellulare TEXT,
  email TEXT,
  
  -- Dati azienda
  azienda TEXT,
  company_alias TEXT,
  indirizzo TEXT,
  citta TEXT,
  paese TEXT,
  zip_code TEXT,
  
  -- Metadati gestionali
  stato TEXT DEFAULT 'A',
  note TEXT,
  tags TEXT[],
  origine TEXT,
  client_code TEXT,
  
  -- Campi specifici per il business
  meta_client BOOLEAN DEFAULT false,
  meta_express BOOLEAN DEFAULT false,
  meta_sea_freight BOOLEAN DEFAULT false,
  meta_air_freight BOOLEAN DEFAULT false,
  meta_interested BOOLEAN DEFAULT false,
  meta_reception_required_email BOOLEAN DEFAULT false,
  meta_contact_required_email BOOLEAN DEFAULT false,
  meta_presentation BOOLEAN DEFAULT false,
  meta_exworks BOOLEAN DEFAULT false,
  meta_hight_value_customer BOOLEAN DEFAULT false,
  meta_tutorial BOOLEAN DEFAULT false,
  meta_rejected BOOLEAN DEFAULT false,
  meta_wca BOOLEAN DEFAULT false,
  meta_exclient BOOLEAN DEFAULT false,
  
  -- Gestione workflow
  archiviata BOOLEAN DEFAULT false,
  completed BOOLEAN DEFAULT false,
  has_actions BOOLEAN DEFAULT false,
  last_contact DATE,
  scheduled_contact DATE,
  next_contact_date DATE,
  
  -- Audit fields
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rubrica ENABLE ROW LEVEL SECURITY;

-- Policies per rubrica
CREATE POLICY "Allow all operations on rubrica" 
ON public.rubrica 
FOR ALL 
USING (true);

-- Indici per migliorare le performance
CREATE INDEX idx_rubrica_email ON public.rubrica(email);
CREATE INDEX idx_rubrica_azienda ON public.rubrica(azienda);
CREATE INDEX idx_rubrica_stato ON public.rubrica(stato);
CREATE INDEX idx_rubrica_responsabile ON public.rubrica(responsabile);

-- Trigger per aggiornare updated_at
CREATE TRIGGER update_rubrica_updated_at
BEFORE UPDATE ON public.rubrica
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();