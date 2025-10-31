import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { extractDomain } from '@/lib/smart-inbox-utils';
import { generateEmailUid } from '@/lib/email-uid-utils';
import { EmailMetadata } from '@/types/smart-inbox';

interface ClassificationProgress {
  current: number;
  total: number;
  currentEmail: string;
}

export const useSmartClassificationIntelligent = () => {
  const [isClassifying, setIsClassifying] = useState(false);
  const [progress, setProgress] = useState<ClassificationProgress>({
    current: 0,
    total: 0,
    currentEmail: ''
  });

  const classifyEmails = async (emails: EmailMetadata[], userEmail: string, forceCategory?: string) => {
    setIsClassifying(true);
    setProgress({ current: 0, total: emails.length, currentEmail: '' });
    
    let successCount = 0;
    let errorCount = 0;

    try {
      for (let i = 0; i < emails.length; i++) {
        const email = emails[i];
        
        try {
          // Genera UID univoco usando funzione utility condivisa
          const emailUid = generateEmailUid(email);

          if (!emailUid) {
            console.error('Cannot generate UID for email:', email);
            errorCount++;
            continue;
          }

          // Check se già classificata
          const { data: existing } = await supabase
            .from('email_ai_classifications')
            .select('id')
            .eq('email_uid', emailUid)
            .eq('user_email', userEmail)
            .maybeSingle();
          
          if (existing && !forceCategory) {
            console.log(`⏭️ Email già classificata, skip: ${emailUid}`);
            setProgress(p => ({ 
              ...p, 
              current: p.current + 1,
              currentEmail: 'già classificata'
            }));
            continue;
          }

          // Estrai from_email con supporto per diversi formati
          const fromEmail = email.from_email || 
            (typeof email.from === 'object' && email.from !== null ? email.from.email : String(email.from || ''));

          if (!fromEmail) {
            console.error('Could not extract from email, uid:', emailUid);
            errorCount++;
            continue;
          }

          setProgress(p => ({ 
            ...p, 
            currentEmail: email.subject || 'Email senza oggetto'
          }));

          console.log('🔵 Starting classification:', {
            emailUid,
            subject: email.subject,
            fromEmail,
            hasBodyText: !!(email.body_preview || email.body_text)
          });

          // Get current session
          const { data: { session } } = await supabase.auth.getSession();
          
          if (!session) {
            console.error('❌ No active session');
            errorCount++;
            continue;
          }

          console.log('✅ Session valid, calling edge function...');
          
          // Chiama Edge Function per classificazione intelligente
          const { data: classifyData, error: classifyError } = await supabase.functions.invoke(
            'classify-email-content-intelligent',
            {
              body: {
                email_uid: emailUid,
                folder_name: email.folder_name || email.folder || 'INBOX',
                subject: email.subject || '',
                body_text: email.body_preview || email.body_text || '',
                from_email: fromEmail,
                user_email: userEmail,
                force_category: forceCategory || null
              }
            }
          );

          console.log('📨 Edge function response:', { 
            hasData: !!classifyData, 
            hasError: !!classifyError,
            error: classifyError,
            data: classifyData 
          });
          
          if (classifyError) {
            console.error('❌ Classification error:', classifyError);
            errorCount++;
            continue;
          }

          if (classifyData?.success) {
            successCount++;
            
            // Fetch logo in background (non bloccante)
            const domain = extractDomain(fromEmail);
            supabase.functions.invoke('fetch-company-logo', { 
              body: { domain } 
            }).then(({ data: logoData }) => {
              if (logoData?.logo_url) {
                supabase
                  .from('email_ai_classifications')
                  .update({ sender_logo_url: logoData.logo_url })
                  .eq('email_uid', emailUid)
                  .eq('user_email', userEmail)
                  .then();
              }
            });
          } else {
            errorCount++;
          }
          
        } catch (err) {
          console.error(`Error classifying email ${email.uid}:`, err);
          errorCount++;
        }
        
        setProgress(p => ({ ...p, current: p.current + 1 }));
        
        // Rate limiting: 1 email/sec
        if (i < emails.length - 1) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
      
      if (successCount > 0) {
        toast.success(`${successCount} email classificate con successo!`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} email non classificate`);
      }
      
    } catch (error: any) {
      toast.error(`Errore: ${error.message}`);
    } finally {
      setIsClassifying(false);
      setProgress({ current: 0, total: 0, currentEmail: '' });
    }
  };
  
  return { classifyEmails, isClassifying, progress };
};
