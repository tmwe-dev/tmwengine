-- Create temporary table for AI raw imports
CREATE TABLE IF NOT EXISTS public.temp_ai_import (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  import_log_id uuid REFERENCES public.import_logs(id) ON DELETE CASCADE,
  row_number integer,
  raw_data jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.temp_ai_import ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations
CREATE POLICY "Allow all operations on temp_ai_import" 
ON public.temp_ai_import 
FOR ALL 
USING (true);

-- Add index for faster queries
CREATE INDEX idx_temp_ai_import_log_id ON public.temp_ai_import(import_log_id);