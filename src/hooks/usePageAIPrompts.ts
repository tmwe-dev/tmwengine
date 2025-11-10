import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PageAIPrompt {
  id: string;
  label: string;
  content: string;
  table_name: string;
  editable: boolean;
  metadata: {
    page_route?: string;
    config_id?: string;
    prompt_id?: string;
    room_id?: string;
    link_to?: string;
  };
}

export function usePageAIPrompts() {
  const location = useLocation();
  const { toast } = useToast();
  const [prompts, setPrompts] = useState<PageAIPrompt[]>([]);
  const [is_loading, setIsLoading] = useState(false);

  const loadPromptsForCurrentRoute = async () => {
    setIsLoading(true);
    const loaded_prompts: PageAIPrompt[] = [];

    try {
      const route_path = location.pathname;
      const search_params = new URLSearchParams(location.search);
      const tab = search_params.get('tab');
      const room_id = search_params.get('room_id');

      // Route: /funnemail
      if (route_path === '/funnemail') {
        // Carica page_system_prompts
        const { data: page_prompt } = await supabase
          .from('page_system_prompts')
          .select('*')
          .eq('page_route', '/funnemail')
          .eq('attivo', true)
          .maybeSingle();

        if (page_prompt) {
          loaded_prompts.push({
            id: page_prompt.id,
            label: 'Chat Sidebar FunEmail',
            content: page_prompt.system_prompt || '',
            table_name: 'page_system_prompts',
            editable: true,
            metadata: { page_route: '/funnemail' }
          });
        }

        // Note: Tab suggestions non ha un prompt configurabile in DB
        // Il prompt viene passato direttamente all'edge function

        // Se siamo nel tab inbox o configurations, conta email_sender_ai_prompts
        if (tab === 'inbox' || tab === 'configurations') {
          const { count } = await supabase
            .from('email_sender_ai_prompts')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true);

          if (count && count > 0) {
            loaded_prompts.push({
              id: 'email_sender_automations',
              label: `Automazioni per Mittente (${count} attivi)`,
              content: '',
              table_name: 'email_sender_ai_prompts',
              editable: false,
              metadata: { link_to: '/funnemail?tab=configurations' }
            });
          }
        }
      }

      // Route: /attivita
      if (route_path === '/attivita') {
        const { data: page_prompt } = await supabase
          .from('page_system_prompts')
          .select('*')
          .eq('page_route', '/attivita')
          .eq('attivo', true)
          .maybeSingle();

        if (page_prompt) {
          loaded_prompts.push({
            id: page_prompt.id,
            label: 'AI Attività',
            content: page_prompt.system_prompt || '',
            table_name: 'page_system_prompts',
            editable: true,
            metadata: { page_route: '/attivita' }
          });
        }
      }

      // Route: /campagne
      if (route_path === '/campagne') {
        const { data: page_prompt } = await supabase
          .from('page_system_prompts')
          .select('*')
          .eq('page_route', '/campagne')
          .eq('attivo', true)
          .maybeSingle();

        if (page_prompt) {
          loaded_prompts.push({
            id: page_prompt.id,
            label: 'AI Campagne',
            content: page_prompt.system_prompt || '',
            table_name: 'page_system_prompts',
            editable: true,
            metadata: { page_route: '/campagne' }
          });
        }
      }

      // Route: /chat
      if (route_path === '/chat') {
        const { data: all_prompts } = await supabase
          .from('chat_laboratory_system_prompts')
          .select('*')
          .order('created_at', { ascending: false });

        all_prompts?.forEach(prompt => {
          loaded_prompts.push({
            id: prompt.id,
            label: `System Prompt: ${prompt.nome}`,
            content: prompt.contenuto || '',
            table_name: 'chat_laboratory_system_prompts',
            editable: true,
            metadata: { prompt_id: prompt.id }
          });
        });
      }

      // Route: /intranet
      if (route_path === '/intranet') {
        // Carica prompt globale
        const { data: global_prompt } = await supabase
          .from('intranet_global_ai_prompt')
          .select('*')
          .eq('attivo', true)
          .maybeSingle();

        if (global_prompt) {
          loaded_prompts.push({
            id: global_prompt.id,
            label: 'Prompt Globale Intranet',
            content: global_prompt.prompt_contenuto || '',
            table_name: 'intranet_global_ai_prompt',
            editable: true,
            metadata: {}
          });
        }

        // Se in una room, carica anche room prompt
        if (room_id) {
          const { data: room_prompt } = await supabase
            .from('intranet_room_ai_prompts')
            .select('*, intranet_rooms(nome)')
            .eq('room_id', room_id)
            .maybeSingle();

          if (room_prompt) {
            const room_name = (room_prompt as any).intranet_rooms?.nome || 'Personalizzato';
            loaded_prompts.push({
              id: room_prompt.id,
              label: `Prompt Stanza: ${room_name}`,
              content: room_prompt.custom_prompt || '',
              table_name: 'intranet_room_ai_prompts',
              editable: true,
              metadata: { room_id }
            });
          }
        }
      }

      setPrompts(loaded_prompts);
    } catch (error) {
      console.error('Error loading prompts:', error);
      toast({
        title: 'Errore caricamento prompts',
        description: 'Impossibile caricare i prompt AI',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const savePrompt = async (prompt: PageAIPrompt, new_content: string) => {
    if (!prompt.editable) return;

    try {
      switch (prompt.table_name) {
        case 'page_system_prompts':
          await supabase
            .from('page_system_prompts')
            .update({ 
              system_prompt: new_content,
              updated_at: new Date().toISOString()
            })
            .eq('page_route', prompt.metadata.page_route);
          break;

        // config_ai non usato (rimosso)

        case 'chat_laboratory_system_prompts':
          await supabase
            .from('chat_laboratory_system_prompts')
            .update({ 
              contenuto: new_content,
              updated_at: new Date().toISOString()
            })
            .eq('id', prompt.metadata.prompt_id);
          break;

        case 'intranet_global_ai_prompt':
          // Disattiva vecchi prompt
          await supabase
            .from('intranet_global_ai_prompt')
            .update({ attivo: false })
            .eq('attivo', true);
          
          // Inserisci nuovo prompt
          await supabase
            .from('intranet_global_ai_prompt')
            .insert({
              prompt_contenuto: new_content,
              attivo: true
            });
          break;

        case 'intranet_room_ai_prompts':
          await supabase
            .from('intranet_room_ai_prompts')
            .update({ 
              custom_prompt: new_content,
              updated_at: new Date().toISOString()
            })
            .eq('id', prompt.id);
          break;
      }

      // Log in project_history
      await supabase.from('project_history').insert({
        operation: 'update_ai_prompt',
        file_modified: null,
        tables_modified: [prompt.table_name],
        metadata: {
          prompt_label: prompt.label,
          prompt_id: prompt.id,
          page_route: location.pathname,
          timestamp: new Date().toISOString()
        }
      });

      toast({
        title: '✅ Prompt Aggiornato',
        description: `"${prompt.label}" salvato con successo`,
      });

      await loadPromptsForCurrentRoute();

    } catch (error) {
      console.error('Error saving prompt:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile salvare il prompt',
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    loadPromptsForCurrentRoute();
  }, [location.pathname, location.search]);

  return {
    prompts,
    is_loading,
    savePrompt,
    reloadPrompts: loadPromptsForCurrentRoute,
  };
}
