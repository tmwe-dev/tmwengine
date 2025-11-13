/**
 * MASTER EMAIL DOWNLOAD - Standalone Solution
 * 
 * Funzione completa autocontenuta per download email con sequenza automatica:
 * 1. Luca Method: Download incrementale da MAX+1
 * 2. Clean Method: Riempie buchi trovati nel DB
 * 
 * Zero dipendenze esterne - tutto inline per massima chiarezza
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// SECTION 1: TYPES & CONFIG (50 righe)
// ============================================================================

interface MasterConfig {
  batch_size: number;
  max_concurrent: number;
  max_empty_batches: number;
  min_delay_ms: number;
}

export interface MasterProgress {
  phase: 'luca' | 'clean' | 'completed';
  current_folder: string;
  current_batch: number;
  imported: number;
  total: number;
  errors: number;
  gaps_found?: number;
}

export interface MasterResult {
  luca_downloaded: number;
  clean_filled: number;
  total_errors: number;
  folders_processed: string[];
}

interface NormalizedEmail {
  from_email: string;
  to_email: string;
  subject: string;
  body_text: string;
  body_html: string;
  date: string;
  attachments: any[];
  cc_email: string[];
  bcc_email: string[];
  in_reply_to: string | null;
  email_references: string[];
}

// ✅ Configurazione ottimale testata
const OPTIMAL_CONFIG: MasterConfig = {
  batch_size: 25,
  max_concurrent: 3,
  max_empty_batches: 3,
  min_delay_ms: 100
};

// ============================================================================
// SECTION 2: API COMMUNICATION (150 righe)
// ============================================================================

/**
 * Fetch lista cartelle disponibili via API
 */
async function fetchFolderList(userEmail: string): Promise<string[]> {
  try {
    const { data, error } = await supabase.functions.invoke('tmwe-api-proxy', {
      body: {
        action: 'list_folders',
        email: userEmail
      }
    });

    if (error) throw error;
    
    return data?.folders || ['INBOX', 'Sent', 'Drafts', 'Trash', 'Junk'];
  } catch (error) {
    console.error('[fetchFolderList] Error:', error);
    return ['INBOX', 'Sent', 'Drafts', 'Trash', 'Junk'];
  }
}

/**
 * Fetch batch di email da API TMWE
 */
async function fetchEmailBatch(
  folder: string,
  startUID: number,
  batchSize: number,
  userEmail: string
): Promise<any[]> {
  try {
    const { data, error } = await supabase.functions.invoke('tmwe-api-proxy', {
      body: {
        action: 'fetch_emails',
        email: userEmail,
        folder: folder,
        start_uid: startUID,
        batch_size: batchSize
      }
    });

    if (error) {
      console.error('[fetchEmailBatch] Error:', error);
      return [];
    }

    return data?.emails || [];
  } catch (error) {
    console.error('[fetchEmailBatch] Exception:', error);
    return [];
  }
}

/**
 * Parse risposta API → Email normalizzata
 */
function parseEmailResponse(raw: any): NormalizedEmail {
  // Estrai informazioni base
  const from = raw.from || raw.From || '';
  const to = raw.to || raw.To || '';
  const subject = raw.subject || raw.Subject || '(No Subject)';
  
  // Body text/html
  let bodyText = '';
  let bodyHtml = '';
  
  if (raw.body) {
    if (typeof raw.body === 'string') {
      bodyText = raw.body;
    } else if (raw.body.text) {
      bodyText = raw.body.text;
    }
    if (raw.body.html) {
      bodyHtml = raw.body.html;
    }
  }

  // Date parsing
  let dateStr = new Date().toISOString();
  if (raw.date || raw.Date) {
    try {
      dateStr = new Date(raw.date || raw.Date).toISOString();
    } catch (e) {
      console.warn('[parseEmailResponse] Invalid date:', raw.date);
    }
  }

  // CC/BCC
  const cc = Array.isArray(raw.cc) ? raw.cc : (raw.cc ? [raw.cc] : []);
  const bcc = Array.isArray(raw.bcc) ? raw.bcc : (raw.bcc ? [raw.bcc] : []);

  // Attachments
  const attachments = Array.isArray(raw.attachments) ? raw.attachments : [];

  // References
  const inReplyTo = raw.in_reply_to || raw['In-Reply-To'] || null;
  const references = raw.references || raw.References || [];
  const emailReferences = Array.isArray(references) ? references : (references ? [references] : []);

  return {
    from_email: from,
    to_email: to,
    subject: subject,
    body_text: bodyText,
    body_html: bodyHtml,
    date: dateStr,
    attachments: attachments,
    cc_email: cc,
    bcc_email: bcc,
    in_reply_to: inReplyTo,
    email_references: emailReferences
  };
}

