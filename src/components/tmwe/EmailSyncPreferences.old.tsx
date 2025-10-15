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
  compact?: boolean;
}

type SyncMode = 'blacklist' | 'whitelist';

const RECOMMENDED_EXCLUDES = ["Trash", "Archives", "Junk", "Drafts"];

export const EmailSyncPreferences = ({ 
  userEmail,
  onClose,
  showButtons = true,
  onSave,
  compact = false
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

  const handleFolderToggle = (folderName: string) => {
    if (syncMode === 'blacklist') {
      toggleExclude(folderName);
    } else {
      toggleInclude(folderName);
    }
  };

  const isLoading = loadingFolders || loadingPrefs;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredCount = syncMode === 'blacklist' 
    ? folders.length - excludedFolders.length 
    : includedFolders.length;

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div className={compact ? "space-y-1" : "space-y-2"}>
        <div>
          <h3 className={compact ? "text-sm font-medium" : "font-medium mb-1"}>
            Modalità di Sincronizzazione
          </h3>
          {!compact && (
            <p className="text-xs text-muted-foreground">
              Scegli come gestire le cartelle da sincronizzare
            </p>
          )}
        </div>

        <RadioGroup value={syncMode} onValueChange={(value: any) => setSyncMode(value)}>
          <div className={compact ? "flex items-center space-x-2 py-0.5" : "flex items-center space-x-2 py-1.5"}>
            <RadioGroupItem value="blacklist" id="blacklist" />
            <Label htmlFor="blacklist" className={compact ? "cursor-pointer text-xs" : "cursor-pointer text-sm"}>
              Tutte (eccetto escluse)
            </Label>
          </div>
          <div className={compact ? "flex items-center space-x-2 py-0.5" : "flex items-center space-x-2 py-1.5"}>
            <RadioGroupItem value="whitelist" id="whitelist" />
            <Label htmlFor="whitelist" className={compact ? "cursor-pointer text-xs" : "cursor-pointer text-sm"}>
              Solo selezionate
            </Label>
          </div>
        </RadioGroup>
      </div>

      <Separator className="bg-border/30" />

      <div className={compact ? "space-y-1" : "space-y-2"}>
        <h4 className={compact ? "text-xs font-medium" : "text-sm font-medium"}>
          {syncMode === 'blacklist' ? 'Cartelle da Escludere' : 'Cartelle da Includere'}
        </h4>
        
        <ScrollArea className={compact ? "max-h-[50vh] rounded-lg p-1" : "h-[400px] rounded-lg p-1"}>
          <div className="space-y-0.5">
            {folders.map((folder: any) => {
              const isRecommendedExclude = RECOMMENDED_EXCLUDES.includes(folder.name);
              const isSelected = syncMode === 'blacklist'
                ? excludedFolders.includes(folder.name)
                : includedFolders.includes(folder.name);

              return (
                <div key={folder.id} className={compact ? "flex items-center gap-2 py-0.5 px-1 hover:bg-accent/50 rounded-sm transition-colors" : "flex items-center gap-2 py-1 px-1 hover:bg-accent/50 rounded-sm transition-colors"}>
                  <Checkbox
                    id={`folder-${folder.id}`}
                    checked={isSelected}
                    onCheckedChange={() => handleFolderToggle(folder.name)}
                    className="h-4 w-4"
                  />
                  <Label 
                    htmlFor={`folder-${folder.id}`} 
                    className={compact ? "flex-1 cursor-pointer text-xs flex items-center gap-1.5" : "flex-1 cursor-pointer text-sm flex items-center gap-1.5"}
                  >
                    <span>{folder.name}</span>
                    {isRecommendedExclude && syncMode === 'blacklist' && (
                      <Badge variant="secondary" className="text-[9px] h-4 px-1">
                        Consigliato
                      </Badge>
                    )}
                  </Label>
                  {folder.total_messages > 0 && (
                    <Badge variant="outline" className="text-[9px] h-4 px-1.5">
                      {folder.total_messages}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {!compact && (
          <div className="text-xs text-muted-foreground pt-1">
            {syncMode === 'blacklist' 
              ? `✓ ${filteredCount} cartelle saranno sincronizzate`
              : `✓ ${filteredCount} cartelle selezionate`
            }
          </div>
        )}
      </div>

      {showButtons && (
        <>
          <Separator className="bg-border/30" />
          <div className="flex justify-end gap-3 pt-2">
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
        </>
      )}
    </div>
  );
};