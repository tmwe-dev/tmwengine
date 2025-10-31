import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { email_uid, sender_email, email_subject, email_body } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Cerca prompt AI attivi per questo sender
    const { data: prompts, error: promptError } = await supabase
      .from('email_sender_ai_prompts')
      .select('*, config_ai!inner(*)')
      .eq('sender_email', sender_email)
      .eq('is_active', true)
      .order('priority', { ascending: true })
      .limit(1);

    if (promptError || !prompts || prompts.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Nessun prompt configurato per questo sender' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = prompts[0];
    const aiConfig = prompt.config_ai;

    // 2. Costruisci context
    let context: any = {};

    if (prompt.use_contact_aliases) {
      const { data: contact } = await supabase
        .from('rubrica')
        .select('nome, azienda, alias, company_alias')
        .ilike('email', sender_email)
        .single();
      if (contact) {
        context.contact = {
          name: contact.alias || contact.nome,
          company: contact.company_alias || contact.azienda,
        };
      }
    }

    if (prompt.use_email_templates) {
      const { data: templates } = await supabase
        .from('email_template')
        .select('nome_template, oggetto, corpo')
        .limit(5);
      context.templates = templates || [];
    }

    // 3. Chiama Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const systemPrompt = `${prompt.ai_prompt}

IMPORTANTE: Devi SEMPRE:
1. Analizzare l'email ricevuta
2. Spiegare il tuo ragionamento in dettaglio
3. Proporre azioni specifiche
4. Chiedere conferma all'utente

Context disponibile: ${JSON.stringify(context)}

Rispondi in JSON con questo formato:
{
  "reasoning": "Spiegazione dettagliata della tua analisi",
  "actions": [
    { "type": "archive|forward|reply|move_to_folder", "description": "Cosa farai", "params": {...} }
  ],
  "confidence": 85
}`;

    console.log('Calling AI with model:', aiConfig.modello);

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: aiConfig.modello,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analizza questa email:\n\nOggetto: ${email_subject}\n\nCorpo:\n${email_body.substring(0, 2000)}` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI error:', aiResponse.status, errorText);
      throw new Error(`AI Gateway error: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const proposal = JSON.parse(aiData.choices[0].message.content);

    // 4. Salva log esecuzione
    const { data: logEntry, error: logError } = await supabase
      .from('email_ai_execution_log')
      .insert({
        prompt_id: prompt.id,
        email_uid,
        sender_email,
        user_id: prompt.user_id,
        email_subject,
        email_body_preview: email_body.substring(0, 500),
        prompt_used: prompt.ai_prompt,
        context_injected: context,
        ai_config_used: { provider: aiConfig.provider, model: aiConfig.modello },
        ai_response: JSON.stringify(proposal),
        ai_reasoning: proposal.reasoning,
        proposed_actions: proposal.actions,
        confidence: proposal.confidence / 100,
        status: prompt.requires_confirmation ? 'pending' : 'confirmed',
      })
      .select()
      .single();

    if (logError) {
      console.error('Log error:', logError);
    }

    // 5. Update statistiche prompt
    await supabase
      .from('email_sender_ai_prompts')
      .update({
        execution_count: prompt.execution_count + 1,
        last_executed_at: new Date().toISOString(),
      })
      .eq('id', prompt.id);

    return new Response(
      JSON.stringify({
        log_id: logEntry?.id,
        proposal,
        requires_confirmation: prompt.requires_confirmation,
        prompt_name: prompt.prompt_name,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
