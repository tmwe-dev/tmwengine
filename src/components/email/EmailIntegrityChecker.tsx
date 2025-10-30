import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { emailFolderApi } from '@/lib/tmwe-api-integrated';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RefreshCw, Loader2, Lock, LockOpen, Zap, ChevronRight, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { getSyncPreferences, saveSyncPreferences } from '@/lib/email-sync-preferences';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface FolderComparison {
  folderName: string;
  displayName: string;
  level: number;
  parentPath: string | null;
  hasChildren: boolean;
  children: FolderComparison[];
  serverCount: number;
  dbCount: number;
  missing: number;
  syncPercentage: number;
  directServerCount: number;  // Conteggio solo cartella (senza figli)
  directDbCount: number;       // Conteggio solo cartella (senza figli)
}

interface EmailIntegrityCheckerProps {
  onRequestDownload?: (folderNames: string[]) => void;
}

export const EmailIntegrityChecker = ({ onRequestDownload }: EmailIntegrityCheckerProps) => {
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [excludedFolders, setExcludedFolders] = useState<string[]>([]);
  const [isPerfectSyncing, setIsPerfectSyncing] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
  
  // Toggle expand/collapse cartella
  const toggleExpand = (folderName: string) => {
    setExpandedFolders(prev => 
      prev.includes(folderName)
        ? prev.filter(f => f !== folderName)
        : [...prev, folderName]
    );
  };
  
  // Ottieni tutti i figli (ricorsivo) di una cartella
  const getAllChildren = (folder: FolderComparison, allFolders: FolderComparison[]): string[] => {
    const children: string[] = [];
    folder.children.forEach(child => {
      children.push(child.folderName);
      children.push(...getAllChildren(child, allFolders));
    });
    return children;
  };

  // Selezione CASCATA: selezionare padre → auto-seleziona tutti i figli
  const toggleFolderSelection = (folder: FolderComparison, allFolders: FolderComparison[]) => {
    const children = getAllChildren(folder, allFolders);
    const allToToggle = [folder.folderName, ...children];
    
    setSelectedFolders(prev => {
      const isSelected = prev.includes(folder.folderName);
      
      if (isSelected) {
        // Deseleziona padre e tutti i figli
        return prev.filter(f => !allToToggle.includes(f));
      } else {
        // Seleziona padre e tutti i figli (escludi bloccati)
        const toAdd = allToToggle.filter(f => !excludedFolders.includes(f));
        return [...prev, ...toAdd];
      }
    });
  };

  // Lucchetto CASCATA: bloccare padre → blocca anche tutti i figli
  const toggleLock = async (folder: FolderComparison, allFolders: FolderComparison[]) => {
    if (!userEmail) return;
    
    const children = getAllChildren(folder, allFolders);
    const allToLock = [folder.folderName, ...children];
    const isLocked = excludedFolders.includes(folder.folderName);
    
    const newExcluded = isLocked
      ? excludedFolders.filter(f => !allToLock.includes(f))  // Sblocca padre + figli
      : [...excludedFolders, ...allToLock];                   // Blocca padre + figli
    
    setExcludedFolders(newExcluded);
    
    // Rimuovi dalla selezione se erano selezionate
    if (!isLocked) {
      setSelectedFolders(prev => prev.filter(f => !allToLock.includes(f)));
    }
    
    try {
      await saveSyncPreferences(userEmail, {
        excluded_folders: newExcluded,
        included_folders: []
      });
      
      toast.success(
        isLocked
          ? `🔓 ${folder.folderName} sbloccata (+ ${children.length} sottocartelle)`
          : `🔒 ${folder.folderName} bloccata (+ ${children.length} sottocartelle)`
      );
    } catch (error: any) {
      console.error('Error saving lock preference:', error);
      toast.error('Errore salvataggio preferenze', {
        description: error.message
      });
      // Rollback
      setExcludedFolders(excludedFolders);
    }
  };

  const handlePerfectSync = async () => {
    setIsPerfectSyncing(true);
    
    try {
      toast.info(`🚀 Perfect Sync avviata`, {
        description: `Sincronizzazione di ${selectedFolders.length} cartelle...`
      });
      
      let totalSynced = 0;
      let successCount = 0;
      let errorCount = 0;
      
      for (const folder of selectedFolders) {
        console.log(`⚡ [PerfectSync] Syncing ${folder}...`);
        
        const { data, error } = await supabase.functions.invoke('tmwe-email-sync-master', {
          body: {
            mode: 'incremental',
            folder_name: folder,
            max_emails: 5000
          }
        });
        
        if (error) {
          console.error(`❌ [PerfectSync] Error syncing ${folder}:`, error);
          errorCount++;
          toast.error(`Errore sync ${folder}`, {
            description: error.message
          });
          continue;
        }
        
        const synced = data?.emails_downloaded || data?.synced_count || 0;
        totalSynced += synced;
        successCount++;
        console.log(`✅ [PerfectSync] ${folder}: ${synced} email scaricate`);
      }
      
      toast.success('✅ Perfect Sync completata!', {
        description: `${totalSynced} email scaricate in ${successCount} cartelle${errorCount > 0 ? ` (${errorCount} errori)` : ''}`
      });
      
      // Refresh tabella
      refetch();
      
      // Reset selezione
      setSelectedFolders([]);
      
    } catch (error: any) {
      console.error('❌ [PerfectSync] Fatal error:', error);
      toast.error('Errore Perfect Sync', {
        description: error.message
      });
    } finally {
      setIsPerfectSyncing(false);
    }
  };

  const { data: comparisons, isLoading, refetch, isRefetching, error, isSuccess } = useQuery<FolderComparison[], Error>({
    queryKey: ['email-integrity-check'],
    queryFn: async (): Promise<FolderComparison[]> => {
      console.log('🔍 [IntegrityCheck] Inizio verifica...');
      
      const { data: { user } } = await supabase.auth.getUser();
      console.log('🔍 [IntegrityCheck] User:', user?.id);
      
      if (!user) throw new Error('Non autenticato');

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tmwe_email')
        .eq('user_id', user.id)
        .single();
      
      console.log('🔍 [IntegrityCheck] Profile email:', profile?.tmwe_email);

      if (!profile?.tmwe_email) throw new Error('Email TMWE non configurata');

      // Salva email per uso nel toggleLock
      setUserEmail(profile.tmwe_email);

      // 1. Fetch conteggi server con GERARCHIA
      console.log('🔍 [IntegrityCheck] Fetching folders from server via emailFolderApi...');
      const serverFoldersResponse = await emailFolderApi.getFolders({ 
        include_counts: true,
        include_hierarchy: true,  // ✅ ATTIVA GERARCHIA
        skipCache: true
      });
      console.log('🔍 [IntegrityCheck] Server folders response:', serverFoldersResponse);
      console.log('🔍 [IntegrityCheck] Response keys:', Object.keys(serverFoldersResponse || {}));
      
      // La risposta potrebbe avere folders, data, o essere direttamente un array
      const serverFolders = serverFoldersResponse.folders 
        || serverFoldersResponse.data 
        || (Array.isArray(serverFoldersResponse) ? serverFoldersResponse : []);
      
      console.log('🔍 [IntegrityCheck] Extracted server folders:', serverFolders);
      console.log('🔍 [IntegrityCheck] Server folders count:', serverFolders.length);
      
      if (serverFolders.length > 0) {
        console.log('🔍 [IntegrityCheck] First folder structure:', serverFolders[0]);
      }

      // 2. Fetch conteggi DB locale
      console.log('🔍 [IntegrityCheck] Fetching DB counts...');
      const { data: dbCounts, error: dbError } = await supabase.rpc('get_email_folder_counts', {
        p_user_email: profile.tmwe_email,
        p_sync_status: 'fun_email_backup'
      });
      
      console.log('🔍 [IntegrityCheck] DB counts:', dbCounts);
      if (dbError) console.error('🔍 [IntegrityCheck] DB error:', dbError);

      const dbCountsMap = (dbCounts || []).reduce((acc: Record<string, number>, row: { cartella: string; count: number }) => {
        acc[row.cartella] = row.count;
        return acc;
      }, {});

      // 3. Costruisci gerarchia e confronta
      const buildHierarchy = (folders: any[]): FolderComparison[] => {
        const folderMap = new Map<string, FolderComparison>();
        const rootFolders: FolderComparison[] = [];
        
        // Prima passata: crea tutti i nodi
        folders.forEach((folder: any) => {
          const folderName = folder.name || folder.folder;
          const level = folder.level || 0;
          const parentPath = folder.parent || null;
          const displayName = folder.display_name || folderName.split('/').pop() || folderName;
          
          const directServerCount = folder.message_count || folder.total_count || folder.messages || folder.count || folder.total || 0;
          const directDbCount = dbCountsMap[folderName] || 0;
          
          const node: FolderComparison = {
            folderName,
            displayName,
            level,
            parentPath,
            hasChildren: false,
            children: [],
            directServerCount,
            directDbCount,
            serverCount: directServerCount,  // Sarà aggiornato con somma figli
            dbCount: directDbCount,          // Sarà aggiornato con somma figli
            missing: 0,
            syncPercentage: 0
          };
          
          folderMap.set(folderName, node);
        });
        
        // Seconda passata: collega padri e figli
        folderMap.forEach((node, key) => {
          if (node.parentPath && folderMap.has(node.parentPath)) {
            const parent = folderMap.get(node.parentPath)!;
            parent.children.push(node);
            parent.hasChildren = true;
          } else if (node.level === 0) {
            rootFolders.push(node);
          }
        });
        
        // Terza passata: calcola conteggi sommati (bottom-up)
        const calculateTotals = (node: FolderComparison): void => {
          if (node.children.length > 0) {
            node.children.forEach(calculateTotals);
            
            // Somma conteggi figli
            const childrenServerSum = node.children.reduce((sum, child) => sum + child.serverCount, 0);
            const childrenDbSum = node.children.reduce((sum, child) => sum + child.dbCount, 0);
            
            node.serverCount = node.directServerCount + childrenServerSum;
            node.dbCount = node.directDbCount + childrenDbSum;
          }
          
          node.missing = Math.max(0, node.serverCount - node.dbCount);
          node.syncPercentage = node.serverCount > 0 
            ? Math.round((node.dbCount / node.serverCount) * 100) 
            : 100;
          
          console.log(`🔍 [Hierarchy] "${node.folderName}" (L${node.level}): server=${node.serverCount} (direct=${node.directServerCount}), db=${node.dbCount}, missing=${node.missing}`);
        };
        
        rootFolders.forEach(calculateTotals);
        
        return rootFolders;
      };
      
      const hierarchicalResults = buildHierarchy(serverFolders);
      console.log('🔍 [IntegrityCheck] Hierarchical results:', hierarchicalResults);
      return hierarchicalResults;
    },
    enabled: true,
    refetchInterval: false,
    retry: 2
  });

  // Gestione toast per errori e successo
  useEffect(() => {
    if (error) {
      console.error('🔍 [IntegrityCheck] Query error:', error);
      toast.error('Errore verifica integrità', {
        description: error.message || 'Impossibile contattare il server'
      });
    }
  }, [error]);

  useEffect(() => {
    if (isSuccess && comparisons) {
      console.log('🔍 [IntegrityCheck] Query success!');
      toast.success('Verifica completata');
    }
  }, [isSuccess, comparisons]);

  // Carica preferenze sincronizzazione
  useEffect(() => {
    const loadPreferences = async () => {
      if (!userEmail) return;
      
      try {
        const prefs = await getSyncPreferences(userEmail);
        setExcludedFolders(prefs.excluded_folders);
        console.log('🔒 [IntegrityCheck] Loaded excluded folders:', prefs.excluded_folders);
      } catch (error) {
        console.error('Error loading sync preferences:', error);
      }
    };
    
    loadPreferences();
  }, [userEmail]);

  // Auto-espandi tutte le cartelle con figli quando comparisons è disponibile
  useEffect(() => {
    if (comparisons && comparisons.length > 0) {
      const allFoldersToExpand = allFolders
        .filter(f => f.hasChildren)
        .map(f => f.folderName);
      
      setExpandedFolders(allFoldersToExpand);
      console.log('🌳 [TreeView] Auto-expanded folders:', allFoldersToExpand);
    }
  }, [comparisons]);

  // Funzione helper: appiattisci albero per ottenere tutte le cartelle
  const flattenFolders = (folders: FolderComparison[]): FolderComparison[] => {
    const result: FolderComparison[] = [];
    
    const traverse = (nodes: FolderComparison[]) => {
      nodes.forEach(node => {
        result.push(node);
        if (node.children.length > 0) {
          traverse(node.children);
        }
      });
    };
    
    traverse(folders);
    return result;
  };

  const allFolders = comparisons ? flattenFolders(comparisons) : [];
  const totalServer = allFolders.reduce((sum, c) => sum + c.directServerCount, 0);
  const totalDB = allFolders.reduce((sum, c) => sum + c.directDbCount, 0);
  const totalMissing = allFolders.reduce((sum, c) => sum + c.missing, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>🔍 Verifica Integrità Email</CardTitle>
          <Button
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            size="sm"
          >
            {(isLoading || isRefetching) ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Verifica Ora
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Riepilogo Globale */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Totale Server</p>
            <p className="text-2xl font-bold">{totalServer}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Totale DB Locale</p>
            <p className="text-2xl font-bold">{totalDB}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Email Mancanti</p>
            <p className={`text-2xl font-bold ${totalMissing > 0 ? 'text-destructive' : 'text-green-500'}`}>
              {totalMissing}
            </p>
          </div>
        </div>

        {/* Mostra errore se presente */}
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
            <p className="text-sm text-destructive font-semibold">
              ⚠️ Errore durante la verifica
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {(error as Error).message}
            </p>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => refetch()} 
              className="mt-2"
            >
              🔄 Riprova
            </Button>
          </div>
        )}

        {/* Tabella Comparazione Cartelle */}
        {isLoading || isRefetching ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {isLoading ? 'Connessione al server TMWE...' : 'Aggiornamento dati...'}
            </p>
          </div>
        ) : comparisons && comparisons.length > 0 ? (
          <>
            {/* Bottoni Controllo Selezione */}
            <div className="flex gap-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Seleziona tutte le cartelle con missing > 0 (escluse quelle bloccate)
                  const toSelect = allFolders
                    .filter(c => c.missing > 0 && !excludedFolders.includes(c.folderName))
                    .map(c => c.folderName);
                  setSelectedFolders(toSelect);
                }}
              >
                ✅ Seleziona tutte con email mancanti
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedFolders([])}
                disabled={selectedFolders.length === 0}
              >
                ❌ Deseleziona tutto
              </Button>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">🔒</TableHead>
                    <TableHead>Cartella</TableHead>
                    <TableHead className="text-right">Server</TableHead>
                    <TableHead className="text-right">DB Locale</TableHead>
                    <TableHead className="text-right">Mancanti</TableHead>
                    <TableHead className="text-center">% Sync</TableHead>
                    <TableHead className="text-center">Seleziona</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparisons.map(rootFolder => (
                    <FolderRow
                      key={rootFolder.folderName}
                      folder={rootFolder}
                      allFolders={allFolders}
                      selectedFolders={selectedFolders}
                      excludedFolders={excludedFolders}
                      expandedFolders={expandedFolders}
                      onToggleExpand={toggleExpand}
                      onToggleLock={toggleLock}
                      onToggleSelection={toggleFolderSelection}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Bottone Conferma */}
            <div className="mt-6 flex items-center justify-between border-t pt-4">
              <div className="text-sm text-muted-foreground">
                {selectedFolders.length > 0 
                  ? `${selectedFolders.length} cartelle selezionate`
                  : 'Seleziona le cartelle da scaricare con i checkbox'
                }
              </div>
              
              <Button
                onClick={handlePerfectSync}
                disabled={selectedFolders.length === 0 || isPerfectSyncing}
                size="lg"
                className="gap-2"
              >
                {isPerfectSyncing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Sincronizzazione...</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    <span>Perfect Sync</span>
                    {selectedFolders.length > 0 && (
                      <span className="bg-primary-foreground text-primary rounded-full px-2 py-0.5 text-xs font-bold">
                        {selectedFolders.length}
                      </span>
                    )}
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            Nessuna cartella trovata.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

// ============================================================================
// COMPONENTE RICORSIVO: FolderRow (TreeView)
// ============================================================================

interface FolderRowProps {
  folder: FolderComparison;
  allFolders: FolderComparison[];
  selectedFolders: string[];
  excludedFolders: string[];
  expandedFolders: string[];
  onToggleExpand: (folderName: string) => void;
  onToggleLock: (folder: FolderComparison, allFolders: FolderComparison[]) => void;
  onToggleSelection: (folder: FolderComparison, allFolders: FolderComparison[]) => void;
}

const FolderRow = ({
  folder,
  allFolders,
  selectedFolders,
  excludedFolders,
  expandedFolders,
  onToggleExpand,
  onToggleLock,
  onToggleSelection
}: FolderRowProps) => {
  const isExpanded = expandedFolders.includes(folder.folderName);
  const isLocked = excludedFolders.includes(folder.folderName);
  const isSelected = selectedFolders.includes(folder.folderName);
  const hasChildren = folder.children.length > 0;
  
  return (
    <>
      <TableRow className={`
        ${folder.level > 0 ? 'bg-muted/30' : ''}
        ${folder.level === 1 ? 'border-l-2 border-primary/50' : ''}
        ${folder.level === 2 ? 'border-l-2 border-primary/30 bg-muted/50' : ''}
      `}>
        {/* Lucchetto */}
        <TableCell className="text-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onToggleLock(folder, allFolders)}
            className="h-8 w-8"
          >
            {isLocked ? (
              <Lock className="h-4 w-4 text-destructive" />
            ) : (
              <LockOpen className="h-4 w-4 text-green-500" />
            )}
          </Button>
        </TableCell>
        
        {/* Nome Cartella con Indentazione + TreeView */}
        <TableCell className="font-medium">
          <div 
            className="flex items-center gap-2"
            style={{ paddingLeft: `${folder.level * 24}px` }}
          >
            {hasChildren && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onToggleExpand(folder.folderName)}
                className="h-6 w-6"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            )}
            
            {!hasChildren && folder.level > 0 && (
              <span className="text-muted-foreground text-xs mr-2">└─ 📁</span>
            )}
            
            {hasChildren && (
              <span className="mr-1">📂</span>
            )}
            
            <span className={hasChildren ? 'font-semibold' : undefined}>
              {folder.displayName}
            </span>
            
            {hasChildren && (
              <Badge variant="outline" className="text-xs">
                {folder.children.length} sub
              </Badge>
            )}
          </div>
        </TableCell>
        
        {/* Server */}
        <TableCell className="text-right">
          <div className="flex flex-col items-end">
            <span className="font-semibold">{folder.serverCount}</span>
            {hasChildren && folder.directServerCount > 0 && (
              <span className="text-xs text-muted-foreground">
                ({folder.directServerCount} direct)
              </span>
            )}
          </div>
        </TableCell>
        
        {/* DB Locale */}
        <TableCell className="text-right">
          <div className="flex flex-col items-end">
            <span className="font-semibold">{folder.dbCount}</span>
            {hasChildren && folder.directDbCount > 0 && (
              <span className="text-xs text-muted-foreground">
                ({folder.directDbCount} direct)
              </span>
            )}
          </div>
        </TableCell>
        
        {/* Mancanti */}
        <TableCell className={`text-right ${folder.missing > 0 ? 'text-destructive font-semibold' : 'text-green-500'}`}>
          {folder.missing}
        </TableCell>
        
        {/* % Sync */}
        <TableCell className="text-center">
          <Badge variant={folder.syncPercentage === 100 ? 'default' : 'secondary'}>
            {folder.syncPercentage}%
          </Badge>
        </TableCell>
        
        {/* Checkbox */}
        <TableCell className="text-center">
          {folder.missing > 0 ? (
            isLocked ? (
              <span className="text-xs text-muted-foreground">🔒 Bloccata</span>
            ) : (
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggleSelection(folder, allFolders)}
              />
            )
          ) : (
            <span className="text-xs text-green-500">✓ Completo</span>
          )}
        </TableCell>
      </TableRow>
      
      {/* Render Figli (ricorsivo) */}
      {isExpanded && hasChildren && folder.children.map(child => (
        <FolderRow
          key={child.folderName}
          folder={child}
          allFolders={allFolders}
          selectedFolders={selectedFolders}
          excludedFolders={excludedFolders}
          expandedFolders={expandedFolders}
          onToggleExpand={onToggleExpand}
          onToggleLock={onToggleLock}
          onToggleSelection={onToggleSelection}
        />
      ))}
    </>
  );
};
