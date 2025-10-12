import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to check if AI should skip responding based on conversation context
function checkIfShouldSkip(visibleHistory: string, userMessage: string, messagesCount: number): boolean {
  const recentMessages = visibleHistory.toLowerCase();
  
  // Skip if conversation is very short
  if (messagesCount < 3) return false;
  
  // Skip if user asked a question
  if (userMessage.includes('?')) return false;
  
  // Skip if recent messages show consensus/agreement
  const consensusKeywords = ['d\'accordo', 'concordo', 'esatto', 'proprio così', 'infatti', 'confermo'];
  const hasConsensus = consensusKeywords.some(keyword => recentMessages.includes(keyword));
  
  if (hasConsensus && Math.random() < 0.6) {
    console.log('⏭️ Saltando turno per consenso rilevato');
    return true;
  }
  
  return false;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversationId, userMessage, participants } = await req.json();
    console.log('📥 Chat Laboratory Orchestrator riceve:', { conversationId, userMessage, participants });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch API keys
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    const lovableAIKey = Deno.env.get('LOVABLE_API_KEY');

    if (!anthropicKey && !openAIKey && !lovableAIKey) {
      throw new Error('Nessuna chiave API configurata');
    }

    // Fetch conversation data
    const { data: conversation, error: convError } = await supabase
      .from('chat_laboratory_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError) throw convError;

    // Fetch active system prompt
    const { data: systemPrompts } = await supabase
      .from('chat_laboratory_system_prompts')
      .select('contenuto')
      .eq('attivo', true)
      .order('created_at', { ascending: false })
      .limit(1);

    const globalSystemPrompt = systemPrompts?.[0]?.contenuto || 
      "Sei un assistente AI intelligente che partecipa a discussioni costruttive.";

    // Fetch conversation messages
    const { data: messages } = await supabase
      .from('chat_laboratory_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    const historyMessages = (messages || []).map((msg: any) => ({
      role: msg.sender_type === 'user' ? 'user' : 'assistant',
      content: `[${msg.sender_name}]: ${msg.content}`
    }));

    const visibleHistory = historyMessages
      .map((m: any) => m.content)
      .join('\n');

    // Turn-taking logic
    let currentTurnIndex = conversation.current_turn_index || 0;
    const lastSpeakerIndex = conversation.last_speaker_index || 0;
    
    // 30% chance of randomization
    if (Math.random() < 0.3) {
      currentTurnIndex = Math.floor(Math.random() * participants.length);
      console.log('🎲 Turno randomizzato:', currentTurnIndex);
    } else {
      currentTurnIndex = (lastSpeakerIndex + 1) % participants.length;
      console.log('➡️ Turno sequenziale:', currentTurnIndex);
    }

    const selectedParticipant = participants[currentTurnIndex];
    console.log('🎯 Partecipante selezionato:', selectedParticipant.name);

    // Check if should skip
    const shouldSkip = checkIfShouldSkip(visibleHistory, userMessage, messages?.length || 0);
    
    if (shouldSkip) {
      await supabase
        .from('chat_laboratory_messages')
        .insert({
          conversation_id: conversationId,
          sender_type: 'ai',
          sender_name: selectedParticipant.name,
          content: '...',
          is_visible_to_ai: false
        });

      await supabase
        .from('chat_laboratory_conversations')
        .update({ 
          last_speaker_index: currentTurnIndex,
          current_turn_index: (currentTurnIndex + 1) % participants.length
        })
        .eq('id', conversationId);

      return new Response(
        JSON.stringify({ 
          success: true, 
          skipped: true,
          message: `${selectedParticipant.name} ha scelto di non rispondere` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare conversation history for AI
    const conversationHistory = [
      { role: 'system', content: globalSystemPrompt },
      ...historyMessages,
      { role: 'user', content: userMessage }
    ];

    let aiResponse = '';
    let tokenInput = 0;
    let tokenOutput = 0;
    const startTime = Date.now();

    // Route to appropriate AI provider
    if ((selectedParticipant.type === 'anthropic' || selectedParticipant.type === 'claude') && anthropicKey) {
      console.log('🤖 Calling Anthropic (Claude)...');
      const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 8096,
          messages: conversationHistory.filter(m => m.role !== 'system'),
          system: globalSystemPrompt
        })
      });

      if (!anthropicResponse.ok) {
        throw new Error(`Anthropic API error: ${anthropicResponse.statusText}`);
      }

      const anthropicData = await anthropicResponse.json();
      aiResponse = anthropicData.content[0].text;
      tokenInput = anthropicData.usage?.input_tokens || 0;
      tokenOutput = anthropicData.usage?.output_tokens || 0;
    } 
    else if ((selectedParticipant.type === 'openai' || selectedParticipant.type === 'chatgpt') && openAIKey) {
      console.log('🤖 Calling OpenAI (GPT)...');
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAIKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: conversationHistory,
          max_tokens: 4096
        })
      });

      if (!openaiResponse.ok) {
        throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
      }

      const openaiData = await openaiResponse.json();
      aiResponse = openaiData.choices[0].message.content;
      tokenInput = openaiData.usage?.prompt_tokens || 0;
      tokenOutput = openaiData.usage?.completion_tokens || 0;
    }
    else if (lovableAIKey) {
      const model = 'google/gemini-2.5-flash';
      console.log('🤖 Calling Lovable AI (Gemini)...');

      const fullPrompt = `${globalSystemPrompt}

Conversazione finora:
${visibleHistory}

Nuovo messaggio dell'utente:
${userMessage}`;

      const lovableResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableAIKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: fullPrompt }],
        }),
      });

      if (!lovableResponse.ok) {
        const errorText = await lovableResponse.text();
        console.error(`❌ AI Gateway Error (${model}):`, lovableResponse.status, errorText);
        
        if (lovableResponse.status === 429) {
          throw new Error('Rate limit superato. Riprova tra qualche istante.');
        }
        if (lovableResponse.status === 402) {
          throw new Error('Crediti AI esauriti. Aggiungi crediti al tuo workspace.');
        }
        throw new Error(`AI Gateway error ${lovableResponse.status}: ${errorText}`);
      }

      const lovableData = await lovableResponse.json();
      aiResponse = lovableData.choices[0].message.content;
      tokenInput = lovableData.usage?.prompt_tokens || 0;
      tokenOutput = lovableData.usage?.completion_tokens || 0;
    }
    else {
      throw new Error(`No API key available for ${selectedParticipant.type}`);
    }

    const responseTime = Date.now() - startTime;
    console.log(`✅ Risposta ricevuta in ${responseTime}ms`);

    // Save AI response to database
    await supabase
      .from('chat_laboratory_messages')
      .insert({
        conversation_id: conversationId,
        sender_type: 'ai',
        sender_name: selectedParticipant.name,
        content: aiResponse,
        token_input: tokenInput,
        token_output: tokenOutput,
        tempo_risposta_ms: responseTime
      });

    // Update conversation turn index
    await supabase
      .from('chat_laboratory_conversations')
      .update({ 
        last_speaker_index: currentTurnIndex,
        current_turn_index: (currentTurnIndex + 1) % participants.length
      })
      .eq('id', conversationId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        content: aiResponse,
        speaker: selectedParticipant.name,
        tokens: { input: tokenInput, output: tokenOutput },
        responseTime 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Orchestrator error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