/**
 * Retry logic per chiamate API
 */
async function apiCallWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(`[apiCallWithRetry] Attempt ${attempt}/${maxRetries} failed:`, error);
      
      if (attempt < maxRetries) {
        await delay(1000 * attempt); // Exponential backoff
      }
    }
  }
  
  throw lastError;
}

// ============================================================================
// SECTION 3: DATABASE OPERATIONS (120 righe)
// ============================================================================

/**
 * ✅ Trova MAX UID numerico per cartella (fix testato)
 */
async function getMaxUIDNumeric(
  folder: string,
  userEmail: string
): Promise<number | null> {
  const { data, error } = await supabase
    .from('email_messages')
    .select('message_id')
    .eq('cartella', folder)
    .eq('user_email', userEmail);

  if (error || !data || data.length === 0) {
    return null;
  }

  // Extract all UIDs and parse numerically
  const uids = data
    .map((row: any) => {
      const parts = row.message_id.split('/');
      return parseInt(parts[1], 10);
    })
    .filter(uid => !isNaN(uid));

  if (uids.length === 0) {
    return null;
  }

  // ✅ MAX numeric (not string!)
  return Math.max(...uids);
}

/**
 * Check se email esiste già in DB
 */
async function emailExists(
  messageId: string,
  userEmail: string
): Promise<boolean> {
  const { data } = await supabase
    .from('email_messages')
    .select('id')
    .eq('message_id', messageId)
    .eq('user_email', userEmail)
    .maybeSingle();
  
  return Boolean(data);
}

/**
 * Salva email nel database
 */
