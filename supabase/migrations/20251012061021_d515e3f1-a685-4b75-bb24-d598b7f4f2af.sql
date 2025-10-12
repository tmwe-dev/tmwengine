-- =====================================================
-- FUNZIONE: get_tables_with_counts() - VERSIONE DINAMICA
-- Conta automaticamente i record di TUTTE le tabelle pubbliche
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_tables_with_counts()
RETURNS TABLE(table_name text, row_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  tbl_name text;
  query_text text;
  count_result bigint;
BEGIN
  -- Loop attraverso TUTTE le tabelle del schema public
  FOR tbl_name IN 
    SELECT t.table_name::text
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
    ORDER BY t.table_name
  LOOP
    -- Costruisci query dinamica per contare i record
    query_text := format('SELECT COUNT(*)::bigint FROM %I', tbl_name);
    
    -- Esegui e ottieni il conteggio
    BEGIN
      EXECUTE query_text INTO count_result;
    EXCEPTION
      WHEN OTHERS THEN
        -- In caso di errore, imposta count a 0
        count_result := 0;
    END;
    
    -- Restituisci la riga
    table_name := tbl_name;
    row_count := count_result;
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$;