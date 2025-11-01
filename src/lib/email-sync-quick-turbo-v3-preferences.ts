/**
 * TURBO V3 - Quick Email Syncer WITH SYNC PREFERENCES
 * 
 * Nuova versione che integra filtro cartelle basato su email_sync_preferences
 * NON modifica le versioni precedenti (v1, v2)
 * 
 * Features:
 * - Filtro automatico cartelle in base a preferenze utente
 * - Supporto modalità blacklist (escludi cartelle specifiche)
 * - Supporto modalità whitelist (includi solo cartelle specifiche)
 * - Cache incrementale UIDs
 * - Batch dinamico ottimizzato
 * - Duplicate check efficiente
 */

import { supabase } from '@/integrations/supabase/client';
import { getSyncPreferences, filterFolders, type EmailFolder } from './email-sync-preferences';
import { emailMessageApi, emailFolderApi } from './tmwe-api-integrated';

export interface TurboV3SyncProgress {
  status: 'idle' | 'loading' | 'running' | 'paused' | 'completed' | 'error';
  currentFolder: string;
  currentFolderProgress: number;
  currentFolderTotal: number;
  completedFolders: number;
  totalFolders: number;
  downloadedCount: number;
  skippedCount: number;
  failedCount: number;
  currentSpeed: number;
  estimatedTimeRemaining: number;
  filteredFoldersCount?: number; // 🆕 Cartelle dopo filtro preferenze
  originalFoldersCount?: number; // 🆕 Cartelle totali disponibili
}

export interface TurboV3SyncStats {
  totalEmails: number;
  downloaded: number;
  skipped: number;
  failed: number;
  totalTime: number;
  avgSpeed: number;
  cacheHits: number;
  folderStats: Record<string, {
    total: number;
    downloaded: number;
    skipped: number;
    failed: number;
  }>;
  preferencesApplied: {
    mode: 'whitelist' | 'blacklist';
    excludedFolders: string[];
    includedFolders: string[];
    originalFolderCount: number;
    filteredFolderCount: number;
  };
}

export interface TurboV3SyncOptions {
  userEmail: string;
  folders?: string[]; // Se specificato, bypassa le preferenze
  batchSize?: number;
  maxRetries?: number;
  timeout?: number;
  applyPreferences?: boolean; // Default: true
  onProgress: (progress: TurboV3SyncProgress) => void;
  onComplete: (stats: TurboV3SyncStats) => void;
  onError: (error: Error) => void;
}

interface UidCacheEntry {
  uidsSynced: Set<string>;
  lastSync: number;
}

const folderCacheMap = new Map<string, UidCacheEntry>();

function getCacheKey(userEmail: string, folder: string): string {
  return `${userEmail}:${folder}`;
}

function getFolderCache(userEmail: string, folder: string): UidCacheEntry | null {
  const cacheKey = getCacheKey(userEmail, folder);
  const cached = folderCacheMap.get(cacheKey);
  
  if (!cached) return null;
  
  // Cache valida per 5 minuti
  const isValid = (Date.now() - cached.lastSync) < 5 * 60 * 1000;
  return isValid ? cached : null;
}

function saveFolderCache(userEmail: string, folder: string, uids: string[]) {
  const cacheKey = getCacheKey(userEmail, folder);
  folderCacheMap.set(cacheKey, {
    uidsSynced: new Set(uids),
    lastSync: Date.now()
  });
}

function cleanOldCache() {
  const now = Date.now();
  for (const [key, entry] of folderCacheMap.entries()) {
    if (now - entry.lastSync > 5 * 60 * 1000) {
      folderCacheMap.delete(key);
    }
  }
}

/**
 * 🆕 STEP 1: Carica cartelle e applica preferenze sync
 */
async function loadFoldersWithPreferences(
  userEmail: string,
  forcedFolders?: string[]
): Promise<{ 
  folders: string[], 
  preferences: TurboV3SyncStats['preferencesApplied'] 
}> {
  
  // Se l'utente ha forzato cartelle specifiche, bypassa preferenze
  if (forcedFolders && forcedFolders.length > 0) {
    console.log('🔧 [TURBO V3] Using forced folders, skipping preferences');
    return {
      folders: forcedFolders,
      preferences: {
        mode: 'blacklist',
        excludedFolders: [],
        includedFolders: [],
        originalFolderCount: forcedFolders.length,
        filteredFolderCount: forcedFolders.length
      }
    };
  }

  // Carica tutte le cartelle disponibili
  console.log('📂 [TURBO V3] Loading available folders from server...');
  const allFolders = await emailFolderApi.getFolders({ include_counts: false });
  const folderNames = allFolders.map(f => f.name || String(f));
  
  console.log(`📂 [TURBO V3] Found ${folderNames.length} folders on server`);

  // Carica preferenze utente
  const prefs = await getSyncPreferences(userEmail);
  
  console.log('⚙️ [TURBO V3] User sync preferences:', {
    mode: prefs.included_folders.length > 0 ? 'whitelist' : 'blacklist',
    excluded: prefs.excluded_folders,
    included: prefs.included_folders
  });

  // Applica filtro
  const emailFolders: EmailFolder[] = folderNames.map(name => ({ name }));
  const filteredFolders = filterFolders(emailFolders, prefs);
  const filteredNames = filteredFolders.map(f => f.name);

  console.log(`✅ [TURBO V3] Filtered to ${filteredNames.length} folders:`, filteredNames);

  return {
    folders: filteredNames,
    preferences: {
      mode: prefs.included_folders.length > 0 ? 'whitelist' : 'blacklist',
      excludedFolders: prefs.excluded_folders,
      includedFolders: prefs.included_folders,
      originalFolderCount: folderNames.length,
      filteredFolderCount: filteredNames.length
    }
  };
}

