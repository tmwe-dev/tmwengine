# PIANO RESTORE PROMPT RADIO CHAT

**Data creazione:** 2025-10-27  
**Status:** Da implementare  
**Priorità:** ALTA - Fix critici per funzionalità core

---

## 📋 CONTESTO

Sistema di gestione prompt per Radio Chat con problematiche di:
- Persistenza prompt dopo reload
- Nomi duplicati nei prompt globali
- Tab "Personality" vuoto
- Stili conversazione non selezionabili in Radio Chat

---

## 🗂️ ARCHITETTURA PROMPT SISTEMA

### Database Tables

#### `chat_laboratory_system_prompts`
- **Tipo:** Prompt Globali
- **Quantità:** 9 prompt (TUTTI con nome "Prompt Globale Laboratory")
- **Campo `attivo`:** Solo 1 attivo alla volta
- **Utilizzo:** Prompt base per tutto il sistema

#### `chat_laboratory_prompt_sections`
- **Tipo:** Sezioni Modulari
- **Sezioni disponibili:**
  - `BASE` (12 sezioni) - es. "Prompt Base Sala Conversazione"
  - `AGENT_PERSONALITY` (3 attive) - es. "Renny - Esperto Logistica"
  - `CONVERSATION_STYLE` (3 attive) - "boss_talk", "colleagues", "bar_chat"
  - `ORCHESTRATOR_RULES` (1 attiva)
  - `TOPIC_OBJECTIVE` (3 attive) - DA DEPRECARE (inutile, argomento esposto in chat)

### Componenti UI

#### `/chat-laboratory-prompt-manager` (Gestione Prompt Sistema)
- **Accessibilità:**
  - Chat Laboratory (via `LaboratoryPromptManager`)
  - Database Settings → "Gestione Prompt Sistema" (NUOVO - aggiunto 2025-10-27)
- **Funzioni:**
  - Gestione Prompt Globale
  - Gestione Prompt Base
  - Gestione Personalità Agenti
  - Gestione Stili Conversazione
  - Gestione Orchestrator Rules
  - Compositore Prompt (tool per creazione guidata)

#### `RadioPromptSelector.tsx`
- **Utilizzo:** Radio Chat sidebar
- **Funzione:** Assegnazione prompt a conversazione corrente
- **Tabs:**
  - "Global" → Seleziona prompt globale
  - "Personality" → VUOTO (query errata)

---

## 🐛 PROBLEMI IDENTIFICATI

### 1. ❌ CRITICO - Persistenza Prompt
**File:** `src/components/radio-chat/RadioPromptSelector.tsx`  
**Linea:** 42-44  
**Problema:**
```typescript
useEffect(() => {
  loadData();
}, []); // ❌ Manca conversationId nelle dipendenze
```
**Sintomo:** Prompt non persiste dopo reload pagina

---

### 2. ❌ CRITICO - Nomi Duplicati
**Tabella:** `chat_laboratory_system_prompts`  
**Problema:** Tutti i 9 prompt hanno nome "Prompt Globale Laboratory"  
**Sintomo:** Impossibile distinguere i prompt nel dropdown

**Esempi contenuto:**
- "Sei Leonardo da Vinci..."
- "Sei Evan You..."
- Prompt generici vari

---

### 3. ❌ CRITICO - Tab Personality Vuoto
**File:** `src/components/radio-chat/RadioPromptSelector.tsx`  
**Linea:** 62  
**Problema:**
```typescript
.eq('section_type', 'personality') // ❌ ERRATO
// Database usa 'agent_personality' non 'personality'
```

---

### 4. ⚠️ MEDIO - Stili Non Selezionabili
**Problema:** Radio Chat non ha UI per selezionare CONVERSATION_STYLE  
**Impatto:** Gli stili esistono nel DB ma non sono utilizzabili dall'utente

---

### 5. 🔧 BASSO - Campo Legacy
**Tabella:** `elevenlabs_agents`  
**Campo:** `text_generation_prompt`  
**Status:** Deprecato (non più utilizzato)

---

## 🚀 SPRINT IMPLEMENTAZIONE

### SPRINT 1: FIX CRITICI (URGENTE)

#### Fix 1.1: Persistenza Prompt
**File:** `src/components/radio-chat/RadioPromptSelector.tsx`

```typescript
// LINEA 42-44 - MODIFICARE
useEffect(() => {
  if (conversationId) {
    loadData();
  }
}, [conversationId]); // ✅ Aggiunta dipendenza
```

**Test:**
1. Seleziona prompt in Radio Chat
2. Ricarica pagina (F5)
3. Verifica prompt selezionato sia ancora presente

---

#### Fix 1.2: Nomi Prompt Duplicati

**OPZIONE A - Quick Fix Frontend:**

**File:** `src/components/radio-chat/RadioPromptSelector.tsx`

