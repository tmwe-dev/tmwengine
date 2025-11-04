/**
 * Quick Email Downloader - Background download system
 * Componente UI completamente isolato
 */

import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Download, 
  Zap,
  FolderOpen,
  CheckCircle2,
  Clock,
  Gauge,
  Settings,
  Sliders,
  Pause,
  Play,
  Square
} from 'lucide-react';
import emailFolderGif from '@/assets/email-folder-unscreen.gif';
import { emailFolderApi, emailMessageApi } from '@/lib/tmwe-api-integrated';
import { emailSearchApi } from '@/lib/tmwe-email-search-api';
import { FolderSyncPreferencesManager } from '@/components/email/sync/FolderSyncPreferencesManager';
import { PerformanceProfileConfigurator } from '@/components/testing/PerformanceProfileConfigurator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getSyncPreferences, filterFolders } from '@/lib/email-sync-preferences';
import { getActiveProfile, type PerformanceProfile } from '@/lib/performance-profiles';
import { RealtimeEmailInsertionMonitor } from './RealtimeEmailInsertionMonitor';

interface QuickSyncStats {
  downloaded: number;
  inserted: number;
  duration: number;
  avgSpeed: number;
  errors: number;
}

interface QuickEmailDownloaderProps {
  onDownloadComplete?: (stats: QuickSyncStats) => void;
  onStatsUpdate?: (stats: Record<string, number>) => void;
  preSelectedFolders?: string[];
  onDownloadStatusChange?: (isActive: boolean) => void;
}

interface FolderQuickOption {
  name: string;
  display: string;
  selected: boolean;
}

