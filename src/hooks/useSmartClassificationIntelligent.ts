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

  // ✅ ZERO-SYNC: Accepts array of email_id (UUID) OR objects with tmwe_email_id
  // Prefer tmwe_email_id when available for Zero-Sync architecture
  const classifyEmails = async (
    emailIds: string[] | Array<{ email_id?: string; tmwe_email_id?: number }>, 
    userEmail: string, 
    forceCategory?: string,
    selectedAgent?: string  // 🆕 AI agent ID (default: 'gemini' in edge function)
  ) => {
    // Normalize input to array of objects
    const normalizedInputs = Array.isArray(emailIds) 
      ? emailIds.map(id => typeof id === 'string' ? { email_id: id } : id)
      : emailIds;
    
    setIsClassifying(true);
    setProgress({ current: 0, total: normalizedInputs.length, currentEmail: '' });
    
    let successCount = 0;
    let errorCount = 0;

    try {
      for (let i = 0; i < normalizedInputs.length; i++) {
        const input = normalizedInputs[i];
        const emailIdentifier = input.tmwe_email_id 
          ? `TMWE:${input.tmwe_email_id}` 
          : `UUID:${input.email_id?.substring(0, 8)}...`;
        
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
            currentEmail: `Email: ${emailIdentifier}`
          }));

          console.log('🔵 [Zero-Sync] Starting classification for:', emailIdentifier);

          // ✅ ZERO-SYNC: Pass tmwe_email_id when available (preferred)
          const { data: classifyData, error: classifyError } = await supabase.functions.invoke(
            'email-ai-processor',
            {
              body: {
                operation: 'classify',
                email_id: input.email_id,           // Legacy UUID (fallback)
                tmwe_email_id: input.tmwe_email_id, // 🆕 TMWE API ID (preferred)
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
          console.error(`Error classifying email ${emailIdentifier}:`, err);
          errorCount++;
        }
        
        setProgress(p => ({ ...p, current: p.current + 1 }));
        
        // Rate limiting: 1 email/sec
        if (i < normalizedInputs.length - 1) {
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
