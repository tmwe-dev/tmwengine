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

  const applyGroupPromptToSender = async (senderEmail: string, groupId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Devi essere autenticato');
        return;
      }

      // Recupera il gruppo e il suo prompt library associato
      const { data: group, error: groupError } = await supabase
        .from('email_sender_groups')
        .select('*, ai_prompt_library(*)')
        .eq('id', groupId)
        .single();

      if (groupError || !group) {
        toast.error('Gruppo non trovato');
        return;
      }

      if (!group.prompt_library_id || !group.ai_prompt_library) {
        toast.error('Questo gruppo non ha un prompt library associato');
        return;
      }

      const libraryPrompt = group.ai_prompt_library;
      const defaultActions = (libraryPrompt.default_actions || {}) as Record<string, any>;

      // Crea un nuovo prompt per questo sender dal template del gruppo
      const { error: insertError } = await supabase
        .from('email_sender_ai_prompts')
        .insert({
          sender_email: senderEmail,
          user_id: user.id,
          prompt_name: `${libraryPrompt.prompt_name} (da gruppo ${group.nome_gruppo})`,
          prompt_description: libraryPrompt.prompt_description,
          ai_prompt: libraryPrompt.system_prompt,
          ai_config_id: libraryPrompt.ai_config_id,
          base_action: 'none',
          requires_confirmation: defaultActions.requires_confirmation ?? true,
          use_email_templates: libraryPrompt.requires_email_templates ?? false,
          use_contact_aliases: libraryPrompt.requires_contact_aliases ?? false,
          use_company_data: libraryPrompt.requires_company_data ?? false,
          is_active: true,
        });

      if (insertError) {
        console.error('Error applying group prompt:', insertError);
        toast.error('Errore nell\'applicazione del prompt di gruppo');
        return;
      }

      toast.success(`✅ Prompt di gruppo "${group.nome_gruppo}" applicato a ${senderEmail}`);
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('Errore imprevisto');
    }
  };

  return {
    isProcessing,
    createSimpleAction,
    applyAIPromptToSender,
    applyGroupPromptToSender,
  };
};
