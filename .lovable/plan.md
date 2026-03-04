

# Piano: Fix Audio Sequenziale — Voci Che Partono Insieme e Nessun Avanzamento

## Causa Root (3 problemi interconnessi)

### Problema 1: `isAudioPlaying` non viene MAI settato a `true`
Il `RadioCarouselAudioPlayerWrapper` ha `onPlayStart` che fa solo `console.log`:
```
onPlayStart={(id) => console.log(`▶️ [Carousel Mini] Audio START: ${id}`)}
```
Non chiama MAI `handleAudioStart` dal parent. Quindi `isAudioPlaying` resta `false`, `canAutoPlay={!isAudioPlaying}` e' sempre `true`, e la guard non funziona. Ogni nuovo messaggio che arriva via realtime puo' fare autoplay.

### Problema 2: Closure stale su `onPlayEnd` nel Mini Player
`RadioAudioPlayerMini` crea il listener `handleEnded` dentro un `useEffect` che NON ha `onPlayEnd` nelle dipendenze:
```
}, [audioUrl, autoPlay, canAutoPlay, isAudioEnabled, messageId]);
```
Quando `handleCarouselAudioEnd` viene ricreato con nuovi `aiMessages`, il mini player continua a chiamare la versione vecchia con la lista incompleta, trovando `aiMessages[currentIndex + 1]` = undefined.

### Problema 3: Guard `sharedAudioRef` si auto-annulla
In `RadioAudioPlayer`, il nuovo audio viene registrato nel ref PRIMA della guard:
```
sharedAudioRef.current = audio;  // ← nuovo audio (paused)
// ...
const anotherPlaying = sharedAudioRef?.current && !sharedAudioRef.current.paused;
// ↑ controlla se STESSO (paused) → anotherPlaying = false sempre
```

## Soluzione (4 file)

### 1. `RadioCarouselAudioPlayerWrapper.tsx`
- Aggiungere prop `onAudioStart: (id: string) => void`
- Passare `onPlayStart={onAudioStart}` ai player figli invece di `console.log`

### 2. `RadioAudioPlayerMini.tsx`
- Usare un `useRef` per `onPlayEnd` (come gia' fa `RadioAudioPlayer` con `onPlayEndRef`)
- Cosi' `handleEnded` chiama sempre la versione aggiornata del callback

### 3. `RadioAudioPlayer.tsx`
- Salvare il vecchio `sharedAudioRef.current` PRIMA di registrare il nuovo audio
- Controllare il vecchio ref nella guard: `const anotherPlaying = oldAudio && !oldAudio.paused`

### 4. `RadioChat.tsx`
- Passare `onAudioStart={handleAudioStart}` al `RadioCarouselAudioPlayerWrapper`

## Flusso corretto dopo il fix

```text
Msg1 arriva → autoPlay=true, canAutoPlay=true → PLAY
  → onPlayStart → handleAudioStart("msg1") → isAudioPlaying=true ← NUOVO

Msg2 arriva (durante play msg1):
  → canAutoPlay={!isAudioPlaying} = false → NON fa play ✅

Msg1 audio finisce → handleEnded → onPlayEnd (via ref, sempre aggiornato) ← NUOVO
  → handleCarouselAudioEnd() → handleAudioEnd() → isAudioPlaying=false
  → 300ms → setActiveMessageId(msg2.id)
  → Wrapper riceve nuovo message → Player monta con canAutoPlay=true → PLAY ✅

Msg2 audio finisce → stessa catena → avanza a msg3 ✅
```

## File da modificare

| File | Rischio |
|------|---------|
| `RadioCarouselAudioPlayerWrapper.tsx` | Basso |
| `RadioAudioPlayerMini.tsx` | Basso |
| `RadioAudioPlayer.tsx` | Basso |
| `RadioChat.tsx` (1 riga) | Basso |

