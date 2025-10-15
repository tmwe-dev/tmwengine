-- Migration: Make email body columns nullable for lazy loading optimization
-- Date: 2025-01-15
-- Backup: docs/DATABASE_BACKUPS/2025-01-15_pre-migration-email-body-nullable.md

-- Make body_html and body_text nullable to allow metadata-only downloads
ALTER TABLE public.email_messages 
ALTER COLUMN body_html DROP NOT NULL;

ALTER TABLE public.email_messages 
ALTER COLUMN body_text DROP NOT NULL;

-- Add comment to document the change
COMMENT ON COLUMN public.email_messages.body_html IS 'Email HTML body - nullable for lazy loading optimization';
COMMENT ON COLUMN public.email_messages.body_text IS 'Email plain text body - nullable for lazy loading optimization';