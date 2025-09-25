-- Update the function to allow import_contacts_ table names
CREATE OR REPLACE FUNCTION public.get_temp_table_data(table_name text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result json;
    query_text text;
BEGIN
    -- Validate table name starts with 'import_temp_' or 'import_contacts_' for security
    IF table_name IS NULL OR NOT (table_name LIKE 'import_temp_%' OR table_name LIKE 'import_contacts_%') THEN
        RAISE EXCEPTION 'Invalid table name. Must start with import_temp_ or import_contacts_';
    END IF;
    
    -- Build dynamic query to get all records from the temp table
    query_text := format('SELECT json_agg(row_to_json(t)) FROM %I t', table_name);
    
    -- Execute the query
    EXECUTE query_text INTO result;
    
    -- Return empty array if no data
    IF result IS NULL THEN
        result := '[]'::json;
    END IF;
    
    RETURN result;
EXCEPTION
    WHEN undefined_table THEN
        RAISE EXCEPTION 'Table % does not exist', table_name;
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error accessing table %: %', table_name, SQLERRM;
END;
$$;