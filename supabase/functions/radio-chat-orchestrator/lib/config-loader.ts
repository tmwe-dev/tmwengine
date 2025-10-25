/**
 * ============ CONFIGURATION LOADER ============
 * Handles loading all configurations from Supabase
 */

// ============ PROMPT CACHE GLOBALE ============
interface PromptCache {
  globalPrompt: string;
  baseSections: string;
  agentPersonalities: Map<string, string>;
  conversationStyles: Map<string, string>;
  orchestratorRules: string;
  timestamp: number;
}

let promptCache: PromptCache | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minuti

/**
 * Load and cache prompts from database
 */
export async function getCachedPrompts(supabase: any): Promise<PromptCache> {
  const now = Date.now();
  
  if (!promptCache || (now - promptCache.timestamp > CACHE_TTL)) {
    console.log('📦 Ricaricando prompt cache...');
    
    // Una query batch per tutti i prompts
    const [globalData, baseData, personalityData, styleData, orchestratorData] = await Promise.all([
      supabase.from('chat_laboratory_system_prompts')
        .select('contenuto')
        .eq('attivo', true)
        .limit(1)
        .maybeSingle(),
      
      supabase.from('chat_laboratory_prompt_sections')
        .select('content')
        .eq('section_type', 'BASE')
        .eq('is_active', true)
        .order('order_priority', { ascending: true }),
      
      supabase.from('chat_laboratory_prompt_sections')
        .select('section_name, content')
        .eq('section_type', 'AGENT_PERSONALITY')
        .eq('is_active', true),
      
      supabase.from('chat_laboratory_prompt_sections')
        .select('section_name, content')
        .eq('section_type', 'CONVERSATION_STYLE')
        .eq('is_active', true),
      
      supabase.from('chat_laboratory_prompt_sections')
        .select('content')
        .eq('section_type', 'ORCHESTRATOR_RULES')
        .eq('is_active', true)
        .maybeSingle()
    ]);
    
    promptCache = {
      globalPrompt: globalData.data?.contenuto || 'Sei un assistente AI intelligente che partecipa a discussioni costruttive in un bar virtuale.',
      baseSections: baseData.data?.map((s: any) => s.content).join('\n\n') || '',
      agentPersonalities: new Map(
        personalityData.data?.map((p: any) => [
          p.section_name.toLowerCase(),
          p.content
        ]) || []
      ),
      conversationStyles: new Map(
        styleData.data?.map((s: any) => [
          s.section_name.toLowerCase(),
          s.content
        ]) || []
      ),
      orchestratorRules: orchestratorData.data?.content || 'Leggi l\'ultimo messaggio. Se contiene una DOMANDA o RICHIESTA verso altri, rispondi TRUE. Altrimenti FALSE.',
      timestamp: now
    };
    
    console.log(`✅ Cache aggiornata: ${promptCache.agentPersonalities.size} personalità, ${promptCache.conversationStyles.size} stili`);
  }
  
  return promptCache;
}

/**
 * Load Bar Mode configuration and API keys
 */
