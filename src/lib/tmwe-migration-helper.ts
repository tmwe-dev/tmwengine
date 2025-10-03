// Helper per migrare vecchie credenziali localStorage a database
import { supabase } from '@/integrations/supabase/client';

interface OldApiConfig {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  clientId?: string;
  clientSecret?: string;
}

export const migrateOldCredentialsIfNeeded = async (): Promise<boolean> => {
  try {
    // Check if user is authenticated with Supabase
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Check if already has credentials in DB
    const { data: existingCreds } = await supabase
      .from('user_tmwe_credentials')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingCreds) {
      // Already migrated, clean up localStorage
      localStorage.removeItem('tmwe_api_config');
      return false;
    }

    // Check for old credentials in localStorage
    const oldConfigStr = localStorage.getItem('tmwe_api_config');
    if (!oldConfigStr) return false;

    const oldConfig: OldApiConfig = JSON.parse(oldConfigStr);

    // Migrate to database
    const { error } = await supabase
      .from('user_tmwe_credentials')
      .insert({
        user_id: user.id,
        access_token: oldConfig.accessToken,
        refresh_token: oldConfig.refreshToken || null,
        expires_at: oldConfig.expiresAt || null,
        client_id: oldConfig.clientId || '30eb3689ecfe890adfda0578d61ad858cf9f98999a919e0cd7bb798df17b006f',
        client_secret: oldConfig.clientSecret || '04d26799b3ec0a82dec492c2cb4a17a9ff20cabcde13166bd330e7ccd369c873a95b6d88c19cf4a6c592327aa191ab36769dded7b77b0396b93529b8b12035bd',
      });

    if (error) {
      console.error('Migration error:', error);
      return false;
    }

    // Clean up localStorage
    localStorage.removeItem('tmwe_api_config');
    console.log('✅ Successfully migrated TMWE credentials to database');
    return true;

  } catch (error) {
    console.error('Migration helper error:', error);
    return false;
  }
};
