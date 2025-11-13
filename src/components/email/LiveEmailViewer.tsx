import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Mail, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';

interface Email {
  id: string;
  subject: string;
  from_email: string;
  data_ricezione: string;
  body_text: string;
  cartella: string;
}

interface LiveEmailViewerProps {
  userEmail: string;
  isRunning: boolean;
  importedCount: number;
}

export function LiveEmailViewer({ userEmail, isRunning, importedCount }: LiveEmailViewerProps) {
  const [email, setEmail] = useState<Email | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLatestEmail = async () => {
      setIsLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('email_messages')
          .select('id, subject, from_email, data_ricezione, body_text, cartella')
          .order('data_ricezione', { ascending: false })
          .limit(1)
          .single();

        if (!error && data) {
          setEmail(data);
        }
      } catch (err) {
        console.error('Error fetching latest email:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLatestEmail();
  }, [userEmail, importedCount]);

  if (isLoading) {
    return (
      <Card className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (!email) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-center space-y-2">
          <Mail className="h-12 w-12 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nessuna email scaricata
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full bg-background shadow-xl border-2">
      <CardHeader className="border-b bg-gradient-to-r from-muted/50 to-background">
        <div className="space-y-3">
          <CardTitle className="text-2xl font-bold leading-tight">
            {email.subject || '(Nessun oggetto)'}
          </CardTitle>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="font-medium">{email.from_email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(email.data_ricezione), 'dd/MM/yyyy HH:mm')}</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {email.cartella}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="py-6 px-8">
        <div 
          className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap leading-relaxed"
          style={{
            fontSize: '14px',
            lineHeight: '1.7'
          }}
        >
          {email.body_text || '(Corpo email vuoto)'}
        </div>
      </CardContent>

      {isRunning && (
        <div className="border-t bg-primary/10 py-2 px-8">
          <div className="flex items-center gap-2 text-xs text-primary font-medium">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Download in corso...</span>
          </div>
        </div>
      )}
    </Card>
  );
}
