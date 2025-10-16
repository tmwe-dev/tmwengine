-- Drop the constraint first (before updating data)
ALTER TABLE user_tmwe_credentials DROP CONSTRAINT IF EXISTS user_tmwe_credentials_token_type_check;

-- Then fix invalid expires_at timestamps and token_type values
UPDATE user_tmwe_credentials 
SET 
  expires_at = CASE 
    WHEN EXTRACT(YEAR FROM expires_at) > 9999 THEN NULL
    ELSE expires_at 
  END,
  token_type = CASE 
    WHEN token_type IS NULL OR token_type NOT IN ('api_key', 'oauth') THEN 'api_key'
    ELSE token_type 
  END;

-- Finally add the new constraint that allows both 'api_key' and 'oauth'
ALTER TABLE user_tmwe_credentials 
ADD CONSTRAINT user_tmwe_credentials_token_type_check 
CHECK (token_type IN ('api_key', 'oauth'));