/**
 * EMAIL REPOSITORY
 * Gestisce tutte le operazioni sul database per le email
 * Isolato da logica di business e API
 */

import { supabase } from '@/integrations/supabase/client';
import type { NormalizedEmail } from './email-mapper';

/**
 * Verifica se un'email esiste già nel database
 */
export async function checkEmailExists(message_id: string): Promise<boolean> {
  const { data } = await supabase
    .from('email_messages')
    .select('id')
    .eq('message_id', message_id)
    .maybeSingle();
  
  return Boolean(data);
}

/**
 * Salva un'email completa nel database
 */
export async function saveEmailToDatabase(
  email: NormalizedEmail,
  message_id: string,
  user_email: string,
  folder: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('email_messages')
    .insert({
      message_id,
      user_email,
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
      attachments: email.attachments,
      cc_email: email.cc_email,
      bcc_email: email.bcc_email,
      in_reply_to: email.in_reply_to,
      email_references: email.email_references,
    });
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Aggiorna lo stato di un'email in email_temp_index
 */
export async function updateTempIndexStatus(
  uid: string,
  folder: string,
  user_email: string,
  status: 'pending' | 'imported' | 'selected'
): Promise<void> {
  await supabase
    .from('email_temp_index')
    .update({ status })
    .eq('uid', uid)
    .eq('folder', folder)
    .eq('user_email', user_email);
}

/**
 * Recupera tutti gli UIDs pending per una cartella
 */
export async function getPendingUIDs(
  folder: string,
  user_email: string
): Promise<number[]> {
  const { data, error } = await supabase
    .from('email_temp_index')
    .select('uid')
    .eq('folder', folder)
    .eq('user_email', user_email)
    .eq('status', 'pending');
  
  if (error || !data) {
    console.error('[getPendingUIDs] Error:', error);
    return [];
  }
  
  return data.map(row => parseInt(row.uid, 10));
}

/**
 * Recupera il progresso per tutte le cartelle
 */
export interface FolderProgress {
  folder: string;
  total: number;
  imported: number;
  pending: number;
}

export async function getFoldersProgress(user_email: string): Promise<FolderProgress[]> {
  const { data, error } = await supabase
    .from('email_temp_index')
    .select('folder, status')
    .eq('user_email', user_email);

  if (error || !data) {
    console.error('[getFoldersProgress] Error:', error);
    return [];
  }

  const folders_map = new Map<string, FolderProgress>();

  data.forEach(row => {
    if (!folders_map.has(row.folder)) {
      folders_map.set(row.folder, {
        folder: row.folder,
        total: 0,
        imported: 0,
        pending: 0
      });
    }

    const progress = folders_map.get(row.folder)!;
    progress.total++;
    
    if (row.status === 'imported') {
      progress.imported++;
    } else if (row.status === 'pending') {
      progress.pending++;
    }
  });

  return Array.from(folders_map.values()).sort((a, b) => 
    a.folder.localeCompare(b.folder)
  );
}
