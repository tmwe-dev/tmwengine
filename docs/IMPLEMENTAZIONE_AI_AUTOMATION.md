# 🤖 Implementazione AI Email Automation System

## ✅ COMPLETATO - Fase 1: Database & Backend

### Database Schema
✅ Tabella `email_sender_ai_prompts` creata
- Salva prompt AI personalizzati per ogni mittente
- Include configurazione AI provider (riferimento a `config_ai`)
- Supporta azioni base (archive, delete, move_to_folder)
- Opzioni: usa template, alias clienti, dati aziendali
- Statistiche esecuzione (count, success rate)

✅ Tabella `email_ai_execution_log` creata
- Log completo di tutte le esecuzioni AI
- Traccia prompt usato, context iniettato, risposta AI
- Stati: pending → confirmed → executed/rejected/failed
- Metrica confidence per valutare qualità risposte

### Edge Functions
✅ `email-ai-manual-assistant` creata
- Permette interazione manuale con AI
- Usa AI provider selezionato dall'utente
- Risponde in italiano con suggerimenti su automazioni
- Gestisce rate limiting e errori Lovable AI Gateway

### TypeScript Types
✅ `src/types/email-automation.ts` creato
- `EmailSenderAIPrompt`: definizione completa prompt
- `EmailAIExecutionLog`: log esecuzioni
- `AIActionProposal`: formato proposte AI

---

## ✅ COMPLETATO - Fase 2: UI Components

### AIActionsSidebar
✅ Componente per azioni email su mittenti
- **Azioni Rapide**: Archive, Delete, Move
- **Automazione AI**: 
  - Pulsante "Crea Prompt AI"
  - Lista prompt salvati (caricati da DB)
- Integrato con `AIPromptDialog`

### AIPromptDialog
✅ Dialog per creare/configurare prompt AI
- **Campo AI Provider**: Usa `AIProviderSelector` esistente
- **Form completo**:
  - Nome e descrizione prompt
  - Azione base opzionale
  - Textarea prompt AI (istruzioni personalizzate)
  - Switch per opzioni (template, alias, conferma)
- **Validazione**: controlla campi obbligatori
- Salva su `email_sender_ai_prompts` con user_id

### AIManualCanvas
✅ Componente per interazione manuale con AI
- **Selezione AI Provider** in cima
- **Textarea** per domande utente
- **Canvas risposta** con markdown rendering
- Usa edge function `email-ai-manual-assistant`
- Gestisce loading states e errori

### Hook useEmailAIAutomation
✅ Logic hook per automazioni
- `createSimpleAction()`: crea regole base (archive/delete/move)
- `applyAIPromptToSender()`: applica prompt salvato a nuovo sender
- Toast notifications per feedback utente

---

## 🎯 COME INTEGRARE NELLA PAGINA FUNNEMAIL

### Opzione 1: Integrazione Sidebar + Canvas (Consigliata)

Nella pagina `/funnemail?tab=da-classificare`:

```tsx
import { AIAutomationDemo } from '@/components/email/smart-inbox/AIAutomationDemo';

// Nel componente SmartInboxTabIntelligent o equivalente:
<AIAutomationDemo
  unclassifiedSenders={unclassifiedSendersFromDB}
/>
```

Questo renderà:
- Sidebar sinistra con azioni
- Area centrale con lista mittenti + canvas AI manuale

### Opzione 2: Solo Sidebar (Per tab "Da Classificare")

```tsx
import { AIActionsSidebar } from '@/components/email/smart-inbox/AIActionsSidebar';
import { useEmailAIAutomation } from '@/hooks/useEmailAIAutomation';

const { createSimpleAction, applyAIPromptToSender } = useEmailAIAutomation();
const [selectedSender, setSelectedSender] = useState<string | null>(null);

<div className="flex">
  <AIActionsSidebar
    selectedSender={selectedSender}
    onActionSelect={async (action, promptId) => {
      if (action === 'ai-prompt' && promptId) {
        await applyAIPromptToSender(selectedSender!, promptId);
      } else if (action !== 'ai-prompt') {
        await createSimpleAction(selectedSender!, action);
      }
    }}
  />
  
  <div className="flex-1">
    {/* Lista mittenti esistente */}
  </div>
</div>
```

### Opzione 3: Solo Canvas (Per assistente AI generale)

```tsx
import { AIManualCanvas } from '@/components/email/smart-inbox/AIManualCanvas';

// Può essere aggiunto in qualsiasi punto della UI
<AIManualCanvas className="mt-4" />
```

---

## 📝 PROSSIMI STEP (DA IMPLEMENTARE)

### Fase 3: Esecuzione Automatica AI (TODO)

