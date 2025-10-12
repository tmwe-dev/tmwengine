-- Add preferred_country column to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS preferred_country TEXT DEFAULT 'IT';

COMMENT ON COLUMN public.user_profiles.preferred_country IS 'ISO country code for regional settings and flag display';