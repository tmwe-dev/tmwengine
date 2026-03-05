/**
 * ============ PROMPT BUILDER ============
 * Constructs dynamic prompts for AI agents
 */

export interface PromptParams {
  globalPrompt: string;
  baseContent: string;
  agentPersonality: string;
  conversationStyle: string;
  agentMode: string;
  previousResponses: any[];
  wasCalledDirectly: boolean;
  lastResponse?: any;
  styleSections?: Map<string, string> | Record<string, string>;
  dynamicWordLimit?: string;
  conversationPersonality?: string | null; // ✅ NUOVO: Personalità assegnata alla conversazione
}

/**
 * Build system prompt with style and mode injections
 */
export function buildSystemPrompt(params: PromptParams): string {
  const {
    globalPrompt,
    baseContent,
    agentPersonality,
    conversationStyle,
    agentMode,
    previousResponses,
    wasCalledDirectly,
    lastResponse,
    styleSections
  } = params;

  // Inizializza prompt vuoto
  let composedPrompt = '';
  
  // ✅ PRIORITÀ MASSIMA: Limite dinamico dall'orchestrator
  if (params.dynamicWordLimit) {
    composedPrompt += params.dynamicWordLimit + '\n\n';
  }

  // ✅ FIX 1.1: Inietta globalPrompt (prima ignorato)
  if (globalPrompt) {
    composedPrompt += '=== ISTRUZIONI GLOBALI ===\n';
    composedPrompt += globalPrompt + '\n\n';
  }
  
  // Add BASE sections
  composedPrompt += '=== CONTESTO BASE ===\n';
  composedPrompt += baseContent + '\n\n';

  // Add CONVERSATION PERSONALITY (if assigned to conversation - PRIORITY over agent personality)
  if (params.conversationPersonality) {
    composedPrompt += '=== PERSONALITÀ ASSEGNATA ALLA CONVERSAZIONE ===\n';
    composedPrompt += params.conversationPersonality + '\n\n';
    console.log('🎭 Usando personalità assegnata alla conversazione');
  }
  // Add AGENT_PERSONALITY (fallback se non c'è personalità conversation-level)
  else if (agentPersonality) {
    composedPrompt += '=== TUA PERSONALITÀ ===\n';
    composedPrompt += agentPersonality + '\n\n';
  }

  // Style injection from DB (con fallback a hardcoded per retrocompatibilità)
  let styleInstructions = '';
  
  if (styleSections) {
    // ⚡ LIVELLO 2: Support both Map and plain object (for client-sent prompts)
    const styleValue = styleSections instanceof Map 
      ? styleSections.get(conversationStyle)
      : styleSections[conversationStyle];
    
    if (styleValue) {
      styleInstructions = styleValue;
      console.log(`✅ Usando stile DB: ${conversationStyle}`);
    }
  }
  
  if (!styleInstructions) {
    // Fallback a hardcoded (per retrocompatibilità durante migrazione)
    console.warn(`⚠️ Stile '${conversationStyle}' non trovato in DB, uso fallback hardcoded`);
    
    if (conversationStyle === 'boss_talk') {
      styleInstructions = `
STILE: Boss Talk - Pragmatico e Sintetico
Massimo 50-60 parole, circa 4 frasi brevi.
Focus su decisioni concrete, ROI, trade-off e prossimi passi.
Taglia tutto ciò che non è direttamente azionabile.
Usa dati concreti quando disponibili.
Tono diretto e professionale.
NON usare placeholder o testo tra parentesi quadre.
NON aggiungere conteggi parole o metadata al testo.
`;
    } else if (conversationStyle === 'colleagues') {
      styleInstructions = `
STILE: Colleghi - Professionale ma Amichevole
LIMITE RIGIDO: massimo 60-70 parole, circa 5 frasi brevi.
Usa frasi dirette e concrete.
Coinvolgi gli altri con nomi reali se noti, altrimenti usa riferimenti naturali.
Evita introduzioni lunghe, ripetizioni e conclusioni prolisse.
Tono collaborativo ma estremamente conciso.
NON usare placeholder come nome generico o testo tra parentesi quadre.
NON aggiungere conteggi parole o metadata al testo.
Se non hai nulla di rilevante da aggiungere, scrivi SKIP.
`;
    } else if (conversationStyle === 'bar_chat') {
      styleInstructions = `
STILE: Bar Chat - Informale e Rilassato
Massimo 40-50 parole, circa 3 frasi.
Attacco conversazionale naturale come: Guarda, Senti, Allora.
Scherzoso quando appropriato ma non forzato.
Coinvolgi con domande dirette usando nomi reali se noti.
Tono da conversazione informale, evita frasi conclusive formali.
NON usare placeholder o testo tra parentesi quadre.
NON aggiungere conteggi parole o metadata al testo.
`;
    }
  }
  
  composedPrompt += styleInstructions + '\n\n';

  // ✅ CRITICAL: Tell the agent to respond ONLY as itself, never roleplay other agents
  composedPrompt += `
⚠️ REGOLA FONDAMENTALE: Rispondi SOLO come te stesso. 
NON generare risposte per altri agenti o personaggi.
NON usare il formato [NomeAltroAgente]: prima delle tue frasi.
Scrivi direttamente il tuo intervento, senza prefissi con nomi tra parentesi quadre.
`;

  // Add context about other agents
  if (previousResponses.length > 0) {
    const previousAgentsContext = previousResponses
      .map(r => `${r.agentName}: ${r.content.substring(0, 200)}...`)
      .join('\n\n');
    
    composedPrompt += `
RISPOSTE PRECEDENTI IN QUESTO TURNO (solo per contesto, NON rispondere al loro posto):
${previousAgentsContext}

Considera queste risposte quando formuli la TUA UNICA risposta. Puoi:
- Concordare o aggiungere nuovi punti
- Offrire una prospettiva diversa
- Rispondere direttamente a uno degli altri agenti
- Scrivere [SKIP] se non hai nulla di rilevante da aggiungere
`;
  }

  // Direct call priority
  if (wasCalledDirectly && lastResponse) {
    composedPrompt += `
🎯 SEI STATO CHIAMATO DIRETTAMENTE
${lastResponse.agentName} ti ha menzionato esplicitamente nel suo ultimo intervento.
Rispondi in modo specifico alla sua richiesta/domanda.
NON scrivere [SKIP] in questo caso.

`;
  }
  
  // Agent mode injection
  if (agentMode === 'consultation') {
    composedPrompt += `
📚 MODALITÀ: Consultazione Formale
- Puoi essere dettagliato e approfondito (fino a 150 parole se necessario)
- Usa linguaggio tecnico quando appropriato
- Fornisci spiegazioni complete e strutturate
- Cita fonti o riferimenti se rilevanti
- Questo è il tuo UNICO intervento, quindi sii esaustivo

`;
  }

  return composedPrompt;
}

