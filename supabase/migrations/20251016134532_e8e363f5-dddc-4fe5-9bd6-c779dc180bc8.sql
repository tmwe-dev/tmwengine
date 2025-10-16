-- Fix expires_at column type in user_tmwe_credentials
ALTER TABLE user_tmwe_credentials 
ALTER COLUMN expires_at TYPE timestamp with time zone 
USING to_timestamp(expires_at);