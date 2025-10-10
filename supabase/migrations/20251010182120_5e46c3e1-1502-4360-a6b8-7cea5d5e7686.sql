-- Add test connection tracking columns to config_ai
ALTER TABLE public.config_ai 
ADD COLUMN last_test_at TIMESTAMPTZ,
ADD COLUMN last_test_status TEXT CHECK (last_test_status IN ('success', 'failed', 'pending')),
ADD COLUMN last_test_error TEXT;