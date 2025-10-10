import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { emailMessageApi } from '@/lib/tmwe-api-integrated';
import { supabase } from '@/integrations/supabase/client';

interface SingleEmailDownloadProps {
  folder: string;
}

export const SingleEmailDownload = ({ folder }: SingleEmailDownloadProps) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [lastDownloadedCount, setLastDownloadedCount] = useState<number>(0);
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const downloadSingleEmail = async () => {
    setIsDownloading(true);
    setDownloadStatus('idle');

    try {
      const userEmail = sessionStorage.getItem('tmwe_user_email');
      if (!userEmail) {
        throw new Error('User email not found');
      }

      console.log(`🔽 Downloading ONE email from ${folder}`);

      // 1. Ottieni UN SOLO UID dalla cartella
      const response = await emailMessageApi.getMessages({
        folder: folder,
        limit: 1,
        page: 1
      });

      const messages = response.messages || [];
      if (messages.length === 0) {
        toast.info('Nessuna email da scaricare in questa cartella');
        setDownloadStatus('idle');
        setIsDownloading(false);
        return;
      }

      const uid = String(messages[0].uid);

      // 2. Verifica se esiste già nel DB
      const { data: existing } = await supabase
        .from('email_messages')
        .select('message_id')
        .eq('user_email', userEmail)
        .eq('cartella', folder)
        .eq('message_id', uid)
        .maybeSingle();

      if (existing) {
        toast.info('Email già presente nel database');
        setDownloadStatus('idle');
        setIsDownloading(false);
        return;
      }

      // 3. Scarica i dettagli completi
      console.log(`⬇️ Downloading email UID ${uid}`);
      const emailDetail = await emailMessageApi.getMessage(uid, false);

      if (!emailDetail || !emailDetail.message) {
        throw new Error('Email details not found');
      }

      const msg = emailDetail.message;
      const header = msg.header || msg;

      // 4. Inserisci nel database
      const { error: insertError } = await supabase
        .from('email_messages')
        .insert({
          user_email: userEmail,
          message_id: uid,
          from_email: header.from || '',
          to_email: header.to || '',
          cc_email: header.cc || null,
          bcc_email: header.bcc || null,
          subject: header.subject || '(No Subject)',
          body_html: msg.body_html || null,
          body_text: msg.body_plain || msg.body_text || null,
          data_ricezione: header.date || new Date().toISOString(),
          cartella: folder,
          provider_id: '00000000-0000-0000-0000-000000000000',
          direzione: 'ricevuta',
          attachments: msg.attachments || [],
          raw_headers: header.raw_headers || null,
          in_reply_to: header.in_reply_to || null,
          email_references: header.references || null,
          thread_id: header.thread_id || null,
          flags: msg.flags || []
        });

      if (insertError) {
        throw insertError;
      }

      console.log(`✅ Email ${uid} saved successfully`);
      setLastDownloadedCount(prev => prev + 1);
      setDownloadStatus('success');
      toast.success(`Email scaricata: ${header.subject || 'No Subject'}`);

    } catch (error) {
      console.error('❌ Download error:', error);
      setDownloadStatus('error');
      toast.error('Errore durante il download dell\'email');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={downloadSingleEmail}
        disabled={isDownloading}
        size="sm"
        variant="outline"
        className="flex items-center gap-2"
      >
        {isDownloading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : downloadStatus === 'success' ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : downloadStatus === 'error' ? (
          <AlertCircle className="h-4 w-4 text-red-500" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        <span>{isDownloading ? 'Downloading...' : 'Download 1 Email'}</span>
      </Button>

      {lastDownloadedCount > 0 && (
        <Badge variant="secondary">
          {lastDownloadedCount} scaricate
        </Badge>
      )}
    </div>
  );
};