/**
 * 🆕 STEP 2: Check duplicates usando cache + DB
 */
async function checkDuplicatesV3(
  uids: string[],
  userEmail: string,
  folder: string
): Promise<{ newUids: string[], skipped: number }> {
  
  // 1. Check cache first
  const cache = getFolderCache(userEmail, folder);
  let remainingUids = uids;
  let skipped = 0;

  if (cache) {
    remainingUids = uids.filter(uid => !cache.uidsSynced.has(uid));
    skipped = uids.length - remainingUids.length;
    console.log(`💾 [TURBO V3 Cache] Hit for ${folder}: ${skipped} UIDs cached`);
  }

  if (remainingUids.length === 0) {
    return { newUids: [], skipped };
  }

  // 2. Check DB per rimanenti usando message_id
  const messageIds = remainingUids.map(uid => `${folder}/${uid}`);
  
  const { data: existingEmails } = await supabase
    .from('email_messages')
    .select('message_id')
    .eq('user_email', userEmail)
    .in('message_id', messageIds);

  const existingMessageIds = new Set(existingEmails?.map(e => e.message_id) || []);
  const newUids = remainingUids.filter(uid => !existingMessageIds.has(`${folder}/${uid}`));
  const dbSkipped = remainingUids.length - newUids.length;

  console.log(`🔍 [TURBO V3 DB] ${folder}: ${newUids.length} new, ${dbSkipped} existing`);

  return { 
    newUids, 
    skipped: skipped + dbSkipped 
  };
}

/**
 * 🆕 STEP 3: Download batch con retry
 */
