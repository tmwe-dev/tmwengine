/**
 * ============ AGENT SELECTOR ============
 * Gestisce la selezione dell'agente basata su turn_strategy
 */

interface Participant {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
}

interface SelectionContext {
  userMessage: string;
  recentMessages: any[];
  cumulativeSummary: string | null;
  conversationStyle: string;
}

/**
 * Seleziona prossimo agente basato su strategia
 */
export async function selectNextAgent(
  strategy: string,
  participants: Participant[],
  currentTurnIndex: number,
  lastSpeakerIndex: number,
  context: SelectionContext,
  supabaseClient: any,
  conversationId: string
): Promise<{ selectedAgent: Participant; newTurnIndex: number }> {
  
  const activeParticipants = participants.filter(p => p.is_active);
  
  if (activeParticipants.length === 0) {
    throw new Error('Nessun agente attivo disponibile');
  }

  let newTurnIndex: number;
  
  switch (strategy) {
    case 'ROUND_ROBIN':
      newTurnIndex = selectRoundRobin(activeParticipants, lastSpeakerIndex);
      break;
    
    case 'RANDOM_30':
      newTurnIndex = selectRandom30(activeParticipants, lastSpeakerIndex);
      break;
    
    case 'INTERRUPT_BASED':
      newTurnIndex = await selectInterruptBased(
        activeParticipants, 
        context, 
        supabaseClient
      );
      break;
    
    case 'SMART_PRIORITY':
    default:
      newTurnIndex = await selectSmartPriority(
        activeParticipants,
        context,
        supabaseClient,
        conversationId
      );
      break;
  }
  
  const selectedAgent = activeParticipants[newTurnIndex];
  console.log(`🎯 [${strategy}] Selezionato: ${selectedAgent.name} (index: ${newTurnIndex})`);
  
  return { selectedAgent, newTurnIndex };
}

/**
 * ROUND_ROBIN: Turno circolare
 */
function selectRoundRobin(
  participants: Participant[], 
  lastSpeakerIndex: number
): number {
  const nextIndex = (lastSpeakerIndex + 1) % participants.length;
  console.log(`➡️ [ROUND_ROBIN] Next: ${nextIndex} (last: ${lastSpeakerIndex})`);
  return nextIndex;
}

/**
 * RANDOM_30: 30% random, 70% sequenziale
 */
function selectRandom30(
  participants: Participant[], 
  lastSpeakerIndex: number
): number {
  if (Math.random() < 0.3) {
    const randomIndex = Math.floor(Math.random() * participants.length);
    console.log(`🎲 [RANDOM_30] Random pick: ${randomIndex}`);
    return randomIndex;
  }
  const nextIndex = selectRoundRobin(participants, lastSpeakerIndex);
  console.log(`➡️ [RANDOM_30] Sequential: ${nextIndex}`);
  return nextIndex;
}

/**
 * INTERRUPT_BASED: Agente con maggiore urgenza/rilevanza
 */
async function selectInterruptBased(
  participants: Participant[],
  context: SelectionContext,
  supabaseClient: any
): Promise<number> {
  const userMsg = context.userMessage.toLowerCase();
  
  // Match keywords per tipo agente
  const keywordMap: Record<string, string[]> = {
    'gemini': ['rapido', 'veloce', 'quick', 'breve', 'fast'],
    'gpt': ['dettaglio', 'approfondisci', 'spiega', 'analisi', 'detail'],
    'chatgpt': ['dettaglio', 'approfondisci', 'spiega', 'analisi', 'detail'],
    'claude': ['riassumi', 'sintetizza', 'conclusione', 'summary', 'reasoning']
  };
  
  for (let i = 0; i < participants.length; i++) {
    const participantType = participants[i].type.toLowerCase();
    
    // Cerca match tra tipo agente e keywords
    for (const [agentType, keywords] of Object.entries(keywordMap)) {
      if (participantType.includes(agentType)) {
        const hasMatch = keywords.some(kw => userMsg.includes(kw));
        if (hasMatch) {
          console.log(`🎤 [INTERRUPT_BASED] Match trovato per ${participants[i].name}`);
          return i;
        }
      }
    }
  }
  
  // Fallback: random
  const randomIndex = Math.floor(Math.random() * participants.length);
  console.log(`🎲 [INTERRUPT_BASED] Nessun match, random: ${randomIndex}`);
  return randomIndex;
}

/**
 * SMART_PRIORITY: Scelta semantica basata su contesto
 */
async function selectSmartPriority(
  participants: Participant[],
  context: SelectionContext,
  supabaseClient: any,
  conversationId: string
): Promise<number> {
  const userMsg = context.userMessage.toLowerCase();
  const msgLength = context.userMessage.length;
  
  // ✅ FIX 3.1: Keyword-based semantic analysis (priority over length)
  const semanticPatterns: Array<{ keywords: string[]; agent: string; reason: string }> = [
    // Claude → reasoning, analisi, sintesi, codice
    { keywords: ['analizza', 'ragiona', 'confronta', 'sintetizza', 'riassumi', 'codice', 'errore', 'debug', 'perché', 'why', 'explain', 'reasoning', 'logica'], agent: 'claude', reason: 'semantic-reasoning' },
    // GPT → creatività, scrittura, brainstorming
    { keywords: ['scrivi', 'crea', 'inventa', 'storia', 'idea', 'brainstorm', 'creativo', 'proponi', 'suggerisci', 'write', 'create', 'imagine', 'design'], agent: 'gpt', reason: 'semantic-creative' },
    // Gemini → fatti rapidi, ricerca, dati
    { keywords: ['cos\'è', 'cosa è', 'definisci', 'quanto', 'quando', 'dove', 'chi è', 'cerca', 'trova', 'what is', 'how much', 'rapido', 'veloce'], agent: 'gemini', reason: 'semantic-factual' },
  ];

  for (const pattern of semanticPatterns) {
    const matchCount = pattern.keywords.filter(kw => userMsg.includes(kw)).length;
    if (matchCount >= 1) {
      const agentIndex = participants.findIndex(p => 
        p.type.toLowerCase().includes(pattern.agent)
      );
      if (agentIndex !== -1) {
        console.log(`🧠 [SMART_PRIORITY] Semantic match: ${pattern.reason} (${matchCount} keywords) → ${participants[agentIndex].name}`);
        return agentIndex;
      }
    }
  }

  // Fallback: length-based heuristic
  let targetAgentName = '';
  
  if (msgLength < 50) {
    targetAgentName = 'gemini';
    console.log(`⚡ [SMART_PRIORITY] Fallback: breve (${msgLength} char) → Gemini`);
  } else if (msgLength < 200) {
    targetAgentName = 'gpt';
    console.log(`💬 [SMART_PRIORITY] Fallback: medio (${msgLength} char) → GPT`);
  } else {
    targetAgentName = 'claude';
    console.log(`🧠 [SMART_PRIORITY] Fallback: lungo (${msgLength} char) → Claude`);
  }
  
  const agentIndex = participants.findIndex(p => 
    p.type.toLowerCase().includes(targetAgentName)
  );
  
  if (agentIndex !== -1) {
    return agentIndex;
  }
  
  console.warn(`⚠️ [SMART_PRIORITY] Agente ${targetAgentName} non trovato, uso primo disponibile`);
  return 0;
}
