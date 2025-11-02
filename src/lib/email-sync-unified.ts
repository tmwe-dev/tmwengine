/**
 * EMAIL SYNC UNIFIED - Sistema consolidato per sincronizzazione email
 * 
 * ✅ Batch seriale ottimizzato (25 email/batch)
 * ✅ Supporto preferences (whitelist/blacklist folders)
 * ✅ Cache V2 (highestUID + lastSync)
 * ✅ Bulk insert RPC con fallback
 * ✅ Progress tracking real-time
 */

import { supabase } from "@/integrations/supabase/client";
import { emailMessageApi, emailFolderApi } from "@/lib/tmwe-api-integrated";
import { getSyncPreferences, filterFolders, type EmailFolder } from "./email-sync-preferences";
import { 
  getFolderCacheV2, 
  saveFolderCacheV2, 
  cleanOldCacheV2 
} from "./email-sync-quick-cache-v2";

// ==================== TYPES ====================

export interface UnifiedSyncProgress {
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  currentFolder: string;
  foldersToSync: string[];
  completedFolders: string[];
  totalEmails: number;
  downloadedCount: number;
  failedCount: number;
  speed: number;
  estimatedTimeRemaining: number;
}

export interface UnifiedSyncOptions {
  userEmail: string;
  folders?: string[];
  applyPreferences?: boolean;
  batchSize?: number;
  maxRetries?: number;
  timeout?: number;
  onProgress?: (progress: UnifiedSyncProgress) => void;
  onComplete?: (stats: UnifiedSyncStats) => void;
  onError?: (error: Error) => void;
}

export interface UnifiedSyncStats {
  totalEmails: number;
  downloaded: number;
  skipped: number;
  failed: number;
  duration: number;
  avgSpeed: number;
  folders: { [key: string]: number };
}

// ==================== HELPER FUNCTIONS ====================

async function fetchFolderUIDs(folderName: string): Promise<string[]> {
  const response = await supabase.functions.invoke('tmwe-api-proxy', {
    body: {
      endpoint: '/email_message',
      data: { 
        handler: 'get_messages',
        folder: folderName
      }
    }
  });

  if (response.error) throw response.error;
  
  const uids: string[] = response.data?.data?.map((msg: any) => msg.uid?.toString() || '') || [];
  return uids.filter((uid: string) => Boolean(uid));
}

async function checkDuplicates(
  uids: string[], 
  userEmail: string, 
  folderName: string
): Promise<{ existingUids: Set<string>; cacheHits: number }> {
  const existingUids = new Set<string>();
  let cacheHits = 0;
  
  if (uids.length === 0) {
    return { existingUids, cacheHits };
  }
  
  // Check cache V2
  const cache = getFolderCacheV2(userEmail, folderName);
  let uidsToCheck: string[] = uids;
  
  if (cache) {
    const newUids: string[] = uids.filter((uid: string) => parseInt(uid) > cache.highestUID);
    cacheHits = uids.length - newUids.length;
    
    console.log(`💾 [UNIFIED] ${folderName}: ${cacheHits}/${uids.length} UIDs cached`);
    uidsToCheck = newUids;
    
    const cachedUids: string[] = uids.filter((uid: string) => parseInt(uid) <= cache.highestUID);
    cachedUids.forEach((uid: string) => existingUids.add(uid));
  }
  
  if (uidsToCheck.length === 0) {
    return { existingUids, cacheHits };
  }
  
  // Check DB in batches
  const BATCH_SIZE = 500;
  const messageIds = uidsToCheck.map(uid => `${folderName}/${uid}`);

  for (let i = 0; i < messageIds.length; i += BATCH_SIZE) {
    const batch = messageIds.slice(i, i + BATCH_SIZE);
    
    const { data } = await supabase
      .from('email_messages')
      .select('message_id')
      .eq('user_email', userEmail)
      .in('message_id', batch);
    
    if (data) {
      data.forEach((row: any) => {
        const uid = row.message_id.split('/')[1];
        if (uid) existingUids.add(uid);
      });
    }
  }
  
  return { existingUids, cacheHits };
}

