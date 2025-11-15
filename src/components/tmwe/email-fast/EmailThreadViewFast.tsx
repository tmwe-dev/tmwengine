import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/design-system/data-display/LoadingState';
import { Paperclip, ChevronDown, ChevronUp } from 'lucide-react';
import { useEmailThreadFast } from '@/hooks/email/useEmailFast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface EmailThreadViewFastProps {
  messageId?: string;
  folder?: string;
  className?: string;
}

export const EmailThreadViewFast: React.FC<EmailThreadViewFastProps> = ({
  messageId,
  folder,
  className
}) => {
  const [expandedMessages, setExpandedMessages] = React.useState<Set<string>>(new Set());

  const { data, isLoading, error } = useEmailThreadFast({
    messageId,
    folder,
    enabled: !!messageId || !!folder
  });

  const toggleMessage = (id: string) => {
    setExpandedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return <LoadingState message="Cargando conversación..." />;
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center text-destructive">
          Error al cargar la conversación
        </CardContent>
      </Card>
    );
  }

  const threads = data?.data?.threads || data?.threads || [];

  if (threads.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center text-muted-foreground">
          No hay mensajes en esta conversación
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="text-sm text-muted-foreground mb-4">
        {threads.length} mensaje{threads.length !== 1 ? 's' : ''} en esta conversación
      </div>

      {threads.map((thread: any) => {
        const messages = thread.messages || [thread];
        
        return (
          <div key={thread.thread_id || thread.id} className="space-y-2">
            {messages.map((message: any, index: number) => {
              const isExpanded = expandedMessages.has(message.uid || message.id);
              const fromEmail = typeof message.from === 'string'
                ? message.from
                : message.from?.email || message.from_email || 'Desconocido';
              const fromName = typeof message.from === 'object'
                ? message.from?.name || fromEmail
                : fromEmail;

              return (
                <Card
                  key={message.uid || message.id}
                  className={cn(
                    'transition-all',
                    index > 0 && 'ml-8'
                  )}
                >
                  <CardHeader
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => toggleMessage(message.uid || message.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {fromName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold truncate">
                              {fromName}
                            </span>
                            {message.has_attachments && (
                              <Paperclip className="h-4 w-4 text-muted-foreground" />
                            )}
                            {!message.read && (
                              <Badge variant="default" className="text-xs">
                                Nuevo
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {message.subject || '(Sin asunto)'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(message.date), 'dd/MM/yyyy HH:mm')}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="border-t">
                      <div className="pt-4">
                        {message.body_preview && (
                          <div className="text-sm whitespace-pre-wrap">
                            {message.body_preview}
                          </div>
                        )}

                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-4 pt-4 border-t">
                            <div className="text-sm font-medium mb-2">
                              Adjuntos ({message.attachments.length})
                            </div>
                            <div className="space-y-1">
                              {message.attachments.map((attachment: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2 text-sm text-muted-foreground"
                                >
                                  <Paperclip className="h-4 w-4" />
                                  <span>{attachment.filename || attachment.name}</span>
                                  {attachment.size && (
                                    <span className="text-xs">
                                      ({Math.round(attachment.size / 1024)} KB)
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
