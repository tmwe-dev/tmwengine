-- Elimina sistema code_index (non più necessario con tool nativi Lovable)

-- Drop tabelle
DROP TABLE IF EXISTS public.code_change_proposals CASCADE;
DROP TABLE IF EXISTS public.code_index CASCADE;

-- Drop eventuali funzioni/trigger correlati
DROP FUNCTION IF EXISTS public.update_code_index_updated_at() CASCADE;