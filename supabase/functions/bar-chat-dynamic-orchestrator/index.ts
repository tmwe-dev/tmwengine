import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type TurnStrategy = 'RANDOM_30' | 'ROUND_ROBIN' | 'SMART_PRIORITY' | 'INTERRUPT_BASED';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { conversationId, userMessage, activeParticipants } = await req.json();

    if (!conversationId || !userMessage) {
      throw new Error('Missing required parameters');
    }

    // 1. Load Bar Mode config
    const { data: barConfig, error: configError } = await supabaseClient
      .from('chat_laboratory_bar_mode')
      .select('*')
      .eq('conversation_id', conversationId)
      .single();

    if (configError || !barConfig) {
      throw new Error('Bar Mode config not found');
    }

    const turnStrategy: TurnStrategy = barConfig.turn_strategy || 'RANDOM_30';
    const pauseBetweenTurns = barConfig.pause_between_turns_ms || 800;
    const enableDirectCall = barConfig.enable_direct_call_detection ?? true;

    console.log('🎯 Dynamic Orchestrator Config:', {
      strategy: turnStrategy,
      pause: pauseBetweenTurns,
      directCallEnabled: enableDirectCall
    });

    // 2. Detect direct call (@Agent)
    let targetAgent: string | null = null;
    if (enableDirectCall) {
      targetAgent = detectDirectCall(userMessage, activeParticipants);
      if (targetAgent) {
        console.log('📞 Direct call detected:', targetAgent);
      }
    }

    // 3. Select next speaker based on strategy
    const selectedAgent = targetAgent || selectNextSpeaker(
      turnStrategy,
      activeParticipants,
      userMessage
    );

    console.log('✅ Selected speaker:', selectedAgent);

    // 5. Pause between turns (simulate natural conversation flow)
    if (pauseBetweenTurns > 0) {
      await new Promise(resolve => setTimeout(resolve, pauseBetweenTurns));
    }

    // 6. Invoke AI provider for selected agent
    const response = await invokeAIProvider(
      selectedAgent,
      userMessage,
      conversationId,
      supabaseClient
    );

    return new Response(
      JSON.stringify({
        success: true,
        selectedAgent,
        response,
        strategy: turnStrategy
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Dynamic Orchestrator Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// ====== UTILITY FUNCTIONS ======

function detectDirectCall(message: string, participants: any[]): string | null {
  const lowerMessage = message.toLowerCase();
  
  for (const participant of participants) {
    const name = participant.name.toLowerCase();
    const patterns = [
      `@${name}`,
      `hey ${name}`,
      `hi ${name}`,
      `${name},`,
      `${name}:`
    ];
    
    for (const pattern of patterns) {
      if (lowerMessage.includes(pattern)) {
        return participant.type;
      }
    }
  }
  
  return null;
}

function selectNextSpeaker(
  strategy: TurnStrategy,
  participants: any[],
  userMessage: string
): string {
  const activeAgents = participants.filter(p => p.type !== 'human' && p.is_active);
  
  if (activeAgents.length === 0) {
    throw new Error('No active AI agents available');
  }

  switch (strategy) {
    case 'ROUND_ROBIN':
    case 'SMART_PRIORITY':
    case 'INTERRUPT_BASED':
    case 'RANDOM_30':
    default:
      // Simple random selection since buffers are removed
      return activeAgents[Math.floor(Math.random() * activeAgents.length)].type;
  }
}


async function invokeAIProvider(
  agentType: string,
  userMessage: string,
  conversationId: string,
  supabaseClient: any
): Promise<any> {
  // Load conversation history
  const { data: messages } = await supabaseClient
    .from('chat_laboratory_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(10);

  // Get AI config
  const { data: aiConfig } = await supabaseClient
    .from('config_ai')
    .select('*')
    .eq('attivo', true)
    .single();

  if (!aiConfig) {
    throw new Error('No active AI config found');
  }

  const provider = aiConfig.provider.toLowerCase();
  const apiKey = aiConfig.api_key;
  const model = aiConfig.modello;

  // Build messages array
  const conversationHistory = (messages || []).map((msg: any) => ({
    role: msg.sender_type === 'human' ? 'user' : 'assistant',
    content: msg.content
  }));

  conversationHistory.push({
    role: 'user',
    content: userMessage
  });

  // Call appropriate AI provider
  let response;
  
  if (provider === 'openai') {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model || 'gpt-4-turbo-preview',
        messages: conversationHistory,
        temperature: 0.7
      })
    });
  } else if (provider === 'anthropic') {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model || 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: conversationHistory
      })
    });
  } else {
    throw new Error(`Unsupported AI provider: ${provider}`);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API error: ${errorText}`);
  }

  const result = await response.json();
  
  // Extract response text based on provider
  let responseText: string;
  if (provider === 'openai') {
    responseText = result.choices[0].message.content;
  } else {
    responseText = result.content[0].text;
  }

  // Save message to database
  await supabaseClient
    .from('chat_laboratory_messages')
    .insert({
      conversation_id: conversationId,
      sender_type: agentType,
      sender_name: agentType === 'chatgpt' ? 'ChatGPT' : agentType === 'claude' ? 'Claude' : 'Gemini',
      content: responseText,
      is_visible_to_ai: true
    });

  return {
    text: responseText,
    agent: agentType
  };
}
