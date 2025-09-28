import { useState } from 'react';
import { toast } from 'sonner';

interface TMWEClientConfig {
  apiKey?: string;
  baseUrl?: string;
  useProxy?: boolean;
}

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

export const useTMWEEmailDirect = (config: TMWEClientConfig = {}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default configuration
  const defaultConfig = {
    baseUrl: 'https://erp.tmwe.it/erp/tmwe_json',
    useProxy: false, // Se true, usa un proxy CORS
    ...config
  };

  const makeDirectRequest = async (endpoint: string, params: URLSearchParams = new URLSearchParams(), method: 'GET' | 'POST' = 'GET') => {
    setLoading(true);
    setError(null);

    try {
      if (!defaultConfig.apiKey) {
        throw new Error('API Key TMWE non configurata');
      }

      const url = `${defaultConfig.baseUrl}${endpoint}${params.toString() ? '?' + params.toString() : ''}`;
      console.log('Direct TMWE API request:', url);

      const headers: HeadersInit = {
        'Authorization': `Bearer ${defaultConfig.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };

      // Se l'API non supporta CORS, possiamo usare un proxy
      const fetchUrl = defaultConfig.useProxy 
        ? `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
        : url;

      const fetchOptions: RequestInit = {
        method,
        headers: defaultConfig.useProxy ? {
          'Content-Type': 'application/json'
        } : headers,
        // Aggiungi mode se necessario per CORS
        mode: 'cors'
      };

      const response = await fetch(fetchUrl, fetchOptions);

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }

      let data;
      if (defaultConfig.useProxy) {
        const proxyResponse = await response.json();
        data = JSON.parse(proxyResponse.contents);
      } else {
        data = await response.json();
      }

      console.log('TMWE API response:', data);

      return {
        success: data.success !== false,
        data: data.results || data.folders || data.account_info || data.quota_info || data,
        provider: 'tmwe-direct',
        timestamp: new Date().toISOString()
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Errore sconosciuto';
      console.error('TMWE Direct API error:', err);
      setError(errorMessage);
      
      // Se è un errore CORS, suggerisci l'uso del proxy
      if (errorMessage.includes('CORS') || errorMessage.includes('Access-Control')) {
        toast.error('Errore CORS - Prova ad attivare il proxy nelle impostazioni');
      } else {
        toast.error('Errore API TMWE: ' + errorMessage);
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get email list from a specific folder
  const getEmailList = async (params: TMWEEmailListParams = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.folder) queryParams.set('folder', params.folder);
    if (params.criteria) queryParams.set('criteria', params.criteria);
    if (params.offset !== undefined) queryParams.set('offset', params.offset.toString());
    if (params.limit !== undefined) queryParams.set('limit', params.limit.toString());

    return await makeDirectRequest('/?app.php=get_email_list', queryParams);
  };

  // Get specific email details
  const getEmail = async (params: TMWEEmailParams) => {
    const queryParams = new URLSearchParams();
    queryParams.set('uid', params.uid);
    if (params.folder) queryParams.set('folder', params.folder);

    return await makeDirectRequest('/?app.php=get_email', queryParams);
  };

  // Get account information
  const getAccountInfo = async () => {
    return await makeDirectRequest('/?app.php=get_account_info');
  };

  // Get quota information
  const getQuotaInfo = async () => {
    return await makeDirectRequest('/?app.php=get_quota_info');
  };

  // Get folder list
  const getFolders = async () => {
    return await makeDirectRequest('/?app.php=get_folders');
  };

  // Sync emails
  const syncEmails = async (params: TMWESyncParams) => {
    const queryParams = new URLSearchParams();
    if (params.action) queryParams.set('action', params.action);
    if (params.folder_name) queryParams.set('folder_name', params.folder_name);
    if (params.date_from) queryParams.set('date_from', params.date_from);
    if (params.date_to) queryParams.set('date_to', params.date_to);

    return await makeDirectRequest('/?app.php=email_sync', queryParams, 'POST');
  };

  // Test connection to TMWE API
  const testConnection = async () => {
    try {
      toast.info('Testando connessione diretta TMWE...');
      const accountInfo = await getAccountInfo();
      
      if (accountInfo.success) {
        toast.success('Connessione diretta TMWE riuscita!');
        return {
          success: true,
          data: accountInfo.data,
          method: 'direct'
        };
      } else {
        toast.error('Test connessione diretta TMWE fallito');
        return {
          success: false,
          error: 'Test fallito',
          method: 'direct'
        };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Errore test connessione';
      toast.error('Test connessione diretta TMWE fallito: ' + errorMessage);
      return {
        success: false,
        error: errorMessage,
        method: 'direct',
        suggestion: errorMessage.includes('CORS') ? 'Usa Edge Function o attiva proxy CORS' : 'Verifica API Key'
      };
    }
  };

  // Get token
  const getToken = async () => {
    try {
      const accountInfo = await getAccountInfo();
      return {
        success: true,
        token: defaultConfig.apiKey,
        type: 'api_key',
        expires_at: null // API Key non scade
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
    getToken,
    config: defaultConfig
  };
};