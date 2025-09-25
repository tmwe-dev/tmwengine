-- Add function to check if temp table exists
CREATE OR REPLACE FUNCTION public.check_temp_table_exists(table_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Validate table name starts with 'import_temp_' or 'import_contacts_' for security
    IF table_name IS NULL OR NOT (table_name LIKE 'import_temp_%' OR table_name LIKE 'import_contacts_%') THEN
        RETURN false;
    END IF;
    
    -- Check if table exists
    RETURN EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = check_temp_table_exists.table_name
    );
END;
$$;