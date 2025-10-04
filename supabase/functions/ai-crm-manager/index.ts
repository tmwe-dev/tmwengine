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
