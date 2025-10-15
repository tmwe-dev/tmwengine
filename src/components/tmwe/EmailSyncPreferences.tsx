import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { emailFolderApi } from '@/lib/tmwe-api-integrated';
import { getSyncPreferences, saveSyncPreferences } from '@/lib/email-sync-preferences';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check } from 'lucide-react';

interface EmailSyncPreferencesProps {
  userEmail: string;
  onClose?: () => void;
  showButtons?: boolean;
  onSave?: () => void;
}

type SyncMode = 'blacklist' | 'whitelist';

const RECOMMENDED_EXCLUDES = ["Trash", "Archives", "Junk", "Drafts"];

export const EmailSyncPreferences = ({ 
  userEmail, 
  onClose, 
  showButtons = true,
  onSave 
}: EmailSyncPreferencesProps) => {
  const { toast } = useToast();
  const [syncMode, setSyncMode] = useState<SyncMode>('blacklist');
  const [excludedFolders, setExcludedFolders] = useState<string[]>(RECOMMENDED_EXCLUDES);
  const [includedFolders, setIncludedFolders] = useState<string[]>([]);

  // Carica le cartelle disponibili
  const { data: foldersData, isLoading: loadingFolders } = useQuery({
    queryKey: ['folders', userEmail],
    queryFn: emailFolderApi.getFolders,
  });

  // Carica le preferenze esistenti
  const { data: preferences, isLoading: loadingPrefs } = useQuery({
    queryKey: ['sync-preferences', userEmail],
    queryFn: () => getSyncPreferences(userEmail),
  });

  // Inizializza lo stato quando le preferenze sono caricate
  useEffect(() => {
    if (preferences) {
      setExcludedFolders(preferences.excluded_folders);
      setIncludedFolders(preferences.included_folders);
      setSyncMode(preferences.included_folders.length > 0 ? 'whitelist' : 'blacklist');
    }
  }, [preferences]);

  // Salva preferenze
  const saveMutation = useMutation({
    mutationFn: async () => {
      await saveSyncPreferences(userEmail, {
        excluded_folders: syncMode === 'blacklist' ? excludedFolders : [],
        included_folders: syncMode === 'whitelist' ? includedFolders : [],
      });
    },
    onSuccess: () => {
      toast({
        title: "✅ Preferenze salvate",
        description: "Le tue preferenze di sincronizzazione sono state aggiornate.",
      });
      onSave?.();
      onClose?.();
    },
    onError: (error: any) => {
      toast({
        title: "❌ Errore",
        description: error.message || "Impossibile salvare le preferenze",
        variant: "destructive",
      });
    },
  });

  const folders = foldersData?.data || [];

  const toggleExclude = (folderName: string) => {
    setExcludedFolders(prev =>
      prev.includes(folderName)
        ? prev.filter(f => f !== folderName)
        : [...prev, folderName]
    );
  };

  const toggleInclude = (folderName: string) => {
    setIncludedFolders(prev =>
      prev.includes(folderName)
        ? prev.filter(f => f !== folderName)
        : [...prev, folderName]
    );
  };

  const isLoading = loadingFolders || loadingPrefs;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div>
          <h3 className="font-medium mb-1">Modalità di Sincronizzazione</h3>
          <p className="text-xs text-muted-foreground">
            Scegli quali cartelle sincronizzare durante il download delle email.
          </p>
        </div>

        <RadioGroup value={syncMode} onValueChange={(v) => setSyncMode(v as SyncMode)} className="space-y-2">
          <div className="flex items-start space-x-3">
            <RadioGroupItem value="blacklist" id="mode-blacklist" className="mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="mode-blacklist" className="font-medium cursor-pointer text-sm">
                Tutte le cartelle (eccetto quelle escluse)
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Scarica tutte le cartelle tranne quelle che selezioni
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <RadioGroupItem value="whitelist" id="mode-whitelist" className="mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="mode-whitelist" className="font-medium cursor-pointer text-sm">
                Solo cartelle selezionate
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Scarica SOLO le cartelle che selezioni
              </p>
            </div>
          </div>
        </RadioGroup>
      </div>

      <Separator className="bg-border/30" />

      <div className="space-y-2">
        <h4 className="text-sm font-medium">
          {syncMode === 'blacklist' ? 'Cartelle da Escludere' : 'Cartelle da Includere'}
        </h4>
        
        <ScrollArea className="max-h-[40vh] rounded-lg p-1">
          <div className="space-y-0.5">
            {folders.map((folder: any) => {
              const isRecommendedExclude = RECOMMENDED_EXCLUDES.includes(folder.name);
              const isChecked = syncMode === 'blacklist'
                ? excludedFolders.includes(folder.name)
                : includedFolders.includes(folder.name);

              return (
                <div
                  key={folder.name}
                  className="flex items-center justify-between py-2 px-1 hover:bg-muted/30 rounded transition-colors"
                >
                  <div className="flex items-center space-x-2 flex-1">
                    <Checkbox
                      id={`folder-${folder.name}`}
                      checked={isChecked}
                      onCheckedChange={() => {
                        if (syncMode === 'blacklist') {
                          toggleExclude(folder.name);
                        } else {
                          toggleInclude(folder.name);
                        }
                      }}
                    />
                    <Label
                      htmlFor={`folder-${folder.name}`}
                      className="flex-1 cursor-pointer font-normal text-sm"
                    >
                      {folder.name}
                    </Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {folder.total_messages > 0 && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {folder.total_messages}
                      </Badge>
                    )}
                    {syncMode === 'blacklist' && isRecommendedExclude && !isChecked && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        Consigliato
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <Separator className="bg-border/30" />

        <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
          <Check className="h-3 w-3" />
          {syncMode === 'blacklist' ? (
            <span>
              <strong>{folders.length - excludedFolders.length}</strong> cartelle ({excludedFolders.length} escluse)
            </span>
          ) : (
            <span>
              <strong>{includedFolders.length}</strong> cartelle selezionate
            </span>
          )}
        </div>
      </div>

      {showButtons && (
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvataggio...
              </>
            ) : (
              'Salva Preferenze'
            )}
          </Button>
        </div>
      )}
    </div>
  );
};
