import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { emailMessageApi } from '@/lib/tmwe-api-integrated';
import { toast } from 'sonner';

export const useEmailBody = (messageId: string, uid: string, folder: string) => {
  const [bodyHtml, setBodyHtml] = useState<string | null>(null);
  const [bodyText, setBodyText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBody = async () => {
      if (!messageId || !uid) return;

      setLoading(true);
      setError(null);

      try {
        console.log(`🔍 Checking cached body for ${messageId}...`);

        // 1. Check if body already in DB (cache)
        const { data: cached, error: cacheError } = await supabase
          .from('email_messages')
          .select('body_html, body_text, attachments')
          .eq('message_id', messageId)
          .maybeSingle();

        if (cacheError) {
          console.error('Cache check error:', cacheError);
        }

        // Se c'è già il body nella cache, usalo
        if (cached?.body_html || cached?.body_text) {
          console.log(`✅ Body trovato in cache per ${messageId}`);
          setBodyHtml(cached.body_html);
          setBodyText(cached.body_text);
          setLoading(false);
          return;
        }

        // 2. Body non in cache - scarica dall'API
        console.log(`📥 Scaricando body per ${messageId} dall'API...`);
        
        const response = await emailMessageApi.getMessage(uid.toString(), false);
        const emailData = response?.data;

        if (!emailData) {
          throw new Error('Email data not found');
        }

        const fetchedBodyHtml = emailData.body_html || null;
        const fetchedBodyText = emailData.body_text || emailData.body || null;

        // 3. Salva nella cache (DB) per le prossime volte
        console.log(`💾 Salvando body in cache per ${messageId}...`);
        
        const { error: updateError } = await supabase
          .from('email_messages')
          .update({
            body_html: fetchedBodyHtml,
            body_text: fetchedBodyText,
            attachments: emailData.attachments ? JSON.stringify(emailData.attachments) : null
          })
          .eq('message_id', messageId);

        if (updateError) {
          console.error('Error caching body:', updateError);
          toast.error('Errore nel salvare il body in cache');
        } else {
          console.log(`✅ Body salvato in cache per ${messageId}`);
        }

        setBodyHtml(fetchedBodyHtml);
        setBodyText(fetchedBodyText);

      } catch (err: any) {
        console.error('Error fetching email body:', err);
        setError(err.message || 'Errore nel caricamento del contenuto email');
        toast.error('Errore nel caricamento del contenuto email');
      } finally {
        setLoading(false);
      }
    };

    fetchBody();
  }, [messageId, uid, folder]);

  return { 
    bodyHtml, 
    bodyText, 
    body: bodyHtml || bodyText, 
    loading, 
    error 
  };
};
