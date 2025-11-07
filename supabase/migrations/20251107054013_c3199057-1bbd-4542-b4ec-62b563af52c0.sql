-- Add company profile fields to user_profiles
ALTER TABLE user_profiles
ADD COLUMN company_description TEXT,
ADD COLUMN company_context_ai TEXT,
ADD COLUMN company_context_updated_at TIMESTAMP WITH TIME ZONE;