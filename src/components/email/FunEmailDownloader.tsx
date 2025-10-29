import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Download, Loader2 } from 'lucide-react';
import { emailMessageApi } from '@/lib/tmwe-api-integrated';

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

      // Step 1: Get email UIDs from INBOX (auto-auth via emailMessageApi)
      setCurrentFolder('Recupero lista email...');
      setProgress(10);

      const uidListResponse = await emailMessageApi.getMessages({
        folder: 'INBOX',
        limit: 2000,
        offset: 0,
      });

      const uidList = uidListResponse?.messages || [];
      if (uidList.length === 0) {
        throw new Error('Nessuna email trovata in INBOX');
      }

      // Step 2: Download each email and save to DB
      let downloadedCount = 0;
      const totalEmails = uidList.length;

      for (let i = 0; i < totalEmails; i++) {
        const uidInfo = uidList[i];
        const uid = String(uidInfo.uid);
        
        setCurrentFolder(`Email ${i + 1}/${totalEmails}...`);
        
        // Get full email content (auto-auth via emailMessageApi)
        const email = await emailMessageApi.getMessage(uid, false);
        
        if (!email) {
          console.warn(`Email ${uid} non trovata`);
          continue;
        }

        // Parse date with same logic as useEmailDownload
        let isoDate = new Date().toISOString();
        if (email.date) {
          try {
            isoDate = new Date(email.date).toISOString();
          } catch (e) {
            console.error('Error parsing date:', email.date);
          }
        }

        // Save to email_messages with sync_status='fun_email_backup'
        const { error: insertError } = await supabase.from('email_messages').insert({
          message_id: String(email.message_id || email.uid || `msg-${Date.now()}-${Math.random()}`),
          from_email: email.from?.address || email.from || email.from_email || '',
          to_email: Array.isArray(email.to) 
            ? email.to.map((t: any) => t.address || t).join(',')
            : email.to || email.to_email || '',
          cc_email: email.cc || email.cc_email || null,
          bcc_email: email.bcc || email.bcc_email || null,
          subject: email.subject || '',
          body_text: email.body_text || email.text || '',
          body_html: email.body_html || email.html || '',
          data_ricezione: isoDate,
          cartella: 'INBOX',
          direzione: 'inbound',
          stato: email.flags?.includes('\\Seen') ? 'letto' : 'nuovo',
          flags: email.flags || [],
          attachments: email.attachments || [],
          provider_id: '00000000-0000-0000-0000-000000000000',
          user_email: profile.tmwe_email,
          sync_status: 'fun_email_backup',
        });

        if (!insertError) {
          downloadedCount++;
        } else {
          console.error(`Errore inserimento email ${uid}:`, insertError);
        }

        // Update progress: 10% initial + 90% download
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
