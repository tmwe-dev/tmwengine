import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Inbox, Send, Archive, Trash2, AlertCircle, FolderOpen } from 'lucide-react';
import { emailFolderApi, emailMessageApi } from '@/lib/tmwe-api-integrated';
import { toast } from 'sonner';

interface FolderInfo {
  name: string;
  emailCount: number;
  selected: boolean;
}

interface FolderSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartSync: (selectedFolders: string[]) => void;
  defaultExcluded?: string[];
}

export const FolderSelectionDialog = ({
  open,
  onOpenChange,
  onStartSync,
  defaultExcluded = ['Trash', 'Archives', 'Junk', 'Spam', 'Drafts']
}: FolderSelectionDialogProps) => {
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectAll, setSelectAll] = useState(true);

  // Quick exclusion toggles
  const [excludeTrash, setExcludeTrash] = useState(true);
  const [excludeArchives, setExcludeArchives] = useState(true);
  const [excludeJunk, setExcludeJunk] = useState(true);
  const [excludeDrafts, setExcludeDrafts] = useState(true);

  useEffect(() => {
    if (open) {
      loadFolders();
    }
  }, [open]);

  const loadFolders = async () => {
    console.log('🔄 [FolderDialog] Starting loadFolders...');
    setLoading(true);
    try {
      console.log('📡 [FolderDialog] Calling emailFolderApi.getFolders()...');
      const foldersResponse = await emailFolderApi.getFolders();
      
      console.log('📥 [FolderDialog] API Response:', foldersResponse);
      console.log('📁 [FolderDialog] Response.data:', foldersResponse.data);
      console.log('📊 [FolderDialog] Type of data:', typeof foldersResponse.data);
      
      // Handle both array and object responses
      let folderList = [];
      
      if (Array.isArray(foldersResponse.data)) {
        folderList = foldersResponse.data;
        console.log('✅ [FolderDialog] Data is array, length:', folderList.length);
      } else if (foldersResponse.folders && Array.isArray(foldersResponse.folders)) {
        folderList = foldersResponse.folders;
        console.log('✅ [FolderDialog] Using response.folders, length:', folderList.length);
      } else if (foldersResponse.data?.folders && Array.isArray(foldersResponse.data.folders)) {
        folderList = foldersResponse.data.folders;
        console.log('✅ [FolderDialog] Using data.folders, length:', folderList.length);
      } else {
        console.error('❌ [FolderDialog] Unexpected response format:', foldersResponse);
      }

      console.log(`📂 [FolderDialog] Processing ${folderList.length} folders...`);

      if (folderList.length === 0) {
        console.warn('⚠️ [FolderDialog] NO FOLDERS FOUND!');
        toast.error('Nessuna cartella trovata');
        setFolders([]);
        return;
      }

      const foldersWithCounts = await Promise.all(
        folderList.map(async (folder, index) => {
          try {
            const folderName = folder.name || folder;
            console.log(`📧 [FolderDialog] [${index + 1}/${folderList.length}] Getting count for: ${folderName}`);
            
            const count = await emailMessageApi.getTotalEmailCount({ 
              folder: folderName 
            });
            
            console.log(`✅ [FolderDialog] ${folderName}: ${count} emails`);
            
            // Check if folder should be excluded by default
            const shouldExclude = defaultExcluded.some(excluded => 
              folderName.toLowerCase().includes(excluded.toLowerCase())
            );

            return {
              name: folderName,
              emailCount: count,
              selected: !shouldExclude
            };
          } catch (err) {
            const folderName = folder.name || folder;
            console.error(`❌ [FolderDialog] Error getting count for ${folderName}:`, err);
            return {
              name: folderName,
              emailCount: 0,
              selected: false
            };
          }
        })
      );

      console.log('🎯 [FolderDialog] Final folders with counts:', foldersWithCounts);
      setFolders(foldersWithCounts);
    } catch (error) {
      console.error('❌ [FolderDialog] Error loading folders:', error);
      toast.error('Errore nel caricamento delle cartelle');
    } finally {
      setLoading(false);
      console.log('✅ [FolderDialog] loadFolders completed');
    }
  };

  const getFolderIcon = (folderName: string) => {
    const name = folderName.toLowerCase();
    if (name.includes('inbox')) return <Inbox className="h-4 w-4" />;
    if (name.includes('sent')) return <Send className="h-4 w-4" />;
    if (name.includes('archive')) return <Archive className="h-4 w-4" />;
    if (name.includes('trash') || name.includes('deleted')) return <Trash2 className="h-4 w-4" />;
    if (name.includes('junk') || name.includes('spam')) return <AlertCircle className="h-4 w-4" />;
    return <FolderOpen className="h-4 w-4" />;
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    setFolders(prev => prev.map(f => ({ ...f, selected: checked })));
  };

  const handleFolderToggle = (folderName: string) => {
    setFolders(prev => prev.map(f => 
      f.name === folderName ? { ...f, selected: !f.selected } : f
    ));
  };

  const handleQuickExclusion = (type: 'trash' | 'archives' | 'junk' | 'drafts', exclude: boolean) => {
    setFolders(prev => prev.map(f => {
      const name = f.name.toLowerCase();
      let shouldUpdate = false;

      switch (type) {
        case 'trash':
          shouldUpdate = name.includes('trash') || name.includes('deleted');
          break;
        case 'archives':
          shouldUpdate = name.includes('archive');
          break;
        case 'junk':
          shouldUpdate = name.includes('junk') || name.includes('spam');
          break;
        case 'drafts':
          shouldUpdate = name.includes('draft');
          break;
      }

      return shouldUpdate ? { ...f, selected: !exclude } : f;
    }));
  };

  useEffect(() => {
    handleQuickExclusion('trash', excludeTrash);
  }, [excludeTrash]);

  useEffect(() => {
    handleQuickExclusion('archives', excludeArchives);
  }, [excludeArchives]);

  useEffect(() => {
    handleQuickExclusion('junk', excludeJunk);
  }, [excludeJunk]);

  useEffect(() => {
    handleQuickExclusion('drafts', excludeDrafts);
  }, [excludeDrafts]);

  const selectedFolders = folders.filter(f => f.selected);
  const totalEmails = selectedFolders.reduce((sum, f) => sum + f.emailCount, 0);
  const estimatedMinutes = Math.ceil(totalEmails / 150); // 150 emails per minute average

  const handleStartSync = () => {
    const selected = folders.filter(f => f.selected).map(f => f.name);
    
    console.log('🚀 [FolderDialog] handleStartSync called');
    console.log('📁 [FolderDialog] Selected folders:', selected);
    console.log('📊 [FolderDialog] Total selected:', selected.length);
    
    if (selected.length === 0) {
      toast.error('Seleziona almeno una cartella');
      return;
    }
    
    // Chiudi il dialog PRIMA di avviare la sincronizzazione
    onOpenChange(false);
    
    // Avvia la sincronizzazione dopo un breve delay per permettere la chiusura completa del dialog
    setTimeout(() => {
      onStartSync(selected);
    }, 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Seleziona cartelle da sincronizzare</DialogTitle>
          <DialogDescription>
            Scegli quali cartelle email scaricare. Le cartelle escluse di default sono suggerite.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Caricamento cartelle...</span>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {/* Select All Toggle */}
              <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
                <Checkbox
                  id="select-all"
                  checked={selectAll}
                  onCheckedChange={handleSelectAll}
                />
                <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                  Seleziona tutto / Deseleziona tutto
                </label>
              </div>

              {/* Quick Exclusion Toggles */}
              <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                <p className="text-sm font-medium mb-2">Cartelle suggerite da escludere:</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="exclude-trash"
                      checked={excludeTrash}
                      onCheckedChange={(checked) => setExcludeTrash(checked === true)}
                    />
                    <label htmlFor="exclude-trash" className="text-sm cursor-pointer">
                      ❌ Cestino (Trash)
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="exclude-archives"
                      checked={excludeArchives}
                      onCheckedChange={(checked) => setExcludeArchives(checked === true)}
                    />
                    <label htmlFor="exclude-archives" className="text-sm cursor-pointer">
                      ❌ Archivi (Archives)
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="exclude-junk"
                      checked={excludeJunk}
                      onCheckedChange={(checked) => setExcludeJunk(checked === true)}
                    />
                    <label htmlFor="exclude-junk" className="text-sm cursor-pointer">
                      ❌ Spam (Junk)
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="exclude-drafts"
                      checked={excludeDrafts}
                      onCheckedChange={(checked) => setExcludeDrafts(checked === true)}
                    />
                    <label htmlFor="exclude-drafts" className="text-sm cursor-pointer">
                      ❌ Bozze (Drafts)
                    </label>
                  </div>
                </div>
              </div>

              {/* Folder List */}
              <ScrollArea className="h-[300px] border rounded-lg p-4">
                <div className="space-y-2">
                  {folders.map((folder) => (
                    <div
                      key={folder.name}
                      className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-md transition-colors"
                    >
                      <Checkbox
                        id={`folder-${folder.name}`}
                        checked={folder.selected}
                        onCheckedChange={() => handleFolderToggle(folder.name)}
                      />
                      <label
                        htmlFor={`folder-${folder.name}`}
                        className="flex-1 flex items-center space-x-2 cursor-pointer"
                      >
                        {getFolderIcon(folder.name)}
                        <span className="text-sm font-medium">{folder.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({folder.emailCount} email)
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Summary */}
              <div className="p-3 bg-primary/10 rounded-lg space-y-1">
                <p className="text-sm font-medium">
                  📊 Totale: <span className="text-primary">{totalEmails.toLocaleString()}</span> email da {selectedFolders.length} cartelle
                </p>
                <p className="text-xs text-muted-foreground">
                  ⏱️ Tempo stimato: ~{estimatedMinutes} minuti
                </p>
              </div>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button
            onClick={handleStartSync}
            disabled={loading || selectedFolders.length === 0}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Caricamento...
              </>
            ) : (
              'Avvia sincronizzazione'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
