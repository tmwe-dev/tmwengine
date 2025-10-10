import { useState, useEffect } from 'react';
import { Database, MessageSquare, Brain, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { emailMessageApi, emailSyncApi } from '@/lib/tmwe-api-integrated';
import { EmailHeader } from '@/components/tmwe/EmailHeader';
import { EmailSidebar } from '@/components/tmwe/EmailSidebar';
import { EmailList } from '@/components/tmwe/EmailList';
import { EmailDetail } from '@/components/tmwe/EmailDetail';
import { ComposeDialog } from '@/components/tmwe/ComposeDialog';
import { EmailSenderFilter } from '@/components/tmwe/EmailSenderFilter';
import { EmailDownloadProgress } from '@/components/tmwe/EmailDownloadProgress';
import { EmailSyncProgress } from '@/components/tmwe/EmailSyncProgress';
import { SenderAIChatDialog } from '@/components/email/SenderAIChatDialog';
import { PagePromptManager } from '@/components/ai/PagePromptManager';
import { useEmailSync } from '@/hooks/useEmailSync';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Search, Menu } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

const EmailDashboard = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'personal' | 'shared'>('personal');
  const [selectedFolder, setSelectedFolder] = useState('INBOX');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [detailPopupOpen, setDetailPopupOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showEmailList, setShowEmailList] = useState(true);
  const [replyTo, setReplyTo] = useState<{ uid: string; to: string; subject: string; originalBody: string; originalFrom: string; originalDate: string; isForward?: boolean } | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSender, setSelectedSender] = useState<string | null>(null);
  const [selectedSharedAccount, setSelectedSharedAccount] = useState<string | null>(null);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [selectedAIChatSender, setSelectedAIChatSender] = useState<string>('');
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const [showSyncProgress, setShowSyncProgress] = useState(false);
  const [isSyncMinimized, setIsSyncMinimized] = useState(false);
  const queryClient = useQueryClient();

  // Query per email condivise
  const { data: sharedAccounts } = useQuery({
    queryKey: ['shared-email-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shared_email_accounts')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      return data || [];
    }
  });

  const openAIChat = () => {
    navigate('/chat?page=/email-manager');
  };

  // Reset selected email when folder changes
  useEffect(() => {
    setSelectedEmailId(null);
    if (isMobile) {
      setShowEmailList(true);
    }
  }, [selectedFolder, isMobile]);

  // Handle email selection on mobile
  const handleEmailSelect = (emailId: string) => {
    setSelectedEmailId(emailId);
    if (isMobile) {
      setShowEmailList(false);
    }
  };

  // Handle back to list on mobile
  const handleBackToList = () => {
    setSelectedEmailId(null);
    setShowEmailList(true);
  };

  // Navigation between emails
  const handlePreviousEmail = () => {
    const currentIndex = emails.findIndex(e => e.id === selectedEmailId);
    if (currentIndex > 0) {
      setSelectedEmailId(emails[currentIndex - 1].id);
    }
  };

  const handleNextEmail = () => {
    const currentIndex = emails.findIndex(e => e.id === selectedEmailId);
    if (currentIndex >= 0 && currentIndex < emails.length - 1) {
      setSelectedEmailId(emails[currentIndex + 1].id);
    }
  };

  const hasPreviousEmail = () => {
    const currentIndex = emails.findIndex(e => e.id === selectedEmailId);
    return currentIndex > 0;
  };

  const hasNextEmail = () => {
    const currentIndex = emails.findIndex(e => e.id === selectedEmailId);
    return currentIndex >= 0 && currentIndex < emails.length - 1;
  };

  // Mark email as read
  const handleMarkAsRead = async (emailId: string) => {
    try {
      await emailMessageApi.getMessage(emailId, true);
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    } catch (error) {
      console.error('Error marking email as read:', error);
    }
  };

  // Prima ottieni il conteggio totale delle email dell'utente
  const [emailCount, setEmailCount] = useState<number>(0);
  
  useEffect(() => {
    const fetchCount = async () => {
      const userEmail = sessionStorage.getItem('tmwe_user_email');
      if (!userEmail) return;
      
      const { count } = await supabase
        .from('email_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_email', userEmail);
      if (count !== null) setEmailCount(count);
    };
    fetchCount();
    
    const channel = supabase
      .channel('email-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'email_messages' }, fetchCount)
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, []);
  
  // Get real total count from server
  const { data: realTotalCount, isLoading: isLoadingTotal } = useQuery({
    queryKey: ['real-total-count', selectedFolder],
    queryFn: () => emailMessageApi.getTotalEmailCount({ folder: selectedFolder }),
    refetchInterval: 30000, // Refresh every 30s
  });

  const totalEmailCount = realTotalCount || 0;

  // Conta le email nel DB per la cartella corrente e utente
  const { data: dbEmailCount } = useQuery({
    queryKey: ['db-email-count', selectedFolder],
    queryFn: async () => {
      const userEmail = sessionStorage.getItem('tmwe_user_email');
      if (!userEmail) return 0;
      
      const { count } = await supabase
        .from('email_messages')
        .select('*', { count: 'exact', head: true })
        .eq('cartella', selectedFolder)
        .eq('user_email', userEmail);
      return count || 0;
    },
  });

  // Hook unificato per sincronizzazione intelligente
  const {
    isSyncing,
    syncedCount,
    syncError,
    allEmails: downloadedEmails,
    downloadStatus,
    startSync,
    stopSync,
  } = useEmailSync({
    folder: selectedFolder,
    totalEmailCount,
  });

  const missingEmailCount = Math.max(0, totalEmailCount - (dbEmailCount || 0));
  const [hasAutoSynced, setHasAutoSynced] = useState(false);

  // Reset auto-sync flag when folder changes
  useEffect(() => {
    setHasAutoSynced(false);
  }, [selectedFolder]);

  // Auto-sync on mount if emails are missing (ONE TIME ONLY)
  useEffect(() => {
    const autoSync = async () => {
      if (
        !isLoadingTotal && 
        totalEmailCount > 0 && 
        dbEmailCount !== null &&
        !isSyncing &&
        !hasAutoSynced
      ) {
        const missing = totalEmailCount - dbEmailCount;
        if (missing > 0) {
          console.log(`🔄 [Auto-Sync] ${missing} email mancanti, avvio MICRO-BATCH sync...`);
          setHasAutoSynced(true);
          setShowSyncProgress(true);
          await startSync();
        }
      }
    };
    autoSync();
  }, [isLoadingTotal, totalEmailCount, dbEmailCount, isSyncing, hasAutoSynced]);

  // ALWAYS show progress when syncing
  useEffect(() => {
    if (isSyncing) {
      setShowSyncProgress(true);
      setIsSyncMinimized(false);
    }
  }, [isSyncing]);

  // Query per le email - USA SEMPRE L'API TMWE (non Supabase)
  const { 
    data: messagesData,
    isLoading: messagesLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['messages', selectedFolder, searchQuery, downloadedEmails.length],
    queryFn: async ({ pageParam = 0 }) => {
      // Se abbiamo email scaricate in memoria, usale
      if (downloadedEmails.length > 0) {
        const start = pageParam;
        const end = start + 30;
        return {
          messages: downloadedEmails.slice(start, end),
          total: downloadedEmails.length,
        };
      }

      // USA SEMPRE L'API TMWE (Supabase solo per backup con Sync Smart)
      const page = Math.floor(pageParam / 30) + 1;
      return searchQuery 
        ? emailMessageApi.searchMessages({ query: searchQuery, folder: selectedFolder })
        : emailMessageApi.getMessages({ folder: selectedFolder, limit: 30, page });
    },
    getNextPageParam: (lastPage, allPages) => {
      if (downloadedEmails.length > 0) {
        const nextOffset = allPages.length * 30;
        return nextOffset < downloadedEmails.length ? nextOffset : undefined;
      }
      
      const messages = lastPage?.messages || [];
      if (messages.length === 0 || messages.length < 30) return undefined;
      return allPages.length * 30;
    },
    initialPageParam: 0,
  });


  const { data: emailDetailResponse, isLoading: isLoadingDetail, error: detailError } = useQuery({
    queryKey: ['message', selectedEmailId],
    queryFn: async () => {
      console.log('🔍 Fetching email with UID:', selectedEmailId);
      const result = await emailMessageApi.getMessage(selectedEmailId!, true); // markAsRead = true
      console.log('✅ Email detail received:', result);
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

    return {
      id: String(header.uid || msg.uid || msg.id || selectedEmailId),
      subject: header.subject || '(No Subject)',
      from: header.from || 'Unknown',
      to: header.to ? (Array.isArray(header.to) ? header.to : [header.to]) : [],
      cc: header.cc ? (Array.isArray(header.cc) ? header.cc : [header.cc]) : [],
      date: header.date || new Date().toISOString(),
      body: msg.body_html || msg.body_plain || msg.body_text || msg.body || '<p>No content available</p>',
      attachments: msg.attachments || [],
    };
  })() : null;

  // Rimosso syncMutation - ora usa hook unificato useEmailSync

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

  const emailsFromPages = (messagesData?.pages || []).flatMap(page => 
    (page?.messages || []).map((msg: any) => {
      // Debug: Log message structure to understand attachment indicators
      if (msg.uid === 6624) {
        console.log('📎 Message structure for email with known attachment:', msg);
      }
      
      return {
        id: String(msg.uid || msg.id),
        subject: msg.subject || '(No Subject)',
        from: typeof msg.from === 'object' ? msg.from.email : msg.from,
        preview: '', // TMWE API doesn't provide preview in list
        date: msg.date,
        read: msg.is_read === true || msg.seen === 1,
        starred: msg.is_flagged === true || msg.flagged === 1,
        // Check various possible attachment indicators from the API
        hasAttachments: !!(
          msg.has_attachments || 
          msg.hasAttachments || 
          msg.attachment_count > 0 ||
          msg.attachmentCount > 0 ||
          (msg.attachments && msg.attachments.length > 0) ||
          // Use size as a heuristic: emails > 50KB likely have attachments
          (msg.size && parseInt(msg.size) > 50000)
        ),
      };
    })
  );

  // Use downloaded emails if available, otherwise use paginated emails
  const emailsToUse = downloadedEmails.length > 0 ? downloadedEmails.map((msg: any) => ({
    id: String(msg.uid || msg.id),
    subject: msg.subject || '(No Subject)',
    from: typeof msg.from === 'object' ? msg.from.email : msg.from,
    preview: '',
    date: msg.date,
    read: msg.is_read === true || msg.seen === 1,
    starred: msg.is_flagged === true || msg.flagged === 1,
    hasAttachments: !!(
      msg.has_attachments || 
      msg.hasAttachments || 
      msg.attachment_count > 0 ||
      msg.attachmentCount > 0 ||
      (msg.attachments && msg.attachments.length > 0) ||
      (msg.size && parseInt(msg.size) > 50000)
    ),
  })) : emailsFromPages;

  // Filter emails by selected sender
  const emails = selectedSender 
    ? emailsToUse.filter(email => email.from === selectedSender)
    : emailsToUse;

  const handleSync = async () => {
    toast.info('Avvio sincronizzazione...');
    setShowSyncProgress(true);
    setIsSyncMinimized(false);
    await startSync();
  };

  const handleMinimizeSync = () => {
    setIsSyncMinimized(true);
    setShowSyncProgress(false);
  };

  const handleRestoreSync = () => {
    setIsSyncMinimized(false);
    setShowSyncProgress(true);
  };

  const handleDelete = () => {
    if (selectedEmailId) {
      deleteMutation.mutate([selectedEmailId]);
    }
  };

  const handleBulkDelete = (emailIds: string[]) => {
    deleteMutation.mutate(emailIds);
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
      await Promise.all(emailIds.map(id => emailMessageApi.getMessage(id, true)));
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

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-purple-900/20 via-background to-blue-900/20 w-full">
      <div className="relative">
        <EmailHeader
          onSearch={setSearchQuery} 
          onCompose={() => setComposeOpen(true)} 
          onSync={handleSync}
          onSyncSmart={startSync}
          isSyncingSmart={isSyncing}
          syncSmartProgress={{ current: syncedCount, total: totalEmailCount, missing: missingEmailCount }}
          missingEmailCount={missingEmailCount}
          onMenuClick={() => setSidebarOpen(true)}
          isMobile={isMobile}
          dbEmailCount={isMobile ? emailCount : undefined}
          isHeaderCollapsed={isHeaderCollapsed}
          onToggleCollapse={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
          onCloseEmail={handleBackToList}
          onPreviousEmail={handlePreviousEmail}
          onNextEmail={handleNextEmail}
          hasPrevious={hasPreviousEmail()}
          hasNext={hasNextEmail()}
        />
        
        {/* Minimized Sync Badge */}
        {isSyncMinimized && isSyncing && (
          <Button
            onClick={handleRestoreSync}
            variant="default"
            size="sm"
            className="absolute top-2 right-4 z-50 animate-pulse shadow-lg"
          >
            <Database className="h-4 w-4 mr-2 animate-spin" />
            Sync in corso: {downloadStatus?.currentBatch}/{downloadStatus?.totalBatches}
            <Badge variant="secondary" className="ml-2">
              {downloadStatus?.downloadedCount}
            </Badge>
          </Button>
        )}
      </div>

      {/* Tab personali/aziendali */}
      {!isMobile && (
        <div className="border-b bg-card-transparent px-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="bg-transparent">
              <TabsTrigger value="personal" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Email Personali
              </TabsTrigger>
              <TabsTrigger value="shared" className="gap-2">
                <Building2 className="h-4 w-4" />
                Email Aziendali
                {sharedAccounts && sharedAccounts.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {sharedAccounts.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}
      
      <div className="flex flex-1 w-full">
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
            <SheetContent side="left" className="w-[280px] p-0">
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
              dbEmailCount={downloadedEmails.length}
            />
            </SheetContent>
          </Sheet>
        )}

        {/* Content area con tab */}
        {activeTab === 'personal' && (
          <>
            {/* Email List - Hidden on mobile when email is selected */}
            <div className={cn(
              "flex-1 flex flex-col",
              isMobile && !showEmailList && "hidden"
            )}>
              {/* Mobile Search Bar - Above cards on mobile */}
              {isMobile && (
                <div className="border-b bg-card-transparent px-2 py-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search emails..."
                      className="pl-10 text-sm h-9 w-full"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              )}
          
          {/* Sender Filter */}
          <div className="border-b bg-card-transparent px-2 sm:px-4 py-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <EmailSenderFilter
                emails={emailsToUse}
                selectedSender={selectedSender}
                onSenderSelect={setSelectedSender}
                onOpenAIChat={(senderEmail) => {
                  setSelectedAIChatSender(senderEmail);
                  setAiChatOpen(true);
                }}
              />
              {selectedSender && !isMobile && (
                <div className="flex-1 text-sm text-muted-foreground">
                  Mostrando {emails.length} email da <strong>{selectedSender}</strong>
                </div>
              )}
            </div>
            
            {/* Right aligned icons - visible on all devices */}
            <div className="flex items-center gap-2 shrink-0">
              <PagePromptManager pageRoute="/email-manager" />
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 hover:bg-primary/10"
                onClick={openAIChat}
              >
                <Brain className="h-4 w-4 text-primary" />
              </Button>
            </div>
          </div>

          <EmailList
            emails={emails}
            selectedEmailId={selectedEmailId}
            onEmailSelect={handleEmailSelect}
            loading={messagesLoading}
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
            isDownloading={isSyncing}
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
              onBack={handleBackToList}
              isMobile={true}
              onPrevious={handlePreviousEmail}
              onNext={handleNextEmail}
              hasPrevious={hasPreviousEmail()}
              hasNext={hasNextEmail()}
              onMarkAsRead={handleMarkAsRead}
              isHeaderCollapsed={isHeaderCollapsed}
              onToggleCollapse={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
            />
          </div>
        )}
          </>
        )}

        {/* Email Condivise Tab */}
        {activeTab === 'shared' && (
          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Email Aziendali Condivise</h2>
                  <p className="text-muted-foreground">
                    Accedi alle caselle email condivise con il team
                  </p>
                </div>
                <Button onClick={() => navigate('/shared-emails')} variant="outline">
                  <Building2 className="h-4 w-4 mr-2" />
                  Gestisci
                </Button>
              </div>

              {sharedAccounts && sharedAccounts.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {sharedAccounts.map((account: any) => (
                    <div
                      key={account.id}
                      className="p-6 border rounded-lg bg-card hover:bg-accent cursor-pointer transition-colors"
                     onClick={() => {
                        setSelectedSharedAccount(account.email);
                        setActiveTab('personal');
                        setSelectedFolder('INBOX');
                        toast.success(`Visualizzazione email: ${account.email}`);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <Building2 className="h-5 w-5 text-primary mt-1" />
                        <div className="flex-1">
                          <h3 className="font-semibold">{account.display_name}</h3>
                          <p className="text-sm text-muted-foreground font-mono">
                            {account.email}
                          </p>
                          {account.description && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {account.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border rounded-lg bg-card">
                  <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Nessuna Email Aziendale</h3>
                  <p className="text-muted-foreground mb-4">
                    Non hai accesso a email aziendali condivise
                  </p>
                  <Button onClick={() => navigate('/shared-emails')} variant="outline">
                    Scopri di più
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <ComposeDialog
        open={composeOpen}
        onClose={handleComposeClose}
        onSent={() => queryClient.invalidateQueries({ queryKey: ['messages'] })}
        replyTo={replyTo}
      />

      <EmailSyncProgress 
        open={showSyncProgress && !isSyncMinimized} 
        onOpenChange={setShowSyncProgress}
        status={downloadStatus}
        isSyncing={isSyncing}
        onStop={stopSync}
        onMinimize={handleMinimizeSync}
      />

      <Dialog open={detailPopupOpen} onOpenChange={setDetailPopupOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col" style={{ background: 'var(--gradient-page)' }}>
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
                  onPrevious={handlePreviousEmail}
                  onNext={handleNextEmail}
                  hasPrevious={hasPreviousEmail()}
                  hasNext={hasNextEmail()}
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
    </div>
  );
};

export default EmailDashboard;
