import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EmailImportStatus {
  isImporting: boolean;
  totalEmails: number;
  importedEmails: number;
  sourceFolder: string;
  destinationFolder: string;
  estimatedTimeMs: number;
  startTime: Date | null;
  progress: number;
  errors: string[];
}

export const useEmailImport = () => {
  const { toast } = useToast();
  const [status, setStatus] = useState<EmailImportStatus>({
    isImporting: false,
    totalEmails: 0,
    importedEmails: 0,
    sourceFolder: 'TMWE Server',
    destinationFolder: 'Local Database',
    estimatedTimeMs: 0,
    startTime: null,
    progress: 0,
    errors: []
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const startImport = async (folderName: string = 'INBOX') => {
    try {
      setStatus(prev => ({
        ...prev,
        isImporting: true,
        startTime: new Date(),
        importedEmails: 0,
        totalEmails: 0,
        progress: 0,
        errors: []
      }));

      // Crea un nuovo AbortController per questa importazione
      abortControllerRef.current = new AbortController();

      toast({
        title: "Import Started",
        description: `Starting email import from ${folderName}...`,
      });

      // Chiama l'edge function per l'importazione
      const { data, error } = await supabase.functions.invoke('tmwe-email-sync', {
        body: {
          handler: 'sync_folder',
          folder_name: folderName
        },
        signal: abortControllerRef.current.signal
      });

      if (error) {
        throw error;
      }

      // Aggiorna lo stato con i risultati
      setStatus(prev => ({
        ...prev,
        isImporting: false,
        totalEmails: data.total_messages || 0,
        importedEmails: data.emails_downloaded || 0,
        progress: 100
      }));

      toast({
        title: "Import Completed",
        description: `Successfully imported ${data.emails_downloaded || 0} emails!`,
      });

      return data;

    } catch (error: any) {
      console.error('Email import error:', error);
      
      setStatus(prev => ({
        ...prev,
        isImporting: false,
        errors: [...prev.errors, error.message || 'Unknown error']
      }));

      if (error.name !== 'AbortError') {
        toast({
          title: "Import Failed",
          description: error.message || "An error occurred during email import",
          variant: "destructive"
        });
      }

      throw error;
    }
  };

  const cancelImport = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setStatus(prev => ({
      ...prev,
      isImporting: false
    }));

    toast({
      title: "Import Cancelled",
      description: "Email import has been cancelled",
      variant: "destructive"
    });
  };

  const resetStatus = () => {
    setStatus({
      isImporting: false,
      totalEmails: 0,
      importedEmails: 0,
      sourceFolder: 'TMWE Server',
      destinationFolder: 'Local Database',
      estimatedTimeMs: 0,
      startTime: null,
      progress: 0,
      errors: []
    });
  };

  // Simula l'aggiornamento progressivo (per demo dell'animazione)
  const simulateProgress = (targetTotal: number) => {
    let current = 0;
    const interval = setInterval(() => {
      current += Math.floor(Math.random() * 3) + 1;
      
      if (current >= targetTotal) {
        current = targetTotal;
        clearInterval(interval);
        
        setStatus(prev => ({
          ...prev,
          isImporting: false,
          importedEmails: current,
          progress: 100
        }));
      } else {
        setStatus(prev => ({
          ...prev,
          importedEmails: current,
          progress: Math.round((current / targetTotal) * 100)
        }));
      }
    }, 500);

    return interval;
  };

  return {
    status,
    startImport,
    cancelImport,
    resetStatus,
    simulateProgress
  };
};