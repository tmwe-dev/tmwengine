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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, ChevronRight } from 'lucide-react';

interface EmailSyncPreferencesProps {
  userEmail: string;
  onClose?: () => void;
  showButtons?: boolean;
  onSave?: () => void;
  compact?: boolean;
}

type SyncMode = 'blacklist' | 'whitelist';

const RECOMMENDED_EXCLUDES = ["Trash", "Archives", "Junk", "Drafts"];

interface FolderNode {
  name: string;
  fullPath: string;
  children: FolderNode[];
  data: any | null;
  level: number;
}

const buildFolderTree = (folders: any[]): FolderNode[] => {
  const tree: Record<string, FolderNode> = {};
  
  folders.forEach(folder => {
    const parts = folder.name.split('/');
    let currentPath = '';
    
    parts.forEach((part, index) => {
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      
      if (!tree[currentPath]) {
        tree[currentPath] = {
          name: part,
          fullPath: currentPath,
          children: [],
          data: index === parts.length - 1 ? folder : null,
          level: index
        };
      }
      
      if (parentPath && tree[parentPath]) {
        if (!tree[parentPath].children.find(c => c.fullPath === currentPath)) {
          tree[parentPath].children.push(tree[currentPath]);
        }
      }
    });
  });
  
  return Object.values(tree).filter(node => node.level === 0);
};

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
  const [openFolders, setOpenFolders] = useState<string[]>([]); // Traccia accordion aperti

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

  // Query per contare email nel DB per cartella
  const { data: folderDbCounts } = useQuery({
    queryKey: ['folder-db-counts', userEmail],
    queryFn: async () => {
      if (!userEmail) return {};
      
      const { data: counts } = await supabase
        .from('email_messages')
        .select('cartella')
        .eq('user_email', userEmail);

      if (!counts) return {};

      const countMap: Record<string, number> = {};
      counts.forEach((row: any) => {
        countMap[row.cartella] = (countMap[row.cartella] || 0) + 1;
      });

      return countMap;
    },
    enabled: !!userEmail,
    staleTime: 10 * 1000,
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
  const folderTree = buildFolderTree(folders);

  // Apri tutti gli accordion all'inizio
  useEffect(() => {
    if (folderTree.length > 0 && openFolders.length === 0) {
      const allFolderPaths = (tree: FolderNode[]): string[] => {
        return tree.flatMap(node => {
          if (node.children.length > 0) {
            return [node.fullPath, ...allFolderPaths(node.children)];
          }
          return [];
        });
      };
      setOpenFolders(allFolderPaths(folderTree));
    }
  }, [folderTree]);

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

  const renderFolderNode = (node: FolderNode): JSX.Element => {
    const hasChildren = node.children.length > 0;
    const isLeaf = node.data !== null;
    
    // Calcola totale email per nodo (inclusi figli)
    const calculateServerTotal = (n: FolderNode): number => {
      if (n.data) {
        return n.data.total_messages || 0;
      }
      return n.children.reduce((sum, child) => sum + calculateServerTotal(child), 0);
    };
    
    const serverTotal = calculateServerTotal(node);
    const dbTotal = folderDbCounts?.[node.fullPath] || 0;
    const syncPercentage = serverTotal > 0 ? Math.round((dbTotal / serverTotal) * 100) : 100;
    const isSynced = dbTotal >= serverTotal;
    
    const isRecommendedExclude = RECOMMENDED_EXCLUDES.includes(node.fullPath);
    const isSelected = syncMode === 'blacklist'
      ? excludedFolders.includes(node.fullPath)
      : includedFolders.includes(node.fullPath);
    
    if (!hasChildren) {
      // Foglia: checkbox normale
      return (
        <div 
          key={node.fullPath} 
          className={compact 
            ? "flex items-center gap-2 py-0.5 px-1 hover:bg-accent/50 rounded-sm transition-colors" 
            : "flex items-center gap-2 py-1 px-1 hover:bg-accent/50 rounded-sm transition-colors"
          }
        >
          <Checkbox
            id={`folder-${node.fullPath}`}
            checked={isSelected}
            onCheckedChange={() => handleFolderToggle(node.fullPath)}
            className="h-4 w-4"
          />
          <Label 
            htmlFor={`folder-${node.fullPath}`} 
            className={compact 
              ? "flex-1 cursor-pointer text-xs flex items-center gap-1.5" 
              : "flex-1 cursor-pointer text-sm flex items-center gap-1.5"
            }
          >
            <span>{node.name}</span>
            {isRecommendedExclude && syncMode === 'blacklist' && (
              <Badge variant="secondary" className="text-[9px] h-4 px-1">
                Consigliato
              </Badge>
            )}
          </Label>
          
          {/* Server/DB counts */}
          <div className="flex items-center gap-1">
            {serverTotal > 0 && (
              <>
                <Badge 
                  variant="outline" 
                  className="text-[9px] h-4 px-1.5"
                  title="Email sul server"
                >
                  {serverTotal}
                </Badge>
                
                {!isSynced && (
                  <>
                    <span className="text-[8px] text-muted-foreground">•</span>
                    <Badge 
                      variant="secondary" 
                      className="text-[9px] h-4 px-1.5"
                      title="Email nel DB locale"
                    >
                      {dbTotal}
                    </Badge>
                    <span 
                      className="text-[8px] text-muted-foreground"
                      title={`Sincronizzato al ${syncPercentage}%`}
                    >
                      ({syncPercentage}%)
                    </span>
                  </>
                )}
                
                {isSynced && (
                  <Check className="h-3 w-3 text-green-600 ml-0.5" />
                )}
              </>
            )}
          </div>
        </div>
      );
    }
    
    // Nodo con figli: Accordion
    return (
      <AccordionItem key={node.fullPath} value={node.fullPath} className="border-none">
        <AccordionTrigger 
          className={compact 
            ? "py-1 px-1 hover:bg-accent/50 text-xs hover:no-underline rounded-sm transition-colors" 
            : "py-1 px-1 hover:bg-accent/50 text-sm hover:no-underline rounded-sm transition-colors"
          }
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="font-medium">{node.name}</span>
            <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-muted">
              {node.children.length} {node.children.length === 1 ? 'cartella' : 'cartelle'}
            </Badge>
            {serverTotal > 0 && (
              <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                {serverTotal} email
              </Badge>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="pl-4 pb-0">
          <div className="space-y-0.5">
            {node.children.map(child => renderFolderNode(child))}
          </div>
        </AccordionContent>
      </AccordionItem>
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
          <Accordion 
            type="multiple" 
            className="space-y-0.5"
            value={openFolders}
            onValueChange={setOpenFolders}
          >
            {folderTree.map(node => renderFolderNode(node))}
          </Accordion>
        </ScrollArea>

        <div className="text-xs text-muted-foreground pt-1 flex items-center justify-between">
          <span>
            {syncMode === 'blacklist' 
              ? `✓ ${filteredCount} cartelle saranno sincronizzate`
              : `✓ ${filteredCount} cartelle selezionate`
            }
          </span>
          <span className="text-[10px]">
            Totale: {folders.length} cartelle
          </span>
        </div>
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
