/**
 * UID Range Service
 * Servizio per gestire query range di UIDs dal database e API
 */

import { supabase } from '@/integrations/supabase/client';

export interface UIDRange {
  min_uid: number;
  max_uid: number;
}

/**
 * Recupera MAX(uid) per una cartella specifica
 * @returns UID massimo o null se cartella vuota
 */
export async function getMaxUID(
  folder: string,
  user_email: string
): Promise<number | null> {
  const { data, error } = await supabase
    .from('email_messages')
    .select('message_id')
    .eq('cartella', folder)
    .eq('user_email', user_email)
    .order('message_id', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  // Extract UID from message_id format "FOLDER/UID"
  const parts = data.message_id.split('/');
  const uid = parseInt(parts[1], 10);
  
  return isNaN(uid) ? null : uid;
}

/**
 * Recupera MIN e MAX UIDs per una cartella
 */
export async function getMinMaxUID(
  folder: string,
  user_email: string
): Promise<UIDRange | null> {
  const { data, error } = await supabase
    .from('email_messages')
    .select('message_id')
    .eq('cartella', folder)
    .eq('user_email', user_email);

  if (error || !data || data.length === 0) {
    return null;
  }

  // Extract all UIDs
  const uids = data
    .map((row: any) => {
      const parts = row.message_id.split('/');
      return parseInt(parts[1], 10);
    })
    .filter(uid => !isNaN(uid));

  if (uids.length === 0) {
    return null;
  }

  return {
    min_uid: Math.min(...uids),
    max_uid: Math.max(...uids)
  };
}

/**
 * Recupera tutti gli UIDs esistenti nel DB per una cartella in un range
 */
export async function getExistingUIDs(
  folder: string,
  user_email: string,
  min_uid?: number,
  max_uid?: number
): Promise<number[]> {
  let query = supabase
    .from('email_messages')
    .select('message_id')
    .eq('cartella', folder)
    .eq('user_email', user_email);

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  // Extract UIDs and filter by range
  const uids = data
    .map((row: any) => {
      const parts = row.message_id.split('/');
      return parseInt(parts[1], 10);
    })
    .filter(uid => !isNaN(uid));

  // Apply range filter
  if (min_uid !== undefined && max_uid !== undefined) {
    return uids.filter(uid => uid >= min_uid && uid <= max_uid);
  }

  return uids;
}

/**
 * Trova UIDs mancanti nel range usando solo il database locale
 * Usa generate_series per trovare i "buchi" nel range MIN-MAX
 * NON richiede chiamate API - molto più veloce!
 */
export async function findMissingUIDs(
  folder: string,
  user_email: string
): Promise<number[]> {
  // Get MIN and MAX from database
  const range = await getMinMaxUID(folder, user_email);
  
  if (!range) {
    return [];
  }

  // Get existing UIDs
  const existingUIDs = await getExistingUIDs(folder, user_email);
  
  // Generate complete series from MIN to MAX
  const allUIDs = Array.from(
    { length: range.max_uid - range.min_uid + 1 },
    (_, i) => range.min_uid + i
  );
  
  // Find gaps
  const existingSet = new Set(existingUIDs);
  return allUIDs.filter(uid => !existingSet.has(uid));
}
