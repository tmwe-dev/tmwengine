
# Piano di Ricostruzione Radio Chat

## Stato Attuale

RadioChat.tsx e un monolite di 1537 righe con 25+ useState, 80+ console.log, logica DB inline, gestione audio frammentata, e rendering Three.js accoppiato. Il backend orchestrator funziona ma ha 4 file backup legacy e un modulo config-loader duplicato.

## Strategia: Decomposizione in Micro-Moduli

Ogni micro-sezione e un file autonomo, testabile e sostituibile. L'ordine di esecuzione segue le dipendenze: prima i tipi, poi gli hook, poi i componenti, infine il cleanup.

---

## FASE 1 -- Backup e Preparazione

**1.1** Creare backup `src/pages/RadioChat-backup-2026-02-15.tsx`
**1.2** Creare backup orchestrator `index-backup-2026-02-15.ts`
**1.3** Aggiornare `docs/EDGE_FUNCTIONS_CHANGELOG.md`

---

## FASE 2 -- Tipi e Interfacce

**2.1** Estendere `src/types/radio.ts` con interfacce mancanti:

```text
RadioParticipant {id, type, name, is_active, voice_id}
RadioConversation {id, titolo, created_at, updated_at, ...stats}
RadioViewMode = 'carousel' | 'messages'
RadioSidebarTab = 'conversations' | 'settings'
```

Attualmente `RadioParticipant` e definito inline nella pagina (riga 40-46). Va centralizzato.

---

## FASE 3 -- Hook: Autenticazione

**3.1** Creare `src/hooks/useRadioAuth.ts`
- Estrae il blocco righe 146-165 (checkAuth)
- Espone: `{currentUser, isAuthenticated, isLoading}`
- Nessuna dipendenza da altri hook radio

---

## FASE 4 -- Hook: Partecipanti

**4.1** Creare `src/hooks/useRadioParticipants.ts`
- Estrae righe 178-266 (loadParticipants) + righe 990-1007 (handleToggleParticipant)
- Query `elevenlabs_agents` con mapping tipo/nome
- Espone: `{participants, toggleParticipant, isLoading}`

---

## FASE 5 -- Hook: Conversazioni CRUD

**5.1** Creare `src/hooks/useRadioConversations.ts`
- Estrae righe 293-466 (loadConversations, handleSelectConversation, handleNewConversation, handleDeleteConversation, handleUpdateTitle)
- Gestione localStorage per `radio-current-conversation-id`
- Espone: `{conversations, currentConversationId, selectConversation, createConversation, deleteConversation, updateTitle}`

---

## FASE 6 -- Hook: Messaggi e Realtime

**6.1** Creare `src/hooks/useRadioMessages.ts`
- Estrae righe 822-854 (loadMessages) + righe 1010-1112 (realtime subscription INSERT + UPDATE)
- Subscription Supabase `postgres_changes` con deduplica
- Espone: `{messages, loadMessages, isSending, setIsSending}`

---

## FASE 7 -- Hook: Invio Messaggi (Orchestrator)

**7.1** Creare `src/hooks/useRadioSendMessage.ts`
- Estrae righe 880-988 (handleSend)
- Dipende da: `useRadioConversations` (convId), `useRadioMessages` (isSending), `useRadioParticipants` (participants)
- Include timeout 90s e chiamata `radio-chat-orchestrator`
- Espone: `{sendMessage, isSending}`

---

## FASE 8 -- Hook: Prompt Cache

**8.1** Creare `src/hooks/useRadioPromptCache.ts`
- Estrae righe 576-689 (loadCachedPrompts)
- Query parallele: system_prompts, prompt_sections, composed_prompts
- Espone: `{cachedPrompts, loadCachedPrompts}`

---

## FASE 9 -- Hook: Summary e Report

