import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { email_uid, sender_email, email_subject, email_body } = await req.json();

    if (!email_uid || !sender_email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email_uid, sender_email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Cerca prompt AI per questo mittente
    const { data: prompts, error: promptError } = await supabase
      .from('email_sender_ai_prompts')
      .select('*')
      .eq('sender_email', sender_email)
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .limit(1);

    if (promptError || !prompts || prompts.length === 0) {
      console.log('No active AI prompt found for sender:', sender_email);
      return new Response(
        JSON.stringify({ message: 'No automation configured for this sender' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = prompts[0];

    // Recupera configurazione AI
    const { data: aiConfig, error: configError } = await supabase
      .from('config_ai')
      .select('*')
      .eq('id', prompt.ai_config_id)
      .single();

    if (configError || !aiConfig) {
      console.error('AI config not found');
      return new Response(
        JSON.stringify({ error: 'AI configuration not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Costruisci context
    const context = {
      email_uid,
      sender_email,
      email_subject: email_subject || 'No subject',
      email_body_preview: email_body?.substring(0, 500) || 'No body'
    };

    const aiProvider = aiConfig.provider || 'openai';
    const model = aiConfig.model || 'gpt-4o-mini';
    const apiKey = aiConfig.api_key || Deno.env.get('OPENAI_API_KEY');

    const systemPrompt = `Sei un assistente AI per automazione email.

Analizza l'email ricevuta e segui queste istruzioni:
${prompt.ai_prompt}

IMPORTANTE: 
- Rispondi SEMPRE in formato JSON con questa struttura:
{
  "actions": [
    { "type": "archive|move_to_folder|forward|delete|reply|mark_urgent", "description": "...", "params": {} }
  ],
  "reasoning": "Spiega il tuo ragionamento...",
  "confidence": 85
}

- confidence deve essere un numero tra 0-100
- Spiega sempre il ragionamento dietro le azioni proposte`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Email da analizzare:
Mittente: ${sender_email}
Oggetto: ${context.email_subject}
Corpo: ${context.email_body_preview}`
          }
        ],
        temperature: 0.3,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: `AI API error: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await response.json();
    const aiResponseText = aiData.choices[0].message.content;

    let proposal;
    try {
      proposal = JSON.parse(aiResponseText);
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', aiResponseText);
      return new Response(
        JSON.stringify({ error: 'AI returned invalid JSON response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Salva log
    const { data: logData, error: logError } = await supabase
      .from('email_ai_execution_log')
      .insert({
        prompt_id: prompt.id,
        email_uid: email_uid,
        sender_email: sender_email,
        user_id: prompt.user_id,
        email_subject: email_subject,
        email_body_preview: context.email_body_preview,
        prompt_used: prompt.ai_prompt,
        context_injected: context,
        ai_config_used: { provider: aiProvider, model: model },
        ai_response: aiResponseText,
        ai_reasoning: proposal.reasoning,
        proposed_actions: proposal.actions,
        confidence: proposal.confidence || 0,
        status: prompt.requires_confirmation ? 'pending' : 'executed',
      })
      .select()
      .single();

    if (logError) {
      console.error('Error saving execution log:', logError);
    }

    // Update stats
    const { error: updateError } = await supabase
      .from('email_sender_ai_prompts')
      .update({ 
        execution_count: (prompt.execution_count || 0) + 1,
        last_executed_at: new Date().toISOString()
      })
      .eq('id', prompt.id);

    if (updateError) {
      console.error('Error updating prompt stats:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        log_id: logData?.id,
        requires_confirmation: prompt.requires_confirmation,
        proposal: proposal
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