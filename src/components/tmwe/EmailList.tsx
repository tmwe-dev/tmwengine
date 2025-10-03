import { useEffect, useRef, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mail, Star, Paperclip, Loader2 } from 'lucide-react';
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
}

export const EmailList = ({ 
  emails, 
  selectedEmailId, 
  onEmailSelect,
  loading,
  onLoadMore,
  hasMore,
  isLoadingMore
}: EmailListProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastEmailRef = useRef<HTMLDivElement>(null);

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

  return (
    <ScrollArea className="h-full" ref={scrollRef}>
      <div className="space-y-1 p-2">
        {emails.map((email, index) => (
          <Card
            key={email.id}
            ref={index === emails.length - 1 ? lastEmailRef : null}
            className={cn(
              'cursor-pointer border-l-4 p-4 transition-all duration-200',
              email.read 
                ? 'border-l-transparent bg-gradient-to-l from-purple-500/10 via-purple-500/5 via-35% to-transparent hover:from-purple-500/15 hover:via-purple-500/8 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)] hover:scale-[1.02]'
                : 'border-l-orange-500/50 bg-gradient-to-l from-orange-500/10 via-orange-500/5 via-35% to-transparent hover:from-orange-500/15 hover:via-orange-500/8 hover:shadow-[0_0_20px_rgba(249,115,22,0.25)] hover:scale-[1.02]',
              selectedEmailId === email.id && (
                email.read 
                  ? 'bg-gradient-to-l from-purple-500/20 via-purple-500/10 via-35% to-transparent border-purple-500/30 shadow-md scale-[1.02]'
                  : 'bg-gradient-to-l from-orange-500/20 via-orange-500/10 via-35% to-transparent border-orange-500/50 shadow-md scale-[1.02]'
              )
            )}
            onClick={() => onEmailSelect(email.id)}
          >
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
                  'truncate text-base',
                  !email.read && 'font-semibold'
                )}>
                  {email.subject || '(No Subject)'}
                </h3>
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {email.preview}
                </p>
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
        
        {isLoadingMore && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </div>
    </ScrollArea>
  );
};
