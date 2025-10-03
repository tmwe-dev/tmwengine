import { useEffect, useRef, useCallback, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mail, Star, Paperclip, Loader2, List, LayoutGrid, Square, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Email {
  id: string;
  subject: string;
  from: string;
  preview: string;
  date: string;
  read: boolean;
  starred: boolean;
  hasAttachments: boolean;
}

interface EmailListProps {
  emails: Email[];
  selectedEmailId: string | null;
  onEmailSelect: (emailId: string) => void;
  loading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  emailDetail?: {
    id: string;
    subject: string;
    from: string;
    body: string;
  } | null;
  isLoadingDetail?: boolean;
  onOpenDetailPopup?: () => void;
}

type ViewMode = 'list' | 'grid' | 'single';

export const EmailList = ({ 
  emails, 
  selectedEmailId, 
  onEmailSelect,
  loading,
  onLoadMore,
  hasMore,
  isLoadingMore,
  emailDetail,
  isLoadingDetail,
  onOpenDetailPopup
}: EmailListProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastEmailRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [currentPage, setCurrentPage] = useState(0);

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [target] = entries;
    if (target.isIntersecting && hasMore && !isLoadingMore && onLoadMore) {
      onLoadMore();
    }
  }, [hasMore, isLoadingMore, onLoadMore]);

  useEffect(() => {
    const element = lastEmailRef.current;
    if (!element) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(handleObserver, {
      threshold: 0.1,
      rootMargin: '100px',
    });

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleObserver, emails.length]);
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!emails || emails.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
        <Mail className="mb-4 h-16 w-16 opacity-20" />
        <p className="text-lg font-medium">No emails found</p>
        <p className="text-sm">Try syncing your mailbox</p>
      </div>
    );
  }


  const renderListView = () => (
    <div className="space-y-2 py-2 px-[28px]">
      {emails.map((email, index) => (
        <Card
          key={email.id}
          ref={index === emails.length - 1 ? lastEmailRef : null}
          className={cn(
            'cursor-pointer border-l-4 p-3 transition-all duration-200',
            email.read 
              ? 'border-l-transparent bg-gradient-to-bl from-purple-400/15 via-purple-400/8 via-35% to-transparent hover:from-purple-300/20 hover:via-purple-300/12 hover:shadow-[-6px_6px_16px_0px_rgba(216,180,254,0.4)] hover:scale-[1.01]'
              : 'border-l-orange-500/50 bg-gradient-to-bl from-orange-400/15 via-orange-400/8 via-35% to-transparent hover:from-orange-300/20 hover:via-orange-300/12 hover:shadow-[-6px_6px_16px_0px_rgba(253,186,116,0.45)] hover:scale-[1.01]',
            selectedEmailId === email.id && (
              email.read 
                ? 'bg-gradient-to-bl from-purple-400/25 via-purple-400/15 via-35% to-transparent border-purple-500/30 shadow-[-6px_6px_16px_0px_rgba(216,180,254,0.5)] scale-[1.01] !border-red-500'
                : 'bg-gradient-to-bl from-orange-400/25 via-orange-400/15 via-35% to-transparent border-orange-500/50 shadow-[-6px_6px_16px_0px_rgba(253,186,116,0.55)] scale-[1.01] !border-red-500'
            )
          )}
          onClick={() => onEmailSelect(email.id)}
        >
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 min-w-[200px]">
                  {selectedEmailId === email.id && emailDetail && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDetailPopup?.();
                      }}
                      className="flex-shrink-0 p-0 h-4 w-4 hover:bg-transparent"
                    >
                      <Maximize2 className="h-3 w-3" />
                    </Button>
                  )}
                  <p className={cn(
                    'truncate text-sm',
                    !email.read && 'font-semibold text-email-unread'
                  )}>
                    {email.from}
                  </p>
                </div>
                <div className="flex-1">
                  <h3 className={cn(
                    'truncate text-sm',
                    !email.read && 'font-semibold'
                  )}>
                    {email.subject || '(No Subject)'}
                  </h3>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(email.date), { addSuffix: true })}
                  </span>
                  {!email.read && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs">New</Badge>
                  )}
                  {email.starred && (
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  )}
                  {email.hasAttachments && (
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
              {selectedEmailId === email.id && emailDetail && (
                <div className="w-full mt-3 pt-3 border-t">
                  <div 
                    className="text-sm text-muted-foreground prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ 
                      __html: emailDetail.body.substring(0, 200) + (emailDetail.body.length > 200 ? '...' : '')
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  const renderGridView = () => (
    <div className="space-y-3 py-2 px-[28px]">
      {emails.map((email, index) => (
        <Card
          key={email.id}
          ref={index === emails.length - 1 ? lastEmailRef : null}
          className={cn(
            'cursor-pointer border-l-4 p-4 transition-all duration-200',
            email.read 
              ? 'border-l-transparent bg-gradient-to-bl from-purple-400/15 via-purple-400/8 via-35% to-transparent hover:from-purple-300/20 hover:via-purple-300/12 hover:shadow-[-6px_6px_16px_0px_rgba(216,180,254,0.4)] hover:scale-[1.02]'
              : 'border-l-orange-500/50 bg-gradient-to-bl from-orange-400/15 via-orange-400/8 via-35% to-transparent hover:from-orange-300/20 hover:via-orange-300/12 hover:shadow-[-6px_6px_16px_0px_rgba(253,186,116,0.45)] hover:scale-[1.02]',
            selectedEmailId === email.id && (
              email.read 
                ? 'bg-gradient-to-bl from-purple-400/25 via-purple-400/15 via-35% to-transparent border-purple-500/30 shadow-[-6px_6px_16px_0px_rgba(216,180,254,0.5)] scale-[1.02] !border-red-500'
                : 'bg-gradient-to-bl from-orange-400/25 via-orange-400/15 via-35% to-transparent border-orange-500/50 shadow-[-6px_6px_16px_0px_rgba(253,186,116,0.55)] scale-[1.02] !border-red-500'
            )
          )}
          onClick={() => onEmailSelect(email.id)}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1 overflow-hidden">
              <div className="flex items-center gap-2">
                {selectedEmailId === email.id && emailDetail && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenDetailPopup?.();
                    }}
                    className="flex-shrink-0 p-0 h-4 w-4 hover:bg-transparent"
                  >
                    <Maximize2 className="h-3 w-3" />
                  </Button>
                )}
                <p className={cn(
                  'truncate text-sm',
                  !email.read && 'font-semibold text-email-unread'
                )}>
                  {email.from}
                </p>
                {!email.read && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    New
                  </Badge>
                )}
              </div>
              <h3 className={cn(
                'truncate text-base',
                !email.read && 'font-semibold'
              )}>
                {email.subject || '(No Subject)'}
              </h3>
              {selectedEmailId === email.id && emailDetail ? (
                <div className="mt-3 pt-3 border-t">
                  <div 
                    className="text-sm text-muted-foreground prose prose-sm max-w-none line-clamp-3"
                    dangerouslySetInnerHTML={{ 
                      __html: emailDetail.body.substring(0, 300) + (emailDetail.body.length > 300 ? '...' : '')
                    }}
                  />
                </div>
              ) : (
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {email.preview}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="whitespace-nowrap text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(email.date), { addSuffix: true })}
              </span>
              <div className="flex gap-1">
                {email.starred && (
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                )}
                {email.hasAttachments && (
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  const renderSingleView = () => {
    const currentEmail = emails[currentPage];
    if (!currentEmail) return null;

    return (
      <div className="py-2 px-[28px]">
        <Card
          className={cn(
            'cursor-pointer border-l-4 p-4 transition-all duration-200 w-[250px] h-[250px] flex flex-col',
            currentEmail.read 
              ? 'border-l-transparent bg-gradient-to-bl from-purple-400/15 via-purple-400/8 via-35% to-transparent hover:from-purple-300/20 hover:via-purple-300/12 hover:shadow-[-6px_6px_16px_0px_rgba(216,180,254,0.4)] hover:scale-[1.02]'
              : 'border-l-orange-500/50 bg-gradient-to-bl from-orange-400/15 via-orange-400/8 via-35% to-transparent hover:from-orange-300/20 hover:via-orange-300/12 hover:shadow-[-6px_6px_16px_0px_rgba(253,186,116,0.45)] hover:scale-[1.02]',
            selectedEmailId === currentEmail.id && (
              currentEmail.read 
                ? 'bg-gradient-to-bl from-purple-400/25 via-purple-400/15 via-35% to-transparent border-purple-500/30 shadow-[-6px_6px_16px_0px_rgba(216,180,254,0.5)] scale-[1.02] !border-red-500'
                : 'bg-gradient-to-bl from-orange-400/25 via-orange-400/15 via-35% to-transparent border-orange-500/50 shadow-[-6px_6px_16px_0px_rgba(253,186,116,0.55)] scale-[1.02] !border-red-500'
            )
          )}
          onClick={() => onEmailSelect(currentEmail.id)}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1 overflow-hidden">
              <div className="flex items-center gap-2">
                {selectedEmailId === currentEmail.id && emailDetail && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenDetailPopup?.();
                    }}
                    className="flex-shrink-0 p-0 h-4 w-4 hover:bg-transparent"
                  >
                    <Maximize2 className="h-3 w-3" />
                  </Button>
                )}
                <p className={cn(
                  'truncate text-sm',
                  !currentEmail.read && 'font-semibold text-email-unread'
                )}>
                  {currentEmail.from}
                </p>
                {!currentEmail.read && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    New
                  </Badge>
                )}
              </div>
              <h3 className={cn(
                'truncate text-base',
                !currentEmail.read && 'font-semibold'
              )}>
                {currentEmail.subject || '(No Subject)'}
              </h3>
              {selectedEmailId === currentEmail.id && emailDetail ? (
                <div className="mt-3 pt-3 border-t">
                  <div 
                    className="text-sm text-muted-foreground prose prose-sm max-w-none line-clamp-2"
                    dangerouslySetInnerHTML={{ 
                      __html: emailDetail.body.substring(0, 150) + (emailDetail.body.length > 150 ? '...' : '')
                    }}
                  />
                </div>
              ) : (
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {currentEmail.preview}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="whitespace-nowrap text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(currentEmail.date), { addSuffix: true })}
              </span>
              <div className="flex gap-1">
                {currentEmail.starred && (
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                )}
                {currentEmail.hasAttachments && (
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </div>
        </Card>
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
            disabled={currentPage === 0}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            {currentPage + 1} / {emails.length}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(emails.length - 1, prev + 1))}
            disabled={currentPage === emails.length - 1}
          >
            Next
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="flex items-center justify-end gap-2 p-2 px-[28px] border-b">
        <Button
          variant={viewMode === 'list' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('list')}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === 'grid' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('grid')}
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === 'single' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => {
            setViewMode('single');
            setCurrentPage(0);
          }}
        >
          <Square className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="h-full" ref={scrollRef}>
        {viewMode === 'list' && renderListView()}
        {viewMode === 'grid' && renderGridView()}
        {viewMode === 'single' && renderSingleView()}
        
        {isLoadingMore && viewMode !== 'single' && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </ScrollArea>
    </>
  );
};
