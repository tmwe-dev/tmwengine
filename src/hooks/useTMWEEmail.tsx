import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TMWEEmailListParams {
  folder?: string;
  criteria?: string;
  offset?: number;
  limit?: number;
}

interface TMWEEmailParams {
  uid: string;
  folder?: string;
}

interface TMWESyncParams {
  action: string;
  folder_name?: string;
  date_from?: string;
  date_to?: string;
}

export const useTMWEEmail = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callTMWEAPI = async (action: string, params?: any) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('tmwe-email-api', {
        body: { action, params }
      });

      if (functionError) {
        console.error('TMWE API function error:', functionError);
        throw new Error(functionError.message || 'Errore nella chiamata API TMWE');
      }

      if (!data.success) {
        throw new Error(data.error || 'Errore nella risposta API TMWE');
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Errore sconosciuto';
      setError(errorMessage);
      toast.error('Errore API TMWE: ' + errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get email list from a specific folder
  const getEmailList = async (params: TMWEEmailListParams = {}) => {
    const defaultParams = {
      folder: 'INBOX',
      criteria: 'ALL',
      offset: 0,
      limit: 10,
      ...params
    };

    return await callTMWEAPI('get_email_list', defaultParams);
  };

  // Get specific email details
  const getEmail = async (params: TMWEEmailParams) => {
    return await callTMWEAPI('get_email', params);
  };

  // Get account information
  const getAccountInfo = async () => {
    return await callTMWEAPI('get_account_info');
  };

  // Get quota information
  const getQuotaInfo = async () => {
    return await callTMWEAPI('get_quota_info');
  };

  // Get folder list
  const getFolders = async () => {
    return await callTMWEAPI('get_folders');
  };

  // Sync emails
  const syncEmails = async (params: TMWESyncParams) => {
    return await callTMWEAPI('email_sync', params);
  };

  // Test connection to TMWE API
  const testConnection = async () => {
    try {
      toast.info('Testando connessione TMWE...');
      const accountInfo = await getAccountInfo();
      
      if (accountInfo.success) {
        toast.success('Connessione TMWE riuscita!');
        return {
          success: true,
          data: accountInfo.data
        };
      } else {
        toast.error('Test connessione TMWE fallito');
        return {
          success: false,
          error: 'Test fallito'
        };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Errore test connessione';
      toast.error('Test connessione TMWE fallito: ' + errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    }
  };

  // Get token (for OAuth flows if needed)
  const getToken = async () => {
    try {
      // For TMWE, this might be a separate endpoint or part of account info
      const accountInfo = await getAccountInfo();
      return {
        success: true,
        token: accountInfo.data?.access_token || 'API_KEY_AUTH',
        expires_at: accountInfo.data?.token_expires || null
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Errore ottenimento token'
      };
    }
  };

  return {
    loading,
    error,
    getEmailList,
    getEmail,
    getAccountInfo,
    getQuotaInfo,
    getFolders,
    syncEmails,
    testConnection,
    getToken
  };
};