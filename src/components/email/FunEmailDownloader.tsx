import { useState, useEffect, useRef } from 'react';
import emailFolderGif from '@/assets/email-folder-unscreen.gif';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Download, Folder, CheckSquare, Square, Pause, Play } from 'lucide-react';
import { DownloadButtonWithLabel } from '@/components/design-system/buttons/DownloadButtonWithLabel';
import { emailMessageApi } from '@/lib/tmwe-api-integrated';
import { emailSearchApi } from '@/lib/tmwe-email-search-api';
import { EmailFolderComparisonDialog } from './EmailFolderComparisonDialog';

interface FunEmailDownloaderProps {
  onDownloadComplete?: (stats: {
    totalDownloaded: number;
    folders: string[];
    dateRange: { from: Date; to: Date };
  }) => void;
  onStatsUpdate?: (stats: {
    totalDB: number;
    folders: { name: string; count: number }[];
  }) => void;
}

export const FunEmailDownloader = ({ onDownloadComplete, onStatsUpdate }: FunEmailDownloaderProps) => {
  const queryClient = useQueryClient();
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFolder, setCurrentFolder] = useState('');
  const [availableFolders, setAvailableFolders] = useState<any[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<string[]>(['INBOX']);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    downloaded: 0,
    failed: 0,
    skipped: 0,
  });
  const { toast } = useToast();
  const shouldStop = useRef(false);
  const isPaused = useRef(false);
  const [pauseState, setPauseState] = useState(false);
  const [comparisonDialogOpen, setComparisonDialogOpen] = useState(false);

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

  // Carica conteggio email dal DB e notifica stats al componente padre
  const loadAndUpdateStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tmwe_email')
        .eq('user_id', user.id)
        .single();

      if (!profile?.tmwe_email) return;

      // Query per contare email per cartella dal DB
      const { data, error } = await supabase
        .from('email_messages')
        .select('cartella')
        .eq('user_email', profile.tmwe_email)
        .eq('sync_status', 'fun_email_backup');

      if (error) {
        console.error('Errore caricamento conteggi DB:', error);
        return;
      }

      // Conta per cartella
      const counts: Record<string, number> = {};
      data?.forEach((row) => {
        const folder = row.cartella || 'Unknown';
        counts[folder] = (counts[folder] || 0) + 1;
      });

      const totalDB = Object.values(counts).reduce((sum, count) => sum + count, 0);

      console.log('📊 Email nel DB per cartella:', counts);
      console.log('📊 Totale DB:', totalDB);

      // Notifica al padre con dati accurati dal DB
      onStatsUpdate?.({
        totalDB,
        folders: Object.entries(counts).map(([name, count]) => ({ name, count })),
      });
    } catch (error) {
      console.error('Errore conteggio email DB:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoadingFolders(true);
      try {
        const response = await emailSearchApi.getFolders();
        const folders = response.folders || [];
        
        console.log('📂 Cartelle disponibili:', folders.length);
        setAvailableFolders(folders);
        
        // Carica stats dal DB
        await loadAndUpdateStats();
      } catch (error) {
        console.error('Errore caricamento cartelle:', error);
        toast({
          title: '⚠️ Impossibile caricare cartelle',
          description: 'Verrà usata solo INBOX',
          variant: 'default',
        });
      } finally {
        setLoadingFolders(false);
      }
    };
    
    loadData();
  }, [toast]);

  const toggleFolder = (folderName: string) => {
    setSelectedFolders(prev => 
      prev.includes(folderName)
        ? prev.filter(f => f !== folderName)
        : [...prev, folderName]
    );
  };

  const toggleSelectAll = () => {
    if (selectedFolders.length === availableFolders.length) {
      setSelectedFolders([]);
    } else {
      const allFolderNames = availableFolders.map(f => f.folder_name || f.name);
      setSelectedFolders(allFolderNames);
    }
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

  const startDownload = async () => {
    if (selectedFolders.length === 0) {
      toast({
        title: '⚠️ Nessuna cartella selezionata',
        description: 'Seleziona almeno una cartella da scaricare',
        variant: 'default',
      });
      return;
    }

    shouldStop.current = false;
    isPaused.current = false;
    setPauseState(false);
    setIsDownloading(true);
    setProgress(0);
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
        
        const uidListResponse = await fetchWithTimeout(
          emailMessageApi.getMessages({
            folder: folder,
            limit: 2000,
            offset: 0,
          }),
          20000,
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
        
        // Batch query per trovare email già presenti (massimo 1000 alla volta)
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
        
        // Filtra solo UID da scaricare (non presenti nel DB)
        const uidsToDownload = uidList.filter(u => {
          const messageId = `${folder}/${String(u.uid)}`;
          return !existingSet.has(messageId);
        });
        
        const alreadyPresentCount = uidList.length - uidsToDownload.length;
        
        console.log(`📂 ${folder}: ${uidsToDownload.length} nuove email da scaricare`);
        console.log(`📂 ${folder}: ${alreadyPresentCount} già presenti (saltate in batch)`);
        
        // Aggiorna conteggi globali considerando solo email da scaricare
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
            
            // ✅ Accedi alla struttura corretta dell'API TMWE
            const emailData = email?.data;
            const header = emailData?.header;
            
            // ✅ LOGGING DIAGNOSTICO DETTAGLIATO
            console.log('╔════════════════════════════════════════════════════════╗');
            console.log('║ 📧 DIAGNOSTIC: API Response Structure                 ║');
            console.log('╚════════════════════════════════════════════════════════╝');
            console.log('📧 email.data:', emailData ? 'exists ✅' : 'missing ❌');
            console.log('📧 email.data.header:', header ? 'exists ✅' : 'missing ❌');
            if (header) {
              console.log('📧 header.subject:', header.subject || '(empty)');
              console.log('📧 header.from:', header.from || '(empty)');
              console.log('📧 header.to:', header.to || '(empty)');
            }
            console.log('📧 emailData.body_plain:', emailData?.body_plain ? `${String(emailData.body_plain).substring(0, 50)}...` : 'missing');
            console.log('📧 emailData.body_html:', emailData?.body_html ? `${String(emailData.body_html).substring(0, 50)}...` : 'missing');
            console.log('╚════════════════════════════════════════════════════════╝');
            
            if (!email || !emailData || !header) {
              console.warn(`⚠️ Email ${folder}/${uid}: struttura API invalida o email non trovata`);
              globalFailed++;
              setStats(prev => ({ ...prev, failed: prev.failed + 1 }));
              continue;
            }

            // Parsing data ISO
            let isoDate = new Date().toISOString();
            if (header.date) {
              try {
                isoDate = new Date(header.date).toISOString();
              } catch (e) {
                console.error('Error parsing date:', header.date);
              }
            }

            // ✅ Mapping corretto secondo struttura API nested
            const { error: insertError } = await supabase.from('email_messages').insert({
              message_id: messageId,
              from_email: header.from || '',
              to_email: Array.isArray(header.to) 
                ? header.to.map((t: any) => t.email || t.address || t).join(',')
                : (header.to || ''),
              cc_email: Array.isArray(header.cc)
                ? header.cc.map((c: any) => c.email || c.address || c).join(',')
                : (header.cc || null),
              bcc_email: Array.isArray(header.bcc)
                ? header.bcc.map((b: any) => b.email || b.address || b).join(',')
                : (header.bcc || null),
              subject: header.subject || '',
              body_text: emailData.body_plain || emailData.body_text || emailData.text || '',
              body_html: emailData.body_html || emailData.html || '',
              data_ricezione: isoDate,
              cartella: folder,
              direzione: 'inbound',
              stato: header.seen || header.flags?.includes('\\Seen') ? 'letto' : 'nuovo',
              flags: header.flags || emailData.flags || [],
              attachments: emailData.attachments || [],
              provider_id: '00000000-0000-0000-0000-000000000000',
              user_email: profile.tmwe_email,
              sync_status: 'fun_email_backup',
            });

            if (!insertError) {
              console.log(`   ✅ Salvata ${folder}/${uid}: ${header.subject?.substring(0, 30)}`);
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
        
        // ✅ Ricarica stats aggiornate dal DB dopo ogni cartella
        await loadAndUpdateStats();
        
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

    const downloadStats = {
      totalDownloaded: globalDownloaded,
      folders: selectedFolders,
      dateRange: {
        from: new Date(),
        to: new Date(),
      },
    };

    toast({
      title: '✅ Download completato',
      description: `${globalDownloaded} email salvate, ${globalSkipped} duplicate saltate, ${globalFailed} errori`,
    });

    onDownloadComplete?.(downloadStats);
    
    // ✅ Invalida cache per aggiornare FunEmailQuickStats e stats finali
    queryClient.invalidateQueries({ queryKey: ['fun-email-quick-stats'] });
    await loadAndUpdateStats();

    setIsDownloading(false);
    setProgress(0);
    setCurrentFolder('');
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        {isDownloading && (
          <div className="relative flex items-center justify-center gap-6 mb-4">
            {pauseState && (
              <div className="absolute top-0 right-0 bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                <Pause className="h-3 w-3" />
                IN PAUSA
              </div>
            )}
            
            <div className="flex flex-col items-center">
              <div className="text-3xl font-bold text-blue-600">
                {stats.total - stats.downloaded - stats.failed - stats.skipped}
              </div>
              <div className="text-xs text-muted-foreground">da scaricare</div>
            </div>
            
            <img 
              src={emailFolderGif} 
              alt="Downloading" 
              className="w-20 h-20"
            />
            
            <div className="flex flex-col items-center">
              <div className="text-3xl font-bold text-green-600">
                {stats.downloaded}
              </div>
              <div className="text-xs text-muted-foreground">scaricate</div>
            </div>
          </div>
        )}
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Folder className="h-4 w-4" />
              Seleziona cartelle da scaricare
            </Label>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSelectAll}
              disabled={isDownloading || loadingFolders}
            >
              {selectedFolders.length === availableFolders.length ? 'Deseleziona Tutte' : 'Seleziona Tutte'}
            </Button>
          </div>
          
          {loadingFolders ? (
            <div className="text-xs text-muted-foreground">Caricamento cartelle...</div>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded p-2">
              {availableFolders.map((folder) => {
                const folderName = folder.folder_name || folder.name;
                const isSelected = selectedFolders.includes(folderName);
                
                return (
                  <div key={folderName} className="flex items-center space-x-2">
                    <Checkbox
                      id={`folder-${folderName}`}
                      checked={isSelected}
                      onCheckedChange={() => toggleFolder(folderName)}
                      disabled={isDownloading}
                    />
                    <Label
                      htmlFor={`folder-${folderName}`}
                      className="text-xs cursor-pointer flex items-center gap-1"
                    >
                      {isSelected ? <CheckSquare className="h-3 w-3" /> : <Square className="h-3 w-3" />}
                      {folderName}
                    </Label>
                  </div>
                );
              })}
            </div>
          )}
          
          <p className="text-xs text-muted-foreground">
            {selectedFolders.length} {selectedFolders.length === 1 ? 'cartella selezionata' : 'cartelle selezionate'}
          </p>
        </div>

        {!isDownloading ? (
          <div className="flex gap-2">
            <DownloadButtonWithLabel
              label={`Prepara Email (${selectedFolders.length})`}
              icon={Download}
              strategy="sequential"
              config={{
                batchSize: 1,
                maxConcurrent: 1
              }}
              edgeFunction="tmwe-api-proxy"
              internalFunction="FunEmailDownloader.startDownload()"
              onClick={startDownload}
              disabled={selectedFolders.length === 0}
              size="lg"
              className="flex-1"
            />
            <Button
              variant="outline"
              onClick={() => setComparisonDialogOpen(true)}
              disabled={loadingFolders}
              size="lg"
            >
              🔍 Verifica
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            {pauseState ? (
              <>
                <Button
                  onClick={resumeDownload}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Riprendi Download
                </Button>
                <Button
                  onClick={stopDownload}
                  variant="destructive"
                  className="flex-1"
                  size="lg"
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
                  size="lg"
                >
                  <Pause className="mr-2 h-4 w-4" />
                  Pausa
                </Button>
                <Button
                  onClick={stopDownload}
                  variant="destructive"
                  className="flex-1"
                  size="lg"
                >
                  <Square className="mr-2 h-4 w-4" />
                  Ferma
                </Button>
              </>
            )}
          </div>
        )}

        {isDownloading && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium">
              <span>{currentFolder}</span>
              <span>{stats.downloaded + stats.failed + stats.skipped}/{stats.total}</span>
            </div>
            <Progress value={progress} className="w-full" />
            <div className="grid grid-cols-3 gap-2 text-xs text-center">
              <div className="text-green-600 font-medium">
                ✅ {stats.downloaded} salvate
              </div>
              <div className="text-yellow-600 font-medium">
                ⏭️ {stats.skipped} duplicate
              </div>
              <div className="text-red-600 font-medium">
                ❌ {stats.failed} errori
              </div>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1 bg-muted/50 p-3 rounded">
          <p>📥 Scarica email complete dal server TMWE</p>
          <p>💾 Salva: oggetto, body (text + html), allegati</p>
          <p>🔄 Salta automaticamente email già scaricate</p>
          <p>📊 Backup sincronizzato con stato dettagliato</p>
        </div>
      </CardContent>
      
      <EmailFolderComparisonDialog
        open={comparisonDialogOpen}
        onOpenChange={setComparisonDialogOpen}
        onSelectFolder={(folderName) => {
          setSelectedFolders([folderName]);
          setComparisonDialogOpen(false);
          toast({
            title: `📬 Cartella selezionata`,
            description: `${folderName} pronta per il download`
          });
        }}
      />
    </Card>
  );
};
