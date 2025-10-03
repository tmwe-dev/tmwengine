import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TMWECredentials {
  email: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  clientId: string;
  clientSecret: string;
}

export const useTMWEAuth = () => {
  const [credentials, setCredentials] = useState<TMWECredentials | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load credentials from sessionStorage
  const loadCredentials = useCallback(async () => {
    try {
      setLoading(true);
      
      const userEmail = sessionStorage.getItem('tmwe_user_email');
      if (!userEmail) {
        setCredentials(null);
        setLoading(false);
        return;
      }

      const { data, error: dbError } = await supabase
        .from('user_tmwe_credentials')
        .select('*')
        .eq('email', userEmail)
        .maybeSingle();

      if (dbError) throw dbError;

      if (data) {
        setCredentials({
          email: data.email,
          accessToken: data.access_token,
          refreshToken: data.refresh_token || undefined,
          expiresAt: data.expires_at || undefined,
          clientId: data.client_id,
          clientSecret: data.client_secret,
        });
      } else {
        setCredentials(null);
      }
      setError(null);
    } catch (err) {
      console.error('Error loading TMWE credentials:', err);
      setError(err instanceof Error ? err.message : 'Failed to load credentials');
      setCredentials(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save credentials to database
  const saveCredentials = useCallback(async (creds: TMWECredentials) => {
    try {
      const { error: dbError } = await supabase
        .from('user_tmwe_credentials')
        .upsert({
          email: creds.email,
          access_token: creds.accessToken,
          refresh_token: creds.refreshToken || null,
          expires_at: creds.expiresAt || null,
          client_id: creds.clientId,
          client_secret: creds.clientSecret,
        });

      if (dbError) throw dbError;

      setCredentials(creds);
      sessionStorage.setItem('tmwe_user_email', creds.email);
      setError(null);
    } catch (err) {
      console.error('Error saving TMWE credentials:', err);
      setError(err instanceof Error ? err.message : 'Failed to save credentials');
      throw err;
    }
  }, []);

  // Delete credentials from database
  const clearCredentials = useCallback(async () => {
    const userEmail = sessionStorage.getItem('tmwe_user_email');
    if (!userEmail) return;

    try {
      const { error: dbError } = await supabase
        .from('user_tmwe_credentials')
        .delete()
        .eq('email', userEmail);

      if (dbError) throw dbError;

      setCredentials(null);
      sessionStorage.removeItem('tmwe_user_email');
      sessionStorage.removeItem('tmwe_access_token');
      setError(null);
    } catch (err) {
      console.error('Error clearing TMWE credentials:', err);
      setError(err instanceof Error ? err.message : 'Failed to clear credentials');
      throw err;
    }
  }, []);

  // Check if token needs refresh
  const needsRefresh = useCallback(() => {
    if (!credentials?.expiresAt) return false;
    // Refresh if expires in less than 5 minutes
    return credentials.expiresAt < Date.now() + 300000;
  }, [credentials]);

  // Load credentials on mount
  useEffect(() => {
    loadCredentials();
  }, [loadCredentials]);

  return {
    credentials,
    loading,
    error,
    isAuthenticated: !!credentials,
    saveCredentials,
    clearCredentials,
    refreshCredentials: loadCredentials,
    needsRefresh,
  };
};
