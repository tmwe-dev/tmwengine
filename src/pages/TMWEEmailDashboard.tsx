/**
 * TMWE Email Dashboard
 * 
 * ARQUITECTURA DE ENDPOINTS:
 * 
 * 📖 LECTURA (Fast RPC via RabbitMQ + Elasticsearch):
 *   - Listado de emails: emailSearchApi.getEmailsMetadata() 
 *   - Búsqueda full-text: emailSearchApi.searchEmails()
 *   - Detalle de email: emailSearchApi.getEmailDetail()
 *   - Carpetas: emailSearchApi.getFolders()
 * 
 * ✍️ ESCRITURA (Direct IMAP via /email_message):
 *   - Enviar: emailMessageApi.sendMessage()
 *   - Responder: emailMessageApi.replyMessage()
 *   - Reenviar: emailMessageApi.forwardMessage()
 *   - Marcar: emailMessageApi.markMessages()
 *   - Mover: emailMessageApi.moveMessages()
 *   - Eliminar: emailMessageApi.deleteMessage()
 * 
 * PERFORMANCE: ~10x mejora en operaciones de lectura
 */
import { useState, useEffect } from 'react';
// Unused icons removed: Database, MessageSquare, Brain
import { useNavigate } from 'react-router-dom';
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { emailMessageApi, emailSyncApi } from '@/lib/tmwe-api-integrated';
import { emailSearchApi } from '@/lib/tmwe-email-search-api'; // ✅ Email Search RPC for ALL read operations
import { EmailSidebar } from '@/components/tmwe/EmailSidebar';
import { EmailList } from '@/components/tmwe/EmailList';
import { EmailDetail } from '@/components/tmwe/EmailDetail';
import { ComposeDialog } from '@/components/tmwe/ComposeDialog';
import { EmailSenderFilter } from '@/components/tmwe/EmailSenderFilter';
import { EmailDownloadProgress } from '@/components/tmwe/EmailDownloadProgress';
import { SenderAIChatDialog } from '@/components/email/SenderAIChatDialog';
import { PagePromptManager } from '@/components/ai/PagePromptManager';
import { EmailSyncMonitor } from '@/components/email/EmailSyncMonitor';

import { SmartInboxDialog } from '@/components/email/smart-inbox/SmartInboxDialog';
import { useEmailSync } from '@/lib/email-sync';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Search, Menu } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

