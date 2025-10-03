import { useState, useEffect, useRef } from 'react';
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailMessageApi, emailSyncApi } from '@/lib/tmwe-api-integrated';
import { EmailHeader } from '@/components/tmwe/EmailHeader';
import { EmailSidebar } from '@/components/tmwe/EmailSidebar';
import { EmailList } from '@/components/tmwe/EmailList';
import { EmailDetail } from '@/components/tmwe/EmailDetail';
import { ComposeDialog } from '@/components/tmwe/ComposeDialog';
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
  const queryClient = useQueryClient();
  
  // Drag state for swipe navigation
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragCurrentX, setDragCurrentX] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Swipe/drag handlers for laptop
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMobile) return;
    // Only start drag if clicking in empty areas (not on buttons, links, etc.)
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, textarea, select')) return;
    
    setDragStartX(e.clientX);
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || dragStartX === null || isMobile) return;
    
    e.preventDefault();
    setDragCurrentX(e.clientX);
  };

  const handleMouseUp = () => {
    if (!isDragging || dragStartX === null || isMobile) {
      setIsDragging(false);
      setDragStartX(null);
      setDragCurrentX(null);
      return;
    }

    const dragDistance = dragCurrentX !== null ? dragCurrentX - dragStartX : 0;
    const threshold = 80; // Reduced threshold for easier navigation

    // Swipe right: go back (close detail view)
    if (dragDistance > threshold && selectedEmailId) {
      setSelectedEmailId(null);
    }
    
    // Swipe left: go forward (open first email if none selected)
    if (dragDistance < -threshold && !selectedEmailId && emails.length > 0) {
      handleEmailSelect(emails[0].id);
    }

    setIsDragging(false);
    setDragStartX(null);
    setDragCurrentX(null);
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      setDragStartX(null);
      setDragCurrentX(null);
    }
  };

  // Calculate drag offset for visual feedback
  const dragOffset = isDragging && dragStartX !== null && dragCurrentX !== null
    ? Math.max(-150, Math.min(150, dragCurrentX - dragStartX))
    : 0;

  return (
    <div className="flex h-screen flex-col">
      <EmailHeader 
        onSearch={setSearchQuery} 
        onCompose={() => setComposeOpen(true)} 
        onSync={handleSync}
        onMenuClick={() => setSidebarOpen(true)}
        isMobile={isMobile}
      />
      
      <div 
        ref={containerRef}
        className="flex flex-1 overflow-hidden relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      >
        {/* Drag indicator */}
        {isDragging && Math.abs(dragOffset) > 30 && (
          <div 
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-primary/90 text-primary-foreground backdrop-blur-sm rounded-full px-6 py-3 text-sm font-medium pointer-events-none shadow-lg"
          >
            {dragOffset > 0 ? '← Chiudi email' : 'Apri email →'}
          </div>
        )}
        
        <div 
          className="flex flex-1 transition-transform pointer-events-none"
          style={{
            transform: `translateX(${dragOffset * 0.3}px)`,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out',
          }}
        >
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
          "flex-1 overflow-hidden pointer-events-auto",
          isMobile && !showEmailList && "hidden"
        )}>
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
          />
        </div>

          {/* Email Detail - Full screen on mobile when email is selected */}
          {isMobile && !showEmailList && selectedEmail && (
            <div className="flex-1 flex flex-col overflow-hidden pointer-events-auto">
              <EmailDetail
                email={selectedEmail}
                onReply={handleReply}
                onReplyAll={handleReplyAll}
                onForward={handleForward}
                onBack={handleBackToList}
                isMobile={true}
              />
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

      <Dialog open={detailPopupOpen} onOpenChange={setDetailPopupOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Email Detail</DialogTitle>
          </DialogHeader>
          {selectedEmail ? (
            <EmailDetail
              email={selectedEmail}
              onReply={handleReply}
              onReplyAll={handleReplyAll}
              onForward={handleForward}
              onDelete={handleDelete}
            />
          ) : (
            <div className="flex items-center justify-center p-8">
              <p className="text-muted-foreground">No email selected</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailDashboard;
