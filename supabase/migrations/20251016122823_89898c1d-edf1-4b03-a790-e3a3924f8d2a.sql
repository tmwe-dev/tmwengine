-- Add token_type column to user_tmwe_credentials table
ALTER TABLE user_tmwe_credentials 
ADD COLUMN IF NOT EXISTS token_type TEXT DEFAULT 'oauth2' 
CHECK (token_type IN ('oauth2', 'jwt'));

-- Add index for faster queries by token type
CREATE INDEX IF NOT EXISTS idx_user_tmwe_credentials_token_type 
ON user_tmwe_credentials(token_type);

-- Add comment for documentation
COMMENT ON COLUMN user_tmwe_credentials.token_type IS 'Type of token stored: oauth2 for traditional OAuth2 tokens, jwt for JSON Web Tokens';