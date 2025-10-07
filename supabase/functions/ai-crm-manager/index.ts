import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { action, data, activity_id, activity_ids, contact_id, contact_ids, tags } = await req.json();

    console.log('🎯 AI CRM Manager:', { action });

    let result;

    switch (action) {
      // ACTIVITY ACTIONS
      case 'create_activity': {
        const { data: newActivity, error } = await supabaseClient
          .from('attivita')
          .insert(data)
          .select()
          .single();
        
        if (error) throw error;
        result = { success: true, activity: newActivity };
        break;
      }

      case 'update_activity': {
        const { data: updated, error } = await supabaseClient
          .from('attivita')
          .update(data)
          .eq('id', activity_id)
          .select()
          .single();
        
        if (error) throw error;
        result = { success: true, activity: updated };
        break;
      }

      case 'bulk_update': {
        const { data: updated, error } = await supabaseClient
          .from('attivita')
          .update(data)
          .in('id', activity_ids)
          .select();
        
        if (error) throw error;
        result = { success: true, updated_count: updated.length, activities: updated };
        break;
      }

      // CONTACT ACTIONS
      case 'create_contact': {
        const { data: newContact, error } = await supabaseClient
          .from('rubrica')
          .insert(data)
          .select()
          .single();
        
        if (error) throw error;
        result = { success: true, contact: newContact };
        break;
      }

      case 'update_contact': {
        const { data: updated, error } = await supabaseClient
          .from('rubrica')
          .update(data)
          .eq('id', contact_id)
          .select()
          .single();
        
        if (error) throw error;
        result = { success: true, contact: updated };
        break;
      }

      case 'bulk_tag': {
        // Get current contacts
        const { data: contacts, error: fetchError } = await supabaseClient
          .from('rubrica')
          .select('id, tags')
          .in('id', contact_ids);
        
        if (fetchError) throw fetchError;

        // Update each contact with merged tags
        const updates = contacts.map(async (contact) => {
          const currentTags = contact.tags || [];
          const newTags = Array.from(new Set([...currentTags, ...tags]));
          
          return supabaseClient
            .from('rubrica')
            .update({ tags: newTags })
            .eq('id', contact.id);
        });

        await Promise.all(updates);
        result = { success: true, tagged_count: contacts.length, tags };
        break;
      }

      case 'bulk_archive': {
        const { data: archived, error } = await supabaseClient
          .from('rubrica')
          .update({ archiviata: true })
          .in('id', contact_ids)
          .select();
        
        if (error) throw error;
        result = { success: true, archived_count: archived.length };
        break;
      }

      case 'bulk_restore': {
        const { data: restored, error } = await supabaseClient
          .from('rubrica')
          .update({ archiviata: false })
          .in('id', contact_ids)
          .select();
        
        if (error) throw error;
        result = { success: true, restored_count: restored.length };
        break;
      }

      case 'update_aliases': {
        const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
        if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY non configurata');

        // Carica prompt
        const { data: promptData, error: promptError } = await supabaseClient
          .from('page_system_prompts')
          .select('system_prompt')
          .eq('page_route', '/template-alias')
          .eq('attivo', true)
          .single();
        
        if (promptError || !promptData) throw new Error('Prompt non trovato');

        // Carica contatti
        const { data: contacts, error: contactsError } = await supabaseClient
          .from('imported_contacts')
          .select('id, name, company_name')
          .in('id', contact_ids);
        
        if (contactsError) throw contactsError;

        console.log(`🤖 Generazione alias per ${contacts.length} contatti`);

        // Processa contatti in batch per evitare rate limit
        const BATCH_SIZE = 5;
        const allUpdates: (string | null)[] = [];
        
        for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
          const batch = contacts.slice(i, i + BATCH_SIZE);
          console.log(`📦 Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(contacts.length / BATCH_SIZE)}: processing ${batch.length} contacts`);
          
          const batchUpdates = await Promise.all(
            batch.map(async (contact) => {
              try {
                const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    model: 'google/gemini-2.5-flash',
                    messages: [
                      { role: 'system', content: promptData.system_prompt },
                      { 
                        role: 'user', 
                        content: JSON.stringify({
                          name: contact.name || '',
                          company_name: contact.company_name || ''
                        })
                      }
                    ],
                    tools: [{
                      type: 'function',
                      function: {
                        name: 'set_aliases',
                        parameters: {
                          type: 'object',
                          properties: {
                            alias: { type: 'string' },
                            company_alias: { type: 'string' }
                          },
                          required: ['alias', 'company_alias'],
                          additionalProperties: false
                        }
                      }
                    }],
                    tool_choice: { type: 'function', function: { name: 'set_aliases' } }
                  }),
                });

                if (!response.ok) {
                  console.error(`❌ Errore AI per ${contact.id}:`, response.status);
                  return null;
                }

                const aiResult = await response.json();
                const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
                
                if (!toolCall) {
                  console.error(`❌ Nessun tool_call per ${contact.id}`);
                  return null;
                }

                const aliases = JSON.parse(toolCall.function.arguments);

                // Aggiorna record
                const { error: updateError } = await supabaseClient
                  .from('imported_contacts')
                  .update({
                    alias: aliases.alias,
                    company_alias: aliases.company_alias
                  })
                  .eq('id', contact.id);

                if (updateError) {
                  console.error(`❌ Errore update ${contact.id}:`, updateError);
                  return null;
                }

                console.log(`✅ Alias generati per ${contact.name || contact.id}`);
                return contact.id;
              } catch (error) {
                console.error(`❌ Errore processing ${contact.id}:`, error);
                return null;
              }
            })
          );
          
          allUpdates.push(...batchUpdates);
        }

        const successCount = allUpdates.filter(id => id !== null).length;
        console.log(`✅ Completato: ${successCount}/${contacts.length} alias generati`);
        
        result = { 
          success: true, 
          updated_count: successCount,
          message: `${successCount}/${contacts.length} alias generati`
        };
        break;
      }

      case 'preview_aliases': {
        const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
        if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY non configurata');

        // Carica prompt
        const { data: promptData, error: promptError } = await supabaseClient
          .from('page_system_prompts')
          .select('system_prompt')
          .eq('page_route', '/template-alias')
          .eq('attivo', true)
          .single();
        
        if (promptError || !promptData) throw new Error('Prompt non trovato');

        // Carica contatti
        const { data: contacts, error: contactsError } = await supabaseClient
          .from('imported_contacts')
          .select('id, name, company_name, alias, company_alias')
          .in('id', contact_ids);
        
        if (contactsError) throw contactsError;

        console.log(`🔍 Preview alias per ${contacts.length} contatti`);

        // Processa contatti in batch per evitare rate limit
        const BATCH_SIZE = 5;
        const allPreviews: any[] = [];
        
        for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
          const batch = contacts.slice(i, i + BATCH_SIZE);
          console.log(`📦 Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(contacts.length / BATCH_SIZE)}`);
          
          const batchPreviews = await Promise.all(
            batch.map(async (contact) => {
              try {
                const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    model: 'google/gemini-2.5-flash',
                    messages: [
                      { role: 'system', content: promptData.system_prompt },
                      { 
                        role: 'user', 
                        content: JSON.stringify({
                          name: contact.name || '',
                          company_name: contact.company_name || ''
                        })
                      }
                    ],
                    tools: [{
                      type: 'function',
                      function: {
                        name: 'set_aliases',
                        parameters: {
                          type: 'object',
                          properties: {
                            alias: { type: 'string' },
                            company_alias: { type: 'string' }
                          },
                          required: ['alias', 'company_alias'],
                          additionalProperties: false
                        }
                      }
                    }],
                    tool_choice: { type: 'function', function: { name: 'set_aliases' } }
                  }),
                });

                if (!response.ok) {
                  console.error(`❌ Errore AI per ${contact.id}:`, response.status);
                  return {
                    id: contact.id,
                    name: contact.name,
                    company_name: contact.company_name,
                    current_alias: contact.alias,
                    current_company_alias: contact.company_alias,
                    new_alias: null,
                    new_company_alias: null,
                    error: 'Errore AI'
                  };
                }

                const aiResult = await response.json();
                const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
                
                if (!toolCall) {
                  return {
                    id: contact.id,
                    name: contact.name,
                    company_name: contact.company_name,
                    current_alias: contact.alias,
                    current_company_alias: contact.company_alias,
                    new_alias: null,
                    new_company_alias: null,
                    error: 'Nessuna risposta AI'
                  };
                }

                const aliases = JSON.parse(toolCall.function.arguments);

                return {
                  id: contact.id,
                  name: contact.name,
                  company_name: contact.company_name,
                  current_alias: contact.alias,
                  current_company_alias: contact.company_alias,
                  new_alias: aliases.alias,
                  new_company_alias: aliases.company_alias,
                  error: null
                };
              } catch (error) {
                console.error(`❌ Errore processing ${contact.id}:`, error);
                return {
                  id: contact.id,
                  name: contact.name,
                  company_name: contact.company_name,
                  current_alias: contact.alias,
                  current_company_alias: contact.company_alias,
                  new_alias: null,
                  new_company_alias: null,
                  error: 'Errore elaborazione'
                };
              }
            })
          );
          
          allPreviews.push(...batchPreviews);
        }

        result = { 
          success: true, 
          previews: allPreviews,
          total: contacts.length
        };
        break;
      }

      case 'apply_aliases': {
        const { previews } = data;
        
        console.log(`💾 Applicazione ${previews.length} alias`);

        const updates = await Promise.all(
          previews.map(async (preview: any) => {
            if (!preview.new_alias || !preview.new_company_alias) {
              return null;
            }

            try {
              const { error } = await supabaseClient
                .from('imported_contacts')
                .update({
                  alias: preview.new_alias,
                  company_alias: preview.new_company_alias
                })
                .eq('id', preview.id);

              if (error) {
                console.error(`❌ Errore update ${preview.id}:`, error);
                return null;
              }

              return preview.id;
            } catch (error) {
              console.error(`❌ Errore ${preview.id}:`, error);
              return null;
            }
          })
        );

        const successCount = updates.filter(id => id !== null).length;
        
        result = { 
          success: true, 
          updated_count: successCount,
          message: `${successCount}/${previews.length} alias applicati`
        };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log('✅ CRM Action completed:', result);

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Error in ai-crm-manager:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
