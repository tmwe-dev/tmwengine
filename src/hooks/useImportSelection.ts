import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImportedContact {
  id: string;
  [key: string]: any;
}

interface UseImportSelectionProps {
  allRecords: ImportedContact[];
  onRecordsUpdated?: () => void;
}

export const useImportSelection = ({
  allRecords,
  onRecordsUpdated
}: UseImportSelectionProps) => {
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [importingSelected, setImportingSelected] = useState(false);

  const toggleRecordSelection = useCallback((recordId: string) => {
    setSelectedRecords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recordId)) {
        newSet.delete(recordId);
      } else {
        newSet.add(recordId);
      }
      return newSet;
    });
  }, []);

  const toggleSelectAll = useCallback((records: ImportedContact[]) => {
    if (selectedRecords.size === records.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(records.map(r => r.id)));
    }
  }, [selectedRecords.size]);

  const clearSelection = useCallback(() => {
    setSelectedRecords(new Set());
  }, []);

  const importSelectedRecords = useCallback(async () => {
    if (selectedRecords.size === 0) {
      toast.error('Seleziona almeno un record da importare');
      return;
    }

    setImportingSelected(true);

    try {
      const recordsToImport = Array.from(selectedRecords).map(recordId => {
        const record = allRecords.find(r => r.id === recordId);
        if (!record) return null;

        return {
          nome: record.name || '',
          azienda: record.company_name || '',
          company_alias: record.company_alias || '',
          email: record.email || '',
          telefono: record.phone || '',
          cellulare: record.cell || '',
          indirizzo: record.address || '',
          citta: record.city || '',
          paese: record.country || '',
          zip_code: record.zip_code || '',
          origine: 'import'
        };
      }).filter(Boolean);

      const { error: rubricaError } = await supabase
        .from('rubrica')
        .insert(recordsToImport);

      if (rubricaError) {
        console.error('Error importing to rubrica:', rubricaError);
        toast.error('Errore durante l\'importazione in rubrica');
        return;
      }

      // Update imported_contacts to mark as imported
      const recordIds = Array.from(selectedRecords);
      const { error: updateError } = await supabase
        .from('imported_contacts')
        .update({ is_imported_to_rubrica: true })
        .in('id', recordIds);

      if (updateError) {
        console.error('Error updating import status:', updateError);
      }

      toast.success(`${recordsToImport.length} record importati in rubrica`);
      
      // Clear selection and refresh
      clearSelection();
      onRecordsUpdated?.();

    } catch (error) {
      console.error('Error during import:', error);
      toast.error('Errore durante l\'importazione');
    } finally {
      setImportingSelected(false);
    }
  }, [selectedRecords, allRecords, clearSelection, onRecordsUpdated]);

  const deleteSelectedRecords = useCallback(async () => {
    if (selectedRecords.size === 0) {
      toast.error('Seleziona almeno un record da eliminare');
      return;
    }

    try {
      const recordIds = Array.from(selectedRecords);
      const { error } = await supabase
        .from('imported_contacts')
        .delete()
        .in('id', recordIds);

      if (error) {
        console.error('Error deleting records:', error);
        toast.error('Errore durante l\'eliminazione');
        return;
      }

      toast.success(`${recordIds.length} record eliminati`);
      
      // Clear selection and refresh
      clearSelection();
      onRecordsUpdated?.();

    } catch (error) {
      console.error('Error during deletion:', error);
      toast.error('Errore durante l\'eliminazione');
    }
  }, [selectedRecords, clearSelection, onRecordsUpdated]);

  return {
    selectedRecords,
    toggleRecordSelection,
    toggleSelectAll,
    clearSelection,
    importSelectedRecords,
    deleteSelectedRecords,
    importingSelected,
    hasSelection: selectedRecords.size > 0
  };
};
