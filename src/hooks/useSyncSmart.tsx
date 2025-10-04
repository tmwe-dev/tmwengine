import { useState, useCallback } from 'react';
import { emailMessageApi } from '@/lib/tmwe-api-integrated';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseSyncSmartProps {
  folder: string;
  totalEmails: number;
}

export const useSyncSmart = ({ folder, totalEmails }: UseSyncSmartProps) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncedCount, setSyncedCount] = useState(0);
  const [syncError, setSyncError] = useState<string | null>(null);

  const startSync = useCallback(async (): Promise<void> => {
    setIsSyncing(true);
    setSyncedCount(0);
    setSyncError(null);

    try {
      // 1. Recupera tutti gli ID delle email già presenti nel database
      const { data: existingEmails } = await supabase
        .from('email_messages')
        .select('message_id')
        .eq('cartella', folder);

      const existingIds = new Set(existingEmails?.map(e => e.message_id) || []);
      const alreadyInDb = existingIds.size;
      const missingCount = Math.max(0, totalEmails - alreadyInDb);
      
      console.log(`📊 Sync Smart avviato: ${totalEmails} totali, ${alreadyInDb} già presenti, ${missingCount} mancanti`);

      if (missingCount === 0) {
        toast.success(`Tutte le ${totalEmails.toLocaleString()} email sono già sincronizzate.`);
        setIsSyncing(false);
        return;
      }

      const batchSize = 10; // ⚡ Batch ridotto per migliori performance
      const totalPages = Math.ceil(totalEmails / batchSize);
      let newEmailsCount = 0;
      let errorCount = 0;

      toast.info(`Sincronizzazione smart: ${missingCount.toLocaleString()} email da scaricare...`);

      // 2. Scarica email batch per batch
      for (let page = 1; page <= totalPages; page++) {
        try {
          const response = await emailMessageApi.getMessages({
            folder,
            limit: batchSize,
            page,
          });

          const pageEmails = response?.messages || [];
          
          // 3. Filtra solo le email NON presenti nel database
          const missingEmails = pageEmails.filter((email: any) => {
            const emailId = String(email.uid || email.message_id);
            return !existingIds.has(emailId);
          });

          console.log(`📄 Batch ${page}/${totalPages}: ${pageEmails.length} dalla API, ${missingEmails.length} nuove da salvare`);

          // 4. Salva solo le email mancanti
          if (missingEmails.length > 0) {
            try {
              const emailsToInsert = missingEmails.map((email: any) => {
                let isoDate = new Date().toISOString();
                if (email.date) {
                  try {
                    isoDate = new Date(email.date).toISOString();
                  } catch (e) {
                    console.error('Error parsing date:', email.date);
                  }
                }

                return {
                  message_id: String(email.uid || email.message_id || `msg-${Date.now()}-${Math.random()}`),
                  from_email: email.from || email.from_email || '',
                  to_email: email.to || email.to_email || '',
                  cc_email: email.cc || email.cc_email || null,
                  bcc_email: email.bcc || email.bcc_email || null,
                  subject: email.subject || '',
                  body_text: email.body_text || email.text || '',
                  body_html: email.body_html || email.html || '',
                  data_ricezione: isoDate,
                  cartella: folder,
                  direzione: 'inbound',
                  stato: 'nuovo',
                  flags: email.flags || [],
                  attachments: email.attachments || [],
                  provider_id: '00000000-0000-0000-0000-000000000000',
                };
              });

              const { error: insertError } = await supabase
                .from('email_messages')
                .insert(emailsToInsert);

              if (insertError) {
                console.error('❌ Error saving emails to database:', insertError);
                errorCount++;
              } else {
                newEmailsCount += missingEmails.length;
                
                // Aggiungi i nuovi ID al Set per evitare duplicati nei batch successivi
                missingEmails.forEach((email: any) => {
                  existingIds.add(String(email.uid || email.message_id));
                });
                
                setSyncedCount(newEmailsCount);
                console.log(`✅ Batch ${page}/${totalPages} completato: salvate ${missingEmails.length} email (totale: ${newEmailsCount})`);
              }
            } catch (dbError) {
              console.error('❌ Database save error:', dbError);
              errorCount++;
            }
          }

          // Small delay to avoid overwhelming the server
          if (page < totalPages) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (error) {
          console.error(`❌ Error downloading batch ${page}:`, error);
          errorCount++;
          // Continue with next batch even if one fails
        }
      }

      setIsSyncing(false);
      
      if (newEmailsCount > 0) {
        toast.success(
          `🎉 Sync Smart completato! ${newEmailsCount.toLocaleString()} nuove email salvate${errorCount > 0 ? ` (${errorCount} errori)` : ''}.`,
          { duration: 5000 }
        );
        console.log(`🎉 Sync Smart completato: ${newEmailsCount} nuove email salvate su ${missingCount} mancanti`);
      } else {
        toast.success(`Database già aggiornato. ${alreadyInDb.toLocaleString()} email già presenti.`);
      }
    } catch (error: any) {
      console.error('❌ Sync Smart error:', error);
      setSyncError(error.message || 'Errore durante la sincronizzazione');
      setIsSyncing(false);
      toast.error('Errore durante la sincronizzazione smart delle email');
    }
  }, [folder, totalEmails]);

  const reset = useCallback(() => {
    setIsSyncing(false);
    setSyncedCount(0);
    setSyncError(null);
  }, []);

  return {
    isSyncing,
    syncedCount,
    syncError,
    startSync,
    reset,
  };
};
