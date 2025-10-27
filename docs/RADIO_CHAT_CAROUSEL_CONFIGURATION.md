# 🎡 Radio Chat Carousel 3D - Configurazione AUDIO_DAMAGED

**Data Snapshot**: 2025-10-27  
**Versione**: 1.0.0-audio-damaged  
**Stato**: ⚠️ AUDIO_DAMAGED  
**Autore**: Luca

---

## 🎯 Overview

Questo documento protegge la configurazione del Radio Chat Carousel 3D nella versione **AUDIO_DAMAGED**.

### ✅ Funzionante
- **Carousel 3D**: Visibile, animato, responsive
- **Messaggi Realtime**: Appaiono nel carousel in tempo reale
- **Orchestrator**: Risponde con tutti e 3 gli agenti AI
- **Texture HD**: DPR e anisotropic filtering attivi
- **Database Saving**: Ogni agente salva correttamente

### ❌ Non Funzionante
- **Audio Generation**: Audio NON viene generato
- **audio_url**: Rimane `null` nel database
- **Audio Player**: RadioAudioPlayerWrapper non appare

---

## 🔧 Parametri Critici Carousel (✅ FUNZIONANTI)

### Camera Configuration
```typescript
// Camera FOV (Field of View)
const fov = window.innerWidth < 768 ? 62 : 67;

// Camera Position
camera.position.set(0, 0.35, 13.5);

// Camera LookAt
camera.lookAt(0, 0.82, 0);
```

### Carousel Configuration
```typescript
const MAX_SLOTS = 8;
const radius = 7.8;

// Mesh Position
mesh.position.set(
  Math.sin(angle) * radius,
  0.82,  // ⚠️ CRITICO: crea l'effetto trapezio con lookAt (0,0,0)
  Math.cos(angle) * radius
);

// Mesh LookAt
mesh.lookAt(0, 0, 0);

// Rotation
const rotation = -i * angleStep + Math.PI; // Antiorario
```

### Texture Quality
```typescript
const canvas = document.createElement('canvas');
canvas.width = 800;   // ⚠️ CRITICO
canvas.height = 1100; // ⚠️ CRITICO

texture.minFilter = THREE.LinearFilter;
texture.magFilter = THREE.LinearFilter;
texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
```

---

## 🚨 Fix Implementati (pre-AUDIO_DAMAGED)

### 1. Orchestrator Fixes
**File**: `supabase/functions/radio-chat-orchestrator/index.ts`

```typescript
// ✅ FIX #1: Eliminato messageId duplicato
// ❌ PRIMA (riga 285):
// const messageId = crypto.randomUUID();

// ✅ FIX #2: Assegnato return audio
// ❌ PRIMA:
await generateAudioForSingleResponse({...});

// ✅ DOPO:
audioUrl = await generateAudioForSingleResponse({...});
```

### 2. Audio Generator Fixes
**File**: `supabase/functions/radio-chat-orchestrator/lib/audio-generator.ts`

```typescript
// ✅ FIX #3: Return type corretto
// ❌ PRIMA:
}): Promise<void> {

// ✅ DOPO:
}): Promise<string | null> {

// ✅ Aggiunto return
return audioUrl;  // riga 85
return null;      // riga 88 (catch)
```

### 3. Frontend Fixes
**File**: `src/pages/RadioChat.tsx`

```typescript
// ✅ FIX #4: voice_id nella query
.select('id, name, is_active, elevenlabs_agent_id, voice_id')

// ✅ FIX #5: voice_id nel mapping
return {
  id: agent.elevenlabs_agent_id || agent.id,
  type,
  name: agent.name.split(' - ')[0],
  is_active: true,
  voice_id: agent.voice_id  // ✅ AGGIUNTO
};

// ✅ FIX #6: Return dopo errore
if (!convId) {
  console.error('❌ convId is null dopo createConversation');
  return;  // ✅ AGGIUNTO
}
```

---

## 🐛 Problema Audio (AUDIO_DAMAGED)

### Sintomi
1. **Database**: `audio_url` è `null` nei messaggi salvati
2. **Logs**: `generateAudioForSingleResponse` potrebbe non loggare successo
3. **UI**: RadioAudioPlayerWrapper non appare (perché `audio_url` è null)

