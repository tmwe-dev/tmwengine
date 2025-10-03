import { useEffect, useRef, useCallback, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mail, Star, Paperclip, Loader2, List, LayoutGrid, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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

type ViewMode = 'list' | 'grid';

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
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const filteredEmails = showUnreadOnly ? emails.filter(email => !email.read) : emails;

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
      {filteredEmails.map((email, index) => (
        <Card
          key={email.id}
          ref={index === filteredEmails.length - 1 ? lastEmailRef : null}
          className={cn(
            'cursor-pointer border-l-4 p-0 overflow-hidden transition-colors transition-shadow transition-transform duration-200',
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
          <div className="flex items-stretch">
            <div className="flex-1 min-w-0 p-3">
              <div className="flex items-center gap-4">
                <div className="min-w-[200px]">
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
            </div>
            <div className="w-[30px] bg-black flex items-center justify-center flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEmailSelect(email.id);
                  onOpenDetailPopup?.();
                }}
                className="p-0 h-full w-full hover:bg-white/10"
              >
                <Maximize2 className="h-4 w-4 text-white" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  const renderGridView = () => (
    <div className="space-y-3 py-2 px-[28px]">
      {filteredEmails.map((email, index) => (
        <Card
          key={email.id}
          ref={index === filteredEmails.length - 1 ? lastEmailRef : null}
          className={cn(
            'cursor-pointer border-l-4 p-0 overflow-hidden transition-colors transition-shadow transition-transform duration-200',
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
          <div className="flex items-stretch">
            <div className="flex-1 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1 overflow-hidden">
                  <div className="flex items-center gap-2">
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
                    'truncate text-base mt-1',
                    !email.read && 'font-semibold'
                  )}>
                    {email.subject || '(No Subject)'}
                  </h3>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(email.date), { addSuffix: true })}
                  </span>
                  <div className="flex gap-1 mt-1">
                    {email.starred && (
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    )}
                    {email.hasAttachments && (
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="w-[30px] bg-black flex items-center justify-center flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEmailSelect(email.id);
                  onOpenDetailPopup?.();
                }}
                className="p-0 h-full w-full hover:bg-white/10"
              >
                <Maximize2 className="h-4 w-4 text-white" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );


  return (
    <>
      <div className="flex items-center justify-between gap-2 p-2 px-[28px] border-b">
        <div className="flex items-center gap-2">
          <Switch
            id="unread-only"
            checked={showUnreadOnly}
            onCheckedChange={setShowUnreadOnly}
          />
          <Label htmlFor="unread-only" className="text-sm cursor-pointer">
            Solo non lette
          </Label>
        </div>
        <div className="flex items-center gap-2">
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
        </div>
      </div>
      <ScrollArea className="h-full" ref={scrollRef}>
        {viewMode === 'list' && renderListView()}
        {viewMode === 'grid' && renderGridView()}
        
        {isLoadingMore && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </ScrollArea>
    </>
  );
};
