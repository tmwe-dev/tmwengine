

# Analisi Completa Radio Chat — Piano di Refactoring

## Problemi Identificati

### BUG 1: Autenticazione blocca il flusso (CRITICO)
`useRadioAuth` tenta `getUser()` e `getSession()`. Senza login, entrambi falliscono. `currentUser` resta `null`, il toast "Non autenticato" appare, e `useRadioConversations(undefined)` carica solo conversazioni con `user_id IS NULL`. Le nuove conversazioni create si accumulano senza `user_id`, ma se poi un utente si logga, non le vede piu'.

**Fix**: In dev mode (auth bypass), `useRadioAuth` deve impostare un utente fittizio o semplicemente non bloccare il flusso. Le conversazioni devono caricarsi senza filtro `user_id` quando non c'e' autenticazione.

### BUG 2: `createConversation` e `createQuickConversation` duplicati
Quando si invia il primo messaggio senza conversazione, `useRadioSendMessage` chiama `createQuickConversation` per creare una conversazione al volo. Ma l'utente potrebbe aver gia' cliccato "Nuova conversazione" (che chiama `createConversation`). Risultato: conversazioni duplicate. Inoltre `createQuickConversation` non chiama `setConversationId`, quindi il `currentConversationId` non si aggiorna nel parent.

**Fix**: Unificare la logica di creazione. `createQuickConversation` deve anche fare `setConversationId(data.id)`.

### BUG 3: `useEffect` per caricare conversazioni dipende da `currentUser?.id`
Riga 73-82 di `RadioChat.tsx`: `loadConversations()` parte solo se `currentUser?.id` e' truthy. Con auth bypass, `currentUser` e' `null` e le conversazioni non si caricano mai automaticamente.

**Fix**: Rimuovere la dipendenza da `currentUser?.id` per il caricamento iniziale, o usare un flag `isReady` indipendente dall'auth.

### BUG 4: `clearMessages()` non resetta `activeMessageId` nel carousel
In `handleNewConversation`, `setActiveMessageId('')` viene chiamato ma `useRadioCarouselNav` ha il suo `activeMessageId` interno. L'`useEffect` alla riga 21-25 del carousel nav si riattiva solo quando `firstAiMessageId` cambia, ma con messaggi vuoti non c'e' trigger di reset. Il vecchio `activeMessageId` puo' persistere creando uno stato inconsistente.

**Fix**: Esporre un `resetCarousel()` dal hook carousel nav, chiamato da `handleNewConversation`.

### BUG 5: `localStorage` stale conversation ID
`currentConversationId` inizializzato da `localStorage` (riga 8-10 di `useRadioConversations`). Se la conversazione salvata e' stata eliminata, il sistema tenta di caricare messaggi per una conversazione inesistente senza fallback.

**Fix**: Validare il `localStorage` ID contro le conversazioni caricate. Se non esiste piu', reset a `null`.

### BUG 6: Realtime subscription non si attiva su nuova conversazione creata da `sendMessage`
`useRadioMessages` si iscrive al canale realtime basandosi su `conversationId`. Ma quando `sendMessage` crea una conversazione via `createQuickConversation`, il `conversationId` passato a `useRadioMessages` e' ancora `null` al momento della creazione. Il nuovo ID viene settato via `setConversationId` ma il re-render e la nuova subscription avvengono dopo che l'orchestrator ha gia' salvato i messaggi, quindi i messaggi AI potrebbero arrivare prima che la subscription sia attiva.

**Fix**: Dopo `createQuickConversation` in `sendMessage`, fare `await loadMessages(convId)` con un piccolo delay post-orchestrator, oppure assicurarsi che la subscription si attivi prima della chiamata all'orchestrator.

## Piano di Intervento (Solo Logica, Nessun Cambio Grafico)

### 1. `useRadioAuth.ts` — Bypass completo in dev
- Se `getUser()` e `getSession()` falliscono, impostare `currentUser` a un oggetto fittizio `{ id: 'dev-anonymous' }` invece di `null`
- Rimuovere il toast "Non autenticato" in modalita' dev/bypass

### 2. `useRadioConversations.ts` — Fix creazione e caricamento
- `createQuickConversation`: aggiungere `setConversationId(data.id)` dopo la creazione
- `loadConversations`: se `userId` e' il dev anonymous ID, caricare tutte le conversazioni senza filtro `user_id`
- Validare `localStorage` ID dopo il caricamento delle conversazioni

### 3. `useRadioMessages.ts` — Robustezza subscription
- Aggiungere un controllo che, se `conversationId` cambia da null a un valore, forzi un `loadMessages` immediato dopo un breve delay (per catturare messaggi inseriti prima della subscription)

### 4. `useRadioCarouselNav.ts` — Reset state
- Aggiungere ed esporre funzione `resetNavigation()` che resetta `activeMessageId` a `''`
- Gestire il caso in cui `aiMessages` diventa vuoto (nuova conversazione)

### 5. `RadioChat.tsx` — Orchestrazione corretta
- Rimuovere la condizione `if (currentUser?.id)` dal `useEffect` di caricamento iniziale
- In `handleNewConversation`, chiamare il nuovo `resetNavigation()`
- Aggiungere validazione del `localStorage` conversation ID all'avvio

### File da Modificare

| File | Rischio |
|------|---------|
| `src/hooks/useRadioAuth.ts` | Basso |
| `src/hooks/useRadioConversations.ts` | Basso |
| `src/hooks/useRadioMessages.ts` | Basso |
| `src/hooks/useRadioCarouselNav.ts` | Basso |
| `src/pages/RadioChat.tsx` | Basso |

### File NON toccati
- Nessun componente UI/grafico
- Nessuna edge function
- Nessuna tabella DB

