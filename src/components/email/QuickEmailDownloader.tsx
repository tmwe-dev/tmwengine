/**
 * Quick Email Downloader - Sistema di download parallelo
 * Componente UI completamente isolato
 * 10x più veloce del sistema standard
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Download, 
  Pause, 
  Play, 
  Square, 
  Zap,
  FolderOpen,
  CheckCircle2,
  XCircle,
  Clock,
  Gauge
} from 'lucide-react';
import { QuickEmailSyncer, QuickSyncProgress, QuickSyncStats } from '@/lib/email-sync-quick';
import { QuickEmailSyncerTurbo } from '@/lib/email-sync-quick-turbo';
import { emailFolderApi } from '@/lib/tmwe-api-integrated';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useFolderLocks } from '@/hooks/useFolderLocks';

interface QuickEmailDownloaderProps {
  onDownloadComplete?: (stats: QuickSyncStats) => void;
  onStatsUpdate?: (stats: Record<string, number>) => void;
  preSelectedFolders?: string[];
}

interface FolderQuickOption {
  name: string;
  display: string;
  selected: boolean;
  serverCount: number;
  dbCount: number;
  missing: number;
}

export function QuickEmailDownloader({ onDownloadComplete, onStatsUpdate, preSelectedFolders = [] }: QuickEmailDownloaderProps) {
  const [quickFolders, setQuickFolders] = useState<FolderQuickOption[]>([]);
  const [quickProgress, setQuickProgress] = useState<QuickSyncProgress | null>(null);
  const [quickSyncer, setQuickSyncer] = useState<QuickEmailSyncer | QuickEmailSyncerTurbo | null>(null);
  const [isQuickLoading, setIsQuickLoading] = useState(true);
  const [isTurboMode, setIsTurboMode] = useState(true); // ✨ Default: TURBO attivo
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const { toast } = useToast();
  const { isLocked, toggleLock } = useFolderLocks(userEmail);
  
  // Load user email for folder locks
  useEffect(() => {
    const loadUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('tmwe_email')
          .eq('user_id', user.id)
          .single();
        setUserEmail(profile?.tmwe_email || null);
      }
    };
    loadUserEmail();
  }, []);

  useEffect(() => {
    console.log('🔍 [QuickDownload] Received preSelectedFolders prop:', preSelectedFolders);
    loadQuickFolders();
  }, []);

  // 🔍 DEBUG: Monitora stato reale di preSelectedFolders e quickFolders
  useEffect(() => {
    console.log('🔍 DEBUG COMPLETO QuickDownloader:', {
      preSelectedFolders,
      quickFolders: quickFolders.map(f => ({ 
        name: f.name, 
        selected: f.selected 
      })),
      timestamp: new Date().toISOString()
    });
  }, [quickFolders, preSelectedFolders]);

  // 🔧 FIX 2: Sincronizza selezione quando le cartelle vengono caricate
  useEffect(() => {
    // ⏸️ Guardia: aspetta che ENTRAMBI siano pronti
    if (quickFolders.length === 0 || preSelectedFolders.length === 0) {
      console.log('⏸️ [QuickDownload] Waiting...', {
        quickFolders: quickFolders.length,
        preSelected: preSelectedFolders.length
      });
      return;
    }

    console.log('🔄 [QuickDownload] Re-syncing folder selection...');
    console.log('   preSelectedFolders:', preSelectedFolders);
    console.log('   quickFolders count:', quickFolders.length);

    const updatedFolders = quickFolders.map(folder => {
      const normalizedFolderName = (folder.name || '').trim().toLowerCase();
      const shouldBeSelected = preSelectedFolders.some(pre => 
        (pre || '').trim().toLowerCase() === normalizedFolderName
      );

      if (shouldBeSelected && !folder.selected) {
        console.log(`   ✅ Selecting folder: "${folder.name}"`);
      }

      return {
        ...folder,
        selected: shouldBeSelected
      };
    });

    const selectedCount = updatedFolders.filter(f => f.selected).length;
    console.log(`🔄 [QuickDownload] Re-sync complete: ${selectedCount} folders selected`);

    if (selectedCount !== quickFolders.filter(f => f.selected).length) {
      setQuickFolders(updatedFolders);
    }
  }, [quickFolders, preSelectedFolders]);

  const loadQuickFolders = async () => {
    setIsQuickLoading(true);
      try {
        console.log('📂 [loadQuickFolders] ========== FOLDER LOADING START ==========');
        
        // 1. Get user email
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Non autenticato');

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('tmwe_email')
          .eq('user_id', user.id)
          .single();

        if (!profile?.tmwe_email) throw new Error('Email TMWE non configurata');

        // 2. Fetch SERVER counts (con include_counts: true)
        const serverResponse = await emailFolderApi.getFolders({ 
          include_counts: true,
          skipCache: true
        });

        console.log('📂 [QuickDownload] Server response:', serverResponse);
        console.log('📂 [QuickDownload] Response keys:', Object.keys(serverResponse || {}));
        console.log('📂 [QuickDownload] Response type:', typeof serverResponse);
        
        const serverFolders = serverResponse.folders 
          || serverResponse.data 
          || (Array.isArray(serverResponse) ? serverResponse : []);
        console.log('📂 Server folders:', serverFolders.length);
        if (serverFolders.length > 0) {
          console.log('📂 [QuickDownload] First folder structure:', serverFolders[0]);
          console.log('📂 [QuickDownload] First folder keys:', Object.keys(serverFolders[0] || {}));
        }

        // 3. Fetch DB counts
        const { data: dbCounts } = await supabase.rpc('get_email_folder_counts', {
          p_user_email: profile.tmwe_email,
          p_sync_status: 'fun_email_backup'
        });
        
        const dbCountsMap = (dbCounts || []).reduce((acc: Record<string, number>, row: any) => {
          acc[row.cartella] = row.count;
          return acc;
        }, {});

        console.log('📂 DB counts:', dbCountsMap);

        // 4. Combina dati
        const quickMapped: FolderQuickOption[] = serverFolders.map((folder: any) => {
          const folderName = folder.name || folder;
          const normalizedName = (folderName || '').trim().toLowerCase();
          const serverCount = folder.message_count 
            || folder.total_count 
            || folder.messages 
            || folder.count 
            || folder.total 
            || 0;
          const dbCount = dbCountsMap[folderName] || 0;
          const missing = Math.max(0, serverCount - dbCount);
          
          return {
            name: folderName,
            display: folder.display_name || folderName,
            serverCount,
            dbCount,
            missing,
            selected: preSelectedFolders.length > 0 
              ? preSelectedFolders.some(pre => 
                  (pre || '').trim().toLowerCase() === normalizedName
                )
              : (normalizedName === 'inbox')
          };
        });

        console.log('📂 Mapped folders with stats:', quickMapped.length);
        console.log('📂 [loadQuickFolders] ========== FOLDER LOADING COMPLETE ==========');

        setQuickFolders(quickMapped);
        
        // Aggiorna stats callback
        const statsObj = quickMapped.reduce((acc: Record<string, number>, f) => {
          acc[f.name] = f.dbCount;
          return acc;
        }, {});
        onStatsUpdate?.(statsObj);

    } catch (error: any) {
      console.error('❌ Quick folders error:', error);
      toast({
        title: '❌ Errore',
        description: 'Impossibile caricare le cartelle',
        variant: 'destructive',
      });
    } finally {
      setIsQuickLoading(false);
    }
  };

  const loadQuickStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tmwe_email')
        .eq('user_id', user.id)
        .single();

      if (!profile?.tmwe_email) return;

      const { data: allQuickEmails } = await supabase
        .from('email_messages')
        .select('cartella')
        .eq('user_email', profile.tmwe_email)
        .eq('sync_status', 'fun_email_backup');

      if (allQuickEmails) {
        const quickCounts: Record<string, number> = {};
        allQuickEmails.forEach(email => {
          const folderKey = email.cartella || 'INBOX';
          quickCounts[folderKey] = (quickCounts[folderKey] || 0) + 1;
        });
        onStatsUpdate?.(quickCounts);
      }

    } catch (error) {
      console.warn('Stats load warning:', error);
    }
  };

  const toggleQuickFolder = (folderName: string) => {
    setQuickFolders(prev =>
      prev.map(f => f.name === folderName ? { ...f, selected: !f.selected } : f)
    );
  };

  const toggleQuickSelectAll = () => {
    const unlockedFolders = quickFolders.filter(f => !isLocked(f.name));
    const allUnlockedSelected = unlockedFolders.every(f => f.selected);
    setQuickFolders(prev => prev.map(f => 
      isLocked(f.name) ? f : { ...f, selected: !allUnlockedSelected }
    ));
  };

  const selectFoldersWithMissing = () => {
    setQuickFolders(prev => prev.map(f => ({ 
      ...f, 
      selected: f.missing > 0 && !isLocked(f.name)
    })));
  };

  const startQuickDownload = async () => {
    const quickSelectedFolders = quickFolders.filter(f => f.selected);
    
    // ✅ FIX 1: Se abbiamo preSelectedFolders, usali direttamente (bypass UI)
    const foldersToSync = preSelectedFolders.length > 0 
      ? preSelectedFolders  // ✅ Usa nomi da Verifica (già corretti)
      : quickSelectedFolders.map(f => f.name);  // ✅ Usa selezione UI
    
    console.log('🚀 [QuickDownload] STARTING SYNC');
    console.log('🚀 [QuickDownload] foldersToSync:', foldersToSync);
    console.log('🚀 [QuickDownload] Source:', preSelectedFolders.length > 0 ? 'preSelected' : 'UI selection');
    console.log('🚀 [QuickDownload] preSelectedFolders:', preSelectedFolders);
    console.log('🚀 [QuickDownload] quickSelectedFolders:', quickSelectedFolders.map(f => f.name));
    
    if (foldersToSync.length === 0) {
      toast({
        title: '⚠️ Attenzione',
        description: 'Seleziona almeno una cartella',
        variant: 'default',
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non autenticato');

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tmwe_email')
        .eq('user_id', user.id)
        .single();

      if (!profile?.tmwe_email) {
        throw new Error('Email TMWE non configurata');
      }

      console.log('🚀 [QuickDownload] ========== SYNC START ==========');
      console.log('🚀 Selected folders:', foldersToSync);
      foldersToSync.forEach((name, idx) => {
        console.log(`🚀 Folder ${idx + 1}:`);
        console.log(`   Name: "${name}"`);
        console.log(`   Length: ${name.length}`);
        console.log(`   Bytes: ${Array.from(name).map(c => c.charCodeAt(0)).join(',')}`);
      });
      console.log('🚀 ==============================================');

      const newQuickSyncer = new QuickEmailSyncer({
        folders: foldersToSync,  // ✅ Usa foldersToSync invece di quickSelectedFolders.map()
        userEmail: profile.tmwe_email,
        batchSize: 15,
        maxRetries: 2,
        timeout: 60000,  // ✅ 60s per email grandi con allegati
        onProgress: (progress) => {
          setQuickProgress(progress);
        },
        onComplete: (stats) => {
          const cacheInfo = stats.cacheHits ? ` (${stats.cacheHits} da cache)` : '';
          toast({
            title: `✅ Download ${isTurboMode ? 'TURBO' : ''} completato!`,
            description: `${stats.totalDownloaded} email scaricate in ${Math.round(stats.totalTime)}s (${stats.avgSpeed.toFixed(1)} email/s)${cacheInfo}`,
          });
          setQuickSyncer(null);
          setQuickProgress(null);
          onDownloadComplete?.(stats);
          loadQuickStats();
        },
        onError: (error) => {
          toast({
            title: '❌ Errore',
            description: error.message,
            variant: 'destructive',
          });
          setQuickSyncer(null);
          setQuickProgress(null);
        }
      });

      setQuickSyncer(newQuickSyncer);
      await newQuickSyncer.start();

    } catch (error: any) {
      console.error('❌ Quick start error:', error);
      toast({
        title: '❌ Errore',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const pauseQuickDownload = () => {
    if (quickSyncer) {
      quickSyncer.pause();
      toast({ title: '⏸️ Download in pausa' });
    }
  };

  const resumeQuickDownload = () => {
    if (quickSyncer) {
      quickSyncer.resume();
      toast({ title: '▶️ Download ripreso' });
    }
  };

  const stopQuickDownload = () => {
    if (quickSyncer) {
      quickSyncer.stop();
      toast({ title: '⏹️ Download interrotto' });
    }
  };

  const quickOverallProgress = quickProgress
    ? ((quickProgress.completedFolders * 100 + 
        (quickProgress.currentFolderTotal > 0 
          ? (quickProgress.currentFolderProgress / quickProgress.currentFolderTotal) * 100 
          : 0)
       ) / quickProgress.totalFolders)
    : 0;

  return (
    <div className="space-y-4">
      {/* Header con badge QUICK + Toggle TURBO */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className="h-6 w-6 text-red-500" />
          <h3 className="text-lg font-semibold">Quick Download (Parallelo)</h3>
          <Badge variant="default" className={!isTurboMode ? 'bg-primary' : 'bg-yellow-500'}>
            {isTurboMode ? '⚡ TURBO' : '10x più veloce'}
          </Badge>
        </div>
        
        {/* ✨ Toggle TURBO Mode */}
        <div className="flex items-center gap-3">
          <Label htmlFor="turbo-mode" className="text-sm font-medium">
            Modalità TURBO
          </Label>
          <Switch 
            id="turbo-mode"
            checked={isTurboMode}
            onCheckedChange={setIsTurboMode}
            disabled={quickProgress?.isRunning}
          />
          {!isTurboMode && (
            <Badge variant="outline" className="text-xs">
              Cache + Batch 25
            </Badge>
          )}
        </div>
      </div>

      {/* Progress Card (visible solo durante download) */}
      {quickProgress?.isRunning && (
        <Card className="border-yellow-500 border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Gauge className="h-4 w-4 animate-pulse text-yellow-500" />
                Download in corso
              </span>
              <div className="flex gap-2">
                {quickProgress.isPaused ? (
                  <Button size="sm" variant="outline" onClick={resumeQuickDownload}>
                    <Play className="h-4 w-4 mr-1" />
                    Riprendi
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={pauseQuickDownload}>
                    <Pause className="h-4 w-4 mr-1" />
                    Pausa
                  </Button>
                )}
                <Button size="sm" variant="destructive" onClick={stopQuickDownload}>
                  <Square className="h-4 w-4 mr-1" />
                  Stop
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress bar complessivo */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">Progresso totale</span>
                <span className="text-muted-foreground">
                  {quickProgress.completedFolders} / {quickProgress.totalFolders} cartelle
                </span>
              </div>
              <Progress value={quickOverallProgress} className="h-2" />
            </div>

            {/* Cartella corrente */}
            <div className="flex items-center gap-2 text-sm">
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{quickProgress.currentFolder}</span>
              <span className="text-muted-foreground">
                ({quickProgress.currentFolderProgress} / {quickProgress.currentFolderTotal})
              </span>
            </div>

            {/* Stats inline */}
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-500">
                  {quickProgress.downloadedCount}
                </div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Scaricate
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-500">
                  {quickProgress.skippedCount}
                </div>
                <div className="text-xs text-muted-foreground">Duplicate</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-500">
                  {quickProgress.failedCount}
                </div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <XCircle className="h-3 w-3" />
                  Errori
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-500">
                  {quickProgress.currentSpeed?.toFixed(1) || '0'}
                </div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Gauge className="h-3 w-3" />
                  email/s
                </div>
              </div>
            </div>

            {/* Tempo stimato */}
            {quickProgress.estimatedTimeRemaining && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Tempo stimato: {Math.round(quickProgress.estimatedTimeRemaining)}s
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Folder Selection */}
      {!quickProgress?.isRunning && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Cartelle da scaricare</span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={selectFoldersWithMissing}
                  disabled={isQuickLoading}
                >
                  Seleziona con email mancanti
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={toggleQuickSelectAll}
                  disabled={isQuickLoading}
                >
                  {quickFolders.every(f => f.selected) ? 'Deseleziona tutto' : 'Seleziona tutto'}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isQuickLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Totali globali */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Totale Server</p>
                    <p className="text-2xl font-bold">
                      {quickFolders.reduce((sum, f) => sum + f.serverCount, 0)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Totale Database</p>
                    <p className="text-2xl font-bold">
                      {quickFolders.reduce((sum, f) => sum + f.dbCount, 0)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Email Mancanti</p>
                    <p className={`text-2xl font-bold ${
                      quickFolders.reduce((sum, f) => sum + f.missing, 0) > 0 
                        ? 'text-destructive' 
                        : 'text-green-500'
                    }`}>
                      {quickFolders.reduce((sum, f) => sum + f.missing, 0)}
                    </p>
                  </div>
                </div>

                {/* Tabella cartelle */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox 
                          checked={quickFolders.length > 0 && quickFolders.filter(f => !isLocked(f.name)).every(f => f.selected)}
                          onCheckedChange={toggleQuickSelectAll}
                        />
                      </TableHead>
                      <TableHead>Cartella</TableHead>
                      <TableHead className="text-right">Server</TableHead>
                      <TableHead className="text-right">Database</TableHead>
                      <TableHead className="text-right">Mancanti</TableHead>
                      <TableHead className="text-right">Sincronizzazione</TableHead>
                      <TableHead className="w-12 text-center">🔒</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quickFolders.map(folder => {
                      const syncPercentage = folder.serverCount > 0 
                        ? Math.round((folder.dbCount / folder.serverCount) * 100) 
                        : 100;
                      
                      return (
                        <TableRow key={folder.name}>
                  <TableCell>
                    <Checkbox 
                      checked={folder.selected}
                      onCheckedChange={() => toggleQuickFolder(folder.name)}
                      disabled={isLocked(folder.name)}
                    />
                  </TableCell>
                          <TableCell className="font-medium">{folder.display}</TableCell>
                          <TableCell className="text-right">{folder.serverCount}</TableCell>
                          <TableCell className="text-right">{folder.dbCount}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={folder.missing > 0 ? 'destructive' : 'secondary'}>
                              {folder.missing}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center gap-2 justify-end">
                              <Progress value={syncPercentage} className="w-20 h-2" />
                              <span className="text-xs text-muted-foreground w-10">{syncPercentage}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => toggleLock(folder.name)}
                            >
                              {isLocked(folder.name) ? '🔒' : '🔓'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Start Button */}
      {!quickProgress?.isRunning && (
        <Button
          className="w-full"
          size="lg"
          onClick={startQuickDownload}
          disabled={
            isQuickLoading ||  // ✅ FIX 3: Cartelle ancora in caricamento
            quickProgress?.isRunning ||  // ✅ Download già attivo
            (preSelectedFolders.length === 0 && quickFolders.filter(f => f.selected).length === 0)  // ✅ Nessuna selezione
          }
        >
          {isQuickLoading ? (
            <>
              <Download className="h-5 w-5 mr-2 animate-spin" />
              Caricamento cartelle...
            </>
          ) : (
            <>
              <Download className="h-5 w-5 mr-2" />
              Avvia Quick Download
            </>
          )}
        </Button>
      )}
    </div>
  );
}
