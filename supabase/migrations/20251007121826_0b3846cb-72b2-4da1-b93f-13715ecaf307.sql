-- Modify template_alias to make company_alias nullable
ALTER TABLE public.template_alias 
ALTER COLUMN company_alias DROP NOT NULL;

-- Clear existing data if any
TRUNCATE TABLE public.template_alias;

-- Copy data with new criteria: name, alias, and company_name required
INSERT INTO public.template_alias (name, alias, company_name, company_alias, title)
SELECT 
  TRIM(name) as name,
  TRIM(alias) as alias,
  TRIM(company_name) as company_name,
  NULLIF(TRIM(company_alias), '') as company_alias,
  NULLIF(TRIM(title), '') as title
FROM public.imported_contacts
WHERE 
  name IS NOT NULL AND TRIM(name) != '' AND
  alias IS NOT NULL AND TRIM(alias) != '' AND
  company_name IS NOT NULL AND TRIM(company_name) != '';