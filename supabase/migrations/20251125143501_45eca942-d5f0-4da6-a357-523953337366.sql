-- Add tmwe_email_id column to store TMWE API's integer email identifier
-- This will be the primary reference for fetching email details from TMWE API
ALTER TABLE public.email_ai_classifications 
ADD COLUMN tmwe_email_id BIGINT;

-- Create index for fast lookups by tmwe_email_id
CREATE INDEX idx_email_ai_classifications_tmwe_email_id 
ON public.email_ai_classifications (tmwe_email_id) 
WHERE tmwe_email_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.email_ai_classifications.tmwe_email_id IS 'TMWE API email_id (integer) - primary identifier for API calls. Use getEmailDetail(tmwe_email_id) for fast Elasticsearch lookup.';