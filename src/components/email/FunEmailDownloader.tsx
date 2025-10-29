import { useState, useEffect, useRef } from 'react';
import emailFolderGif from '@/assets/email-folder-unscreen.gif';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Download, Loader2, Folder, CheckSquare, Square } from 'lucide-react';
import { emailMessageApi } from '@/lib/tmwe-api-integrated';
import { emailSearchApi } from '@/lib/tmwe-email-search-api';

interface FunEmailDownloaderProps {
  onDownloadComplete?: (stats: {
    totalDownloaded: number;
    folders: string[];
    dateRange: { from: Date; to: Date };
  }) => void;
  onStatsUpdate?: (stats: {
    totalServer: number;
    totalDB: number;
    folders: { name: string; server: number; db: number }[];
  }) => void;
}

export const FunEmailDownloader = ({ onDownloadComplete, onStatsUpdate }: FunEmailDownloaderProps) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFolder, setCurrentFolder] = useState('');
  const [availableFolders, setAvailableFolders] = useState<any[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<string[]>(['INBOX']);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [downloadedCounts, setDownloadedCounts] = useState<Record<string, number>>({});
  const [folderServerCounts, setFolderServerCounts] = useState<Record<string, number>>({});
  const [stats, setStats] = useState({
    total: 0,
    downloaded: 0,
    failed: 0,
    skipped: 0,
  });
  const { toast } = useToast();
  const shouldStop = useRef(false);

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

  // Carica conteggio email già scaricate per cartella
  const loadDownloadedCounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tmwe_email')
        .eq('user_id', user.id)
        .single();

      if (!profile?.tmwe_email) return;

      const { data, error } = await supabase
        .from('email_messages')
        .select('cartella')
        .eq('user_email', profile.tmwe_email);

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

      console.log('📊 Email già scaricate per cartella:', counts);
      setDownloadedCounts(counts);
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
        
        // 🔍 LOGGING DETTAGLIATO PER DEBUG
        console.log('🔍 RAW API Response:', JSON.stringify(response, null, 2));
        console.log('📂 Folders array:', JSON.stringify(folders, null, 2));
        
        // Log dettagliato per ogni cartella
        folders.forEach((folder: any) => {
          const folderName = folder.folder_name || folder.name;
          console.log(`📁 ${folderName}:`, {
            allKeys: Object.keys(folder),
            total_messages: folder.total_messages,
            messages: folder.messages,
            message_count: folder.message_count,
            count: folder.count,
            total: folder.total,
            rawFolder: folder
          });
        });
        
        setAvailableFolders(folders);
        
        // 💾 Salva i contatori server per cartella nello state
        const serverCounts: Record<string, number> = {};
        folders.forEach(f => {
          const folderName = f.folder_name || f.name;
          serverCounts[folderName] = f.total_messages || f.messages || f.message_count || 0;
        });
        setFolderServerCounts(serverCounts);
        
        // ✅ Carica anche i conteggi dal DB
        await loadDownloadedCounts();
        
        // Calcola totali globali
        const totalServer = Object.values(serverCounts).reduce((sum, count) => sum + count, 0);

        // Attendi che downloadedCounts sia aggiornato
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('tmwe_email')
            .eq('user_id', user.id)
            .single();

          if (profile?.tmwe_email) {
            const { data } = await supabase
              .from('email_messages')
              .select('cartella')
              .eq('user_email', profile.tmwe_email);

            const counts: Record<string, number> = {};
            data?.forEach((row) => {
              const folder = row.cartella || 'Unknown';
              counts[folder] = (counts[folder] || 0) + 1;
            });

            const totalDB = Object.values(counts).reduce((sum, count) => sum + count, 0);

            console.log('🌍 Totali globali:', { totalServer, totalDB });

            // Notifica al padre
            onStatsUpdate?.({
              totalServer,
              totalDB,
              folders: folders.map(f => {
                const folderName = f.folder_name || f.name;
                return {
                  name: folderName,
                  server: f.total_messages || f.messages || f.message_count || 0,
                  db: counts[folderName] || 0,
                };
              }),
            });
          }
        }
        
        console.log('📂 Cartelle caricate:', folders.length);
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

  // Calcola quante email da scaricare ci sono nelle cartelle selezionate (server - DB)
  const getSelectedEmailsCount = () => {
    return selectedFolders.reduce((total, folderName) => {
      const serverCount = folderServerCounts[folderName] || 0;
      const dbCount = downloadedCounts[folderName] || 0;
      const remaining = Math.max(0, serverCount - dbCount);
      return total + remaining;
    }, 0);
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
          60000,
          `Timeout recupero UID per cartella ${folder}`
        );
        
        const uidList = uidListResponse?.messages || [];
        
        console.log(`📂 ${folder}: API ha restituito ${uidList.length} UID`);
        console.log(`   Primi 5 UID:`, uidList.slice(0, 5).map(u => u.uid));
        
        globalTotal += uidList.length;
        setStats(prev => ({ ...prev, total: globalTotal }));
        
        if (uidList.length === 0) {
          console.log(`📂 ${folder}: nessuna email trovata`);
          continue;
        }

        console.log(`📂 ${folder}: trovate ${uidList.length} email da processare`);

        for (let i = 0; i < uidList.length; i++) {
          if (shouldStop.current) {
            console.log('⏸️ Download fermato dall\'utente');
            break;
          }

          const uidInfo = uidList[i];
          const uid = String(uidInfo.uid);
          
          setCurrentFolder(`📂 ${folder}: ${i + 1}/${uidList.length}`);
          
          try {
            const email = await fetchWithTimeout(
              emailMessageApi.getMessage(uid, folder, false),
              30000,
              `Timeout recupero email ${folder}/${uid}`
            );
            
            console.log(`   ✅ Scaricata ${folder}/${uid}: ${email?.subject?.substring(0, 30) || 'no subject'}`);
            
            if (!email) {
              console.warn(`⚠️ Email ${folder}/${uid} non trovata`);
              globalFailed++;
              setStats(prev => ({ ...prev, failed: prev.failed + 1 }));
              continue;
            }

            // Check duplicati
            const messageId = String(email.message_id || email.uid || `msg-${Date.now()}-${Math.random()}`);
            const { data: existing } = await supabase
              .from('email_messages')
              .select('id')
              .eq('message_id', messageId)
              .eq('user_email', profile.tmwe_email)
              .maybeSingle();
            
            if (existing) {
              globalSkipped++;
              setStats(prev => ({ ...prev, skipped: prev.skipped + 1 }));
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
              sync_status: 'sincronizzato',
            });

            if (!insertError) {
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

          const progressPercent = ((globalDownloaded + globalFailed + globalSkipped) / globalTotal) * 100;
          setProgress(Math.round(progressPercent));
        }
        
        console.log(`✅ Cartella ${folder} completata: ${globalDownloaded} scaricate, ${globalSkipped} saltate, ${globalFailed} errori`);
        
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

    setIsDownloading(false);
    setProgress(0);
    setCurrentFolder('');
  };

  const selectedEmailsCount = getSelectedEmailsCount();

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        {isDownloading && (
          <div className="flex items-center justify-center gap-6 mb-4">
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
                      <span className="text-muted-foreground text-[10px]">
                        ({folder.total_messages || folder.messages || folder.message_count || 0} sul server
                        {downloadedCounts[folderName] !== undefined && (
                          <>
                            {' | '}
                            <span className="text-green-600 font-medium">
                              {downloadedCounts[folderName]} scaricate
                            </span>
                            {' | '}
                            <span className="text-blue-600 font-medium">
                              {Math.max(0, (folder.total_messages || folder.messages || folder.message_count || 0) - downloadedCounts[folderName])} da scaricare
                            </span>
                          </>
                        )}
                        {downloadedCounts[folderName] > 0 && 
                         downloadedCounts[folderName] >= (folder.total_messages || folder.messages || folder.message_count || 0) && (
                          <span className="ml-1 text-green-600">✓</span>
                        )})
                      </span>
                    </Label>
                  </div>
                );
              })}
            </div>
          )}
          
          <p className="text-xs text-muted-foreground">
            {selectedFolders.length} cartelle selezionate • {selectedEmailsCount.toLocaleString()} email da scaricare
          </p>
        </div>

        <Button
          onClick={startDownload}
          disabled={isDownloading || selectedFolders.length === 0}
          className="w-full"
          size="lg"
        >
          {isDownloading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Scaricamento in corso...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Prepara Email per AI ({selectedFolders.length} cartelle • {selectedEmailsCount.toLocaleString()} email)
            </>
          )}
        </Button>

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
    </Card>
  );
};
