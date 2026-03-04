

# Piano di Refactoring Completo — Radio Chat

## Analisi dei Problemi

### 1. File Morti (7 componenti mai importati dal codice attivo)
| File | Stato |
|------|-------|
| `RadioAudioSettingsPopup.tsx` | Mai importato |
| `RadioMessageList.tsx` | Solo dal backup |
| `RadioCursor.tsx` | Mai importato |
| `RadioParticipantIcon.tsx` | Solo dal backup |
| `RadioVoiceRecorder.tsx` | Sostituito da `InteractiveMicrophoneButton` |
| `RadioVoiceRecorderV2_Hybrid.tsx` | Sostituito |
| `RadioMessageIcons.tsx` | Mai importato |
| `RadioChat-backup-2026-02-15.tsx` | Backup obsoleto (1000+ righe) |

### 2. Sdoppiamento Sidebar: `RadioSidebar.tsx` vs `RadioSidebarPanel.tsx`
`RadioSidebar.tsx` (127 righe) e' un componente legacy con logica duplicata. Il `RadioSidebarPanel` lo ha completamente sostituito ma `RadioSidebar` esiste ancora con standalone mode (backdrop, header, close button) che nessuno usa. La modalita' `embedded` non e' piu' invocata dal codice attivo.

### 3. Ghost Icons vs Header CRM
Il menu header dell'app (CRM) ha il proprio hamburger menu tramite `CRMLayoutContext`. Radio Chat ha un SECONDO hamburger (Beer icon) per il proprio sidebar. Quando entrambi sono aperti si sovrappongono. La logica di mutua esclusione e' gestita manualmente con `useEffect` e prop drilling di `crmMenuOpen/setCrmMenuOpen` attraverso 3 livelli di componenti.

### 4. Ghost Icons: 5 bottoni con visibilita' complessa
Ogni icona ha la propria logica show/hide basata su `showIcon(featureActive)`. La colonna e' compatta (`gap-1`) ma i bottoni sono alti 80px (`h-20`) ciascuno per i trigger e 56px (`h-14`) per FileText/Keyboard = totale ~400px di colonna verticale. Su schermi < 700px di altezza, overflow.

### 5. `RadioMessageView.tsx` quasi vuoto
Solo 35 righe, renderizza nome + contenuto senza formattazione markdown, senza audio player, senza metadata. Usato solo come overlay nel carousel. E' un componente incompleto rispetto a `MultiAgentMessage` usato in Messages view.

### 6. Tre viste con gestione inconsistente
- **Carousel**: Ha `RadioCarouselContainer` con 3D, avatar nav, zoom, overlay text. Audio via `RadioCarouselAudioPlayerWrapper`.
- **Messages**: Usa `RadioMessagesView` → `MultiAgentMessage` (dal Chat Laboratory). Audio integrato nei messaggi.
- **Tabs**: Usa `MessageTabsView` dal Chat Laboratory. Nessuna integrazione audio propria.

Le tre viste hanno integrazioni audio completamente diverse: il carousel usa un player esterno centralizzato, messages usa player inline, tabs non ha audio.

### 7. Props Drilling Eccessivo
`RadioChat.tsx` passa 25+ props a `RadioSidebarPanel`, 17 props a `RadioGhostIcons`. La pagina orchestratore e' a 311 righe ma ha 11 hook imports. Non e' critico ma la prop surface e' ampia.

---

## Piano di Refactoring (5 fasi)

### Fase 1: Pulizia File Morti
Eliminare 8 file non referenziati dal codice attivo:
- `RadioAudioSettingsPopup.tsx`
- `RadioMessageList.tsx`
- `RadioCursor.tsx`
- `RadioParticipantIcon.tsx`
- `RadioVoiceRecorder.tsx`
- `RadioVoiceRecorderV2_Hybrid.tsx`
- `RadioMessageIcons.tsx`
- `RadioChat-backup-2026-02-15.tsx`

