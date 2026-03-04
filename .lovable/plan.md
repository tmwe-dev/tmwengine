

# Piano: Fix Sincronizzazione Audio — Voci Che Partono Insieme

## Causa Root

Il problema ha due livelli:

### Lato Orchestrator (Backend)
L'orchestrator e' **gia' sequenziale** — processa un agente alla volta (linee 205-363 di `index.ts`). Ogni messaggio viene salvato nel DB con `audio_url` prima di passare al prossimo agente. Non c'e' problema lato backend.

### Lato Frontend (IL VERO PROBLEMA)
Quando i messaggi arrivano via realtime subscription uno dopo l'altro:

1. **Messaggio 1 arriva** → `activeMessageId` viene settato → `RadioCarouselAudioPlayerWrapper` monta con `autoPlay=true` → audio parte
2. **Messaggio 2 arriva** (dopo ~5-15 secondi) → il componente si ri-renderizza. Se `activeMessageId` non cambia, il player del messaggio 1 continua. Ma se qualcosa causa un rimontaggio (es. `currentMessage` cambia ref), un NUOVO `Audio()` puo' essere creato senza che il precedente venga stoppato.
3. **Il `canAutoPlay` e' hardcoded a `true`** in `RadioCarouselAudioPlayerWrapper` (linea 55) — non controlla MAI se un altro audio e' gia' in riproduzione.

Il `sharedAudioRef` stoppa l'audio solo quando `stopCurrentAudio()` viene chiamato esplicitamente (cambio card manuale). Ma quando il player si rimonta per lo stesso messaggio a causa di un re-render, il cleanup chiama `audio.pause()` e il nuovo `useEffect` crea un nuovo `Audio()` che fa autoplay — ma tra cleanup e mount c'e' un gap dove il ref viene nullificato.

## Soluzione

### 1. `RadioCarouselAudioPlayerWrapper.tsx` — Rispettare lo stato globale
- Passare `canAutoPlay` basandosi su `isAudioPlaying` dal parent: `canAutoPlay={!isAudioPlaying}`
- Accettare nuova prop `isAudioPlaying` dal parent

### 2. `RadioAudioPlayer.tsx` — Guard sull'autoplay
- Prima di fare `audio.play()` nell'autoplay, controllare `sharedAudioRef.current` — se un altro audio e' gia' in esecuzione, NON fare play
- Aggiungere guard: `if (sharedAudioRef?.current && !sharedAudioRef.current.paused) return;`

### 3. `useRadioCarouselNav.ts` — Non auto-avanzare durante la riproduzione
- `handleCarouselAudioEnd`: aggiungere un delay piu' lungo (300ms invece di 50ms) per dare tempo allo state di propagarsi prima di settare il nuovo `activeMessageId`

### 4. `RadioChat.tsx` — Passare `isAudioPlaying` al wrapper
- Aggiungere prop `isAudioPlaying` a `RadioCarouselAudioPlayerWrapper`

## File da modificare

| File | Modifica |
|------|----------|
| `src/components/radio-chat/RadioCarouselAudioPlayerWrapper.tsx` | Aggiungere prop `isAudioPlaying`, passare `canAutoPlay={!isAudioPlaying}` ai player figli |
| `src/components/radio-chat/RadioAudioPlayer.tsx` | Guard sull'autoplay: controllare `sharedAudioRef` prima di play |
| `src/hooks/useRadioCarouselNav.ts` | Delay 300ms nel `handleCarouselAudioEnd` |
| `src/pages/RadioChat.tsx` | Passare `isAudioPlaying` al wrapper |

## Flusso dopo il fix

```text
Messaggio 1 arriva → autoPlay=true, canAutoPlay=true → PLAY ✅
  → handleAudioStart() → isAudioPlaying=true

Messaggio 2 arriva (durante play msg 1):
  → RadioCarouselAudioPlayerWrapper riceve isAudioPlaying=true
  → canAutoPlay={!isAudioPlaying} = false
  → Player NON fa autoplay ✅

Audio msg 1 finisce → handleCarouselAudioEnd()
  → handleAudioEnd() → isAudioPlaying=false
  → 300ms delay
  → setActiveMessageId(msg2.id)
  → Wrapper rimonta con canAutoPlay=true → PLAY ✅
```

Rischio: **Basso** — Solo 4 file, modifiche additive, nessun cambio grafico.

