import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AIActionProposal } from '@/types/email-automation';

export const useEmailAIProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProposal, setCurrentProposal] = useState<{
    logId: string;
    proposal: AIActionProposal;
    requiresConfirmation: boolean;
  } | null>(null);

  const processEmailWithAI = useCallback(async (
    emailUid: string,
    senderEmail: string,
    emailSubject: string,
    emailBody: string
  ) => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('email-ai-processor', {
        body: {
          operation: 'automate',
          email_uid: emailUid,
          sender_email: senderEmail,
          email_subject: emailSubject,
          email_body: emailBody,
        },
      });

      if (error) {
        console.error('AI processor error:', error);
        toast.error('Errore nel processamento AI');
        return null;
      }

      if (data?.requires_confirmation) {
        setCurrentProposal({
          logId: data.log_id,
          proposal: data.proposal,
          requiresConfirmation: true,
        });
        toast.info(`🤖 AI ha analizzato l'email. Conferma le azioni proposte.`);
      } else {
        toast.success(`✅ AI ha processato l'email automaticamente`);
      }

      return data;
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('Errore imprevisto nel processamento AI');
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const clearProposal = useCallback(() => {
    setCurrentProposal(null);
  }, []);

  return {
    isProcessing,
    currentProposal,
    processEmailWithAI,
    clearProposal,
  };
};