/**
 * Build full conversation history with system prompt and cumulative summary
 */
export function buildConversationHistory(params: {
  systemPrompt: string;
  cumulativeSummary: string | null;
  historyMessages: any[];
  turnContext: any[];
}): any[] {
  const { systemPrompt, cumulativeSummary, historyMessages, turnContext } = params;

  return [
    { role: 'system', content: systemPrompt },
    // Cumulative summary if exists
    ...(cumulativeSummary ? [{ 
      role: 'system', 
      content: `📚 CONTESTO PRECEDENTE (Riassunto cumulativo):\n${cumulativeSummary}\n\n---\n\n` 
    }] : []),
    ...historyMessages,
    ...turnContext
  ];
}

/**
 * Convert database messages to conversation format
 */
export function formatHistoryMessages(messages: any[]): any[] {
  return messages.map((msg: any) => {
    let messageContent = msg.content;
    
    // ✅ APPENDICI: Include nel context per AI (ma nascoste in UI)
    if (msg.attachments?.appendix) {
      messageContent += `\n\n[APPENDICE COLLEGA]\n${msg.attachments.appendix}\n[/APPENDICE]`;
    }
    
    // ✅ REPORT: Include nel context per AI
    if (msg.attachments?.report) {
      messageContent += `\n\n[REPORT COLLEGA]\n${msg.attachments.report}\n[/REPORT]`;
    }
    
    console.log(`📝 [${msg.sender_name}] Content completo: ${messageContent.length} chars`);
    
    return {
      role: msg.sender_type === 'human' ? 'user' : 'assistant',
      content: messageContent
    };
  });
}

/**
 * Calculate context size metrics
 */
export function calculateContextSize(conversationHistory: any[]): {
  totalContextChars: number;
  estimatedTokens: number;
} {
  const totalContextChars = conversationHistory
    .map(m => m.content.length)
    .reduce((sum, len) => sum + len, 0);

  const estimatedTokens = Math.ceil(totalContextChars / 4);

  return { totalContextChars, estimatedTokens };
}