Creare edge function `email-ai-automation-processor`:
1. Trigger: quando arriva nuova email
2. Controlla se esiste prompt per quel sender
3. Recupera AI config e context (template, alias, dati azienda)
4. Chiama Lovable AI con prompt personalizzato
5. AI analizza e propone azioni con reasoning
6. Se `requires_confirmation=true`:
   - Salva in `email_ai_execution_log` con status='pending'
   - Mostra UI conferma all'utente
   - Su conferma → esegue azioni
7. Se `requires_confirmation=false`:
   - Esegue direttamente (solo per azioni semplici)

### Fase 4: UI Conferma Azioni AI (TODO)

Componente `AIActionConfirmation`:
- Mostra email ricevuta
- Mostra reasoning di AI
- Elenca azioni proposte
- Pulsanti: "Conferma" / "Rifiuta"

### Fase 5: Gestione Avanzata (FUTURO)

- **Azioni avanzate**:
  - Reply automatica con template
  - Forward a più destinatari
  - Create task in sistema
  - Update database (spedizioni, ordini, etc.)
  - Integrazione Zapier
- **Prompt Library**: gestione centrale prompt riutilizzabili
- **Analytics**: dashboard statistiche esecuzioni AI
- **A/B Testing**: confronta performance prompt diversi

---

## 🔑 PUNTI CHIAVE IMPLEMENTAZIONE

### ✅ Selezione AI Provider Obbligatoria
- **MAI hardcodare** un modello AI
- Ogni prompt ha `ai_config_id` che punta a `config_ai`
- Utente sceglie quale AI usare per ogni regola
- Supporta: OpenAI, Anthropic, Google Gemini, HuggingFace, custom

### ✅ Conferma SEMPRE Richiesta (per default)
- Campo `requires_confirmation=true` di default
- AI deve spiegare ragionamento dettagliato
- Solo azioni semplici possono avere `requires_confirmation=false`
- UI mostra SEMPRE cosa AI sta per fare prima di eseguire

### ✅ Context Injection
- `use_email_templates`: inietta template da `email_template`
- `use_contact_aliases`: recupera alias da `rubrica`
- `use_company_data`: include dati aziendali contatto
- Permette risposte personalizzate e coerenti

### ✅ Sicurezza & Privacy
- RLS attivo su entrambe le tabelle
- User può vedere/modificare solo i propri prompt
- Log esecuzioni filtrati per user_id
- API keys AI mai esposte al client

---

## 📊 STATO ATTUALE

| Componente | Stato | Note |
|------------|-------|------|
| Database Schema | ✅ | Tabelle create con RLS |
| Edge Function Manual | ✅ | Funzionante |
| UI Components | ✅ | Sidebar, Dialog, Canvas pronti |
| Hook Automation | ✅ | Logic per azioni base |
| Integrazione FunEmail | ⏳ | Da fare dall'utente |
| Edge Function Auto Processor | ❌ | TODO |
| UI Conferma Azioni | ❌ | TODO |
| Azioni Avanzate | ❌ | FUTURO |

---

## 🚀 COME TESTARE

1. **Vai su `/funnemail?tab=da-classificare`**
2. **Integra `AIAutomationDemo` nella UI esistente**
3. **Seleziona un mittente non classificato**
4. **Clicca "Crea Prompt AI"**:
   - Scegli AI provider (es. google/gemini-2.5-flash)
   - Scrivi prompt personalizzato
   - Salva
5. **Usa Canvas AI manuale**:
   - Fai domanda tipo: "Come gestire email LinkedIn?"
   - Ottieni suggerimenti da AI

---

## 📁 FILE CREATI/MODIFICATI

### Nuovi File
- `src/types/email-automation.ts`
- `src/components/email/smart-inbox/AIActionsSidebar.tsx`
- `src/components/email/smart-inbox/AIPromptDialog.tsx`
- `src/components/email/smart-inbox/AIManualCanvas.tsx`
- `src/components/email/smart-inbox/AIAutomationDemo.tsx`
- `src/hooks/useEmailAIAutomation.ts`
- `supabase/functions/email-ai-manual-assistant/index.ts`
- `docs/IMPLEMENTAZIONE_AI_AUTOMATION.md` (questo file)

### Modificati
- `supabase/config.toml` (aggiunta funzione)
- Migration DB: `email_sender_ai_prompts` + `email_ai_execution_log`

---

## ⚠️ NOTE IMPORTANTI

1. **Lovable AI Gateway**: Richiede crediti workspace attivi
2. **Rate Limits**: Gestiti con catch 429/402 in edge function
3. **AI Provider Selection**: Fondamentale per flessibilità sistema
4. **Backup Funzioni**: Nessuna funzione esistente modificata (come richiesto)
5. **Naming**: Mantenute convenzioni snake_case DB, camelCase frontend

---

**Sistema pronto per essere integrato e testato! 🎉**
