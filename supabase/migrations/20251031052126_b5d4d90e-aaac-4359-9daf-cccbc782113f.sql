-- ============================================
-- TABELLA PER LOGHI AZIENDALI
-- Salva loghi recuperati da web per riutilizzo
-- ============================================

CREATE TABLE IF NOT EXISTS public.company_logos (
  domain TEXT PRIMARY KEY,
  logo_url TEXT,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indice per performance
CREATE INDEX IF NOT EXISTS idx_company_logos_fetched_at ON public.company_logos(fetched_at);

-- RLS: tutti possono leggere, solo autenticati possono scrivere
ALTER TABLE public.company_logos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chiunque può leggere i loghi" 
ON public.company_logos 
FOR SELECT 
USING (true);

CREATE POLICY "Utenti autenticati possono inserire loghi" 
ON public.company_logos 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Utenti autenticati possono aggiornare loghi" 
ON public.company_logos 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

COMMENT ON TABLE public.company_logos IS 'Cache dei loghi aziendali recuperati automaticamente da web per email Smart Inbox';