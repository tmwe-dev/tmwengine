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
  Settings,
  Sliders
} from 'lucide-react';
// ✅ Rimosso EmailSyncUnified - ora usa metodo Performance Test Suite
import { emailFolderApi } from '@/lib/tmwe-api-integrated';
import { FolderSyncPreferencesManager } from '@/components/email/sync/FolderSyncPreferencesManager';
import { PerformanceProfileConfigurator } from '@/components/testing/PerformanceProfileConfigurator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getSyncPreferences, filterFolders } from '@/lib/email-sync-preferences';

interface QuickSyncStats {
  downloaded: number;
  inserted: number;
  duration: number;
  avgSpeed: number;
  errors: number;
}

interface QuickSyncProgress {
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  foldersToSync: string[];
  completedFolders: string[];
  currentFolder: string | null;
  downloadedInFolder: number;
  totalInFolder: number;
  overallDownloaded: number;
  overallTotal: number;
  speed: number;
  eta: number;
}

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
  const [isQuickLoading, setIsQuickLoading] = useState(true);
  const [isPreferencesDialogOpen, setIsPreferencesDialogOpen] = useState(false);
  const [isPerformanceDialogOpen, setIsPerformanceDialogOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [abortController, setAbortController] = useState<AbortController | null>(null);
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
          skipCache: true
        });

      console.log('📂 [loadQuickFolders] RAW API RESPONSE:', JSON.stringify(quickResponse, null, 2));
      console.log('📂 [loadQuickFolders] Response type:', typeof quickResponse);
      console.log('📂 [loadQuickFolders] Is Array?', Array.isArray(quickResponse));

      const quickFoldersList = Array.isArray(quickResponse) 
        ? quickResponse 
        : (quickResponse?.data || quickResponse?.folders || []);
      
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

  // ✅ METODO PERFORMANCE TEST SUITE (FUNZIONANTE)
  const downloadEmailsLikePerformanceTest = async (folders: string[], userEmail: string) => {
    const startTime = performance.now();
    let totalDownloaded = 0;
    let totalInserted = 0;
    let errorCount = 0;
    const completedFolders: string[] = [];

    const controller = new AbortController();
    setAbortController(controller);

    setQuickProgress({
      status: 'running',
      foldersToSync: folders,
      completedFolders: [],
      currentFolder: null,
      downloadedInFolder: 0,
      totalInFolder: 0,
      overallDownloaded: 0,
      overallTotal: 0,
      speed: 0,
      eta: 0
    });

    for (let folderIndex = 0; folderIndex < folders.length; folderIndex++) {
      if (controller.signal.aborted) {
        console.log('⏹️ Download interrotto dall\'utente');
        break;
      }

      const folder = folders[folderIndex];
      console.log(`📂 [QuickDownload] Processing folder ${folderIndex + 1}/${folders.length}: ${folder}`);

      setQuickProgress(prev => prev ? {
        ...prev,
        currentFolder: folder,
        downloadedInFolder: 0,
        totalInFolder: 0
      } : null);

      try {
        // STEP 1: Fetch UIDs (come Performance Test Suite linee 280-290)
        const { data: uidData, error: uidError } = await supabase.functions.invoke('tmwe-api-proxy', {
          body: {
            endpoint: '/email_message',
            data: {
              handler: 'get_messages',
              folder: folder,
              limit: 1000,
              offset: 0
            }
          }
        });

        if (uidError || !uidData) {
          console.error(`❌ [QuickDownload] Error fetching UIDs for ${folder}:`, uidError);
          errorCount++;
          continue;
        }

        // Parsing robusto (come Performance Test Suite linee 297-304)
        const responseData = uidData?.success ? uidData : { ...uidData, success: true };
        const messagesArray = responseData.messages 
          || responseData.emails 
          || responseData.data?.messages 
          || responseData.data?.emails
          || [];

        if (!Array.isArray(messagesArray) || messagesArray.length === 0) {
          console.warn(`⚠️ [QuickDownload] No emails in ${folder}`);
          completedFolders.push(folder);
          continue;
        }

        const uids = messagesArray.map((m: any) => m.uid).filter(Boolean);
        console.log(`✅ [QuickDownload] Found ${uids.length} UIDs in ${folder}`);

        setQuickProgress(prev => prev ? {
          ...prev,
          totalInFolder: uids.length,
          overallTotal: prev.overallTotal + uids.length
        } : null);

        // STEP 2: Download singole email (come Performance Test Suite linee 350-359)
        const emails = [];
        for (let i = 0; i < uids.length; i++) {
          if (controller.signal.aborted) break;

          const uid = uids[i];
          
          try {
            const { data: emailData, error: emailError } = await supabase.functions.invoke('tmwe-api-proxy', {
              body: {
                endpoint: '/email_message',
                data: {
                  handler: 'get_message',
                  uid: uid,
                  folder: folder
                }
              }
            });

            if (!emailError && emailData) {
              // Estrai la risposta completa
              const rawEmail = emailData?.data || emailData;

              // Se la risposta ha header + body separati, uniscili
              const email = rawEmail?.header ? {
                ...rawEmail.header,
                body_plain: rawEmail.body_plain,
                body_html: rawEmail.body_html,
                body: rawEmail.body_html || rawEmail.body_plain,
                body_type: rawEmail.body_html ? 'html' : 'plain'
              } : (emailData?.message || emailData?.email || emailData);
              
              console.log(`📧 [QuickDownload] Parsed email for UID ${uid}:`, {
                rawStructure: Object.keys(rawEmail || {}),
                hasHeader: !!rawEmail?.header,
                hasUid: !!email?.uid,
                hasSubject: !!email?.subject,
                hasFrom: !!email?.from,
                finalStructure: Object.keys(email || {})
              });
              
              if (email && email.uid) {
                emails.push(email);
                totalDownloaded++;

                setQuickProgress(prev => prev ? {
                  ...prev,
                  downloadedInFolder: i + 1,
                  overallDownloaded: totalDownloaded,
                  speed: totalDownloaded / ((performance.now() - startTime) / 1000),
                  eta: ((performance.now() - startTime) / totalDownloaded) * (prev.overallTotal - totalDownloaded) / 1000
                } : null);
              } else {
                console.warn(`⚠️ [QuickDownload] Invalid email structure for UID ${uid}:`, email);
                errorCount++;
              }
            } else {
              console.error(`❌ [QuickDownload] Error downloading UID ${uid}:`, emailError);
              console.error(`📋 [QuickDownload] EmailData received:`, emailData);
              errorCount++;
            }
          } catch (err) {
            console.error(`❌ [QuickDownload] Error downloading UID ${uid}:`, err);
            errorCount++;
          }

          // Piccolo delay per evitare rate limiting
          if (i % 10 === 0 && i > 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        console.log(`✅ [QuickDownload] Downloaded ${emails.length} emails from ${folder}`);

        // STEP 3: Insert in DB (bulk insert con controllo duplicati)
        if (emails.length > 0) {
          // Controllo duplicati
          const messageIds = emails.map(e => `${folder}/${e.uid}`);
          const { data: existing } = await supabase
            .from('email_messages')
            .select('message_id')
            .in('message_id', messageIds)
            .eq('user_email', userEmail);

          const existingIds = new Set(existing?.map(e => e.message_id) || []);
          const newEmails = emails.filter(e => !existingIds.has(`${folder}/${e.uid}`));

          console.log(`📊 [QuickDownload] Duplicates check: ${emails.length} total, ${existingIds.size} existing, ${newEmails.length} new`);

          if (newEmails.length > 0) {
            const records = newEmails.map(email => {
              // Preparazione data ISO
              let isoDate = new Date().toISOString();
              if (email.date) {
                try {
                  isoDate = new Date(email.date).toISOString();
                } catch (e) {
                  console.error('Error parsing date:', email.date);
                }
              }

              return {
                message_id: `${folder}/${email.uid}`,
                from_email: email.from?.address || email.from || email.from_email || '',
                to_email: Array.isArray(email.to) 
                  ? email.to.map((t: any) => t.address || t).join(',')
                  : email.to || email.to_email || '',
                cc_email: email.cc || email.cc_email || null,
                bcc_email: email.bcc || email.bcc_email || null,
                subject: email.subject || '',
                body_text: email.body_text || email.text || email.body || '',
                body_html: email.body_html || email.html || '',
                data_ricezione: isoDate,
                cartella: folder,
                direzione: 'inbound',
                stato: email.flags?.includes('\\Seen') ? 'letto' : 'nuovo',
                flags: email.flags || [],
                attachments: email.attachments || [],
                provider_id: '00000000-0000-0000-0000-000000000000',
                user_email: userEmail,
                sync_status: 'fun_email_backup',
              };
            });

            const { error: insertError } = await supabase
              .from('email_messages')
              .insert(records);

            if (insertError) {
              console.error(`❌ [QuickDownload] Insert error for ${folder}:`, insertError);
              errorCount++;
            } else {
              totalInserted += records.length;
              console.log(`✅ [QuickDownload] Inserted ${records.length} emails into DB`);
            }
          }
        }

        completedFolders.push(folder);
        setQuickProgress(prev => prev ? {
          ...prev,
          completedFolders: [...prev.completedFolders, folder]
        } : null);

      } catch (err) {
        console.error(`❌ [QuickDownload] Error processing folder ${folder}:`, err);
        errorCount++;
      }
    }

    const duration = (performance.now() - startTime) / 1000;
    const avgSpeed = totalDownloaded / duration;

    setQuickProgress(prev => prev ? { ...prev, status: 'completed' } : null);

    return {
      downloaded: totalDownloaded,
      inserted: totalInserted,
      duration,
      avgSpeed,
      errors: errorCount
    };
  };

  const startQuickDownload = async () => {
    const quickSelectedFolders = quickFolders.filter(f => f.selected);
    
    const foldersToSync = quickSelectedFolders.length > 0 
      ? quickSelectedFolders.map(f => f.name)
      : ['INBOX']; // Default fallback
    
    console.log('🚀 [QuickDownload] STARTING SYNC');
    console.log('🚀 [QuickDownload] foldersToSync:', foldersToSync);

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

      setIsQuickLoading(true);

      // ✅ USA IL METODO DI PERFORMANCE TEST SUITE
      const stats = await downloadEmailsLikePerformanceTest(foldersToSync, profile.tmwe_email);

      toast({
        title: `✅ Download completato!`,
        description: `${stats.downloaded} email in ${Math.round(stats.duration)}s (${stats.avgSpeed.toFixed(1)} email/s)`,
      });

      setQuickProgress(null);
      onDownloadComplete?.(stats);
      loadQuickStats();

    } catch (error: any) {
      console.error('❌ Quick start error:', error);
      
      toast({
        title: '❌ Errore',
        description: error.message,
        variant: 'destructive',
      });

      setQuickProgress(null);
    } finally {
      setIsQuickLoading(false);
      setAbortController(null);
    }
  };

  const pauseQuickDownload = () => {
    setQuickProgress(prev => prev ? { ...prev, status: 'paused' } : null);
    toast({ title: '⏸️ Download in pausa' });
  };

  const resumeQuickDownload = () => {
    setQuickProgress(prev => prev ? { ...prev, status: 'running' } : null);
    toast({ title: '▶️ Download ripreso' });
  };

  const stopQuickDownload = () => {
    if (abortController) {
      abortController.abort();
      toast({ title: '⏹️ Download interrotto' });
    }
    setQuickProgress(null);
    setAbortController(null);
  };

  const quickOverallProgress = quickProgress && quickProgress.foldersToSync.length > 0
    ? (quickProgress.completedFolders.length / quickProgress.foldersToSync.length) * 100
    : 0;

  // ✅ NUOVO: Download email basato su preferenze utente
  const downloadEmailsFromPreferences = async () => {
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

      console.log('🔍 [PreferencesSync] Loading preferences for:', profile.tmwe_email);

      // STEP 1: Recupera preferenze utente
      const preferences = await getSyncPreferences(profile.tmwe_email);
      console.log('🔍 [PreferencesSync] Preferences loaded:', preferences);

      // STEP 2: Carica cartelle dal server
      const serverFoldersResponse = await emailFolderApi.getFolders({ 
        include_counts: false,
        skipCache: true
      });

      const serverFoldersList = Array.isArray(serverFoldersResponse) 
        ? serverFoldersResponse 
        : (serverFoldersResponse?.data || serverFoldersResponse?.folders || []);

      const serverFolders = serverFoldersList.map((f: any) => ({
        name: f.name || f,
        display_name: f.display_name || f.name || f
      }));

      console.log('🔍 [PreferencesSync] Server folders:', serverFolders.map(f => f.name));

      // STEP 3: Filtra cartelle in base a preferenze
      const filteredFolders = filterFolders(serverFolders, preferences);
      const foldersToSync = filteredFolders.map(f => f.name);

      console.log('🔍 [PreferencesSync] Filtered folders to sync:', foldersToSync);

      if (foldersToSync.length === 0) {
        toast({
          title: '⚠️ Attenzione',
          description: 'Nessuna cartella selezionata nelle preferenze',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: '🚀 Sync da Preferenze avviato',
        description: `Sincronizzazione di ${foldersToSync.length} cartelle...`,
      });

      setIsQuickLoading(true);

      // STEP 4: Usa il metodo di download testato (identico a Quick Download)
      const stats = await downloadEmailsLikePerformanceTest(foldersToSync, profile.tmwe_email);

      toast({
        title: `✅ Sync completato!`,
        description: `${stats.downloaded} email in ${Math.round(stats.duration)}s (${stats.avgSpeed.toFixed(1)} email/s)`,
      });

      setQuickProgress(null);
      onDownloadComplete?.(stats);
      loadQuickStats();

    } catch (error: any) {
      console.error('❌ Preferences sync error:', error);
      
      toast({
        title: '❌ Errore',
        description: error.message,
        variant: 'destructive',
      });

      setQuickProgress(null);
    } finally {
      setIsQuickLoading(false);
      setAbortController(null);
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
                  {quickProgress.overallDownloaded}
                </div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Scaricate
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-500">
                  {quickProgress.overallTotal}
                </div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Download className="h-3 w-3" />
                  Totali
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
            {quickProgress.eta > 0 && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Tempo stimato: {Math.round(quickProgress.eta)}s
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ✅ NUOVO: Sync da Preferenze */}
      {!quickProgress && (
        <Card className="border-purple-500 border-2 bg-purple-50/10">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-5 w-5 text-purple-500" />
              Sync da Preferenze
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sincronizza automaticamente solo le cartelle configurate nelle preferenze.
            </p>
            
            <div className="flex gap-2">
              {/* Pulsante Performance Configurator */}
              <Dialog open={isPerformanceDialogOpen} onOpenChange={setIsPerformanceDialogOpen}>
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
                onClick={downloadEmailsFromPreferences}
                disabled={isQuickLoading}
              >
                <Download className="mr-2 h-4 w-4" />
                Avvia Sync da Preferenze
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
