/**
 * Folder Sync Preferences Manager
 * 
 * Componente separato per gestire le preferenze di sincronizzazione
 * NON tocca QuickEmailDownloader
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  getSyncPreferences, 
  saveSyncPreferences, 
  type SyncPreferences 
} from '@/lib/email-sync-preferences';
import { Folder, Lock, Unlock, CheckCircle2, XCircle } from 'lucide-react';

interface FolderSyncPreferencesManagerProps {
  userEmail: string;
  availableFolders: string[];
  onPreferencesChanged?: () => void;
}

export function FolderSyncPreferencesManager({ 
  userEmail, 
  availableFolders,
  onPreferencesChanged 
}: FolderSyncPreferencesManagerProps) {
  
  const [syncMode, setSyncMode] = useState<'blacklist' | 'whitelist'>('blacklist');
  const [excludedFolders, setExcludedFolders] = useState<string[]>([]);
  const [includedFolders, setIncludedFolders] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCurrentPreferences();
  }, [userEmail]);

  const loadCurrentPreferences = async () => {
    setIsLoading(true);
    try {
      const prefs = await getSyncPreferences(userEmail);
      
      setExcludedFolders(prefs.excluded_folders);
      setIncludedFolders(prefs.included_folders);
      
      // Determina modalità corrente
      const mode = prefs.included_folders.length > 0 ? 'whitelist' : 'blacklist';
      setSyncMode(mode);

      console.log('📥 [FolderPrefs] Loaded preferences:', {
        mode,
        excluded: prefs.excluded_folders,
        included: prefs.included_folders
      });

    } catch (error) {
      console.error('❌ [FolderPrefs] Load error:', error);
      toast({
        title: '❌ Errore',
        description: 'Impossibile caricare le preferenze',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    setIsSaving(true);
    try {
      const prefsToSave = {
        excluded_folders: syncMode === 'blacklist' ? excludedFolders : [],
        included_folders: syncMode === 'whitelist' ? includedFolders : []
      };

      await saveSyncPreferences(userEmail, prefsToSave);

      console.log('💾 [FolderPrefs] Saved preferences:', {
        mode: syncMode,
        ...prefsToSave
      });

      toast({
        title: '✅ Preferenze salvate',
        description: `Modalità ${syncMode === 'blacklist' ? 'Blacklist' : 'Whitelist'} attivata`
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

  const toggleFolderInclusion = (folderName: string) => {
    if (syncMode === 'blacklist') {
      // Blacklist: toggle exclude
      setExcludedFolders(prev =>
        prev.includes(folderName)
          ? prev.filter(f => f !== folderName)
          : [...prev, folderName]
      );
    } else {
      // Whitelist: toggle include
      setIncludedFolders(prev =>
        prev.includes(folderName)
          ? prev.filter(f => f !== folderName)
          : [...prev, folderName]
      );
    }
  };

  const isFolderActive = (folderName: string): boolean => {
    if (syncMode === 'blacklist') {
      return !excludedFolders.includes(folderName);
    } else {
      return includedFolders.includes(folderName);
    }
  };

  const getActiveCount = (): number => {
    if (syncMode === 'blacklist') {
      return availableFolders.length - excludedFolders.length;
    } else {
      return includedFolders.length;
    }
  };

  if (isLoading) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Caricamento preferenze...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Gestione Sincronizzazione Cartelle
        </h3>
        <p className="text-sm text-muted-foreground">
          Scegli quali cartelle sincronizzare automaticamente nel database locale.
          Le preferenze si applicano al Quick Download e alla sincronizzazione automatica.
        </p>
      </div>

      {/* Modalità Sync */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Modalità di Sincronizzazione</Label>
        
        <RadioGroup value={syncMode} onValueChange={(v) => setSyncMode(v as any)}>
          <div className="flex items-start space-x-3 p-3 border rounded-md hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="blacklist" id="mode-blacklist" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="mode-blacklist" className="cursor-pointer">
                <div className="font-medium">Blacklist (Escludi)</div>
                <div className="text-sm text-muted-foreground">
                  Sincronizza <strong>tutte</strong> le cartelle <strong>tranne</strong> quelle selezionate
                </div>
              </Label>
            </div>
            <Badge variant="outline">Consigliato</Badge>
          </div>

          <div className="flex items-start space-x-3 p-3 border rounded-md hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="whitelist" id="mode-whitelist" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="mode-whitelist" className="cursor-pointer">
                <div className="font-medium">Whitelist (Includi)</div>
                <div className="text-sm text-muted-foreground">
                  Sincronizza <strong>solo</strong> le cartelle selezionate
                </div>
              </Label>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* Lista Cartelle */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Cartelle Disponibili</Label>
          <Badge variant="secondary">
            {getActiveCount()} / {availableFolders.length} attive
          </Badge>
        </div>

        <ScrollArea className="h-[400px] max-h-[45vh] border rounded-md p-4">
          <div className="space-y-2">
            {availableFolders.map(folder => {
              const isActive = isFolderActive(folder);
              
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
                    {isActive ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  
                  <Switch
                    id={`folder-${folder}`}
                    checked={isActive}
                    onCheckedChange={() => toggleFolderInclusion(folder)}
                  />
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-md">
          {syncMode === 'blacklist' ? (
            <div className="flex items-start gap-2">
              <Unlock className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                Le cartelle <strong>attive</strong> (con switch ON) saranno sincronizzate.
                Le altre verranno ignorate.
              </span>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <Lock className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                Verranno sincronizzate <strong>solo</strong> le cartelle attive (con switch ON).
                Tutte le altre verranno ignorate.
              </span>
            </div>
          )}
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
