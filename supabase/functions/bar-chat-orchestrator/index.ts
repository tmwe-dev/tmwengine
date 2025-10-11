import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversationId, userMessage, participants } = await req.json();
    console.log('🍹 Bar Chat Orchestrator riceve:', { conversationId, userMessage, participants });

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

    // Fetch Bar Mode settings
    const { data: barModeSettings } = await supabase
      .from('chat_laboratory_bar_mode')
      .select('*')
      .eq('conversation_id', conversationId)
      .single();

    if (barModeSettings?.mode !== 'bar') {
      throw new Error('Questa funzione è dedicata alla modalità Bar Chat');
    }

    const selectedTopic = barModeSettings.selected_topic;
    const activeKbId = barModeSettings.active_kb_id;
    console.log('📌 Topic selezionato:', selectedTopic || 'Nessuno');
    console.log('📚 Knowledge Base attiva:', activeKbId || 'Nessuna');

    // Fetch conversation data
    const { data: conversation, error: convError } = await supabase
      .from('chat_laboratory_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError) throw convError;

    // Fetch global system prompt
    const { data: systemPrompts } = await supabase
      .from('chat_laboratory_system_prompts')
      .select('contenuto')
      .eq('attivo', true)
      .order('created_at', { ascending: false })
      .limit(1);

    const globalSystemPrompt = systemPrompts?.[0]?.contenuto || 
      "Sei un assistente AI intelligente che partecipa a discussioni costruttive in un bar virtuale.";

    // Fetch BASE sections (sempre attive)
    const { data: baseSections } = await supabase
      .from('chat_laboratory_prompt_sections')
      .select('content')
      .eq('section_type', 'BASE')
      .eq('is_active', true)
      .order('order_priority', { ascending: true });

    console.log(`📦 Sezioni BASE: ${baseSections?.length || 0}`);

    // Fetch TOPIC sections (solo se topic selezionato)
    let topicSections: any[] = [];
    if (selectedTopic) {
      const { data } = await supabase
        .from('chat_laboratory_prompt_sections')
        .select('content')
        .eq('section_type', 'TOPIC')
        .eq('is_active', true)
        .contains('topic_tags', [selectedTopic])
        .order('order_priority', { ascending: true });
      
      topicSections = data || [];
      console.log(`📦 Sezioni TOPIC (${selectedTopic}): ${topicSections.length}`);
    }

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

    // Turn-taking logic (1 agente per volta)
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
    console.log('🎯 Agente Bar Chat selezionato:', selectedParticipant.name);

    // Fetch AGENT_PERSONALITY sections (filtrate per nome agente)
    const { data: agentPersonalitySections } = await supabase
      .from('chat_laboratory_prompt_sections')
      .select('content')
      .eq('section_type', 'AGENT_PERSONALITY')
      .eq('is_active', true)
      .ilike('section_name', `%${selectedParticipant.name}%`)
      .order('order_priority', { ascending: true });

    console.log(`👤 Sezioni AGENT_PERSONALITY per ${selectedParticipant.name}: ${agentPersonalitySections?.length || 0}`);

    // Fallback su elevenlabs_agents.text_generation_prompt
    let agentTextPrompt = '';
    if (barModeSettings.active_elevenlabs_agents?.length > 0) {
      const matchingAgentId = barModeSettings.active_elevenlabs_agents.find((id: string) => {
        // Cerca agente con nome corrispondente
        return true; // Semplificato, puoi migliorare il matching
      });

      if (matchingAgentId) {
        const { data: agentData } = await supabase
          .from('elevenlabs_agents')
          .select('text_generation_prompt, name')
          .eq('id', matchingAgentId)
          .single();

        if (agentData?.text_generation_prompt) {
          agentTextPrompt = agentData.text_generation_prompt;
          console.log(`🎤 Fallback prompt da ElevenLabs agent "${agentData.name}"`);
        }
      }
    }

    // Compose final system prompt
    let composedPrompt = globalSystemPrompt + '\n\n';
    
    // Add BASE sections
    if (baseSections && baseSections.length > 0) {
      composedPrompt += '=== CONTESTO BASE ===\n';
      composedPrompt += baseSections.map(s => s.content).join('\n\n') + '\n\n';
    }

    // Add AGENT_PERSONALITY sections
    if (agentPersonalitySections && agentPersonalitySections.length > 0) {
      composedPrompt += '=== TUA PERSONALITÀ ===\n';
      composedPrompt += agentPersonalitySections.map(s => s.content).join('\n\n') + '\n\n';
    } else if (agentTextPrompt) {
      composedPrompt += '=== TUA PERSONALITÀ (da ElevenLabs) ===\n';
      composedPrompt += agentTextPrompt + '\n\n';
    }

    // Add TOPIC sections
    if (topicSections.length > 0) {
      composedPrompt += `=== FOCUS TOPIC: ${selectedTopic} ===\n`;
      composedPrompt += topicSections.map(s => s.content).join('\n\n') + '\n\n';
    }

    // TODO: Add Knowledge Base context (futuro)
    if (activeKbId) {
      console.log(`📚 Knowledge Base ${activeKbId} (integrazione futura)`);
    }

    console.log('📝 Prompt finale composto:', composedPrompt.substring(0, 200) + '...');

    // Prepare conversation history
    const conversationHistory = [
      { role: 'system', content: composedPrompt },
      ...historyMessages,
      { role: 'user', content: userMessage }
    ];

    let aiResponse = '';
    let tokenInput = 0;
    let tokenOutput = 0;
    const startTime = Date.now();

    // Route to appropriate AI provider
    if (selectedParticipant.type === 'anthropic' && anthropicKey) {
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
          system: composedPrompt
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
    else if (selectedParticipant.type === 'openai' && openAIKey) {
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
      console.log('🤖 Calling Lovable AI (Gemini)...');
      const lovableResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${lovableAIKey}`
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-exp',
          messages: conversationHistory
        })
      });

      if (!lovableResponse.ok) {
        throw new Error(`Lovable AI error: ${lovableResponse.statusText}`);
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
    console.log(`✅ Bar Chat risposta ricevuta in ${responseTime}ms`);

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

    // TODO: Invoke ElevenLabs TTS (futuro)
    console.log('🎤 TTS ElevenLabs (integrazione futura)');

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
    console.error('❌ Bar Chat Orchestrator error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