async function saveEmailToDB(
  email: NormalizedEmail,
  messageId: string,
  folder: string,
  userEmail: string
): Promise<boolean> {
  try {
    // Check duplicati
    const exists = await emailExists(messageId, userEmail);
    if (exists) {
      return false; // Già presente
    }

    const { error } = await supabase
      .from('email_messages')
      .insert({
        message_id: messageId,
        user_email: userEmail,
        from_email: email.from_email,
        to_email: email.to_email,
        subject: email.subject,
        body_text: email.body_text,
        body_html: email.body_html,
        data_invio: email.date,
        data_ricezione: new Date().toISOString(),
        cartella: folder,
        stato: 'nuovo',
        direzione: 'inbound',
        provider_id: '00000000-0000-0000-0000-000000000000',
        attachments: email.attachments as any,
        cc_email: email.cc_email as any,
        bcc_email: email.bcc_email as any,
        in_reply_to: email.in_reply_to,
        email_references: email.email_references as any,
      });
    
    if (error) {
      console.error('[saveEmailToDB] Error:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[saveEmailToDB] Exception:', error);
    return false;
  }
}

/**
 * Trova UIDs mancanti in una cartella
 */
async function findMissingUIDs(
  folder: string,
  userEmail: string
): Promise<number[]> {
  // 1. Trova MIN e MAX UID
  const { data, error } = await supabase
    .from('email_messages')
    .select('message_id')
    .eq('cartella', folder)
    .eq('user_email', userEmail);

  if (error || !data || data.length === 0) {
    return [];
  }

  // 2. Parse tutti gli UIDs numerici
  const uids = data
    .map((row: any) => {
      const parts = row.message_id.split('/');
      return parseInt(parts[1], 10);
    })
    .filter(uid => !isNaN(uid));

  if (uids.length === 0) {
    return [];
  }

  const minUID = Math.min(...uids);
  const maxUID = Math.max(...uids);

  // 3. Genera range completo e trova mancanti
  const fullRange = Array.from(
    { length: maxUID - minUID + 1 },
    (_, i) => minUID + i
  );

  const uidSet = new Set(uids);
  const missing = fullRange.filter(uid => !uidSet.has(uid));

  return missing;
}

// ============================================================================
// SECTION 4: PHASE 1 - LUCA LOGIC (150 righe)
// ============================================================================

/**
 * FASE 1: Luca Method
 * Download incrementale da MAX UID + 1, batch per batch
 */
async function executeLucaPhase(
  folders: string[],
  userEmail: string,
  config: MasterConfig,
  onProgress: (progress: MasterProgress) => void,
  onLog: (message: string) => void,
  shouldStop: () => boolean
): Promise<{ downloaded: number; errors: number }> {
  
  let totalDownloaded = 0;
  let totalErrors = 0;

  for (const folder of folders) {
    if (shouldStop()) break;

    onLog(`📁 Luca Phase: Processing ${folder}`);

    // 1. Trova MAX UID in DB (o 0 se vuoto)
    const maxUID = await getMaxUIDNumeric(folder, userEmail);
    let currentUID = (maxUID || 0) + 1;
    let emptyBatches = 0;

    onLog(`🎯 Start from UID ${currentUID} (MAX in DB: ${maxUID || 'none'})`);

    // 2. Download batch incrementali fino a max_empty_batches
    while (emptyBatches < config.max_empty_batches && !shouldStop()) {
      
      const batchEmails = await fetchEmailBatch(
        folder,
        currentUID,
        config.batch_size,
        userEmail
      );

      if (batchEmails.length === 0) {
        emptyBatches++;
        onLog(`⚠️ Empty batch ${emptyBatches}/${config.max_empty_batches} at UID ${currentUID}`);
        currentUID += config.batch_size;
        await delay(config.min_delay_ms);
        continue;
      }

      // Reset empty counter
      emptyBatches = 0;
      onLog(`📥 Batch received: ${batchEmails.length} emails from UID ${currentUID}`);

      // 3. Salva batch in DB
      for (const rawEmail of batchEmails) {
        if (shouldStop()) break;

        try {
          // Parse email
          const normalized = parseEmailResponse(rawEmail);
          
          // Generate message_id
          const uid = rawEmail.uid || currentUID;
          const messageId = `${folder}/${uid}`;

          // Save to DB
          const saved = await saveEmailToDB(normalized, messageId, folder, userEmail);
          
          if (saved) {
            totalDownloaded++;
            onProgress({
              phase: 'luca',
              current_folder: folder,
              current_batch: Math.floor(totalDownloaded / config.batch_size),
              imported: totalDownloaded,
              total: totalDownloaded, // Total unknown in Luca
              errors: totalErrors
            });
          }
        } catch (error) {
          totalErrors++;
          console.error('[executeLucaPhase] Error processing email:', error);
        }
      }

      currentUID += config.batch_size;
      await delay(config.min_delay_ms);
    }

    if (emptyBatches >= config.max_empty_batches) {
      onLog(`✅ ${folder} completed: ${totalDownloaded} new emails (stopped after ${config.max_empty_batches} empty batches)`);
    } else {
      onLog(`⏸️ ${folder} stopped by user`);
    }
  }

  return { downloaded: totalDownloaded, errors: totalErrors };
}

// ============================================================================
// SECTION 5: PHASE 2 - CLEAN LOGIC (130 righe)
// ============================================================================

/**
 * FASE 2: Clean Method
 * Trova buchi nel DB e li riempie scaricando UIDs mancanti
 */
async function executeCleanPhase(
  folders: string[],
  userEmail: string,
  config: MasterConfig,
  onProgress: (progress: MasterProgress) => void,
  onLog: (message: string) => void,
  shouldStop: () => boolean
): Promise<{ filled: number; errors: number }> {
  
  let totalFilled = 0;
  let totalErrors = 0;

  for (const folder of folders) {
    if (shouldStop()) break;

    onLog(`🧹 Clean Phase: Scanning ${folder} for gaps`);

    // 1. Trova UIDs mancanti
    const missingUIDs = await findMissingUIDs(folder, userEmail);

    if (missingUIDs.length === 0) {
      onLog(`✅ ${folder}: No gaps found - database is complete`);
      continue;
    }

    onLog(`🕳️ Found ${missingUIDs.length} missing UIDs in ${folder}`);

    // 2. Scarica UIDs mancanti in batch
    let processedCount = 0;
    
    for (let i = 0; i < missingUIDs.length; i += config.batch_size) {
      if (shouldStop()) break;

      const batchUIDs = missingUIDs.slice(i, i + config.batch_size);
      onLog(`📥 Fetching batch ${Math.floor(i / config.batch_size) + 1}: UIDs ${batchUIDs[0]}-${batchUIDs[batchUIDs.length - 1]}`);

      for (const uid of batchUIDs) {
        if (shouldStop()) break;

        try {
          // Fetch singola email by specific UID
          const emailBatch = await fetchEmailBatch(folder, uid, 1, userEmail);
          
          if (emailBatch.length > 0) {
            const normalized = parseEmailResponse(emailBatch[0]);
            const messageId = `${folder}/${uid}`;
            const saved = await saveEmailToDB(normalized, messageId, folder, userEmail);
            
            if (saved) {
              totalFilled++;
              processedCount++;
              
              onProgress({
                phase: 'clean',
                current_folder: folder,
                current_batch: Math.floor(processedCount / config.batch_size),
                imported: totalFilled,
                total: missingUIDs.length,
                errors: totalErrors,
                gaps_found: missingUIDs.length
              });
            }
          } else {
            onLog(`⚠️ UID ${uid} not found on server (might be deleted)`);
          }
        } catch (error) {
          totalErrors++;
          console.error(`[executeCleanPhase] Error filling UID ${uid}:`, error);
        }
      }

      await delay(config.min_delay_ms);
    }

    onLog(`✅ ${folder} cleaned: ${totalFilled} gaps filled`);
  }

  return { filled: totalFilled, errors: totalErrors };
}

// ============================================================================
// SECTION 6: MASTER ORCHESTRATOR (50 righe)
// ============================================================================

/**
 * MASTER FUNCTION
 * Esegue sequenza completa: Luca → Clean
 */
export async function executeMasterDownload(
  userEmail: string,
  customFolders?: string[],
  onProgress?: (progress: MasterProgress) => void,
  onLog?: (message: string) => void,
  shouldStop?: () => boolean
): Promise<MasterResult> {
  
  const config = OPTIMAL_CONFIG;
  const stop = shouldStop || (() => false);
  const logFn = onLog || (() => {});
  const progressFn = onProgress || (() => {});

  // 1. Auto-detect cartelle se non fornite
  logFn(`🚀 Master Download Started`);
  const folders = customFolders || await fetchFolderList(userEmail);
  logFn(`📁 Folders to process: ${folders.join(', ')}`);

  // 2. FASE 1: Luca (download incrementale)
  logFn(`\n🎯 ===== PHASE 1: Luca Method (Incremental Download) =====`);
  const lucaResult = await executeLucaPhase(
    folders,
    userEmail,
    config,
    progressFn,
    logFn,
    stop
  );

  logFn(`\n📊 Luca Phase Result: ${lucaResult.downloaded} new emails, ${lucaResult.errors} errors`);

  // 3. FASE 2: Clean (riempi buchi) - solo se non interrotto
  let cleanResult = { filled: 0, errors: 0 };
  
  if (!stop()) {
    logFn(`\n🧹 ===== PHASE 2: Clean Method (Fill Gaps) =====`);
    cleanResult = await executeCleanPhase(
      folders,
      userEmail,
      config,
      progressFn,
      logFn,
      stop
    );
    
    logFn(`\n📊 Clean Phase Result: ${cleanResult.filled} gaps filled, ${cleanResult.errors} errors`);
  } else {
    logFn(`\n⏸️ Clean Phase skipped (user stopped)`);
  }

  // 4. Risultato finale
  const finalResult: MasterResult = {
    luca_downloaded: lucaResult.downloaded,
    clean_filled: cleanResult.filled,
    total_errors: lucaResult.errors + cleanResult.errors,
    folders_processed: folders
  };

  logFn(`\n✅ ===== Master Download Completed =====`);
  logFn(`📥 Total new emails: ${finalResult.luca_downloaded}`);
  logFn(`🧹 Total gaps filled: ${finalResult.clean_filled}`);
  logFn(`❌ Total errors: ${finalResult.total_errors}`);
  logFn(`📁 Folders processed: ${finalResult.folders_processed.join(', ')}`);

  progressFn({
    phase: 'completed',
    current_folder: 'Done',
    current_batch: 0,
    imported: finalResult.luca_downloaded + finalResult.clean_filled,
    total: finalResult.luca_downloaded + finalResult.clean_filled,
    errors: finalResult.total_errors
  });

  return finalResult;
}

// ============================================================================
// HELPERS
// ============================================================================

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
