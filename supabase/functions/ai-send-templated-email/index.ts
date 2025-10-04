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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { template_id, rubrica_id, to_email, custom_data } = await req.json();

    console.log('📧 AI Send Templated Email:', { template_id, rubrica_id, to_email });

    // Fetch template
    const { data: template, error: templateError } = await supabaseClient
      .from('email_templates')
      .select('*')
      .eq('id', template_id)
      .eq('attivo', true)
      .single();

    if (templateError || !template) {
      throw new Error(`Template non trovato o non attivo: ${template_id}`);
    }

    // Fetch rubrica data if provided
    let rubricaData = custom_data || {};
    if (rubrica_id) {
      const { data: rubrica, error: rubricaError } = await supabaseClient
        .from('rubrica')
        .select('*')
        .eq('id', rubrica_id)
        .single();

      if (rubricaError) {
        throw new Error(`Contatto non trovato: ${rubrica_id}`);
      }

      rubricaData = { ...rubrica, ...custom_data };
    }

    // Compile template with placeholders
    let subject = template.oggetto;
    let body = template.contenuto;

    // Replace placeholders
    const placeholders = template.placeholder_disponibili || [];
    placeholders.forEach((placeholder: string) => {
      const value = rubricaData[placeholder] || `[${placeholder}]`;
      const regex = new RegExp(`{{${placeholder}}}`, 'g');
      subject = subject.replace(regex, value);
      body = body.replace(regex, value);
    });

    // Call tmwe-email-send function
    const { data: sendResult, error: sendError } = await supabaseClient.functions.invoke(
      'tmwe-email-send',
      {
        body: {
          to: to_email,
          subject: subject,
          body: body,
          body_html: body.replace(/\n/g, '<br>')
        }
      }
    );

    if (sendError) {
      throw sendError;
    }

    console.log('✅ Email inviata con successo:', sendResult);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email inviata con successo',
        template_used: template.nome,
        subject: subject,
        to: to_email,
        send_result: sendResult
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Errore invio email:', error);
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
