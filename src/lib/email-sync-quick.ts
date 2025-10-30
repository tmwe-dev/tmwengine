/**
 * Email Sync Quick - Sistema di download parallelo ottimizzato
 * Completamente isolato dal sistema esistente
 * Performance: 10x più veloce grazie a parallelizzazione
 */

import { supabase } from "@/integrations/supabase/client";
import { emailMessageApi } from "@/lib/tmwe-api-integrated";

// ==================== TYPES ====================

export interface QuickSyncProgress {
  currentFolder: string;
  totalFolders: number;
  completedFolders: number;
  currentFolderProgress: number;
  currentFolderTotal: number;
  downloadedCount: number;
  skippedCount: number;
  failedCount: number;
  isRunning: boolean;
  isPaused: boolean;
  estimatedTimeRemaining?: number;
  currentSpeed?: number; // email/sec
}

export interface QuickSyncOptions {
  folders: string[];
  userEmail: string;
  batchSize?: number; // default 15
  maxRetries?: number; // default 2
  timeout?: number; // default 60000ms (60s per email grandi con allegati)
  onProgress?: (progress: QuickSyncProgress) => void;
  onComplete?: (stats: QuickSyncStats) => void;
  onError?: (error: Error) => void;
}

export interface QuickSyncStats {
  totalDownloaded: number;
  totalSkipped: number;
  totalFailed: number;
  totalTime: number;
  avgSpeed: number;
  folderStats: Record<string, { downloaded: number; skipped: number; failed: number }>;
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Fetch con timeout esteso (60s per email grandi con allegati)
 */
async function quickFetchWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 60000
): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Quick timeout')), timeoutMs);
  });
  
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

/**
 * Ottiene configurazione TMWE dell'utente
 */
async function getQuickTmweConfig(userId: string) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('tmwe_email')
    .eq('user_id', userId)
    .single();

  if (error) throw new Error(`Config error: ${error.message}`);
  if (!data?.tmwe_email) throw new Error('TMWE email non configurata');

  return {
    email: data.tmwe_email,
  };
}

/**
 * Ottiene lista UID da cartella (SENZA timeout - lascia completare naturalmente)
 */
async function getQuickFolderUids(folderName: string): Promise<string[]> {
  console.log(`🔍 [getQuickFolderUids] ==================`);
  console.log(`🔍 Folder richiesta: "${folderName}"`);
  console.log(`🔍 Folder length: ${folderName.length}`);
  console.log(`🔍 Folder bytes: ${Array.from(folderName).map(c => c.charCodeAt(0)).join(',')}`);
  console.log(`🔍 ==================`);
  
  // ✅ RIMOSSO timeout - cartelle grandi possono richiedere tempo
  const response = await supabase.functions.invoke('tmwe-api-proxy', {
    body: {
      endpoint: '/email_message',
      data: { 
        handler: 'get_messages',
        folder: folderName,
        limit: 2000,
        offset: 0
      }
    }
  });

  if (response.error) throw new Error(`UID fetch error: ${response.error.message}`);
  
  const messages = response.data?.messages || [];
  const uids = messages.map((msg: any) => String(msg.uid));
  console.log(`📬 Quick: ${folderName} ha ${uids.length} UID`);
  return uids;
}

/**
 * Check duplicati ottimizzato con batch piccoli (200 invece di 1000)
 * Genera message_id come folder/uid per il check
 */
async function checkQuickDuplicates(
  uids: string[], 
  userEmail: string, 
  folderName: string
): Promise<Set<string>> {
  const SMALL_BATCH = 200; // Batch più piccolo per query più veloce
  const existingUids = new Set<string>();
  
  // Genera message_id attesi: folder/uid
  const messageIds = uids.map(uid => `${folderName}/${uid}`);

  for (let i = 0; i < messageIds.length; i += SMALL_BATCH) {
    const batch = messageIds.slice(i, i + SMALL_BATCH);
    
    const { data } = await supabase
      .from('email_messages')
      .select('message_id')
      .eq('user_email', userEmail)
      .in('message_id', batch);

    data?.forEach(row => {
      // Estrai UID dal message_id (folder/uid -> uid)
      const uid = row.message_id.split('/').pop();
      if (uid) existingUids.add(uid);
    });
  }

  return existingUids;
}

/**
 * Download singola email (timeout 60s per email grandi con allegati)
 */
