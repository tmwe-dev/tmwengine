

# Analisi Completa Radio Chat — Struttura, Feature e Problemi

## Architettura Attuale

**RadioChat.tsx** (305 righe) — Orchestratore principale che delega a:

### 10 Hook Modulari
| Hook | Righe | Funzione |
|------|-------|----------|
| `useRadioAuth` | 44 | Autenticazione Supabase |
| `useRadioParticipants` | 76 | Caricamento agenti da `elevenlabs_agents`, mapping tipo→nome |
| `useRadioConversations` | 169 | CRUD conversazioni, batch token count |
| `useRadioMessages` | 80 | Messaggi + realtime subscription (INSERT/UPDATE) |
| `useRadioSendMessage` | 80 | Invio messaggio → orchestrator edge function |
| `useRadioPromptCache` | 62 | Cache prompt composti/personalita/stili |
| `useRadioSummary` | 64 | Generazione riassunti via `generate-chunked-summary` |
| `useRadioCarouselNav` | 100 | Navigazione carousel: prev/next, swipe, wheel, auto-advance |
| `useRadioPreferences` | 50 | Persistenza localStorage: viewMode, zoom, offset, autoAdvance |
| `useRadioUIState` | 57 | Stato UI: sidebar, input, debug, mouse proximity |
| `useRadioAudioPlayback` | 45 | Stato audio globale: playing/stopped/error |

### 6+ Componenti Modulari
| Componente | Funzione |
|------------|----------|
| `RadioLayout` | Guscio layout (sidebar, ghost icons, main, input, debug, controls, AI sidebar) |
| `RadioSidebarPanel` | Container sidebar con tab Chat/Impostazioni |
| `RadioGhostIcons` | 5 icone laterali (AI, Hamburger, FileText, Mic, Keyboard) con proximity detection |
| `RadioCarouselContainer` | Carousel 3D + avatar navigation + zoom controls |
| `RadioMessagesView` | Vista messaggi verticale con `MultiAgentMessage` |
| `RadioInputArea` | Input testuale con send button |
| `RadioDebugPanel` | Debug panel (solo DEV) |
| `RadioCarouselAudioPlayerWrapper` | Player audio mini/esteso per carousel |
| `RadioAudioControls` | Controlli microfono (PTT/Listen), VAD, word limit |

### Edge Function: `radio-chat-orchestrator` (400 righe)
- Riceve `conversationId`, `userMessage`, `participants`, `cachedPrompts`
- Carica config, prompt, history in parallelo
- Multi-agent: tutti gli agenti attivi rispondono in sequenza
- Ogni risposta: AI call → save DB → genera audio TTS
- Strategy (SMART_PRIORITY, ROUND_ROBIN) determina l'ordine

---

## Problemi Identificati

### 1. DUE SISTEMI AUDIO PARALLELI INCOMPATIBILI
Il problema piu' grave. Esistono **due hook audio separati** usati in contesti diversi:

- **`useRadioAudioPlayback`** (in RadioChat.tsx) — usato dal Carousel view. Ha `currentPlayingId`, `canPlayAudio()`, `stopCurrentAudio()`.
- **`useAudioPlayback`** (in RadioMessagesView e MessageTabsView) — usato dalle viste Messages e Tabs. NON ha `currentPlayingId`, NON ha `stopCurrentAudio()`.

Quando si passa da una vista all'altra, lo stato audio non viene sincronizzato. L'audio puo' continuare a suonare nella vista precedente mentre la nuova vista non sa che e' in corso.

### 2. TABS VIEW FILTRA I MESSAGGI HUMAN
In RadioChat.tsx riga 229: `messages.filter(m => m.sender_type !== 'human')` — la vista Tabs non mostra i messaggi dell'utente. Ma la vista Messages li mostra tutti. Comportamento incoerente.

### 3. MESSAGES VIEW USA HOOK AUDIO INDIPENDENTE
`RadioMessagesView` crea il suo proprio `useAudioPlayback()` e `useTabSwitching()` internamente (righe 22-36). Questo stato audio e' completamente scollegato da quello del parent (`useRadioAudioPlayback`). Risultato: il carousel non sa quando l'audio finisce nella vista messaggi e viceversa.

### 4. MESSAGES VIEW USA `useTabSwitching` (INCONGRUENZA)
`RadioMessagesView` importa `useTabSwitching` per gestire l'highlight dei messaggi. Ma `useTabSwitching` e' progettato per la vista Tabs (gestisce `activeTab`, coda messaggi non visti). Nella vista Messages, dove tutti i messaggi sono visibili contemporaneamente, questa logica non ha senso — causa evidenziazione random e comportamenti confusi.

