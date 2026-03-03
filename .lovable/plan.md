

# Piano: Fix Sincronizzazione Audio/Carousel in Radio Chat

## Problema Centrale

`stopCurrentAudio()` in `useRadioAudioPlayback` resetta solo lo **stato React** (`isAudioPlaying = false`), ma **non ferma l'elemento `HTMLAudioElement`** reale. Risultato:

1. **Voci sovrapposte**: Quando si cambia card nel carousel, `stopCurrentAudio()` cambia lo stato ma l'audio precedente continua a suonare finche' React non rimonta il componente
2. **Nessun avanzamento automatico**: `handleCarouselAudioEnd` chiama `handleAudioEnd()` e poi dopo 50ms cambia `activeMessageId`, ma il nuovo audio non parte perche' `handleAudioStart` non viene mai chiamato dal player
3. **Nessun controllo imperativo**: Non esiste un modo per fermare immediatamente l'audio dall'esterno dei componenti player

## Soluzione: AudioRef centralizzato

Aggiungere un **ref condiviso** (`audioElementRef`) nel hook `useRadioAudioPlayback` che punta all'`HTMLAudioElement` attivo. Quando `stopCurrentAudio()` viene chiamato, chiama `audioElementRef.current.pause()` oltre a resettare lo stato.

### File da modificare

**1. `src/hooks/useRadioAudioPlayback.ts`**
- Aggiungere `audioElementRef: React.MutableRefObject<HTMLAudioElement | null>` 
- `stopCurrentAudio()` chiama `audioElementRef.current?.pause()` prima di resettare lo stato
- `handleAudioEnd()` chiama `audioElementRef.current?.pause()` 
- Esporre `audioElementRef` per registrazione dai player

**2. `src/components/radio-chat/RadioAudioPlayer.tsx`**
- Accettare prop `audioElementRef` opzionale
- Dopo aver creato `new Audio()`, registrarlo nel ref condiviso: `audioElementRef.current = audio`
- Nel cleanup, deregistrare: `if (audioElementRef.current === audio) audioElementRef.current = null`

**3. `src/components/radio-chat/RadioAudioPlayerMini.tsx`**
- Stessa logica: accettare `audioElementRef`, registrare l'audio element

**4. `src/components/radio-chat/RadioCarouselAudioPlayerWrapper.tsx`**
- Passare `audioElementRef` sia a `RadioAudioPlayer` che a `RadioAudioPlayerMini`
- Accettare `audioElementRef` come prop dal parent

**5. `src/pages/RadioChat.tsx`**
- Passare `audioElementRef` da `useRadioAudioPlayback` al `RadioCarouselAudioPlayerWrapper` via props
- Nella sezione `RadioMessagesView`: passare i callback correttamente per stop audio

**6. `src/hooks/useRadioCarouselNav.ts`**
- `handleCarouselAudioEnd`: dopo `handleAudioEnd()`, il cambio di `activeMessageId` trigger il rimontaggio del player che fa autoplay del prossimo messaggio -- verificare che il flusso sia corretto

### Flusso dopo il fix

```text
User cambia card → stopCurrentAudio()
  → audioElementRef.current.pause()  ← NUOVO: stop immediato
  → setIsAudioPlaying(false)
  → setActiveMessageId(newId)
  → React rimonta RadioAudioPlayer con nuovo messageId
  → useEffect crea new Audio() e registra nel ref
  → autoPlay → audio.play() → handleAudioStart()

Audio finisce → handleEnded → onPlayEnd → handleCarouselAudioEnd
  → handleAudioEnd() resetta stato
  → setTimeout → setActiveMessageId(nextId)
  → Stesso flusso di rimontaggio sopra
```

### Rischio: Basso
- Solo logica audio, nessun cambio UI/grafico
- Pattern additivo: si aggiunge un ref, non si rimuove nulla
- 6 file toccati, tutti nel modulo Radio Chat

