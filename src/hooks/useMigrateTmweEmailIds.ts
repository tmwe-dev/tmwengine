/**
 * Hook para migrar tmwe_email_id en clasificaciones existentes
 * Ejecuta la migración desde el frontend usando la API TMWE existente
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { emailSearchApi } from '@/lib/tmwe-email-search-api';
import { toast } from 'sonner';

interface MigrationProgress {
  total: number;
  processed: number;
  migrated: number;
  failed: number;
  currentEmail: string;
}

interface MigrationResult {
  success: boolean;
  total: number;
  migrated: number;
  failed: number;
  errors: { id: string; error: string }[];
}

export const useMigrateTmweEmailIds = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<MigrationProgress>({
    total: 0,
    processed: 0,
    migrated: 0,
    failed: 0,
    currentEmail: ''
  });

  const runMigration = useCallback(async (batchSize = 20): Promise<MigrationResult> => {
    setIsRunning(true);
    const errors: { id: string; error: string }[] = [];
    let migrated = 0;
    let failed = 0;

    try {
      // 1. Fetch classifications without tmwe_email_id
      const { data: classifications, error: fetchError } = await supabase
        .from('email_ai_classifications')
        .select('id, email_uid, folder_name, sender_email, subject, user_email')
        .is('tmwe_email_id', null)
        .order('created_at', { ascending: false })
        .limit(batchSize);

      if (fetchError) throw fetchError;
      if (!classifications || classifications.length === 0) {
        toast.info('No hay clasificaciones pendientes de migrar');
        return { success: true, total: 0, migrated: 0, failed: 0, errors: [] };
      }

      console.log(`📊 Migrando ${classifications.length} clasificaciones...`);
      setProgress(p => ({ ...p, total: classifications.length }));

      // 2. Process each classification
      for (let i = 0; i < classifications.length; i++) {
        const classification = classifications[i];
        
        setProgress(p => ({
          ...p,
          processed: i,
          currentEmail: classification.sender_email?.substring(0, 30) || 'unknown'
        }));

        try {
          console.log(`\n📧 [${i + 1}/${classifications.length}] Processing:`, {
            id: classification.id.substring(0, 8),
            uid: classification.email_uid,
            sender: classification.sender_email
          });

          // Search TMWE API by sender to find email with matching UID
          const searchResult = await emailSearchApi.searchBySender({
            sender: classification.sender_email,
            folder: classification.folder_name || 'INBOX',
            limit: 50,
            timeout: 15
          });

          const emails = searchResult?.emails || [];
          const uidToFind = parseInt(classification.email_uid, 10);

          // Find email matching the UID
          let matchingEmail = emails.find((e: any) => 
            e.uid === uidToFind || 
            String(e.uid) === classification.email_uid
          );

          // Fallback: try full-text search by subject
          if (!matchingEmail && classification.subject) {
            console.log('   ⚠️ No match by sender, trying subject search...');
            
            const subjectResult = await emailSearchApi.searchEmails({
              query: classification.subject.substring(0, 50),
              search_folder: classification.folder_name || 'INBOX',
              limit: 20,
              timeout: 15
            });

            const subjectEmails = subjectResult?.emails || [];
            matchingEmail = subjectEmails.find((e: any) => 
              e.uid === uidToFind || 
              String(e.uid) === classification.email_uid
            );
          }

          if (!matchingEmail) {
            throw new Error(`No email found for UID ${classification.email_uid}`);
          }

          // Extract tmwe_email_id
          const tmweEmailId = matchingEmail.id || matchingEmail.email_id;
          if (!tmweEmailId) {
            throw new Error('Email found but no email_id in response');
          }

          console.log(`   ✅ Found: tmwe_email_id = ${tmweEmailId}`);

          // Update classification
          const { error: updateError } = await supabase
            .from('email_ai_classifications')
            .update({ tmwe_email_id: tmweEmailId })
            .eq('id', classification.id);

          if (updateError) throw updateError;

          migrated++;
          setProgress(p => ({ ...p, migrated }));
          console.log(`   💾 Updated with tmwe_email_id = ${tmweEmailId}`);

        } catch (err: any) {
          console.error(`   ❌ Error:`, err.message);
          failed++;
          errors.push({ id: classification.id, error: err.message });
          setProgress(p => ({ ...p, failed }));
        }

        // Rate limiting: 500ms between requests
        if (i < classifications.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      setProgress(p => ({ ...p, processed: classifications.length }));

      // Summary
      console.log('\n═══════════════════════════════════════════════════════');
      console.log('📊 MIGRATION SUMMARY');
      console.log('═══════════════════════════════════════════════════════');
      console.log(`   Total: ${classifications.length}`);
      console.log(`   ✅ Migrated: ${migrated}`);
      console.log(`   ❌ Failed: ${failed}`);
      console.log('═══════════════════════════════════════════════════════');

      if (migrated > 0) {
        toast.success(`${migrated} clasificaciones migradas con éxito`);
      }
      if (failed > 0) {
        toast.warning(`${failed} clasificaciones fallaron`);
      }

      return {
        success: true,
        total: classifications.length,
        migrated,
        failed,
        errors
      };

    } catch (error: any) {
      console.error('❌ Migration error:', error);
      toast.error(`Error de migración: ${error.message}`);
      return {
        success: false,
        total: 0,
        migrated,
        failed,
        errors
      };
    } finally {
      setIsRunning(false);
      setProgress({
        total: 0,
        processed: 0,
        migrated: 0,
        failed: 0,
        currentEmail: ''
      });
    }
  }, []);

  // Check remaining count
  const checkPending = useCallback(async () => {
    const { count, error } = await supabase
      .from('email_ai_classifications')
      .select('id', { count: 'exact', head: true })
      .is('tmwe_email_id', null);

    if (error) {
      console.error('Error checking pending:', error);
      return -1;
    }
    return count || 0;
  }, []);

  return {
    runMigration,
    checkPending,
    isRunning,
    progress
  };
};