### 5. `RadioMessageView` NON USA IL PLAYER AUDIO
Il componente `RadioMessageView` (usato dentro il carousel overlay) riceve `onAudioStart` e `isAudioEnabled` come props ma NON renderizza nessun player audio (righe 23-35). E' un semplice display di testo. L'audio del carousel viene gestito separatamente da `RadioCarouselAudioPlayerWrapper`.

### 6. DUPLICAZIONE CONVERSAZIONI RADIO/LAB
Radio Chat usa le stesse tabelle del Chat Laboratory (`chat_laboratory_conversations`, `chat_laboratory_messages`). Nessun filtro per distinguere le conversazioni Radio da quelle Lab. Nella sidebar conversazioni appaiono tutte mescolate.

### 7. SIDEBAR DOPPIA: `RadioSidebar` DENTRO `RadioSidebarPanel`
`RadioSidebarPanel` contiene `RadioSidebar` come child. Ma `RadioSidebar` ha il suo proprio layout fisso con header, close button e backdrop — tutto gia' gestito dal parent `RadioSidebarPanel`. Risultato: doppio header, doppio close button.

### 8. CAROUSEL NAV: `activeMessageId` VUOTO ALL'AVVIO
`useRadioCarouselNav` setta `activeMessageId` solo quando `firstAiMessageId` cambia e `activeMessageId` e' vuoto. Ma se l'utente ricarica con una conversazione salvata, i messaggi vengono caricati e `firstAiMessageId` viene settato prima che il component si monti, causando potenziali race condition.

---

## Piano di Fix

### Step 1: Unificare il sistema audio
Creare un singolo `useRadioAudioPlayback` come unica fonte di verita' per lo stato audio globale. Rimuovere i `useAudioPlayback()` interni da `RadioMessagesView`. Passare lo stato audio come props alle viste Messages e Tabs.

**File**: `src/components/radio-chat/RadioMessagesView.tsx`, `src/pages/RadioChat.tsx`

### Step 2: Fix RadioMessagesView — rimuovere useTabSwitching
Rimuovere `useTabSwitching` da `RadioMessagesView`. I messaggi nella vista lista non hanno bisogno di "tab switching" — sono tutti visibili. Mantenere solo l'auto-scroll all'ultimo messaggio e l'evidenziazione del messaggio corrente in playback.

**File**: `src/components/radio-chat/RadioMessagesView.tsx`

### Step 3: Fix Tabs View — includere messaggi human
Rimuovere il filtro `sender_type !== 'human'` dalla vista Tabs in RadioChat.tsx. Passare tutti i messaggi cosi' come nelle altre viste, lasciando al componente `MessageTabsView` la decisione su come visualizzarli.

**File**: `src/pages/RadioChat.tsx`

### Step 4: Fix RadioSidebar duplicazione layout
`RadioSidebar` quando viene usato dentro `RadioSidebarPanel` deve comportarsi come contenuto puro senza il suo wrapper fisso, backdrop e header. Aggiungere una prop `embedded` per sopprimere il layout esterno.

**File**: `src/components/radio-chat/RadioSidebar.tsx`

### Step 5: Passare stato audio alle viste come props
Aggiungere props `isAudioPlaying`, `onAudioStart`, `onAudioEnd` a `RadioMessagesView` e alla vista Tabs wrapper, collegate al singolo `useRadioAudioPlayback` del parent.

**File**: `src/pages/RadioChat.tsx`, `src/components/radio-chat/RadioMessagesView.tsx`

### Riepilogo File Modificati

| File | Modifica | Rischio |
|------|----------|---------|
| `src/components/radio-chat/RadioMessagesView.tsx` | Rimuovere hook audio/tab interni, ricevere stato audio da props | Medio |
| `src/pages/RadioChat.tsx` | Passare audio state alle viste, fix filtro tabs | Basso |
| `src/components/radio-chat/RadioSidebar.tsx` | Aggiungere prop `embedded` per uso dentro RadioSidebarPanel | Basso |

### NON TOCCARE
- `radio-chat-orchestrator/index.ts` — funziona correttamente (multi-agent verificato)
- `useRadioCarouselNav.ts` — logica carousel funzionante
- `RadioCarouselContainer.tsx` — nessun problema
- `RadioConversationsSidebar.tsx` — funzionante
- `useRadioConversations.ts` — funzionante
- `useRadioParticipants.ts` — funzionante

