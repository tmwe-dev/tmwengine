import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useFolderList } from '@/hooks/useFolderList';
import { emailMessageApi } from '@/lib/tmwe-api-integrated';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Inbox, Send, FileText, Trash2, Archive, Folder, Database, ArrowUpDown, XCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FolderSyncManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFolder?: string;
}

export const FolderSyncManager = ({ open, onOpenChange }: FolderSyncManagerProps) => {
  const { folders, loading: loadingFolders } = useFolderList();
  
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'name' | 'emails'>('name');
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<string>('');
  const [currentFolderIndex, setCurrentFolderIndex] = useState(0);
  const [completedFolders, setCompletedFolders] = useState<string[]>([]);
  const [shouldStop, setShouldStop] = useState(false);
  const [totalDownloaded, setTotalDownloaded] = useState(0);
  const [folderStats, setFolderStats] = useState<Record<string, number>>({});
  const [syncProgress, setSyncProgress] = useState({
    currentEmailIndex: 0,
    totalEmails: 0,
    phase: 'idle' as 'idle' | 'metadata' | 'download' | 'saving'
  });

  // Carica statistiche email già scaricate
  useEffect(() => {
    if (open && folders.length > 0) {
      loadFolderStats();
    }
  }, [open, folders]);

  const loadFolderStats = async () => {
    const userEmail = sessionStorage.getItem('tmwe_user_email');
    if (!userEmail) return;
    
    const stats: Record<string, number> = {};
    
    for (const folder of folders) {
      const { count } = await supabase
        .from('email_messages')
        .select('*', { count: 'exact', head: true })
        .eq('cartella', folder.name)
        .eq('user_email', userEmail);
      
      stats[folder.name] = count || 0;
    }
    
    setFolderStats(stats);
  };

  const handleFolderToggle = (folderName: string) => {
    setSelectedFolders(prev =>
      prev.includes(folderName)
        ? prev.filter(f => f !== folderName)
        : [...prev, folderName]
    );
  };

  const handleSelectAll = () => {
    setSelectedFolders(folders.map(f => f.name));
  };

  const handleDeselectAll = () => {
    setSelectedFolders([]);
  };

  const downloadFolderEmails = async (folderName: string, totalEmails: number): Promise<number> => {
    const userEmail = sessionStorage.getItem('tmwe_user_email');
    if (!userEmail) {
      toast.error('Utente non autenticato');
      return 0;
    }

    try {
      console.log(`📥 INIZIO download ${folderName} (${totalEmails} email totali)`);
      setSyncProgress(prev => ({ ...prev, phase: 'metadata' }));
      
      // 1. Recupera email già presenti
      const { data: existingEmails } = await supabase
        .from('email_messages')
        .select('message_id')
        .eq('cartella', folderName)
        .eq('user_email', userEmail);

      const existingIds = new Set(existingEmails?.map(e => e.message_id) || []);
      
      console.log(`📊 ${folderName}: ${existingIds.size} già presenti`);

      if (existingIds.size >= totalEmails) {
        console.log(`✅ ${folderName}: Tutte le email già scaricate`);
        return 0;
      }

      const batchSize = 10;
      const totalPages = Math.ceil(totalEmails / batchSize);
      let newEmailsCount = 0;

      // 2. Scarica batch per batch CON 2 FASI
      for (let page = 1; page <= totalPages; page++) {
        if (shouldStop) break;

        console.log(`📦 FASE 1 - Batch ${page}/${totalPages}: richiesta lista UIDs...`);

        // FASE 1: Ottieni lista UIDs (metadati leggeri)
        const response = await emailMessageApi.getMessages({
          folder: folderName,
          limit: batchSize,
          page,
        });

        const pageEmails = response?.messages || [];
        console.log(`✓ FASE 1: Ricevuti ${pageEmails.length} metadati`);

        if (pageEmails.length === 0) break;

        const missingEmails = pageEmails.filter((email: any) => {
          const emailId = String(email.uid || email.message_id);
          return !existingIds.has(emailId);
        });

        console.log(`📧 Da scaricare: ${missingEmails.length} email nuove`);

        if (missingEmails.length === 0) {
          console.log('⏭️ Nessuna nuova email in questo batch');
          continue;
        }

        // FASE 2: Download contenuto completo con gestione errori individuale
        setSyncProgress({
          currentEmailIndex: 0,
          totalEmails: missingEmails.length,
          phase: 'download'
        });

        const completeEmails = [];
        const errors = [];

        for (let i = 0; i < missingEmails.length; i++) {
          if (shouldStop) break;

          setSyncProgress({
            currentEmailIndex: i + 1,
            totalEmails: missingEmails.length,
            phase: 'download'
          });

          const emailMeta = missingEmails[i];
          const uid = emailMeta.uid || emailMeta.message_id;

          try {
            console.log(`📧 FASE 2 [${i + 1}/${missingEmails.length}]: Scaricamento UID ${uid}...`);
            
            const fullEmail = await emailMessageApi.getMessage(String(uid), false);
            
            if (!fullEmail || fullEmail.success === false) {
              throw new Error(`API returned invalid response for UID ${uid}`);
            }
            
            console.log(`✓ Email ${uid}: subject="${fullEmail.subject?.substring(0, 30)}..."`);

            let isoDate = new Date().toISOString();
            if (fullEmail.date || emailMeta.date) {
              try {
                isoDate = new Date(fullEmail.date || emailMeta.date).toISOString();
              } catch (e) {
                console.error('Error parsing date:', fullEmail.date || emailMeta.date);
              }
            }

            const completeEmail = {
              message_id: String(uid),
              from_email: fullEmail.from || emailMeta.from || '',
              to_email: Array.isArray(fullEmail.to) ? fullEmail.to.join(', ') : (fullEmail.to || ''),
              cc_email: fullEmail.cc ? (Array.isArray(fullEmail.cc) ? fullEmail.cc.join(', ') : fullEmail.cc) : null,
              bcc_email: fullEmail.bcc ? (Array.isArray(fullEmail.bcc) ? fullEmail.bcc.join(', ') : fullEmail.bcc) : null,
              subject: fullEmail.subject || emailMeta.subject || '',
              body_text: fullEmail.body_text || fullEmail.text || '',
              body_html: fullEmail.body_html || fullEmail.html || '',
              data_ricezione: isoDate,
              cartella: folderName,
              direzione: 'inbound',
              stato: fullEmail.read ? 'letto' : 'nuovo',
              flags: fullEmail.flags || emailMeta.flags || [],
              attachments: fullEmail.attachments || [],
              provider_id: '00000000-0000-0000-0000-000000000000',
              user_email: userEmail,
            };

            completeEmails.push(completeEmail);
          } catch (emailError: any) {
            console.error(`❌ Errore scaricando UID ${uid}:`, emailError.message);
            errors.push({ uid, error: emailError.message });
            // ✅ CONTINUA invece di interrompere
            continue;
          }
          
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        console.log(`✓ FASE 2 completata: ${completeEmails.length} email OK, ${errors.length} errori`);
        if (errors.length > 0) {
          console.warn(`⚠️ Errori dettagliati:`, errors);
        }

        // FASE 3: Inserimento in database
        if (completeEmails.length > 0) {
          console.log(`💾 FASE 3: Inserimento ${completeEmails.length} email...`);
          setSyncProgress(prev => ({ ...prev, phase: 'saving' }));

          const { error: insertError } = await supabase
            .from('email_messages')
            .insert(completeEmails);

          if (!insertError) {
            newEmailsCount += completeEmails.length;
            completeEmails.forEach((email: any) => {
              existingIds.add(email.message_id);
            });
            console.log(`✅ ${folderName}: Salvate ${completeEmails.length} email (totale nuovo: ${newEmailsCount})`);
          } else {
            console.error(`❌ ${folderName}: Errore salvataggio`, insertError);
          }
        }

        if (page < totalPages) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      console.log(`🎉 COMPLETATO ${folderName}: ${newEmailsCount} email nuove scaricate`);
      return newEmailsCount;
    } catch (error: any) {
      console.error(`❌ ${folderName}: Errore download`, error);
      throw error;
    } finally {
      setSyncProgress({ currentEmailIndex: 0, totalEmails: 0, phase: 'idle' });
    }
  };

  const handleStartSync = async () => {
    if (selectedFolders.length === 0) {
      toast.error('Seleziona almeno una cartella');
      return;
    }

    setIsSyncing(true);
    setShouldStop(false);
    setCompletedFolders([]);
    setCurrentFolderIndex(0);
    setTotalDownloaded(0);

    for (let i = 0; i < selectedFolders.length; i++) {
      if (shouldStop) {
        toast.info('Sincronizzazione interrotta');
        break;
      }

      const folderName = selectedFolders[i];
      const folderData = folders.find(f => f.name === folderName);
      
      if (!folderData) continue;

      setCurrentFolder(folderName);
      setCurrentFolderIndex(i + 1);

      console.log(`🔄 Sincronizzazione ${i + 1}/${selectedFolders.length}: ${folderName} (${folderData.messageCount} email)`);

      try {
        const downloaded = await downloadFolderEmails(folderName, folderData.messageCount);
        setTotalDownloaded(prev => prev + downloaded);
        
        // ✅ Auto-refresh stats dopo sync cartella
        setFolderStats(prev => ({
          ...prev,
          [folderName]: (prev[folderName] || 0) + downloaded
        }));
        
        setCompletedFolders(prev => [...prev, folderName]);
        
        if (downloaded > 0) {
          toast.success(`${folderName}: ${downloaded} nuove email scaricate`);
        }
      } catch (error) {
        console.error(`❌ Errore sincronizzazione ${folderName}:`, error);
        toast.error(`Errore durante la sincronizzazione di ${folderName}`);
      }

      if (i < selectedFolders.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    setIsSyncing(false);
    toast.success(`Completato! ${totalDownloaded} email scaricate da ${completedFolders.length} cartelle`);
  };

  const handleStopSync = () => {
    setShouldStop(true);
    toast.info('Interruzione in corso...');
  };

  const folderIcons: Record<string, any> = {
    'INBOX': Inbox,
    'Sent': Send,
    'Drafts': FileText,
    'Trash': Trash2,
    'Junk': Trash2,
    'Archives': Archive,
  };

  const getFolderIcon = (folderName: string) => {
    if (folderIcons[folderName]) return folderIcons[folderName];
    
    for (const [key, icon] of Object.entries(folderIcons)) {
      if (folderName.startsWith(key)) return icon;
    }
    
    return Folder;
  };

  const availableFolders = folders;
  
  const sortedFolders = [...availableFolders].sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    } else {
      return (b.messageCount || 0) - (a.messageCount || 0);
    }
  });

  const totalSelectedEmails = folders
    .filter(f => selectedFolders.includes(f.name))
    .reduce((sum, f) => sum + f.messageCount, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Gestione Sincronizzazione Multi-Cartella
          </DialogTitle>
          <DialogDescription>
            Seleziona le cartelle da sincronizzare e configura le opzioni di download
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Folder Selection */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold flex items-center gap-2">
                <Folder className="h-4 w-4" />
                Seleziona Cartelle
              </h3>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSortBy(sortBy === 'name' ? 'emails' : 'name')}
                  className="h-8 px-2"
                >
                  <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
                  {sortBy === 'name' ? 'Nome' : 'Email'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  Tutte
                </Button>
                <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                  Nessuna
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[300px] border rounded-md p-4">
              {loadingFolders ? (
                <p className="text-sm text-muted-foreground">Caricamento cartelle...</p>
              ) : (
                <div className="space-y-2">
                  {sortedFolders.map((folder) => {
                    const Icon = getFolderIcon(folder.name);
                    const isCompleted = completedFolders.includes(folder.name);
                    const isCurrent = currentFolder === folder.name;
                    
                    return (
                      <div
                        key={folder.name}
                        className={`flex items-center justify-between p-2 rounded-md ${
                          isCurrent ? 'bg-primary/10 border border-primary' : 'hover:bg-accent'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedFolders.includes(folder.name)}
                            onCheckedChange={() => handleFolderToggle(folder.name)}
                            disabled={isSyncing}
                          />
                          <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                          <div className="flex-1">
                            <Label className={`cursor-pointer ${isCurrent ? 'font-semibold' : ''}`}>
                              {folder.name}
                            </Label>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="bg-green-500/10 text-white dark:bg-green-500/20 text-xs">
                                {folderStats[folder.name] || 0} / {folder.messageCount}
                              </Badge>
                              {(folder.messageCount - (folderStats[folder.name] || 0)) > 0 && (
                                <Badge variant="secondary" className="bg-yellow-500/10 text-white dark:bg-yellow-500/20 text-xs">
                                  {folder.messageCount - (folderStats[folder.name] || 0)} da scaricare
                                </Badge>
                              )}
                            </div>
                          </div>
                          {isCurrent && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                          {isCompleted && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                        </div>
                        <div className="flex gap-2">
                          {folder.unreadCount > 0 && (
                            <Badge variant="secondary" className="bg-transparent border border-primary text-primary">
                              {folder.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {selectedFolders.length > 0 && (
              <Alert>
                <AlertDescription>
                  <strong>{selectedFolders.length}</strong> cartelle selezionate
                  con circa <strong>{totalSelectedEmails.toLocaleString()}</strong> email totali
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Progress */}
          {isSyncing && (
            <div className="space-y-3 p-4 border rounded-lg bg-accent/50">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  Cartella {currentFolderIndex}/{selectedFolders.length}: {currentFolder}
                </span>
                <span className="text-muted-foreground">
                  {completedFolders.length} completate
                </span>
              </div>
              <Progress value={(currentFolderIndex / selectedFolders.length) * 100} className="h-2" />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {!isSyncing ? (
              <Button
                onClick={handleStartSync}
                disabled={selectedFolders.length === 0}
                className="flex-1"
              >
                <Database className="h-4 w-4 mr-2" />
                Scarica Email ({selectedFolders.length} {selectedFolders.length === 1 ? 'cartella' : 'cartelle'})
              </Button>
            ) : (
              <Button
                onClick={handleStopSync}
                variant="destructive"
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Interrompi
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
