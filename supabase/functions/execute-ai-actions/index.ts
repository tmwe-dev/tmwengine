import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { log_id } = await req.json();

    if (!log_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: log_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Recupera log
    const { data: log, error: logError } = await supabase
      .from('email_ai_execution_log')
      .select('*')
      .eq('id', log_id)
      .single();

    if (logError || !log) {
      console.error('Log not found:', logError);
      return new Response(
        JSON.stringify({ error: 'Execution log not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!log.proposed_actions || log.proposed_actions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No actions to execute' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const executedActions = [];
    const errors = [];

    // Esegui azioni
    for (const action of log.proposed_actions) {
      try {
        console.log('Executing action:', action.type, 'for email:', log.email_uid);

        switch (action.type) {
          case 'archive':
            const { error: archiveError } = await supabase
              .from('email_messages')
              .update({ cartella: 'Archive' })
              .eq('uid', log.email_uid);

            if (archiveError) throw archiveError;
            executedActions.push({ type: 'archive', success: true });
            break;

          case 'move_to_folder':
            const folderName = action.params?.folder_name || 'Archive';
            const { error: moveError } = await supabase
              .from('email_messages')
              .update({ cartella: folderName })
              .eq('uid', log.email_uid);

            if (moveError) throw moveError;
            executedActions.push({ type: 'move_to_folder', folder: folderName, success: true });
            break;

          case 'delete':
            const { error: deleteError } = await supabase
              .from('email_messages')
              .update({ stato: 'eliminato' })
              .eq('uid', log.email_uid);

            if (deleteError) throw deleteError;
            executedActions.push({ type: 'delete', success: true });
            break;

          case 'mark_urgent':
            const { error: flagError } = await supabase
              .from('email_messages')
              .update({ flagged: true })
              .eq('uid', log.email_uid);

            if (flagError) throw flagError;
            executedActions.push({ type: 'mark_urgent', success: true });
            break;

          case 'forward':
            console.warn('Forward action not implemented yet');
            errors.push({ type: 'forward', error: 'Not implemented' });
            break;

          case 'reply':
            console.warn('Reply action not implemented yet');
            errors.push({ type: 'reply', error: 'Not implemented' });
            break;

          default:
            console.warn('Unknown action type:', action.type);
            errors.push({ type: action.type, error: 'Unknown action' });
        }
      } catch (actionError: any) {
        console.error(`Error executing ${action.type}:`, actionError);
        errors.push({ type: action.type, error: actionError.message });
      }
    }

    // Update log
    const finalStatus = errors.length === 0 ? 'executed' : 'failed';
    const errorMessage = errors.length > 0 ? JSON.stringify(errors) : null;

    const { error: updateError } = await supabase
      .from('email_ai_execution_log')
      .update({
        status: finalStatus,
        executed_at: new Date().toISOString(),
        error_message: errorMessage
      })
      .eq('id', log_id);

    if (updateError) {
      console.error('Error updating log:', updateError);
    }

    // Update prompt stats
    if (log.prompt_id) {
      const currentPrompt = await supabase
        .from('email_sender_ai_prompts')
        .select('success_count, failure_count')
        .eq('id', log.prompt_id)
        .single();

      if (currentPrompt.data) {
        const counterField = errors.length === 0 ? 'success_count' : 'failure_count';
        const newValue = (currentPrompt.data[counterField] || 0) + 1;
        
        await supabase
          .from('email_sender_ai_prompts')
          .update({ 
            [counterField]: newValue,
            last_executed_at: new Date().toISOString()
          })
          .eq('id', log.prompt_id);
      }
    }

    return new Response(
      JSON.stringify({
        success: errors.length === 0,
        executed_actions: executedActions,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});