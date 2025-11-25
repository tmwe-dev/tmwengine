import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { extractDomain } from '@/lib/smart-inbox-utils';

interface ClassificationProgress {
  current: number;
  total: number;
  currentEmail: string;
}

export const useSmartClassification = () => {
  const [isClassifying, setIsClassifying] = useState(false);
  const [progress, setProgress] = useState<ClassificationProgress>({
    current: 0,
    total: 0,
    currentEmail: ''
  });

  const classifyEmails = async (emailIds: string[], userEmail: string) => {
    setIsClassifying(true);
    setProgress({ current: 0, total: emailIds.length, currentEmail: '' });
    
    let successCount = 0;
    let errorCount = 0;

    try {
      for (let i = 0; i < emailIds.length; i++) {
        const emailId = emailIds[i];
        
        try {
          // Check se già classificata
          const { data: existing } = await supabase
            .from('email_ai_classifications')
            .select('id')
            .eq('email_message_id', emailId)
            .maybeSingle();
          
          if (existing) {
            setProgress(p => ({ 
              ...p, 
              current: p.current + 1,
              currentEmail: 'già classificata'
            }));
            continue;
          }
          
          // Fetch email data
          const { data: email, error: emailError } = await supabase
            .from('email_messages')
            .select('*')
            .eq('id', emailId)
            .single();
          
          if (emailError || !email) {
            console.error('Email fetch error:', emailError);
            errorCount++;
            continue;
          }

          // Extract email address from 'from' field (could be object or string)
          const emailData = email as any;
          const fromEmail = typeof emailData.from === 'object' && emailData.from !== null
            ? emailData.from.email 
            : String(emailData.from || emailData.from_email || emailData.sender_email || '');

          if (!fromEmail) {
            console.error('Could not extract from email for:', emailId);
            errorCount++;
            continue;
          }

          setProgress(p => ({ 
            ...p, 
            currentEmail: emailData.subject || 'Email senza oggetto'
          }));
          
          // Chiama Edge Function per classificazione
          const { data: classifyData, error: classifyError } = await supabase.functions.invoke(
            'email-ai-processor',
            {
              body: {
                operation: 'classify',
                email_id: emailId,
                subject: emailData.subject || '',
                body_text: emailData.body_text || emailData.body || '',
                from_email: fromEmail,
                user_email: userEmail
              }
            }
          );
          
          if (classifyError) {
            console.error('Classification error:', classifyError);
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
                  .eq('email_message_id', emailId)
                  .then();
              }
            });
          } else {
            errorCount++;
          }
          
        } catch (err) {
          console.error(`Error classifying email ${emailId}:`, err);
          errorCount++;
        }
        
        setProgress(p => ({ ...p, current: p.current + 1 }));
        
        // Rate limiting: 1 email/sec
        if (i < emailIds.length - 1) {
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