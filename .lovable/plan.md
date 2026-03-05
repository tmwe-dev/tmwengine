

# Piano: Fix Bug Critici + Miglioramenti Sistema Radio Chat

## FASE 1 — BUG CRITICI (Priorita' massima)

### 1.1 `globalPrompt` ignorato in `buildSystemPrompt`
**File**: `supabase/functions/radio-chat-orchestrator/lib/prompt-builder.ts`
**Bug**: Il parametro `globalPrompt` viene destructured (riga 25) ma mai usato nel corpo della funzione. Il prompt globale selezionato dall'utente non viene mai iniettato nel system prompt finale.
**Fix**: Aggiungere `globalPrompt` come sezione iniziale del `composedPrompt`, dopo il dynamic word limit e prima del base content:
```
composedPrompt += '=== ISTRUZIONI GLOBALI ===\n';
composedPrompt += globalPrompt + '\n\n';
```

### 1.2 Auth check mancante nell'orchestrator
**File**: `supabase/functions/radio-chat-orchestrator/index.ts`
**Bug**: L'edge function usa `SUPABASE_SERVICE_ROLE_KEY` senza verificare l'identita' del chiamante. Chiunque con l'anon key puo' invocare l'orchestrator.
**Fix**: Aggiungere validazione JWT all'inizio della funzione, dopo il CORS check:
- Estrarre `Authorization` header
- Validare con `supabase.auth.getUser(token)`
- Ritornare 401 se non autenticato
- Continuare a usare `SERVICE_ROLE_KEY` per le operazioni DB interne

### 1.3 Proprieta' `startTime` vs `callStartTime` mismatch
**File**: `supabase/functions/radio-chat-orchestrator/lib/orchestration-loop.ts`
**Bug**: Riga 103 passa `callStartTime` come proprieta', ma `AICallParams` definisce `startTime`. Il campo `callStartTime` non esiste nell'interfaccia — il provider lo riceve ma lo ignora e usa `startTime` (che e' `undefined`), producendo `duration: NaN`.
**Fix**: Cambiare `callStartTime` → `startTime` nelle 3 chiamate ai provider (righe 103, 107, 111).

---

## FASE 2 — BUG AD ALTO IMPATTO

### 2.1 `isComposedPrompt` detection fragile
**File**: `supabase/functions/radio-chat-orchestrator/index.ts` (righe 68-70)
**Bug**: La detection si basa su euristica testuale (`length > 500 && includes('IDENTITA:')`) che puo' facilmente dare falsi positivi/negativi.
**Fix**: Usare il campo `composed_prompt_id` dalla conversazione (gia' caricato in `config-loader.ts`). Aggiungere un flag `isComposedPrompt` nel return di `getCachedPrompts` che si basa su `conv?.composed_prompt_id != null`.

### 2.2 `max_tokens` incoerenti tra provider
**File**: Provider files
**Stato attuale**:
- Claude: `max_tokens: 800`
- ChatGPT (Lovable Gateway): `max_completion_tokens: 1200`
- ChatGPT (Direct): `max_tokens: 200` (troppo basso!)
- Gemini: `max_tokens: 200` (troppo basso!)

**Fix**: Normalizzare a `800` per tutti i provider. Iniettare il valore come parametro dal loop, non hardcoded in ogni provider.

### 2.3 Memory leak Three.js nel carousel
**File**: `src/components/radio-chat/RadioCarousel3D.tsx`
**Bug**: `renderedMessagesRef` non viene mai svuotato quando si cambia conversazione. Le texture vecchie restano in memoria.
**Fix**: Aggiungere cleanup nel return del useEffect di inizializzazione slots e resettare `renderedMessagesRef` quando cambiano i messaggi in modo significativo (conversazione diversa).

---

## FASE 3 — MIGLIORAMENTI STRUTTURALI

### 3.1 `SMART_PRIORITY` piu' intelligente
**File**: `supabase/functions/radio-chat-orchestrator/lib/agent-selector.ts`
**Problema**: Usa solo `msgLength` come criterio, che non ha correlazione con la complessita' semantica.
**Fix**: Aggiungere keyword analysis (domande tecniche → Claude, creativita' → GPT, fatti rapidi → Gemini) come layer aggiuntivo. Mantenere length come fallback.

### 3.2 Aggiungere `maxTokens` parametrico ai provider
**File**: `ai-provider-types.ts` + tutti i provider
**Fix**: Aggiungere `maxTokens?: number` a `AICallParams`. Usarlo nei provider con fallback al valore attuale. L'orchestration loop lo passa dal config.

### 3.3 `collapseConsecutiveMessages` non gestisce assistant consecutivi
**File**: `supabase/functions/radio-chat-orchestrator/lib/utils.ts`
**Bug**: Riga 82 collassa solo messaggi `user` consecutivi, ma Claude richiede alternanza stretta user/assistant. Se ci sono 2 assistant consecutivi (es. da turni precedenti), l'API Claude puo' rifiutare la request.
**Fix**: Estendere il collapsing anche ai messaggi `assistant` consecutivi.

---

## SEQUENZA DI IMPLEMENTAZIONE

```text
Step  File                                    Rischio  Dipendenze
────  ──────────────────────────────────────  ───────  ──────────
1     prompt-builder.ts (globalPrompt fix)    Basso    Nessuna
2     orchestration-loop.ts (startTime fix)   Basso    Nessuna
3     index.ts (auth check)                   Medio    Nessuna
4     config-loader.ts (isComposed flag)      Basso    Step 1
5     index.ts (isComposed refactor)          Basso    Step 4
6     Provider files (max_tokens unify)       Basso    Nessuna
7     utils.ts (collapse assistant msgs)      Basso    Nessuna
8     RadioCarousel3D.tsx (memory cleanup)    Basso    Nessuna
9     agent-selector.ts (SMART_PRIORITY)      Medio    Nessuna
```

## NON TOCCARE
- CRMLayout, sidebar, routing
- RadioAudioPlayer, RadioAudioPlayerMini (fix audio recente)
- useRadioCarouselNav (fix recente)
- Database schema
- Componenti UI non citati

## BACKUP RICHIESTI
- `index.ts` → `index-backup-pre-auth.ts`
- `prompt-builder.ts` → gia' presente backup precedente

