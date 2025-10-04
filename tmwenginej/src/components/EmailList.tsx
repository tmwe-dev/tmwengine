import { useEffect, useRef, useCallback, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { 
  Mail, 
  Star, 
  Paperclip, 
  Loader2, 
  Archive,
  Trash2,
  Tag,
  FolderInput,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

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
  const [showActionsSheet, setShowActionsSheet] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

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
              'cursor-pointer border-l-4 p-4 transition-all hover:bg-email-hover group',
              email.read ? 'border-l-transparent' : 'border-l-email-unread',
              selectedEmailId === email.id && 'bg-email-selected shadow-md'
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
                <div className="flex items-center gap-2">
                  <span className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(email.date), { addSuffix: true })}
                  </span>
                  {selectedEmailId === email.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEmail(email);
                          setShowActionsSheet(true);
                        }}>
                          <Tag className="mr-2 h-4 w-4" />
                          Gestisci Regole
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                          <Archive className="mr-2 h-4 w-4" />
                          Archivia
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                          <FolderInput className="mr-2 h-4 w-4" />
                          Sposta in...
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={(e) => e.stopPropagation()}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Elimina
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
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

      <Sheet open={showActionsSheet} onOpenChange={setShowActionsSheet}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Azioni e Regole</SheetTitle>
            <SheetDescription>
              Gestisci azioni e regole per: {selectedEmail?.from}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Regole Mittente</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crea regole automatiche per le email da questo mittente
              </p>
              <Button variant="outline" className="w-full">
                <Tag className="mr-2 h-4 w-4" />
                Crea Nuova Regola
              </Button>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Azioni Rapide</h3>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Archive className="mr-2 h-4 w-4" />
                  Archivia
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <FolderInput className="mr-2 h-4 w-4" />
                  Sposta in Cartella
                </Button>
                <Button variant="outline" className="w-full justify-start text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Elimina
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </ScrollArea>
  );
};
