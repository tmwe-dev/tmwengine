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
    const { 
      message, 
      context_type,
      sender_email,
      email_uid,
      email_subject,
      email_body,
      conversation_history,
      selected_agent = 'gemini'  // 🆕 Default: gemini
    } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`🎨 AI Canvas request - Context: ${context_type}`);

    // ============================================
    // STEP 1: Build Context Data
    // ============================================
    const contextData: any = {
      context_type,
      user_message: message,
    };

    // Inject sender context if provided
    if (sender_email) {
      contextData.sender_email = sender_email;

      // Get contact info
      const { data: contatto } = await supabase
        .from('rubrica')
        .select('nome, azienda, email')
        .or(`email.eq.${sender_email},email_aziendale.eq.${sender_email}`)
        .single();

      if (contatto) {
        contextData.contact_info = {
          nome: contatto.nome,
          azienda: contatto.azienda,
        };
      }

      // Get AI prompts for this sender
      const { data: prompts } = await supabase
        .from('email_sender_ai_prompts')
        .select('prompt_name, ai_prompt, custom_prompt_additions')
        .eq('sender_email', sender_email)
        .eq('is_active', true);

      if (prompts && prompts.length > 0) {
        contextData.existing_automations = prompts.map(p => ({
          name: p.prompt_name,
          description: p.ai_prompt?.substring(0, 100),
        }));
      }
    }

    // Inject email context if provided
    if (email_uid) {
      contextData.email = {
        uid: email_uid,
        subject: email_subject,
        body_preview: email_body?.substring(0, 500),
      };
    }

    // ============================================
    // STEP 2: Get AI Config based on selected agent
    // ============================================
    const agentToProviderMap: Record<string, string> = {
      'gpt': 'openai',
      'gemini': 'google',
      'claude': 'anthropic'
    };

    const targetProvider = agentToProviderMap[selected_agent] || 'google';
    console.log('🤖 Selected agent:', selected_agent, '→ Provider:', targetProvider);

    let aiConfig = null;
    const { data: configData } = await supabase
      .from('config_ai')
      .select('*')
      .eq('attivo', true)
      .eq('provider', targetProvider)
      .maybeSingle();

    aiConfig = configData;

    // Fallback to Gemini if provider not available
    if (!aiConfig) {
      console.warn(`⚠️ Provider ${targetProvider} non disponibile, fallback a Gemini`);
      
      const { data: fallbackConfig } = await supabase
        .from('config_ai')
        .select('*')
        .eq('attivo', true)
        .eq('provider', 'google')
        .maybeSingle();
      
      aiConfig = fallbackConfig;
    }

    if (!aiConfig) {
      return new Response(
        JSON.stringify({ error: 'No active AI configuration found' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Using AI:', { provider: aiConfig.provider, model: aiConfig.modello });

    // ============================================
    // STEP 3: Build System Prompt
    // ============================================
    const systemPrompt = `You are an AI assistant integrated into an email management system.

CONTEXT PROVIDED:
${JSON.stringify(contextData, null, 2)}

YOUR CAPABILITIES:
1. Analyze emails and suggest actions
2. Create automation rules for specific senders
3. Draft professional responses
4. Provide insights on email patterns
5. Help organize and manage correspondence

INTERACTION STYLE:
- Be concise and actionable
- Explain your reasoning when proposing actions
- Ask clarifying questions when needed
- Use context information to personalize responses
- When suggesting automations, provide clear JSON action structures

RESPONSE FORMAT:
- For general questions: Provide helpful answers
- For action requests: Return structured JSON with:
  {
    "explanation": "Brief explanation",
    "proposed_actions": [
      { "type": "archive|move|forward|reply", "description": "...", "params": {} }
    ],
    "confidence": 85,
    "requires_confirmation": true
  }

IMPORTANT:
- If context includes existing_automations, reference them when relevant
- Use contact_info to personalize suggestions
- Be transparent about what you can and cannot do
`;

    // ============================================
    // STEP 4: Call AI Model
    // ============================================
    const aiProvider = aiConfig.provider || 'openai';
    const model = aiConfig.modello || 'gpt-4o-mini';
    const apiKey = aiConfig.api_key || Deno.env.get('OPENAI_API_KEY');

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(conversation_history || []),
      { role: 'user', content: message }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1500,
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
    const aiResponse = aiData.choices[0].message.content;

    // ============================================
    // STEP 5: Try to parse as structured action
    // ============================================
    let structuredResponse = null;
    try {
      // Check if response contains JSON
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        structuredResponse = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.log('Response is not structured JSON, treating as plain text');
    }

    console.log('✅ AI Canvas response generated');

    return new Response(
      JSON.stringify({
        success: true,
        response: aiResponse,
        structured_response: structuredResponse,
        context_used: {
          type: context_type,
          has_sender_context: !!sender_email,
          has_email_context: !!email_uid,
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
