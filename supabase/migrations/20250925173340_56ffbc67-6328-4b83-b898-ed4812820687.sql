-- Create permanent table for imported contacts
CREATE TABLE public.imported_contacts (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    import_log_id uuid NOT NULL REFERENCES public.import_logs(id) ON DELETE CASCADE,
    
    -- Original contact data fields
    original_id text,
    commercial_anagrafiche_id text,
    name text,
    alias text,
    company_alias text,
    position text,
    title text,
    phone text,
    cell text,
    email text,
    country text,
    note text,
    stato text,
    created_by text,
    agent_id text,
    completed boolean DEFAULT false,
    last_contact date,
    scheduled_contact date,
    next_contact_date date,
    origin text,
    client_code text,
    
    -- Meta flags
    meta_client boolean DEFAULT false,
    meta_express boolean DEFAULT false,
    meta_sea_freight boolean DEFAULT false,
    meta_air_freight boolean DEFAULT false,
    meta_interested boolean DEFAULT false,
    meta_reception_required_email boolean DEFAULT false,
    meta_contact_required_email boolean DEFAULT false,
    meta_presentation boolean DEFAULT false,
    meta_exworks boolean DEFAULT false,
    meta_hight_value_customer boolean DEFAULT false,
    meta_tutorial boolean DEFAULT false,
    meta_rejected boolean DEFAULT false,
    meta_wca boolean DEFAULT false,
    meta_exclient boolean DEFAULT false,
    archiviata boolean DEFAULT false,
    has_actions boolean DEFAULT false,
    
    -- Company/Address fields
    company_name text,
    address text,
    city text,
    zip_code text,
    
    -- Import metadata
    row_number integer,
    is_imported_to_rubrica boolean DEFAULT false,
    
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.imported_contacts ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Allow all operations on imported_contacts" 
ON public.imported_contacts 
FOR ALL 
USING (true);

-- Create indexes for better performance
CREATE INDEX idx_imported_contacts_import_log_id ON public.imported_contacts(import_log_id);
CREATE INDEX idx_imported_contacts_email ON public.imported_contacts(email);
CREATE INDEX idx_imported_contacts_company ON public.imported_contacts(company_alias);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_imported_contacts_updated_at
BEFORE UPDATE ON public.imported_contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();