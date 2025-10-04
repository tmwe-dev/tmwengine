import { useState, useEffect } from 'react';
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailMessageApi, emailSyncApi } from '@/lib/tmwe-api-integrated';
import { EmailHeader } from '@/components/tmwe/EmailHeader';
import { EmailSidebar } from '@/components/tmwe/EmailSidebar';
import { EmailList } from '@/components/tmwe/EmailList';
import { EmailDetail } from '@/components/tmwe/EmailDetail';
import { ComposeDialog } from '@/components/tmwe/ComposeDialog';
import { EmailSenderFilter } from '@/components/tmwe/EmailSenderFilter';
import { EmailDownloadProgress } from '@/components/tmwe/EmailDownloadProgress';
import { useEmailDownload } from '@/hooks/useEmailDownload';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

const EmailDashboard = () => {
  const isMobile = useIsMobile();
  const [selectedFolder, setSelectedFolder] = useState('INBOX');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [detailPopupOpen, setDetailPopupOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showEmailList, setShowEmailList] = useState(true);
  const [replyTo, setReplyTo] = useState<{ uid: string; to: string; subject: string; originalBody: string; originalFrom: string; originalDate: string; isForward?: boolean } | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSender, setSelectedSender] = useState<string | null>(null);
  const queryClient = useQueryClient();

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

  const { 
    data: messagesData,
    isLoading: messagesLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['messages', selectedFolder, searchQuery],
    queryFn: ({ pageParam = 1 }) => 
      searchQuery 
        ? emailMessageApi.searchMessages({ query: searchQuery, folder: selectedFolder })
        : emailMessageApi.getMessages({ folder: selectedFolder, limit: 30, page: pageParam }),
    getNextPageParam: (lastPage, allPages) => {
      const messages = lastPage?.messages || [];
      if (messages.length === 0 || messages.length < 30) return undefined;
      return allPages.length + 1;
    },
    initialPageParam: 1,
  });

  // Get total email count from the first page response
  const totalEmailCount = messagesData?.pages?.[0]?.total || 0;

  // Email download hook
  const {
    isDownloading,
    downloadedCount,
    downloadError,
    allEmails: downloadedEmails,
    startDownload,
  } = useEmailDownload({
    folder: selectedFolder,
    totalEmails: totalEmailCount,
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

  const syncMutation = useMutation({
    mutationFn: emailSyncApi.incrementalSync,
    onSuccess: () => {
      toast.success('Sync completed successfully');
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
    onError: () => {
      toast.error('Sync failed');
    },
  });

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

  const allEmails = (messagesData?.pages || []).flatMap(page => 
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
  })) : allEmails;

  // Filter emails by selected sender
  const emails = selectedSender 
    ? emailsToUse.filter(email => email.from === selectedSender)
    : emailsToUse;

  const handleSync = () => {
    toast.info('Starting sync...');
    syncMutation.mutate();
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
    <div className="flex h-screen flex-col bg-gradient-to-br from-purple-900/20 via-background to-blue-900/20">
      <EmailHeader
        onSearch={setSearchQuery} 
        onCompose={() => setComposeOpen(true)} 
        onSync={handleSync}
        onMenuClick={() => setSidebarOpen(true)}
        isMobile={isMobile}
        downloadProgressComponent={
          <EmailDownloadProgress
            totalEmails={totalEmailCount}
            onDownloadComplete={() => {}}
            onStartDownload={startDownload}
            isDownloading={isDownloading}
            downloadedCount={downloadedCount}
            downloadError={downloadError}
          />
        }
      />
      
      <div className="flex flex-1 overflow-hidden">
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
              />
            </SheetContent>
          </Sheet>
        )}

        {/* Email List - Hidden on mobile when email is selected */}
        <div className={cn(
          "flex-1 overflow-hidden flex flex-col",
          isMobile && !showEmailList && "hidden"
        )}>
          {/* Sender Filter */}
          <div className="border-b bg-card-transparent px-4 py-2 flex items-center gap-2">
            <EmailSenderFilter
              emails={emailsToUse}
              selectedSender={selectedSender}
              onSenderSelect={setSelectedSender}
            />
            {selectedSender && (
              <div className="flex-1 text-sm text-muted-foreground">
                Mostrando {emails.length} email da <strong>{selectedSender}</strong>
              </div>
            )}
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
          />
        </div>

        {/* Email Detail - Full screen on mobile when email is selected */}
        {isMobile && !showEmailList && selectedEmail && (
          <div className="flex-1 flex flex-col overflow-hidden">
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
    </div>
  );
};

export default EmailDashboard;