### Possibili Cause
- **ElevenLabs API**: Chiave non valida o rate limit
- **Supabase Storage**: Upload fallisce silenziosamente
- **voice_id**: Potrebbe essere `undefined` o non valido
- **Parametri**: Oggetto passato a `generateAudioForSingleResponse` potrebbe essere malformato

### Debug Steps
```bash
# 1. Verificare logs orchestrator
supabase functions logs radio-chat-orchestrator

# 2. Cercare errori TTS
grep "TTS fallito" logs.txt

# 3. Verificare elevenLabsApiKey
echo $ELEVENLABS_API_KEY

# 4. Testare voice_id manualmente
curl -X POST https://api.elevenlabs.io/v1/text-to-speech/[voice_id]
```

---

## 📝 Checklist Pre-Modifica

Prima di modificare **QUALSIASI** file:

- [ ] ✅ Verificare che carousel attuale funzioni
- [ ] ✅ Creare backup timestampato
- [ ] ✅ Annotare valori attuali
- [ ] ✅ Testare immediatamente dopo modifica
- [ ] ✅ Rollback immediato se si rompe

---

## 🔄 Procedura di Restore

### Se il Carousel Smette di Funzionare

1. **Controllare Snapshot**
   ```bash
   cat src/config/radio-carousel-working-snapshot.json
   ```

2. **Ripristinare File Critici**
   ```bash
   # Carousel
   cp src/config/backups/radio-chat/RadioCarousel3D_AUDIO_DAMAGED_20251027.tsx \
      src/components/radio-chat/RadioCarousel3D.tsx
   
   # Orchestrator
   cp src/config/backups/radio-chat/radio-chat-orchestrator_AUDIO_DAMAGED_20251027.ts \
      supabase/functions/radio-chat-orchestrator/index.ts
   
   # Frontend
   cp src/config/backups/radio-chat/RadioChat_AUDIO_DAMAGED_20251027.tsx \
      src/pages/RadioChat.tsx
   ```

3. **Verificare Database**
   ```sql
   SELECT id, sender_name, content, audio_url 
   FROM chat_laboratory_messages 
   ORDER BY created_at DESC 
   LIMIT 3;
   ```

4. **Test Visivo**
   - Aprire `/radio-chat`
   - Inviare messaggio
   - Verificare che carousel mostri 3 messaggi AI
   - ⚠️ Audio NON funzionerà (è normale in questa versione)

---

## 🎯 Next Steps per Fix Audio

1. **Verificare Secret ElevenLabs**
   ```typescript
   const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
   console.log('🔑 ElevenLabs Key presente:', !!elevenLabsApiKey);
   ```

2. **Testare API Call Manuale**
   ```typescript
   const response = await fetch(
     `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
     {
       method: 'POST',
       headers: {
         'xi-api-key': elevenLabsApiKey,
         'Content-Type': 'application/json'
       },
       body: JSON.stringify({
         text: 'Test audio generation',
         model_id: 'eleven_multilingual_v2'
       })
     }
   );
   ```

3. **Verificare Upload Storage**
   ```typescript
   const { data: uploadData, error: uploadError } = await supabaseClient
     .storage
     .from('radio-chat-audio')
     .upload(filePath, audioBlob);
   
   console.log('📦 Upload result:', { uploadData, uploadError });
   ```

---

## 🔗 File di Riferimento

- **Snapshot JSON**: `src/config/radio-carousel-working-snapshot.json`
- **Backup Carousel**: `src/config/backups/radio-chat/RadioCarousel3D_AUDIO_DAMAGED_20251027.tsx`
- **Backup Orchestrator**: `src/config/backups/radio-chat/radio-chat-orchestrator_AUDIO_DAMAGED_20251027.ts.backup`
- **Backup Frontend**: `src/config/backups/radio-chat/RadioChat_AUDIO_DAMAGED_20251027.tsx`
- **Verifica Script**: `src/config/verify-radio-carousel-config.ts`

---

## ⚠️ WARNING

**QUESTA È LA VERSIONE AUDIO_DAMAGED**

- ✅ **Usa questo backup per**: Ripristinare carousel visivo funzionante
- ❌ **NON usare per**: Ripristinare funzionalità audio (non presente)
- 🔄 **Quando fixato audio**: Creare nuovo snapshot "FULLY_WORKING"

---

**Fine Documentazione AUDIO_DAMAGED**
