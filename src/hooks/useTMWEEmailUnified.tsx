import { useState, useEffect } from 'react';
import { useTMWEEmail } from './useTMWEEmail';
import { useTMWEEmailDirect } from './useTMWEEmailDirect';
import { toast } from 'sonner';

interface TMWEUnifiedConfig {
  preferredMethod?: 'edge' | 'direct' | 'auto';
  directApiKey?: string;
  useProxy?: boolean;
  fallbackEnabled?: boolean;
}

export const useTMWEEmailUnified = (config: TMWEUnifiedConfig = {}) => {
  const [activeMethod, setActiveMethod] = useState<'edge' | 'direct'>('edge');
  const [methodDetermined, setMethodDetermined] = useState(false);

  const defaultConfig = {
    preferredMethod: 'auto' as const,
    fallbackEnabled: true,
    ...config
  };

  // Initialize hooks
  const edgeFunction = useTMWEEmail();
  const directClient = useTMWEEmailDirect({
    apiKey: config.directApiKey,
    useProxy: config.useProxy
  });

  // Determine best method on first load
  useEffect(() => {
    if (methodDetermined) return;

    const determineBestMethod = async () => {
      if (defaultConfig.preferredMethod === 'edge') {
        setActiveMethod('edge');
        setMethodDetermined(true);
        return;
      }

      if (defaultConfig.preferredMethod === 'direct') {
        setActiveMethod('direct');
        setMethodDetermined(true);
        return;
      }

      // Auto mode: try edge function first, fallback to direct if configured
      try {
        console.log('Testing Edge Function availability...');
        // Quick test to see if edge function is available
        const edgeTest = await edgeFunction.getAccountInfo();
        if (edgeTest.success) {
          setActiveMethod('edge');
          console.log('Using Edge Function method');
        } else {
          throw new Error('Edge Function not available');
        }
      } catch (edgeError) {
        console.log('Edge Function failed, checking direct method...');
        
        if (defaultConfig.fallbackEnabled && config.directApiKey) {
          try {
            const directTest = await directClient.getAccountInfo();
            if (directTest.success) {
              setActiveMethod('direct');
              toast.info('Usando connessione diretta TMWE (fallback)');
              console.log('Using Direct Client method (fallback)');
            } else {
              throw new Error('Both methods failed');
            }
          } catch (directError) {
            console.error('Both Edge Function and Direct Client failed');
            setActiveMethod('edge'); // Default to edge function
            toast.error('Entrambi i metodi TMWE non disponibili');
          }
        } else {
          setActiveMethod('edge'); // Default to edge function
          console.log('Using Edge Function method (default)');
        }
      }
      
      setMethodDetermined(true);
    };

    determineBestMethod();
  }, [methodDetermined, defaultConfig.preferredMethod, defaultConfig.fallbackEnabled, config.directApiKey]);

  // Get current hook based on active method
  const currentHook = activeMethod === 'edge' ? edgeFunction : directClient;

  // Unified methods with fallback logic
  const withFallback = async (operation: () => Promise<any>) => {
    try {
      return await operation();
    } catch (error) {
      if (defaultConfig.fallbackEnabled && activeMethod === 'edge' && config.directApiKey) {
        console.log('Edge Function failed, trying direct method...');
        toast.info('Tentativo con connessione diretta...');
        
        const fallbackMethod = activeMethod === 'edge' ? directClient : edgeFunction;
        try {
          const result = await operation();
          toast.success('Operazione completata con metodo alternativo');
          return result;
        } catch (fallbackError) {
          toast.error('Entrambi i metodi falliti');
          throw fallbackError;
        }
      }
      throw error;
    }
  };

  return {
    // Status
    loading: currentHook.loading,
    error: currentHook.error,
    activeMethod,
    methodDetermined,
    
    // Configuration
    setActiveMethod,
    
    // Core methods with fallback
    getEmailList: (params?: any) => withFallback(() => currentHook.getEmailList(params)),
    getEmail: (params: any) => withFallback(() => currentHook.getEmail(params)),
    getAccountInfo: () => withFallback(() => currentHook.getAccountInfo()),
    getQuotaInfo: () => withFallback(() => currentHook.getQuotaInfo()),
    getFolders: () => withFallback(() => currentHook.getFolders()),
    syncEmails: (params: any) => withFallback(() => currentHook.syncEmails(params)),
    getToken: () => withFallback(() => currentHook.getToken()),
    
    // Test methods
    testConnection: async () => {
      const result = await currentHook.testConnection();
      return {
        ...result,
        method: activeMethod,
        fallbackAvailable: defaultConfig.fallbackEnabled && !!config.directApiKey
      };
    },
    
    // Method switching
    switchMethod: (method: 'edge' | 'direct') => {
      setActiveMethod(method);
      toast.info(`Cambiato a metodo ${method === 'edge' ? 'Edge Function' : 'Client Direct'}`);
    },
    
    // Health check
    healthCheck: async () => {
      const results = [];
      
      // Test Edge Function
      try {
        const edgeResult = await edgeFunction.testConnection();
        results.push({ method: 'edge', ...edgeResult });
      } catch (error) {
        results.push({ 
          method: 'edge', 
          success: false, 
          error: error instanceof Error ? error.message : 'Test fallito' 
        });
      }
      
      // Test Direct Client if configured
      if (config.directApiKey) {
        try {
          const directResult = await directClient.testConnection();
          results.push({ method: 'direct', ...directResult });
        } catch (error) {
          results.push({ 
            method: 'direct', 
            success: false, 
            error: error instanceof Error ? error.message : 'Test fallito' 
          });
        }
      }
      
      return {
        results,
        activeMethod,
        recommendation: results.find(r => r.success)?.method || 'edge'
      };
    }
  };
};