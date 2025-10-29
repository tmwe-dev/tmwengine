import { useState } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { PageLayout } from '@/components/design-system';
import { EmailSidebar } from '@/components/tmwe/EmailSidebar';
import { EmailList } from '@/components/tmwe/EmailList';
import { EmailDetail } from '@/components/tmwe/EmailDetail';
import { Button } from '@/components/ui/button';
import { X, Menu } from 'lucide-react';
import { emailSearchApi } from '@/lib/tmwe-email-search-api';

const FunEmail = () => {
  const [selectedFolder, setSelectedFolder] = useState('INBOX');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Query email per la cartella selezionata
  const {
    data: messagesData,
    isLoading: messagesLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['messages', selectedFolder],
    queryFn: async ({ pageParam = 1 }) => {
      return emailSearchApi.getEmailsMetadata({
        folder: selectedFolder,
        page: pageParam,
        limit: 30,
      });
    },
    getNextPageParam: (lastPage) => {
      const pagination = lastPage?.pagination;
      if (!pagination || pagination.page >= pagination.pages) return undefined;
      return pagination.page + 1;
    },
    initialPageParam: 1,
  });

  // Trasforma dati per EmailList
  const emails = messagesData?.pages?.flatMap(page =>
    page?.emails?.map(email => ({
      id: String(email.id),
      subject: email.subject || '(No Subject)',
      from: email.from?.email || email.from?.name || '',
      preview: email.text_preview || '',
      date: new Date(email.date).toISOString(),
      read: email.is_seen,
      starred: email.is_flagged,
      hasAttachments: email.has_attachments,
    })) || []
  ) || [];

  // Query dettaglio email quando selezionato
  const { data: emailDetailResponse } = useQuery({
    queryKey: ['email-detail', selectedEmailId],
    queryFn: () => emailSearchApi.getEmailDetail({
      email_id: Number(selectedEmailId),
      include_body: true,
    }),
    enabled: !!selectedEmailId,
  });

  return (
    <PageLayout gradient={true}>
      <div className="relative w-full min-h-screen">
        {/* Hamburger Button - sempre visibile */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed top-4 left-4 z-30 bg-background border shadow-md hover:bg-accent"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Email List - occupa tutto lo spazio disponibile */}
        <div className="w-full pl-16">
          <EmailList
            emails={emails}
            selectedEmailId={selectedEmailId}
            onEmailSelect={setSelectedEmailId}
            loading={messagesLoading}
            onLoadMore={() => hasNextPage && fetchNextPage()}
            hasMore={hasNextPage}
            isLoadingMore={isFetchingNextPage}
          />
        </div>

        {/* Sidebar Overlay */}
        {sidebarOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            
            {/* Sidebar */}
            <div className="fixed top-0 left-0 h-full w-80 bg-background border-r z-50 shadow-2xl overflow-y-auto">
              <EmailSidebar
                selectedFolder={selectedFolder}
                onFolderSelect={(folder) => {
                  setSelectedFolder(folder);
                  setSidebarOpen(false);
                }}
                onCompose={() => {}}
                onSync={() => {}}
                onClose={() => setSidebarOpen(false)}
              />
            </div>
          </>
        )}
      </div>

      {/* Dettaglio Email (Overlay) */}
      {selectedEmailId && emailDetailResponse?.email && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
          <div className="fixed inset-4 z-50 bg-background border rounded-lg shadow-lg overflow-auto">
            <div className="sticky top-0 z-10 bg-background border-b p-4 flex justify-end">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedEmailId(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <EmailDetail
              email={{
                id: emailDetailResponse.email.id,
                subject: emailDetailResponse.email.subject || '(No Subject)',
                from: emailDetailResponse.email.from?.email || '',
                to: emailDetailResponse.email.to?.map((t: any) => t.email || t.name) || [],
                cc: emailDetailResponse.email.cc?.map((c: any) => c.email || c.name) || [],
                date: emailDetailResponse.email.date,
                body: emailDetailResponse.email.html_body || emailDetailResponse.email.text_body || '',
                attachments: emailDetailResponse.email.attachments || [],
              }}
              onReply={() => {}}
              onReplyAll={() => {}}
              onForward={() => {}}
              onDelete={() => setSelectedEmailId(null)}
              onBack={() => setSelectedEmailId(null)}
            />
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default FunEmail;
