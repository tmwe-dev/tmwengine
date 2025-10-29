import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Download, Loader2 } from 'lucide-react';
import { authenticateWithJWT } from '@/lib/tmwe-api-integrated';

interface FunEmailDownloaderProps {
  onDownloadComplete?: (stats: {
    totalDownloaded: number;
    folders: string[];
    dateRange: { from: Date; to: Date };
  }) => void;
}

export const FunEmailDownloader = ({ onDownloadComplete }: FunEmailDownloaderProps) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFolder, setCurrentFolder] = useState('');
  const { toast } = useToast();

  const startDownload = async () => {
    setIsDownloading(true);
    setProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        throw new Error('User not authenticated');
      }

      // Get user's TMWE email
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tmwe_email')
        .eq('user_id', user.id)
        .single();

      if (!profile?.tmwe_email) {
        throw new Error('Email TMWE non configurato nel profilo');
      }

      // Step 1: Authenticate with JWT (uses hardcoded OAuth credentials)
      setCurrentFolder('Autenticazione TMWE...');
      setProgress(5);
      
      const authenticated = await authenticateWithJWT();
      if (!authenticated) {
        throw new Error('Autenticazione TMWE fallita');
      }

      // Step 2: Get email UIDs from INBOX via tmwe-api-proxy
      setCurrentFolder('Recupero lista email...');
      setProgress(10);

      const { data: uidsResponse, error: uidsError } = await supabase.functions.invoke('tmwe-api-proxy', {
        body: {
          endpoint: '/email_message',
          data: {
            handler: 'get_messages',
            folder: 'INBOX',
            limit: 2000,
            format: 'text'
          }
        }
      });

      if (uidsError) throw uidsError;

      const uids = uidsResponse?.data?.messages || [];
      if (uids.length === 0) {
        throw new Error('Nessuna email trovata in INBOX');
      }

      // Step 3: Download each email and save to DB
      let downloadedCount = 0;
      const totalEmails = Math.min(uids.length, 2000);

      for (let i = 0; i < totalEmails; i++) {
        const uid = uids[i];
        setCurrentFolder(`Email ${i + 1}/${totalEmails}...`);
        
        // Get full email content
        const { data: emailResponse, error: emailError } = await supabase.functions.invoke('tmwe-api-proxy', {
          body: {
            endpoint: '/email_message',
            data: {
              handler: 'get_message',
              uid: uid,
              format: 'both'
            }
          }
        });

        if (emailError) {
          console.error(`Error downloading email ${uid}:`, emailError);
          continue;
        }

        const email = emailResponse?.data;
        if (!email) continue;

        // Save to email_messages with sync_status='fun_email_backup'
        const { error: insertError } = await supabase.from('email_messages').insert({
          message_id: email.message_id || `uid-${uid}`,
          subject: email.subject || '(No Subject)',
          from_email: email.from?.email || 'unknown@unknown.com',
          to_email: email.to?.[0]?.email || profile.tmwe_email,
          cc_email: email.cc?.map((c: any) => c.email).join(', ') || null,
          body_text: email.text_body || '',
          body_html: email.html_body || '',
          cartella: 'INBOX',
          direzione: 'in',
          stato: 'received',
          sync_status: 'fun_email_backup',
          user_email: profile.tmwe_email,
          data_ricezione: email.date ? new Date(email.date).toISOString() : new Date().toISOString(),
          flags: { seen: email.seen || false },
          attachments: email.attachments || [],
        } as any);

        if (!insertError) {
          downloadedCount++;
        }

        // Update progress: 10% auth + 90% download
        const downloadProgress = 10 + ((i + 1) / totalEmails) * 90;
        setProgress(Math.round(downloadProgress));
      }

      setProgress(100);
      setCurrentFolder('Completato!');

      const stats = {
        totalDownloaded: downloadedCount,
        folders: ['INBOX'],
        dateRange: {
          from: new Date(),
          to: new Date(),
        },
      };

      toast({
        title: '✅ Download completato',
        description: `${downloadedCount} email scaricate e pronte per l'analisi AI`,
      });

      onDownloadComplete?.(stats);

    } catch (error: any) {
      console.error('[FunEmailDownloader] Error:', error);
      toast({
        title: '❌ Errore durante il download',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
      setProgress(0);
      setCurrentFolder('');
    }
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex flex-col gap-2">
          <Button
            onClick={startDownload}
            disabled={isDownloading}
            className="w-full"
            size="lg"
          >
            {isDownloading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scaricamento in corso...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Prepara Email per AI
              </>
            )}
          </Button>

          {isDownloading && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-xs text-muted-foreground text-center">
                {currentFolder}
              </p>
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>📥 Scarica email da TMWE server</p>
          <p>💾 Salva come backup locale</p>
          <p>🤖 Prepara per analisi AI</p>
        </div>
      </CardContent>
    </Card>
  );
};
