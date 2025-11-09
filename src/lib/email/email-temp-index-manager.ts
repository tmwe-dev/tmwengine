/**
 * EMAIL TEMP INDEX MANAGER
 * Gestisce popolamento email_temp_index con metadata leggeri
 * Estratto da single-fast-core.ts per riutilizzo modulare
 */

import { supabase } from '@/integrations/supabase/client';
import { emailMessageApi } from '../tmwe-api-integrated';
import { extractEmailMetadata } from './email-mapper';

export interface PopulateConfig {
  uid_batch_size?: number;
  metadata_batch_size?: number;
  page_throttle_ms?: number;
  metadata_throttle_ms?: number;
  max_pages?: number; // ✅ NUOVO: limita numero pagine (0 = illimitato)
}

export interface PopulateProgress {
  from_name: string | null;
  from_email: string;
  subject: string | null;
  date: string;
  current: number;
  total: number;
}

export interface PopulateTempIndexResult {
  totalServer: number;
  totalDB: number;
  totalMissing: number;
}

const DEFAULT_CONFIG: Required<PopulateConfig> = {
  uid_batch_size: 50,
  metadata_batch_size: 3,
  page_throttle_ms: 5000,          // ✅ Aumentato a 5s
  metadata_throttle_ms: 500,
  max_pages: 0,                    // ✅ Default: illimitato
};

/**
 * Popola email_temp_index con metadati leggeri per una cartella
 * ✅ Estratto da single-fast-core.ts (righe 21-210)
 */
export async function populateTempIndexForFolder(
  folderName: string,
  userEmail: string,
  config: PopulateConfig = {},
  onProgress?: (details: PopulateProgress) => void
): Promise<PopulateTempIndexResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  console.log(`🔍 [populateTempIndex] Processing folder: ${folderName}`);

  // 1. Clear existing temp index
  await supabase
    .from('email_temp_index')
    .delete()
    .eq('user_email', userEmail)
    .eq('folder', folderName);

  // 2. Fetch server UIDs (paginato)
  const serverUIDs = await fetchServerUIDs(folderName, cfg);
  console.log(`✅ Total server UIDs: ${serverUIDs.size}`);

  // 3. Fetch DB UIDs
  const dbUIDs = await fetchDatabaseUIDs(folderName, userEmail);
  console.log(`✅ DB UIDs: ${dbUIDs.size}`);

  // 4. Calculate missing
  const missing = Array.from(serverUIDs).filter(uid => !dbUIDs.has(uid));
  console.log(`🎯 Missing UIDs: ${missing.length}`);

  // 5. Populate temp_index with metadata
  await populateMetadataInBatches(
    missing,
    folderName,
    userEmail,
    cfg,
    onProgress
  );

  return {
    totalServer: serverUIDs.size,
    totalDB: dbUIDs.size,
    totalMissing: missing.length,
  };
}

// ===== HELPER FUNCTIONS (private) =====