```typescript
// LINEA 215-220 - MODIFICARE SELECT ITEMS
{globalPrompts.map(prompt => {
  const firstLine = prompt.contenuto.split('\n')[0].substring(0, 60);
  const displayName = prompt.nome === 'Prompt Globale Laboratory' 
    ? firstLine + '...'
    : prompt.nome;
  
  return (
    <SelectItem key={prompt.id} value={prompt.id}>
      {displayName}
      {conversationPromptId === prompt.id && ' ✓'}
    </SelectItem>
  );
})}
```

**OPZIONE B - Fix Database (PERMANENTE):**

```sql
-- Aggiorna prompt con nomi univoci
UPDATE chat_laboratory_system_prompts 
SET nome = 'Leonardo - Enciclopedista Universale' 
WHERE contenuto LIKE '%Leonardo%' 
  AND contenuto LIKE '%Enciclopedista%';

UPDATE chat_laboratory_system_prompts 
SET nome = 'Evan You - Programmatore Esperto' 
WHERE contenuto LIKE '%Evan You%';

-- Per prompt generici, usa ID come suffisso
UPDATE chat_laboratory_system_prompts 
SET nome = 'Prompt Globale ' || SUBSTRING(id::text, 1, 8)
WHERE nome = 'Prompt Globale Laboratory'
  AND contenuto NOT LIKE '%Leonardo%'
  AND contenuto NOT LIKE '%Evan You%';
```

**Test:**
1. Apri dropdown prompt in Radio Chat
2. Verifica ogni prompt ha nome unico e riconoscibile

---

#### Fix 1.3: Tab Personality Vuoto

**File:** `src/components/radio-chat/RadioPromptSelector.tsx`

```typescript
// LINEA 62 - MODIFICARE
.eq('section_type', 'agent_personality') // ✅ Corretto da 'personality'
.eq('is_active', true)
```

**PLUS - Gestione Tab Vuoto:**

```typescript
// LINEA 271-312 - AGGIUNGERE FALLBACK
<TabsContent value="personality" className="space-y-4 mt-4">
  {personalitySections.length === 0 ? (
    <div className="p-8 text-center text-muted-foreground">
      <p className="mb-2">Nessuna personality configurata</p>
      <p className="text-xs">
        Gestisci le personalità da: Database Settings → Gestione Prompt Sistema
      </p>
    </div>
  ) : (
    <>{/* ... contenuto esistente ... */}</>
  )}
</TabsContent>
```

**Test:**
1. Apri tab "Personality" in Radio Chat
2. Verifica lista personalità (Renny, Angelina, Peppe)
3. Seleziona una personalità e salva

---

### SPRINT 2: STILI CONVERSAZIONE (MEDIO)

#### Fix 2.1: Selector Stili in Radio Chat

**NUOVO FILE:** `src/components/radio-chat/RadioStyleSelector.tsx`

```typescript
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ConversationStyle {
  id: string;
  section_name: string;
  content: string;
}

interface RadioStyleSelectorProps {
  conversationId: string | null;
  selectedStyleId: string | null;
  onStyleChange: (styleId: string | null) => void;
}

export const RadioStyleSelector = ({
  conversationId,
  selectedStyleId,
  onStyleChange
}: RadioStyleSelectorProps) => {
  const { toast } = useToast();
  const [styles, setStyles] = useState<ConversationStyle[]>([]);

  useEffect(() => {
    loadStyles();
  }, []);

  const loadStyles = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_laboratory_prompt_sections')
        .select('id, section_name, content')
        .eq('section_type', 'conversation_style')
        .eq('is_active', true)
        .order('section_name');

      if (error) throw error;
      setStyles(data || []);
    } catch (error) {
      console.error('Error loading styles:', error);
    }
  };

  const handleStyleChange = async (styleId: string) => {
    if (!conversationId) return;

    const actualStyleId = styleId === "none" ? null : styleId;

    try {
      const { error } = await supabase
        .from('chat_laboratory_conversations')
        .update({ conversation_style_id: actualStyleId })
        .eq('id', conversationId);

      if (error) throw error;

      onStyleChange(actualStyleId);

      toast({
        title: "Stile aggiornato",
        description: actualStyleId 
          ? "Stile conversazione modificato" 
          : "Utilizzato stile predefinito"
      });
    } catch (error) {
      console.error('Error updating style:', error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare lo stile",
        variant: "destructive"
      });
    }
  };

  // Mappa nomi stili user-friendly
  const styleDisplayNames: Record<string, string> = {
    'boss_talk': 'Boss Talk',
    'colleagues': 'Colleghi',
    'bar_chat': 'Bar Chat'
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm">Stile Conversazione</Label>
      <Select
        value={selectedStyleId || "none"}
        onValueChange={handleStyleChange}
        disabled={!conversationId}
      >
        <SelectTrigger>
          <SelectValue placeholder="Seleziona stile" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Stile predefinito</SelectItem>
          {styles.map((style) => (
            <SelectItem key={style.id} value={style.id}>
              {styleDisplayNames[style.section_name] || style.section_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
```