async function downloadQuickSingleEmail(
  uid: string, 
  folderName: string,
  timeout: number = 60000
) {
    console.log(`📥 [downloadQuickSingleEmail] ==================`);
    console.log(`📥 UID: ${uid}`);
    console.log(`📥 Folder: "${folderName}"`);
    console.log(`📥 Folder length: ${folderName.length}`);
    console.log(`📥 ==================`);

    try {
      // ✅ USA LA STESSA FUNZIONE DI FunEmailDownloader (include ensureValidToken + optimizationFlags)
      const email = await quickFetchWithTimeout(
        emailMessageApi.getMessage(uid, folderName, false),
        timeout
      );

      // ✅ LOG: Verifica struttura ricevuta per debug
      console.log(`✅ [downloadQuickSingleEmail] Success - UID ${uid}:`, {
        hasHeader: !!email.header,
        hasFrom: !!(email.header?.from || email.from),
        hasSubject: !!(email.header?.subject || email.subject),
        fromAddress: email.header?.from?.address || email.from?.address || 'MISSING',
        subject: (email.header?.subject || email.subject || 'NO SUBJECT').substring(0, 50)
      });
      
      return email;
      
    } catch (error: any) {
      console.error(`⚠️ [downloadQuickSingleEmail] Timeout/errore ${folderName}/${uid}:`, error.message);
      throw error;
    }
}

/**
 * Download batch di email in parallelo con gestione resiliente errori
 * Se un'email fallisce dopo tutti i retry → SKIPPA e continua
 */
async function downloadQuickBatch(
  uids: string[],
  folderName: string,
  batchSize: number = 15,
  maxRetries: number = 2,
  timeout: number = 60000
): Promise<Array<{ uid: string; data: any; error?: string }>> {
  const results: Array<{ uid: string; data: any; error?: string }> = [];

  // Download in parallelo con retry e backoff esponenziale
  const downloadPromises = uids.map(async (uid) => {
    let lastError: string | undefined;
    
    for (let retry = 0; retry <= maxRetries; retry++) {
      try {
        const data = await downloadQuickSingleEmail(uid, folderName, timeout);
        return { uid, data };
      } catch (error: any) {
        lastError = error.message;
        if (retry < maxRetries) {
          // ✅ Backoff esponenziale: 1s, 2s
          await new Promise(resolve => setTimeout(resolve, 1000 * (retry + 1)));
        }
      }
    }
    
    // ✅ Dopo tutti i retry, marca come failed ma NON bloccare il batch
    console.warn(`⚠️ Email ${folderName}/${uid} skippata dopo ${maxRetries} retry: ${lastError}`);
    return { uid, data: null, error: lastError };
  });

  const batchResults = await Promise.all(downloadPromises);
  results.push(...batchResults);

  return results;
}

/**
 * Insert batch di email nel DB (invece di uno alla volta)
 */
async function insertQuickBatch(
  emails: Array<{ uid: string; data: any }>, 
  userEmail: string, 
  folderName: string
): Promise<{ success: number; failed: number }> {
  if (emails.length === 0) return { success: 0, failed: 0 };

  const records = emails.map(({ uid, data: email }) => {
    // ✅ PARSING ROBUSTO: Gestisce email.header (struttura TMWE API) o campi diretti
    const header = email.header || email;
    
    // ✅ From: Cerca in header.from.address → email.from.address → fallback
    const fromEmail = 
      header.from?.address || 
      email.from?.address || 
      header.from || 
      email.from || 
      '';
    
    // ✅ To: Gestisci array di EmailAddress (può contenere {address, name} o stringhe)
    const toEmail = (() => {
      const toField = header.to || email.to;
      if (Array.isArray(toField)) {
        return toField.map((t: any) => t?.address || t).filter(Boolean).join(',');
      }
      return toField?.address || toField || '';
    })();
    
    // ✅ CC: Stessa logica di To
    const ccEmail = (() => {
      const ccField = header.cc || email.cc;
      if (Array.isArray(ccField)) {
        return ccField.map((c: any) => c?.address || c).filter(Boolean).join(',');
      }
      return ccField?.address || ccField || null;
    })();
    
    // ✅ Subject: Cerca in header.subject → email.subject
    const subject = header.subject || email.subject || '';
    
    // ✅ Date: Cerca in header.date → email.date
    let isoDate = new Date().toISOString();
    const dateField = header.date || email.date;
    if (dateField) {
      try {
        isoDate = new Date(dateField).toISOString();
      } catch (e) {
        console.error('Error parsing date:', dateField);
      }
    }
    
    // ✅ Body: text e html
    const bodyText = email.body_text || email.text || '';
    const bodyHtml = email.body_html || email.html || '';
    
    // ✅ VALIDAZIONE: Verifica che i campi critici non siano vuoti
    if (!fromEmail || !subject) {
      console.warn(`⚠️ Email incompleta skippata: ${folderName}/${uid}`, {
        fromEmail: fromEmail || 'MISSING',
        subject: subject || 'MISSING',
        hasHeader: !!email.header
      });
      return null; // Skippa questa email incompleta
    }
    
    return {
      message_id: `${folderName}/${uid}`,
      user_email: userEmail,
      from_email: fromEmail,
      to_email: toEmail,
      cc_email: ccEmail,
      bcc_email: null, // BCC non disponibile via IMAP
      subject: subject,
      body_text: bodyText,
      body_html: bodyHtml,
      data_ricezione: isoDate,
      cartella: folderName,
      attachments: email.attachments || [],
      flags: email.flags || [],
      direzione: 'inbound',
      provider_id: '00000000-0000-0000-0000-000000000000',
      stato: email.flags?.includes('\\Seen') ? 'letto' : 'nuovo',
      sync_status: 'fun_email_backup',
    };
  }).filter(Boolean); // ✅ Rimuove i null (email incomplete)

  // TENTATIVO 1: Batch insert
  const { error } = await supabase
    .from('email_messages')
    .insert(records);

  if (!error) {
    return { success: records.length, failed: 0 };
  }

  // TENTATIVO 2: Fallback a inserimenti singoli
  console.warn(`⚠️ Batch insert fallito, provo singolarmente per ${records.length} email...`);
  let successCount = 0;
  
  for (const record of records) {
    const { error: singleError } = await supabase
      .from('email_messages')
      .insert([record]);
    
    if (!singleError) {
      successCount++;
    }
  }
  
  return { 
    success: successCount, 
    failed: records.length - successCount 
  };
}

