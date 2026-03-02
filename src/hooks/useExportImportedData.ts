import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useExportImportedData() {
  const { toast } = useToast();
  const [exporting_original, set_exporting_original] = useState(false);
  const [exporting_contacts, set_exporting_contacts] = useState(false);

  const download_blob = (content: string, filename: string, mime_type = 'text/csv;charset=utf-8;') => {
    const blob = new Blob([content], { type: mime_type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const download_original_file = async () => {
    set_exporting_original(true);
    try {
      // Get the most recent file import with file_content
      const { data, error } = await supabase
        .from('file_imports')
        .select('file_name, file_content')
        .not('file_content', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      if (!data?.file_content) throw new Error('Nessun contenuto file trovato');

      const filename = data.file_name || 'tmwe_commercial_contact.csv';
      download_blob(data.file_content, filename);

      toast({
        title: '✅ Download completato',
        description: `File "${filename}" scaricato con successo`,
      });
    } catch (error: any) {
      console.error('Error downloading original file:', error);
      toast({
        title: '❌ Errore download',
        description: error.message || 'Impossibile scaricare il file originale',
        variant: 'destructive',
      });
    } finally {
      set_exporting_original(false);
    }
  };

  const download_imported_contacts = async () => {
    set_exporting_contacts(true);
    try {
      const PAGE_SIZE = 1000;
      let all_records: any[] = [];
      let offset = 0;
      let has_more = true;

      // Paginated fetch
      while (has_more) {
        const { data, error } = await supabase
          .from('imported_contacts')
          .select('*')
          .range(offset, offset + PAGE_SIZE - 1)
          .order('created_at', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          all_records = all_records.concat(data);
          offset += PAGE_SIZE;
          has_more = data.length === PAGE_SIZE;
        } else {
          has_more = false;
        }
      }

      if (all_records.length === 0) {
        toast({
          title: '⚠️ Nessun dato',
          description: 'La tabella imported_contacts è vuota',
          variant: 'destructive',
        });
        return;
      }

      // Generate CSV
      const headers = Object.keys(all_records[0]);
      const csv_rows = [
        headers.join(','),
        ...all_records.map(record =>
          headers.map(h => {
            const val = record[h];
            if (val === null || val === undefined) return '';
            const str = String(val);
            // Escape CSV values with commas, quotes, or newlines
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          }).join(',')
        ),
      ];

      download_blob(csv_rows.join('\n'), 'imported_contacts_export.csv');

      toast({
        title: '✅ Export completato',
        description: `${all_records.length} record esportati con successo`,
      });
    } catch (error: any) {
      console.error('Error exporting imported contacts:', error);
      toast({
        title: '❌ Errore export',
        description: error.message || 'Impossibile esportare i contatti importati',
        variant: 'destructive',
      });
    } finally {
      set_exporting_contacts(false);
    }
  };

  return {
    download_original_file,
    download_imported_contacts,
    exporting_original,
    exporting_contacts,
  };
}