**9.1** Creare `src/hooks/useRadioSummary.ts`
- Estrae righe 469-574 (handleGenerateSummary, handleGenerateFullReport, generateMarkdownReport)
- Chiamata edge function `generate-chunked-summary`
- Espone: `{generateSummary, generateFullReport}`

---

## FASE 10 -- Hook: Navigazione Carousel

**10.1** Creare `src/hooks/useRadioCarouselNav.ts`
- Estrae righe 724-820 (activeMessageId, handlePrevCard, handleNextCard, touch/swipe/wheel)
- Gestione auto-advance con delay post-audio
- Espone: `{activeMessageId, setActiveMessageId, currentMessage, handlePrevCard, handleNextCard, handleCarouselAudioEnd, touchHandlers}`

---

## FASE 11 -- Hook: Preferenze UI

**11.1** Creare `src/hooks/useRadioPreferences.ts`
- Estrae tutti i localStorage persist (righe 76-100, 692-721):
  - `viewMode`, `isAutoAdvanceEnabled`, `carouselZoom`, `carouselVerticalOffset`
- Debounce per zoom gia incluso
- Espone: `{viewMode, setViewMode, isAutoAdvanceEnabled, setIsAutoAdvanceEnabled, carouselZoom, setCarouselZoom, verticalOffset, setVerticalOffset}`

---

## FASE 12 -- Hook: Ghost Icons e UI State

**12.1** Creare `src/hooks/useRadioUIState.ts`
- Estrae righe 102-128 (isNearLeftEdge, isHoveringInputZone, inputVisible, messageViewVisible, sidebarOpen, activeSidebarTab, debugPopupOpen, showAudioControls, aiSidebarOpen)
- Mouse proximity listener
- Espone tutti gli state booleani e i setter

---

## FASE 13 -- Componente: RadioLayout

**13.1** Creare `src/components/radio-chat/RadioLayout.tsx`
- Wrapper layout che assembla sidebar, contenuto principale, input area
- Riceve tutti gli hook come props
- Sostituisce il JSX monolitico (righe 1130-1535)

---

## FASE 14 -- Componente: RadioSidebarPanel

**14.1** Creare `src/components/radio-chat/RadioSidebarPanel.tsx`
- Estrae righe 1137-1200 (dual sidebar con tab Conversations/Settings)
- Riceve: activeSidebarTab, conversations, participants, handlers
- Contiene solo il pannello laterale, non i trigger

---

## FASE 15 -- Componente: RadioGhostIcons

**15.1** Creare `src/components/radio-chat/RadioGhostIcons.tsx`
- Estrae righe 1201-1285 (AISidebarTrigger, RadioSidebarTrigger, FileText, Mic, Keyboard)
- Riceve: shouldShowLeftIcons, sidebarOpen, e tutti i toggle handler
- Colonna verticale sinistra con icone fantasma

---

## FASE 16 -- Componente: RadioCarouselContainer

**16.1** Creare `src/components/radio-chat/RadioCarouselContainer.tsx`
- Estrae righe 1308-1427 (carousel 3D + aree cliccabili + avatar column + message view overlay + zoom control)
- Riceve: messages, activeMessageId, handlers navigazione, zoom, verticalOffset

---

## FASE 17 -- Componente: RadioInputArea

**17.1** Creare `src/components/radio-chat/RadioInputArea.tsx`
- Estrae righe 1442-1467 (input + send button + sending overlay)
- Riceve: inputValue, onChange, onSubmit, isSending, onClose

---

## FASE 18 -- Componente: RadioDebugPanel

**18.1** Creare `src/components/radio-chat/RadioDebugPanel.tsx`
- Estrae righe 1469-1496 (debug popup dev-only)
- Riceve: viewMode, activeMessageId, currentMessage, isSending, isAudioPlaying, messages, participants

---

## FASE 19 -- Assemblaggio RadioChat.tsx

**19.1** Riscrivere `src/pages/RadioChat.tsx` come orchestratore puro (~150 righe):