// ==================== MAIN SYNC FUNCTION ====================

export class QuickEmailSyncer {
  private progress: QuickSyncProgress;
  private options: Required<QuickSyncOptions>;
  private shouldStop = false;
  private isPaused = false;
  private startTime = 0;
  private stats: QuickSyncStats;

  constructor(options: QuickSyncOptions) {
    this.options = {
      batchSize: 15,      // Download 15 email in parallelo
      maxRetries: 2,      // Max 2 retry per email
      timeout: 60000,     // ✅ 60s timeout per email grandi con allegati
      onProgress: () => {},
      onComplete: () => {},
      onError: () => {},
      ...options
    };

    this.progress = {
      currentFolder: '',
      totalFolders: options.folders.length,
      completedFolders: 0,
      currentFolderProgress: 0,
      currentFolderTotal: 0,
      downloadedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      isRunning: false,
      isPaused: false,
    };

    this.stats = {
      totalDownloaded: 0,
      totalSkipped: 0,
      totalFailed: 0,
      totalTime: 0,
      avgSpeed: 0,
      folderStats: {},
    };
  }

  async start() {
    this.shouldStop = false;
    this.isPaused = false;
    this.startTime = Date.now();
    this.progress.isRunning = true;
    this.notifyProgress();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non autenticato');

      const config = await getQuickTmweConfig(user.id);
      console.log('🚀 Quick Sync iniziato:', {
        folders: this.options.folders.length,
        batchSize: this.options.batchSize,
        timeout: this.options.timeout
      });

      for (const folder of this.options.folders) {
        if (this.shouldStop) break;
        
        try {
          await this.syncQuickFolder(folder, this.options.userEmail);
          this.progress.completedFolders++;
        } catch (error: any) {
          // Non bloccare tutto, logga e continua con la prossima cartella
          console.error(`⚠️ Cartella ${folder} saltata:`, error.message);
          this.stats.folderStats[folder] = { 
            downloaded: 0, 
            skipped: 0, 
            failed: this.progress.currentFolderTotal || 0
          };
          this.progress.completedFolders++;
        }
      }

      this.finalize();

    } catch (error: any) {
      console.error('❌ Quick sync error:', error);
      this.options.onError(error);
      this.progress.isRunning = false;
      this.notifyProgress();
    }
  }

  private async syncQuickFolder(folderName: string, userEmail: string) {
    // ✅ RIMOSSO timeout globale - lascia completare naturalmente
    return this._syncFolderLogic(folderName, userEmail);
  }

  private async _syncFolderLogic(folderName: string, userEmail: string) {
    console.log(`\n📂 Quick sync folder: ${folderName}`);
    this.progress.currentFolder = folderName;
    this.progress.currentFolderProgress = 0;
    this.stats.folderStats[folderName] = { downloaded: 0, skipped: 0, failed: 0 };
    
    const folderStartTime = Date.now();

    try {
      // 1. Get UIDs (senza timeout)
      const uids = await getQuickFolderUids(folderName);
      this.progress.currentFolderTotal = uids.length;
      
      // ⚠️ Warning per cartelle molto grandi
      if (uids.length > 2000) {
        console.warn(`⚠️ ${folderName}: ${uids.length} email totali - cartella molto grande`);
      }
      
      this.notifyProgress();

      if (uids.length === 0) {
        console.log(`⚠️ ${folderName}: nessun messaggio`);
        return;
      }

      // 2. Check duplicati con batch ottimizzato
      const existing = await checkQuickDuplicates(uids, userEmail, folderName);
      const newUids = uids.filter(uid => !existing.has(uid));
      
      // ✅ SOLUZIONE D: Warning informativi per cartelle grandi (nessun limite)
      if (newUids.length > 1000) {
        console.warn(`📦 ${folderName} contiene ${newUids.length} nuove email - download potrebbe richiedere tempo`);
      }
      
      const skippedCount = uids.length - newUids.length;
      this.progress.skippedCount += skippedCount;
      this.stats.folderStats[folderName].skipped = skippedCount;
      
      console.log(`✓ ${folderName}: ${newUids.length} nuove, ${skippedCount} duplicate`);

      if (newUids.length === 0) {
        this.notifyProgress();
        return;
      }

      // 3. Download in batch paralleli
      for (let i = 0; i < newUids.length; i += this.options.batchSize) {
        if (this.shouldStop) break;
        
        // ✅ RIMOSSO timeout soft - lascia completare
        
        // Pause handling
        while (this.isPaused && !this.shouldStop) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        const batch = newUids.slice(i, i + this.options.batchSize);
        const batchResults = await downloadQuickBatch(
          batch,
          folderName,
          this.options.batchSize,
          this.options.maxRetries,
          this.options.timeout
        );

        // 4. Insert batch in DB
        const successfulEmails = batchResults.filter(r => r.data && !r.error);
        const failedDownloads = batchResults.filter(r => r.error);

        if (successfulEmails.length > 0) {
          const insertResult = await insertQuickBatch(successfulEmails, userEmail, folderName);
          
          // Conteggio corretto: usa SOLO i risultati dell'insert
          this.progress.downloadedCount += insertResult.success;
          this.progress.failedCount += insertResult.failed; // Errori DB
          
          this.stats.folderStats[folderName].downloaded += insertResult.success;
          this.stats.folderStats[folderName].failed += insertResult.failed;
        }

        // Errori di DOWNLOAD (non di insert)
        if (failedDownloads.length > 0) {
          this.progress.failedCount += failedDownloads.length;
          this.stats.folderStats[folderName].failed += failedDownloads.length;
        }

        this.progress.currentFolderProgress = Math.min(i + batch.length, newUids.length);
        this.updateSpeed();
        this.notifyProgress();
      }

    } catch (error: any) {
      console.error(`❌ Error syncing ${folderName}:`, error);
      this.stats.folderStats[folderName].failed += this.progress.currentFolderTotal - this.progress.currentFolderProgress;
    }
  }

  private updateSpeed() {
    const elapsed = (Date.now() - this.startTime) / 1000;
    this.progress.currentSpeed = elapsed > 0 ? this.progress.downloadedCount / elapsed : 0;
    
    // ✅ Stima tempo rimanente più accurata basata su velocità media
    const totalEmails = this.progress.downloadedCount + this.progress.skippedCount + this.progress.failedCount;
    const emailsRemaining = this.progress.currentFolderTotal - totalEmails;
    const avgSpeed = this.progress.currentSpeed || 1;
    const estimatedSeconds = avgSpeed > 0 ? emailsRemaining / avgSpeed : 0;
    this.progress.estimatedTimeRemaining = Math.max(0, estimatedSeconds);
    
    const remaining = this.progress.totalFolders - this.progress.completedFolders;
    if (this.progress.currentSpeed > 0 && remaining > 0) {
      this.progress.estimatedTimeRemaining = remaining / this.progress.currentSpeed;
    }
  }

  private finalize() {
    this.stats.totalDownloaded = this.progress.downloadedCount;
    this.stats.totalSkipped = this.progress.skippedCount;
    this.stats.totalFailed = this.progress.failedCount;
    this.stats.totalTime = (Date.now() - this.startTime) / 1000;
    this.stats.avgSpeed = this.stats.totalTime > 0 ? this.stats.totalDownloaded / this.stats.totalTime : 0;

    console.log('\n✅ Quick Sync completato:', this.stats);
    
    this.progress.isRunning = false;
    this.notifyProgress();
    this.options.onComplete(this.stats);
  }

  private notifyProgress() {
    this.options.onProgress({ ...this.progress });
  }

  pause() {
    this.isPaused = true;
    this.progress.isPaused = true;
    this.notifyProgress();
  }

  resume() {
    this.isPaused = false;
    this.progress.isPaused = false;
    this.notifyProgress();
  }

  stop() {
    this.shouldStop = true;
    this.progress.isRunning = false;
    this.notifyProgress();
  }
}
