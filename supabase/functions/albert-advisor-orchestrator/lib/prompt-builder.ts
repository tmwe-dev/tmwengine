/**
 * ============ PROMPT BUILDER (Albert Advisor) ============
 * Constructs dynamic prompts for AI agents - WITHOUT appendices
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
  styleSections?: Map<string, string>;
  dynamicWordLimit?: string;
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

  let composedPrompt = '';
  
  if (params.dynamicWordLimit) {
    composedPrompt += params.dynamicWordLimit + '\n\n';
  }
  
  // 🚨 OBBLIGO ASSOLUTO - CREAZIONE TASK
  composedPrompt += '🚨 OBBLIGO ASSOLUTO - CREAZIONE TASK 🚨\n';
  composedPrompt += 'Quando identifichi problemi, bug, inefficienze o opportunità di miglioramento:\n';
  composedPrompt += '1. DEVI SEMPRE usare il tool propose_lovable_task per creare un task nella maschera /ai-tasks\n';
  composedPrompt += '2. Il task deve contenere: title (max 80 char), file (path completo), problem (dettagliato), solution (opzionale), priority (alta/media/bassa)\n';
  composedPrompt += '3. Routing disponibile: /ai-tasks visualizza tutti i task proposti\n';
  composedPrompt += '4. NON limitarti a descrivere il problema nel testo: CREA IL TASK\n';
  composedPrompt += '5. Esempio file path: src/components/ChatLaboratory.tsx\n\n';
  
  // 📁 STRUTTURA PROGETTO
  composedPrompt += '📁 STRUTTURA PROGETTO LOVABLE\n';
  composedPrompt += '- Componenti React: src/components/*.tsx\n';
  composedPrompt += '- Pages/Routes: src/pages/*.tsx\n';
  composedPrompt += '- Edge Functions: supabase/functions/*/index.ts\n';
  composedPrompt += '- Database: supabase/migrations/*.sql\n';
  composedPrompt += '- UI Task Management: /ai-tasks (routing già attivo)\n\n';
  
  composedPrompt += '=== CONTESTO BASE ===\n';
  composedPrompt += baseContent + '\n\n';

  if (agentPersonality) {
    composedPrompt += '=== TUA PERSONALITÀ ===\n';
    composedPrompt += agentPersonality + '\n\n';
  }

  let styleInstructions = '';
  
  if (styleSections && styleSections.has(conversationStyle)) {
    styleInstructions = styleSections.get(conversationStyle) || '';
    console.log(`✅ Usando stile DB: ${conversationStyle}`);
  } else {
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

  if (previousResponses.length > 0) {
    const previousAgentsContext = previousResponses
      .map(r => `${r.agentName}: ${r.content.substring(0, 200)}...`)
      .join('\n\n');
    
    composedPrompt += `
RISPOSTE PRECEDENTI IN QUESTO TURNO:
${previousAgentsContext}

Considera queste risposte quando formuli la tua. Puoi:
- Concordare o aggiungere nuovi punti
- Offrire una prospettiva diversa
- Rispondere direttamente a uno degli altri agenti
- Scrivere [SKIP] se non hai nulla di rilevante da aggiungere
`;
  }

  if (wasCalledDirectly && lastResponse) {
    composedPrompt += `
🎯 SEI STATO CHIAMATO DIRETTAMENTE
${lastResponse.agentName} ti ha menzionato esplicitamente nel suo ultimo intervento.
Rispondi in modo specifico alla sua richiesta/domanda.
NON scrivere [SKIP] in questo caso.

`;
  }
  
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
 * 🚫 APPENDICI RIMOSSE: Questa versione Albert NON include appendici
 */
export function formatHistoryMessages(messages: any[]): any[] {
  return messages.map((msg: any) => {
    let messageContent = msg.content;
    
    // ✅ REPORT: Include nel context per AI (manteniamo solo report, appendici eliminate)
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