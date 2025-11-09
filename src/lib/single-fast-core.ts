/**
 * SINGLE FAST CORE LOGIC
 * Logica estratta da SingleMailImporter per uso standalone
 * NO dipendenze React - solo chiamate API e DB
 */

import { supabase } from "@/integrations/supabase/client";
import { emailMessageApi } from "./tmwe-api-integrated";
import { getSyncPreferences } from "./email-sync-preferences";

export interface PopulateTempIndexResult {
  totalServer: number;
  totalDB: number;
  totalMissing: number;
}

/**
 * Popola email_temp_index con metadati leggeri per una cartella
 * @param onProgress - Callback per aggiornare UI (current, total)
 */
export async function populateTempIndexForFolder(
  folderName: string,
  userEmail: string,
  onProgress?: (details: {
    from_name: string | null;
    from_email: string;
    subject: string | null;
    date: string;
    current: number;
    total: number;
  }) => void
): Promise<PopulateTempIndexResult> {
  console.log(`🔍 [populateTempIndex] Processing folder: ${folderName}`);

  // 1️⃣ Svuota tabella temporanea per questa cartella
  await supabase
    .from('email_temp_index')
    .delete()
    .eq('user_email', userEmail)
    .eq('folder', folderName);

  // 2️⃣ Fetch UIDs dal server TMWE in batch da 25
  console.log('📡 Fetching server UIDs in batches of 25...');

  const serverUIDs = new Set<string>();
  const uidBatchSize = 25;
  let currentPage = 1;
  let hasMore = true;

  while (hasMore) {
    try {
      console.log(`📡 Fetching page ${currentPage} (batch size: ${uidBatchSize})...`);
      
      const serverResponse = await emailMessageApi.getMessages({
        folder: folderName,
        page: currentPage,
        limit: uidBatchSize,
        format: 'text',
        include_attachments: false,
      });

      const batchUIDs = serverResponse.messages.map((msg: any) => String(msg.uid));
      
      if (batchUIDs.length === 0) {
        hasMore = false;
        console.log(`✅ No more UIDs found, stopping at page ${currentPage}`);
      } else {
        batchUIDs.forEach(uid => serverUIDs.add(uid));
        console.log(`✅ Page ${currentPage}: found ${batchUIDs.length} UIDs (total: ${serverUIDs.size})`);
        
        // Se abbiamo ricevuto meno di uidBatchSize, siamo alla fine
        if (batchUIDs.length < uidBatchSize) {
          hasMore = false;
          console.log(`✅ Last page reached (received ${batchUIDs.length} < ${uidBatchSize})`);
        } else {
          currentPage++;
          
          // ✅ Throttle: wait 800ms between pages to prevent edge function overload
          console.log('⏳ Waiting 800ms before next batch...');
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      }
    } catch (error) {
      console.error(`❌ Error fetching page ${currentPage}:`, error);
      hasMore = false;
    }
  }

  console.log(`✅ Total server UIDs count: ${serverUIDs.size}`);

  // 3️⃣ Fetch UIDs dal DB locale
  console.log('💾 Fetching local DB UIDs...');
  const { data: dbMessages, error } = await supabase
    .from('email_messages')
    .select('message_id')
    .eq('user_email', userEmail)
    .eq('cartella', folderName);

  if (error) throw error;

  const dbUIDs = new Set<string>(
    (dbMessages || [])
      .map((msg: any) => {
        const messageId = String(msg.message_id);
        const parts = messageId.split('/');
        return parts.length > 1 ? parts[1] : messageId;
      })
      .filter((uid: string) => uid && uid !== 'null')
  );
  console.log(`✅ DB UIDs count: ${dbUIDs.size}`);

  // 4️⃣ Calcola UIDs mancanti
  const missing = Array.from(serverUIDs).filter(uid => !dbUIDs.has(uid));
  console.log(`🎯 Missing UIDs: ${missing.length}`);

  // 5️⃣ Popola email_temp_index con metadati leggeri (batch paralleli ridotti a 3)
  const batchSize = 3;
  const tempIndexRecords = [];

  for (let i = 0; i < missing.length; i += batchSize) {
    const batch = missing.slice(i, i + batchSize);

    const batchPromises = batch.map(async (uid, idx) => {
      try {
        const email = await emailMessageApi.getMessage(uid, folderName, false);
        const record = {
          uid,
          folder: folderName,
          user_email: userEmail,
          subject: email?.subject || email?.data?.header?.subject || null,
          from_email: email?.from || email?.data?.header?.from || 'Unknown',
          from_name: email?.from_name || email?.data?.header?.from_name || null,
          date: email?.date || email?.data?.header?.date || new Date().toISOString(),
          size: null,
          status: 'pending',
        };
        
        // Callback per OGNI singola email elaborata
        if (onProgress) {
          onProgress({
            from_name: record.from_name,
            from_email: record.from_email,
            subject: record.subject,
            date: record.date,
            current: i + idx + 1,
            total: missing.length
          });
        }
        
        return record;
      } catch (err) {
        console.warn(`⚠️ Failed to fetch metadata for UID ${uid}:`, err);
        const errorRecord = {
          uid,
          folder: folderName,
          user_email: userEmail,
          subject: '(Error loading)',
          from_email: 'Unknown',
          from_name: null,
          date: new Date().toISOString(),
          size: null,
          status: 'pending',
        };
        
        // Callback anche per errori
        if (onProgress) {
          onProgress({
            from_name: null,
            from_email: 'Error',
            subject: '(Error loading)',
            date: new Date().toISOString(),
            current: i + idx + 1,
            total: missing.length
          });
        }
        
        return errorRecord;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    tempIndexRecords.push(...batchResults);
    
    // ✅ Throttle: wait 500ms between metadata batches to prevent edge function overload
    if (i + batchSize < missing.length) {
      console.log('⏳ Waiting 500ms before next metadata batch...');
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // 6️⃣ Inserisci in batch in email_temp_index
  if (tempIndexRecords.length > 0) {
    const { error: insertError } = await supabase
      .from('email_temp_index')
      .insert(tempIndexRecords);

    if (insertError) {
      console.error('❌ Error inserting to email_temp_index:', insertError);
      throw insertError;
    } else {
      console.log(`✅ Inserted ${tempIndexRecords.length} records into email_temp_index`);
    }
  }

  return {
    totalServer: serverUIDs.size,
    totalDB: dbUIDs.size,
    totalMissing: missing.length,
  };
}

/**
 * Fetch + normalizza email completa dal server TMWE
 */
async function fetchAndNormalizeSingleEmail(uid: string, folder: string) {
  console.log(`🔍 [SingleFast] Fetching email UID ${uid} from ${folder}`);

  const { data: response, error } = await supabase.functions.invoke('tmwe-api-proxy', {
    body: {
      endpoint: '/email_message',
      data: {
        handler: 'get_message',
        uid: parseInt(uid, 10),
        folder: folder,
        mark_as_read: false
      }
    }
  });

  if (error) throw error;
  if (!response?.success) throw new Error(response?.error || 'Errore API');

  const header = response.data?.header || {};
  const body = response.data || {};

  return {
    uid: header.uid,
    message_id: header.message_id || `<${uid}@tmwe.local>`,
    subject: header.subject || '',
    from: header.from,
    from_email: typeof header.from === 'string' ? header.from : header.from,
    from_name: header.from_name || '',
    to: header.to || [],
    to_email: Array.isArray(header.to)
      ? header.to.map((t: any) => t.email || t.address || t).join(',')
      : '',
    cc: header.cc || [],
    cc_email: Array.isArray(header.cc) && header.cc.length > 0
      ? header.cc.map((c: any) => c.email || c.address || c).join(',')
      : null,
    bcc: header.bcc || [],
    bcc_email: Array.isArray(header.bcc) && header.bcc.length > 0
      ? header.bcc.map((b: any) => b.email || b.address || b).join(',')
      : null,
    date: header.date,
    body_text: body.body_plain || '',
    body_html: body.body_html || '',
    flags: [
      ...(header.seen ? ['\\Seen'] : []),
      ...(header.flagged ? ['\\Flagged'] : []),
      ...(header.answered ? ['\\Answered'] : [])
    ],
    attachments: header.attachments || [],
    has_attachments: header.has_attachments || header.attachments_count > 0,
  };
}

/**
 * Controlla se email esiste già in DB
 */
async function checkEmailExists(messageId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('email_messages')
    .select('id')
    .eq('message_id', messageId)
    .maybeSingle();

  if (error) {
    console.error('❌ Errore controllo duplicati:', error);
    return false;
  }

  return !!data;
}

/**
 * Importa singola email da UID nella tabella email_messages
 */
export async function importEmailFromTempIndex(
  uid: string,
  folder: string,
  userEmail: string
): Promise<void> {
  // Controllo duplicato
  const messageId = `${folder}/${uid}`;
  const exists = await checkEmailExists(messageId);

  if (exists) {
    console.warn(`⚠️ Email ${uid} già presente nel database, skip import`);
    
    // Marca come imported in temp_index
    await supabase
      .from('email_temp_index')
      .update({ status: 'imported' })
      .eq('uid', uid)
      .eq('folder', folder)
      .eq('user_email', userEmail);
    
    return;
  }

  // Fetch email completa
  const email = await fetchAndNormalizeSingleEmail(uid, folder);

  // Prepara record per insert
  const emailToSave = {
    message_id: `${folder}/${uid}`,
    from_email: email.from_email || '',
    to_email: email.to_email || '',
    cc_email: email.cc_email || null,
    bcc_email: email.bcc_email || null,
    subject: email.subject || '',
    body_text: email.body_text || '',
    body_html: email.body_html || '',
    data_ricezione: email.date ? new Date(email.date).toISOString() : new Date().toISOString(),
    cartella: folder,
    direzione: 'inbound',
    stato: email.flags?.includes('\\Seen') ? 'letto' : 'nuovo',
    flags: Array.isArray(email.flags) ? email.flags : [],
    attachments: Array.isArray(email.attachments) ? email.attachments : [],
    provider_id: '00000000-0000-0000-0000-000000000000',
    user_email: userEmail,
    sync_status: 'sincronizzato',
  };

  // Insert in DB
  const { error } = await supabase
    .from('email_messages')
    .insert(emailToSave);

  if (error) {
    console.error('❌ [SingleFast] Supabase error:', error);
    throw error;
  }

  // Marca come imported in temp_index
  await supabase
    .from('email_temp_index')
    .update({ status: 'imported' })
    .eq('uid', uid)
    .eq('folder', folder)
    .eq('user_email', userEmail);

  console.log(`✅ Email UID ${uid} importata con successo`);
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
