import { supabase } from "@/integrations/supabase/client";

export interface SyncPreferences {
  excluded_folders: string[];
  included_folders: string[];
  user_email: string;
}

export interface EmailFolder {
  name: string;
  display_name?: string;
  unread_count?: number;
  total_count?: number;
}

/**
 * Recupera le preferenze di sincronizzazione per un utente
 * Se non esistono, ritorna array vuoti
 */
export async function getSyncPreferences(userEmail: string): Promise<SyncPreferences> {
  const { data, error } = await supabase
    .from('email_sync_preferences')
    .select('excluded_folders, included_folders, user_email')
    .eq('user_email', userEmail)
    .maybeSingle();

  if (error) {
    console.error('Errore recupero preferenze sync:', error);
  }

  return {
    user_email: userEmail,
    excluded_folders: (data?.excluded_folders as string[]) || [],
    included_folders: (data?.included_folders as string[]) || [],
  };
}

/**
 * Salva le preferenze di sincronizzazione
 */
export async function saveSyncPreferences(
  userEmail: string,
  preferences: Partial<Pick<SyncPreferences, 'excluded_folders' | 'included_folders'>>
): Promise<void> {
  const { error } = await supabase
    .from('email_sync_preferences')
    .upsert({
      user_email: userEmail,
      excluded_folders: preferences.excluded_folders || [],
      included_folders: preferences.included_folders || [],
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_email'
    });

  if (error) {
    throw new Error(`Errore salvataggio preferenze: ${error.message}`);
  }
}

/**
 * Filtra le cartelle in base alle preferenze
 * LOGICA SEMPLIFICATA:
 * - Se included_folders è vuoto → sincronizza TUTTE le cartelle
 * - Se included_folders è popolato → sincronizza SOLO quelle
 */
export function filterFolders(
  folders: EmailFolder[],
  preferences: SyncPreferences
): EmailFolder[] {
  const { included_folders } = preferences;

  // Se NON ci sono cartelle selezionate → sincronizza TUTTE
  if (included_folders.length === 0) {
    console.log('⚠️ Nessuna preferenza → sincronizzazione TUTTE le cartelle');
    return folders;
  }

  // Altrimenti sincronizza SOLO quelle selezionate
  const normalize = (name: string) => (name || '').trim().toLowerCase();
  const includedSet = new Set(included_folders.map(normalize));

  const filtered = folders.filter(f => {
    const isIncluded = includedSet.has(normalize(f.name));
    console.log(`   ${f.name}: ${isIncluded ? '✅ SYNC' : '❌ skip'}`);
    return isIncluded;
  });

  return filtered;
}

/**
 * Ritorna le statistiche del filtro
 */
export function getFilterStats(
  totalFolders: number,
  filteredFolders: EmailFolder[],
  preferences: SyncPreferences
): { total: number; filtered: number; excluded: number } {
  return {
    total: totalFolders,
    filtered: filteredFolders.length,
    excluded: totalFolders - filteredFolders.length,
  };
}
