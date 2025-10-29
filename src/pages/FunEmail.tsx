import { useState } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { PageLayout } from '@/components/design-system';
import { DynamicDropdown } from '@/components/design-system/menus/DynamicDropdown';
import { EmailList } from '@/components/tmwe/EmailList';
import { EmailDetail } from '@/components/tmwe/EmailDetail';
import { Button } from '@/components/ui/button';
import { Folder, X } from 'lucide-react';
import { emailSearchApi } from '@/lib/tmwe-email-search-api';

const FunEmail = () => {
  const [selectedFolder, setSelectedFolder] = useState('INBOX');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

  // Query cartelle per dropdown
  const { data: foldersData } = useQuery({
    queryKey: ['folders'],
    queryFn: () => emailSearchApi.getFolders(),
    staleTime: 5 * 60 * 1000,
  });

  const folders = foldersData?.folders || [];

  // Trasforma cartelle in items per dropdown
  const folderDropdownItems = folders.map(folder => ({
    label: `${folder.folder_name} (${folder.total_messages || folder.messages || 0})`,
    icon: Folder,
    onClick: () => setSelectedFolder(folder.folder_name),
  }));

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
      <div className="space-y-4">
        {/* Dropdown Cartelle */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Cartella:</span>
          <DynamicDropdown
            trigger={
              <Button variant="outline" className="min-w-[200px] justify-between">
                <Folder className="mr-2 h-4 w-4" />
                {selectedFolder}
              </Button>
            }
            items={folderDropdownItems}
            align="start"
          />
        </div>

        {/* Lista Email */}
        <EmailList
          emails={emails}
          selectedEmailId={selectedEmailId}
          onEmailSelect={setSelectedEmailId}
          loading={messagesLoading}
          onLoadMore={() => hasNextPage && fetchNextPage()}
          hasMore={hasNextPage}
          isLoadingMore={isFetchingNextPage}
        />

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
      </div>
    </PageLayout>
  );
};

export default FunEmail;
