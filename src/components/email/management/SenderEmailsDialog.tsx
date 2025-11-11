/**
 * Dialog per visualizzare le email di un mittente specifico
 */

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Paperclip, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface SenderEmailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  senderEmail: string;
  emailCount?: number;
}

export function SenderEmailsDialog({
  open,
  onOpenChange,
  senderEmail,
  emailCount,
}: SenderEmailsDialogProps) {
  const { data: emails, isLoading } = useQuery({
    queryKey: ['sender-emails', senderEmail],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non autenticato');

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tmwe_email')
        .eq('user_id', user.id)
        .single();

      if (!profile?.tmwe_email) throw new Error('Email TMWE non configurata');

      const { data, error } = await supabase
        .from('email_messages')
        .select('id, subject, data_ricezione, body_text, attachments')
        .eq('from_email', senderEmail)
        .eq('user_email', profile.tmwe_email)
        .order('data_ricezione', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email da {senderEmail}
          </DialogTitle>
          <DialogDescription>
            {emailCount !== undefined ? `${emailCount} email trovate` : 'Visualizza le email ricevute da questo mittente'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : emails && emails.length > 0 ? (
            <div className="space-y-3">
              {emails.map((email) => {
                const attachments = Array.isArray(email.attachments) ? email.attachments : [];
                const hasAttachments = attachments.length > 0;
                const attachmentCount = hasAttachments ? attachments.length : 0;

                return (
                  <Card key={email.id} className="p-4 hover:border-primary/30 transition-colors">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="font-medium text-sm flex-1">{email.subject || '(Senza oggetto)'}</h4>
                        {hasAttachments && (
                          <Badge variant="secondary" className="text-xs">
                            <Paperclip className="w-3 h-3 mr-1" />
                            {attachmentCount}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(email.data_ricezione), "d MMM yyyy 'alle' HH:mm", { locale: it })}
                      </div>

                      {email.body_text && (
                        <p className="text-xs text-muted-foreground line-clamp-3 mt-2">
                          {email.body_text.substring(0, 300)}
                          {email.body_text.length > 300 && '...'}
                        </p>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Nessuna email trovata per questo mittente</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
