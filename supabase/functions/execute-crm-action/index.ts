// ============================================
// EXECUTE CRM ACTION - SPRINT 2
// Esegue azioni CRM richieste dall'AI
// ============================================

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CRMActionRequest {
  action: 'create_task' | 'create_meeting' | 'create_call' | 'update_contact' | 'add_tag' | 'link_to_campaign';
  params: any;
  sender_email: string; // Primary input: sender email
  contact_email?: string; // Legacy: optional for backward compatibility
  user_id: string;
  ai_confidence?: number;
  ai_reasoning?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { action, params, sender_email, contact_email, user_id, ai_confidence, ai_reasoning }: CRMActionRequest = await req.json();

    // Use sender_email as primary, fall back to contact_email for legacy
    const emailAddress = sender_email || contact_email;
    
    if (!emailAddress) {
      throw new Error('sender_email or contact_email is required');
    }

    console.log(`[CRM Action] Executing action: ${action} for ${emailAddress}`);

    // Step 1: OPTIONAL - Try to link to rubrica contact if exists
    let rubrica_id: string | null = null;

    const { data: existingContact } = await supabaseClient
      .from('rubrica')
      .select('id')
      .eq('email', emailAddress)
      .maybeSingle();

    if (existingContact) {
      rubrica_id = existingContact.id;
      console.log(`[CRM Action] ✅ Linked to existing rubrica contact: ${rubrica_id}`);
    } else {
      console.log(`[CRM Action] ⚠️ No rubrica contact found - creating activity without rubrica link`);
    }

    // Step 2: Execute specific action
    let result = null;
    let errorMessage = null;

    try {
      switch (action) {
        case 'create_task': {
          const { data, error } = await supabaseClient
            .from('attivita')
            .insert({
              rubrica_id,
              sender_email: emailAddress,
              tipo: 'task',
              descrizione: params.description || 'Task creato dall\'AI',
              stato: 'aperta',
              scadenza: params.deadline || null,
              priorita: params.priority || 'media',
              creato_da: user_id,
              created_by_ai: true,
              ai_confidence,
              ai_reasoning,
            })
            .select()
            .single();

          if (error) throw error;
          result = data;
          console.log(`[CRM Action] ✅ Task created: ${data.id}`);
          break;
        }

        case 'create_meeting': {
          const { data, error } = await supabaseClient
            .from('attivita')
            .insert({
              rubrica_id,
              sender_email: emailAddress,
              tipo: 'meeting',
              descrizione: params.description || 'Meeting creato dall\'AI',
              stato: 'aperta',
              scadenza: params.date_time || null,
              priorita: 'alta',
              note: params.location || null,
              creato_da: user_id,
              created_by_ai: true,
              ai_confidence,
              ai_reasoning,
            })
            .select()
            .single();

          if (error) throw error;
          result = data;
          console.log(`[CRM Action] ✅ Meeting created: ${data.id}`);
          break;
        }

        case 'create_call': {
          const { data, error } = await supabaseClient
            .from('attivita')
            .insert({
              rubrica_id,
              sender_email: emailAddress,
              tipo: 'chiamata',
              descrizione: params.reason || 'Chiamata programmata dall\'AI',
              stato: 'aperta',
              scadenza: params.scheduled_time || null,
              priorita: params.priority || 'media',
              creato_da: user_id,
              created_by_ai: true,
              ai_confidence,
              ai_reasoning,
            })
            .select()
            .single();

          if (error) throw error;
          result = data;
          console.log(`[CRM Action] ✅ Call created: ${data.id}`);
          break;
        }

        case 'update_contact': {
          // Only allow update if rubrica contact exists
          if (!rubrica_id) {
            console.log('[CRM Action] ⚠️ Skipping update_contact - no rubrica contact found');
            result = { skipped: true, reason: 'No rubrica contact to update' };
            break;
          }

          // Get existing notes
          const { data: contact } = await supabaseClient
            .from('rubrica')
            .select('note')
            .eq('id', rubrica_id)
            .single();

          const existingNotes = contact?.note || '';
          const timestamp = new Date().toISOString();
          const newNote = `[${timestamp}] AI: ${params.note}\n`;

          const { data, error } = await supabaseClient
            .from('rubrica')
            .update({
              note: existingNotes + newNote,
            })
            .eq('id', rubrica_id)
            .select()
            .single();

          if (error) throw error;
          result = data;
          console.log(`[CRM Action] ✅ Contact notes updated: ${rubrica_id}`);
          break;
        }

        case 'add_tag': {
          // Only allow tag if rubrica contact exists
          if (!rubrica_id) {
            console.log('[CRM Action] ⚠️ Skipping add_tag - no rubrica contact found');
            result = { skipped: true, reason: 'No rubrica contact to tag' };
            break;
          }

          // Get existing tags
          const { data: contact } = await supabaseClient
            .from('rubrica')
            .select('tag')
            .eq('id', rubrica_id)
            .single();

          const existingTags = contact?.tag || [];
          const newTag = params.tag;

          if (!existingTags.includes(newTag)) {
            const { data, error } = await supabaseClient
              .from('rubrica')
              .update({
                tag: [...existingTags, newTag],
              })
              .eq('id', rubrica_id)
              .select()
              .single();

            if (error) throw error;
            result = data;
            console.log(`[CRM Action] ✅ Tag added: ${newTag}`);
          } else {
            result = { message: 'Tag already exists' };
            console.log(`[CRM Action] ℹ️ Tag already exists: ${newTag}`);
          }
          break;
        }

        case 'link_to_campaign': {
          // Only allow campaign link if rubrica contact exists
          if (!rubrica_id) {
            console.log('[CRM Action] ⚠️ Skipping link_to_campaign - no rubrica contact found');
            result = { skipped: true, reason: 'No rubrica contact to link' };
            break;
          }

          // Create activity linked to campaign
          const { data: activity, error: activityError } = await supabaseClient
            .from('attivita')
            .insert({
              rubrica_id,
              sender_email: emailAddress,
              tipo: 'email',
              descrizione: params.campaign_note || 'Collegato a campagna',
              stato: 'aperta',
              campagna_id: params.campaign_id,
              creato_da: user_id,
              created_by_ai: true,
              ai_confidence,
              ai_reasoning,
            })
            .select()
            .single();

          if (activityError) throw activityError;

          result = activity;
          console.log(`[CRM Action] ✅ Linked to campaign: ${params.campaign_id}`);
          break;
        }

        default:
          throw new Error(`Unknown action: ${action}`);
      }

      // Log success in project_history
      await supabaseClient
        .from('project_history')
        .insert({
          operation: 'crm_action',
          tables_modified: ['attivita', 'rubrica'],
          metadata: {
            action,
            sender_email: emailAddress,
            ai_confidence,
            success: true,
          },
        });

    } catch (error: any) {
      errorMessage = error.message;
      console.error(`[CRM Action] ❌ Error executing action:`, error);
    }

    if (errorMessage) {
      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        action,
        rubrica_id,
        result,
        message: `Azione "${action}" eseguita con successo`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('[CRM Action] ❌ Fatal error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
