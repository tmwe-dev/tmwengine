-- Migration: Fix edge_function_versions content column to nullable
-- Date: 2025-10-19

-- Alter existing column to make it nullable
ALTER TABLE public.edge_function_versions 
ALTER COLUMN content DROP NOT NULL;

-- Delete existing records to avoid duplicates
DELETE FROM public.edge_function_versions WHERE function_name IN ('chat-with-ai', 'crm-tools');

-- Insert current deployed functions (content nullable OK)
INSERT INTO public.edge_function_versions (function_name, version_number, is_active, description) VALUES
  ('chat-with-ai', 1, true, 'Main AI chat endpoint with CRM tools'),
  ('crm-tools', 1, true, 'CRM data operations handler');