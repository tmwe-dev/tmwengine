
Obiettivo: eliminare i problemi di sincronizzazione audio/UI in Radio Chat (Carousel, Messages, Tabs), garantendo lettura completa per agente, avanzamento corretto, nuova chat vuota all’apertura, e autoplay coerente con la vista visibile.

Diagnosi profonda (root cause confermate):
1) Le 3 viste sono sempre montate (`hidden/block` via CSS in `RadioChat.tsx`): `MessageTabsView` continua a girare in background e può avviare audio anche quando sei in Carousel.
2) Stato audio frammentato: Carousel usa `useRadioAudioPlayback` (globale), Tabs usa `useAudioPlayback` locale; non esiste un unico arbitro audio.
3) `MessageTabsView`/`useTabSwitching` non è robusto al cambio conversazione (stati/queue non sempre resettati), e mette in coda anche messaggi `human` (può bloccare o sfasare l’avanzamento).
4) Persistenza conversazione: `useRadioConversations` riprende `radio-current-conversation-id` da localStorage, quindi all’apertura ricarica la chat vecchia.
5) `useRadioMessages` non pulisce lo stato quando `conversationId=null` e non protegge da race async (risposta tardiva di una fetch vecchia può sporcare la UI corrente).
6) Cambio vista durante playback: possibile stato audio globale “stale” se il player viene smontato senza reset esplicito.
7) Verifica DB: i messaggi risultano separati per agente e ordinati; il problema principale è di orchestrazione frontend, non di salvataggio backend.

Piano di refactoring ottimizzato (market-grade):

Fase 0 — Safety/backup (obbligatoria)
- Backup dei file Radio Chat coinvolti in `docs/...pre-radio-sync-refactor`.
- Log change nel tracciamento progetto/changelog come da policy.

Fase 1 — Isolamento vista attiva (fix critico)
- `RadioChat.tsx`: rendere mutualmente esclusivo il mount delle viste (non solo `hidden` CSS).
- Solo la vista attiva esiste nel DOM; niente side-effect/audio in background.
- Al cambio vista: stop/reset audio centralizzato prima del mount della nuova vista.

Fase 2 — Unificazione playback controller
- Introdurre un controller unico (hook dedicato) per:
  - `active_message_id`
  - `current_playing_id`
  - `is_audio_playing`
  - `advance_to_next()`
  - guardia “single-audio-at-a-time” via ref condiviso
- Tabs e Messages devono usare lo stesso controller del Carousel (niente `useAudioPlayback` locale nei Tabs).

Fase 3 — Sequenza deterministica per agente
- Tabs: autoplay solo del tab visibile.
- Avanzamento solo su evento `ended` reale del messaggio corrente.
- Escludere messaggi `human` dalla coda audio automatica.
- Reset completo queue/seen/active al cambio conversazione.
- Garantire: “un agente finisce tutto il suo audio prima di passare al successivo”.

Fase 4 — Startup “nuova chat vuota”
- Cambiare policy iniziale in `useRadioConversations`:
  - default: sessione nuova (no resume automatico della vecchia).
  - opzionale (futuro): toggle “Riprendi ultima chat”.
- `useRadioMessages`: quando `conversationId` è null, `setMessages([])` immediato.
- Aggiungere guardia anti-race nelle fetch (`request_id`/abort pattern).

Fase 5 — Hardened sync & resilienza
- Rifinire `useRadioMessages`: try/catch completi + fallback poll leggero se realtime perde eventi.
- Rimuovere trigger prematuri che alterano stati di invio/playback fuori sequenza.
- Logging tecnico coerente per timeline audio->tab->next.

File target principali:
- `src/pages/RadioChat.tsx`
- `src/hooks/useRadioConversations.ts`
- `src/hooks/useRadioMessages.ts`
- `src/components/chat-laboratory/MessageTabsView.tsx` (o wrapper Radio dedicato)
- `src/hooks/useTabSwitching.ts` (o sostituzione con hook Radio unificato)
- Nuovo hook audio coordinator Radio (single source of truth)

Criteri di accettazione (must-pass):
1) Aprendo `/radio-chat` vedi chat nuova vuota, non la precedente.
2) In Carousel/Tabs/Messages non parte mai audio da viste non visibili.
3) Un solo audio alla volta; nessuna sovrapposizione.
4) Fine audio => avanzamento alla pagina successiva corretta (se autorun attivo).
5) Navigando avanti/indietro nei tab, viene letto solo il messaggio della pagina frontale.
6) Nessun “mix” percepito tra agenti: testo e voce restano accoppiati allo stesso messaggio/agente.
7) Test end-to-end su conversazione con 3 agenti e più turni consecutivi, incluso cambio vista durante playback.
