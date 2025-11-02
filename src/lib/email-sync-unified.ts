/**
 * Email Sync Unified - CLONE DEBUGGER VERSION
 * Logica semplificata: clona esattamente il codice funzionante del TmweBackendDebugger
 * Nessuna cache complessa, nessun batch seriale, solo download diretto e inserimento
 */

import { supabase } from '@/integrations/supabase/client';
import { getSyncPreferences, filterFolders, type EmailFolder } from './email-sync-preferences';
import { emailFolderApi } from './tmwe-api-integrated';

// ==================== TYPES ====================

export interface UnifiedSyncProgress {
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  currentFolder: string;
  foldersToSync: string[];
  completedFolders: string[];
  totalEmails: number;
  downloadedEmails: number;
  skippedEmails: number;
  failedEmails: number;
  currentSpeed: number;
  avgSpeed: number;
  eta: number;
  startTime: number;
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
}

// ==================== EMAIL SYNC UNIFIED CLASS ====================

export class EmailSyncUnified {
  private userEmail: string;
  private folders?: string[];
  private applyPreferences: boolean;
  private onProgress?: (progress: UnifiedSyncProgress) => void;
  private onComplete?: (stats: UnifiedSyncStats) => void;
  private onError?: (error: Error) => void;

  private progress: UnifiedSyncProgress;
  private startTime: number = 0;
  private isPaused: boolean = false;
  private isStopped: boolean = false;

  constructor(options: UnifiedSyncOptions) {
    this.userEmail = options.userEmail;
    this.folders = options.folders;
    this.applyPreferences = options.applyPreferences ?? false;
    this.onProgress = options.onProgress;
    this.onComplete = options.onComplete;
    this.onError = options.onError;

    this.progress = {
      status: 'idle',
      currentFolder: '',
      foldersToSync: [],
      completedFolders: [],
      totalEmails: 0,
      downloadedEmails: 0,
      skippedEmails: 0,
      failedEmails: 0,
      currentSpeed: 0,
      avgSpeed: 0,
      eta: 0,
      startTime: 0,
      downloadedCount: 0,
      failedCount: 0,
      speed: 0,
      estimatedTimeRemaining: 0
    };
  }

  // ==================== MAIN METHODS ====================

  async start(): Promise<UnifiedSyncStats> {
    try {
      this.startTime = Date.now();
      this.progress.status = 'running';
      this.progress.startTime = this.startTime;

      console.log('🚀 [EmailSyncUnified] START');
      console.log('   User:', this.userEmail);
      console.log('   Folders:', this.folders);
      console.log('   Apply Preferences:', this.applyPreferences);

      // STEP 1: Load folders to sync
      const foldersToSync = await this.loadFolders();
      this.progress.foldersToSync = foldersToSync;
      this.updateProgress();

      console.log('📂 [EmailSyncUnified] Folders to sync:', foldersToSync);

      // STEP 2: Sync each folder
      for (const folder of foldersToSync) {
        if (this.isStopped) break;
        
        this.progress.currentFolder = folder;
        this.updateProgress();

        await this.syncFolder(folder);
        
        this.progress.completedFolders.push(folder);
        this.updateProgress();
      }

      // STEP 3: Complete
      const stats: UnifiedSyncStats = {
        totalEmails: this.progress.totalEmails,
        downloaded: this.progress.downloadedEmails,
        skipped: this.progress.skippedEmails,
        failed: this.progress.failedEmails,
        duration: (Date.now() - this.startTime) / 1000,
        avgSpeed: this.progress.downloadedEmails / ((Date.now() - this.startTime) / 1000)
      };

      this.progress.status = 'completed';
      this.updateProgress();
      this.onComplete?.(stats);

      return stats;

    } catch (error: any) {
      console.error('❌ [EmailSyncUnified] Fatal error:', error);
      this.progress.status = 'error';
      this.updateProgress();
      this.onError?.(error);
      throw error;
    }
  }

  // ==================== FOLDER LOADING ====================

  private async loadFolders(): Promise<string[]> {
    if (this.folders && this.folders.length > 0) {
      console.log('📂 Using explicit folders:', this.folders);
      return this.folders;
    }

    if (this.applyPreferences) {
      console.log('🎯 Loading folders from preferences...');
      
      try {
        // 1. Get user preferences
        const preferences = await getSyncPreferences(this.userEmail);
        console.log('📁 User preferences:', {
          excluded_count: preferences.excluded_folders.length,
          included_count: preferences.included_folders.length,
          excluded: preferences.excluded_folders,
          included: preferences.included_folders
        });
        
        // 2. Get all folders from server
        const response = await emailFolderApi.getFolders({ include_counts: false, skipCache: true });
        const allFolders = Array.isArray(response) 
          ? response.map(f => ({ name: f.name || f, ...f }))
          : (response?.data || response?.folders || []).map(f => ({ name: f.name || f, ...f }));
        
        console.log('📁 All server folders:', allFolders.map(f => f.name));
        
        // 3. Filter based on preferences
        const filtered = filterFolders(allFolders, preferences);
        const folderNames = filtered.map(f => f.name);
        
        console.log('📁 Filtered by preferences:', folderNames);
        
        if (folderNames.length === 0) {
          console.warn('⚠️ No folders after filtering, defaulting to INBOX');
          return ['INBOX'];
        }
        
        return folderNames;
        
      } catch (error) {
        console.error('❌ Error loading preferences:', error);
        return ['INBOX'];
      }
    }

    console.log('📂 No folders specified, defaulting to INBOX');
    return ['INBOX'];
  }

