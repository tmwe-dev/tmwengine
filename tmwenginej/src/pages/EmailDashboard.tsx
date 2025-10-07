import { useState, useEffect } from 'react';
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailMessageApi, emailSyncApi } from '@/lib/api';
import { EmailHeader } from '@/components/EmailHeader';
import { EmailSidebar } from '@/components/EmailSidebar';
import { EmailList } from '@/components/EmailList';
import { EmailDetail } from '@/components/EmailDetail';
import { ComposeDialog } from '@/components/ComposeDialog';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { toast } from 'sonner';

const EmailDashboard = () => {
  const [selectedFolder, setSelectedFolder] = useState('INBOX');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Sidebar chiusa di default
  const [replyTo, setReplyTo] = useState<{ uid: string; to: string; subject: string; originalBody: string; originalFrom: string; originalDate: string; isForward?: boolean } | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  // Reset selected email when folder changes
  useEffect(() => {
    setSelectedEmailId(null);
  }, [selectedFolder]);

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

  const { data: emailDetailResponse, isLoading: isLoadingDetail, error: detailError } = useQuery({
    queryKey: ['message', selectedEmailId],
    queryFn: async () => {
      console.log('🔍 Fetching email with UID:', selectedEmailId);
      const result = await emailMessageApi.getMessage(selectedEmailId!);
      console.log('✅ Email detail received:', result);
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

  const emails = (messagesData?.pages || []).flatMap(page => 
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

  const handleSync = () => {
    toast.info('Starting sync...');
    syncMutation.mutate();
  };

  const handleDelete = () => {
    if (selectedEmailId) {
      deleteMutation.mutate([selectedEmailId]);
    }
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
    <div className="flex h-screen flex-col">
      <EmailHeader onSearch={setSearchQuery} />
      
      <div className="flex flex-1 overflow-hidden relative">
        {/* Menu button - visible on all screens */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 left-2 z-10"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Sidebar Sheet - used for all screen sizes, closed by default */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="p-0 w-[85vw] sm:w-[75vw] md:w-[320px] max-w-sm">
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

        <div className="flex-1 border-r">
          <div className="h-12" /> {/* Spacer per il pulsante menu */}
          <EmailList
            emails={emails}
            selectedEmailId={selectedEmailId}
            onEmailSelect={setSelectedEmailId}
            loading={messagesLoading}
            onLoadMore={fetchNextPage}
            hasMore={hasNextPage}
            isLoadingMore={isFetchingNextPage}
          />
        </div>

        <div className="flex-1">
          {isLoadingDetail ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                <div className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 animate-spin rounded-full border-2 sm:border-3 md:border-4 border-primary border-t-transparent" />
                <p className="text-xs sm:text-sm text-muted-foreground">Loading email...</p>
              </div>
            </div>
          ) : detailError ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center space-y-3 sm:space-y-4 p-4 sm:p-6 md:p-8">
                <p className="text-destructive font-medium text-base sm:text-lg">Failed to load email</p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {detailError instanceof Error ? detailError.message : 'The email content could not be retrieved'}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  This might be due to an empty response from the server
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSelectedEmailId(null);
                    setTimeout(() => setSelectedEmailId(selectedEmailId), 100);
                  }}
                >
                  Try Again
                </Button>
              </div>
            </div>
          ) : selectedEmail ? (
            <EmailDetail
              email={selectedEmail}
              onReply={handleReply}
              onReplyAll={handleReplyAll}
              onForward={handleForward}
              onDelete={handleDelete}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <p className="text-sm sm:text-base">Select an email to view</p>
            </div>
          )}
        </div>
      </div>

      <ComposeDialog
        open={composeOpen}
        onClose={handleComposeClose}
        onSent={() => queryClient.invalidateQueries({ queryKey: ['messages'] })}
        replyTo={replyTo}
      />
    </div>
  );
};

export default EmailDashboard;
