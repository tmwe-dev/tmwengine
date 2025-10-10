import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useFolderList } from '@/hooks/useFolderList';
import { emailMessageApi, getApiConfigFromDB } from '@/lib/tmwe-api-integrated';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Inbox, Send, FileText, Trash2, Archive, Folder, Database, ArrowUpDown, XCircle, CheckCircle2, Loader2, TestTube, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [isSupabaseAuthenticated, setIsSupabaseAuthenticated] = useState(false);
  const [authCheckLoading, setAuthCheckLoading] = useState(true);
  
  // Test area states
  const [testMessageId, setTestMessageId] = useState("");
  const [testResponse, setTestResponse] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [forceReDownload, setForceReDownload] = useState(false);
  const [testAreaOpen, setTestAreaOpen] = useState(false);
  const [testFolderName, setTestFolderName] = useState("Drafts");
  const [emailList, setEmailList] = useState<any[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);

  // Verifica autenticazione Supabase
  useEffect(() => {
    const checkAuth = async () => {
      setAuthCheckLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      setIsSupabaseAuthenticated(!!session?.user);
      setAuthCheckLoading(false);
    };
    checkAuth();
  }, [open]);

  // Carica statistiche email già scaricate
  useEffect(() => {
    if (open && folders.length > 0 && isSupabaseAuthenticated) {
      loadFolderStats();
    }
  }, [open, folders, isSupabaseAuthenticated]);

  const loadFolderStats = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    
    const stats: Record<string, number> = {};
    
    for (const folder of folders) {
      // RLS applicherà automaticamente il filtro user_email
      const { count } = await supabase
        .from('email_messages')
        .select('*', { count: 'exact', head: true })
        .eq('cartella', folder.name);
      
      stats[folder.name] = count || 0;
      console.log(`📊 Cartella ${folder.name}: ${count} già scaricate / ${folder.messageCount} totali`);
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
    // Verifica autenticazione Supabase
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      toast.error('⚠️ Devi essere autenticato per sincronizzare');
      return 0;
    }

    // Recupera email TMWE da user_profiles
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tmwe_email')
      .eq('user_id', session.user.id)
      .single();
    
    const userEmail = profile?.tmwe_email;
    if (!userEmail) {
      toast.error('⚠️ Email TMWE non configurata nel profilo');
      return 0;
    }

    // Recupera provider_id dinamico
    const { data: providers } = await supabase
      .from('email_provider')
      .select('id')
      .eq('attivo', true)
      .limit(1);
    
    const providerId = providers?.[0]?.id;
    if (!providerId) {
      toast.error('⚠️ Nessun provider email configurato');
      return 0;
    }

    try {
      console.log(`📥 INIZIO download ${folderName} (${totalEmails} email totali)`);
      console.log(`🔐 Utente: ${userEmail} | Provider: ${providerId}`);
      setSyncProgress(prev => ({ ...prev, phase: 'metadata' }));
      
      // 1. Recupera email già presenti (RLS applica filtro automatico)
      const { data: existingEmails } = await supabase
        .from('email_messages')
        .select('message_id')
        .eq('cartella', folderName);

      const existingIds = new Set(existingEmails?.map(e => e.message_id) || []);
      
      console.log(`📊 ${folderName}: ${existingIds.size} già presenti`);
      
      // ❌ RIMOSSO: Check troppo generico che bloccava il download
      // if (existingIds.size >= totalEmails) {
      //   console.log(`✅ ${folderName}: Tutte le email già scaricate`);
      //   return 0;
      // }

      const batchSize = 50;
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
          const emailId = email.message_id || String(email.uid);
          const isExisting = existingIds.has(emailId);
          
          // ✅ Se force attivo, considera tutte "da scaricare"
          if (forceReDownload) {
            console.log(`🔄 FORCE: Email ${emailId} verrà ri-scaricata`);
            return true;
          }
          
          console.log(`🔍 Email ${emailId}: ${isExisting ? '✓ Già presente' : '📥 Da scaricare'}`);
          return !isExisting;
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
          const messageId = emailMeta.message_id || String(emailMeta.uid);

          try {
            // Log dettagliato richiesta API
            console.log(`📤 API REQUEST [${i + 1}/${missingEmails.length}]:`, {
              endpoint: 'getMessage',
              message_id: messageId,
              folder: folderName,
              timestamp: new Date().toISOString()
            });
            
            const fullEmail = await emailMessageApi.getMessage(messageId, false);
            
            // Log dettagliato risposta API
            console.log(`📥 API RESPONSE [${i + 1}/${missingEmails.length}]:`, {
              success: !!fullEmail,
              data_keys: Object.keys(fullEmail || {}),
              subject_length: fullEmail?.subject?.length || 0,
              body_text_length: fullEmail?.body_text?.length || 0,
              body_html_length: fullEmail?.body_html?.length || 0,
              has_attachments: fullEmail?.attachments?.length > 0
            });
            
            if (!fullEmail || fullEmail.success === false) {
              throw new Error(`API returned invalid response for message_id ${messageId}`);
            }
            
            console.log(`✓ Email ${messageId}: subject="${fullEmail.subject?.substring(0, 30)}..."`);

            let isoDate = new Date().toISOString();
            if (fullEmail.date || emailMeta.date) {
              try {
                isoDate = new Date(fullEmail.date || emailMeta.date).toISOString();
              } catch (e) {
                console.error('Error parsing date:', fullEmail.date || emailMeta.date);
              }
            }

            const completeEmail = {
              message_id: messageId,
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
              provider_id: providerId,
              user_email: userEmail,
            };

            completeEmails.push(completeEmail);
          } catch (emailError: any) {
            console.error(`❌ Errore scaricando message_id ${messageId}:`, emailError.message);
            errors.push({ messageId, error: emailError.message });
            continue;
          }
        }

        console.log(`✓ FASE 2 completata: ${completeEmails.length} email OK, ${errors.length} errori`);
        if (errors.length > 0) {
          console.warn(`⚠️ Errori dettagliati:`, errors);
        }

        // FASE 3: Inserimento in database
        if (completeEmails.length > 0) {
          console.log(`💾 FASE 3: Inserimento ${completeEmails.length} email...`);
          setSyncProgress(prev => ({ ...prev, phase: 'saving' }));

          // Verifica integrità dati
          const invalidEmails = completeEmails.filter((e: any) => 
            !e.subject || (!e.body_text && !e.body_html)
          );
          
          if (invalidEmails.length > 0) {
            console.warn(`⚠️ ${invalidEmails.length} email con dati incompleti:`, 
              invalidEmails.map((e: any) => ({ 
                message_id: e.message_id, 
                has_subject: !!e.subject,
                has_body: !!(e.body_text || e.body_html)
              }))
            );
          }

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
          await new Promise(resolve => setTimeout(resolve, 10));
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

  // Carica lista email per testing
  const handleLoadEmailList = async () => {
    setLoadingEmails(true);
    setEmailList([]);
    
    try {
      console.log(`📥 Caricamento email da cartella: ${testFolderName}`);
      
      const response = await emailMessageApi.getMessages({
        folder: testFolderName,
        limit: 50,
        page: 1,
      });

      const emails = response?.messages || [];
      setEmailList(emails);
      
      console.log(`✓ Caricate ${emails.length} email da ${testFolderName}`);
      toast.success(`${emails.length} email caricate da ${testFolderName}`);
      
    } catch (error: any) {
      console.error('Errore caricamento email:', error);
      toast.error(`Errore: ${error.message}`);
    } finally {
      setLoadingEmails(false);
    }
  };

  // Seleziona email dalla tabella
  const handleSelectEmail = (email: any) => {
    const emailId = email.message_id || String(email.uid);
    setTestMessageId(emailId);
    toast.success(`Selezionata email: ${emailId}`);
  };

  // Test singola email
  const handleTestSingleEmail = async () => {
    if (!testMessageId.trim()) {
      toast.error("Inserisci un message_id");
      return;
    }

    setTestLoading(true);
    setTestResponse(null);

    try {
      console.log(`🧪 TEST: Scaricamento email ${testMessageId}...`);

      // Test API TMWE
      const fullEmail = await emailMessageApi.getMessage(testMessageId, false);

      const validation = {
        has_subject: !!fullEmail?.subject,
        has_body_text: !!fullEmail?.body_text,
        has_body_html: !!fullEmail?.body_html,
        has_attachments: fullEmail?.attachments?.length > 0,
        subject_length: fullEmail?.subject?.length || 0,
        body_text_length: fullEmail?.body_text?.length || 0,
        body_html_length: fullEmail?.body_html?.length || 0,
      };

      setTestResponse({
        success: true,
        api_response: fullEmail,
        validation
      });

      console.log(`✓ Email test completata:`, validation);
      toast.success(`✓ Test completato: ${validation.has_subject ? '✓' : '✗'} Subject, ${validation.has_body_text || validation.has_body_html ? '✓' : '✗'} Body`);

    } catch (error: any) {
      setTestResponse({
        success: false,
        error: error.message,
        stack: error.stack,
      });
      toast.error(`Test fallito: ${error.message}`);
    } finally {
      setTestLoading(false);
    }
  };

  // Test autenticazione TMWE
  const handleTestAuth = async () => {
    setTestLoading(true);
    setTestResponse(null);

    try {
      const config = await getApiConfigFromDB();

      if (!config) {
        toast.error('Credenziali TMWE non trovate');
        setTestResponse({
          auth_status: 'missing_credentials',
          error: 'Nessuna configurazione TMWE trovata nel database'
        });
        return;
      }

      // Test chiamata API base - usa getMessages invece di getFolders
      const result = await emailMessageApi.getMessages({ folder: 'INBOX', limit: 1 });

      setTestResponse({
        auth_status: 'valid',
        access_token_present: !!config.accessToken,
        token_expires_at: config.expiresAt,
        api_test: 'getMessages INBOX',
        result_success: !!result
      });

      toast.success(`✓ Autenticazione TMWE valida`);

    } catch (error: any) {
      setTestResponse({
        auth_status: 'invalid',
        error: error.message,
      });
      toast.error('Autenticazione fallita');
    } finally {
      setTestLoading(false);
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
          {/* 🧪 DEBUG & TESTING AREA */}
          <Collapsible open={testAreaOpen} onOpenChange={setTestAreaOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <TestTube className="h-4 w-4 mr-2" />
                {testAreaOpen ? 'Nascondi' : 'Mostra'} Debug & Testing
                {testAreaOpen ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ScrollArea className="max-h-[500px] mt-2">
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              {/* Seleziona Cartella e Carica Email */}
              <div className="space-y-2">
                <Label htmlFor="test-folder">Seleziona Cartella per Test</Label>
                <div className="flex gap-2">
                  <select
                    id="test-folder"
                    value={testFolderName}
                    onChange={(e) => setTestFolderName(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    disabled={loadingEmails}
                  >
                    {folders.map((folder) => (
                      <option key={folder.name} value={folder.name}>
                        {folder.name} ({folder.messageCount} email)
                      </option>
                    ))}
                  </select>
                  <Button
                    onClick={handleLoadEmailList}
                    disabled={loadingEmails}
                    size="sm"
                    variant="secondary"
                  >
                    {loadingEmails ? "Caricamento..." : "Carica Email"}
                  </Button>
                </div>
              </div>

              {/* Tabella Email Selezionabili */}
              {emailList.length > 0 && (
                <div className="space-y-2">
                  <Label>Seleziona Email da Testare ({emailList.length})</Label>
                  <ScrollArea className="h-[200px] w-full rounded-md border">
                    <div className="p-2">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-muted">
                          <tr className="border-b">
                            <th className="p-2 text-left font-medium">ID</th>
                            <th className="p-2 text-left font-medium">Subject</th>
                            <th className="p-2 text-left font-medium">From</th>
                            <th className="p-2 text-left font-medium">Data</th>
                          </tr>
                        </thead>
                        <tbody>
                          {emailList.map((email, index) => {
                            const emailId = email.message_id || String(email.uid);
                            const isSelected = testMessageId === emailId;
                            
                            return (
                              <tr
                                key={index}
                                onClick={() => handleSelectEmail(email)}
                                className={`cursor-pointer border-b transition-colors hover:bg-accent ${
                                  isSelected ? 'bg-primary/20 font-semibold' : ''
                                }`}
                              >
                                <td className="p-2 font-mono text-xs">{emailId}</td>
                                <td className="p-2 truncate max-w-[200px]">
                                  {email.subject || '(no subject)'}
                                </td>
                                <td className="p-2 truncate max-w-[150px]">
                                  {email.from || ''}
                                </td>
                                <td className="p-2 text-xs text-muted-foreground">
                                  {email.date ? new Date(email.date).toLocaleDateString('it-IT') : ''}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Test Singola Email */}
              <div className="space-y-2">
                <Label htmlFor="test-message-id">Message ID Selezionato</Label>
                <div className="flex gap-2">
                  <Input
                    id="test-message-id"
                    placeholder="Inserisci message_id (es: 1415)"
                    value={testMessageId}
                    onChange={(e) => setTestMessageId(e.target.value)}
                    disabled={testLoading}
                  />
                  <Button
                    onClick={handleTestSingleEmail}
                    disabled={testLoading || !testMessageId.trim()}
                    size="sm"
                  >
                    {testLoading ? "Testing..." : "Test Download"}
                  </Button>
                </div>
              </div>

              {/* Test Autenticazione */}
              <Button
                variant="secondary"
                onClick={handleTestAuth}
                disabled={testLoading}
                className="w-full"
                size="sm"
              >
                Test Autenticazione TMWE
              </Button>

              {/* Force Re-Download Option */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="force-redownload"
                  checked={forceReDownload}
                  onCheckedChange={(checked) => setForceReDownload(checked as boolean)}
                />
                <Label htmlFor="force-redownload" className="text-sm cursor-pointer">
                  Force re-download email esistenti (ignora controllo duplicati)
                </Label>
              </div>

              {/* Response Viewer */}
              {testResponse && (
                <div className="space-y-2">
                  <Label>Risultato Test</Label>
                  <ScrollArea className="h-[200px] w-full rounded-md border bg-black">
                    <pre className="text-green-400 p-4 text-xs font-mono">
                      {JSON.stringify(testResponse, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              )}
                </div>
              </ScrollArea>
            </CollapsibleContent>
          </Collapsible>

          {/* Warning autenticazione */}
          {!authCheckLoading && !isSupabaseAuthenticated && (
            <Alert variant="destructive">
              <AlertDescription className="flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                ⚠️ Devi essere autenticato tramite Supabase per sincronizzare le email
              </AlertDescription>
            </Alert>
          )}

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
                              <Badge variant="outline" className="bg-green-500/20 text-white border-green-500 text-xs">
                                ✓ {folderStats[folder.name] || 0} / {folder.messageCount}
                              </Badge>
                              {(folder.messageCount - (folderStats[folder.name] || 0)) > 0 && (
                                <Badge variant="secondary" className="bg-yellow-500/20 text-white border-yellow-500 text-xs">
                                  📥 {folder.messageCount - (folderStats[folder.name] || 0)} da scaricare
                                </Badge>
                              )}
                              {folderStats[folder.name] === folder.messageCount && (
                                <Badge variant="outline" className="bg-gray-500/20 text-white border-gray-500 text-xs">
                                  ✓ Completato
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
                disabled={selectedFolders.length === 0 || !isSupabaseAuthenticated}
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
