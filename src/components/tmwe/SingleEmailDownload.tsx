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
  console.log('🔧 [SingleEmailDownload] Component rendered, folder:', folder);
  
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
      const fullEmail = await emailMessageApi.getMessage(uid, false);
      console.log('📧 [SingleEmailDownload] Full email received:', fullEmail);

      // 4. Inserisci nel database (STESSO FORMATO di useEmailSync)
      console.log('💾 [SingleEmailDownload] Inserting into database...');
      const { error: insertError } = await supabase
        .from('email_messages')
        .insert({
          message_id: uid,
          user_email: userEmail,
          subject: fullEmail.subject || '(No Subject)',
          from_email: fullEmail.from?.email || fullEmail.from || '',
          to_email: fullEmail.to || '',
          cc_email: fullEmail.cc || null,
          bcc_email: fullEmail.bcc || null,
          body_html: fullEmail.body_html || '',
          body_text: fullEmail.body_text || fullEmail.body || '',
          attachments: fullEmail.attachments || [],
          cartella: folder,
          data_ricezione: fullEmail.date || new Date().toISOString(),
          stato: fullEmail.is_read ? 'letto' : 'nuovo',
          direzione: folder === 'Sent' ? 'uscita' : 'entrata',
          provider_id: '00000000-0000-0000-0000-000000000000',
          flags: fullEmail.flags || [],
        });

      if (insertError) {
        console.error('❌ [SingleEmailDownload] Database insert error:', insertError);
        throw insertError;
      }

      console.log(`✅ Email ${uid} saved successfully to database`);
      setLastDownloadedCount(prev => prev + 1);
      setDownloadStatus('success');
      toast.success(`Email scaricata: ${fullEmail.subject || 'No Subject'}`);

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
        onClick={(e) => {
          console.log('🖱️ [SingleEmailDownload] CLICK EVENT TRIGGERED!', e);
          downloadSingleEmail();
        }}
        disabled={isDownloading}
        size="icon"
        variant="outline"
        className="h-8 w-8 bg-primary text-primary-foreground hover:bg-primary/90"
        title={isDownloading ? 'Downloading...' : 'Download 1 Email'}
      >
        {isDownloading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : downloadStatus === 'success' ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : downloadStatus === 'error' ? (
          <AlertCircle className="h-4 w-4" />
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
