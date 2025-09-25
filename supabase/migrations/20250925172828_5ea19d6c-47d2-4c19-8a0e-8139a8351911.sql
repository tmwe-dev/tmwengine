-- Update function to support pagination
CREATE OR REPLACE FUNCTION public.get_temp_table_data(
    table_name text,
    page_limit integer DEFAULT 500,
    page_offset integer DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result json;
    total_count integer;
    query_text text;
BEGIN
    -- Validate table name starts with 'import_temp_' or 'import_contacts_' for security
    IF table_name IS NULL OR NOT (table_name LIKE 'import_temp_%' OR table_name LIKE 'import_contacts_%') THEN
        RAISE EXCEPTION 'Invalid table name. Must start with import_temp_ or import_contacts_';
    END IF;
    
    -- Get total count first
    query_text := format('SELECT COUNT(*) FROM %I', table_name);
    EXECUTE query_text INTO total_count;
    
    -- Build dynamic query to get paginated records from the temp table
    query_text := format('SELECT json_agg(row_to_json(t)) FROM (SELECT * FROM %I LIMIT %s OFFSET %s) t', 
                        table_name, page_limit, page_offset);
    
    -- Execute the query
    EXECUTE query_text INTO result;
    
    -- Return empty array if no data
    IF result IS NULL THEN
        result := '[]'::json;
    END IF;
    
    -- Return both data and metadata
    RETURN json_build_object(
        'data', result,
        'total_count', total_count,
        'page_limit', page_limit,
        'page_offset', page_offset,
        'has_more', (page_offset + page_limit) < total_count
    );
EXCEPTION
    WHEN undefined_table THEN
        RAISE EXCEPTION 'Table % does not exist', table_name;
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error accessing table %: %', table_name, SQLERRM;
END;
$$;