```text
RadioChat
  -> RadioAudioPlayerProvider
    -> RadioChatContent
      -> useRadioAuth()
      -> useRadioParticipants()
      -> useRadioConversations()
      -> useRadioMessages()
      -> useRadioSendMessage()
      -> useRadioPromptCache()
      -> useRadioSummary()
      -> useRadioCarouselNav()
      -> useRadioPreferences()
      -> useRadioUIState()
      -> useRadioAudioPlayback()
      -> RadioLayout
        -> RadioSidebarPanel
        -> RadioGhostIcons
        -> RadioCarouselContainer | RadioMessagesView
        -> RadioInputArea
        -> RadioDebugPanel
        -> RadioAudioControls
        -> AISidebarSlider
```

---

## FASE 20 -- Fix Audio ElevenLabs

**20.1** Correggere `audio-generator.ts`:
- Aumentare timeout da 15000ms a 30000ms (testi lunghi richiedono piu tempo)
- Aggiungere retry con backoff (1 retry dopo 2s)
- Validare `voiceId` prima della chiamata API

**20.2** Correggere matching voice agent nel orchestrator (riga 291):
- Attualmente: `activeVoiceAgents.some((v: any) => v.elevenlabs_agent_id === selectedAgent.id)`
- Il campo `selectedAgent.id` arriva dal frontend come `elevenlabs_agent_id` ma viene confrontato in modo ambiguo
- Normalizzare il confronto usando un campo univoco

**20.3** Aggiungere logging diagnostico quando audio_url resta null:
- Log esplicito: quale voiceId, quale agente, quale errore

---

## FASE 21 -- Pulizia Console.log

**21.1** Rimuovere tutti i `console.log` di debug dal codice di produzione nei nuovi hook/componenti
**21.2** Sostituire con logging condizionale: `if (import.meta.env.DEV)` solo dove necessario
**21.3** Rimuovere il blocco IIFE di debug nel render (righe 1132-1135)

---

## FASE 22 -- Pulizia Backend Legacy

**22.1** Eliminare file backup orchestrator:
- `index-20250129_1830.ts`
- `index-old-2025-01-12.ts`
- `index-old-2025-01-13.ts`
- `index-old-2025-01-19.ts`
- `config-loader-20250129_1830.ts`

**22.2** Aggiornare `docs/EDGE_FUNCTIONS_CHANGELOG.md` con la pulizia

---

## FASE 23 -- Documentazione e Log

**23.1** Aggiornare `docs/EDGE_FUNCTIONS_INVENTORY.md` con le modifiche
**23.2** Inserire record in `project_history`
**23.3** Aggiornare `docs/REFACTORING_MASTER_PLAN.md` con sezione Radio Chat

---

## Dettagli Tecnici

### Dipendenze tra Hook

```text
useRadioAuth -----> useRadioConversations -----> useRadioMessages
                         |                            |
                         v                            v
                    useRadioPromptCache         useRadioSendMessage
                                                      |
                                                      v
                                               useRadioParticipants
```

### File Creati (totale: 17)
- 1 backup pagina
- 1 backup edge function  
- 10 hook (`src/hooks/useRadio*.ts`)
- 6 componenti (`src/components/radio-chat/Radio*.tsx`)

### File Modificati
- `src/pages/RadioChat.tsx` (riscritto da 1537 a ~150 righe)
- `src/types/radio.ts` (interfacce aggiunte)
- `supabase/functions/radio-chat-orchestrator/lib/audio-generator.ts` (fix timeout + retry)
- `supabase/functions/radio-chat-orchestrator/index.ts` (fix voice matching)

### File Eliminati
- 5 file backup legacy nell'orchestrator
- 1 config-loader backup

### Rischio: MEDIO
- Nessuna modifica a tabelle DB
- Nessuna modifica a schema
- Refactoring puro: stessa logica, architettura diversa
- Rollback immediato: ripristinare backup fase 1
