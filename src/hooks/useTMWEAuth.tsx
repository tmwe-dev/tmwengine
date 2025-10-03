import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface TMWECredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  clientId: string;
  clientSecret: string;
}

export const useTMWEAuth = () => {
  const { user } = useAuth();
  const [credentials, setCredentials] = useState<TMWECredentials | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load credentials from database
  const loadCredentials = useCallback(async () => {
    if (!user) {
      setCredentials(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: dbError } = await supabase
        .from('user_tmwe_credentials')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (dbError) throw dbError;

      if (data) {
        setCredentials({
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
  }, [user]);

  // Save credentials to database
  const saveCredentials = useCallback(async (creds: TMWECredentials) => {
    if (!user) {
      throw new Error('User must be authenticated');
    }

    try {
      const { error: dbError } = await supabase
        .from('user_tmwe_credentials')
        .upsert({
          user_id: user.id,
          access_token: creds.accessToken,
          refresh_token: creds.refreshToken || null,
          expires_at: creds.expiresAt || null,
          client_id: creds.clientId,
          client_secret: creds.clientSecret,
        });

      if (dbError) throw dbError;

      setCredentials(creds);
      setError(null);
    } catch (err) {
      console.error('Error saving TMWE credentials:', err);
      setError(err instanceof Error ? err.message : 'Failed to save credentials');
      throw err;
    }
  }, [user]);

  // Delete credentials from database
  const clearCredentials = useCallback(async () => {
    if (!user) return;

    try {
      const { error: dbError } = await supabase
        .from('user_tmwe_credentials')
        .delete()
        .eq('user_id', user.id);

      if (dbError) throw dbError;

      setCredentials(null);
      setError(null);
    } catch (err) {
      console.error('Error clearing TMWE credentials:', err);
      setError(err instanceof Error ? err.message : 'Failed to clear credentials');
      throw err;
    }
  }, [user]);

  // Check if token needs refresh
  const needsRefresh = useCallback(() => {
    if (!credentials?.expiresAt) return false;
    // Refresh if expires in less than 5 minutes
    return credentials.expiresAt < Date.now() + 300000;
  }, [credentials]);

  // Load credentials on mount and when user changes
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
