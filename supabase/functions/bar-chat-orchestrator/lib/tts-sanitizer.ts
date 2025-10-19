/**
 * ============ TTS SANITIZER ============
 * Pulisce il testo AI prima della sintesi vocale
 */

export interface SanitizeOptions {
  removePlaceholders?: boolean;
  removeMarkdown?: boolean;
  removeMetadata?: boolean;
  removeSeparators?: boolean;
}

/**
 * Pulisce il testo da elementi che creano problemi con TTS
 */
export function sanitizeForTTS(text: string, options: SanitizeOptions = {}): string {
  const {
    removePlaceholders = true,
    removeMarkdown = true,
    removeMetadata = true,
    removeSeparators = true
  } = options;

  let cleaned = text;

  // 1. Rimuovi metadata e headers
  if (removeMetadata) {
    // Rimuovi pattern tipo "**Claude (risposta):**"
    cleaned = cleaned.replace(/\*\*[^*]+\s*\([^)]+\):\*\*/gi, '');
    
    // Rimuovi conteggi parole: "*(Conteggio: 35 parole)*"
    cleaned = cleaned.replace(/\*?\(Conteggio:\s*\d+\s*parole\)\*?/gi, '');
    
    // Rimuovi altri metadata tra parentesi con asterischi
    cleaned = cleaned.replace(/\*\([^)]+\)\*/g, '');
  }

  // 2. Rimuovi placeholder tra parentesi quadre
  if (removePlaceholders) {
    // Pattern comuni: [X], [nome], [lista], etc.
    cleaned = cleaned.replace(/\[[\w\s]+\]/g, '');
    
    // Pattern più complessi: [nome del cliente]
    cleaned = cleaned.replace(/\[[\w\s,]+\]/g, '');
  }

  // 3. Rimuovi formattazione markdown
  if (removeMarkdown) {
    // Grassetto: **text**
    cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
    
    // Corsivo: *text* o _text_
    cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
    cleaned = cleaned.replace(/_([^_]+)_/g, '$1');
    
    // Headers: ## text
    cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');
  }

  // 4. Rimuovi separatori markdown
  if (removeSeparators) {
    // Linee orizzontali: ---, ***, ___
    cleaned = cleaned.replace(/^[\-*_]{3,}\s*$/gm, '');
  }

  // 5. Normalizza spazi multipli
  cleaned = cleaned.replace(/\s{2,}/g, ' ');
  
  // 6. Normalizza newlines multipli (max 2)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  // 7. Trim finale
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Valida che il testo sia TTS-ready
 */
export function validateTTSText(text: string): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check per placeholder
  if (/\[[\w\s]+\]/.test(text)) {
    issues.push('Contiene placeholder tra parentesi quadre');
  }

  // Check per markdown bold
  if (/\*\*[^*]+\*\*/.test(text)) {
    issues.push('Contiene formattazione markdown grassetto');
  }

  // Check per conteggi parole
  if (/\(Conteggio:\s*\d+/.test(text)) {
    issues.push('Contiene conteggio parole');
  }

  // Check per separatori
  if (/^[\-*_]{3,}\s*$/m.test(text)) {
    issues.push('Contiene separatori markdown');
  }

  return {
    isValid: issues.length === 0,
    issues
  };
}

/**
 * Pulisce il testo e fornisce diagnostica
 */
export function sanitizeWithDiagnostics(text: string): {
  original: string;
  cleaned: string;
  removed: string[];
  validation: ReturnType<typeof validateTTSText>;
} {
  const original = text;
  const removed: string[] = [];

  // Pre-validation
  const preValidation = validateTTSText(text);
  if (preValidation.issues.length > 0) {
    removed.push(...preValidation.issues);
  }

  // Sanitize
  const cleaned = sanitizeForTTS(text);

  // Post-validation
  const postValidation = validateTTSText(cleaned);

  return {
    original,
    cleaned,
    removed,
    validation: postValidation
  };
}
