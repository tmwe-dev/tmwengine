import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { importEmailFromTempIndex } from '@/lib/single-fast-core';

export interface ErrorEntry {
  id: string;
  uid: string;
  folder_name: string;
  user_email: string;
  error_message: string;
  error_type: string;
  retry_count: number;
  status: string;
  first_error_at: string;
}

export const useErrorRetry = () => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${message}`]);
  };

  const retryFailedEmails = async (userEmail: string) => {
    setIsRetrying(true);
    setLogs([]);
    
    try {
      // 1. Leggi errori pending
      const { data: errors, error: fetchError } = await supabase
        .from('email_import_errors')
        .select('*')
        .eq('user_email', userEmail)
        .eq('status', 'pending')
        .order('first_error_at', { ascending: true });

      if (fetchError) throw fetchError;
      if (!errors || errors.length === 0) {
        addLog('✅ Nessun errore da riprovare');
        setIsRetrying(false);
        return;
      }

      setProgress({ current: 0, total: errors.length });
      addLog(`📋 Trovati ${errors.length} errori da riprovare`);

      let successCount = 0;
      let failCount = 0;

      // 2. Riprova ogni email
      for (let i = 0; i < errors.length; i++) {
        const errorEntry = errors[i];
        setProgress({ current: i + 1, total: errors.length });
        
        addLog(`🔄 Riprovo ${errorEntry.uid} in ${errorEntry.folder_name}...`);

        try {
          // ✅ USA LA STESSA FUNZIONE DEL FLUSSO PRINCIPALE
          await importEmailFromTempIndex(
            errorEntry.uid, 
            errorEntry.folder_name, 
            errorEntry.user_email
          );

          // Successo! Aggiorna status
          await supabase
            .from('email_import_errors')
            .update({ 
              status: 'imported',
              last_retry_at: new Date().toISOString(),
              retry_count: errorEntry.retry_count + 1
            })
            .eq('id', errorEntry.id);

          successCount++;
          addLog(`✅ Importato ${errorEntry.uid}`);
        } catch (retryErr: any) {
          // Fallito di nuovo
          await supabase
            .from('email_import_errors')
            .update({ 
              status: errorEntry.retry_count >= 2 ? 'failed' : 'pending',
              last_retry_at: new Date().toISOString(),
              retry_count: errorEntry.retry_count + 1,
              error_message: retryErr.message
            })
            .eq('id', errorEntry.id);

          failCount++;
          addLog(`❌ Fallito ${errorEntry.uid}: ${retryErr.message.substring(0, 50)}...`);
        }
      }

      addLog(`\n🎯 Risultato: ${successCount} successi, ${failCount} fallimenti`);
    } catch (err: any) {
      addLog(`❌ Errore generale: ${err.message}`);
    } finally {
      setIsRetrying(false);
    }
  };

  return {
    isRetrying,
    progress,
    logs,
    retryFailedEmails
  };
};
