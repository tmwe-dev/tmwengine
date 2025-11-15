import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/design-system/data-display/LoadingState';
import { Search, X, Calendar, Paperclip } from 'lucide-react';
import { useEmailSearchFast } from '@/hooks/email/useEmailFast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface EmailSearchFastProps {
  onEmailSelect: (emailId: string, folder: string) => void;
  className?: string;
}

export const EmailSearchFast: React.FC<EmailSearchFastProps> = ({
  onEmailSelect,
  className
}) => {
  const [query, setQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<{
    date_from?: string;
    date_to?: string;
    has_attachments?: boolean;
  }>({});

  const { data, isLoading, error } = useEmailSearchFast({
    query: searchTerm,
    filters,
    enabled: searchTerm.length > 0
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length > 0) {
      setSearchTerm(query.trim());
    }
  };

  const clearSearch = () => {
    setQuery('');
    setSearchTerm('');
    setFilters({});
  };

  const emails = data?.data?.results || data?.results || [];
  const totalResults = data?.data?.total || data?.total || 0;

  return (
    <div className={cn('space-y-4', className)}>
      <Card className="p-4">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar en todos los emails..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 pr-10"
              />
              {query && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
            <Button type="submit" disabled={query.trim().length === 0}>
              Buscar
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFilters({ ...filters, has_attachments: !filters.has_attachments })}
              className={cn(filters.has_attachments && 'bg-accent')}
            >
              <Paperclip className="h-4 w-4 mr-2" />
              Con adjuntos
            </Button>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={filters.date_from || ''}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                className="w-40"
                placeholder="Desde"
              />
              <Input
                type="date"
                value={filters.date_to || ''}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                className="w-40"
                placeholder="Hasta"
              />
            </div>
          </div>
        </form>
      </Card>

      {searchTerm && (
        <div>
          {isLoading ? (
            <LoadingState message="Buscando emails..." />
          ) : error ? (
            <Card className="p-8 text-center text-destructive">
              Error en la búsqueda. Intenta de nuevo.
            </Card>
          ) : emails.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              No se encontraron resultados para "{searchTerm}"
            </Card>
          ) : (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground px-2">
                {totalResults} resultados encontrados
              </div>

              {emails.map((email: any) => {
                const fromEmail = typeof email.from === 'string'
                  ? email.from
                  : email.from?.email || email.from_email || 'Desconocido';

                return (
                  <Card
                    key={email.uid || email.id}
                    className="p-4 cursor-pointer transition-colors hover:bg-accent/50"
                    onClick={() => onEmailSelect(
                      String(email.uid || email.id),
                      email.folder_name || email.folder || 'INBOX'
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium truncate">{fromEmail}</span>
                          {email.has_attachments && (
                            <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          )}
                          <Badge variant="outline" className="text-xs">
                            {email.folder_name || email.folder}
                          </Badge>
                        </div>

                        <h3 className="text-sm font-semibold truncate mb-1">
                          {email.subject || '(Sin asunto)'}
                        </h3>

                        {email.body_preview && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {email.body_preview}
                          </p>
                        )}
                      </div>

                      <div className="flex-shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(email.date), 'dd/MM/yyyy HH:mm')}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
