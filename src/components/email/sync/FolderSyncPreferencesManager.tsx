/**
 * Folder Sync Preferences Manager
 * 
 * Componente separato per gestire le preferenze di sincronizzazione
 * NON tocca QuickEmailDownloader
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { 
  getSyncPreferences, 
  saveSyncPreferences, 
  type SyncPreferences 
} from '@/lib/email-sync-preferences';
import { emailFolderApi } from '@/lib/tmwe-api-integrated';
import { Folder, CheckCircle2 } from 'lucide-react';

interface FolderSyncPreferencesManagerProps {
  userEmail: string;
  onPreferencesChanged?: () => void;
}

export function FolderSyncPreferencesManager({ 
  userEmail, 
  onPreferencesChanged 
}: FolderSyncPreferencesManagerProps) {
  
  const [includedFolders, setIncludedFolders] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // ✅ Carica cartelle autonomamente
  const { data: foldersData, isLoading: isLoadingFolders, error, isError } = useQuery({
    queryKey: ['email-folders', userEmail],
    queryFn: async () => {
      console.log('🔄 [FolderPrefs] Fetching folders (FORCE REFRESH)');
      
      // ✅ BYPASSA CACHE VUOTA
      const response = await emailFolderApi.getFolders({ 
        include_counts: false,
        skipCache: true  // ✅ Forza chiamata API reale
      });
      
      const foldersList = Array.isArray(response) 
        ? response 
        : (response?.folders || response?.data || []);
      
      console.log(`📁 [FolderPrefs] API returned ${foldersList.length} folders`);
      
      // ✅ FALLBACK se API restituisce ancora 0
      if (foldersList.length === 0) {
        console.warn('⚠️ [FolderPrefs] API returned 0 folders - using FALLBACK');
        return ['INBOX', 'Sent', 'Drafts', 'Trash', 'Junk', 'Spam'];
      }
      
      return foldersList.map((f: any) => f.name || f);
    },
    enabled: !!userEmail,
    staleTime: 0,  // ✅ Non cachare in React Query
    retry: false, // ✅ NO retry su errori auth
    refetchOnWindowFocus: false,
  });

  const availableFolders = foldersData || [];

  useEffect(() => {
    if (userEmail) {
      loadCurrentPreferences();
    }
  }, [userEmail]);

  const loadCurrentPreferences = async () => {
    try {
      console.log('🔍 [FolderPrefs] Loading preferences for:', userEmail);
      console.log('📁 [FolderPrefs] Available folders:', availableFolders);
      
      const prefs = await getSyncPreferences(userEmail);
      
      console.log('💾 [FolderPrefs] Saved preferences from DB:', {
        included_folders: prefs.included_folders,
        excluded_folders: prefs.excluded_folders
      });
      
      if (prefs.included_folders.length > 0) {
        // Utente ha già salvato preferenze
        console.log('✅ [FolderPrefs] Using saved preferences:', prefs.included_folders);
        setIncludedFolders(prefs.included_folders);
      } else {
        // Prima volta: pre-seleziona tutte tranne Trash/Junk/Drafts
        const recommended = availableFolders.filter(
          name => !['Trash', 'Junk', 'Drafts'].includes(name)
        );
        console.log('🆕 [FolderPrefs] First time - using recommended:', recommended);
        setIncludedFolders(recommended);
      }

      console.log('📥 [FolderPrefs] Final state set:', {
        included: prefs.included_folders,
        availableFolders: availableFolders.length,
        willSetTo: prefs.included_folders.length > 0 ? prefs.included_folders : availableFolders.filter(
          name => !['Trash', 'Junk', 'Drafts'].includes(name)
        )
      });

    } catch (error) {
      console.error('❌ [FolderPrefs] Load error:', error);
      toast({
        title: '❌ Errore',
        description: 'Impossibile caricare le preferenze',
        variant: 'destructive'
      });
    }
  };

  const handleSavePreferences = async () => {
    setIsSaving(true);
    try {
      await saveSyncPreferences(userEmail, {
        excluded_folders: [],
        included_folders: includedFolders
      });

      console.log('💾 [FolderPrefs] Saved preferences:', {
        included: includedFolders
      });

      toast({
        title: '✅ Preferenze salvate',
        description: `${includedFolders.length} cartelle selezionate per la sincronizzazione`
      });

      onPreferencesChanged?.();

    } catch (error) {
      console.error('❌ [FolderPrefs] Save error:', error);
      toast({
        title: '❌ Errore',
        description: 'Impossibile salvare le preferenze',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleFolder = (folderName: string) => {
    setIncludedFolders(prev => 
      prev.includes(folderName) 
        ? prev.filter(f => f !== folderName)
        : [...prev, folderName]
    );
  };

  // ✅ Gestione errori TMWE token scaduto
  if (isError) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    if (errorMsg.includes('TMWE_SESSION_EXPIRED') || errorMsg.includes('TMWE_AUTH_REQUIRED') || errorMsg.includes('timeout')) {
      return (
        <div className="py-8 text-center space-y-4">
          <div className="text-destructive font-medium">🔒 Token TMWE scaduto</div>
          <p className="text-sm text-muted-foreground">
            La tua sessione TMWE è scaduta. Devi ri-autenticarti per accedere alle cartelle email.
          </p>
          <Button 
            onClick={() => window.location.href = '/tmwe/callback'} 
            className="mt-4"
          >
            🔐 Ri-autentica TMWE
          </Button>
        </div>
      );
    }
    
    return (
      <div className="py-8 text-center space-y-3">
        <p className="text-destructive font-medium">❌ Errore caricamento cartelle</p>
        <p className="text-xs text-muted-foreground font-mono">{errorMsg}</p>
        <Button 
          onClick={() => window.location.reload()} 
          variant="outline" 
          size="sm"
        >
          Riprova
        </Button>
      </div>
    );
  }

  if (isLoadingFolders) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Caricamento cartelle...
      </div>
    );
  }

  if (availableFolders.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Nessuna cartella disponibile
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-2">
      {/* Header */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Folder className="h-5 w-5" />
          Seleziona Cartelle da Sincronizzare
        </h3>
        <p className="text-sm text-muted-foreground">
          Spunta le cartelle che vuoi sincronizzare. Le cartelle non selezionate verranno ignorate.
        </p>
      </div>

      {/* Lista Cartelle */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Cartelle Disponibili</Label>
          <Badge variant="secondary">
            {includedFolders.length} / {availableFolders.length} selezionate
          </Badge>
        </div>

        <ScrollArea className="h-[300px] max-h-[35vh] border rounded-md p-4">
          <div className="space-y-2">
            {availableFolders.map(folder => {
              const isSelected = includedFolders.includes(folder);
              
              return (
                <div 
                  key={folder} 
                  className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <Folder className="h-4 w-4 text-muted-foreground" />
                    <Label 
                      htmlFor={`folder-${folder}`}
                      className="cursor-pointer flex-1 font-normal"
                    >
                      {folder}
                    </Label>
                    {isSelected && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                  
                  <Switch
                    id={`folder-${folder}`}
                    checked={isSelected}
                    onCheckedChange={() => toggleFolder(folder)}
                  />
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-md">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              ✓ {includedFolders.length} cartelle selezionate per la sincronizzazione
            </span>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <Button 
        className="w-full" 
        onClick={handleSavePreferences}
        disabled={isSaving}
      >
        {isSaving ? 'Salvataggio...' : 'Salva Preferenze'}
      </Button>
    </div>
  );
}
