# AI Sidebar Refactoring - 2025-11-14

## 🎯 Obiettivo
Unificare la sidebar AI globale con logica Chat Laboratory, audio PTT+Listen, conversazione cross-page persistente e configurazione prompts per pagina.

---

## 📦 File Modificati

### **Nuovi File Creati**
1. `src/components/ai/AISidebarSliderUnified.tsx` - Sidebar AI unificata
2. `src/hooks/useAIOrchestrator.ts` - Hook per chat-laboratory-orchestrator
3. `src/components/ai/shared/MessageRenderer.tsx` - Rendering messaggi riutilizzabile
4. `src/components/ai/shared/AudioControlsPanel.tsx` - Controlli audio PTT+Listen
5. `src/components/ai/shared/PromptConfigPanel.tsx` - Configurazione prompts per pagina
6. `src/components/ai/shared/ConversationMemoryManager.tsx` - Hook per memoria conversazioni

### **File Modificati**
1. `src/contexts/GlobalAICanvasContext.tsx`
   - Aggiunto `conversationId: string | null`
   - Aggiunto `systemPrompt: string | null`
   - Aggiunto metodo `setConversationId(id: string | null)`
   - Aggiunto metodo `updateSystemPrompt(prompt: string)`

2. `src/App.tsx`
   - Integrati `GlobalAICanvasProvider` e `AIAgentProvider`
   - Montata `AISidebarSliderUnified` globalmente
   - Aggiunto `AISidebarTrigger` fisso bottom-right (z-40)

### **File Deprecati** (da rimuovere in FASE 4)
- `src/components/email/smart-inbox/AIAgentSelector.tsx` → Sostituito da `GlobalAIAgentSelector`
- `src/components/chat-laboratory/AIProviderSelector.tsx` → Deprecato
- `src/components/email/smart-inbox/AIManualCanvas.tsx` → Sostituito da sidebar unificata

---

## ✨ Funzionalità Implementate

### **1. Sidebar AI Unificata**
- ✅ Backdrop blur cliccabile (chiude sidebar)
- ✅ `GlobalAIAgentSelector` visibile in header
- ✅ Due tab: **Chat** | **Configurazione**
- ✅ Conversazione persistente cross-page (una sola conversazione)
- ✅ Trigger bottom-right sempre visibile

### **2. Audio PTT + Listen Mode**
- ✅ `AudioControlsPanel` integrato nella sidebar
- ✅ Supporto `AudioMode` ('stable' = PTT, 'v2_hybrid' = Listen)
- ✅ Transcription automatica inviata a orchestrator

### **3. Configurazione Prompts per Pagina**
- ✅ `PromptConfigPanel` carica prompts da `chat_laboratory_composed_prompts`
- ✅ Filtra per `page_route` (es: `/funemail`, `/single-fast`)
- ✅ Permette creazione/eliminazione prompts
- ✅ Click su prompt → inserito in textarea chat

### **4. Conversazione Cross-Page**
- ✅ Una sola conversazione globale (`conversation_type: 'global_ai_sidebar'`)
- ✅ Messaggi salvati in `chat_laboratory_messages`
- ✅ Real-time subscription per nuovi messaggi
- ✅ Memoria persistente anche cambiando pagina

---

## 🔧 Architettura Tecnica

### **Hook `useAIOrchestrator`**
```typescript
const { sendMessage, isProcessing, lastResponse } = useAIOrchestrator(conversationId);
```
- Centralizza chiamate a `chat-laboratory-orchestrator`
- Salva messaggi utente in DB prima di invocare orchestrator
- Include `page_route` per context-aware prompts
- Gestisce retry ed error handling

### **Hook `useConversationMemory`**
```typescript
const { messages, isLoading, clearMessages } = useConversationMemory(conversationId);
```
- Carica messaggi da `chat_laboratory_messages`
- Real-time sync via Supabase subscription
- Supporta cancellazione conversazione

### **Componenti Shared**
- `MessageRenderer`: Rendering messaggi con avatar, markdown, audio player
- `AudioControlsPanel`: Wrapper `AudioModeSelector` con badge mode
- `PromptConfigPanel`: CRUD prompts per `page_route` corrente

---

## 🚀 Stato Implementazione