async function downloadBatchV3(
  uids: string[],
  folder: string,
  options: { maxRetries: number, timeout: number }
): Promise<Array<{ uid: string; data: any }>> {
  
  const results: Array<{ uid: string; data: any }> = [];

  const downloadPromises = uids.map(async (uid) => {
    let lastError: Error | null = null;
    
    for (let retry = 0; retry <= options.maxRetries; retry++) {
      try {
        const email = await emailMessageApi.getMessage(uid, folder);
        return { uid, data: email };
      } catch (error) {
        lastError = error as Error;
        
        if (retry < options.maxRetries) {
          const backoffMs = 500 * Math.pow(2, retry);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      }
    }
    
    console.error(`[TURBO V3] Failed after ${options.maxRetries} retries for UID ${uid}:`, lastError);
    return null;
  });

  const downloadedEmails = await Promise.all(downloadPromises);
  
  downloadedEmails.forEach(result => {
    if (result) results.push(result);
  });

  return results;
}

/**
 * 🆕 STEP 4: Insert batch in DB
 */
async function insertBatchV3(
  emails: Array<{ uid: string; data: any }>,
  userEmail: string,
  folder: string
): Promise<{ inserted: number, failed: number }> {
  
  if (emails.length === 0) return { inserted: 0, failed: 0 };

  // Prepara records nel formato corretto
  const records = emails.map(({ uid, data }) => {
    if (!data) return null;
    
    const messageId = `${folder}/${uid}`;
    
    return {
      message_id: messageId,
      user_email: userEmail,
      from_email: typeof data.from === 'object' ? data.from.email : data.from || '',
      to_email: Array.isArray(data.to) 
        ? data.to.map((t: any) => typeof t === 'object' ? t.email : t).join(', ')
        : (typeof data.to === 'object' ? data.to.email : data.to || ''),
      cc_email: Array.isArray(data.cc)
        ? data.cc.map((c: any) => typeof c === 'object' ? c.email : c).join(', ')
        : (typeof data.cc === 'object' ? data.cc?.email : data.cc || null),
      bcc_email: Array.isArray(data.bcc)
        ? data.bcc.map((b: any) => typeof b === 'object' ? b.email : b).join(', ')
        : (typeof data.bcc === 'object' ? data.bcc?.email : data.bcc || null),
      subject: data.subject || '(No Subject)',
      body_text: data.body_type === 'plain' ? data.body : null,
      body_html: data.body_type === 'html' ? data.body : null,
      data_ricezione: data.date || new Date().toISOString(),
      cartella: folder,
      attachments: data.attachments || [],
      flags: [],
      direzione: 'inbound',
      provider_id: '00000000-0000-0000-0000-000000000000',
      stato: data.read ? 'letto' : 'nuovo',
      sync_status: 'fun_email_backup'
    };
  }).filter((r): r is NonNullable<typeof r> => r !== null);

  if (records.length === 0) {
    return { inserted: 0, failed: emails.length };
  }

  try {
    // ✨ TURBO V3: Usa RPC Bulk Insert esistente
    const { data, error } = await supabase.rpc('bulk_insert_emails_turbo_v2', {
      p_records: records
    });
    
    if (error) throw error;
    
    console.log(`✅ [TURBO V3 RPC] Inserted ${records.length} emails into ${folder}`);
    return { inserted: records.length, failed: 0 };

  } catch (error) {
    console.error(`❌ [TURBO V3] Insert error for ${folder}:`, error);
    return { inserted: 0, failed: emails.length };
  }
}

/**
 * 🆕 Main Class: QuickEmailSyncerTurboV3
 */
export class QuickEmailSyncerTurboV3 {
  private options: Required<TurboV3SyncOptions>;
  private progress: TurboV3SyncProgress;
  private stats: TurboV3SyncStats;
  private isPaused = false;
  private shouldStop = false;
  private startTime = 0;

  constructor(options: TurboV3SyncOptions) {
    this.options = {
      folders: options.folders || [],
      batchSize: options.batchSize || 25,
      maxRetries: options.maxRetries || 2,
      timeout: options.timeout || 60000,
      applyPreferences: options.applyPreferences !== false,
      ...options
    };

    this.progress = {
      status: 'idle',
      currentFolder: '',
      currentFolderProgress: 0,
      currentFolderTotal: 0,
      completedFolders: 0,
      totalFolders: 0,
      downloadedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      currentSpeed: 0,
      estimatedTimeRemaining: 0
    };

    this.stats = {
      totalEmails: 0,
      downloaded: 0,
      skipped: 0,
      failed: 0,
      totalTime: 0,
      avgSpeed: 0,
      cacheHits: 0,
      folderStats: {},
      preferencesApplied: {
        mode: 'blacklist',
        excludedFolders: [],
        includedFolders: [],
        originalFolderCount: 0,
        filteredFolderCount: 0
      }
    };
  }

  async start() {
    try {
      this.startTime = Date.now();
      this.progress.status = 'loading';
      this.options.onProgress(this.progress);

      // 🆕 STEP 1: Carica cartelle con filtro preferenze
      const { folders, preferences } = await loadFoldersWithPreferences(
        this.options.userEmail,
        this.options.applyPreferences ? undefined : this.options.folders
      );

      if (folders.length === 0) {
        throw new Error('Nessuna cartella da sincronizzare dopo il filtro preferenze');
      }

      this.stats.preferencesApplied = preferences;
      this.progress.totalFolders = folders.length;
      this.progress.originalFoldersCount = preferences.originalFolderCount;
      this.progress.filteredFoldersCount = preferences.filteredFolderCount;
      this.progress.status = 'running';

      console.log('\n🚀 [TURBO V3] Starting sync with preferences...');
      console.log(`📂 Folders to sync (${folders.length}):`, folders);
      console.log(`⚙️ Preferences mode: ${preferences.mode}`);

      // Clean old cache
      cleanOldCache();

      // Priority: INBOX first
      const priorityFolders = [
        ...folders.filter(f => f.toLowerCase() === 'inbox'),
        ...folders.filter(f => f.toLowerCase() !== 'inbox')
      ];

      // Sync each folder
      for (const folder of priorityFolders) {
        if (this.shouldStop) {
          console.log('🛑 [TURBO V3] Sync stopped by user');
          break;
        }

        while (this.isPaused) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        await this.syncFolderV3(folder);
        this.progress.completedFolders++;
      }

      this.finalize();

    } catch (error) {
      console.error('❌ [TURBO V3] Sync error:', error);
      this.progress.status = 'error';
      this.options.onError(error as Error);
    }
  }

  private async syncFolderV3(folder: string) {
    console.log(`\n📂 [TURBO V3] Syncing folder: ${folder}`);
    this.progress.currentFolder = folder;
    this.progress.currentFolderProgress = 0;

    this.stats.folderStats[folder] = {
      total: 0,
      downloaded: 0,
      skipped: 0,
      failed: 0
    };

    try {
      // 1. Fetch UIDs
      const response = await supabase.functions.invoke('tmwe-api-proxy', {
        body: {
          endpoint: '/email_message',
          data: { 
            handler: 'get_messages',
            folder: folder,
            limit: 2000
          }
        }
      });

      if (response.error) throw response.error;
      
      const allUids: string[] = response.data?.data?.map((msg: any) => msg.uid?.toString() || '') || [];
      
      this.progress.currentFolderTotal = allUids.length;
      this.stats.folderStats[folder].total = allUids.length;
      this.stats.totalEmails += allUids.length;

      console.log(`📊 [TURBO V3] ${folder}: ${allUids.length} UIDs`);

      if (allUids.length === 0) return;

      // 2. Check duplicates
      const { newUids, skipped } = await checkDuplicatesV3(
        allUids,
        this.options.userEmail,
        folder
      );

      this.progress.skippedCount += skipped;
      this.stats.skipped += skipped;
      this.stats.folderStats[folder].skipped = skipped;

      if (newUids.length === 0) {
        console.log(`✅ [TURBO V3] ${folder}: All emails already synced`);
        this.progress.currentFolderProgress = allUids.length;
        return;
      }

      console.log(`📥 [TURBO V3] ${folder}: ${newUids.length} new emails to download`);

      // 3. Dynamic batch size
      const batchSize = this.calculateBatchSize(newUids.length);
      console.log(`⚙️ [TURBO V3] Using batch size: ${batchSize}`);

      // 4. Download in batches
      for (let i = 0; i < newUids.length; i += batchSize) {
        if (this.shouldStop) break;
        while (this.isPaused) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const batch = newUids.slice(i, i + batchSize);
        const batchStart = Date.now();

        try {
          // Download
          const emails = await downloadBatchV3(batch, folder, {
            maxRetries: this.options.maxRetries,
            timeout: this.options.timeout
          });

          // Insert
          const { inserted, failed } = await insertBatchV3(
            emails,
            this.options.userEmail,
            folder
          );

          // Update stats
          this.progress.downloadedCount += inserted;
          this.progress.failedCount += failed;
          this.stats.downloaded += inserted;
          this.stats.failed += failed;
          this.stats.folderStats[folder].downloaded += inserted;
          this.stats.folderStats[folder].failed += failed;

          this.progress.currentFolderProgress += batch.length;

          // Calculate speed
          const batchTime = (Date.now() - batchStart) / 1000;
          this.progress.currentSpeed = inserted / batchTime;

          this.options.onProgress(this.progress);

        } catch (error) {
          console.error(`❌ [TURBO V3] Batch error in ${folder}:`, error);
          this.progress.failedCount += batch.length;
          this.stats.failed += batch.length;
          this.stats.folderStats[folder].failed += batch.length;
        }
      }

      // Save cache
      saveFolderCache(this.options.userEmail, folder, allUids);

    } catch (error) {
      console.error(`❌ [TURBO V3] Error syncing ${folder}:`, error);
      this.progress.failedCount += 1;
    }
  }

  private calculateBatchSize(totalEmails: number): number {
    if (totalEmails < 50) return 10;
    if (totalEmails < 200) return 15;
    if (totalEmails < 1000) return 25;
    return 30;
  }

  private finalize() {
    this.stats.totalTime = (Date.now() - this.startTime) / 1000;
    this.stats.avgSpeed = this.stats.totalTime > 0 
      ? this.stats.downloaded / this.stats.totalTime 
      : 0;

    this.progress.status = 'completed';

    console.log('\n📊 [TURBO V3] SYNC COMPLETED');
    console.log(`  Total: ${this.stats.totalEmails} emails`);
    console.log(`  Downloaded: ${this.stats.downloaded}`);
    console.log(`  Skipped: ${this.stats.skipped}`);
    console.log(`  Failed: ${this.stats.failed}`);
    console.log(`  Time: ${this.stats.totalTime.toFixed(1)}s`);
    console.log(`  Speed: ${this.stats.avgSpeed.toFixed(1)} email/s`);
    console.log(`  Preferences: ${this.stats.preferencesApplied.mode}`);
    console.log(`    Original folders: ${this.stats.preferencesApplied.originalFolderCount}`);
    console.log(`    Filtered folders: ${this.stats.preferencesApplied.filteredFolderCount}`);

    this.options.onComplete(this.stats);
  }

  pause() {
    this.isPaused = true;
    this.progress.status = 'paused';
    console.log('⏸️ [TURBO V3] Sync paused');
  }

  resume() {
    this.isPaused = false;
    this.progress.status = 'running';
    console.log('▶️ [TURBO V3] Sync resumed');
  }

  stop() {
    this.shouldStop = true;
    this.progress.status = 'idle';
    console.log('🛑 [TURBO V3] Sync stopped');
  }
}
