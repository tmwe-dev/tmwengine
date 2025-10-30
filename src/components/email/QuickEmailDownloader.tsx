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
import { emailFolderApi } from '@/lib/tmwe-api-integrated';

interface QuickEmailDownloaderProps {
  onDownloadComplete?: (stats: QuickSyncStats) => void;
  onStatsUpdate?: (stats: Record<string, number>) => void;
  preSelectedFolders?: string[];
}

interface FolderQuickOption {
  name: string;
  display: string;
  selected: boolean;
}

export function QuickEmailDownloader({ onDownloadComplete, onStatsUpdate, preSelectedFolders = [] }: QuickEmailDownloaderProps) {
  const [quickFolders, setQuickFolders] = useState<FolderQuickOption[]>([]);
  const [quickProgress, setQuickProgress] = useState<QuickSyncProgress | null>(null);
  const [quickSyncer, setQuickSyncer] = useState<QuickEmailSyncer | null>(null);
  const [isQuickLoading, setIsQuickLoading] = useState(true);
  const { toast } = useToast();

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

  const loadQuickFolders = async () => {
    setIsQuickLoading(true);
      try {
        console.log('📂 [loadQuickFolders] ========== FOLDER LOADING START ==========');
        console.log('📂 Calling emailFolderApi.getFolders()...');
        
        // ✅ USA STESSA API DI EmailIntegrityChecker
        const quickResponse = await emailFolderApi.getFolders({ 
          include_counts: false,
          skipCache: false
        });

      console.log('📂 [loadQuickFolders] RAW API RESPONSE:', JSON.stringify(quickResponse, null, 2));
      console.log('📂 [loadQuickFolders] Response type:', typeof quickResponse);
      console.log('📂 [loadQuickFolders] Is Array?', Array.isArray(quickResponse));

      const quickFoldersList = Array.isArray(quickResponse) 
        ? quickResponse 
        : (quickResponse?.folders || quickResponse?.data || []);
      
      console.log('📂 [loadQuickFolders] Extracted folders list:', quickFoldersList);
      console.log('📂 [loadQuickFolders] Folders count:', quickFoldersList.length);
      
      // Log each folder with details
      quickFoldersList.forEach((f: any, idx: number) => {
        const folderName = String(f.name || f);
        console.log(`📂 [loadQuickFolders] Folder ${idx + 1}:`);
        console.log(`   Raw object:`, f);
        console.log(`   Name: "${folderName}"`);
        console.log(`   Display: "${f.display_name || folderName}"`);
        console.log(`   Length: ${folderName.length}`);
        console.log(`   Bytes: [${Array.from(folderName).map((c: string) => c.charCodeAt(0)).join(',')}]`);
      });
      
      // ✅ FIX 2: Normalizza confronto case-insensitive + trim
      const quickMapped = quickFoldersList.map((f: any) => {
        const folderName = f.name || f;
        const normalizedName = (folderName || '').trim().toLowerCase();
        
        return {
          name: folderName,  // ✅ Mantieni nome originale
          display: f.display_name || folderName,
          selected: preSelectedFolders.length > 0 
            ? preSelectedFolders.some(pre => 
                (pre || '').trim().toLowerCase() === normalizedName  // ✅ Confronto normalizzato
              )
            : (normalizedName === 'inbox')  // ✅ Anche default normalizzato
        };
      });

      console.log('🔍 [QuickDownload] preSelectedFolders:', preSelectedFolders);
      console.log('🔍 [QuickDownload] Server folders:', quickFoldersList.map((f: any) => f.name || f));
      console.log('🔍 [QuickDownload] Mapped with selection:', quickMapped.filter(f => f.selected).map(f => f.name));
      console.log('📂 [loadQuickFolders] ========== FOLDER LOADING COMPLETE ==========');

      setQuickFolders(quickMapped);
      
      // Load stats dal DB
      await loadQuickStats();

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
    const allQuickSelected = quickFolders.every(f => f.selected);
    setQuickFolders(prev => prev.map(f => ({ ...f, selected: !allQuickSelected })));
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
          toast({
            title: '✅ Download completato!',
            description: `${stats.totalDownloaded} email scaricate in ${Math.round(stats.totalTime)}s (${stats.avgSpeed.toFixed(1)} email/s)`,
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
      {/* Header con badge QUICK */}
      <div className="flex items-center gap-3">
        <Zap className="h-6 w-6 text-yellow-500" />
        <h3 className="text-lg font-semibold">Quick Download (Parallelo)</h3>
        <Badge variant="default" className="bg-yellow-500">
          10x più veloce
        </Badge>
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
            <CardTitle className="text-base flex items-center justify-between">
              Seleziona Cartelle
              <Button 
                variant="outline" 
                size="sm"
                onClick={toggleQuickSelectAll}
              >
                {quickFolders.every(f => f.selected) ? 'Deseleziona' : 'Seleziona'} tutte
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isQuickLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Caricamento cartelle...
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                {quickFolders.map(folder => (
                  <Button
                    key={folder.name}
                    variant={folder.selected ? 'default' : 'outline'}
                    size="sm"
                    className="justify-start"
                    onClick={() => toggleQuickFolder(folder.name)}
                  >
                    <FolderOpen className="h-4 w-4 mr-2" />
                    {folder.display}
                  </Button>
                ))}
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