async function fetchServerUIDs(
  folder: string,
  config: Required<PopulateConfig>
): Promise<Set<string>> {
  const uids = new Set<string>();
  let currentPage = 1;
  let hasMore = true;
  let retryCount = 0;
  const MAX_RETRIES = 1; // ✅ Ridotto da 3 a 1

  while (hasMore) {
    // ✅ CHECK: hai raggiunto il limite di pagine?
    if (config.max_pages > 0 && currentPage > config.max_pages) {
      console.log(`⚠️ Reached max_pages limit (${config.max_pages}). Stopping pagination.`);
      hasMore = false;
      break;
    }
    
    try {
      console.log(`📡 Fetching page ${currentPage} (batch size: ${config.uid_batch_size})...`);
      
      const response = await emailMessageApi.getMessages({
        folder,
        page: currentPage,
        limit: config.uid_batch_size,
        format: 'text',
        include_attachments: false,
      });

      // Reset retry counter on success
      retryCount = 0;

      // ✅ VALIDAZIONE API RESPONSE (CRITICA)
      if (!response || !response.messages || !Array.isArray(response.messages)) {
        console.error(`❌ Invalid API response structure at page ${currentPage}:`, {
          hasResponse: !!response,
          hasMessages: !!response?.messages,
          isArray: Array.isArray(response?.messages),
          responseKeys: response ? Object.keys(response) : []
        });
        hasMore = false;
        break;
      }

      const batchUIDs = response.messages.map((msg: any) => String(msg.uid));
      
      // ✅ RIPRISTINA LOGICA IF/ELSE (come vecchio codice)
      if (batchUIDs.length === 0) {
        hasMore = false;
        console.log(`✅ No more UIDs found at page ${currentPage}`);
      } else {
        batchUIDs.forEach(uid => uids.add(uid));
        console.log(`✅ Page ${currentPage}: ${batchUIDs.length} UIDs (total: ${uids.size})`);
        
        if (batchUIDs.length < config.uid_batch_size) {
          hasMore = false;
          console.log(`✅ Last page reached (received ${batchUIDs.length} < ${config.uid_batch_size})`);
        } else {
          currentPage++;
          console.log(`⏳ Waiting ${config.page_throttle_ms}ms before next page...`);
          await new Promise(resolve => setTimeout(resolve, config.page_throttle_ms));
        }
      }
    } catch (error) {
      console.error(`❌ Error fetching page ${currentPage}:`, error);
      
      // ✅ RETRY LOGIC con exponential backoff
      if (retryCount < MAX_RETRIES) {
        retryCount++;
        const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 10000); // 2s, 4s, 8s (max 10s)
        console.warn(`🔄 Retry ${retryCount}/${MAX_RETRIES} after ${backoffDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        // Non incrementa currentPage, riprova la stessa pagina
        continue;
      } else {
        console.error(`❌ Max retries reached for page ${currentPage}, stopping pagination`);
        hasMore = false;
      }
    }
  }

  return uids;
}

async function fetchDatabaseUIDs(
  folder: string,
  userEmail: string
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('email_messages')
    .select('message_id')
    .eq('user_email', userEmail)
    .eq('cartella', folder);

  if (error) throw error;

  return new Set(
    (data || [])
      .map((msg: any) => {
        const messageId = String(msg.message_id);
        const parts = messageId.split('/');
        return parts.length > 1 ? parts[1] : messageId;
      })
      .filter((uid: string) => uid && uid !== 'null')
  );
}

async function populateMetadataInBatches(
  uids: string[],
  folder: string,
  userEmail: string,
  config: Required<PopulateConfig>,
  onProgress?: (details: PopulateProgress) => void
): Promise<void> {
  const records = [];

  for (let i = 0; i < uids.length; i += config.metadata_batch_size) {
    const batch = uids.slice(i, i + config.metadata_batch_size);

    const batchPromises = batch.map(async (uid, idx) => {
      try {
        const email = await emailMessageApi.getMessage(uid, folder, false);
        
        // ✅ USA extractEmailMetadata da email-mapper.ts
        const metadata = extractEmailMetadata(email);
        
        const record = {
          uid,
          folder,
          user_email: userEmail,
          subject: metadata.subject,
          from_email: metadata.from_email,
          from_name: metadata.from_name,
          date: metadata.date,
          size: null,
          status: 'pending' as const,
        };
        
        if (onProgress) {
          onProgress({
            ...metadata,
            current: i + idx + 1,
            total: uids.length
          });
        }
        
        return record;
      } catch (err) {
        console.warn(`⚠️ Failed to fetch metadata for UID ${uid}:`, err);
        
        const errorRecord = {
          uid,
          folder,
          user_email: userEmail,
          subject: '(Error loading)',
          from_email: 'Unknown',
          from_name: null,
          date: new Date().toISOString(),
          size: null,
          status: 'pending' as const,
        };
        
        if (onProgress) {
          onProgress({
            from_name: null,
            from_email: 'Error',
            subject: '(Error loading)',
            date: new Date().toISOString(),
            current: i + idx + 1,
            total: uids.length
          });
        }
        
        return errorRecord;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    records.push(...batchResults);
    
    if (i + config.metadata_batch_size < uids.length) {
      console.log('⏳ Waiting between metadata batches...');
      await new Promise(resolve => setTimeout(resolve, config.metadata_throttle_ms));
    }
  }

  // Insert in DB
  if (records.length > 0) {
    const { error } = await supabase
      .from('email_temp_index')
      .insert(records);

    if (error) {
      console.error('❌ Error inserting to email_temp_index:', error);
      throw error;
    }
    
    console.log(`✅ Inserted ${records.length} records into email_temp_index`);
  }
}
