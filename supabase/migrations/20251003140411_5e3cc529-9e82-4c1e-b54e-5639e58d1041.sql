-- Aggiungi colonna state per stato/provincia/regione geografico
ALTER TABLE public.imported_contacts 
ADD COLUMN IF NOT EXISTS state TEXT;

-- Aggiungi anche alla tabella rubrica per coerenza
ALTER TABLE public.rubrica 
ADD COLUMN IF NOT EXISTS state TEXT;