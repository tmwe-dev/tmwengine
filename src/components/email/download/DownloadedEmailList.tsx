import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeedEmail {
  id: string;
  subject: string | null;
  from_email: string;
  cartella: string | null;
  created_at: string;
}

interface DownloadedEmailListProps {
  emails: FeedEmail[];
  isLoading: boolean;
}

export function DownloadedEmailList({ emails, isLoading }: DownloadedEmailListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: emails.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 10,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Ultime email scaricate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Ultime {emails.length} email scaricate
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div ref={parentRef} className="h-[400px] overflow-auto">
          <div
            style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative', width: '100%' }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const email = emails[virtualRow.index];
              return (
                <div
                  key={virtualRow.key}
                  className={cn(
                    "absolute top-0 left-0 w-full px-4 py-2 border-b border-border/30 hover:bg-muted/50 transition-colors",
                  )}
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {email.subject || '(Senza oggetto)'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {email.from_email || 'Sconosciuto'} • {email.cartella}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(email.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