---

#### Fix 2.2: Integrazione in Radio Sidebar

**File:** `src/components/radio-chat/RadioSidebar.tsx`

```typescript
// AGGIUNGERE IMPORT
import { RadioStyleSelector } from './RadioStyleSelector';

// AGGIUNGERE STATE (dopo gli altri useState)
const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);

// AGGIUNGERE NEL RENDER (dopo SystemPromptSelector)
<RadioStyleSelector
  conversationId={conversationId}
  selectedStyleId={selectedStyleId}
  onStyleChange={setSelectedStyleId}
/>
```

**Test:**
1. Apri Radio Chat
2. Verifica dropdown stili (Boss Talk, Colleghi, Bar Chat)
3. Seleziona stile e verifica persistenza
4. Avvia conversazione e verifica orchestrator usa stile corretto

---

### SPRINT 3: DEPRECAZIONI (BASSO)

#### Fix 3.1: Depreca Campo Legacy

**File:** `src/components/bar-chat/VoiceAgentManager.tsx`

```typescript
// AGGIUNGERE COMMENTO DI DEPRECAZIONE
// NOTA: Il campo 'text_generation_prompt' in elevenlabs_agents è DEPRECATO
// I prompt sono ora gestiti centralmente in:
// - chat_laboratory_system_prompts (globali)
// - chat_laboratory_prompt_sections (personalità)
// Il campo rimane per compatibilità legacy ma NON è più utilizzato
```

**OPZIONALE - Rimozione Colonna DB:**

```sql
-- Solo se si vuole cleanup completo database
ALTER TABLE elevenlabs_agents 
DROP COLUMN IF EXISTS text_generation_prompt;
```

---

## ✅ CHECKLIST IMPLEMENTAZIONE

### Sprint 1 (Critici)
- [ ] Fix 1.1: Persistenza prompt (useEffect dipendenze)
- [ ] Fix 1.2: Nomi duplicati (frontend O database)
- [ ] Fix 1.3: Tab personality (section_type corretto)
- [ ] Test end-to-end persistenza prompt
- [ ] Test visualizzazione nomi distinti
- [ ] Test selezione personalità

### Sprint 2 (Stili)
- [ ] Creare RadioStyleSelector.tsx
- [ ] Integrare in RadioSidebar
- [ ] Verificare orchestrator carica stili da DB
- [ ] Test selezione stili
- [ ] Test persistenza stili

### Sprint 3 (Cleanup)
- [ ] Aggiungere commenti deprecazione
- [ ] Documentare campo legacy
- [ ] (Opzionale) Rimuovere colonna DB

---

## 🎯 RISULTATI ATTESI

### Post Sprint 1
✅ Prompt persiste dopo reload  
✅ Nomi prompt distinti e leggibili  
✅ Personalità agenti selezionabili  
✅ UX funzionale e intuitiva

### Post Sprint 2
✅ Stili conversazione configurabili  
✅ Radio Chat completamente operativa  
✅ Sistema prompt modulare e flessibile

### Post Sprint 3
✅ Codebase pulito e documentato  
✅ Database ottimizzato  
✅ Architettura manutenibile

---

## 📚 RISORSE

### File Chiave
- `src/components/radio-chat/RadioPromptSelector.tsx`
- `src/pages/ChatLaboratoryPromptManager.tsx`
- `src/components/chat-laboratory/LaboratoryPromptManager.tsx`
- `src/pages/RadioChat.tsx`
- `supabase/functions/radio-chat-orchestrator/lib/config-loader.ts`

### Tabelle Database
- `chat_laboratory_system_prompts`
- `chat_laboratory_prompt_sections`
- `chat_laboratory_conversations`
- `elevenlabs_agents` (campo legacy)

### Route
- `/chat-laboratory-prompt-manager` - Gestione prompt completa
- `/radio-chat` - Interfaccia utente Radio Chat
- `/database-settings` - Menu accesso gestione prompt (NUOVO)

---

## 📝 NOTE IMPLEMENTAZIONE

### Priorità Decision Making
1. **SEMPRE Fix Sprint 1 per primo** - Blocca funzionalità core
2. Sprint 2 può essere implementato gradualmente
3. Sprint 3 è cleanup, non urgente

### Testing Raccomandato
- Testare su browser diversi (Chrome, Firefox, Safari)
- Testare con conversazioni esistenti e nuove
- Verificare logs orchestrator per stili applicati

### Rollback Plan
- Tutti i fix sono incrementali
- Ogni sprint può essere revertato indipendentemente
- Backup database consigliato prima di modifiche SQL

---

**Fine Piano Restore Prompt Radio Chat**
