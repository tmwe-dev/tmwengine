/**
 * ============ UTILITY FUNCTIONS ============
 * Generic helper functions used across the orchestrator
 */

/**
 * Fetch con timeout usando AbortController
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 60000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`⏱️ Request timeout dopo ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * Retry con exponential backoff e jitter
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { retries?: number; baseDelayMs?: number } = {}
): Promise<T> {
  const { retries = 2, baseDelayMs = 300 } = options;
  let attempt = 0;
  
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      const isRetriable = /429|5\d\d|timeout/i.test(errorMsg);
      
      if (!isRetriable || attempt >= retries) {
        throw error;
      }
      
      const backoff = baseDelayMs * Math.pow(2, attempt);
      const jitter = Math.floor(Math.random() * 100);
      const waitTime = backoff + jitter;
      
      console.log(`⚠️ Tentativo ${attempt + 1}/${retries} fallito: ${errorMsg}. Retry tra ${waitTime}ms...`);
      await delay(waitTime);
      attempt++;
    }
  }
}

/**
 * Utility per delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Collassa messaggi consecutivi dello stesso role per Claude API
 * Claude richiede alternanza user/assistant, ma Bar Chat ha assistant consecutivi
 */
export function collapseConsecutiveMessages(messages: any[]): any[] {
  const collapsed = [];
  let lastRole = null;
  let buffer = '';

  for (const msg of messages) {
    // ✅ FIX 3.3: Collassa TUTTI i messaggi consecutivi dello stesso role (user E assistant)
    if (msg.role === lastRole) {
      buffer += '\n\n' + msg.content.trim();
    } else {
      // Salva il buffer precedente
      if (buffer && lastRole) {
        collapsed.push({ role: lastRole, content: buffer.trim() });
      }
      // Inizia nuovo buffer
      lastRole = msg.role;
      buffer = msg.content.trim();
    }
  }
  
  // Aggiungi l'ultimo buffer
  if (buffer && lastRole) {
    collapsed.push({ role: lastRole, content: buffer.trim() });
  }

  return collapsed;
}

/**
 * Estimate tokens from text (rough approximation)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
