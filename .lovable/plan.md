

# Piano: Fix Audio Autoplay nel Carousel Radio Chat

## Diagnosi

Il flusso attuale ha **2 problemi critici** che impediscono l'autoplay:

### Problema 1: Browser Autoplay Policy
Quando l'utente invia un messaggio (vocale o testuale), passano ~25 secondi prima che l'orchestrator risponda. Il contesto "user gesture" del browser e' scaduto. La chiamata `audio.play()` nel `RadioAudioPlayerMini` viene silenziosamente bloccata dal browser (il `.catch` logga solo un warning).

**Soluzione**: Pre-creare e "sbloccare" un `HTMLAudioElement` durante il gesto utente (invio messaggio). Salvarlo nel `audioElementRef` condiviso. Quando arriva l'AI response, riutilizzare quell'elemento gia' sbloccato anziche' crearne uno nuovo.

### Problema 2: Auto-navigazione mancante per nuovi turni
In `useRadioCarouselNav`, l'auto-selezione del primo AI message funziona solo quando `activeMessageId === ''` (prima volta). Nei turni successivi, `activeMessageId` e' gia' impostato su un messaggio precedente, quindi i nuovi AI messages non vengono auto-selezionati e l'audio non parte.

**Soluzione**: Quando arrivano nuovi AI messages (dopo un invio dell'utente), auto-navigare all'ultimo messaggio AI ricevuto.

## Implementazione

### File 1: `src/hooks/useRadioAudioPlayback.ts`
- Aggiungere funzione `unlockAudioElement()` che crea un `Audio()`, chiama `.play()` con audio vuoto (sblocca il contesto browser), e lo assegna a `audioElementRef`.
- Questa funzione viene chiamata durante il gesto utente (click invio).

### File 2: `src/hooks/useRadioCarouselNav.ts`
- Aggiungere logica per rilevare nuovi AI messages e auto-navigare ad essi.
- Tracciare il conteggio precedente di `aiMessages` via ref. Quando aumenta, spostare `activeMessageId` al primo nuovo AI message.

### File 3: `src/components/radio-chat/RadioAudioPlayerMini.tsx`
- Modificare per riutilizzare `sharedAudioRef.current` se gia' presente (elemento pre-sbloccato) anziche' creare sempre un nuovo `Audio`.
- Impostare solo il `src` sull'elemento esistente.

### File 4: `src/pages/RadioChat.tsx`
- Nella funzione `handleSend`, chiamare `unlockAudioElement()` immediatamente (nel contesto del click/gesto) prima dell'`await sendMessage()`.

### File 5: `src/components/radio-chat/RadioAudioPlayer.tsx`
- Stessa modifica del MiniPlayer: riutilizzare `sharedAudioRef.current` se gia' pre-sbloccato.

## NON TOCCARE
- Sidebar, layout, CRMLayout
- Carousel 3D, Three.js
- Edge functions, database
- Contenuto sidebar, routing

## Rischio
**Basso** — Modifica isolata al flusso audio. Nessun impatto su layout o dati.

