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
    console.log('🚀 [SingleEmailDownload] Button clicked!');
    console.log('📁 [SingleEmailDownload] Current folder:', folder);
    
    setIsDownloading(true);
    setDownloadStatus('idle');

    try {
      const userEmail = sessionStorage.getItem('tmwe_user_email');
      console.log('👤 [SingleEmailDownload] User email from session:', userEmail);
      
      if (!userEmail) {
        console.error('❌ [SingleEmailDownload] No user email in sessionStorage!');
        throw new Error('User email not found');
      }

      console.log(`🔽 Downloading ONE email from ${folder}`);

      // 1. Ottieni UN SOLO UID dalla cartella
      console.log('📡 [SingleEmailDownload] Calling emailMessageApi.getMessages...');
      const response = await emailMessageApi.getMessages({
        folder: folder,
        limit: 1,
        page: 1
      });
      console.log('📬 [SingleEmailDownload] API Response:', response);

      const messages = response.messages || [];
      console.log(`📊 [SingleEmailDownload] Found ${messages.length} messages`);
      
      if (messages.length === 0) {
        console.warn('⚠️ [SingleEmailDownload] No emails in this folder');
        toast.info('Nessuna email da scaricare in questa cartella');
        setDownloadStatus('idle');
        setIsDownloading(false);
        return;
      }

      const uid = String(messages[0].uid);
      console.log(`🎯 [SingleEmailDownload] Selected UID: ${uid}`);

      // 2. Verifica se esiste già nel DB
      console.log('🔍 [SingleEmailDownload] Checking if email exists in DB...');
      const { data: existing } = await supabase
        .from('email_messages')
        .select('message_id')
        .eq('user_email', userEmail)
        .eq('cartella', folder)
        .eq('message_id', uid)
        .maybeSingle();
      
      console.log('💾 [SingleEmailDownload] Existing email check:', existing);

      if (existing) {
        console.log('ℹ️ [SingleEmailDownload] Email already in database');
        toast.info('Email già presente nel database');
        setDownloadStatus('idle');
        setIsDownloading(false);
        return;
      }

      // 3. Scarica i dettagli completi
      console.log(`⬇️ Downloading email details for UID ${uid}...`);
      const emailDetail = await emailMessageApi.getMessage(uid, false);
      console.log('📧 [SingleEmailDownload] Email detail received:', emailDetail);

      if (!emailDetail || !emailDetail.message) {
        console.error('❌ [SingleEmailDownload] Invalid email detail response');
        throw new Error('Email details not found');
      }

      const msg = emailDetail.message;
      const header = msg.header || msg;
      
      console.log('💌 [SingleEmailDownload] Preparing insert data...');
      console.log('  - Subject:', header.subject);
      console.log('  - From:', header.from);
      console.log('  - To:', header.to);

      // 4. Inserisci nel database
      console.log('💾 [SingleEmailDownload] Inserting into database...');
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
        console.error('❌ [SingleEmailDownload] Database insert error:', insertError);
        throw insertError;
      }

      console.log(`✅ Email ${uid} saved successfully to database`);
      setLastDownloadedCount(prev => prev + 1);
      setDownloadStatus('success');
      toast.success(`Email scaricata: ${header.subject || 'No Subject'}`);

    } catch (error) {
      console.error('❌ [SingleEmailDownload] Download error:', error);
      console.error('❌ [SingleEmailDownload] Error details:', JSON.stringify(error, null, 2));
      setDownloadStatus('error');
      toast.error(`Errore: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    } finally {
      console.log('🏁 [SingleEmailDownload] Download process completed');
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={downloadSingleEmail}
        disabled={isDownloading}
        size="icon"
        variant="outline"
        className="h-8 w-8"
        title={isDownloading ? 'Downloading...' : 'Download 1 Email'}
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
      </Button>

      {lastDownloadedCount > 0 && (
        <Badge variant="secondary">
          {lastDownloadedCount} scaricate
        </Badge>
      )}
    </div>
  );
};
