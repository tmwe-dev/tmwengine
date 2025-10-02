-- Remove the foreign key constraint from attivita.rubrica_id
ALTER TABLE public.attivita 
DROP CONSTRAINT IF EXISTS attivita_rubrica_id_fkey;