import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AIInjectedContext } from '@/types/email-automation';

/**
 * Hook per recuperare context AI da iniettare nei prompt
 * Recupera: template, alias contatti, dati azienda
 */
export const useEmailAIContext = () => {
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Recupera context completo per un sender email
   */
  const fetchAIContext = useCallback(async (
    senderEmail: string,
    options?: {
      includeTemplates?: boolean;
      includeContactAliases?: boolean;
      includeCompanyData?: boolean;
    }
  ): Promise<AIInjectedContext | null> => {
    setIsLoading(true);
    try {
      const context: AIInjectedContext = {
        sender_email: senderEmail,
      };

      // 1. Cerca nella cache
      const { data: cachedContext } = await supabase
        .from('email_ai_context_cache')
        .select('*')
        .eq('sender_email', senderEmail)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (cachedContext) {
        console.log('✅ Context trovato in cache');
        return {
          sender_email: senderEmail,
          contact_info: cachedContext.contact_aliases as any,
          company_data: cachedContext.company_data as any,
          available_templates: cachedContext.available_templates as any,
        };
      }

      // 2. Recupera da rubrica se non in cache
      const { data: contatto } = await supabase
        .from('rubrica')
        .select('*')
        .or(`email.eq.${senderEmail},email_aziendale.eq.${senderEmail}`)
        .single();

      if (contatto && options?.includeContactAliases) {
        const nomeCompleto = contatto.nome || ''
        context.contact_info = {
          nome: contatto.nome || '',
          azienda: contatto.azienda || '',
          aliases: {
            nome_completo: nomeCompleto,
            saluto: `Gentile ${nomeCompleto}`,
          },
        };

        if (contatto.azienda && options?.includeCompanyData) {
          context.company_data = {
            ragione_sociale: contatto.azienda,
            alias: contatto.azienda.split(' ')[0], // Prima parola come alias
          };
        }
      }

      // 3. Recupera template disponibili (se tabella esiste)
      if (options?.includeTemplates) {
        try {
          // Placeholder: adattare al nome reale tabella template quando disponibile
          context.available_templates = [];
          console.log('⚠️ Template system not yet configured');
        } catch (error) {
          console.log('⚠️ Template table not found, skipping');
        }
      }

      // 4. Recupera preferenze utente
      const { data: userConfig } = await supabase
        .from('config_generale')
        .select('email_utente, nome_utente, cognome_utente, ruolo_utente')
        .single();

      if (userConfig) {
        context.user_preferences = {
          email: userConfig.email_utente || '',
          nome: userConfig.nome_utente || '',
          cognome: userConfig.cognome_utente || '',
          ruolo: userConfig.ruolo_utente || '',
        };
      }

      // 5. Salva in cache per 24h
      if (contatto) {
        await supabase.from('email_ai_context_cache').upsert({
          sender_email: senderEmail,
          rubrica_id: contatto.id,
          contact_aliases: context.contact_info || {},
          company_data: context.company_data || {},
          available_templates: context.available_templates || [],
          cached_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }, { onConflict: 'sender_email' });
      }

      console.log('✅ Context recuperato e salvato in cache:', context);
      return context;

    } catch (error) {
      console.error('❌ Errore recupero context AI:', error);
      toast.error('Errore nel recupero del contesto AI');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Invalida cache per un sender (forza refresh)
   */
  const invalidateCache = useCallback(async (senderEmail: string) => {
    try {
      await supabase
        .from('email_ai_context_cache')
        .delete()
        .eq('sender_email', senderEmail);
      
      console.log('✅ Cache invalidata per:', senderEmail);
    } catch (error) {
      console.error('❌ Errore invalidazione cache:', error);
    }
  }, []);

  return {
    fetchAIContext,
    invalidateCache,
    isLoading,
  };
};
