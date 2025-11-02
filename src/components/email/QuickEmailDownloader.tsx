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
  Gauge,
  Settings
} from 'lucide-react';
import { 
  QuickEmailSyncerTurboV2 as QuickEmailSyncer,
  QuickSyncProgress,
  QuickSyncStats
} from '@/lib/email-sync-quick-turbo';
import { emailFolderApi } from '@/lib/tmwe-api-integrated';
import { FolderSyncPreferencesManager } from '@/components/email/sync/FolderSyncPreferencesManager';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

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
  const [isPreferencesDialogOpen, setIsPreferencesDialogOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    console.log('🔍 [QuickDownload] Received preSelectedFolders prop:', preSelectedFolders);
    loadQuickFolders();
    loadUserEmail();
  }, []);

  const loadUserEmail = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tmwe_email')
        .eq('user_id', user.id)
        .single();
      
      if (profile?.tmwe_email) {
        setUserEmail(profile.tmwe_email);
      }
    } catch (error) {
      console.error('Error loading user email:', error);
    }
  };

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
    
    // ✅ FIX 1 (CRITICAL): Rispetta preferenze quando nessuna selezione manuale
    // Se utente seleziona cartelle manualmente → usa quelle
    // Se utente NON seleziona nulla → usa preferenze (folders: undefined)
    const foldersToSync = quickSelectedFolders.length > 0 
      ? quickSelectedFolders.map(f => f.name)  // Selezione manuale
      : undefined;  // undefined = usa preferenze automatiche
    
    console.log('🚀 [QuickDownload] STARTING SYNC');
    console.log('🚀 [QuickDownload] foldersToSync:', foldersToSync);
    console.log('🚀 [QuickDownload] Will apply preferences:', foldersToSync === undefined);
    console.log('🚀 [QuickDownload] quickSelectedFolders:', quickSelectedFolders.map(f => f.name));
    
    if (quickSelectedFolders.length === 0 && preSelectedFolders.length === 0) {
      // Nessuna selezione → usa preferenze automatiche
      console.log('🎯 Using automatic folder selection with preferences');
    }
    
    if (quickSelectedFolders.length === 0 && preSelectedFolders.length === 0 && !foldersToSync) {
      // OK - userà le preferenze
      console.log('✅ Will sync with preferences (no manual selection)');
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
      if (foldersToSync) {
        console.log('🚀 Manual folder selection:', foldersToSync);
        foldersToSync.forEach((name, idx) => {
          console.log(`🚀   Folder ${idx + 1}: "${name}" (${name.length} chars)`);
        });
      } else {
        console.log('🎯 Automatic folder selection (will use user preferences from DB)');
      }
      console.log('🚀 ==============================================');

      const newQuickSyncer = new QuickEmailSyncer({
        userEmail: profile.tmwe_email,
        folders: foldersToSync && foldersToSync.length > 0 ? foldersToSync : quickFolders.map(f => f.name),
        applyPreferences: !foldersToSync || foldersToSync.length === 0,
        batchSize: 25,
        maxRetries: 2,
        timeout: 60000,
        onProgress: (progress) => {
          setQuickProgress(progress);
        },
        onComplete: (stats) => {
          toast({
            title: `✅ Download V2 completato!`,
            description: `${stats.downloaded} email in ${Math.round(stats.duration)}s (${stats.avgSpeed.toFixed(1)} email/s)`,
          });
          setQuickSyncer(null);
          setQuickProgress(null);
          onDownloadComplete?.(stats);
          loadQuickStats();
        },
        onError: (error) => {
          toast({
            title: '❌ Errore V3',
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
      
      if (error.message === 'TMWE_SESSION_EXPIRED') {
        toast({
          title: '🔐 Sessione TMWE Scaduta',
          description: 'La tua sessione TMWE è scaduta. Clicca qui per effettuare nuovamente il login.',
          variant: 'destructive',
          action: (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => window.location.href = '/tmwe/auth'}
            >
              Accedi
            </Button>
          )
        });
        return;
      }
      
      toast({
        title: '❌ Errore',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsQuickLoading(false);
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

  const quickOverallProgress = quickProgress && quickProgress.foldersToSync.length > 0
    ? (quickProgress.completedFolders.length / quickProgress.foldersToSync.length) * 100
    : 0;

  const startPreferencesSync = async () => {
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

      console.log('🎯 [PreferencesSync] Starting with all folders...');

      const newQuickSyncer = new QuickEmailSyncer({
        userEmail: profile.tmwe_email,
        folders: undefined,
        applyPreferences: true,
        batchSize: 25,
        maxRetries: 2,
        timeout: 60000,
        onProgress: (progress) => {
          setQuickProgress(progress);
        },
        onComplete: (stats) => {
          toast({
            title: `✅ Sync completato!`,
            description: `${stats.downloaded} email in ${Math.round(stats.duration)}s (${stats.avgSpeed.toFixed(1)} email/s)`,
          });
          
          setQuickSyncer(null);
          setQuickProgress(null);
          onDownloadComplete?.(stats);
          loadQuickStats();
        },
        onError: (error) => {
          toast({
            title: '❌ Errore Sync Preferences',
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
      console.error('❌ Preferences sync error:', error);
      
      if (error.message === 'TMWE_SESSION_EXPIRED') {
        toast({
          title: '🔐 Sessione TMWE Scaduta',
          description: 'La tua sessione TMWE è scaduta. Clicca qui per effettuare nuovamente il login.',
          variant: 'destructive',
          action: (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => window.location.href = '/tmwe/auth'}
            >
              Accedi
            </Button>
          )
        });
        return;
      }
      
      toast({
        title: '❌ Errore',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header V3 + Mode Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className="h-6 w-6 text-red-500" />
          <h3 className="text-lg font-semibold">Quick Download V3</h3>
          <Badge variant="default" className="bg-yellow-500">
            ⚡ TURBO + Preferences
          </Badge>
        </div>
        
        {/* ✅ FIX 4: Mode Selector (placeholder per future versioni) */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Settings className="h-4 w-4" />
          <span>Mode: <strong className="text-foreground">V3 Turbo</strong></span>
          {/* TODO: Ripristinare V1/V2 in FASE 3 */}
        </div>
      </div>

      {/* Progress Card (visible solo durante download) */}
      {(quickProgress?.status === 'running' || quickProgress?.status === 'paused') && (
        <Card className="border-yellow-500 border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Gauge className="h-4 w-4 animate-pulse text-yellow-500" />
                Download in corso
              </span>
              <div className="flex gap-2">
                {quickProgress?.status === 'paused' ? (
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
                  {quickProgress.completedFolders.length} / {quickProgress.foldersToSync.length} cartelle
                </span>
              </div>
              <Progress value={quickOverallProgress} className="h-2" />
            </div>

            {/* Cartella corrente */}
            <div className="flex items-center gap-2 text-sm">
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{quickProgress.currentFolder}</span>
            </div>

            {/* Stats inline */}
            <div className="grid grid-cols-3 gap-4 text-center">
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
                  {quickProgress.speed?.toFixed(1) || '0'}
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

      {/* Sync con Preferences - Nuovo pulsante dedicato */}
      {!quickProgress && preSelectedFolders.length === 0 && (
        <Card className="border-purple-500 border-2 bg-purple-50/10">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Settings className="h-6 w-6 text-purple-500" />
                  <div>
                    <h4 className="font-semibold">Sync Automatico con Preferenze</h4>
                    <p className="text-sm text-muted-foreground">
                      Sincronizza solo le cartelle configurate in Email Management
                    </p>
                  </div>
                </div>
                
                {/* Pulsante Gestione Preferenze */}
                <Dialog open={isPreferencesDialogOpen} onOpenChange={setIsPreferencesDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Settings className="h-4 w-4" />
                      Gestisci Preferenze
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>⚙️ Preferenze Sincronizzazione</DialogTitle>
                    </DialogHeader>
                    {userEmail && (
                      <FolderSyncPreferencesManager
                        userEmail={userEmail}
                        onPreferencesChanged={() => {
                          loadQuickFolders();
                          setIsPreferencesDialogOpen(false);
                          toast({
                            title: '✅ Preferenze salvate',
                            description: 'Le tue preferenze di sincronizzazione sono state aggiornate',
                          });
                        }}
                      />
                    )}
                  </DialogContent>
                </Dialog>
              </div>
              
              <Button
                size="lg"
                variant="outline"
                className="w-full border-purple-500 text-purple-600 hover:bg-purple-50"
                onClick={startPreferencesSync}
                disabled={isQuickLoading}
              >
                <Settings className="mr-2 h-5 w-5" />
                Avvia Sync con Preferenze
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Folder Selection */}
      {!quickProgress && (
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
      {!quickProgress && (
        <Button
          className="w-full"
          size="lg"
          onClick={startQuickDownload}
          disabled={isQuickLoading}
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