  // ==================== FOLDER SYNC ====================

  private async syncFolder(folder: string): Promise<void> {
    console.log(`📂 [EmailSyncUnified] Syncing folder: ${folder}`);

    try {
      // STEP 1: Fetch UIDs from TMWE (CLONE DEBUGGER)
      const uids = await this.fetchFolderUIDs(folder);
      console.log(`   Found ${uids.length} UIDs`);

      if (uids.length === 0) {
        console.log('   No UIDs found, skipping');
        return;
      }

      this.progress.totalEmails += uids.length;
      this.updateProgress();

      // STEP 2: Check existing message_ids in DB
      const messageIds = uids.map(uid => `${folder}/${uid}`);
      const { data: existingEmails } = await supabase
        .from('email_messages')
        .select('message_id')
        .eq('user_email', this.userEmail)
        .in('message_id', messageIds);

      const existingUids = new Set(
        (existingEmails || []).map(e => e.message_id?.split('/')[1]).filter(Boolean)
      );

      console.log(`   Already in DB: ${existingUids.size}`);

      // STEP 3: Download and insert new emails
      for (const uid of uids) {
        if (this.isStopped) break;
        
        // Wait if paused
        while (this.isPaused && !this.isStopped) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (existingUids.has(uid)) {
          this.progress.skippedEmails++;
          this.updateProgress();
          continue;
        }

        try {
          console.log(`📥 [EmailSyncUnified] Downloading UID ${uid} from ${folder}`);
          
          // Download email (CLONE DEBUGGER)
          const email = await this.downloadEmail(uid, folder);
          
          console.log(`📧 [EmailSyncUnified] Downloaded UID ${uid}:`, {
            hasData: !!email,
            uid: email?.uid,
            subject: email?.subject?.substring(0, 50)
          });
          
          if (email && email.uid) {
            try {
              // Insert into DB
              await this.insertEmail(email, folder);
              this.progress.downloadedEmails++;
              console.log(`✅ [EmailSyncUnified] Inserted UID ${uid}`);
            } catch (insertError: any) {
              console.error(`❌ [EmailSyncUnified] Insert failed for UID ${uid}:`, insertError);
              this.progress.failedEmails++;
            }
          } else {
            console.warn(`⚠️ [EmailSyncUnified] Invalid email data for UID ${uid}`);
            this.progress.failedEmails++;
          }

        } catch (error: any) {
          console.error(`❌ Failed to download UID ${uid}:`, error);
          this.progress.failedEmails++;
        }

        this.updateProgress();
      }

    } catch (error: any) {
      console.error(`❌ [EmailSyncUnified] Error syncing folder ${folder}:`, error);
      throw error;
    }
  }

  // ==================== API METHODS (CLONE DEBUGGER) ====================

  private async ensureValidSession(): Promise<void> {
    // 🔐 STEP 1: Verifica sessione (IDENTICO AL DEBUGGER)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('🔐 [EmailSyncUnified] Session error:', sessionError);
      throw new Error('TMWE_SESSION_EXPIRED');
    }

    // 🔐 STEP 2: Check token expiry (IDENTICO AL DEBUGGER)
    const expiresAt = session.expires_at || 0;
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = expiresAt - now;

    console.log('🔐 [EmailSyncUnified] Token status:', {
      expiresAt: new Date(expiresAt * 1000).toLocaleString(),
      timeUntilExpiry: `${Math.floor(timeUntilExpiry / 60)} minuti`,
      needsRefresh: timeUntilExpiry < 300
    });

