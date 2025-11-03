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
    const { email_id, user_email, custom_prompt } = await req.json();

    console.log('🔄 Riprocessamento email con prompt custom:', { email_id, custom_prompt: custom_prompt?.substring(0, 50) });

    if (!email_id || !user_email || !custom_prompt) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email_id, user_email, custom_prompt' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Salva custom_prompt in email_ai_classifications
    const { error: updateError } = await supabase
      .from('email_ai_classifications')
      .update({ 
        custom_prompt,
        updated_at: new Date().toISOString()
      })
      .eq('email_id', email_id)
      .eq('user_email', user_email);

    if (updateError) {
      console.error('❌ Error updating custom_prompt:', updateError);
      throw updateError;
    }

    console.log('✅ Custom prompt salvato');

    // Step 2: Richiama classify-email-content-intelligent
    const { data: classificationData, error: classifyError } = await supabase.functions.invoke(
      'classify-email-content-intelligent',
      {
        body: { 
          email_id, 
          user_email,
          // Il custom_prompt sarà letto dalla tabella all'interno della funzione
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
