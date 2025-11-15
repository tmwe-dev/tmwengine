import React, { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/design-system/data-display/LoadingState';
import { Paperclip, Star } from 'lucide-react';
import { useEmailListFast } from '@/hooks/email/useEmailFast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface EmailListFastProps {
  selectedFolder: string;
  selectedEmailId: string | null;
  onEmailSelect: (emailId: string) => void;
  filters?: {
    is_seen?: boolean;
    is_flagged?: boolean;
    has_attachments?: boolean;
    date_from?: string;
    date_to?: string;
  };
}

export const EmailListFast: React.FC<EmailListFastProps> = ({
  selectedFolder,
  selectedEmailId,
  onEmailSelect,
  filters
}) => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error
  } = useEmailListFast({
    folder: selectedFolder,
    limit: 50,
    filters
  });

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Infinite scroll setup
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return <LoadingState message="Cargando emails..." />;
  }

  if (error) {
    return (
      <div className="p-4 text-center text-destructive">
        Error al cargar emails. Intenta de nuevo.
      </div>
    );
  }

  const emails = data?.pages?.flatMap(page => page.emails) || [];
  const totalCount = data?.pages?.[0]?.total || 0;

  if (emails.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No hay emails en esta carpeta
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      <div className="mb-4 text-sm text-muted-foreground">
        {emails.length} de {totalCount} emails
      </div>

      {emails.map((email: any) => {
        const isSelected = selectedEmailId === String(email.uid);
        const fromEmail = typeof email.from === 'string' 
          ? email.from 
          : email.from?.email || email.from_email || 'Desconocido';

        return (
          <Card
            key={email.uid}
            className={cn(
              'p-4 cursor-pointer transition-colors hover:bg-accent/50',
              isSelected && 'bg-accent border-primary',
              !email.read && 'bg-accent/20'
            )}
            onClick={() => onEmailSelect(String(email.uid))}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    'font-medium truncate',
                    !email.read && 'font-bold'
                  )}>
                    {fromEmail}
                  </span>
                  {email.has_attachments && (
                    <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                  {email.flagged && (
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                  )}
                </div>

                <h3 className={cn(
                  'text-sm truncate mb-1',
                  !email.read && 'font-semibold'
                )}>
                  {email.subject || '(Sin asunto)'}
                </h3>

                {email.body_preview && (
                  <p className="text-sm text-muted-foreground truncate">
                    {email.body_preview}
                  </p>
                )}
              </div>

              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(email.date), 'dd/MM/yyyy')}
                </span>
                {!email.read && (
                  <Badge variant="default" className="text-xs">
                    Nuevo
                  </Badge>
                )}
              </div>
            </div>
          </Card>
        );
      })}

      {/* Infinite scroll trigger */}
      <div ref={loadMoreRef} className="h-4" />

      {isFetchingNextPage && (
        <LoadingState message="Cargando más emails..." size="sm" />
      )}
    </div>
  );
};
