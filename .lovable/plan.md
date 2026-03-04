

# Piano: Ricompattamento Menu e Controlli Radio Chat

## Analisi Completa dei Componenti Menu/UI

Dopo analisi riga per riga, ecco la mappa completa degli elementi UI legati ai menu:

### Ghost Icons (barra sinistra, 5 bottoni verticali)
Posizionati `fixed left-0` con spacing verticale hardcoded:
1. **AISidebarTrigger** — `bottom-[24rem]` — Apre AI Sidebar slider
2. **RadioSidebarTrigger** (Beer icon) — `bottom-[18.5rem]` — Apre sidebar panel (Chat + Impostazioni)
3. **FileText** — `bottom-[13rem]` — Toggle message view overlay
4. **RadioMicTrigger** — `bottom-[7.5rem]` — Toggle audio controls bar
5. **Keyboard** — `bottom-8` — Toggle text input

### Sidebar Panel (320px, fixed left)
Due tab:
- **Chat**: `RadioConversationsSidebar` (497 righe) — lista conversazioni con search, date filter, hover cards, edit, delete, summary, report
- **Impostazioni**: `RadioSidebar` embedded — contiene:
  - `RadioParticipantSelector` (agenti con GIF)
  - Tabs Voice/Strategy/Prompts:
    - Voice: view mode selector (Carousel/Messages/Tabs), carousel zoom slider, `RadioVoiceSelector` (audio toggle + auto-advance toggle)
    - Strategy: `RadioStrategySelector` (4 strategie)
    - Prompts: `RadioPromptSelector` (global + composed prompts)

### Bottom Controls (fisso centro-basso)
- `RadioCarouselAudioPlayerWrapper` — mini player audio
- `RadioAudioControls` — barra microfoni PTT/Listen + VAD slider + word limit

### AI Sidebar (slider destro)
- `AISidebarSlider` — assistant AI indipendente

## Problemi Identificati

1. **5 ghost icons** con spacing hardcoded creano una colonna fragile e poco compatta
2. **RadioSidebar** mischia view mode, zoom, voice settings, strategy e prompts in modo confuso — il tab "Voice" contiene i bottoni view mode che non c'entrano con le voci
3. **RadioConversationsSidebar** ha header duplicato (X button + titolo) sopra i tab del panel
4. La logica show/hide dei ghost icons e' complessa (mouse proximity + stato apertura) ma funzionale

## Soluzione: Riorganizzazione Compatta

### NON TOCCARE
- Carousel 3D, zoom controls, `RadioCarousel3D`, `FloatingZoomControl`
- `RadioCarouselContainer` (avatar navigation, zoom)
- Audio playback logic, audio players
- `AISidebarSlider` (gia' indipendente)
- `RadioAudioControls` (bottom bar microfoni)

### Modifiche

**1. `RadioGhostIcons.tsx` — Compattare in colonna unificata**
- Raggruppare i 5 bottoni in un container `flex flex-col` con `gap-1` invece di posizioni `bottom-[Xrem]` hardcoded
- Usare un singolo `fixed left-0 bottom-8` container
- Mantere stessa logica di visibilita' (mouse proximity)
- Stessi stili (trasparente, rounded-r, border border-white/20)

**2. `RadioSidebarPanel.tsx` — Riorganizzare i tab**
- Rimuovere header duplicato da `RadioConversationsSidebar` (la X e' gia' sul panel)
- Cambiare i 2 tab a 3 tab: **Chat | Agenti | Config**
  - **Chat**: lista conversazioni (invariata ma senza header duplicato)
  - **Agenti**: `RadioParticipantSelector` + `RadioVoiceSelector` (audio on/off, auto-advance)
  - **Config**: `RadioStrategySelector` + `RadioPromptSelector` + View Mode selector
- Rimuovere carousel zoom dal sidebar (e' gia' nel `FloatingZoomControl`)

**3. `RadioConversationsSidebar.tsx` — Rimuovere header duplicato**
- Rimuovere il blocco header con titolo "Conversazioni" e X button (linee 166-174)
- Il panel parent gia' gestisce la chiusura

**4. `RadioSidebar.tsx` — Semplificare**
- Rimuovere view mode buttons (spostati in Config tab del panel)
- Rimuovere carousel zoom slider (gia' nel FloatingZoomControl)
- Mantenere solo il contenuto embedded usato dal panel

**5. `RadioSidebarPanel.tsx` — Aggiungere close button nell'header tab**
- Aggiungere X button a fianco dei tab per chiudere il panel

## File da modificare

| File | Azione |
|------|--------|
| `RadioGhostIcons.tsx` | Colonna compatta con gap invece di posizioni hardcoded |
| `RadioSidebarPanel.tsx` | 3 tab (Chat/Agenti/Config) + X button nell'header |
| `RadioConversationsSidebar.tsx` | Rimuovere header duplicato |
| `RadioSidebar.tsx` | Rimuovere view mode + zoom (spostati nel panel) |

**Rischio**: Basso — Solo riorganizzazione layout, nessuna logica funzionale modificata. Il carousel e lo zoom non vengono toccati.

