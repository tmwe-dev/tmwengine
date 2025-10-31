# 🎨 AI Canvas - Sistema Globale di Interazione AI

## 📋 Overview

Il **Global AI Canvas** è un sistema di interazione conversazionale con AI accessibile da tutte le sezioni email dell'applicazione. Fornisce un'interfaccia unificata per:

- Analizzare email e mittenti
- Creare automazioni personalizzate
- Ricevere suggerimenti AI context-aware
- Proporre azioni che richiedono conferma utente

---

## 🏗️ Architettura

### **1. Context Provider (`GlobalAICanvasContext.tsx`)**

Gestisce lo stato globale del canvas:
- Apertura/chiusura canvas
- Context specifico (email, sender, general)
- Storico messaggi conversazione
- Proposte azioni AI pending

### **2. Componente UI (`GlobalAICanvas.tsx`)**

Modal full-screen con:
- Chat interface con AI
- Visualizzazione context attivo
- Rendering proposte azioni strutturate
- Supporto Markdown per risposte AI

### **3. Hook Utility (`useGlobalAICanvas.ts`)**

Helper functions per aprire canvas con context:
```tsx
// Da qualsiasi componente email
const { openAICanvasForSender, openAICanvasForEmail } = useGlobalAICanvas();

// Apri per un sender specifico
openAICanvasForSender('sender@example.com');

// Apri per email specifica
openAICanvasForEmail({
  senderEmail: 'sender@example.com',
  emailUid: '12345',
  emailSubject: 'Meeting tomorrow',
  emailBody: 'Full content...'
});
```

### **4. Edge Function (`ai-canvas-chat`)**

Backend conversazionale che:
- Riceve messaggi utente + context
- Inietta automaticamente dati contatto/azienda
- Recupera automazioni esistenti per context
- Risponde in modalità conversazionale o strutturata

---

## 🔧 Come Integrare in Componenti Esistenti

### **Step 1: Wrap App con Provider**

In `src/App.tsx` o root component:

```tsx
import { GlobalAICanvasProvider } from '@/contexts/GlobalAICanvasContext';
import { GlobalAICanvas } from '@/components/ai/GlobalAICanvas';

function App() {
  return (
    <GlobalAICanvasProvider>
      {/* ... existing app ... */}
      <GlobalAICanvas />
    </GlobalAICanvasProvider>
  );
}
```

### **Step 2: Usa Hook in Componenti**

**Esempio: EmailManagementTab**
```tsx
import { useGlobalAICanvas } from '@/hooks/useGlobalAICanvas';

function EmailManagementTab() {
  const { openAICanvasForSender } = useGlobalAICanvas();
  const [selectedSender, setSelectedSender] = useState<string | null>(null);

  return (
    <div>
      {/* Bottone per aprire AI Canvas */}
      <Button 
        onClick={() => openAICanvasForSender(selectedSender!)}
        disabled={!selectedSender}
      >
        🤖 Apri AI Canvas
      </Button>
      
      {/* ... resto UI ... */}
    </div>
  );
}
```

**Esempio: SmartInboxTab**
```tsx
function SmartInboxTab() {
  const { openAICanvasForEmail } = useGlobalAICanvas();
  
  const handleAnalyzeEmail = (email: EmailMetadata) => {
    openAICanvasForEmail({
      senderEmail: email.sender,
      emailUid: email.uid,
      emailSubject: email.subject,
      emailBody: email.body,
    });
  };

  return (
    <EmailList 
      onEmailClick={handleAnalyzeEmail}
    />
  );
}
```

---

## 🎯 Funzionalità Implementate

### ✅ **Context Types**

| Type | Quando Usare | Context Iniettato |
|------|--------------|-------------------|
| `sender` | Gestione automazioni mittente | Contact info, existing automations |
| `email` | Analisi email specifica | Email content, sender info |
| `general` | Domande generiche | User preferences |

### ✅ **AI Capabilities**

1. **Conversational Mode**: Risponde a domande libere
2. **Structured Actions**: Propone azioni in formato JSON
3. **Context Injection**: Usa automaticamente dati DB (contatti, template, automazioni)
4. **Prompt Library Integration**: Può suggerire prompt riutilizzabili

### ✅ **Action Proposals**

Quando AI propone azioni, ritorna:
```json
{
  "explanation": "Reasoning dietro le azioni",
  "proposed_actions": [
    {
      "type": "archive",
      "description": "Archivia email promozionali",
      "params": { "folder": "Promotions" }
    }
  ],
  "confidence": 85,
  "requires_confirmation": true
}
```

---

## 🔮 Prossimi Step (Non Implementati)

### **PRIO 4: UI Conferma Azioni Evoluta**

Quando AI propone azioni multiple:
- [ ] Checkbox per selezionare quali eseguire
- [ ] Form inline per modificare parametri (es. cambiare destinatari forward)
- [ ] Preview azione prima esecuzione
- [ ] Batch execution con rollback

### **Future Enhancements**

- [ ] Voice input per messaggi AI
- [ ] Export conversazioni come prompt salvati
- [ ] AI learning da feedback utente (approve/reject)
- [ ] Suggerimenti proattivi basati su pattern email
- [ ] Integration con Calendar per scheduling azioni

---

## 📊 Edge Function Details

**Endpoint**: `ai-canvas-chat`  
**Auth**: Required (JWT)  
**Method**: POST

**Request Body**:
```json
{
  "message": "User message to AI",
  "context_type": "sender|email|general",
  "sender_email": "optional@email.com",
  "email_uid": "optional-uid",
  "email_subject": "Optional subject",
  "email_body": "Optional body",
  "conversation_history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "response": "AI text response (can be markdown)",
  "structured_response": {
    "explanation": "...",
    "proposed_actions": [...]
  },
  "context_used": {
    "type": "sender",
    "has_sender_context": true,
    "has_email_context": false
  }
}
```

---

## 🎨 UI States

| State | Description | Action |
|-------|-------------|--------|
| `isOpen: false` | Canvas chiuso | Non renderizza nulla |
| `isOpen: true, messages: []` | Canvas aperto, vuoto | Mostra welcome + examples |
| `isProcessing: true` | AI sta elaborando | Mostra loader animato |
| `currentProposal: AIActionProposal` | Azione pending | Mostra UI conferma (PRIO 4) |

---

## 💡 Best Practices

1. **Context Specificity**: Sempre passare context più specifico possibile
2. **Conversation History**: Mantenere max 10 messaggi per evitare token overflow
3. **Error Handling**: Toast user-friendly per errori AI
4. **Loading States**: Sempre mostrare feedback durante processing
5. **Mobile UX**: Canvas fullscreen su mobile, modal su desktop

---

## 🚀 Status Implementazione

| Component | Status | File |
|-----------|--------|------|
| Context Provider | ✅ Completato | `GlobalAICanvasContext.tsx` |
| UI Component | ✅ Completato | `GlobalAICanvas.tsx` |
| Hook Utility | ✅ Completato | `useGlobalAICanvas.ts` |
| Edge Function | ✅ Completato | `ai-canvas-chat/index.ts` |
| **Integration in UI** | ⏳ **Pending** | Da fare: wrap App + add buttons |
| Action Confirmation | ⏳ Pending (PRIO 4) | UI evoluta per selezione azioni |

---

## 📝 Note

- Canvas **NON è ancora integrato nella UI** (come richiesto)
- Struttura codice pronta per essere montata
- Per attivare: wrap App con Provider e aggiungere `<GlobalAICanvas />`
- Bottoni per aprire canvas vanno aggiunti manualmente dove necessario
