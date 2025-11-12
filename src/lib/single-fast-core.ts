/**
 * SINGLE FAST CORE LOGIC
 * Orchestrator modulare per import email classico
 * ✅ REFACTORED: usa moduli condivisi (email-downloader, email-repository, email-temp-index-manager)
 */

import { supabase } from "@/integrations/supabase/client";
import { getSyncPreferences } from "./email-sync-preferences";
import { downloadSingleEmail } from './email/email-downloader';
import { checkEmailExists, updateTempIndexStatus } from './email/email-repository';

// ✅ Re-export per backward compatibility (useSingleFast, useSingleFastPerformance)
export { populateTempIndexForFolder } from './email/email-temp-index-manager';
export type { 
  PopulateTempIndexResult, 
  PopulateConfig, 
  PopulateProgress 
} from './email/email-temp-index-manager';

/**
 * Importa singola email da UID nella tabella email_messages
 * ✅ REFACTORED: usa email-downloader.downloadSingleEmail + email-repository
 */
export async function importEmailFromTempIndex(
  uid: string,
  folder: string,
  userEmail: string
): Promise<void> {
  const messageId = `${folder}/${uid}`;
  
  // 1. Check duplicato per questo utente (usa email-repository.ts)
  const exists = await checkEmailExists(messageId, userEmail);
  
  if (exists) {
    console.warn(`⚠️ Email ${uid} già presente, skip import`);
    await updateTempIndexStatus(uid, folder, userEmail, 'imported');
    return;
  }

  // 2. Download email completa (usa email-downloader.ts)
  const result = await downloadSingleEmail(
    parseInt(uid, 10),
    folder,
    userEmail,
    undefined // config default
  );

  if (result.status === 'failed') {
    throw new Error(`Failed to download email UID ${uid}`);
  }

  console.log(`✅ Email UID ${uid} importata con successo (status: ${result.status})`);
}

/**
 * Recupera lista cartelle con conteggio email mancanti
 */
export async function getSingleFastFolders(userEmail: string): Promise<Array<{
  folderName: string;
  missing: number;
  included: boolean;
}>> {
  // 1. Carica preferenze sync
  const preferences = await getSyncPreferences(userEmail);

  // 2. Carica conteggi unificati
  const { getUnifiedFolderCounts } = await import('./email-count-service');
  const folderCounts = await getUnifiedFolderCounts(userEmail);

  // 3. Se NON ci sono preferenze → sincronizza TUTTE
  if (preferences.included_folders.length === 0) {
    console.log('⚠️ Nessuna preferenza → sincronizza TUTTE le cartelle');
    return folderCounts.map(f => ({
      folderName: f.folderName,
      missing: f.missing,
      included: true
    }));
  }

  // 4. Normalizzazione SOLO per confronto (non modifica i nomi originali)
  const normalize = (name: string) => (name || '').trim().toLowerCase();
  const includedSet = new Set(preferences.included_folders.map(normalize));

  console.log('📂 Preferenze incluse:', preferences.included_folders.length, 'cartelle');
  console.log('📂 Cartelle disponibili:', folderCounts.length);

  // 5. Applica filtro preferenze (INCLUDE anche cartelle con missing = 0)
  const result = folderCounts.map(f => ({
    folderName: f.folderName, // ✅ Nome ORIGINALE non modificato
    missing: f.missing,
    included: includedSet.has(normalize(f.folderName))
  }));

  console.log('📂 Cartelle filtrate (included=true):', result.filter(f => f.included).length);

  return result;
}

/**
 * Fetch UIDs dalla tabella email_temp_index
 */
/**
 * Versione VELOCE che usa SOLO dati locali da email_temp_index
 * NO chiamate API esterne → avvio immediato della danza
 */
export async function getSingleFastFoldersFromLocal(userEmail: string): Promise<Array<{
  folderName: string;
  pending: number;
  included: boolean;
}>> {
  console.log('🚀 [getSingleFastFoldersFromLocal] Caricamento cartelle da email_temp_index...');

  // 1. Carica preferenze sync
  const preferences = await getSyncPreferences(userEmail);
  
  // 2. Query cartelle con email pending da email_temp_index
  const { data: pendingFolders, error } = await supabase
    .from('email_temp_index')
    .select('folder')
    .eq('user_email', userEmail)
    .eq('status', 'pending');

  if (error) {
    console.error('❌ Errore lettura email_temp_index:', error);
    throw error;
  }

  // 3. Conta pending per folder
  const folderMap = new Map<string, number>();
  (pendingFolders || []).forEach((row: any) => {
    const count = folderMap.get(row.folder) || 0;
    folderMap.set(row.folder, count + 1);
  });

  console.log(`📂 Cartelle con pending trovate: ${folderMap.size}`);

  // 4. Se NON ci sono preferenze → sincronizza TUTTE
  if (preferences.included_folders.length === 0) {
    console.log('⚠️ Nessuna preferenza → sincronizza TUTTE le cartelle con pending');
    return Array.from(folderMap.entries()).map(([folderName, pending]) => ({
      folderName,
      pending,
      included: true
    }));
  }

  // 5. Normalizzazione per confronto
  const normalize = (name: string) => (name || '').trim().toLowerCase();
  const includedSet = new Set(preferences.included_folders.map(normalize));

  // 6. Filtra in base a preferenze
  const result = Array.from(folderMap.entries()).map(([folderName, pending]) => ({
    folderName,
    pending,
    included: includedSet.has(normalize(folderName))
  }));

  const includedCount = result.filter(f => f.included).length;
  console.log(`✅ Cartelle filtrate (included=true): ${includedCount}/${result.length}`);

  return result;
}

/**
 * Fetch UIDs dalla tabella email_temp_index
 */
export async function fetchUIDsFromTempIndex(
  folder: string,
  userEmail: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('email_temp_index')
    .select('uid')
    .eq('user_email', userEmail)
    .eq('folder', folder)
    .eq('status', 'pending');

  if (error) {
    console.error('❌ Error fetching UIDs from temp index:', error);
    throw error;
  }

  return (data || []).map((item: any) => item.uid);
}
