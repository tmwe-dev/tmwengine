import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getSyncPreferences, saveSyncPreferences } from '@/lib/email-sync-preferences';

interface EmailSyncPreferencesProps {
  userEmail: string;
  onClose?: () => void;
  showButtons?: boolean;
  onSave?: () => void;
  compact?: boolean;
}

export function EmailSyncPreferences({
  userEmail,
  onClose,
  showButtons = true,
  onSave,
  compact = false,
}: EmailSyncPreferencesProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [includedFolders, setIncludedFolders] = useState<string[]>([]);

  // Fetch available folders
  const { data: foldersData, isLoading: loadingFolders } = useQuery({
    queryKey: ['email-folders', userEmail],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-folders', {
        body: { email: userEmail },
      });
      if (error) throw error;
      return data.folders || [];
    },
  });

  // Fetch existing preferences
  const { data: preferences, isLoading: loadingPreferences } = useQuery({
    queryKey: ['sync-preferences', userEmail],
    queryFn: () => getSyncPreferences(userEmail),
  });

  // Initialize state from preferences with smart defaults
  useEffect(() => {
    if (preferences && foldersData) {
      if (preferences.included_folders.length > 0) {
        // User has already saved preferences
        setIncludedFolders(preferences.included_folders);
      } else {
        // First time: pre-select all except Trash/Junk/Drafts
        const recommended = foldersData
          .map((f: any) => f.name)
          .filter((name: string) => !['Trash', 'Junk', 'Drafts'].includes(name));
        setIncludedFolders(recommended);
      }
    }
  }, [preferences, foldersData]);

  // Save preferences mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      await saveSyncPreferences(userEmail, {
        excluded_folders: [], // Always empty now
        included_folders: includedFolders,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-preferences', userEmail] });
      toast({
        title: "✅ Preferenze salvate",
        description: `${includedFolders.length} cartelle selezionate per la sincronizzazione`,
      });
      onSave?.();
      onClose?.();
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Errore salvataggio",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Toggle folder selection
  const toggleFolder = (folderName: string) => {
    setIncludedFolders(prev =>
      prev.includes(folderName)
        ? prev.filter(f => f !== folderName)
        : [...prev, folderName]
    );
  };

  const isLoading = loadingFolders || loadingPreferences;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const folders = foldersData || [];

  return (
    <div className={`space-y-4 ${compact ? 'p-2' : 'p-6'}`}>
      <div>
        <h3 className="text-lg font-semibold mb-2">
          Seleziona Cartelle da Sincronizzare
        </h3>
        <p className="text-sm text-muted-foreground">
          Spunta le cartelle che vuoi sincronizzare. Le cartelle non selezionate verranno ignorate.
        </p>
      </div>

      <ScrollArea className={compact ? 'h-[300px]' : 'h-[400px]'}>
        <div className="space-y-2 pr-4">
          {folders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nessuna cartella disponibile
            </p>
          ) : (
            folders.map((folder: any) => {
              const isSelected = includedFolders.includes(folder.name);
              
              return (
                <div
                  key={folder.name}
                  className="flex items-center space-x-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <Checkbox
                    id={`folder-${folder.name}`}
                    checked={isSelected}
                    onCheckedChange={() => toggleFolder(folder.name)}
                  />
                  <label
                    htmlFor={`folder-${folder.name}`}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="font-medium">{folder.name}</div>
                    {folder.unread_count !== undefined && (
                      <div className="text-xs text-muted-foreground">
                        {folder.unread_count} non lette / {folder.total_count || 0} totali
                      </div>
                    )}
                  </label>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      <div className="pt-4 border-t">
        <p className="text-sm font-medium text-muted-foreground">
          ✓ {includedFolders.length} cartelle selezionate per la sincronizzazione
        </p>
      </div>

      {showButtons && (
        <div className="flex gap-3 pt-2">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="flex-1"
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
          {onClose && (
            <Button
              variant="outline"
              onClick={onClose}
              disabled={saveMutation.isPending}
            >
              Annulla
            </Button>
          )}
        </div>
      )}
    </div>
  );
}