### **✅ FASE 1 - Refactoring Core (COMPLETATA)**
- [x] Hook `useAIOrchestrator`
- [x] Componenti shared (`MessageRenderer`, `AudioControlsPanel`, `PromptConfigPanel`, `ConversationMemoryManager`)

### **✅ FASE 2 - Sidebar Unificata (COMPLETATA)**
- [x] `AISidebarSliderUnified.tsx` con backdrop blur
- [x] Integrazione `GlobalAICanvasContext` esteso
- [x] Tabs Chat + Configurazione

### **✅ FASE 3 - Implementazione Globale (COMPLETATA)**
- [x] Modificato `src/App.tsx` con providers e sidebar globale
- [x] Trigger bottom-right sempre visibile

### **⏳ FASE 4 - Pulizia Componenti (TODO)**
- [ ] Rimuovi `AIAgentSelector` locale in smart-inbox
- [ ] Rimuovi `AIProviderSelector` in chat-laboratory
- [ ] Rimuovi `AIManualCanvas`
- [ ] Aggiorna import in tutte le pagine

### **⏳ FASE 5 - Testing (TODO)**
- [ ] Test sidebar apertura/chiusura da tutte le pagine
- [ ] Test audio PTT + Listen mode
- [ ] Test conversazione cross-page
- [ ] Test configurazione prompts per pagina
- [ ] Test real-time sync messaggi

---

## 🔄 Rollback Plan

**Se qualcosa non funziona**:
```bash
# Ripristina vecchia sidebar
cp docs/CODE_BACKUPS/AISidebarSlider_20251114_PRE_REFACTORING.tsx \
   src/components/ai/AISidebarSlider.tsx

# Ripristina App.tsx da git
git checkout HEAD -- src/App.tsx

# Ripristina GlobalAICanvasContext.tsx da git
git checkout HEAD -- src/contexts/GlobalAICanvasContext.tsx
```

---

## 📋 Testing Checklist

### **Test Funzionali**
- [ ] Sidebar si apre/chiude da tutte le pagine
- [ ] Backdrop blur funziona e chiude sidebar al click
- [ ] `GlobalAIAgentSelector` cambia agente correttamente
- [ ] Audio PTT/Listen funzionano nella sidebar
- [ ] Conversazioni vengono salvate in `chat_laboratory_messages`
- [ ] Configurazione prompts carica/salva correttamente per pagina corrente
- [ ] Sidebar mantiene stato quando si cambia pagina
- [ ] Trigger globale sempre visibile (eccetto Auth page)
- [ ] Cancellazione conversazione funziona

### **Test Performance**
- [ ] Audio stream si unmonta quando sidebar chiusa
- [ ] Sidebar non causa lag su pagine complesse
- [ ] Real-time subscription non accumula listener

---

## 🐛 Known Issues
- ⚠️ **PHASE 4 REQUIRED**: Componenti duplicati (`AIAgentSelector`, `AIProviderSelector`) ancora presenti
- ⚠️ Trigger in alcune pagine potrebbe essere nascosto da layout esistenti (da verificare z-index)

---

## 📚 Documentazione Correlata
- **Backup vecchia sidebar**: `docs/CODE_BACKUPS/AISidebarSlider_20251114_PRE_REFACTORING.tsx`
- **Master Rules**: `docs/MASTER_RULES.md`
- **Edge Functions Changelog**: `docs/EDGE_FUNCTIONS_CHANGELOG.md`

---

## 🎉 Benefici Ottenuti
| Aspetto | Before | After |
|---------|--------|-------|
| **Sidebar AI** | 3 implementazioni diverse | 1 unificata ✅ |
| **Audio** | Solo Chat Laboratory | Globale ✅ |
| **Memoria** | Isolata per pagina | Persistente cross-page ✅ |
| **Configurazione** | Sparsa in 5 file | Centralizzata sidebar ✅ |
| **Manutenibilità** | Bassa (codice duplicato) | Alta (DRY) ✅ |
| **UX** | Inconsistente | Coerente ovunque ✅ |

---

**Data implementazione**: 2025-11-14  
**Implementato da**: Lovable AI  
**Approccio**: Big Bang (3 giorni)  
**Status**: FASE 1-3 COMPLETATE ✅
