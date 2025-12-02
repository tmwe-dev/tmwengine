import { supabase } from "@/integrations/supabase/client";

/**
 * Wrapper per sincronizzare le email nel database Supabase
 * Utilizza l'Edge Function tmwe-email-sync-master
 */
export const syncEmailsToDatabase = async (
  folder: string = 'INBOX',
  mode: 'auto' | 'initial' | 'incremental' = 'auto',
  maxEmails?: number,
  unreadOnly?: boolean
) => {
  const { data, error } = await supabase.functions.invoke('tmwe-api-proxy', {
    body: {
      handler: 'email_sync',
      mode,
      folder_name: folder,
      max_emails: maxEmails,
      force_full: mode === 'initial',
      unread_only: unreadOnly
    }
  });

  if (error) {
    throw new Error(`Sync failed: ${error.message}`);
  }

  return data;
};

/**
 * Hook per sincronizzare le email con stato e progress
 * Mantiene la stessa interfaccia di useSyncSmart per compatibilità
 */
export const useEmailSync = ({ folder, totalEmails }: { folder: string; totalEmails: number }) => {
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [syncedCount, setSyncedCount] = React.useState(0);
  const [syncError, setSyncError] = React.useState<string | null>(null);

  const startSync = React.useCallback(async (): Promise<void> => {
    setIsSyncing(true);
    setSyncedCount(0);
    setSyncError(null);

    try {
      const result = await syncEmailsToDatabase(folder, 'auto', totalEmails);
      
      // Estrai il conteggio delle email sincronizzate dalla risposta
      const synced = result?.synced_count || result?.saved_count || 0;
      setSyncedCount(synced);
      
    } catch (error: any) {
      setSyncError(error.message || 'Errore durante la sincronizzazione');
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [folder, totalEmails]);

  const reset = React.useCallback(() => {
    setSyncedCount(0);
    setSyncError(null);
  }, []);

  return {
    isSyncing,
    syncedCount,
    syncError,
    startSync,
    reset
  };
};

// Per evitare problemi di import circolare
import * as React from 'react';
