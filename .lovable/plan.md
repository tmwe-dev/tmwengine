

# Piano: Multi-Agent Response per Radio Chat

## Problema Principale

L'orchestrator attuale (`radio-chat-orchestrator`) seleziona **un solo agente** per ogni messaggio utente. Quando invii un messaggio, risponde solo Albert (o chi viene selezionato dalla strategia). Gli altri due agenti non vengono mai chiamati.

La logica SMART_PRIORITY (messaggio breve → Gemini, medio → GPT, lungo → Claude) serviva a scegliere **quale unico agente** risponde — non ha senso in un contesto dove tutti e tre devono partecipare.

## Cosa Vedevi Prima (e Cosa Vedi Ora)

- **Settings sidebar**: 3 agenti con toggle (corretto, funziona)
- **Carousel/Avatar column**: mostra solo gli avatar dei messaggi AI **gia' ricevuti** — se risponde solo Albert, vedi solo Albert
- **Il problema non e' nella UI**, e' nell'edge function che genera una sola risposta

## Piano di Fix

### Step 1: Modificare `radio-chat-orchestrator/index.ts` per Multi-Agent Response

Invece di selezionare UN agente e generare UNA risposta, il flusso diventa:

1. Per ogni agente attivo nei `participants`, genera una risposta AI
2. Ogni risposta viene salvata come messaggio separato nel DB
3. Ogni risposta ha il suo audio generato (se voice enabled)
4. Ritorna un array di risposte invece di una singola

La strategia di turno (SMART_PRIORITY, ROUND_ROBIN, ecc.) verra' usata solo per determinare l'**ordine** in cui gli agenti rispondono, non per escluderne alcuni.

### Step 2: Aggiornare `useRadioSendMessage.ts`

Il hook attualmente aspetta una singola risposta. Deve gestire l'array di risposte multiple che tornano dall'orchestrator.

### Step 3: Gestire i costi e la parallelizzazione

- Le chiamate AI vengono fatte in sequenza (non parallelo) per evitare rate limiting
- Un breve delay tra le chiamate (configurabile via `pauseBetweenTurnsMs`)
- Nessun limite sulla lunghezza delle risposte — gli agenti rispondono liberamente secondo i loro prompt

### File Modificati

| File | Modifica | Rischio |
|------|----------|---------|
| `supabase/functions/radio-chat-orchestrator/index.ts` | Loop su tutti gli agenti attivi | Medio |
| `src/hooks/useRadioSendMessage.ts` | Gestione risposta multipla | Basso |

### Funzionalita' Preservate
- Toggle agenti nella sidebar (disattivare un agente lo esclude)
- Audio TTS per ogni risposta
- Carousel 3D con navigazione tra messaggi
- Tutte le strategie di turno (usate per l'ordine, non per la selezione)

