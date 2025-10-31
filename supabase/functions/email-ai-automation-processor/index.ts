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

    console.log(`📧 Processing email from: ${sender_email}`);

    // ============================================
    // STEP 1: Find AI prompt configuration + Library
    // ============================================
    const { data: promptConfig, error: promptError } = await supabase
      .from('email_sender_ai_prompts')
      .select(`
        *,
        prompt_library:prompt_library_id (
          system_prompt,
          default_actions,
          requires_email_templates,
          requires_contact_aliases,
          requires_company_data,
          suggested_temperature,
          suggested_max_tokens
        )
      `)
      .eq('sender_email', sender_email)
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .limit(1)
      .single();

    if (promptError || !promptConfig) {
      console.log('❌ No AI prompt found for sender:', sender_email);
      return new Response(
        JSON.stringify({ message: 'No automation configured for this sender' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // STEP 2: Build Complete Prompt (Library + Custom)
    // ============================================
    let finalPrompt = promptConfig.ai_prompt || '';
    let requiresTemplates = promptConfig.use_email_templates;
    let requiresAliases = promptConfig.use_contact_aliases;
    let requiresCompanyData = promptConfig.use_company_data;
    let suggestedTemp = 0.7;
    let suggestedMaxTokens = 1500;

    // Se usa prompt library, usa quello come base
    if (promptConfig.prompt_library) {
      finalPrompt = promptConfig.prompt_library.system_prompt;
      requiresTemplates = promptConfig.prompt_library.requires_email_templates;
      requiresAliases = promptConfig.prompt_library.requires_contact_aliases;
      requiresCompanyData = promptConfig.prompt_library.requires_company_data;
      suggestedTemp = promptConfig.prompt_library.suggested_temperature || 0.7;
      suggestedMaxTokens = promptConfig.prompt_library.suggested_max_tokens || 1500;

      // Aggiungi customizzazioni sender-specific
      if (promptConfig.custom_prompt_additions) {
        finalPrompt += '\n\n--- ISTRUZIONI ADDIZIONALI PER QUESTO SENDER ---\n';
        finalPrompt += promptConfig.custom_prompt_additions;
      }

      console.log('✅ Using prompt library:', promptConfig.prompt_library_id);

      // Increment usage count
      await supabase.rpc('increment_prompt_library_usage', { 
        prompt_id: promptConfig.prompt_library_id 
      });
    }

    // ============================================
    // STEP 3: Context Injection
    // ============================================
    const contextData: any = {
      sender_email,
      email_subject: email_subject || 'No subject',
      email_body_preview: email_body?.substring(0, 1000) || 'No body',
    };

    // Recupera contact aliases se necessario
    if (requiresAliases) {
      const { data: contatto } = await supabase
        .from('rubrica')
        .select('nome, azienda, email')
        .or(`email.eq.${sender_email},email_aziendale.eq.${sender_email}`)
        .single();

      if (contatto) {
        contextData.contact_info = {
          nome: contatto.nome,
          azienda: contatto.azienda,
          saluto_formale: `Gentile ${contatto.nome}`,
        };
        console.log('✅ Contact aliases injected');
      }
    }

    // Recupera company data se necessario
    if (requiresCompanyData && contextData.contact_info?.azienda) {
      contextData.company_data = {
        ragione_sociale: contextData.contact_info.azienda,
        alias: contextData.contact_info.azienda.split(' ')[0],
      };
      console.log('✅ Company data injected');
    }

    // Recupera user preferences
    const { data: userConfig } = await supabase
      .from('config_generale')
      .select('email_utente, nome_utente, cognome_utente, ruolo_utente')
      .single();

    if (userConfig) {
      contextData.user_info = {
        email: userConfig.email_utente,
        nome: userConfig.nome_utente,
        cognome: userConfig.cognome_utente,
        ruolo: userConfig.ruolo_utente,
      };
    }

    // ============================================
    // STEP 4: Get AI Config
    // ============================================
    let aiConfig = null;
    if (promptConfig.ai_config_id) {
      const { data: config } = await supabase
        .from('config_ai')
        .select('*')
        .eq('id', promptConfig.ai_config_id)
        .single();
      
      aiConfig = config;
    }

    // If no AI config, use default (first active)
    if (!aiConfig) {
      const { data: defaultConfig } = await supabase
        .from('config_ai')
        .select('*')
        .eq('attivo', true)
        .limit(1)
        .single();
      
      aiConfig = defaultConfig;
    }

    if (!aiConfig) {
      return new Response(
        JSON.stringify({ error: 'No active AI configuration found' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // STEP 5: Construct Enhanced AI Prompt
    // ============================================
    const systemPrompt = `${finalPrompt}

--- CONTESTO EMAIL ---
${JSON.stringify(contextData, null, 2)}

--- ISTRUZIONI OUTPUT ---
You are an email automation assistant. Analyze the email above and respond with a JSON object containing:
{
  "actions": [
    {
      "type": "archive" | "move_to_folder" | "forward" | "delete" | "reply" | "mark_urgent",
      "description": "Brief explanation of the action",
      "params": {} // Optional: folder name, forward addresses, template_id, etc.
    }
  ],
  "reasoning": "Your detailed reasoning for these actions. Explain WHY you're doing this based on the email content and available context.",
  "confidence": 85 // Confidence level 0-100
}

IMPORTANT:
- Use contact_info aliases when crafting replies (use saluto_formale for greetings)
- Consider user_info when determining urgency or forwarding decisions
- Be specific in your reasoning - explain what in the email triggered each action
- Return ONLY valid JSON, no additional text
`;

    // ============================================
    // STEP 6: Call AI Model
    // ============================================
    const aiProvider = aiConfig.provider || 'openai';
    const model = aiConfig.modello || 'gpt-4o-mini';
    const apiKey = aiConfig.api_key || Deno.env.get('OPENAI_API_KEY');

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
          { role: 'user', content: `Analyze this email and propose actions.` }
        ],
        temperature: suggestedTemp,
        max_tokens: suggestedMaxTokens,
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

    // ============================================
    // STEP 7: Parse AI Response
    // ============================================
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

    // ============================================
    // STEP 8: Save Execution Log
    // ============================================
    const { data: logData, error: logError } = await supabase
      .from('email_ai_execution_log')
      .insert({
        prompt_id: promptConfig.id,
        email_uid: email_uid,
        sender_email: sender_email,
        user_id: promptConfig.user_id,
        email_subject: email_subject,
        email_body_preview: contextData.email_body_preview,
        prompt_used: finalPrompt,
        context_injected: contextData,
        ai_config_used: { provider: aiProvider, model: model },
        ai_response: aiResponseText,
        ai_reasoning: proposal.reasoning,
        proposed_actions: proposal.actions,
        confidence: proposal.confidence || 0,
        status: promptConfig.requires_confirmation ? 'pending' : 'executed',
      })
      .select()
      .single();

    if (logError) {
      console.error('Error saving execution log:', logError);
    }

    // ============================================
    // STEP 9: Update Prompt Stats
    // ============================================
    const { error: updateError } = await supabase
      .from('email_sender_ai_prompts')
      .update({ 
        execution_count: (promptConfig.execution_count || 0) + 1,
        last_executed_at: new Date().toISOString()
      })
      .eq('id', promptConfig.id);

    if (updateError) {
      console.error('Error updating prompt stats:', updateError);
    }

    // ============================================
    // STEP 10: Return Response
    // ============================================
    console.log('✅ AI processing completed successfully');
    return new Response(
      JSON.stringify({
        success: true,
        log_id: logData?.id,
        requires_confirmation: promptConfig.requires_confirmation,
        proposal: proposal,
        context_used: {
          has_contact_info: !!contextData.contact_info,
          has_company_data: !!contextData.company_data,
          prompt_source: promptConfig.prompt_library ? 'library' : 'custom',
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