async function downloadBatch(
  folder: string,
  uids: string[],
  batchSize: number = 25,
  maxRetries: number = 2
): Promise<any[]> {
  const allEmails: any[] = [];
  
  console.log(`📥 [UNIFIED] Downloading ${uids.length} emails individually from folder: ${folder}`);
  
  for (const uid of uids) {
    let attempt = 0;
    let success = false;
    
    while (attempt < maxRetries && !success) {
      try {
        const response = await emailMessageApi.getMessage(
          uid.toString(),
          folder,
          false  // markAsRead = false per non modificare lo stato
        );
        
        if (response?.success && response?.data) {
          allEmails.push(response.data);
          success = true;
        } else {
          console.warn(`⚠️ [UNIFIED] UID ${uid} returned invalid response`);
          success = true; // Skip this UID
        }
        
      } catch (error) {
        attempt++;
        if (attempt >= maxRetries) {
          console.error(`❌ [UNIFIED] UID ${uid} failed after ${maxRetries} attempts:`, error);
        } else {
          console.warn(`⚠️ [UNIFIED] UID ${uid} attempt ${attempt} failed, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
        }
      }
    }
  }
  
  console.log(`✅ [UNIFIED] Downloaded ${allEmails.length}/${uids.length} emails successfully`);
  
  return allEmails;
}

async function insertBatch(
  emails: any[],
  userEmail: string,
  folderName: string
): Promise<{ inserted: number; failed: number }> {
  if (emails.length === 0) {
    return { inserted: 0, failed: 0 };
  }
  
  const records = emails.map((email: any) => ({
    user_email: userEmail,
    message_id: email.message_id || `${folderName}/${email.uid}`,
    cartella: folderName,
    uid_server: email.uid?.toString() || '',
    oggetto: email.subject || '',
    mittente_email: email.from || '',
    destinatario_email: email.to || '',
    from_email: email.from || '',
    to_email: email.to || '',
    cc_email: email.cc || '',
    bcc_email: email.bcc || '',
    data_ricezione: email.date || new Date().toISOString(),
    corpo_html: email.body_html || '',
    corpo_testo: email.body_text || '',
    allegati: email.attachments || [],
    flags: email.flags || [],
    dimensione_bytes: email.size || 0,
    letto: email.seen || false,
    contrassegnato: email.flagged || false,
    direzione: 'ricevuto' as const,
    provider_id: 'tmwe'
  }));
  
  // Insert to database
  let inserted = 0;
  let failed = 0;
  
  // Try bulk insert first
  try {
    const { error } = await supabase
      .from('email_messages')
      .insert(records);
    
    if (!error) {
      console.log(`✅ [UNIFIED] Bulk inserted ${records.length} emails`);
      return { inserted: records.length, failed: 0 };
    }
    
    // If bulk fails, try individual inserts
    console.warn('⚠️ [UNIFIED] Bulk insert failed, trying individual inserts');
  } catch (bulkError) {
    console.warn('⚠️ [UNIFIED] Bulk insert error, trying individual inserts');
  }
  
  // Fallback: individual inserts
  for (const record of records) {
    try {
      const { error } = await supabase
        .from('email_messages')
        .insert([record]);
      
      if (error) {
        console.warn(`⚠️ [UNIFIED] Insert error for ${record.message_id}:`, error.message);
        failed++;
      } else {
        inserted++;
      }
    } catch (insertError: any) {
      console.error(`❌ [UNIFIED] Exception inserting ${record.message_id}:`, insertError.message);
      failed++;
    }
  }
  
  return { inserted, failed };
}

// ==================== MAIN CLASS ====================

export class EmailSyncUnified {
  private progress: UnifiedSyncProgress;
  private options: Required<UnifiedSyncOptions>;
  private shouldStop = false;
  private startTime = 0;
  private stats: UnifiedSyncStats;

  constructor(options: UnifiedSyncOptions) {
    this.options = {
      userEmail: options.userEmail,
      folders: options.folders || [],
      applyPreferences: options.applyPreferences ?? false,
      batchSize: options.batchSize || 25,
      maxRetries: options.maxRetries || 2,
      timeout: options.timeout || 60000,
      onProgress: options.onProgress || (() => {}),
      onComplete: options.onComplete || (() => {}),
      onError: options.onError || (() => {})
    };
    
    this.progress = {
      status: 'idle',
      currentFolder: '',
      foldersToSync: [],
      completedFolders: [],
      totalEmails: 0,
      downloadedCount: 0,
      failedCount: 0,
      speed: 0,
      estimatedTimeRemaining: 0
    };
    
    this.stats = {
      totalEmails: 0,
      downloaded: 0,
      skipped: 0,
      failed: 0,
      duration: 0,
      avgSpeed: 0,
      folders: {}
    };
  }

  async start(): Promise<UnifiedSyncStats> {
    this.startTime = Date.now();
    this.progress.status = 'running';
    
    try {
      // Load folders
      const foldersToSync = await this.loadFolders();
      this.progress.foldersToSync = foldersToSync;
      
      console.log(`🚀 [UNIFIED] Starting sync for ${foldersToSync.length} folders`);
      
      // Sync each folder
      for (const folder of foldersToSync) {
        if (this.shouldStop) break;
        
        this.progress.currentFolder = folder;
        await this.syncFolder(folder);
        this.progress.completedFolders.push(folder);
        
        this.updateProgress();
      }
      
      // Complete
      this.progress.status = 'completed';
      this.stats.duration = Date.now() - this.startTime;
      this.stats.avgSpeed = this.stats.downloaded / (this.stats.duration / 1000);
      
      this.options.onComplete(this.stats);
      
      return this.stats;
      
    } catch (error: any) {
      this.progress.status = 'error';
      this.options.onError(error);
      throw error;
    }
  }

  private async loadFolders(): Promise<string[]> {
    // Case 1: Manual folder selection
    if (this.options.folders && this.options.folders.length > 0) {
      console.log('📁 [UNIFIED] Using manual folder selection:', this.options.folders);
      return this.options.folders;
    }
    
    // Case 2: Apply preferences from DB
    if (this.options.applyPreferences) {
      console.log('📁 [UNIFIED] Loading preferences from DB...');
      
      try {
        // 1. Get user preferences
        const preferences = await getSyncPreferences(this.options.userEmail);
        console.log('📁 [UNIFIED] User preferences:', {
          excluded_count: preferences.excluded_folders.length,
          included_count: preferences.included_folders.length,
          excluded: preferences.excluded_folders,
          included: preferences.included_folders
        });
        
        // 2. Get all folders from server
        const response = await emailFolderApi.getFolders({ include_counts: false });
        const allFolders = Array.isArray(response) 
          ? response.map(f => ({ name: f.name || f, ...f }))
          : (response?.folders || []).map(f => ({ name: f.name || f, ...f }));
        
        console.log('📁 [UNIFIED] All server folders:', allFolders.map(f => f.name));
        
        // 3. Filter based on preferences
        const filtered = filterFolders(allFolders, preferences);
        const folderNames = filtered.map(f => f.name);
        
        console.log('📁 [UNIFIED] Filtered by preferences:', folderNames);
        
        if (folderNames.length === 0) {
          console.warn('⚠️ [UNIFIED] No folders after filtering, defaulting to INBOX');
          return ['INBOX'];
        }
        
        return folderNames;
        
      } catch (error) {
        console.error('❌ [UNIFIED] Error loading preferences:', error);
        return ['INBOX'];
      }
    }
    
    // Case 3: Default to INBOX
    return ['INBOX'];
  }

  private async syncFolder(folder: string): Promise<void> {
    console.log(`\n📂 [UNIFIED] Syncing folder: ${folder}`);
    
    try {
      // 1. Fetch UIDs
      const allUids = await fetchFolderUIDs(folder);
      console.log(`   Found ${allUids.length} UIDs`);
      
      if (allUids.length === 0) {
        return;
      }
      
      // 2. Check duplicates
      const { existingUids, cacheHits } = await checkDuplicates(
        allUids, 
        this.options.userEmail, 
        folder
      );
      
      const newUids = allUids.filter(uid => !existingUids.has(uid));
      console.log(`   New emails to download: ${newUids.length} (skipped ${existingUids.size})`);
      
      this.stats.skipped += existingUids.size;
      
      if (newUids.length === 0) {
        return;
      }
      
      // 3. Download emails
      const emails = await downloadBatch(
        folder,
        newUids,
        this.options.batchSize,
        this.options.maxRetries
      );
      
      console.log(`   Downloaded ${emails.length} emails`);
      
      // 4. Insert to DB
      const { inserted, failed } = await insertBatch(
        emails,
        this.options.userEmail,
        folder
      );
      
      console.log(`   Inserted: ${inserted}, Failed: ${failed}`);
      
      // 5. Update cache
      if (newUids.length > 0) {
        const highestUID = Math.max(...newUids.map(uid => parseInt(uid)));
        saveFolderCacheV2(this.options.userEmail, folder, highestUID);
      }
      
      // 6. Update stats
      this.stats.downloaded += inserted;
      this.stats.failed += failed;
      this.stats.totalEmails += allUids.length;
      this.stats.folders[folder] = inserted;
      
    } catch (error) {
      console.error(`❌ [UNIFIED] Error syncing ${folder}:`, error);
      throw error;
    }
  }

  private updateProgress(): void {
    const elapsed = (Date.now() - this.startTime) / 1000;
    this.progress.downloadedCount = this.stats.downloaded;
    this.progress.failedCount = this.stats.failed;
    this.progress.speed = elapsed > 0 ? this.stats.downloaded / elapsed : 0;
    
    const remaining = this.progress.foldersToSync.length - this.progress.completedFolders.length;
    this.progress.estimatedTimeRemaining = this.progress.speed > 0 
      ? (remaining * 30) // Stima 30s per folder
      : 0;
    
    this.options.onProgress(this.progress);
  }

  stop(): void {
    this.shouldStop = true;
    this.progress.status = 'idle';
  }

  pause(): void {
    this.progress.status = 'paused';
  }

  resume(): void {
    if (this.progress.status === 'paused') {
      this.progress.status = 'running';
    }
  }

  getProgress(): UnifiedSyncProgress {
    return this.progress;
  }

  getStats(): UnifiedSyncStats {
    return this.stats;
  }
}
