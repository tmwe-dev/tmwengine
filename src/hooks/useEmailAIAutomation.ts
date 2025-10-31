import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useEmailAIAutomation = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const createSimpleAction = async (
    senderEmail: string,
    action: 'archive' | 'delete' | 'move'
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Devi essere autenticato');
        return;
      }

      const actionMapping = {
        archive: 'Archivia email automaticamente',
        delete: 'Elimina email automaticamente',
        move: 'Sposta in cartella specifica',
      };

      const baseActionMapping = {
        archive: 'archive',
        delete: 'delete',
        move: 'move_to_folder',
      };

      // Crea un prompt AI di default basato sull'azione
      const defaultPrompt = `Questa è una regola automatica per ${actionMapping[action]}.

Quando ricevi email da ${senderEmail}:
1. Esegui l'azione: ${actionMapping[action]}
2. Non richiedere conferma per questa operazione semplice

Questa regola è stata creata automaticamente dal sistema.`;

      const { error } = await supabase
        .from('email_sender_ai_prompts')
        .insert({
          sender_email: senderEmail,
          user_id: user.id,
          prompt_name: `Auto: ${actionMapping[action]}`,
          prompt_description: `Regola automatica per ${senderEmail}`,
          ai_prompt: defaultPrompt,
          base_action: baseActionMapping[action],
          requires_confirmation: false, // Azioni semplici non richiedono conferma
          is_active: true,
        });

      if (error) {
        console.error('Error creating action:', error);
        toast.error('Errore nella creazione della regola');
        return;
      }

      toast.success(`✅ Regola "${actionMapping[action]}" creata per ${senderEmail}`);
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('Errore imprevisto');
    }
  };

  const applyAIPromptToSender = async (senderEmail: string, promptId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Devi essere autenticato');
        return;
      }

      // Recupera il prompt salvato
      const { data: existingPrompt, error: fetchError } = await supabase
        .from('email_sender_ai_prompts')
        .select('*')
        .eq('id', promptId)
        .single();

      if (fetchError || !existingPrompt) {
        toast.error('Prompt non trovato');
        return;
      }

      // Crea una nuova istanza del prompt per questo sender
      const { error: insertError } = await supabase
        .from('email_sender_ai_prompts')
        .insert({
          sender_email: senderEmail,
          user_id: user.id,
          prompt_name: existingPrompt.prompt_name + ' (copia)',
          prompt_description: existingPrompt.prompt_description,
          ai_prompt: existingPrompt.ai_prompt,
          ai_config_id: existingPrompt.ai_config_id,
          base_action: existingPrompt.base_action,
          base_action_params: existingPrompt.base_action_params,
          requires_confirmation: existingPrompt.requires_confirmation,
          use_email_templates: existingPrompt.use_email_templates,
          use_contact_aliases: existingPrompt.use_contact_aliases,
          use_company_data: existingPrompt.use_company_data,
          is_active: true,
        });

      if (insertError) {
        console.error('Error applying prompt:', insertError);
        toast.error('Errore nell\'applicazione del prompt');
        return;
      }

      toast.success(`✅ Prompt "${existingPrompt.prompt_name}" applicato a ${senderEmail}`);
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('Errore imprevisto');
    }
  };

  return {
    isProcessing,
    createSimpleAction,
    applyAIPromptToSender,
  };
};
