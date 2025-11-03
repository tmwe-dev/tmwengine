-- Add unique constraint to prevent duplicate profiles per user
ALTER TABLE public.performance_profiles
ADD CONSTRAINT performance_profiles_user_id_profile_name_key 
UNIQUE (user_id, profile_name);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_performance_profiles_user_name 
ON public.performance_profiles(user_id, profile_name);