export function QuickEmailDownloader({ onDownloadComplete, onStatsUpdate, preSelectedFolders = [], onDownloadStatusChange }: QuickEmailDownloaderProps) {
  const [quickFolders, setQuickFolders] = useState<FolderQuickOption[]>([]);
  const [isQuickLoading, setIsQuickLoading] = useState(true);
  const [isPreferencesDialogOpen, setIsPreferencesDialogOpen] = useState(false);
  const [isPerformanceDialogOpen, setIsPerformanceDialogOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [activeProfile, setActiveProfile] = useState<PerformanceProfile | null>(null);
  const [pauseState, setPauseState] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // ✅ CLIENT-SIDE STATE (come FunEmailDownloader)
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFolder, setCurrentFolder] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    downloaded: 0,
    failed: 0,
    skipped: 0,
  });
  const shouldStop = useRef(false);
  const isPaused = useRef(false);

  useEffect(() => {
    loadQuickFolders();
    loadUserEmail();
    loadActiveProfile();
  }, []);


  // Notifica parent component quando cambia lo stato download
  useEffect(() => {
    onDownloadStatusChange?.(isDownloading);
  }, [isDownloading, onDownloadStatusChange]);

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

  const loadActiveProfile = async () => {
    try {
      const profile = await getActiveProfile();
      setActiveProfile(profile);
    } catch (error) {
      console.error('Error loading active profile:', error);
    }
  };

  const handlePerformanceDialogChange = (open: boolean) => {
    setIsPerformanceDialogOpen(open);
    
    if (!open) {
      loadActiveProfile();
    }
  };

  // Sincronizza selezione quando le cartelle vengono caricate
  useEffect(() => {
    if (quickFolders.length === 0 || preSelectedFolders.length === 0) {
      return;
    }

    const updatedFolders = quickFolders.map(folder => {
      const normalizedFolderName = (folder.name || '').trim().toLowerCase();
      const shouldBeSelected = preSelectedFolders.some(pre => 
        (pre || '').trim().toLowerCase() === normalizedFolderName
      );

      return {
        ...folder,
        selected: shouldBeSelected
      };
    });

    const selectedCount = updatedFolders.filter(f => f.selected).length;

    if (selectedCount !== quickFolders.filter(f => f.selected).length) {
      setQuickFolders(updatedFolders);
    }
  }, [quickFolders, preSelectedFolders]);

  const loadQuickFolders = async () => {
    setIsQuickLoading(true);
    try {
      const quickResponse = await emailFolderApi.getFolders({ 
        include_counts: false,
        skipCache: true
      });

      const quickFoldersList = Array.isArray(quickResponse) 
        ? quickResponse 
        : (quickResponse?.data || quickResponse?.folders || []);
      
      const quickMapped = quickFoldersList.map((f: any) => {
        const folderName = f.name || f;
        const normalizedName = (folderName || '').trim().toLowerCase();
        
        return {
          name: folderName,
          display: f.display_name || folderName,
          selected: preSelectedFolders.length > 0 
            ? preSelectedFolders.some(pre => 
                (pre || '').trim().toLowerCase() === normalizedName
              )
            : (normalizedName === 'inbox')
        };
      });

      setQuickFolders(quickMapped);
      
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

  const fetchWithTimeout = async <T,>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string
  ): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
      )
    ]);
  };

  const pauseDownload = () => {
    isPaused.current = true;
    setPauseState(true);
    toast({
      title: "⏸️ Download in pausa",
      description: "Il processo è stato messo in pausa. Clicca 'Riprendi' per continuare.",
    });
    console.log('⏸️ Download messo in pausa');
  };

  const resumeDownload = () => {
    isPaused.current = false;
    setPauseState(false);
    toast({
      title: "▶️ Download ripreso",
      description: "Il download è ripreso da dove era stato interrotto.",
    });
    console.log('▶️ Download ripreso');
  };

  const stopDownload = () => {
    shouldStop.current = true;
    isPaused.current = false;
    setPauseState(false);
    toast({
      title: "🛑 Download fermato",
      description: "Il processo di download è stato terminato.",
      variant: "destructive"
    });
    console.log('🛑 Download fermato definitivamente');
  };

  // ✅ CLIENT-SIDE DOWNLOAD (copiato da FunEmailDownloader)
  const startDownload = async (explicitFolders?: string[]) => {
    // ✅ Usa cartelle esplicite se fornite, altrimenti calcola da quickFolders
    const selectedFolders = explicitFolders || quickFolders.filter(f => f.selected).map(f => f.name);
    
    if (selectedFolders.length === 0) {
      toast({
        title: '⚠️ Nessuna cartella selezionata',
        description: 'Seleziona almeno una cartella da sincronizzare',
        variant: 'default',
      });
      return;
    }

    shouldStop.current = false;
    isPaused.current = false;
    setPauseState(false);
    setIsDownloading(true);
    setProgress(0);
    setCurrentFolder('');
    setStats({ total: 0, downloaded: 0, failed: 0, skipped: 0 });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      toast({
        title: '❌ Errore autenticazione',
        description: 'Utente non autenticato',
        variant: 'destructive',
      });
      setIsDownloading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tmwe_email')
      .eq('user_id', user.id)
      .single();

    if (!profile?.tmwe_email) {
      toast({
        title: '❌ Email TMWE non configurato',
        description: 'Configura l\'email TMWE nel profilo',
        variant: 'destructive',
      });
      setIsDownloading(false);
      return;
    }

    let globalDownloaded = 0;
    let globalFailed = 0;
    let globalSkipped = 0;
    let globalTotal = 0;

    for (const folder of selectedFolders) {
      if (shouldStop.current) {
        console.log('⏸️ Download fermato dall\'utente');
        break;
      }

      try {
        console.log(`📂 Inizio download cartella: ${folder}`);
        setCurrentFolder(`📂 ${folder}: recupero lista...`);
        
        // ✅ FIX: Ridotto limit da 2000 a 500 per evitare timeout su cartelle grandi
        const uidListResponse = await fetchWithTimeout(
          emailMessageApi.getMessages({
            folder: folder,
            limit: 500,
            offset: 0,
          }),
          85000, // 85s: vicino al timeout edge function (90s) ma con margine
          `Timeout recupero UID per cartella ${folder}`
        );
        
        const uidList = uidListResponse?.messages || [];
        
        console.log(`📂 ${folder}: API ha restituito ${uidList.length} UID`);
        
        if (uidList.length === 0) {
          console.log(`📂 ${folder}: nessuna email trovata`);
          continue;
        }

        // ✅ PRE-FILTRAGGIO BATCH: verifica quali email esistono già nel DB
        const expectedMessageIds = uidList.map(u => `${folder}/${String(u.uid)}`);
        
        const batchSize = 1000;
        const existingSet = new Set<string>();
        
        for (let i = 0; i < expectedMessageIds.length; i += batchSize) {
          const batch = expectedMessageIds.slice(i, i + batchSize);
          
          const { data: existingMessages } = await supabase
            .from('email_messages')
            .select('message_id')
            .eq('user_email', profile.tmwe_email)
            .in('message_id', batch);
          
          existingMessages?.forEach(m => existingSet.add(m.message_id));
        }
        
        const uidsToDownload = uidList.filter(u => {
          const messageId = `${folder}/${String(u.uid)}`;
          return !existingSet.has(messageId);
        });
        
        const alreadyPresentCount = uidList.length - uidsToDownload.length;
        
        console.log(`📂 ${folder}: ${uidsToDownload.length} nuove email da scaricare`);
        console.log(`📂 ${folder}: ${alreadyPresentCount} già presenti (saltate in batch)`);
        
        globalTotal += uidsToDownload.length;
        globalSkipped += alreadyPresentCount;
        setStats(prev => ({ 
          ...prev, 
          total: globalTotal,
          skipped: globalSkipped 
        }));

        if (uidsToDownload.length === 0) {
          console.log(`📂 ${folder}: tutte le ${uidList.length} email già presenti nel DB`);
          continue;
        }

        console.log(`📂 ${folder}: inizio download ${uidsToDownload.length} nuove email...`);

        for (let i = 0; i < uidsToDownload.length; i++) {
          if (shouldStop.current) {
            console.log('⏸️ Download fermato dall\'utente');
            break;
          }

          while (isPaused.current) {
            await new Promise(resolve => setTimeout(resolve, 500));
            if (shouldStop.current) break;
          }

          if (shouldStop.current) break;

          const uidInfo = uidsToDownload[i];
          const uid = String(uidInfo.uid);
          const messageId = `${folder}/${uid}`;
          
          setCurrentFolder(`📂 ${folder}: ${i + 1}/${uidsToDownload.length} nuove`);
          
          try {
            const email = await fetchWithTimeout(
              emailMessageApi.getMessage(uid, folder, false),
              30000,
              `Timeout recupero email ${folder}/${uid}`
            );
            
            if (!email) {
              console.warn(`⚠️ Email ${folder}/${uid} non trovata`);
              globalFailed++;
              setStats(prev => ({ ...prev, failed: prev.failed + 1 }));
              continue;
            }

            let isoDate = new Date().toISOString();
            if (email.date) {
              try {
                isoDate = new Date(email.date).toISOString();
              } catch (e) {
                console.error('Error parsing date:', email.date);
              }
            }

            const { error: insertError } = await supabase.from('email_messages').insert({
              message_id: messageId,
              from_email: email.from?.address || email.from || email.from_email || '',
              to_email: Array.isArray(email.to) 
                ? email.to.map((t: any) => t.address || t).join(',')
                : email.to || email.to_email || '',
              cc_email: email.cc || email.cc_email || null,
              bcc_email: email.bcc || email.bcc_email || null,
              subject: email.subject || '',
              body_text: email.body_text || email.text || '',
              body_html: email.body_html || email.html || '',
              data_ricezione: isoDate,
              cartella: folder,
              direzione: 'inbound',
              stato: email.flags?.includes('\\Seen') ? 'letto' : 'nuovo',
              flags: email.flags || [],
              attachments: email.attachments || [],
              provider_id: '00000000-0000-0000-0000-000000000000',
              user_email: profile.tmwe_email,
              sync_status: 'fun_email_backup',
            });

            if (!insertError) {
              console.log(`   ✅ Salvata ${folder}/${uid}: ${email.subject?.substring(0, 30)}`);
              globalDownloaded++;
              setStats(prev => ({ ...prev, downloaded: prev.downloaded + 1 }));
            } else {
              console.error(`Errore inserimento ${folder}/${uid}:`, insertError);
              globalFailed++;
              setStats(prev => ({ ...prev, failed: prev.failed + 1 }));
            }

          } catch (error) {
            console.error(`Errore download ${folder}/${uid}:`, error);
            globalFailed++;
            setStats(prev => ({ ...prev, failed: prev.failed + 1 }));
          }

          const progressPercent = ((globalDownloaded + globalFailed) / globalTotal) * 100;
          setProgress(Math.round(progressPercent));
        }
        
        console.log(`✅ Cartella ${folder} completata:`);
        console.log(`   ${uidsToDownload.length} nuove scaricate`);
        console.log(`   ${alreadyPresentCount} già presenti (saltate in batch)`);
        if (globalFailed > 0) console.log(`   ${globalFailed} errori`);
        
        await loadQuickStats();
        
      } catch (folderError: any) {
        console.error(`❌ Errore cartella ${folder}:`, folderError.message || folderError);
        
        if (folderError.message?.includes('Timeout')) {
          toast({
            title: `⏱️ Timeout cartella ${folder}`,
            description: 'La cartella richiede troppo tempo. Continuo con la prossima...',
            variant: 'default',
          });
        } else {
          toast({
            title: `⚠️ Errore cartella ${folder}`,
            description: folderError.message || 'Continuando con la prossima cartella...',
            variant: 'default',
          });
        }
        
        continue;
      }
    }

    setProgress(100);
    setCurrentFolder('Completato!');

    toast({
      title: '✅ Download completato',
      description: `${globalDownloaded} email salvate, ${globalSkipped} duplicate saltate, ${globalFailed} errori`,
    });

    queryClient.invalidateQueries({ queryKey: ['email-integrity-check'] });
    queryClient.invalidateQueries({ queryKey: ['fun-email-quick-stats'] });
    await loadQuickStats();

    setIsDownloading(false);
    setProgress(0);
    setCurrentFolder('');
  };

  const handleDownloadFromPreferences = async () => {
    if (!userEmail) {
      toast({
        title: '❌ Errore',
        description: 'Email utente non trovata',
        variant: 'destructive',
      });
      return;
    }

    try {
      const preferences = await getSyncPreferences(userEmail);
      
      if (!preferences || preferences.included_folders.length === 0) {
        toast({
          title: '⚠️ Nessuna preferenza configurata',
          description: 'Configura le tue preferenze prima di avviare la sincronizzazione',
          variant: 'destructive',
        });
        return;
      }

      // ✅ VALIDAZIONE: filtra solo cartelle che esistono veramente
      const availableFolderNames = quickFolders.map(f => f.name);
      const validFolders = preferences.included_folders.filter(prefFolder => 
        availableFolderNames.includes(prefFolder)
      );

      if (validFolders.length === 0) {
        toast({
          title: '⚠️ Nessuna cartella valida',
          description: 'Le cartelle salvate nelle preferenze non esistono più',
          variant: 'destructive',
        });
        return;
      }

      // ✅ Aggiorna UI (opzionale, per visual feedback)
      setQuickFolders(prev => prev.map(f => ({
        ...f,
        selected: validFolders.includes(f.name)
      })));

      toast({
        title: '🚀 Avvio Sync da Preferenze',
        description: `${validFolders.length} cartelle selezionate`,
      });

      // ✅ CHIAMATA DIRETTA: passa cartelle esplicitamente
      await startDownload(validFolders);

    } catch (error: any) {
      toast({
        title: '❌ Errore',
        description: error.message || 'Errore durante il caricamento delle preferenze',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className="h-6 w-6 text-red-500" />
          <h3 className="text-lg font-semibold">Quick Download V3</h3>
          <Badge variant="default" className="bg-yellow-500">
            ⚡ Background Mode
          </Badge>
        </div>
      </div>

      {/* Progress Card (visible durante download) */}
      {isDownloading && (
        <Card className="border-purple-500 border-2 shadow-lg shadow-purple-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Gauge className="h-4 w-4 animate-pulse text-purple-500" />
                Download in corso
              </span>
              <Badge variant="secondary">
                ⚡ In corso
              </Badge>
            </CardTitle>
          </CardHeader>
            <CardContent className="space-y-3">
              {/* Real-Time Database Monitor */}
              {userEmail && (
                <RealtimeEmailInsertionMonitor
                  userEmail={userEmail}
                  isActive={isDownloading}
                />
              )}
              
              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">Progresso</span>
                  <span className="text-muted-foreground">
                    {stats.downloaded} / {stats.total} email
                  </span>
                </div>
                <Progress 
                  value={progress} 
                  className="h-2 bg-purple-100 dark:bg-purple-900" 
                />
              </div>

              {/* Cartella corrente */}
              <div className="flex items-center gap-2 text-sm">
                <FolderOpen className="h-4 w-4 text-purple-500" />
                <span className="font-medium truncate">{currentFolder || 'Preparazione...'}</span>
              </div>

              {/* Controlli Download */}
              {isDownloading && (
              <div className="flex gap-2 pt-2 border-t border-purple-200 dark:border-purple-800">
                {pauseState ? (
                  <>
                    <Button
                      onClick={resumeDownload}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      size="sm"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Riprendi Download
                    </Button>
                    <Button
                      onClick={stopDownload}
                      variant="destructive"
                      className="flex-1"
                      size="sm"
                    >
                      <Square className="mr-2 h-4 w-4" />
                      Ferma Definitivamente
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={pauseDownload}
                      variant="outline"
                      className="flex-1"
                      size="sm"
                    >
                      <Pause className="mr-2 h-4 w-4" />
                      Pausa
                    </Button>
                    <Button
                      onClick={stopDownload}
                      variant="destructive"
                      className="flex-1"
                      size="sm"
                    >
                      <Square className="mr-2 h-4 w-4" />
                      Ferma
                    </Button>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats durante download */}
      {isDownloading && (
        <div className="flex items-center justify-around gap-6 px-4 animate-fade-in">
          {/* Da scaricare */}
          <div className="flex flex-col items-center">
            <div className="text-3xl font-bold text-blue-600">
              {stats.total - stats.downloaded - stats.failed}
            </div>
            <div className="text-xs text-muted-foreground">da scaricare</div>
          </div>

          {/* GIF Animata */}
          <img 
            src={emailFolderGif} 
            alt="Email downloading animation" 
            className="w-20 h-20 object-contain"
          />

          {/* Scaricate */}
          <div className="flex flex-col items-center">
            <div className="text-3xl font-bold text-green-600">
              {stats.downloaded}
            </div>
            <div className="text-xs text-muted-foreground">scaricate</div>
          </div>
        </div>
      )}

      {/* Sync da Preferenze */}
      {!isDownloading && (
        <Card className="border-purple-500 border-2 bg-purple-50/10">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-5 w-5 text-purple-500" />
              Sync da Preferenze
              
              {activeProfile && (
                <Badge 
                  variant="secondary" 
                  className="ml-2 bg-green-500/20 text-green-400 border border-green-500/30"
                >
                  🎯 {activeProfile.profile_name}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sincronizza automaticamente solo le cartelle configurate nelle preferenze.
            </p>
            
            <div className="flex gap-2">
              {/* Pulsante Performance Configurator */}
              <Dialog open={isPerformanceDialogOpen} onOpenChange={handlePerformanceDialogChange}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 border-primary text-primary">
                    <Sliders className="h-4 w-4" />
                    Performance
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>🎯 Performance Profile Configurator</DialogTitle>
                  </DialogHeader>
                  <PerformanceProfileConfigurator />
                </DialogContent>
              </Dialog>

              {/* Pulsante Configura Preferenze */}
              <Dialog open={isPreferencesDialogOpen} onOpenChange={setIsPreferencesDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Settings className="h-4 w-4" />
                    Configura
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

              {/* Pulsante Avvia Sync */}
              <Button
                className="flex-1 border-purple-500 text-purple-600 hover:bg-purple-50"
                variant="outline"
                size="sm"
                onClick={handleDownloadFromPreferences}
                disabled={isQuickLoading || isDownloading}
              >
                <Download className="mr-2 h-4 w-4" />
                Avvia Sync da Preferenze
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Folder Selection */}
      {!isDownloading && (
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
      {!isDownloading && (
        <Button
          className="w-full"
          size="lg"
          onClick={() => startDownload()}
          disabled={isQuickLoading || isDownloading || quickFolders.filter(f => f.selected).length === 0}
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