**Rischio**: Nullo — nessun import attivo.

### Fase 2: Eliminare `RadioSidebar.tsx`
Il `RadioSidebarPanel` gestisce gia' tutto (3 tab: Chat/Agenti/Config). `RadioSidebar.tsx` ha due modalita':
- **Standalone**: Non usata (nessun import attivo la chiama senza `embedded`)
- **Embedded**: Il panel gia' integra direttamente `RadioParticipantSelector`, `RadioVoiceSelector`, `RadioStrategySelector`, `RadioPromptSelector` senza passare per RadioSidebar.

Azione: Eliminare `RadioSidebar.tsx`. Nessuna modifica ad altri file necessaria.

**Rischio**: Nullo.

### Fase 3: Unificare `RadioMessageView` con `MultiAgentMessage`
Il text overlay del carousel (`RadioMessageView`) mostra solo testo grezzo. Sostituirlo con una versione lightweight di `MultiAgentMessage` (solo testo + sender, senza audio player inline) per coerenza visiva tra le 3 viste.

File modificati:
- `RadioCarouselContainer.tsx`: Sostituire `RadioMessageView` con `MultiAgentMessage` (prop `compact={true}`)
- Eliminare `RadioMessageView.tsx`

**Rischio**: Basso.

### Fase 4: Ridurre il Prop Drilling con un Context dedicato
Creare `RadioChatContext` che espone le prop condivise (sidebar state, view mode, audio state, participants) cosi' i componenti figli possono consumarle direttamente senza passare attraverso RadioChat.tsx.

File:
- Nuovo: `src/contexts/RadioChatContext.tsx`
- Modificati: `RadioChat.tsx` (wrappa con provider), `RadioGhostIcons.tsx`, `RadioSidebarPanel.tsx` (consumano context invece di props)

Questo ridurra' `RadioSidebarPanel` da 25+ props a ~8 (solo callbacks specifiche come onSelectConversation, onNewConversation, etc.) e `RadioGhostIcons` da 17 props a ~3.

**Rischio**: Medio — richiede test completo delle interazioni.

### Fase 5: Compattare Ghost Icons per responsive
Ridurre le dimensioni dei trigger da `h-20` a `h-12` e `w-12` a `w-10`. Aggiungere un breakpoint `max-h-[600px]:hidden` per nascondere gli icon meno importanti (FileText, Keyboard) su schermi piccoli, dato che l'input e' accessibile tramite double-click sulla zona centrale e il message view e' disponibile nel carousel overlay.

File modificati:
- `RadioGhostIcons.tsx`
- `RadioSidebarTrigger.tsx` (ridurre dimensioni)
- `RadioMicTrigger.tsx` (ridurre dimensioni)
- `AISidebarTrigger.tsx` (ridurre dimensioni)

**Rischio**: Basso — solo CSS.

---

## NON TOCCARE
- `RadioCarousel3D.tsx` (477 righe Three.js)
- `FloatingZoomControl` e tutta la logica zoom
- `RadioCarouselContainer.tsx` (navigazione avatar, touch handlers, wheel)
- `RadioAudioPlayer.tsx`, `RadioAudioPlayerMini.tsx`, `RadioCarouselAudioPlayerWrapper.tsx` (appena fixati)
- `RadioAudioControls.tsx` (barra microfoni bottom)
- `AISidebarSlider` (indipendente)
- `useRadioCarouselNav`, `useRadioAudioPlayback` e tutti gli hook audio

## Riepilogo Impatto

| Metrica | Prima | Dopo |
|---------|-------|------|
| File in `radio-chat/` | 33 | 23 |
| Props RadioSidebarPanel | 25+ | ~8 |
| Props RadioGhostIcons | 17 | ~3 |
| Componenti duplicati | 3 (Sidebar, MessageView, ParticipantIcon) | 0 |
| File backup/morti | 8 | 0 |

