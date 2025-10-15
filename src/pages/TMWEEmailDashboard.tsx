import { useState, useEffect, useMemo } from 'react';
// Unused icons removed: Database, MessageSquare, Brain
import { useNavigate } from 'react-router-dom';
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { emailApi, emailSyncApi, emailFolderApi } from '@/lib/api';
import { EmailHeader } from '@/components/tmwe/EmailHeader';
import { EmailSidebar } from '@/components/tmwe/EmailSidebar';
import { EmailList } from '@/components/tmwe/EmailList';
import { EmailDetail } from '@/components/tmwe/EmailDetail';
import { ComposeDialog } from '@/components/tmwe/ComposeDialog';
import { EmailSenderFilter } from '@/components/tmwe/EmailSenderFilter';
import { EmailDownloadProgress } from '@/components/tmwe/EmailDownloadProgress';
import { SenderAIChatDialog } from '@/components/email/SenderAIChatDialog';
import { PagePromptManager } from '@/components/ai/PagePromptManager';
import { EmailSyncMonitor } from '@/components/email/EmailSyncMonitor';
import { DirectAPIDownloadDialog } from '@/components/tmwe/DirectAPIDownloadDialog';
import { EmailSyncStatus } from '@/components/tmwe/EmailSyncStatus';
import { useEmailDownload } from '@/hooks/useEmailDownload';
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
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const [syncMonitorOpen, setSyncMonitorOpen] = useState(false);
  const [directDownloadOpen, setDirectDownloadOpen] = useState(false);
  const queryClient = useQueryClient();

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
      await emailApi.getEmailDetail(emailId);
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    } catch (error) {
      console.error('Error marking email as read:', error);
    }
  };

  // === CONTEGGIO EMAIL DAL SERVER (API TMWE) ===
  const { data: apiEmailCount } = useQuery({
    queryKey: ['api-email-count', selectedFolder],
    queryFn: async () => {
      const result = await emailApi.getEmails(selectedFolder, 1, 1);
      return result?.total || 0;
    },
    staleTime: 2 * 60 * 1000, // Cache 2 minuti
  });
  
  const { data: folderInfo } = useQuery({
    queryKey: ['folder-info', selectedFolder],
    queryFn: async () => {
      const result = await emailApi.getEmails(selectedFolder, 1, 1);
      return result;
    },
  });

  

  // === FOLDERS QUERY - Condivisa con EmailSidebar ===
  const { data: foldersData } = useQuery({
    queryKey: ['folders'], // ✅ Stessa queryKey di EmailSidebar
    queryFn: () => emailFolderApi.getFolders(),
    staleTime: 5 * 60 * 1000, // Cache 5 minuti
  });

  // === GLOBAL EMAIL COUNT (calcolato dai folders cached) ===
  const globalEmailCount = useMemo(() => {
    if (!foldersData?.data) return 0;
    return foldersData.data.reduce((sum: number, f: any) => sum + (f.messages || 0), 0);
  }, [foldersData]);

  // Email download hook
  const {
    isDownloading,
    downloadedCount,
    downloadError,
    startDownload,
    currentFolder,
    totalToDownload,
  } = useEmailDownload();

  // === SYNC STATUS: confronto API vs DB ===
  const { data: syncStatus } = useQuery({
    queryKey: ['sync-status', selectedFolder],
    queryFn: async () => {
      // 1. Conta email sul SERVER (API)
      const apiResponse = await emailApi.getEmails(selectedFolder, 1, 1);
      const apiTotal = apiResponse?.total || 0;

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

  // Query per le email - USA SEMPRE L'API TMWE (non Supabase)
  const { 
    data: messagesData,
    isLoading: messagesLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['messages', selectedFolder, searchQuery],
    queryFn: async ({ pageParam = 0 }) => {
      // USA SEMPRE L'API TMWE (Supabase solo per backup)
      const page = Math.floor(pageParam / 30) + 1;
      return emailApi.getEmails(selectedFolder, page, 30, searchQuery);
    },
    getNextPageParam: (lastPage, allPages) => {
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
      const result = await emailApi.getEmailDetail(selectedEmailId!);
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

  const deleteMutation = useMutation({
    mutationFn: (messageIds: string[]) => emailApi.deleteMessages(messageIds),
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

  // Usa sempre emailsFromPages (dalle API)
  const emailsToUse = emailsFromPages;

  // Filter emails by selected sender
  const emails = selectedSender 
    ? emailsToUse.filter(email => email.from === selectedSender)
    : emailsToUse;

  const handleSync = () => {
    console.log('🚀 Starting REAL email download from API...');
    toast.info('Avvio download email da tutte le cartelle...');
    startDownload(queryClient);
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
      await Promise.all(emailIds.map(id => emailApi.getEmailDetail(id)));
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
      <EmailHeader
        onSearch={setSearchQuery} 
        onCompose={() => setComposeOpen(true)} 
        onSync={handleSync}
        isSyncing={isDownloading}
        onMenuClick={() => setSidebarOpen(true)}
        isMobile={isMobile}
        dbEmailCount={isMobile ? (apiEmailCount || 0) : undefined}
        isHeaderCollapsed={isHeaderCollapsed}
        onToggleCollapse={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
        onCloseEmail={handleBackToList}
        onPreviousEmail={handlePreviousEmail}
        onNextEmail={handleNextEmail}
        hasPrevious={hasPreviousEmail()}
        hasNext={hasNextEmail()}
        onOpenSyncMonitor={() => {
          console.log('🚀 Opening sync monitor!');
          setSyncMonitorOpen(true);
        }}
        onOpenDirectDownload={() => {
          console.log('📥 Opening direct download!');
          setDirectDownloadOpen(true);
        }}
        downloadProgressComponent={
          <EmailDownloadProgress
            totalEmails={globalEmailCount || 0}
            currentFolder={currentFolder}
            totalToDownload={totalToDownload}
            onDownloadComplete={() => {}}
            onStartDownload={() => startDownload(queryClient)}
            isDownloading={isDownloading}
            downloadedCount={downloadedCount}
            downloadError={downloadError}
          />
        }
      />
      
      {/* Email Sync Status Bar */}
      <div className="px-4 py-2 border-b bg-background/50">
        <EmailSyncStatus 
          selectedFolder={selectedFolder}
          onStartSync={() => setDirectDownloadOpen(true)}
          isDownloading={isDownloading}
        />
      </div>
      
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

      <DirectAPIDownloadDialog 
        open={directDownloadOpen}
        onOpenChange={setDirectDownloadOpen}
      />
    </div>
  );
};

export default EmailDashboard;
