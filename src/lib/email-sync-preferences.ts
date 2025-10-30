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

const DEFAULT_EXCLUDED_FOLDERS = ["Trash", "Archives", "Junk", "Drafts"];

/**
 * Recupera le preferenze di sincronizzazione per un utente
 * Se non esistono, ritorna i default
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
    excluded_folders: (data?.excluded_folders as string[]) || DEFAULT_EXCLUDED_FOLDERS,
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
 */
export function filterFolders(
  folders: EmailFolder[],
  preferences: SyncPreferences
): EmailFolder[] {
  const { excluded_folders, included_folders } = preferences;

  // Se ci sono cartelle specifiche incluse, considera SOLO quelle
  if (included_folders.length > 0) {
    return folders.filter(f => included_folders.includes(f.name));
  }

  // Altrimenti, escludi solo quelle nella blacklist
  return folders.filter(f => !excluded_folders.includes(f.name));
}

/**
 * Ritorna le statistiche del filtro
 */
export function getFilterStats(
  totalFolders: number,
  filteredFolders: EmailFolder[],
  preferences: SyncPreferences
): { total: number; filtered: number; excluded: number; mode: 'whitelist' | 'blacklist' } {
  return {
    total: totalFolders,
    filtered: filteredFolders.length,
    excluded: totalFolders - filteredFolders.length,
    mode: preferences.included_folders.length > 0 ? 'whitelist' : 'blacklist'
  };
}