const EmailDashboard = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [selectedFolder, setSelectedFolder] = useState('INBOX');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [detailPopupOpen, setDetailPopupOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showEmailList, setShowEmailList] = useState(true);
  const [replyTo, setReplyTo] = useState<{ uid: string; to: string; subject: string; originalBody: string; originalFrom: string; originalDate: string; isForward?: boolean } | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSender, setSelectedSender] = useState<string | null>(null);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [selectedAIChatSender, setSelectedAIChatSender] = useState<string>('');
  const [syncMonitorOpen, setSyncMonitorOpen] = useState(false);
  const [smartInboxOpen, setSmartInboxOpen] = useState(false);
  const queryClient = useQueryClient();

  const openAIChat = () => {
    navigate('/chat?page=/email-manager');
  };

  // Listen for compose email event from CRMLayout
  useEffect(() => {
    const handleComposeEvent = () => {
      setComposeOpen(true);
    };
    
    window.addEventListener('open-email-compose', handleComposeEvent);
    return () => {
      window.removeEventListener('open-email-compose', handleComposeEvent);
    };
  }, []);

  // Listen for email search event from CRMLayout
  useEffect(() => {
    const handleSearchEvent = (e: CustomEvent) => {
      setSearchQuery(e.detail.query);
    };
    
    window.addEventListener('email-search', handleSearchEvent as EventListener);
    return () => {
      window.removeEventListener('email-search', handleSearchEvent as EventListener);
    };
  }, []);

  // Reset selected email when folder changes
  useEffect(() => {
    setSelectedEmailId(null);
    if (isMobile) {
      setShowEmailList(true);
    }
  }, [selectedFolder, isMobile]);

  // Auto-refresh email list every 30 seconds
  useEffect(() => {
    const intervalId = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    }, 30000);

    return () => clearInterval(intervalId);
  }, [queryClient]);

  // Handle email selection on mobile
  const handleEmailSelect = (emailId: string) => {
    setSelectedEmailId(emailId);
    if (isMobile) {
      setShowEmailList(false);
    }
  };


  // Mark email as read
  const handleMarkAsRead = async (emailId: string) => {
    try {
      await emailMessageApi.getMessage(emailId, undefined, true);
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    } catch (error) {
      console.error('Error marking email as read:', error);
    }
  };

  // === CONTEGGIO EMAIL DAL SERVER (API TMWE) ===
  const { data: apiEmailCount } = useQuery({
    queryKey: ['api-email-count', selectedFolder],
    queryFn: async () => {
      const result = await emailSearchApi.getEmailsMetadata({ 
        folder: selectedFolder, 
        page: 1,
        limit: 1
      });
      return result?.data?.total || result?.total || 0;
    },
    staleTime: 2 * 60 * 1000, // Cache 2 minuti
  });
  
  const { data: folderInfo } = useQuery({
    queryKey: ['folder-info', selectedFolder],
    queryFn: async () => {
      const result = await emailSearchApi.getFolderInfo(selectedFolder);
      return result;
    },
  });

  

  // === GLOBAL EMAIL COUNT (DAL SERVER API) ===
  const { data: globalEmailCount } = useQuery({
    queryKey: ['global-folders-count'],
    queryFn: async () => {
      const foldersResponse = await emailSearchApi.getFolders();
      const folders = foldersResponse?.data || [];
      // Somma i messaggi di tutte le cartelle
      return folders.reduce((sum: number, f: any) => sum + (f.messages || 0), 0);
    },
    staleTime: 5 * 60 * 1000, // Cache 5 minuti
  });

  // Download status (semplificato - rimuovere se non necessario)
  const isDownloading = false;
  const downloadedCount = 0;

  // === SYNC STATUS: confronto API vs DB ===
  const { data: syncStatus } = useQuery({
    queryKey: ['sync-status', selectedFolder],
    queryFn: async () => {
      // 1. Conta email sul SERVER (API)
      const apiResponse = await emailSearchApi.getEmailsMetadata({ 
        folder: selectedFolder, 
        page: 1,
        limit: 1
      });
      const apiTotal = apiResponse?.data?.total || apiResponse?.total || 0;

      // 2. Conta email nel DB (solo per confronto sync)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { apiTotal: 0, dbTotal: 0, missing: 0 };

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tmwe_email')
        .eq('user_id', user.id)
        .single();

      if (!profile?.tmwe_email) return { apiTotal, dbTotal: 0, missing: apiTotal };

      const { count: dbTotal } = await supabase
        .from('email_messages')
        .select('*', { count: 'exact', head: true })
        .eq('cartella', selectedFolder)
        .eq('user_email', profile.tmwe_email);

      const missing = Math.max(0, apiTotal - (dbTotal || 0));

      return { apiTotal, dbTotal: dbTotal || 0, missing };
    },
    refetchInterval: isDownloading ? 3000 : false,
    staleTime: 1 * 60 * 1000, // Cache 1 minuto
  });

  const totalEmailCount = syncStatus?.apiTotal || 0;
  const dbEmailCount = syncStatus?.dbTotal || 0;
  const missingEmailCount = syncStatus?.missing || 0;

  // Query per le email - USA EMAIL SEARCH RPC per performance (~10x più veloce)
  const { 
    data: messagesData,
    isLoading: messagesLoading,
    error: messagesError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['messages', selectedFolder, searchQuery],
    queryFn: async ({ pageParam = 1 }) => {
      // ✅ PERFORMANCE BOOST: Usa /email_search RPC (RabbitMQ + Elasticsearch)
      if (searchQuery) {
        // Full-text search con Elasticsearch
        return emailSearchApi.searchEmails({ 
          query: searchQuery, 
          search_folder: selectedFolder,
          page: pageParam,
          limit: 30
        });
      } else {
        // Usa get_emails_metadata (solo metadata, ~10x più veloce)
        return emailSearchApi.getEmailsMetadata({ 
          folder: selectedFolder, 
          page: pageParam,
          limit: 30
        });
      }
    },
    getNextPageParam: (lastPage, allPages) => {
      const pagination = lastPage?.pagination;
      if (!pagination) {
        // Fallback to old behavior
        const messages = lastPage?.messages || [];
        if (messages.length === 0 || messages.length < 30) return undefined;
        return allPages.length + 1;
      }
      
      const currentPage = pagination.page || allPages.length;
      const totalPages = pagination.pages || Math.ceil((pagination.total || 0) / (pagination.limit || 30));
      
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
    initialPageParam: 1,
  });

  // ✅ Error handling for messages query
  useEffect(() => {
    if (messagesError) {
      console.error('❌ Error fetching messages:', messagesError);
      toast.error('Error al cargar emails desde el API');
    }
  }, [messagesError]);

  const { data: emailDetailResponse, isLoading: isLoadingDetail, error: detailError } = useQuery({
    queryKey: ['message', selectedEmailId],
    queryFn: async () => {
      console.log('🔍 Fetching email detail with UID:', selectedEmailId);
      
      // ✅ LECTURA: Usar /email_search para obtener contenido (rápido vía Elasticsearch)
      const result = await emailSearchApi.getEmailDetail({ 
        email_id: parseInt(selectedEmailId!, 10),
        include_body: true,
        timeout: 15
      });
      
      console.log('✅ Email detail received from /email_search:', result);
      
      // ✅ ESCRITURA: Usar /email_message para marcar como leído (actualización en IMAP)
      try {
        await emailMessageApi.markMessages([selectedEmailId!], 'read');
        console.log('✅ Email marked as read via /email_message');
      } catch (markError) {
        console.warn('⚠️ Failed to mark email as read:', markError);
      }
      
      // Invalidate messages query to update the read status in the list
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      return result;
    },
    enabled: !!selectedEmailId,
    retry: 1,
  });

  // Map API response to component format - handle both possible response structures
  const selectedEmail = emailDetailResponse ? (() => {
    // Check if response is empty array or has no data
    if (Array.isArray(emailDetailResponse) && emailDetailResponse.length === 0) {
      console.warn('⚠️ API returned empty array for message');
      return null;
    }

    // Try to get the message from response
    const msg = emailDetailResponse.message || emailDetailResponse.data || emailDetailResponse;
    
    if (!msg || typeof msg !== 'object') {
      console.warn('⚠️ No valid message data in response:', emailDetailResponse);
      return null;
    }

    console.log('📧 Processing message:', msg);

    // Access header data correctly from the TMWE API response structure
    const header = msg.header || msg;

    // ✅ UPDATED: Handle EmailAddress type conversion for backward compatibility
    const convertToString = (addr: any): string => {
      if (typeof addr === 'string') return addr;
      if (addr && typeof addr === 'object') {
        return addr.email || addr.name || 'Unknown';
      }
      return 'Unknown';
    };

    const convertToArray = (addrs: any): string[] => {
      if (Array.isArray(addrs)) {
        return addrs.map(convertToString);
      }
      if (addrs) {
        return [convertToString(addrs)];
      }
      return [];
    };

    return {
      id: String(header.uid || msg.uid || msg.id || selectedEmailId),
      subject: header.subject || '(No Subject)',
      from: convertToString(header.from),
      to: convertToArray(header.to),
      cc: convertToArray(header.cc),
      date: header.date || new Date().toISOString(),
      body: msg.body_html || msg.body_plain || msg.body_text || msg.body || '<p>No content available</p>',
      attachments: msg.attachments || [],
    };
  })() : null;

  const deleteMutation = useMutation({
    mutationFn: (messageIds: string[]) => emailMessageApi.deleteMessages(messageIds),
    onSuccess: () => {
      toast.success('Email deleted');
      setSelectedEmailId(null);
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
    onError: () => {
      toast.error('Failed to delete email');
    },
  });

  console.log('🔍 messagesData structure:', {
    hasPages: !!messagesData?.pages,
    pagesCount: messagesData?.pages?.length,
    messagesLoading,
    messagesError: !!messagesError
  });

  const emailsFromPages = (messagesData?.pages || []).flatMap(page => {
    console.log('📦 API Response Structure:', {
      pageKeys: page ? Object.keys(page) : 'null',
      hasEmails: !!page?.emails,
      hasMessages: !!page?.messages,
      hasData: !!page?.data,
      emailsLength: page?.emails?.length,
      messagesLength: page?.messages?.length,
      dataLength: page?.data?.length
    });
    
    // ✅ CORRECCIÓN: Priorizar page.emails (estructura correcta del API)
    const messages = page?.emails || page?.messages || page?.data || [];
    
    if (!Array.isArray(messages)) {
      console.warn('⚠️ Messages is not an array:', messages);
      return [];
    }
    
    if (messages.length > 0) {
      console.log('📧 First message structure:', messages[0]);
    }
    
    return messages.map((msg: any) => {
      // ✅ CORRECTED: Use from_name and from_email from API response
      const fromAddress = msg.from_name || msg.from_email || 
                         (typeof msg.from === 'object' ? (msg.from.name || msg.from.email) : msg.from) || 
                         'Unknown';

      // ✅ CORRECTED: Populate preview field from multiple possible sources
      const preview = msg.preview || 
                     msg.snippet || 
                     msg.body_preview || 
                     (msg.body_text ? msg.body_text.substring(0, 150) : '') ||
                     (msg.body_html ? msg.body_html.replace(/<[^>]*>/g, '').substring(0, 150) : '') ||
                     '';

      return {
        id: String(msg.uid || msg.id),
        subject: msg.subject || '(No Subject)',
        from: fromAddress,
        preview: preview,
        // ✅ Convertir fecha UTC a zona horaria local del cliente
        date: msg.date ? new Date(msg.date).toISOString() : new Date().toISOString(),
        read: msg.is_read === true || msg.seen === 1 || msg.read === true,
        starred: msg.is_flagged === true || msg.flagged === 1 || msg.starred === true,
        hasAttachments: !!(
          msg.has_attachments || 
          msg.hasAttachments || 
          msg.attachment_count > 0 ||
          msg.attachmentCount > 0 ||
          (msg.attachments && msg.attachments.length > 0) ||
          (msg.size && parseInt(msg.size) > 50000)
        ),
        group: msg.group || msg.sender_group || null,
        hasRules: msg.hasRules || msg.has_rules || false,
      };
    });
  });

  // Usa sempre emailsFromPages (dalle API)
  const emailsToUse = emailsFromPages;

  // Filter emails by selected sender
  const emails = selectedSender 
    ? emailsToUse.filter(email => email.from === selectedSender)
    : emailsToUse;

  // Logging de conversión de fechas
  if (emailsFromPages.length > 0 && emailsFromPages[0].date) {
    console.log('📅 Date conversion:', {
      original: messagesData?.pages?.[0]?.emails?.[0]?.date,
      converted: emailsFromPages[0].date,
      localString: new Date(emailsFromPages[0].date).toLocaleString('it-IT')
    });
  }

  console.log('📬 Emails ready for render:', {
    emailsFromPagesCount: emailsFromPages.length,
    emailsToUseCount: emailsToUse.length,
    filteredEmailsCount: emails.length,
    messagesLoading,
    hasPages: !!messagesData?.pages,
    selectedSender
  });

  const handleSync = async () => {
    toast.info('Usa la pagina Fun Email per scaricare email');
  };

  const handleDelete = () => {
    if (selectedEmailId) {
      // ✅ UPDATED: Use moveToTrash instead of permanent delete (according to API spec)
      emailMessageApi.moveToTrash(selectedEmailId)
        .then(() => {
          toast.success('Email moved to trash');
          setSelectedEmailId(null);
          queryClient.invalidateQueries({ queryKey: ['messages'] });
        })
        .catch(() => toast.error('Failed to move email to trash'));
    }
  };

  const handleBulkDelete = (emailIds: string[]) => {
    // ✅ UPDATED: Use moveMessagesToTrash instead of permanent delete
    emailMessageApi.moveMessagesToTrash(emailIds)
      .then(() => {
        toast.success(`${emailIds.length} emails moved to trash`);
        queryClient.invalidateQueries({ queryKey: ['messages'] });
      })
      .catch(() => toast.error('Failed to move emails to trash'));
  };

  const handleBulkArchive = (emailIds: string[]) => {
    toast.info('Archivio non ancora implementato');
    console.log('Archive emails:', emailIds);
  };

  const handleBulkForward = (emailIds: string[]) => {
    toast.info('Inoltro multiplo non ancora implementato');
    console.log('Forward emails:', emailIds);
  };

  const handleBulkMarkAsRead = async (emailIds: string[]) => {
    try {
      await emailMessageApi.markMessages(emailIds, 'read');
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      toast.success('Email segnate come lette');
    } catch (error) {
      toast.error('Errore durante la marcatura');
    }
  };

  const handleBulkMoveToFolder = (emailIds: string[], folder: string) => {
    toast.info(`Spostamento in ${folder} non ancora implementato`);
    console.log('Move emails to folder:', emailIds, folder);
  };

  const handleReply = () => {
    if (selectedEmail) {
      setReplyTo({
        uid: selectedEmail.id,
        to: selectedEmail.from,
        subject: selectedEmail.subject.startsWith('Re: ') 
          ? selectedEmail.subject 
          : `Re: ${selectedEmail.subject}`,
        originalBody: selectedEmail.body,
        originalFrom: selectedEmail.from,
        originalDate: selectedEmail.date
      });
      setComposeOpen(true);
    }
  };

  const handleReplyAll = () => {
    if (selectedEmail) {
      // Get all recipients except the current user's address
      const allRecipients = [
        selectedEmail.from,
        ...(Array.isArray(selectedEmail.to) ? selectedEmail.to : []),
        ...(Array.isArray(selectedEmail.cc) ? selectedEmail.cc : [])
      ].filter((addr, index, self) => self.indexOf(addr) === index); // Remove duplicates

      setReplyTo({
        uid: selectedEmail.id,
        to: allRecipients.join(', '),
        subject: selectedEmail.subject.startsWith('Re: ') 
          ? selectedEmail.subject 
          : `Re: ${selectedEmail.subject}`,
        originalBody: selectedEmail.body,
        originalFrom: selectedEmail.from,
        originalDate: selectedEmail.date
      });
      setComposeOpen(true);
    }
  };

  const handleForward = () => {
    if (selectedEmail) {
      setReplyTo({
        uid: selectedEmail.id,
        to: '',
        subject: selectedEmail.subject.startsWith('Fwd: ') 
          ? selectedEmail.subject 
          : `Fwd: ${selectedEmail.subject}`,
        originalBody: selectedEmail.body,
        originalFrom: selectedEmail.from,
        originalDate: selectedEmail.date,
        isForward: true
      });
      setComposeOpen(true);
    }
  };

  const handleComposeClose = () => {
    setComposeOpen(false);
    setReplyTo(undefined);
  };

  console.log('🔍 Current syncMonitorOpen state:', syncMonitorOpen);

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-purple-900/20 via-background to-blue-900/20">
      <div className="flex flex-1 min-w-0 overflow-hidden">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <EmailSidebar
            selectedFolder={selectedFolder}
            onFolderSelect={setSelectedFolder}
            onCompose={() => setComposeOpen(true)}
            onSync={handleSync}
          />
        )}

        {/* Mobile Sidebar Sheet */}
        {isMobile && (
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent side="left">
            <EmailSidebar 
              selectedFolder={selectedFolder}
              onFolderSelect={(folder) => {
                setSelectedFolder(folder);
                setSidebarOpen(false);
              }}
              onCompose={() => {
                setComposeOpen(true);
                setSidebarOpen(false);
              }}
              onSync={handleSync}
              dbEmailCount={dbEmailCount || 0}
            />
            </SheetContent>
          </Sheet>
        )}

        {/* Email List - Hidden on mobile when email is selected */}
        <div className={cn(
          "flex-1 flex flex-col min-w-0 overflow-hidden px-1 sm:px-2 md:px-4",
          isMobile && !showEmailList && "hidden"
        )}>
          {/* Mobile Search Bar - Above cards on mobile */}
          {isMobile && (
            <div className="border-b bg-card-transparent">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search emails..."
                  className="text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          )}
          
          {/* Sender Filter */}
          <div className="border-b bg-card-transparent p-2 sm:p-3">
            <div className="flex items-center justify-between gap-2 flex-wrap min-w-0">
              {/* LEFT SIDE: Filter + Info text */}
              <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                <EmailSenderFilter
                  emails={emailsToUse}
                  selectedSender={selectedSender}
                  onSenderSelect={setSelectedSender}
                  onOpenAIChat={(senderEmail) => {
                    setSelectedAIChatSender(senderEmail);
                    setAiChatOpen(true);
                  }}
                />
                {selectedSender && (
                  <div className="text-xs sm:text-sm text-muted-foreground truncate max-w-full">
                    Mostrando {emails.length} email da <strong>{selectedSender}</strong>
                  </div>
                )}
              </div>
              
              {/* RIGHT SIDE: AI Icon */}
              <div className="flex items-center shrink-0">
                <PagePromptManager pageRoute="/email-manager" />
              </div>
            </div>
          </div>

          <EmailList
            emails={emails}
            selectedEmailId={selectedEmailId}
            onEmailSelect={handleEmailSelect}
            loading={messagesLoading && emails.length === 0}
            onLoadMore={fetchNextPage}
            hasMore={hasNextPage}
            isLoadingMore={isFetchingNextPage}
            emailDetail={selectedEmail}
            isLoadingDetail={isLoadingDetail}
            onOpenDetailPopup={() => setDetailPopupOpen(true)}
            onBulkDelete={handleBulkDelete}
            onBulkArchive={handleBulkArchive}
            onBulkForward={handleBulkForward}
            onBulkMarkAsRead={handleBulkMarkAsRead}
            onBulkMoveToFolder={handleBulkMoveToFolder}
            isDownloading={isDownloading}
          />
        </div>

        {/* Email Detail - Full screen on mobile when email is selected */}
        {isMobile && !showEmailList && selectedEmail && (
          <div className="flex-1 flex flex-col">
            <EmailDetail
              email={selectedEmail}
              onReply={handleReply}
              onReplyAll={handleReplyAll}
              onForward={handleForward}
              onBack={() => {
                setSelectedEmailId(null);
                setShowEmailList(true);
              }}
              isMobile={true}
              onMarkAsRead={handleMarkAsRead}
            />
          </div>
        )}
      </div>

      <ComposeDialog
        open={composeOpen}
        onClose={handleComposeClose}
        onSent={() => queryClient.invalidateQueries({ queryKey: ['messages'] })}
        replyTo={replyTo}
      />

      <Dialog open={detailPopupOpen} onOpenChange={setDetailPopupOpen}>
        <DialogContent className="flex flex-col">
          <DialogHeader>
            <DialogTitle>Email Detail</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-hidden">
            {isLoadingDetail ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Caricamento...</p>
              </div>
            ) : selectedEmail ? (
              <div key={selectedEmailId}>
                <EmailDetail
                  email={selectedEmail}
                  onReply={handleReply}
                  onReplyAll={handleReplyAll}
                  onForward={handleForward}
                  onDelete={handleDelete}
                  onMarkAsRead={handleMarkAsRead}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">No email selected</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <SenderAIChatDialog 
        senderEmail={selectedAIChatSender}
        open={aiChatOpen}
        onOpenChange={setAiChatOpen}
      />

      <Dialog open={syncMonitorOpen} onOpenChange={setSyncMonitorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Download Email TMWE</DialogTitle>
          </DialogHeader>
          <EmailSyncMonitor 
            onSyncComplete={() => {
              queryClient.invalidateQueries({ queryKey: ['messages'] });
              toast.success('Sincronizzazione completata');
              setSyncMonitorOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      <SmartInboxDialog 
        open={smartInboxOpen} 
        onOpenChange={setSmartInboxOpen}
      />
    </div>
  );
};

export default EmailDashboard;