export async function loadBarModeConfig(supabaseClient: any, conversationId: string) {
  // Fetch API keys
  const { data: anthropicConfig } = await supabaseClient
    .from('config_ai')
    .select('api_key')
    .eq('provider', 'anthropic')
    .maybeSingle();

  const { data: openaiConfig } = await supabaseClient
    .from('config_ai')
    .select('api_key, modello')
    .eq('provider', 'openai')
    .maybeSingle();

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

  if (!anthropicConfig?.api_key && !openaiConfig?.api_key && !LOVABLE_API_KEY) {
    throw new Error('Nessuna chiave API configurata');
  }

  // Fetch Radio Chat settings (or create if not exists)
  let { data: barModeSettings, error: settingsError } = await supabaseClient
    .from('chat_laboratory_bar_mode')
    .select('mode, selected_topic, active_kb_id, voice_enabled, conversation_pace, agent_interaction_mode, conversation_style, pause_between_turns_ms, turn_strategy, cognitive_buffers')
    .eq('conversation_id', conversationId)
    .maybeSingle();

  // Se non esiste, crea record con defaults per Radio Chat
  if (!barModeSettings) {
    console.log('🔧 Creazione configurazione Radio Chat per conversation:', conversationId);
    const { data: newSettings, error: createError } = await supabaseClient
      .from('chat_laboratory_bar_mode')
      .insert({
        conversation_id: conversationId,
        mode: 'radio',
        voice_enabled: true,
        agent_interaction_mode: 'consultation',
        conversation_style: 'colleagues',
        conversation_pace: 'normal',
        pause_between_turns_ms: 800,
        turn_strategy: 'SMART_PRIORITY',
        cognitive_buffers: []
      })
      .select()
      .single();

    if (createError) {
      console.warn('⚠️ Impossibile creare configurazione, uso defaults:', createError);
      // Fallback ai defaults
      barModeSettings = {
        mode: 'radio',
        selected_topic: null,
        active_kb_id: null,
        voice_enabled: true,
        conversation_pace: 'normal',
        agent_interaction_mode: 'consultation',
        conversation_style: 'colleagues',
        pause_between_turns_ms: 800,
        turn_strategy: 'SMART_PRIORITY',
        cognitive_buffers: []
      };
    } else {
      barModeSettings = newSettings;
    }
  }

  const selectedTopic = barModeSettings.selected_topic;
  const activeKbId = barModeSettings.active_kb_id;
  const voiceEnabled = barModeSettings.voice_enabled ?? true;
  const agentMode = barModeSettings.agent_interaction_mode || 'consultation';
  const conversationStyle = barModeSettings.conversation_style || 'colleagues';
  const conversationPace = barModeSettings.conversation_pace || 'normal';

  const paceDelays = {
    slow: 2000,
    normal: 800,
    fast: 300
  };
  const pauseBetweenTurnsMs = barModeSettings.pause_between_turns_ms || paceDelays[conversationPace as keyof typeof paceDelays];

  // Fetch ElevenLabs config if voice enabled
  let elevenLabsApiKey: string | null = null;
  let activeVoiceAgents: Array<{ elevenlabs_agent_id: string; name: string; voice_id: string }> = [];
  
  if (voiceEnabled) {
    const { data: voiceConfig } = await supabaseClient
      .from('voice_agent_config')
      .select('elevenlabs_api_key')
      .maybeSingle();
    
    elevenLabsApiKey = voiceConfig?.elevenlabs_api_key || null;

    const { data: voiceAgents } = await supabaseClient
      .from('elevenlabs_agents')
      .select(`
        elevenlabs_agent_id,
        name,
        voice_id,
        text_generation_prompt,
        prompt_id,
        prompt:chat_laboratory_prompt_sections(content)
      `)
      .eq('is_active', true)
      .order('order_index');
    
    // Crea effective_prompt: usa modular se disponibile, altrimenti fallback a legacy
    activeVoiceAgents = (voiceAgents || []).map(agent => ({
      ...agent,
      effective_prompt: agent.prompt?.content || agent.text_generation_prompt || ''
    }));
    console.log(`🎤 Voice enabled dal DB: ${voiceEnabled}, ${activeVoiceAgents.length} voice agents attivi`);
  }

  return {
    anthropicConfig,
    openaiConfig,
    LOVABLE_API_KEY,
    barModeSettings: {
      selectedTopic,
      activeKbId,
      voiceEnabled,
      agentMode,
      conversationStyle,
      conversationPace,
      pauseBetweenTurnsMs
    },
    elevenLabsApiKey,
    activeVoiceAgents
  };
}

/**
 * Fetch conversation data and messages
 */
export async function loadConversationData(supabaseClient: any, conversationId: string) {
  // Fetch conversation metadata
  const { data: conversation, error: convError } = await supabaseClient
    .from('chat_laboratory_conversations')
    .select('economy_mode, current_turn_index, last_speaker_index, riassunto_contesto, is_paused')
    .eq('id', conversationId)
    .single();

  if (convError) throw convError;

  // Check if paused
  if (conversation?.is_paused) {
    return { isPaused: true, conversation };
  }

  // Fetch last 20 messages
  const { data: messages } = await supabaseClient
    .from('chat_laboratory_messages')
    .select('sender_type, sender_name, content, content_summary, is_summary_available, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(20);

  const recentMessages = (messages || []).reverse();

  // FIX 2: MEMORIA PULITA - no riassunto per conversazioni nuove/brevi (< 10 messaggi)
  // + Safety check: forza NULL se summary è vuoto o se conversazione breve
  let cumulativeSummary = null;
  
  if (recentMessages.length >= 10 && conversation?.riassunto_contesto) {
    cumulativeSummary = conversation.riassunto_contesto;
    
    // ⚠️ SAFETY: Se summary è stringa vuota, forza NULL
    if (cumulativeSummary === '' || cumulativeSummary.trim() === '') {
      console.warn('⚠️ Summary vuoto rilevato, forzo NULL');
      cumulativeSummary = null;
    }
  }

  return {
    isPaused: false,
    conversation,
    recentMessages,
    cumulativeSummary
  };
}
