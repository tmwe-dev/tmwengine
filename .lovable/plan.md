

# Analisi Completa RadioChat - Risultati e Piano di Refactoring

## Architettura Attuale

La pagina RadioChat e' stata precedentemente refactored da un monolite di 1,537 righe a un orchestrator modulare con ~288 righe nel file principale, 10 hooks specializzati e 33 componenti nella directory `radio-chat/`.

```text
RadioChat.tsx (288 righe - orchestrator)
  ├── Hooks (10)
  │   ├── useRadioAuth          - Auth + fallback anonimo
  │   ├── useRadioParticipants  - Caricamento agenti da elevenlabs_agents
  │   ├── useRadioConversations - CRUD conversazioni
  │   ├── useRadioMessages      - Messaggi + Realtime subscription
  │   ├── useRadioSendMessage   - Invio + orchestrator call
  │   ├── useRadioPromptCache   - Cache prompt da DB
  │   ├── useRadioSummary       - Generazione riassunti
  │   ├── useRadioCarouselNav   - Navigazione carousel + swipe
  │   ├── useRadioPreferences   - Preferenze localStorage
  │   └── useRadioUIState       - Stati UI (sidebar, input, debug)
  ├── Componenti (33 file in radio-chat/)
  └── Edge Function: radio-chat-orchestrator
```

---

## Problemi Identificati

### 1. BUG CRITICO: `useMemo` usato come side-effect (useRadioCarouselNav.ts:21-25)
```
useMemo(() => {
  if (firstAiMessageId && !activeMessageId) {
    setActiveMessageId(firstAiMessageId);  // ❌ side-effect in useMemo
  }
}, [firstAiMessageId, activeMessageId]);
```
Deve essere `useEffect`. `useMemo` non garantisce l'esecuzione degli effetti collaterali.

### 2. BUG: `toast` nella dependency array di useRadioParticipants (riga 60)
Il `toast` da `useToast()` non e' referenzialmente stabile. Questo causa ri-esecuzioni infinite del `useEffect` di caricamento partecipanti. Stesso problema in `useRadioConversations` (riga 65).

### 3. BUG: Race condition in InteractiveMicrophoneButton HYBRID mode (riga 264-289)
`stopCurrentChunk()` chiama `mediaRecorder.stop()` e poi immediatamente `transcribeCurrentChunk()`, ma `onstop` non e' ancora stato chiamato. I chunks audio potrebbero essere incompleti.

### 4. BUG: `transcribeAudio` usa callback asincrono dentro `reader.onloadend` (InteractiveMicrophoneButton:310-337)
`setIsProcessing(false)` nel `finally` viene eseguito PRIMA che `reader.onloadend` finisca, causando flash di UI.

### 5. PERFORMANCE: useRadioConversations carica token counts con N+1 queries (righe 37-59)
Per ogni conversazione, esegue 2 query separate (count + token sum). Con 20 conversazioni = 40 query aggiuntive.

### 6. DUPLICAZIONE: `startRecording` e `startListening` in InteractiveMicrophoneButton sono quasi identici (~90% codice condiviso).

### 7. DUPLICAZIONE: `transcribeAudio` e `transcribeCurrentChunk` differiscono solo per il filtro watermark.

### 8. INCONSISTENZA: RadioAudioControls ha la sua propria logica di invio messaggi all'orchestrator (righe 91-163), duplicando `useRadioSendMessage`.

### 9. UI: RadioMessagesView mostra solo il messaggio attivo (`if (!isActive) return null` riga 97), rendendo impossibile scrollare la cronologia.

### 10. MINOR: `useRadioPreferences` ha `debouncedSetZoom` con dependency array vuoto nel `useCallback` (riga 36), non e' un problema ma potrebbe dare warning con eslint.

---

## Piano di Refactoring

### Step 1: Fix bug critico useMemo → useEffect
**File:** `src/hooks/useRadioCarouselNav.ts`
- Cambiare `useMemo` a riga 21 in `useEffect` per il side-effect di auto-select primo messaggio AI.

### Step 2: Stabilizzare toast nelle dependency arrays
**Files:** `src/hooks/useRadioParticipants.ts`, `src/hooks/useRadioConversations.ts`
- Usare pattern `useRef` per `toast` (come gia' fatto in `useRadioAuth`) per evitare ri-esecuzioni.

### Step 3: Fix race condition HYBRID mode
**File:** `src/components/chat-laboratory/InteractiveMicrophoneButton.tsx`
- In `stopCurrentChunk`, attendere l'evento `onstop` del MediaRecorder prima di trascrivere.
- Unificare `startRecording`/`startListening` in una singola funzione `startCapture`.
- Unificare `transcribeAudio`/`transcribeCurrentChunk` con parametro opzionale per filtro watermark.
- Fix `reader.onloadend` per usare Promise invece di callback, cosi' `setIsProcessing(false)` avviene al momento giusto.

### Step 4: Eliminare duplicazione invio messaggi da RadioAudioControls
**File:** `src/components/radio-chat/RadioAudioControls.tsx`
- Aggiungere prop `onSendMessage: (text: string) => void` che delega a `useRadioSendMessage.sendMessage`.
- Rimuovere la logica duplicata di insert + orchestrator call (righe 91-163).
- Passare `sendMessage` dal parent `RadioChat.tsx`.

### Step 5: Ottimizzare N+1 queries in useRadioConversations
**File:** `src/hooks/useRadioConversations.ts`
- Usare una singola query aggregata con `supabase.rpc()` o caricare i conteggi in batch, invece di N query per conversazione.

### Step 6: Migliorare RadioMessagesView per mostrare cronologia
**File:** `src/components/radio-chat/RadioMessagesView.tsx`
- Rimuovere il `if (!isActive) return null` e mostrare tutti i messaggi, con il messaggio attivo evidenziato e autoplay solo su quello attivo.

---

## Riepilogo Impatto

| Step | Rischio | File Modificati | Funzionalita' Preservate |
|------|---------|----------------|-------------------------|
| 1 | Basso | 1 | Si - solo fix bug |
| 2 | Basso | 2 | Si - solo fix re-render |
| 3 | Medio | 1 | Si - mic funziona meglio |
| 4 | Medio | 2 | Si - stessa UX, meno codice |
| 5 | Basso | 1 | Si - stessi dati, meno query |
| 6 | Basso | 1 | Si - UX migliorata |

Nessuna funzionalita' base viene rimossa. Tutti gli step sono backward-compatible.

