import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

  // ✅ NUOVO: Accetta array di email_id (UUID) invece di EmailMetadata + selectedAgent
  const classifyEmails = async (
    emailIds: string[], 
    userEmail: string, 
    forceCategory?: string,
    selectedAgent?: string  // 🆕 AI agent ID (default: 'gemini' in edge function)
  ) => {
    setIsClassifying(true);
    setProgress({ current: 0, total: emailIds.length, currentEmail: '' });
    
    let successCount = 0;
    let errorCount = 0;

    try {
      for (let i = 0; i < emailIds.length; i++) {
        const emailId = emailIds[i];
        
        try {
          // Get current session
          const { data: { session } } = await supabase.auth.getSession();
          
          if (!session) {
            console.error('❌ No active session');
            errorCount++;
            continue;
          }

          setProgress(p => ({ 
            ...p, 
            currentEmail: `Email ID: ${emailId.substring(0, 8)}...`
          }));

          console.log('🔵 Starting classification for email_id:', emailId);

          // ✅ Passa email_id (UUID) + selected_agent
          const { data: classifyData, error: classifyError } = await supabase.functions.invoke(
            'email-ai-processor',
            {
              body: {
                operation: 'classify',
                email_id: emailId,
                user_email: userEmail,
                force_category: forceCategory || null,
                selected_agent: selectedAgent || 'gemini'
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
          } else {
            errorCount++;
          }
          
        } catch (err) {
          console.error(`Error classifying email ID ${emailId}:`, err);
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
