/**
 * Email Count Service - Servizio unificato per conteggi email server vs DB
 * Centralizza tutta la logica di confronto e diagnostica
 */

import { supabase } from '@/integrations/supabase/client';
import { emailFolderApi } from './tmwe-api-integrated';

export interface UnifiedFolderCount {
  folderName: string;
  serverCount: number;        // Email sul server TMWE
  dbCount: number;            // Email nel DB locale
  missing: number;            // serverCount - dbCount
  syncPercentage: number;     // (dbCount/serverCount)*100
  serverSource: 'get_folders' | 'get_messages' | 'get_folder_info' | 'unavailable';
  errors: string[];           // Eventuali errori per questa cartella
  isTestable: boolean;        // Se la cartella ha abbastanza email per test (>10)
}

/**
 * Recupera conteggi unificati per tutte le cartelle
 * @param userEmail Email TMWE dell'utente
 * @param foldersToCheck Lista specifica di cartelle (opzionale, altrimenti tutte)
 * @returns Array di UnifiedFolderCount con dati comparativi
 */
export async function getUnifiedFolderCounts(
  userEmail: string,
  foldersToCheck?: string[]
): Promise<UnifiedFolderCount[]> {
  console.log('📊 [EmailCountService] Starting unified count check for:', userEmail);
  
  // STEP 1: Get DB counts - COUNT ALL EMAILS regardless of sync_status
  // 🚀 Usa RPC esistente con aggregazione server-side (risolve limite 1000 righe)
  const { data: dbCounts, error: dbError } = await supabase
    .rpc('get_email_folder_counts', {
      p_user_email: userEmail,
      p_sync_status: null // NULL = conta TUTTE le email
    });
  
  if (dbError) {
    console.error('❌ [EmailCountService] DB count failed:', dbError);
    throw new Error(`DB count failed: ${dbError.message}`);
  }
  
  // Converti array [{cartella: "INBOX", count: 100}] in Map
  const dbMap = (dbCounts || []).reduce((acc, row: any) => {
    acc[row.cartella] = row.count;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('✅ [EmailCountService] DB counts:', dbMap);
  
  // STEP 2: Get server folders
  let serverFolders: any[] = [];
  let serverSource: 'get_folders' | 'get_messages' | 'unavailable' = 'get_folders';
  
  try {
    console.log('📡 [EmailCountService] Fetching server folders...');
    const foldersResponse = await emailFolderApi.getFolders({ 
      include_counts: true, 
      skipCache: true 
    });
    
    serverFolders = foldersResponse?.folders 
      || foldersResponse?.data 
      || (Array.isArray(foldersResponse) ? foldersResponse : []);
    
    console.log('✅ [EmailCountService] Server folders retrieved:', serverFolders.length);
  } catch (err) {
    console.warn('⚠️ [EmailCountService] get_folders failed:', err);
    serverSource = 'unavailable';
  }
  
  // STEP 3: Build unified results
  const results: UnifiedFolderCount[] = [];
  
  // Merge server folders con DB folders
  const allFolderNames = new Set([
    ...serverFolders.map(f => f.name || f.folder),
    ...Object.keys(dbMap)
  ]);
  
  const foldersToProcess = foldersToCheck || Array.from(allFolderNames);
  
  for (const folderName of foldersToProcess) {
    const errors: string[] = [];
    let serverCount = 0;
    let currentSource = serverSource;
    
    // Cerca conteggio in serverFolders
    const serverFolder = serverFolders.find(f => 
      (f.name || f.folder) === folderName
    );
    
    if (serverFolder) {
      serverCount = serverFolder.message_count 
        || serverFolder.total_count 
        || serverFolder.messages 
        || serverFolder.count 
        || serverFolder.total 
        || 0;
      
      console.log(`✅ [EmailCountService] ${folderName}: server=${serverCount} (from ${serverSource})`);
    } else if (serverSource === 'unavailable') {
      errors.push('Server API unavailable - using DB count only');
      serverCount = -1; // Indica conteggio non disponibile
      currentSource = 'unavailable';
    } else {
      // Cartella esiste nel DB ma non nella risposta server
      errors.push('Folder exists in DB but not found on server');
      serverCount = -1;
      currentSource = 'unavailable';
    }
    
    const dbCount = dbMap[folderName] || 0;
    const missing = serverCount >= 0 ? Math.max(0, serverCount - dbCount) : 0;
    const syncPercentage = serverCount > 0 
      ? Math.round((dbCount / serverCount) * 100) 
      : (dbCount > 0 ? 100 : 0);
    
    const isTestable = serverCount >= 10 || (serverCount < 0 && dbCount >= 10);
    
    results.push({
      folderName,
      serverCount,
      dbCount,
      missing,
      syncPercentage,
      serverSource: currentSource,
      errors,
      isTestable
    });
  }
  
  console.log('📊 [EmailCountService] Final results:', results.length, 'folders');
  return results.sort((a, b) => b.serverCount - a.serverCount); // Ordina per dimensione
}

/**
 * Filtra cartelle testabili (con abbastanza email)
 * @param minEmails Numero minimo di email richieste (default: 10)
 * @returns Lista di cartelle testabili
 */
export async function getTestableFolders(
  userEmail: string,
  minEmails: number = 10
): Promise<UnifiedFolderCount[]> {
  const allFolders = await getUnifiedFolderCounts(userEmail);
  return allFolders.filter(f => 
    f.isTestable && (f.serverCount >= minEmails || f.dbCount >= minEmails)
  );
}

/**
 * Recupera conteggio per singola cartella
 * @param userEmail Email TMWE
 * @param folderName Nome cartella
 * @returns UnifiedFolderCount per la cartella specificata
 */
export async function getFolderCount(
  userEmail: string,
  folderName: string
): Promise<UnifiedFolderCount> {
  const results = await getUnifiedFolderCounts(userEmail, [folderName]);
  if (results.length === 0) {
    throw new Error(`Folder "${folderName}" not found`);
  }
  return results[0];
}

/**
 * Genera statistiche aggregate sui conteggi
 */
export function getAggregatedStats(folders: UnifiedFolderCount[]) {
  return {
    totalFolders: folders.length,
    testableFolders: folders.filter(f => f.isTestable).length,
    syncedFolders: folders.filter(f => f.syncPercentage === 100).length,
    totalServerEmails: folders.reduce((sum, f) => sum + Math.max(0, f.serverCount), 0),
    totalDbEmails: folders.reduce((sum, f) => sum + f.dbCount, 0),
    totalMissing: folders.reduce((sum, f) => sum + f.missing, 0),
    foldersWithErrors: folders.filter(f => f.errors.length > 0).length,
    topFolders: folders
      .filter(f => f.serverCount > 0)
      .sort((a, b) => b.serverCount - a.serverCount)
      .slice(0, 5)
  };
}
