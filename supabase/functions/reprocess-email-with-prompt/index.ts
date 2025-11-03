import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email_id, user_email, sender_email } = await req.json();

    console.log('🔄 Riprocessamento email con prompt custom:', { email_id, sender_email });

    if (!email_id || !user_email || !sender_email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email_id, user_email, sender_email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Leggi custom_prompt_additions da email_sender_ai_prompts
    const { data: promptData, error: promptError } = await supabase
      .from('email_sender_ai_prompts')
      .select('custom_prompt_additions, ai_prompt')
      .eq('sender_email', sender_email)
      .eq('is_active', true)
      .single();

    if (promptError && promptError.code !== 'PGRST116') { // Ignora "no rows"
      console.error('⚠️ Error loading custom prompt (non-fatal):', promptError);
    }

    const customPrompt = promptData?.custom_prompt_additions || null;
    console.log('📝 Custom prompt per mittente:', customPrompt ? `${customPrompt.substring(0, 50)}...` : 'Nessuno');

    // Step 2: Richiama classify-email-content-intelligent con custom prompt
    const { data: classificationData, error: classifyError } = await supabase.functions.invoke(
      'classify-email-content-intelligent',
      {
        body: { 
          email_id, 
          user_email,
          additional_instructions: customPrompt
        }
      }
    );

    if (classifyError) {
      console.error('❌ Error re-classifying email:', classifyError);
      throw classifyError;
    }

    console.log('✅ Email riclassificata con successo');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email riclassificata con prompt personalizzato',
        classification: classificationData
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('❌ Error in reprocess-email-with-prompt:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
