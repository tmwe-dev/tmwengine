/**
 * REACT HOOK - Master Email Download
 * 
 * Hook per integrare MasterEmailDownload nell'UI React
 * Gestisce stato, logs, progress e controlli
 */

import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  executeMasterDownload, 
  type MasterProgress, 
  type MasterResult 
} from '@/lib/email/MasterEmailDownload';

export interface UseMasterEmailDownloadReturn {
  isRunning: boolean;
  logs: string[];
  progress: MasterProgress | null;
  start: (customFolders?: string[]) => Promise<MasterResult>;
  stop: () => void;
  reset: () => void;
}

/**
 * Hook per gestire Master Email Download
 */
export function useMasterEmailDownload(): UseMasterEmailDownloadReturn {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState<MasterProgress | null>(null);
  const stopRef = useRef(false);

  /**
   * Recupera email utente da Supabase
   */
  const getUserEmail = async (): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non autenticato');
    
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tmwe_email')
      .eq('user_id', user.id)
      .single();
    
    if (!profile?.tmwe_email) throw new Error('Email TMWE non configurata');
    return profile.tmwe_email;
  };

  /**
   * Avvia sequenza Master Download (Luca → Clean)
   */
  const start = useCallback(async (customFolders?: string[]): Promise<MasterResult> => {
    setIsRunning(true);
    stopRef.current = false;
    setLogs([]);
    setProgress(null);

    try {
      // Recupera email utente
      const userEmail = await getUserEmail();

      // Esegui Master Download
      const result = await executeMasterDownload(
        userEmail,
        customFolders,
        (prog) => setProgress(prog),
        (log) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${log}`]),
        () => stopRef.current
      );

      return result;
    } catch (error: any) {
      setLogs(prev => [...prev, `❌ ERROR: ${error.message}`]);
      throw error;
    } finally {
      setIsRunning(false);
    }
  }, []);

  /**
   * Ferma download in corso
   */
  const stop = useCallback(() => {
    stopRef.current = true;
    setLogs(prev => [...prev, `⏸️ Stop requested by user`]);
  }, []);

  /**
   * Reset stato e logs
   */
  const reset = useCallback(() => {
    setLogs([]);
    setProgress(null);
  }, []);

  return {
    isRunning,
    logs,
    progress,
    start,
    stop,
    reset
  };
}
