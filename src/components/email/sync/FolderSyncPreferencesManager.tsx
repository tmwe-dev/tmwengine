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
      const response = await emailFolderApi.getFolders({ 
        include_counts: false,
        skipCache: false
      });
      const foldersList = Array.isArray(response) 
        ? response 
        : (response?.folders || response?.data || []);
      return foldersList.map((f: any) => f.name || f);
    },
    enabled: !!userEmail,
  });

  const availableFolders = foldersData || [];

  useEffect(() => {
    if (userEmail && availableFolders.length > 0) {
      loadCurrentPreferences();
    }
  }, [userEmail, availableFolders.length]);

  const loadCurrentPreferences = async () => {
    try {
      const prefs = await getSyncPreferences(userEmail);
      
      if (prefs.included_folders.length > 0) {
        // Utente ha già salvato preferenze
        setIncludedFolders(prefs.included_folders);
      } else {
        // Prima volta: pre-seleziona tutte tranne Trash/Junk/Drafts
        const recommended = availableFolders.filter(
          name => !['Trash', 'Junk', 'Drafts'].includes(name)
        );
        setIncludedFolders(recommended);
      }

      console.log('📥 [FolderPrefs] Loaded preferences:', {
        included: prefs.included_folders,
        availableFolders: availableFolders.length
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
    <div className="space-y-6">
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

        <ScrollArea className="h-[400px] max-h-[45vh] border rounded-md p-4">
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
