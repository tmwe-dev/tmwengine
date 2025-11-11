import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImportLog {
  id: string;
  nome_tabella_temporanea: string | null;
}

interface ImportedContact {
  id: string;
  [key: string]: any;
}

export const useImportRecords = () => {
  const [allRecords, setAllRecords] = useState<ImportedContact[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAllRecords = useCallback(async (importLog: ImportLog) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('imported_contacts')
        .select('*')
        .eq('import_log_id', importLog.id)
        .order('id', { ascending: true });

      if (error) throw error;

      setAllRecords(data || []);
      return data || [];
    } catch (error) {
      console.error('Error loading records:', error);
      toast.error('Errore durante il caricamento dei record');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteRecord = useCallback(async (contactId: string) => {
    try {
      const { error } = await supabase
        .from('imported_contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;

      setAllRecords(prev => prev.filter(record => record.id !== contactId));
      toast.success('Record eliminato con successo');
      return true;
    } catch (error) {
      console.error('Error deleting record:', error);
      toast.error('Errore durante l\'eliminazione del record');
      return false;
    }
  }, []);

  const deleteSelectedRecords = useCallback(async (recordIds: string[], importLogId?: string) => {
    if (recordIds.length === 0) {
      toast.error('Nessun record selezionato');
      return false;
    }

    try {
      const { error } = await supabase
        .from('imported_contacts')
        .delete()
        .in('id', recordIds);

      if (error) throw error;

      const newAllRecords = allRecords.filter(record => !recordIds.includes(record.id));
      setAllRecords(newAllRecords);

      // Update import_logs with new count
      if (importLogId) {
        await supabase
          .from('import_logs')
          .update({ righe_importate: newAllRecords.length })
          .eq('id', importLogId);
      }

      toast.success(`${recordIds.length} record eliminati con successo`);
      return true;
    } catch (error) {
      console.error('Error deleting records:', error);
      toast.error('Errore durante l\'eliminazione dei record');
      return false;
    }
  }, [allRecords]);

  const updateRecordInState = useCallback((updatedRecord: ImportedContact) => {
    setAllRecords(prev => prev.map(record => 
      record.id === updatedRecord.id ? updatedRecord : record
    ));
  }, []);

  return {
    allRecords,
    loading,
    loadAllRecords,
    deleteRecord,
    deleteSelectedRecords,
    updateRecordInState,
    setAllRecords
  };
};