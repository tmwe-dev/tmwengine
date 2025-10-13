// Deliverable Detection & Extraction Utilities
// Fase 2: Intent routing + adaptive limits + structured output

export interface DeliverableIntent {
  depth: 'short' | 'deep';
  deliverableType: 'report' | 'canvas' | 'table' | 'diagram' | null;
  format: 'md' | 'csv' | 'mermaid' | 'excalidraw' | null;
}

export interface ExtractedDeliverable {
  type: 'report' | 'canvas' | 'table' | 'diagram';
  format: 'md' | 'csv' | 'mermaid' | 'excalidraw';
  title: string;
  tldr: string;
  content: string;
  metadata: Record<string, any>;
}

/**
 * Detect user intent for deliverable generation
 * L1: Regex fast-path (zero latency)
 * L2: Semantic fallback (future enhancement)
 */
export function detectIntent(userMessage: string): DeliverableIntent {
  const msg = userMessage.toLowerCase();
  
  // Deep intent patterns
  const deepPatterns = /(report|analisi|approfondisci|schema|canvas|tabella|csv|diagramma|mermaid|documento|sintesi)/i;
  
  if (!deepPatterns.test(msg)) {
    return { depth: 'short', deliverableType: null, format: null };
  }
  
  // Deliverable type detection
  let deliverableType: DeliverableIntent['deliverableType'] = null;
  let format: DeliverableIntent['format'] = null;
  
  if (/canvas|business model|swot|framework/i.test(msg)) {
    deliverableType = 'canvas';
    format = /mermaid|diagram/i.test(msg) ? 'mermaid' : 'excalidraw';
  } else if (/csv|tabella|dataset|dati/i.test(msg)) {
    deliverableType = 'table';
    format = 'csv';
  } else if (/diagram|mermaid|flusso|schema/i.test(msg)) {
    deliverableType = 'diagram';
    format = 'mermaid';
  } else if (/report|analisi|documento|sintesi/i.test(msg)) {
    deliverableType = 'report';
    format = 'md';
  }
  
  return { depth: 'deep', deliverableType, format };
}

/**
 * Extract deliverable from AI response
 * Parses [DELIVERABLE]...[/DELIVERABLE] blocks
 */
export function extractDeliverable(aiResponse: string): ExtractedDeliverable | null {
  const deliverableRegex = /\[DELIVERABLE\s+type=(\w+)\s+format=(\w+)(?:\s+title="([^"]+)")?\]([\s\S]*?)\[\/DELIVERABLE\]/i;
  const match = aiResponse.match(deliverableRegex);
  
  if (!match) return null;
  
  const [, type, format, title, content] = match;
  
  // Extract TL;DR (first section)
  const tldrMatch = content.match(/##\s*TL;DR[^\n]*\n([\s\S]*?)(?=\n##|$)/i);
  const tldr = tldrMatch ? tldrMatch[1].trim() : '';
  
  return {
    type: type as any,
    format: format as any,
    title: title || 'Untitled',
    tldr,
    content: content.trim(),
    metadata: {}
  };
}

/**
 * Get adaptive word limit based on agent and intent
 */
export function getAdaptiveWordLimit(
  agentName: string,
  intent: DeliverableIntent,
  baseLimit: number = 120
): number {
  const agentMultipliers: Record<string, number> = {
    'Renny': 1.5,
    'Vittorio': 2.0,
    'Tonino': 2.5
  };
  
  const agentKey = agentName.split(' ')[0]; // Extract "Renny" from "Renny - GPT"
  const multiplier = agentMultipliers[agentKey] || 1.5;
  
  return intent.depth === 'deep' 
    ? Math.floor(baseLimit * multiplier)
    : baseLimit;
}

/**
 * Build deliverable prompt injection
 */
export function buildDeliverablePrompt(intent: DeliverableIntent): string {
  if (!intent.deliverableType) return '';
  
  return `
[DELIVERABLE RICHIESTO]
Type: ${intent.deliverableType}
Format: ${intent.format}

IMPORTANTE: Struttura la tua risposta in questo formato:

[DELIVERABLE type=${intent.deliverableType} format=${intent.format} title="Titolo Descrittivo"]
## TL;DR (≤40 parole)
[Sintesi ultra-breve per TTS e preview]

## Contenuto
[Contenuto completo strutturato]

## Azioni/Prossimi Passi
[Conclusioni operative]
[/DELIVERABLE]

REGOLE:
- TL;DR massimo 40 parole (sarà letto dal TTS)
- Contenuto ben strutturato con sezioni chiare
- Evita markdown complesso nel TL;DR
${intent.deliverableType === 'table' ? '- Per CSV: tabella valida separata da virgole' : ''}
${intent.deliverableType === 'diagram' ? '- Per Mermaid: sintassi valida (graph, flowchart, sequenceDiagram)' : ''}
${intent.deliverableType === 'canvas' ? '- Per Canvas: JSON Excalidraw valido o Mermaid diagram' : ''}
`;
}

/**
 * Validate deliverable content
 */
export function validateDeliverable(deliverable: ExtractedDeliverable): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Hard cap: 20k characters
  if (deliverable.content.length > 20000) {
    errors.push('Content exceeds 20k character limit');
  }
  
  // TL;DR word count
  const tldrWords = deliverable.tldr.split(/\s+/).length;
  if (tldrWords > 50) {
    errors.push(`TL;DR too long: ${tldrWords} words (max 50)`);
  }
  
  // Format-specific validation
  if (deliverable.format === 'csv') {
    // Basic CSV validation
    const lines = deliverable.content.split('\n');
    if (lines.length < 2) {
      errors.push('CSV must have header + at least 1 data row');
    }
  } else if (deliverable.format === 'mermaid') {
    // Check for basic mermaid syntax
    if (!/(graph|flowchart|sequenceDiagram|classDiagram)/i.test(deliverable.content)) {
      errors.push('Invalid Mermaid syntax: missing diagram type');
    }
  } else if (deliverable.format === 'excalidraw') {
    try {
      const parsed = JSON.parse(deliverable.content);
      if (!parsed.elements || !Array.isArray(parsed.elements)) {
        errors.push('Invalid Excalidraw JSON: missing elements array');
      }
    } catch (e) {
      errors.push('Invalid Excalidraw JSON');
    }
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Sanitize markdown content
 */
export function sanitizeMarkdown(content: string): string {
  // Remove dangerous HTML tags
  return content
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/<object[^>]*>.*?<\/object>/gi, '')
    .replace(/<embed[^>]*>/gi, '');
}
