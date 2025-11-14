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
  const { data: foldersData, isLoading: isLoadingFolders } = useQuery({
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
        description: 'Impossibile caricare preferenze cartelle',
        variant: 'destructive',
      });
    }
  };

  const handleSavePreferences = async () => {
    setIsSaving(true);
    
    try {
      console.log('💾 [FolderPrefs] Saving preferences:', {
        userEmail,
        includedFolders,
        excluded: availableFolders.filter(f => !includedFolders.includes(f))
      });

      await saveSyncPreferences(userEmail, includedFolders);
      
      toast({
        title: '✅ Salvato',
        description: `Configurate ${includedFolders.length}/${availableFolders.length} cartelle`,
      });

      console.log('✅ [FolderPrefs] Preferences saved successfully');
      
      if (onPreferencesChanged) {
        console.log('🔄 [FolderPrefs] Calling onPreferencesChanged callback');
        onPreferencesChanged();
      }
      
    } catch (error) {
      console.error('❌ [FolderPrefs] Save error:', error);
      toast({
        title: '❌ Errore',
        description: 'Impossibile salvare preferenze',
        variant: 'destructive',
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

  if (isLoadingFolders) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Caricamento cartelle...
      </div>
    );
  }

  if (!availableFolders || availableFolders.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Nessuna cartella disponibile
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-medium">
          📁 Seleziona cartelle da sincronizzare
        </h3>
        <p className="text-xs text-muted-foreground">
          Scegli quali cartelle email verranno scaricate automaticamente
        </p>
      </div>

      <ScrollArea className="h-[300px] rounded-md border p-4">
        <div className="space-y-3">
          {availableFolders.map((folderName) => {
            const isIncluded = includedFolders.includes(folderName);
            
            return (
              <div 
                key={folderName} 
                className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Folder className="h-4 w-4 text-muted-foreground" />
                  <Label 
                    htmlFor={`folder-${folderName}`}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {folderName}
                  </Label>
                  {isIncluded && (
                    <CheckCircle2 className="h-3 w-3 text-primary" />
                  )}
                </div>
                
                <Switch
                  id={`folder-${folderName}`}
                  checked={isIncluded}
                  onCheckedChange={() => toggleFolder(folderName)}
                />
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="flex items-center justify-between pt-2">
        <Badge variant="outline" className="text-xs">
          {includedFolders.length} / {availableFolders.length} cartelle selezionate
        </Badge>

        <Button 
          onClick={handleSavePreferences}
          disabled={isSaving}
          size="sm"
        >
          {isSaving ? 'Salvataggio...' : 'Salva Preferenze'}
        </Button>
      </div>
    </div>
  );
}