    // 🔐 STEP 3: Refresh se necessario (IDENTICO AL DEBUGGER)
    if (timeUntilExpiry < 300) {
      console.log('🔄 [EmailSyncUnified] Refreshing token...');
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.error('❌ [EmailSyncUnified] Token refresh failed:', refreshError);
        throw new Error('TMWE_SESSION_EXPIRED');
      }
    }
  }

  private async fetchFolderUIDs(folder: string): Promise<string[]> {
    await this.ensureValidSession();

    console.log(`📧 [EmailSyncUnified] Fetching UIDs for: ${folder}`);

    // 🧪 Chiama API (IDENTICO AL DEBUGGER)
    const { data, error } = await supabase.functions.invoke('tmwe-api-proxy', {
      body: {
        endpoint: '/email_message',
        data: {
          handler: 'get_messages',
          folder,
          limit: 999999,
          offset: 0
        }
      }
    });

    if (error) {
      console.error('❌ [EmailSyncUnified] Edge function error:', error);
      throw new Error('TMWE_SESSION_EXPIRED');
    }

    if (data && !data.success) {
      console.warn('⚠️ [EmailSyncUnified] TMWE API error:', data.errors);
      return [];
    }

    console.log(`📧 [EmailSyncUnified] Response for ${folder}:`, {
      success: data?.success,
      dataLength: data?.data?.length || 0,
      firstUID: data?.data?.[0]?.uid
    });

    const uids: string[] = data?.data?.map((msg: any) => msg.uid?.toString() || '') || [];
    return uids.filter(uid => Boolean(uid));
  }

  private async downloadEmail(uid: string, folder: string): Promise<any> {
    await this.ensureValidSession();

    // 🧪 Chiama API (IDENTICO AL DEBUGGER testGetMessage)
    const { data, error } = await supabase.functions.invoke('tmwe-api-proxy', {
      body: {
        endpoint: '/email_message',
        data: {
          handler: 'get_message',
          uid,
          folder
        }
      }
    });

    console.log(`📧 [EmailSyncUnified] API Response for UID ${uid}:`, {
      hasError: !!error,
      success: data?.success,
      hasData: !!data?.data,
      dataKeys: data?.data ? Object.keys(data.data) : []
    });

    if (error || !data?.success) {
      console.error(`❌ Failed to download UID ${uid}:`, error || data?.errors);
      return null;
    }

    return data.data;
  }

  // ==================== DATABASE METHODS ====================

  private async insertEmail(email: any, folder: string): Promise<void> {
    const emailData = {
      user_email: this.userEmail,
      message_id: `${folder}/${email.uid}`,
      cartella: folder,
      subject: email.subject || '',
      from_email: email.from?.email || email.from || '',
      to_email: email.to?.[0]?.email || (Array.isArray(email.to) && email.to.length > 0 ? email.to[0] : email.to) || '',
      cc_email: email.cc ? (Array.isArray(email.cc) ? email.cc.map((c: any) => c.email || c).join(', ') : email.cc) : null,
      bcc_email: email.bcc ? (Array.isArray(email.bcc) ? email.bcc.map((b: any) => b.email || b).join(', ') : email.bcc) : null,
      data_ricezione: email.date || new Date().toISOString(),
      body_html: email.body_type === 'html' ? email.body : null,
      body_text: email.body_type === 'plain' ? email.body : email.preview || '',
      attachments: email.attachments ? JSON.stringify(email.attachments) : null,
      flags: email.flags ? JSON.stringify(email.flags) : null,
      sync_status: 'fun_email_backup',
      direzione: 'ricevuto',
      provider_id: 'tmwe',
      stato: 'ricevuto'
    };

    const { error } = await supabase
      .from('email_messages')
      .insert([emailData]);

    if (error) {
      console.error('❌ Insert error:', error);
      throw error;
    }
  }

  // ==================== PROGRESS & CONTROL ====================

  private updateProgress(): void {
    const elapsed = (Date.now() - this.startTime) / 1000;
    this.progress.currentSpeed = elapsed > 0 ? this.progress.downloadedEmails / elapsed : 0;
    this.progress.avgSpeed = this.progress.currentSpeed;
    
    const remaining = this.progress.totalEmails - this.progress.downloadedEmails - this.progress.skippedEmails;
    this.progress.eta = this.progress.currentSpeed > 0 ? remaining / this.progress.currentSpeed : 0;

    // Maintain backward compatibility with old property names
    this.progress.downloadedCount = this.progress.downloadedEmails;
    this.progress.failedCount = this.progress.failedEmails;
    this.progress.speed = this.progress.currentSpeed;
    this.progress.estimatedTimeRemaining = this.progress.eta;

    this.onProgress?.(this.progress);
  }

  pause(): void {
    this.isPaused = true;
    this.progress.status = 'paused';
    this.updateProgress();
  }

  resume(): void {
    this.isPaused = false;
    this.progress.status = 'running';
    this.updateProgress();
  }

  stop(): void {
    this.isStopped = true;
    this.progress.status = 'completed';
    this.updateProgress();
  }

  getProgress(): UnifiedSyncProgress {
    return this.progress;
  }

  getStats(): UnifiedSyncStats {
    return {
      totalEmails: this.progress.totalEmails,
      downloaded: this.progress.downloadedEmails,
      skipped: this.progress.skippedEmails,
      failed: this.progress.failedEmails,
      duration: (Date.now() - this.startTime) / 1000,
      avgSpeed: this.progress.avgSpeed
    };
  }
}
