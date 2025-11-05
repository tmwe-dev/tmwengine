import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/design-system/data-display/LoadingState';
import { supabase } from '@/integrations/supabase/client';
import { emailMessageApi } from '@/lib/tmwe-api-integrated';
import { getSingleMailFolders } from '@/lib/single-mail-api';
import { toast } from 'sonner';
import { RefreshCw, Eye, Download, CheckSquare, Square, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MissingEmailItem {
  uid: string;
  subject: string;
  from_email: string;
  from_name: string;
  date: string;
  selected: boolean;
}

export function SingleMailImporter() {
  const queryClient = useQueryClient();
  const [selectedFolder, setSelectedFolder] = useState('INBOX');
  const [missingEmails, setMissingEmails] = useState<MissingEmailItem[]>([]);
  const [selectedEmailDetail, setSelectedEmailDetail] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importingUid, setImportingUid] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState(100); // ✅ Lazy loading: inizialmente 100 email

  // ✅ Query cartelle disponibili (API DEDICATA - NO CACHE CONDIVISA)
  const { data: foldersData } = useQuery({
    queryKey: ['email-folders-single-dedicated'],
    queryFn: async () => {
      const folders = await getSingleMailFolders({ include_counts: false });
      console.log('📁 [SingleMail] Folders fetched:', folders.length, folders.map((f: any) => f.name));
      return folders;
    },
    staleTime: 5 * 60 * 1000,
  });

  // ✅ Query conteggi unificati per tutte le cartelle
  const { data: folderCounts } = useQuery({
    queryKey: ['email-folder-counts-single'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non autenticato');

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tmwe_email')
        .eq('user_id', user.id)
        .single();

      if (!profile?.tmwe_email) throw new Error('Email TMWE non configurata');

      // ✅ Usa servizio unificato
      const { getUnifiedFolderCounts } = await import('@/lib/email-count-service');
      return await getUnifiedFolderCounts(profile.tmwe_email);
    },
    staleTime: 0, // ✅ Forza refresh immediato per vedere conteggi aggiornati
    enabled: !!foldersData, // Esegui solo dopo aver caricato le cartelle
  });

  /**
   * 🆕 FUNZIONE ISOLATA PER SINGLE MAIL IMPORTER
   * Fetch + normalizzazione email senza toccare codice esistente
   */
  const fetchAndNormalizeSingleEmail = async (uid: string, folder: string) => {
    console.log(`🔍 [SingleMailImporter] Fetching email UID ${uid} from ${folder}`);
    
    // ✅ Chiamata diretta all'Edge Function
    const { data: response, error } = await supabase.functions.invoke('tmwe-api-proxy', {
      body: {
        endpoint: '/email_message',
        data: {
          handler: 'get_message',
          uid: parseInt(uid, 10),
          folder: folder,
          mark_as_read: false
        }
      }
    });

    if (error) throw error;
    if (!response?.success) throw new Error(response?.error || 'Errore API');

    console.log(`📦 [SingleMailImporter] Raw API response:`, {
      hasData: !!response.data,
      hasHeader: !!response.data?.header,
      subject: response.data?.header?.subject,
      from: response.data?.header?.from
    });

    // ✅ Normalizza struttura wrapped → flat
    const header = response.data?.header || {};
    const body = response.data || {};

    const normalized = {
      uid: header.uid,
      message_id: header.message_id || `<${uid}@tmwe.local>`,
      subject: header.subject || '',
      
      // From (può essere stringa o oggetto)
      from: header.from,
      from_email: typeof header.from === 'string' ? header.from : header.from,
      from_name: header.from_name || '',
      
      // To/CC/BCC (array di oggetti {email, name})
      to: header.to || [],
      to_email: Array.isArray(header.to) 
        ? header.to.map((t: any) => t.email || t.address || t).join(',')
        : '',
      
      cc: header.cc || [],
      cc_email: Array.isArray(header.cc) && header.cc.length > 0
        ? header.cc.map((c: any) => c.email || c.address || c).join(',')
        : null,
      
      bcc: header.bcc || [],
      bcc_email: Array.isArray(header.bcc) && header.bcc.length > 0
        ? header.bcc.map((b: any) => b.email || b.address || b).join(',')
        : null,
      
      // Date
      date: header.date,
      
      // Body
      body_text: body.body_plain || '',
      body_html: body.body_html || '',
      
      // Metadata
      flags: [
        ...(header.seen ? ['\\Seen'] : []),
        ...(header.flagged ? ['\\Flagged'] : []),
        ...(header.answered ? ['\\Answered'] : [])
      ],
      attachments: header.attachments || [],
      has_attachments: header.has_attachments || header.attachments_count > 0,
    };

    console.log(`✅ [SingleMailImporter] Normalized email:`, {
      message_id: normalized.message_id,
      subject: normalized.subject,
      from_email: normalized.from_email,
      to_email: normalized.to_email,
      has_body: normalized.body_html?.length > 0 || normalized.body_text?.length > 0
    });

    return normalized;
  };

  // ✅ Query confronto UIDs mancanti + popola email_temp_index
  const {
    data: comparisonData,
    isLoading: isLoadingComparison,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['single-mail-comparison', selectedFolder],
    queryFn: async () => {
      console.log('🔍 [SingleMailImporter] Fetching comparison for folder:', selectedFolder);

      // 1️⃣ Ottieni user email
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non autenticato');

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tmwe_email')
        .eq('user_id', user.id)
        .single();

      if (!profile?.tmwe_email) throw new Error('Email TMWE non configurata');
      const userEmail = profile.tmwe_email;

      // 2️⃣ Svuota tabella temporanea per questa cartella
      await supabase
        .from('email_temp_index')
        .delete()
        .eq('user_email', userEmail)
        .eq('folder', selectedFolder);

      // 3️⃣ Fetch UIDs dal server TMWE (prime 500 email)
      console.log('📡 Fetching server UIDs (only metadata, no body)...');
      
      const serverResponse = await emailMessageApi.getMessages({
        folder: selectedFolder,
        page: 1,
        limit: 500,
        format: 'text',
        include_attachments: false,
      });

      const serverUIDs = new Set<string>(
        serverResponse.messages.map((msg: any) => String(msg.uid))
      );
      console.log(`✅ Server UIDs count: ${serverUIDs.size}`);

      // 4️⃣ Fetch UIDs dal DB locale
      console.log('💾 Fetching local DB UIDs...');
      const { data: dbMessages, error } = await supabase
        .from('email_messages')
        .select('message_id')
        .eq('user_email', userEmail)
        .eq('cartella', selectedFolder);

      if (error) throw error;

      const dbUIDs = new Set<string>(
        (dbMessages || [])
          .map((msg: any) => {
            const messageId = String(msg.message_id);
            const parts = messageId.split('/');
            return parts.length > 1 ? parts[1] : messageId;
          })
          .filter((uid: string) => uid && uid !== 'null')
      );
      console.log(`✅ DB UIDs count: ${dbUIDs.size}`);

      // 5️⃣ Calcola UIDs mancanti
      const missing = Array.from(serverUIDs).filter(uid => !dbUIDs.has(uid));
      console.log(`🎯 Missing UIDs: ${missing.length}`);

      // 6️⃣ Popola email_temp_index con metadati leggeri (batch paralleli)
      const batchSize = 10;
      const tempIndexRecords = [];

      for (let i = 0; i < missing.length; i += batchSize) {
        const batch = missing.slice(i, i + batchSize);
        const batchPromises = batch.map(async (uid) => {
          try {
            const email = await emailMessageApi.getMessage(uid, selectedFolder, false);
            return {
              uid,
              folder: selectedFolder,
              user_email: userEmail,
              subject: email?.subject || email?.data?.header?.subject || null,
              from_email: email?.from || email?.data?.header?.from || 'Unknown',
              from_name: email?.from_name || email?.data?.header?.from_name || null,
              date: email?.date || email?.data?.header?.date || new Date().toISOString(),
              size: null, // Non disponibile dall'API
              status: 'pending',
            };
          } catch (err) {
            console.warn(`⚠️ Failed to fetch metadata for UID ${uid}:`, err);
            return {
              uid,
              folder: selectedFolder,
              user_email: userEmail,
              subject: '(Error loading)',
              from_email: 'Unknown',
              from_name: null,
              date: new Date().toISOString(),
              size: null,
              status: 'pending',
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        tempIndexRecords.push(...batchResults);
      }

      // 7️⃣ Inserisci in batch in email_temp_index
      if (tempIndexRecords.length > 0) {
        const { error: insertError } = await supabase
          .from('email_temp_index')
          .insert(tempIndexRecords);

        if (insertError) {
          console.error('❌ Error inserting to email_temp_index:', insertError);
        } else {
          console.log(`✅ Inserted ${tempIndexRecords.length} records into email_temp_index`);
        }
      }

      return {
        totalServer: serverUIDs.size,
        totalDB: dbUIDs.size,
        totalMissing: missing.length,
      };
    },
    enabled: !!selectedFolder,
    refetchOnWindowFocus: false,
  });

  // ✅ Query email da email_temp_index (lettura leggera dal DB)
  const { data: tempIndexEmails } = useQuery({
    queryKey: ['email-temp-index', selectedFolder, displayLimit],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tmwe_email')
        .eq('user_id', user.id)
        .single();

      if (!profile?.tmwe_email) return [];

      const { data, error } = await supabase
        .from('email_temp_index')
        .select('*')
        .eq('user_email', profile.tmwe_email)
        .eq('folder', selectedFolder)
        .order('date', { ascending: false })
        .limit(displayLimit);

      if (error) {
        console.error('❌ Error fetching temp index:', error);
        return [];
      }

      return data.map((item: any) => ({
        uid: item.uid,
        subject: item.subject || '(No Subject)',
        from_email: item.from_email,
        from_name: item.from_name || '',
        date: item.date,
        selected: item.status === 'selected',
      }));
    },
    enabled: !!selectedFolder && !!comparisonData,
    refetchOnWindowFocus: false,
  });

  // ✅ Reset displayLimit quando cambia cartella
  useEffect(() => {
    setDisplayLimit(100);
  }, [selectedFolder]);

  // ✅ Aggiorna lista locale quando cambia tempIndexEmails
  useEffect(() => {
    if (tempIndexEmails) {
      setMissingEmails(tempIndexEmails);
    }
  }, [tempIndexEmails]);

  // ✅ Toggle singola email (aggiorna DB temp_index)
  const toggleEmailSelection = async (uid: string) => {
    const email = missingEmails.find(e => e.uid === uid);
    if (!email) return;

    const newStatus = email.selected ? 'pending' : 'selected';

    setMissingEmails(prev =>
      prev.map(e => e.uid === uid ? { ...e, selected: !e.selected } : e)
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tmwe_email')
      .eq('user_id', user.id)
      .single();

    if (!profile?.tmwe_email) return;

    await supabase
      .from('email_temp_index')
      .update({ status: newStatus })
      .eq('uid', uid)
      .eq('folder', selectedFolder)
      .eq('user_email', profile.tmwe_email);
  };

  // ✅ Select All / Deselect All (aggiorna DB temp_index)
  const toggleSelectAll = async () => {
    const allSelected = missingEmails.every(e => e.selected);
    const newStatus = allSelected ? 'pending' : 'selected';

    setMissingEmails(prev =>
      prev.map(email => ({ ...email, selected: !allSelected }))
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tmwe_email')
      .eq('user_id', user.id)
      .single();

    if (!profile?.tmwe_email) return;

    await supabase
      .from('email_temp_index')
      .update({ status: newStatus })
      .eq('folder', selectedFolder)
      .eq('user_email', profile.tmwe_email);
  };

  // ✅ Visualizza email completa
  const handleViewEmail = async (uid: string) => {
    try {
      toast.info(`Caricamento email UID ${uid}...`);
      const email = await emailMessageApi.getMessage(uid, selectedFolder, false);
      setSelectedEmailDetail({
        uid,
        ...email,
      });
    } catch (error: any) {
      toast.error(`Errore caricamento email: ${error.message}`);
    }
  };

  // ✅ Funzione helper per verificare se email esiste già
  const checkEmailExists = async (messageId: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('email_messages')
      .select('id')
      .eq('message_id', messageId)
      .maybeSingle();
    
    if (error) {
      console.error('❌ Errore controllo duplicati:', error);
      return false; // In caso di errore, procedi con import
    }
    
    return !!data; // Ritorna true se esiste, false altrimenti
  };

  // ✅ Importa singola email nel DB
  const handleImportSingle = async (uid: string) => {
    setImportingUid(uid);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non autenticato');

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tmwe_email')
        .eq('user_id', user.id)
        .single();

      if (!profile?.tmwe_email) throw new Error('Email TMWE non configurata');

      // ✅ Controllo se email già esiste
      const messageId = `${selectedFolder}/${uid}`;
      const exists = await checkEmailExists(messageId);

      if (exists) {
        console.warn(`⚠️ Email ${uid} già presente nel database, skip import`);
        toast.warning(`Email UID ${uid} già presente nel database locale`);
        setMissingEmails(prev => prev.filter(e => e.uid !== uid));
        return; // ✅ ESCI senza tentare insert
      }

      console.log(`✅ Email ${uid} non presente, procedo con import`);

      // Fetch email dal server (nuova funzione isolata)
      const email = await fetchAndNormalizeSingleEmail(uid, selectedFolder);

      // ✅ Mapping campi - ESATTAMENTE come FunEmailDownloader
      const emailToSave = {
        message_id: `${selectedFolder}/${uid}`,
        from_email: email.from_email || '',
        to_email: email.to_email || '',
        cc_email: email.cc_email || null,
        bcc_email: email.bcc_email || null,
        subject: email.subject || '',
        body_text: email.body_text || '',
        body_html: email.body_html || '',
        data_ricezione: email.date ? new Date(email.date).toISOString() : new Date().toISOString(),
        cartella: selectedFolder,
        direzione: 'inbound',
        stato: email.flags?.includes('\\Seen') ? 'letto' : 'nuovo',
        flags: email.flags || [],
        attachments: email.attachments || [],
        provider_id: '00000000-0000-0000-0000-000000000000',
        user_email: profile.tmwe_email,
        sync_status: 'sincronizzato',  // ✅ Valore valido per check constraint
      };

      // ✅ Sanitizza array prima dell'insert
      emailToSave.flags = Array.isArray(emailToSave.flags) ? emailToSave.flags : [];
      emailToSave.attachments = Array.isArray(emailToSave.attachments) ? emailToSave.attachments : [];

      console.log('📤 [SingleMailImporter] INSERT BODY:', JSON.stringify(emailToSave, null, 2));

      // ✅ Usa .insert() con singolo oggetto (come FunEmailDownloader)
      const { error } = await supabase
        .from('email_messages')
        .insert(emailToSave);

      if (error) {
        console.error('❌ [SingleMailImporter] Supabase error:', error);
        throw error;
      }

      toast.success(`✅ Email UID ${uid} importata con successo`);

      // Aggiorna status in temp_index + rimuovi dalla lista
      await supabase
        .from('email_temp_index')
        .update({ status: 'imported' })
        .eq('uid', uid)
        .eq('folder', selectedFolder)
        .eq('user_email', profile.tmwe_email);

      setMissingEmails(prev => prev.filter(e => e.uid !== uid));
      
      // ✅ Invalida cache conteggi per riflettere nuova email importata
      queryClient.invalidateQueries({ queryKey: ['email-folder-counts-single'] });
    } catch (error: any) {
      toast.error(`❌ Errore import: ${error.message}`);
    } finally {
      setImportingUid(null);
    }
  };

  // ✅ Importa tutte le email selezionate
  const handleImportSelected = async () => {
    const selectedUIDs = missingEmails.filter(e => e.selected).map(e => e.uid);
    if (selectedUIDs.length === 0) {
      toast.warning('Nessuna email selezionata');
      return;
    }

    setIsImporting(true);
    let successCount = 0;
    let skippedCount = 0;  // ✅ CONTATORE SKIP
    let errorCount = 0;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non autenticato');

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tmwe_email')
        .eq('user_id', user.id)
        .single();

      if (!profile?.tmwe_email) throw new Error('Email TMWE non configurata');

      for (const uid of selectedUIDs) {
        try {
          console.log(`🔍 [SingleMailImporter] Fetching email UID ${uid} from ${selectedFolder}`);
          
          // ✅ CONTROLLO DUPLICATO
          const messageId = `${selectedFolder}/${uid}`;
          const exists = await checkEmailExists(messageId);
          
          if (exists) {
            console.warn(`⚠️ [SingleMailImporter] Email ${uid} già presente, skip`);
            skippedCount++;
            
            // Aggiorna status in temp_index
            await supabase
              .from('email_temp_index')
              .update({ status: 'imported' })
              .eq('uid', uid)
              .eq('folder', selectedFolder)
              .eq('user_email', profile.tmwe_email);
            
            setMissingEmails(prev => prev.filter(e => e.uid !== uid));
            continue; // ✅ SALTA QUESTA EMAIL
          }
          
          const email = await fetchAndNormalizeSingleEmail(uid, selectedFolder);

          // ✅ Mapping campi - ESATTAMENTE come FunEmailDownloader
          const emailToSave = {
            message_id: `${selectedFolder}/${uid}`,
            from_email: email.from_email || '',
            to_email: email.to_email || '',
            cc_email: email.cc_email || null,
            bcc_email: email.bcc_email || null,
            subject: email.subject || '',
            body_text: email.body_text || '',
            body_html: email.body_html || '',
            data_ricezione: email.date ? new Date(email.date).toISOString() : new Date().toISOString(),
            cartella: selectedFolder,
            direzione: 'inbound',
            stato: email.flags?.includes('\\Seen') ? 'letto' : 'nuovo',
            flags: email.flags || [],
            attachments: email.attachments || [],
            provider_id: '00000000-0000-0000-0000-000000000000',
            user_email: profile.tmwe_email,
            sync_status: 'sincronizzato',  // ✅ Valore valido per check constraint
          };

          // ✅ Sanitizza array prima dell'insert
          emailToSave.flags = Array.isArray(emailToSave.flags) ? emailToSave.flags : [];
          emailToSave.attachments = Array.isArray(emailToSave.attachments) ? emailToSave.attachments : [];

          console.log('📤 [SingleMailImporter] INSERT BODY:', JSON.stringify(emailToSave, null, 2));

          // ✅ Usa .insert() con singolo oggetto (come FunEmailDownloader)
          const { error } = await supabase
            .from('email_messages')
            .insert(emailToSave);

          if (error) {
            console.error('❌ [SingleMailImporter] Supabase error:', error);
            throw error;
          }

          successCount++;
          setMissingEmails(prev => prev.filter(e => e.uid !== uid));
        } catch (err: any) {
          console.error(`❌ Error importing UID ${uid}:`, {
            message: err?.message,
            code: err?.code,
            details: err?.details,
            hint: err?.hint,
            fullError: err
          });
          errorCount++;
        }
      }

      // ✅ TOAST CON CONTATORI
      const message = skippedCount > 0 
        ? `✅ Importate ${successCount} email (${skippedCount} già presenti${errorCount > 0 ? `, ${errorCount} errori` : ''})`
        : `✅ Importate ${successCount} email${errorCount > 0 ? ` (${errorCount} errori)` : ''}`;
      
      toast.success(message);
    } catch (error: any) {
      toast.error(`❌ Errore import: ${error.message}`);
    } finally {
      setIsImporting(false);
      
      // ✅ Invalida cache conteggi per riflettere nuove email importate
      queryClient.invalidateQueries({ queryKey: ['email-folder-counts-single'] });
    }
  };

  // ✅ Helper per trovare statistiche cartella
  const getFolderStats = (folderName: string) => {
    if (!folderCounts) return null;
    return folderCounts.find(f => f.folderName === folderName);
  };

  const allSelected = missingEmails.length > 0 && missingEmails.every(e => e.selected);
  const selectedCount = missingEmails.filter(e => e.selected).length;

  return (
    <div className="space-y-6">
      {/* Header con folder selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col items-center gap-4">
            <span>Single Mail Importer</span>
            <div className="flex items-center gap-4 justify-center w-full">
              <Select value={selectedFolder} onValueChange={setSelectedFolder}>
                <SelectTrigger className="w-96">
                  <SelectValue placeholder="Seleziona cartella" />
                </SelectTrigger>
                <SelectContent className="z-[9999] bg-background" align="center">
                  {foldersData?.map((folder: any) => {
                    const stats = getFolderStats(folder.name);
                    const hasMissing = stats && stats.missing > 0;
                    
                    return (
                      <SelectItem key={folder.name} value={folder.name}>
                        <div className="grid grid-cols-[1fr_auto_auto] items-center w-full gap-4 min-w-[400px]">
                          {/* COLONNA 1: Nome Cartella */}
                          <span className={cn(
                            "font-medium text-left truncate",
                            hasMissing && "text-orange-600 dark:text-orange-400"
                          )}>
                            {folder.display_name || folder.name}
                          </span>
                          
                          {/* COLONNA 2: Conteggi */}
                          <div className="flex justify-end">
                            {stats ? (
                              <Badge variant="outline" className="text-xs tabular-nums">
                                {stats.dbCount}/{stats.serverCount}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                ...
                              </Badge>
                            )}
                          </div>
                          
                          {/* COLONNA 3: Icone Status */}
                          <div className="flex justify-end items-center gap-2 min-w-[80px]">
                            {stats && hasMissing && (
                              <Badge 
                                variant="destructive" 
                                className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-xs"
                              >
                                📬 {stats.missing}
                              </Badge>
                            )}
                            
                            {stats && stats.syncPercentage === 100 && (
                              <Badge 
                                variant="outline" 
                                className="bg-green-500/10 text-green-600 border-green-500/20 text-xs"
                              >
                                ✓
                              </Badge>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoadingComparison || isRefetching}
              >
                <RefreshCw className={cn('h-4 w-4 mr-2', isRefetching && 'animate-spin')} />
                Refresh
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Indicatore caricamento conteggi */}
          {!folderCounts && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Caricamento conteggi cartelle...
            </div>
          )}

          {/* Riepilogo statistiche cartella selezionata */}
          {selectedFolder && getFolderStats(selectedFolder) && (
            <div className="p-4 bg-muted/50 rounded-lg border">
              <div className="grid grid-cols-3 gap-4 text-center mb-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Server</p>
                  <p className="text-2xl font-bold text-primary">{getFolderStats(selectedFolder)!.serverCount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">DB Locale</p>
                  <p className="text-2xl font-bold text-blue-600">{getFolderStats(selectedFolder)!.dbCount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Mancanti</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    getFolderStats(selectedFolder)!.missing > 0 ? "text-orange-600" : "text-green-600"
                  )}>
                    {getFolderStats(selectedFolder)!.missing}
                  </p>
                </div>
              </div>
              
              {/* Progress bar sincronizzazione */}
              <div>
                {(() => {
                  const stats = getFolderStats(selectedFolder)!;
                  const syncPercentage = Math.min(100, stats.syncPercentage);  // ✅ Cap a 100%
                  const isOverSynced = stats.dbCount > stats.serverCount;  // ✅ Rileva se DB ha più email
                  
                  return (
                    <>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Sincronizzazione</span>
                        <span className={cn(
                          "font-semibold",
                          isOverSynced && "text-orange-600 dark:text-orange-400"
                        )}>
                          {isOverSynced 
                            ? `+${stats.dbCount - stats.serverCount} extra` 
                            : `${syncPercentage}%`
                          }
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full transition-all duration-500",
                            syncPercentage === 100 ? "bg-green-500" : "bg-orange-500"
                          )}
                          style={{ width: `${syncPercentage}%` }}
                        />
                      </div>
                      {isOverSynced && (
                        <div className="mt-2 text-xs text-orange-600 dark:text-orange-400">
                          ⚠️ Il database locale ha {stats.dbCount - stats.serverCount} email in più rispetto al server
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Warning se limite 500 raggiunto */}
          {comparisonData && comparisonData.totalServer >= 500 && (
            <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg text-sm text-orange-600 dark:text-orange-400">
              ⚠️ <strong>Limite raggiunto:</strong> Confronto limitato alle prime 500 email per evitare timeout. 
              Potrebbero esserci altre email mancanti non visibili qui.
            </div>
          )}

          {/* Badge visualizzazione parziale + pulsante "Carica altre 100" */}
          {comparisonData && comparisonData.totalMissing > 0 && (
            <div className="flex items-center justify-between gap-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                  {missingEmails.length} di {comparisonData.totalMissing} visibili
                </Badge>
                {missingEmails.length < comparisonData.totalMissing && (
                  <span className="text-xs text-muted-foreground">
                    ({comparisonData.totalMissing - missingEmails.length} rimanenti in cache)
                  </span>
                )}
              </div>
              {missingEmails.length < comparisonData.totalMissing && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setDisplayLimit(prev => Math.min(prev + 100, comparisonData.totalMissing))}
                >
                  <Download className="h-4 w-4" />
                  Carica altre 100
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista email mancanti */}
      {isLoadingComparison ? (
        <LoadingState message="Caricamento email mancanti..." />
      ) : missingEmails.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            ✅ Nessuna email mancante in questa cartella
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Email Mancanti ({missingEmails.length})</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAll}
                >
                  {allSelected ? (
                    <>
                      <Square className="h-4 w-4 mr-2" />
                      Deselect All
                    </>
                  ) : (
                    <>
                      <CheckSquare className="h-4 w-4 mr-2" />
                      Select All
                    </>
                  )}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleImportSelected}
                  disabled={selectedCount === 0 || isImporting}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Import Selected ({selectedCount})
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {missingEmails.map((email) => (
                <div
                  key={email.uid}
                  className="flex items-center gap-4 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <Checkbox
                    checked={email.selected}
                    onCheckedChange={() => toggleEmailSelection(email.uid)}
                  />
                  <div className="flex-1 grid grid-cols-[100px_1fr_2fr_200px] gap-4 text-sm">
                    <div className="font-mono text-muted-foreground text-xs">{email.uid}</div>
                    <div className="truncate font-medium">{email.from_name || email.from_email || 'N/A'}</div>
                    <div className="truncate">{email.subject}</div>
                    <div className="text-muted-foreground text-xs">
                      {new Date(email.date).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewEmail(email.uid)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleImportSingle(email.uid)}
                      disabled={importingUid === email.uid}
                    >
                      <Download className={cn('h-4 w-4', importingUid === email.uid && 'animate-spin')} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Email Detail Overlay */}
      {selectedEmailDetail && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
          <div className="fixed inset-4 z-50 bg-background border rounded-lg shadow-lg overflow-auto">
            <div className="sticky top-0 z-10 bg-background border-b p-4 flex justify-between items-center">
              <div className="font-mono text-sm text-muted-foreground">
                UID: {selectedEmailDetail.uid}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedEmailDetail(null)}
              >
                Chiudi
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Subject</div>
                <div className="text-lg font-semibold">
                  {selectedEmailDetail.subject || selectedEmailDetail.data?.header?.subject || '(No Subject)'}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">From</div>
                <div>
                  {selectedEmailDetail.from_name 
                    ? `${selectedEmailDetail.from_name} <${selectedEmailDetail.from || 'Unknown'}>`
                    : (selectedEmailDetail.from || selectedEmailDetail.data?.header?.from || 'Unknown')
                  }
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Date</div>
                <div>
                  {new Date(selectedEmailDetail.date || selectedEmailDetail.data?.header?.date).toLocaleString('it-IT')}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">Body</div>
                <div className="border rounded-lg p-4 bg-muted/50 max-h-[60vh] overflow-auto">
                  {selectedEmailDetail.body_html || selectedEmailDetail.data?.body_html ? (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: selectedEmailDetail.body_html || selectedEmailDetail.data?.body_html
                      }}
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap font-sans">
                      {selectedEmailDetail.body_text || selectedEmailDetail.text || selectedEmailDetail.data?.body_plain || '(No content)'}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
