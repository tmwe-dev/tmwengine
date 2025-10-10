import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFolderList } from '@/hooks/useFolderList';
import { useMultiFolderSync } from '@/hooks/useMultiFolderSync';
import { SyncProgressMulti } from './SyncProgressMulti';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Inbox, Send, FileText, Trash2, Archive, Folder, Database, AlertTriangle, Save, ArrowUpDown, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FolderSyncManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFolder?: string;
}

export const FolderSyncManager = ({ open, onOpenChange, currentFolder }: FolderSyncManagerProps) => {
  const { folders, loading: loadingFolders, reload: reloadFolders } = useFolderList();
  const { isSyncing, progress, results, startMultiSync, stopSync, reset } = useMultiFolderSync();
  
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [dateFilterMonths, setDateFilterMonths] = useState<number>(24);
  const [syncMode, setSyncMode] = useState<'smart' | 'full'>('smart');
  const [excludedFolders, setExcludedFolders] = useState<string[]>([
    'Trash', 'Archives', 'Junk', 'Drafts', 'Spam'
  ]);
  const [sortBy, setSortBy] = useState<'name' | 'emails'>('name');

  // Load user preferences
  useEffect(() => {
    if (open) {
      loadPreferences();
    }
  }, [open]);

  const loadPreferences = async () => {
    const userEmail = sessionStorage.getItem('tmwe_user_email');
    if (!userEmail) return;

    const { data } = await supabase
      .from('user_sync_preferences')
      .select('*')
      .eq('user_email', userEmail)
      .maybeSingle();

    if (data) {
      setExcludedFolders(Array.isArray(data.excluded_folders) ? data.excluded_folders as string[] : []);
      setDateFilterMonths(data.date_filter_months || 24);
      setSyncMode(data.default_sync_mode as 'smart' | 'full' || 'smart');
      
      // Auto-select included folders
      if (data.included_folders && Array.isArray(data.included_folders)) {
        setSelectedFolders(data.included_folders as string[]);
      }
    }
  };

  const savePreferences = async () => {
    const userEmail = sessionStorage.getItem('tmwe_user_email');
    if (!userEmail) {
      toast.error('Utente non autenticato');
      return;
    }

    const { error } = await supabase
      .from('user_sync_preferences')
      .upsert({
        user_email: userEmail,
        excluded_folders: excludedFolders,
        included_folders: selectedFolders,
        date_filter_months: dateFilterMonths,
        default_sync_mode: syncMode,
      }, {
        onConflict: 'user_email'
      });

    if (error) {
      toast.error('Errore salvataggio preferenze');
      console.error(error);
    } else {
      toast.success('Preferenze salvate');
    }
  };

  const handleFolderToggle = (folderName: string) => {
    setSelectedFolders(prev => 
      prev.includes(folderName)
        ? prev.filter(f => f !== folderName)
        : [...prev, folderName]
    );
  };

  const handleSelectAll = () => {
    const availableFolders = folders
      .filter(f => !excludedFolders.includes(f.name))
      .map(f => f.name);
    setSelectedFolders(availableFolders);
  };

  const handleDeselectAll = () => {
    setSelectedFolders([]);
  };

  const handleStartSync = async () => {
    if (selectedFolders.length === 0) {
      toast.error('Seleziona almeno una cartella');
      return;
    }

    await startMultiSync({
      folders: selectedFolders,
      dateFilterMonths: dateFilterMonths,
      mode: syncMode,
    });
  };

  const folderIcons: Record<string, any> = {
    'INBOX': Inbox,
    'Sent': Send,
    'Drafts': FileText,
    'Trash': Trash2,
    'Junk': Trash2,
    'Archives': Archive,
  };

  const getFolderIcon = (folderName: string) => {
    if (folderIcons[folderName]) return folderIcons[folderName];
    
    for (const [key, icon] of Object.entries(folderIcons)) {
      if (folderName.startsWith(key)) return icon;
    }
    
    return Folder;
  };

  const availableFolders = folders.filter(f => !excludedFolders.includes(f.name));
  
  const sortedFolders = [...availableFolders].sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    } else {
      return (b.messageCount || 0) - (a.messageCount || 0);
    }
  });

  const totalSelectedEmails = folders
    .filter(f => selectedFolders.includes(f.name))
    .reduce((sum, f) => sum + f.messageCount, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Gestione Sincronizzazione Multi-Cartella
          </DialogTitle>
          <DialogDescription>
            Seleziona le cartelle da sincronizzare e configura le opzioni di download
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Folder Selection */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold flex items-center gap-2">
                <Folder className="h-4 w-4" />
                Cartelle Disponibili
              </h3>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSortBy(sortBy === 'name' ? 'emails' : 'name')}
                  className="h-8 px-2"
                >
                  <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
                  {sortBy === 'name' ? 'Nome' : 'Email'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  Tutte
                </Button>
                <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                  Nessuna
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[300px] border rounded-md p-4">
              {loadingFolders ? (
                <p className="text-sm text-muted-foreground">Caricamento cartelle...</p>
              ) : (
                <div className="space-y-2">
                  {sortedFolders.map((folder) => {
                    const Icon = getFolderIcon(folder.name);
                    return (
                      <div
                        key={folder.name}
                        className="flex items-center justify-between p-2 hover:bg-accent rounded-md"
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedFolders.includes(folder.name)}
                            onCheckedChange={() => handleFolderToggle(folder.name)}
                          />
                          <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                          <Label className="cursor-pointer">
                            {folder.name}
                          </Label>
                        </div>
                        <div className="flex gap-2">
                          {folder.unreadCount > 0 && (
                            <Badge variant="secondary" className="bg-transparent border border-primary text-primary">
                              {folder.unreadCount}
                            </Badge>
                          )}
                          <span className="text-sm text-muted-foreground">
                            {folder.messageCount}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {selectedFolders.length > 0 && (
              <Alert>
                <AlertDescription>
                  <strong>{selectedFolders.length}</strong> cartelle selezionate
                  con circa <strong>{totalSelectedEmails}</strong> email totali
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Right: Options & Progress */}
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-3">Filtro Temporale</h3>
              <RadioGroup
                value={dateFilterMonths.toString()}
                onValueChange={(v) => setDateFilterMonths(parseInt(v))}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="6" id="6months" />
                  <Label htmlFor="6months">Ultimi 6 mesi</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="12" id="1year" />
                  <Label htmlFor="1year">Ultimo anno</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="24" id="2years" />
                  <Label htmlFor="2years">Ultimi 2 anni</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="999" id="all" />
                  <Label htmlFor="all">Tutte le email</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Modalità Sincronizzazione</h3>
              <RadioGroup value={syncMode} onValueChange={(v) => setSyncMode(v as 'smart' | 'full')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="smart" id="smart" />
                  <Label htmlFor="smart">Smart Sync (solo nuove email)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="full" id="full" />
                  <Label htmlFor="full">Download Completo</Label>
                </div>
              </RadioGroup>

              {syncMode === 'full' && (
                <Alert variant="destructive" className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Il download completo scaricherà TUTTE le email, anche quelle già presenti
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Progress */}
            {isSyncing && (
              <SyncProgressMulti
                currentFolder={progress.currentFolder}
                currentFolderIndex={progress.currentFolderIndex}
                totalFolders={progress.totalFolders}
                results={results}
                processedEmails={progress.processedEmails}
              />
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              {!isSyncing ? (
                <>
                  <Button
                    onClick={handleStartSync}
                    disabled={selectedFolders.length === 0}
                    className="flex-1"
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Avvia Sincronizzazione
                  </Button>
                  <Button
                    onClick={savePreferences}
                    variant="outline"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Salva
                  </Button>
                </>
              ) : (
                <Button
                  onClick={stopSync}
                  variant="destructive"
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Interrompi Sincronizzazione
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
