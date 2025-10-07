-- Create template_alias table
CREATE TABLE IF NOT EXISTS public.template_alias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  alias TEXT NOT NULL,
  company_name TEXT NOT NULL,
  company_alias TEXT NOT NULL,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.template_alias ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations
CREATE POLICY "Allow all operations on template_alias"
ON public.template_alias
FOR ALL
USING (true)
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_template_alias_updated_at
BEFORE UPDATE ON public.template_alias
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_template_alias_name ON public.template_alias(name);
CREATE INDEX idx_template_alias_company_name ON public.template_alias(company_name);

-- Copy data from imported_contacts where all 4 required fields are not empty
INSERT INTO public.template_alias (name, alias, company_name, company_alias, title)
SELECT 
  TRIM(name) as name,
  TRIM(alias) as alias,
  TRIM(company_name) as company_name,
  TRIM(company_alias) as company_alias,
  TRIM(title) as title
FROM public.imported_contacts
WHERE 
  name IS NOT NULL AND TRIM(name) != '' AND
  alias IS NOT NULL AND TRIM(alias) != '' AND
  company_name IS NOT NULL AND TRIM(company_name) != '' AND
  company_alias IS NOT NULL AND TRIM(company_alias) != '';