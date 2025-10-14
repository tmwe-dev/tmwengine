import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CognitiveBuffer {
  agent_id: string;
  agent_name: string;
  pending_context: string[];
  last_speak_time: number | null;
  priority_score: number;
  response_count: number;
}

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
    const cognitiveBuffers: CognitiveBuffer[] = barConfig.cognitive_buffers || [];
    const pauseBetweenTurns = barConfig.pause_between_turns_ms || 800;
    const enableDirectCall = barConfig.enable_direct_call_detection ?? true;

    console.log('🎯 Dynamic Orchestrator Config:', {
      strategy: turnStrategy,
      pause: pauseBetweenTurns,
      directCallEnabled: enableDirectCall,
      buffers: cognitiveBuffers.length
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
      cognitiveBuffers,
      userMessage
    );

    console.log('✅ Selected speaker:', selectedAgent);

    // 4. Update cognitive buffers
    const updatedBuffers = updateCognitiveBuffers(
      cognitiveBuffers,
      selectedAgent,
      userMessage,
      activeParticipants
    );

    await supabaseClient
      .from('chat_laboratory_bar_mode')
      .update({ cognitive_buffers: updatedBuffers })
      .eq('conversation_id', conversationId);

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
  buffers: CognitiveBuffer[],
  userMessage: string
): string {
  const activeAgents = participants.filter(p => p.type !== 'human' && p.is_active);
  
  if (activeAgents.length === 0) {
    throw new Error('No active AI agents available');
  }

  switch (strategy) {
    case 'ROUND_ROBIN':
      return roundRobinSelect(activeAgents, buffers);
    
    case 'SMART_PRIORITY':
      return smartPrioritySelect(activeAgents, buffers, userMessage);
    
    case 'INTERRUPT_BASED':
      return interruptBasedSelect(activeAgents, buffers);
    
    case 'RANDOM_30':
    default:
      // 30% random, 70% smart priority
      if (Math.random() < 0.3) {
        return activeAgents[Math.floor(Math.random() * activeAgents.length)].type;
      }
      return smartPrioritySelect(activeAgents, buffers, userMessage);
  }
}

function roundRobinSelect(agents: any[], buffers: CognitiveBuffer[]): string {
  // Select agent with least response_count
  const counts = agents.map(a => {
    const buffer = buffers.find(b => b.agent_id === a.type);
    return { type: a.type, count: buffer?.response_count || 0 };
  });
  
  counts.sort((a, b) => a.count - b.count);
  return counts[0].type;
}

function smartPrioritySelect(agents: any[], buffers: CognitiveBuffer[], userMessage: string): string {
  // Calculate priority based on:
  // 1. Time since last speak (40%)
  // 2. Relevance to message (30%)
  // 3. Pending context (20%)
  // 4. Response balance (10%)
  
  const now = Date.now();
  const scores = agents.map(a => {
    const buffer = buffers.find(b => b.agent_id === a.type);
    
    const timeSinceSpeak = buffer?.last_speak_time 
      ? (now - buffer.last_speak_time) / 60000 // minutes
      : 100; // high value if never spoke
    
    const relevanceScore = calculateRelevance(a.type, userMessage);
    const pendingScore = (buffer?.pending_context.length || 0) * 0.2;
    const balanceScore = 1 / (1 + (buffer?.response_count || 0));
    
    const totalScore = 
      timeSinceSpeak * 0.4 +
      relevanceScore * 0.3 +
      pendingScore * 0.2 +
      balanceScore * 0.1;
    
    return { type: a.type, score: totalScore };
  });
  
  scores.sort((a, b) => b.score - a.score);
  return scores[0].type;
}

function interruptBasedSelect(agents: any[], buffers: CognitiveBuffer[]): string {
  // Select agent with highest priority_score in buffer
  const scores = agents.map(a => {
    const buffer = buffers.find(b => b.agent_id === a.type);
    return { type: a.type, priority: buffer?.priority_score || 0 };
  });
  
  scores.sort((a, b) => b.priority - a.priority);
  return scores[0].type;
}

function calculateRelevance(agentType: string, message: string): number {
  const lowerMessage = message.toLowerCase();
  
  // Simple keyword-based relevance
  const keywords: { [key: string]: string[] } = {
    'chatgpt': ['code', 'programming', 'technical', 'algorithm', 'debug'],
    'claude': ['write', 'explain', 'analyze', 'creative', 'detailed'],
    'gemini': ['research', 'data', 'multi', 'video', 'image']
  };
  
  const agentKeywords = keywords[agentType] || [];
  let matchCount = 0;
  
  for (const keyword of agentKeywords) {
    if (lowerMessage.includes(keyword)) {
      matchCount++;
    }
  }
  
  return matchCount > 0 ? matchCount * 0.5 : 0.1; // Base score if no matches
}

function updateCognitiveBuffers(
  buffers: CognitiveBuffer[],
  selectedAgent: string,
  userMessage: string,
  participants: any[]
): CognitiveBuffer[] {
  const now = Date.now();
  const updatedBuffers = [...buffers];
  
  // Update or create buffer for selected agent
  let agentBuffer = updatedBuffers.find(b => b.agent_id === selectedAgent);
  
  if (!agentBuffer) {
    const agentInfo = participants.find(p => p.type === selectedAgent);
    agentBuffer = {
      agent_id: selectedAgent,
      agent_name: agentInfo?.name || selectedAgent,
      pending_context: [],
      last_speak_time: null,
      priority_score: 0,
      response_count: 0
    };
    updatedBuffers.push(agentBuffer);
  }
  
  // Update buffer
  agentBuffer.last_speak_time = now;
  agentBuffer.response_count += 1;
  agentBuffer.pending_context = []; // Clear after speaking
  agentBuffer.priority_score = 0; // Reset priority
  
  // Add context to other agents
  for (const buffer of updatedBuffers) {
    if (buffer.agent_id !== selectedAgent) {
      buffer.pending_context.push(userMessage);
      // Keep only last 3 messages
      if (buffer.pending_context.length > 3) {
        buffer.pending_context.shift();
      }
    }
  }
  
  return updatedBuffers;
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
