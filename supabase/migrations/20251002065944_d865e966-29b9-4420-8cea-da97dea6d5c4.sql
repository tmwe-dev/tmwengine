-- Drop functions first (they depend on the tables)
DROP FUNCTION IF EXISTS public.archivia_contatto_rubrica(uuid, text, uuid);
DROP FUNCTION IF EXISTS public.archivia_contatto_importato(uuid, text, uuid);

-- Drop tables
DROP TABLE IF EXISTS public.archivio_attivita CASCADE;
DROP TABLE IF EXISTS public.archivio_indirizzi CASCADE;