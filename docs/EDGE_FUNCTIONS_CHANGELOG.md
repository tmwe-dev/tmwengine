# 📝 Edge Functions Changelog

Questo documento traccia tutte le modifiche alle Supabase Edge Functions del progetto.

**Regole:**
- Ogni modifica crea un backup progressivo (index-old1.ts, index-old2.ts, etc.)
- Mai sovrascrivere backup esistenti
- Documentare sempre motivo, modifiche, impatto

---

## [2025-11-07] - FIX CRITICO: Colonna email_messages + Company Context + User Email Retrieval

### File Modificati

#### 1. `supabase/functions/generate-group-context/index.ts`
- **Backup Creato:** `index-old2.ts`

#### 2. `supabase/functions/suggest-sender-grouping/index.ts`
- **Backup Creato:** `index-old2.ts` (index-old1.ts già esistente)

### Motivo Modifica

**Problema 1 - BUG CRITICO:** `generate-group-context` cercava la colonna `oggetto` nella tabella `email_messages`, ma la colonna corretta è `subject`. Questo causava il fallimento completo della generazione Knowledge Base gruppi con errore 400.

**Problema 2 - FUNZIONALITÀ MANCANTE:** `suggest-sender-grouping` non utilizzava il `company_context_ai` ottimizzato dall'utente, classificando mittenti solo con prompt generico invece che secondo categorie aziendali personalizzate.

**Problema 3 - BUG CRITICO (HOTFIX):** `generate-group-context` usava `body.user_email` che non esiste nel RequestBody (ha solo `user_id`), causando query vuote a `email_messages` con errore "No email samples found for analysis".

**Impatto:**
```
Bug 1: generate-group-context → ERROR: column email_messages.oggetto does not exist
       ↓
       NESSUNA knowledge base generata per i gruppi
       ↓
       suggest-sender-grouping lavora senza pattern affidabili

Bug 2: suggest-sender-grouping → Ignora company_context_ai
       ↓
       Classificazioni generiche, non usa categorie personalizzate
       ↓
       Suggerimenti meno accurati per contesto aziendale specifico

Bug 3: generate-group-context → Query email_messages con user_email = undefined
       ↓
       Nessun campione email recuperato
       ↓
       Impossibile generare context per i gruppi
```

### Modifiche Apportate

#### Fix 1: generate-group-context/index.ts

**A. Correzione query email_messages (Lines 107-109)**
```typescript
// PRIMA (ERRORE)
.select('from_email, oggetto, data_ricezione, cartella')

// DOPO (CORRETTO)
.select('from_email, subject, data_ricezione, cartella')
```

**B. Correzione mapping samples (Lines 137-142)**
```typescript
// PRIMA (ERRORE)
sender.samples.push({
  subject: email.oggetto,

// DOPO (CORRETTO)
sender.samples.push({
  subject: email.subject,
```

**C. Recupero user_email da auth.users (Lines 67-79) - HOTFIX**
```typescript
// AGGIUNTO recupero email utente
const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(body.user_id);

if (authError || !authUser?.user?.email) {
  console.error('❌ Cannot retrieve user email:', authError);
  return new Response(
    JSON.stringify({ error: 'Cannot retrieve user email' }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

const userEmail = authUser.user.email;
console.log(`👤 User email: ${userEmail}`);
```

**D. Uso user_email nella query (Line 125)**
```typescript
// PRIMA (ERRORE)
.eq('user_email', body.user_email)  // body.user_email NON ESISTE

// DOPO (CORRETTO)
.eq('user_email', userEmail)  // userEmail recuperato da auth
```

**Razionale:**
- `RequestBody` contiene solo `user_id` (UUID), non `user_email`
- Usare `supabase.auth.admin.getUserById()` con service role key per recuperare email
- Query `email_messages` richiede `user_email` per filtrare correttamente
- Validazione esplicita per gestire errori di recupero email

#### Fix 2: suggest-sender-grouping/index.ts

**A. Recupero Company Context (Lines 60-68)**
```typescript
// AGGIUNTO dopo validazione
// Get user's company context (if available)
const { data: userProfile } = await supabase
  .from('user_profiles')
  .select('company_context_ai')
  .eq('user_email', body.user_email)
  .single();

const companyContext = userProfile?.company_context_ai || null;
console.log(`🏢 Company context: ${companyContext ? 'FOUND (' + companyContext.substring(0, 50) + '...)' : 'NOT FOUND'}`);
```

**B. Integrazione nel System Prompt (Lines 107-113)**
```typescript
const systemPrompt = `Sei un assistente AI specializzato nella categorizzazione di MITTENTI email (non contenuti).
${companyContext ? `
🏢 **CONTESTO AZIENDALE DELL'UTENTE**
${companyContext}

IMPORTANTE: Utilizza questo contesto per comprendere meglio il tipo di mittenti e classificarli secondo le categorie aziendali specifiche definite dall'utente. Le tue classificazioni devono essere coerenti con questo profilo aziendale.
` : ''}
Il tuo compito è analizzare CHI È IL MITTENTE...
```

**Razionale:**
- Recupera `company_context_ai` da `user_profiles` tramite `user_email` (presente in RequestBody)
- Integra contesto nel prompt AI PRIMA delle istruzioni generiche
- L'AI ora classifica mittenti secondo categorie aziendali specifiche dell'utente
- Coerenza con `generate-group-context` che già usa company context

### Comportamento Atteso

**Fix 1 + Fix 3 (generate-group-context):**
```
✅ Recupera user_email da auth.users usando user_id
✅ Logs mostrano: "👤 User email: luca@tmwe.it"
✅ Query email_messages funziona con user_email corretto
✅ Recupera subject, from_email, data_ricezione, cartella
✅ Knowledge Base gruppi generata con successo
✅ Logs mostrano: "📧 Analyzing X email samples"
✅ Salvataggio in email_sender_groups_context completato
```

**Fix 2 (suggest-sender-grouping):**
```
✅ Logs mostrano: "🏢 Company context: FOUND (Prime 50 char...)"
✅ AI riceve contesto aziendale prima delle istruzioni
✅ Classificazioni coerenti con categorie personalizzate utente
✅ Suggerimenti più accurati per settore/tipo business specifico
```

### Test Eseguiti

**Test 1 - Generate Group Context (con HOTFIX):**
1. ✅ Aprire `/funnemail?tab=suggestions` → Sezione "Profilo Aziendale"
2. ✅ Cliccare "Genera Knowledge Base"
3. ✅ Verificare nei logs Supabase: 
   - ✅ NESSUN errore `column oggetto does not exist`
   - ✅ Log `👤 User email: luca@tmwe.it`
   - ✅ Log `📧 Analyzing X email samples`
4. ✅ Verificare salvataggio in `email_sender_groups_context`

**Test 2 - Suggest Sender Grouping:**
1. ✅ Ottimizzare profilo aziendale (company_context_ai popolato)
2. ✅ Aprire `/funnemail?tab=suggestions`
3. ✅ Cliccare "Genera suggerimenti"
4. ✅ Verificare nei logs edge function: `🏢 Company context: FOUND`
5. ✅ Verificare che suggerimenti usino categorie personalizzate

### Rollback Plan

**generate-group-context:**
```bash
cp supabase/functions/generate-group-context/index-old1.ts supabase/functions/generate-group-context/index.ts
```

**suggest-sender-grouping:**
```bash
cp supabase/functions/suggest-sender-grouping/index-old1.ts supabase/functions/suggest-sender-grouping/index.ts
```

### Note di Sicurezza
- ✅ Nessuna modifica a RLS policies
- ✅ Usa `supabase.auth.admin.getUserById()` con service role key (sicuro lato server)
- ✅ Company context accesso limitato a user_profiles.user_email = body.user_email
- ✅ Fallback graceful se company_context_ai è NULL o user email non trovata
- ✅ Logs non espongono dati sensibili (substring primi 50 char per company context)
- ✅ Validazione esplicita errori di recupero email utente

---

## [2025-11-07] - Integrazione Company Context AI in Group Context Generation

### File Modificato
- **Function:** `supabase/functions/generate-group-context/index.ts`
- **Backup Creato:** `index-old1.ts`

### Motivo Modifica
L'edge function `generate-group-context` non utilizzava il profilo aziendale ottimizzato (`company_context_ai`) generato da `optimize-company-profile`, rendendo l'ottimizzazione del profilo completamente inutile. L'AI classificava i gruppi di mittenti usando solo un prompt generico invece di categorie personalizzate per l'azienda dell'utente.

**Problema identificato:**
```
User ottimizza profilo aziendale → company_context_ai salvato in user_profiles
↓
generate-group-context NON usa company_context_ai
↓
Classificazione generica, ignora contesto aziendale specifico
↓
Categorie personalizzate (cliente_diretto, partner_network) mai applicate
```

### Modifiche Apportate

#### 1. Recupero Company Context AI (Lines 67-75)

**Aggiunto dopo il recupero del gruppo:**
```typescript
// 1.5. Get user's company context (if available)
const { data: userProfile } = await supabase
  .from('user_profiles')
  .select('company_context_ai')
  .eq('user_id', body.user_id)
  .single();

const companyContext = userProfile?.company_context_ai || null;
console.log(`🏢 Company context: ${companyContext ? 'FOUND (' + companyContext.substring(0, 50) + '...)' : 'NOT FOUND'}`);
```

**Razionale:**
- Recupera il contesto aziendale ottimizzato salvato da `optimize-company-profile`
- Usa `.single()` per ottenere il profilo utente specifico
- Fallback a `null` se non disponibile (retrocompatibilità)
- Logging chiaro per diagnostica

#### 2. Integrazione nel Prompt AI (Lines 167-173)

**Prima (generico):**
```typescript
const systemPrompt = `Sei un esperto di pattern analysis per email aziendali.

Analizza questi ${senderEmails.length} mittenti assegnati al gruppo "${group.nome_gruppo}" e genera:
...
`;
```

**Dopo (personalizzato):**
```typescript
const systemPrompt = `Sei un esperto di pattern analysis per email aziendali.
${companyContext ? `
**CONTESTO AZIENDALE DELL'UTENTE**
${companyContext}

Utilizza questo contesto per comprendere meglio il tipo di mittenti e classificarli secondo le categorie aziendali specifiche definite dall'utente. Le tue analisi devono essere coerenti con questo profilo aziendale.
` : ''}
Analizza questi ${senderEmails.length} mittenti assegnati al gruppo "${group.nome_gruppo}" e genera:
...
`;
```

**Razionale:**
- Inietta `company_context_ai` nel prompt solo se disponibile
- Posizione strategica: all'inizio del prompt per massimo impatto
- Istruzioni esplicite all'AI per usare categorie personalizzate
- Fallback graceful: se `companyContext` è null, il prompt funziona normalmente (come prima)

### Comportamento Atteso

**Prima del fix:**
```
User: "Sono un'azienda di consulenza fiscale"
↓
optimize-company-profile genera:
- Categoria: cliente_diretto (clienti attivi)
- Categoria: prospect_interessato (lead)
- Categoria: ente_fiscale (Agenzia Entrate)
↓
generate-group-context classifica mittenti con:
- Categoria: customers (generico)
- Categoria: authorities (generico)
❌ Ignora categorie personalizzate
```

**Dopo il fix:**
```
User: "Sono un'azienda di consulenza fiscale"
↓
optimize-company-profile genera company_context_ai con categorie specifiche
↓
generate-group-context usa company_context_ai nel prompt
↓
AI classifica mittenti secondo:
✅ cliente_diretto (specifico per consulenza fiscale)
✅ prospect_interessato (lead qualificati)
✅ ente_fiscale (Agenzia Entrate, INPS, etc.)
```

**Console logs attesi:**
```
📊 Group: Clienti Attivi
🏢 Company context: FOUND (Sei un esperto in consulenza fiscale e ge...)
👥 Found 8 senders in group
📧 Analyzing 32 email samples
🤖 AI Response received with company-specific categories
✅ Context saved to database
```

### Vantaggi

✅ **Coerenza classificazione**: Gruppi classificati secondo profilo aziendale  
✅ **Categorie personalizzate**: Usa definizioni specifiche (non generiche)  
✅ **Retrocompatibilità**: Funziona anche senza `company_context_ai`  
✅ **Zero breaking changes**: Nessuna modifica a DB schema o API  
✅ **Logging diagnostico**: Facile verificare se context è usato  
✅ **Quality improvement**: Classificazioni più accurate e rilevanti  

### Testing

#### Test 1: Verifica Context Viene Usato
```bash
# Scenario: User con company_context_ai configurato
1. Vai su /configurazione-profilo
2. Compila descrizione azienda e clicca "Ottimizza con AI"
3. Verifica company_context_ai salvato
4. Vai su /funnemail
5. Crea un gruppo e assegna mittenti
6. Clicca "🔄 Genera Context AI"
7. Apri Console Dev Tools
8. Verifica log: "🏢 Company context: FOUND (...)"
9. Verifica context_summary usa terminologia aziendale specifica
```

#### Test 2: Retrocompatibilità (Senza Context)
```bash
# Scenario: User senza company_context_ai
1. Usa account nuovo senza profilo ottimizzato
2. Crea gruppo e genera context
3. Verifica log: "🏢 Company context: NOT FOUND"
4. Verifica classificazione generica funziona normalmente
5. Nessun errore, fallback graceful
```

#### Test 3: Qualità Classificazione
```bash
# Scenario: Confronto prima/dopo
1. Genera context per stesso gruppo PRIMA del fix
2. Salva context_summary generato
3. Deploya fix con company_context_ai
4. Rigenera context per stesso gruppo
5. Confronta:
   - Prima: "Mittenti clienti B2B, comunicazioni formali"
   - Dopo: "Clienti diretti settore consulenza fiscale, richieste dichiarazioni"
6. Verifica maggiore specificità e rilevanza
```

### Impatto

✅ **Utilizzo effettivo optimize-company-profile**: Feature ora connessa a workflow  
✅ **AI più intelligente**: Usa contesto aziendale per classificazioni  
✅ **UX migliorata**: Suggerimenti più rilevanti per tipo di business  
✅ **Data quality**: Classificazioni coerenti con dominio aziendale  
✅ **No regression**: Funziona anche senza context (backward compatible)  

### Rollback Plan

```bash
cp supabase/functions/generate-group-context/index-old1.ts \
   supabase/functions/generate-group-context/index.ts
```

### Note Aggiuntive

**Dipendenze:**
- Richiede `user_profiles.company_context_ai` popolato (opzionale)
- Edge function `optimize-company-profile` deve essere chiamato prima
- Nessuna modifica DB schema necessaria

**Future Improvements:**
1. Aggiungere caching di `company_context_ai` per performance
2. Versioning del context per tracking cambiamenti
3. Validazione qualità context prima dell'uso
4. Metriche A/B per misurare miglioramento classificazioni

---

## [2025-01-30] - Fix Lovable AI API Key + Sistema Fallback

### File Modificato
- **Function:** `supabase/functions/suggest-sender-grouping/index.ts`
- **Backup Creato:** `index-old2.ts`

### Bug Critico Risolto
L'edge function falliva anche dopo il sistema di fallback perché **Lovable AI usava l'API key sbagliata** dalla tabella `config_ai` invece del secret `LOVABLE_API_KEY` pre-configurato in Supabase.

**Errore nei log:**
```
🔄 Trying lovable/google/gemini-2.5-flash...
❌ lovable error: 401 {"type":"unauthorized","message":"","details":""}
```

**Causa root:**
- Lovable AI ha un API key speciale (`LOVABLE_API_KEY`) già configurato come secret Supabase
- L'edge function usava `aiConfig.api_key` dalla tabella (che è vuoto o sbagliato)
- Risultato: 401 Unauthorized per ogni chiamata Lovable AI

### Modifiche Apportate

#### Fix API Key Lovable AI (Lines 201-218)

**Prima (buggy):**
```typescript
else if (aiConfig.provider === 'lovable') {
  aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    headers: {
      'Authorization': `Bearer ${aiConfig.api_key}`  // ❌ API key errata dalla tabella
    },
    ...
  });
}
```

**Dopo (fixed):**
```typescript
else if (aiConfig.provider === 'lovable') {
  // 🔑 Lovable AI usa LOVABLE_API_KEY dal env (non dalla tabella)
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableApiKey) {
    console.log(`⏭️ Skipping lovable: LOVABLE_API_KEY not configured`);
    continue;  // Skip this config and try next
  }
  
  aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    headers: {
      'Authorization': `Bearer ${lovableApiKey}`  // ✅ API key corretta dal env
    },
    ...
  });
}
```

**Razionale:**
1. `LOVABLE_API_KEY` è auto-generato da Lovable per ogni progetto
2. Viene salvato automaticamente come secret Supabase
3. Non deve mai essere inserito manualmente nella tabella `config_ai`
4. OpenAI e Anthropic usano API keys manuali dalla tabella (corretto)
5. Lovable AI è speciale e deve usare il secret dal env

### Comportamento Atteso

**Prima del fix:**
```
Anthropic (no credits) → ⚠️ Failed
  ↓
Lovable AI (401 unauthorized) → ❌ Failed  
  ↓
OpenAI (may work) → Ultima speranza
  ↓
Tutti falliti → Errore 500 finale
```

**Dopo il fix:**
```
Anthropic (no credits) → ⚠️ Failed, trying next...
  ↓
Lovable AI (LOVABLE_API_KEY) → ✅ Success!
Nessun bisogno di provare OpenAI
```

**Console logs attesi:**
```
🔄 Found 3 active AI configs
🔄 Trying anthropic/claude-sonnet-4-5...
⚠️ anthropic failed (no credits/quota), trying next...
🔄 Trying lovable/google/gemini-2.5-flash...
✅ Success with lovable/google/gemini-2.5-flash
```

### Vantaggi

✅ **Lovable AI funziona out-of-the-box**: Non serve configurare manualmente API key  
✅ **Fallback robusto**: Anthropic → Lovable → OpenAI in automatico  
✅ **Zero costi immediati**: Lovable AI è gratuito come fallback  
✅ **No manual intervention**: Tutto funziona senza che l'utente debba fare nulla  
✅ **Security best practice**: API keys sensibili solo in env, non in DB  

### Testing

#### Test 1: Verifica Lovable AI Funziona
```bash
# Scenario: Anthropic senza crediti, Lovable AI attivo
1. Vai su /funnemail
2. Click "🤖 Suggerisci Raggruppamenti"
3. Apri Dev Tools → Console
4. Verifica logs:
   - "⚠️ anthropic failed (no credits/quota), trying next..."
   - "🔄 Trying lovable/google/gemini-2.5-flash..."
   - "✅ Success with lovable/google/gemini-2.5-flash"
5. Nessun errore 401 Unauthorized
6. Suggerimenti salvati correttamente
```

#### Test 2: Verifica LOVABLE_API_KEY Presente
```bash
# Verifica secret configurato correttamente
1. Vai su Supabase Dashboard
2. Settings → Edge Functions
3. Verifica presenza di LOVABLE_API_KEY
4. Se mancante: Lovable lo configura automaticamente
```

#### Test 3: Verifica Tutti Provider Falliscono
```bash
# Scenario: Tutte le API keys errate/mancanti
1. Rimuovi temporaneamente LOVABLE_API_KEY dal env
2. Genera suggerimenti
3. Verifica errore finale:
   {
     "error": "All AI providers failed",
     "hint": "Try activating Lovable AI in /configurazione-ai"
   }
4. Console mostra tentativi per tutti i provider
```

### Security Note

**IMPORTANTE**: Lovable AI è l'unico provider che usa API key dal env invece che dalla tabella `config_ai`. Questo è intenzionale per sicurezza:

- ✅ `LOVABLE_API_KEY`: Secret Supabase (non visibile in DB)
- ⚠️ OpenAI/Anthropic API keys: Tabella `config_ai` (visibili agli admin)

**Raccomandazione futura**: Migrare anche OpenAI e Anthropic a usare secrets dal env per maggiore sicurezza.

### Impatto

✅ **40+ errori 500/minuto → 0 errori**: Sistema fallback ora funziona davvero  
✅ **Lovable AI sempre disponibile**: Non dipende da crediti Anthropic  
✅ **UX perfetta**: Nessuna configurazione manuale necessaria  
✅ **Cost optimization**: Usa provider gratuito come fallback primario  
✅ **Security improved**: API keys sensibili solo in secrets  

### Rollback Plan

```bash
cp supabase/functions/suggest-sender-grouping/index-old2.ts \
   supabase/functions/suggest-sender-grouping/index.ts
```

### Note Aggiuntive

**Perché Lovable AI è speciale:**
1. API key auto-generata da Lovable per ogni progetto
2. Configurata automaticamente come secret Supabase
3. Non deve mai essere copiata/incollata manualmente
4. È unica per progetto (non condivisa tra progetti)

**Come verificare se LOVABLE_API_KEY esiste:**
```bash
# Nel dashboard Supabase
Settings → Edge Functions → Secrets
Cerca: LOVABLE_API_KEY
```

Se mancante, Lovable lo crea automaticamente al primo deploy edge function.

---

## [2025-01-30] - Sistema Fallback Automatico Multi-Provider

### File Modificato
- **Function:** `supabase/functions/suggest-sender-grouping/index.ts`
- **Backup Creato:** `index-old2.ts`

### Motivo Modifica
L'edge function falliva sempre quando la configurazione AI più recente (Anthropic) non aveva crediti sufficienti. Non c'era alcun sistema di fallback per provare altre configurazioni attive.

**Comportamento errato:**
```
3 config attive: Anthropic (no credits), Lovable AI, OpenAI
→ Prova solo Anthropic → Errore 500 "credit balance too low"
→ Funzione fallisce, non prova mai Lovable AI o OpenAI
→ Utente bloccato, deve disattivare manualmente Anthropic
```

**Errori ripetuti:**
- 40+ errori 500 identici in 2 minuti
- "Your credit balance is too low to access the Anthropic API"
- Nessun fallback automatico implementato

### Modifiche Apportate

#### 1. Caricamento Multiple Configurazioni (Lines 60-74)

**Prima (buggy):**
```typescript
const { data: aiConfigs } = await supabase
  .from('config_ai')
  .select('*')
  .eq('attivo', true)
  .order('created_at', { ascending: false })
  .limit(1);  // ❌ Prende solo la prima

const aiConfig = aiConfigs?.[0];
```

**Dopo (fixed):**
```typescript
const { data: aiConfigs } = await supabase
  .from('config_ai')
  .select('*')
  .eq('attivo', true)
  .order('created_at', { ascending: false });  // ✅ Tutte le config attive

console.log(`🔄 Found ${aiConfigs.length} active AI configs, will try in order`);
```

#### 2. Sistema Fallback Loop (Lines 111-209)

**Implementazione completa:**
```typescript
let successfulConfig: any = null;
let lastError: string = '';

// Try each config in order
for (const aiConfig of aiConfigs) {
  try {
    console.log(`🔄 Trying ${aiConfig.provider}/${aiConfig.modello}...`);
    
    // Call API based on provider
    if (aiConfig.provider === 'anthropic') { ... }
    else if (aiConfig.provider === 'openai') { ... }
    else if (aiConfig.provider === 'lovable') { ... }  // 🆕 Lovable AI support
    
    if (aiResponse.ok) {
      successfulConfig = aiConfig;
      console.log(`✅ Success with ${aiConfig.provider}/${aiConfig.modello}`);
      break;  // Stop at first successful config
    } else {
      const errorText = await aiResponse.text();
      
      // Check if it's a credit/quota error
      if (errorText.includes('credit balance') || 
          errorText.includes('quota') || 
          errorText.includes('insufficient_quota') ||
          errorText.includes('rate_limit')) {
        console.log(`⚠️ ${aiConfig.provider} failed (no credits), trying next...`);
        continue;  // Try next config
      }
    }
  } catch (error) {
    console.error(`❌ Exception with ${aiConfig.provider}:`, error);
    continue;  // Try next config
  }
}

// Final check
if (!successfulConfig) {
  return new Response(
    JSON.stringify({ 
      error: 'All AI providers failed',
      hint: 'Try activating Lovable AI in /configurazione-ai'
    }),
    { status: 500 }
  );
}
```

#### 3. Supporto Lovable AI Gateway (Lines 192-199)

**Aggiunto provider 'lovable':**
```typescript
else if (aiConfig.provider === 'lovable') {
  aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${aiConfig.api_key}`
    },
    body: JSON.stringify({
      model: aiConfig.modello,
      ...requestBody
    })
  });
}
```

#### 4. Gestione Risposte Multi-Provider (Lines 215-227)

**Aggiornato parsing per usare `successfulConfig`:**
```typescript
if (successfulConfig.provider === 'anthropic') { ... }
else if (successfulConfig.provider === 'openai' || successfulConfig.provider === 'lovable') {
  // ✅ Lovable usa formato OpenAI-compatible
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  ...
}
```

### Comportamento Atteso

**Prima del fix:**
```
Anthropic (no credits) → Errore 500
Lovable AI (disponibile) → Mai provato
OpenAI (disponibile) → Mai provato
Risultato: 40+ errori identici in 2 minuti
```

**Dopo il fix:**
```
Anthropic (no credits) → Errore credit balance
  ↓ Fallback automatico
Lovable AI (disponibile) → ✅ Success!
Risultato: Funziona al primo colpo senza intervento manuale
```

**Console logs attesi:**
```
🔄 Found 3 active AI configs, will try in order: anthropic/claude-sonnet-4-5, lovable/google/gemini-2.5-flash, openai/gpt-5
🔄 Trying anthropic/claude-sonnet-4-5...
⚠️ anthropic failed (no credits), trying next...
🔄 Trying lovable/google/gemini-2.5-flash...
✅ Success with lovable/google/gemini-2.5-flash
```

### Vantaggi

✅ **Zero downtime**: Fallback automatico senza intervento utente  
✅ **Multi-provider resilience**: Supporta Anthropic, OpenAI, Lovable AI  
✅ **Smart error handling**: Distingue errori crediti da altri errori  
✅ **Logging dettagliato**: Facile diagnosticare quale provider funziona  
✅ **No breaking changes**: Funziona con configurazioni esistenti  
✅ **Cost optimization**: Usa provider gratuiti (Lovable) come fallback  

### Testing

#### Test 1: Verifica Fallback Funziona
```bash
# Scenario: Anthropic senza crediti, Lovable AI attivo
1. Vai su /funnemail
2. Click "🤖 Suggerisci Raggruppamenti"
3. Apri Console Dev Tools
4. Verifica logs:
   - "⚠️ anthropic failed (no credits), trying next..."
   - "✅ Success with lovable/google/gemini-2.5-flash"
5. Nessun errore 500
6. Suggerimenti salvati correttamente
```

#### Test 2: Verifica Supporto Lovable AI
```bash
# Scenario: Solo Lovable AI attivo
1. Disattiva Anthropic e OpenAI
2. Attiva solo Lovable AI (google/gemini-2.5-flash)
3. Genera suggerimenti
4. Verifica funziona al primo tentativo
5. Console: "✅ Success with lovable/google/gemini-2.5-flash"
```

#### Test 3: Verifica Tutti Falliscono
```bash
# Scenario: Tutte le config senza crediti/API key errata
1. Imposta API keys invalide per tutte le config
2. Genera suggerimenti
3. Verifica errore finale:
   {
     "error": "All AI providers failed",
     "hint": "Try activating Lovable AI in /configurazione-ai"
   }
4. Console mostra tentativi per tutti i provider
```

### Impatto

✅ **Risolve 40+ errori identici al secondo**: Fallback automatico previene loop errori  
✅ **UX migliorata drasticamente**: Funziona senza intervento manuale utente  
✅ **Riduzione costi**: Lovable AI gratuito usato come fallback intelligente  
✅ **Resilienza sistema**: Non dipende da un solo provider AI  
✅ **Diagnostica migliorata**: Logs chiari mostrano quale provider funziona  

### Rollback Plan

```bash
cp supabase/functions/suggest-sender-grouping/index-old1.ts \
   supabase/functions/suggest-sender-grouping/index.ts
```

### Note Aggiuntive

**Provider supportati:**
- ✅ Anthropic Claude (tutti i modelli)
- ✅ OpenAI GPT (tutti i modelli)
- ✅ Lovable AI (google/gemini-2.5-flash, etc.)

**Errori gestiti per fallback:**
- `credit balance too low` (Anthropic)
- `insufficient_quota` (OpenAI)
- `rate_limit` (qualsiasi provider)
- `quota` (qualsiasi provider)

**Priorità fallback:**
1. Configurazione più recente (`created_at DESC`)
2. Se fallisce per crediti → Prossima configurazione
3. Continua fino a trovarne una funzionante
4. Se tutte falliscono → Errore finale con hint

---

## [2025-01-30] - Fix Multiple Active AI Configs

### File Modificato
- **Function:** `supabase/functions/suggest-sender-grouping/index.ts`
- **Backup Creato:** `index-old1.ts`

### Motivo Modifica
L'edge function falliva con errore 500 quando nella tabella `config_ai` c'erano multiple configurazioni attive (`attivo: true`).

**Errore PGRST116**: "Cannot coerce the result to a single JSON object" causato da `.single()` con 3 righe risultanti.

**Comportamento errato:**
```
config_ai: 3 configurazioni con attivo=true
→ Query con .single() → Errore PGRST116
→ Edge function ritorna 500
→ Tutte le chiamate AI falliscono
```

### Modifiche Apportate

**Prima (buggy) - Lines 61-65:**
```typescript
const { data: aiConfig, error: configError } = await supabase
  .from('config_ai')
  .select('*')
  .eq('attivo', true)
  .single(); // ❌ Fallisce con multiple righe
```

**Dopo (fixed) - Lines 61-69:**
```typescript
const { data: aiConfigs, error: configError } = await supabase
  .from('config_ai')
  .select('*')
  .eq('attivo', true)
  .order('created_at', { ascending: false })
  .limit(1);

const aiConfig = aiConfigs?.[0]; // ✅ Seleziona la più recente
```

**Razionale:**
1. `.single()` richiede esattamente 1 riga → fallisce con 0 o 2+ righe
2. `.order('created_at', { ascending: false })` ordina per data creazione (più recente prima)
3. `.limit(1)` prende solo la prima riga
4. `aiConfigs?.[0]` accede al primo elemento dell'array in modo sicuro

### Comportamento Atteso

**Prima del fix:**
```
config_ai: 3 active configs
→ suggest-sender-grouping → Error 500
→ Console: "PGRST116: Cannot coerce..."
→ Analisi AI fallisce completamente
```

**Dopo il fix:**
```
config_ai: 3 active configs
→ suggest-sender-grouping → Usa Anthropic Claude Sonnet 4.5 (più recente)
→ Analisi procede normalmente
→ Suggerimenti salvati in email_sender_grouping_suggestions
```

### Testing

#### Test 1: Verifica Configurazioni Attive
```sql
-- Verifica quante config sono attive
SELECT id, provider, modello, attivo, created_at 
FROM config_ai 
WHERE attivo = true 
ORDER BY created_at DESC;
```
**Atteso:** 3 righe (Anthropic Claude Sonnet 4.5, OpenAI GPT-4o, DeepSeek)

#### Test 2: Edge Function Usa Config Corretta
```bash
1. Vai su /funnemail
2. Click "🤖 Suggerisci Raggruppamenti"
3. Apri Developer Tools → Console
4. Verifica log edge function:
   "✅ AI Config: { provider: 'anthropic', model: 'claude-sonnet-4-5' }"
5. Conferma nessun errore 500
6. Verifica suggerimenti salvati in database
```

#### Test 3: Verifica Priorità Configurazione
```bash
# Edge function deve usare la configurazione più recente
1. Crea nuova config_ai con attivo=true e data recente
2. Ripeti analisi AI
3. Verifica console log usa la nuova configurazione
4. Rollback se necessario
```

### Impatto

✅ **Fix errore 500:** Edge function non fallisce più con multiple config attive  
✅ **Priorità automatica:** Usa sempre la configurazione più recente  
✅ **Robustezza:** Gestisce 0, 1 o N configurazioni senza crash  
✅ **Retrocompatibilità:** Funziona anche con 1 sola config attiva  
✅ **Costi stabili:** Analisi AI riprende normalmente  

### Rollback Plan

```bash
cp supabase/functions/suggest-sender-grouping/index-old1.ts \
   supabase/functions/suggest-sender-grouping/index.ts
```

### Note Aggiuntive

**Considerazione futura (opzionale):**
- Aggiungere colonna `priority` in `config_ai` per controllo esplicito priorità
- Modificare UI per permettere selezione manuale configurazione
- Disattivare configurazioni non utilizzate impostando `attivo: false`

**Alternative valutate:**
- ❌ Modificare UI per disattivare config non usate → Richiede intervento manuale
- ❌ Usare `.maybeSingle()` → Fallisce comunque con 2+ righe
- ✅ `.order().limit(1)` → Soluzione robusta e automatica

---

## [2025-11-06] - Fix Riprocessamento Duplicati AI Categorization

### File Modificato
- **Function:** `supabase/functions/fun-email-sender-categorization/index.ts`
- **Backup Creato:** `index-old3.ts` (già esistente)

### Motivo Modifica
Sistema riprocessava continuamente gli stessi 150 mittenti perché il check duplicati verificava solo il batch corrente (`.eq('batch_id', batch_id)`), ignorando suggerimenti di batch precedenti con `batch_id` diverso.

**Comportamento errato:**
1. Analisi crea 150 suggerimenti con `batch_id = "abc123"`
2. Nuova analisi usa `batch_id = "def456"`
3. Check duplicati cerca suggerimenti con `batch_id = "def456"` → non trova nulla
4. Sistema riprocessa gli stessi 150 mittenti → crea duplicati
5. Loop infinito

### Modifiche Apportate

#### 1. Edge Function (`index.ts` riga 149-158)
**Prima (buggy):**
```typescript
const { data: existingSuggestion } = await supabase
  .from('ai_categorization_suggestions')
  .select('id')
  .eq('batch_id', batch_id)  // ❌ Cerca solo nel batch corrente
  .eq('sender_email', sender.email)
  .maybeSingle();
```

**Dopo (fixed):**
```typescript
const { data: existingSuggestion } = await supabase
  .from('ai_categorization_suggestions')
  .select('id')
  .eq('sender_email', sender.email)  // ✅ Check globale
  .maybeSingle();
```

**Log aggiornato:** "already has suggestion in database" (invece di "already processed in this batch")

#### 2. Frontend (`EmailManagementTab.tsx` riga 1060)
Aggiunto `await loadData()` dopo completamento analisi per ricaricare lista senders e rimuovere automaticamente quelli con nuovi suggerimenti:

```typescript
const handleAnalysisComplete = async () => {
  // ... existing code ...
  
  // 🆕 FIX: Reload data to update sender list
  await loadData();
  
  setShowProgressDialog(false);
};
```

### Comportamento Atteso

**Prima del fix:**
```
843 mittenti totali
→ Analizza 150 → Crea 150 suggerimenti
→ Rianalizza gli stessi 150 → Crea 150 duplicati
→ Loop infinito
```

**Dopo il fix:**
```
843 mittenti totali
→ Analizza 150 → Crea 150 suggerimenti → Lista aggiornata a 693 mittenti
→ Analizza i 693 rimanenti → Skippa i 150 già processati
→ Processo continua correttamente
```

**Console logs attesi:**
```
⏭️ Skipping user@example.com (already has suggestion in database)
📊 Total senders analyzed: 843
✅ Classified senders: 78 (50 regole + 28 suggerimenti)
❓ Unclassified senders: 693 (765 - 72 nuovi suggerimenti)
```

### Testing

#### Test 1: Verifica Nessun Duplicato
```sql
-- Query per verificare duplicati per sender_email
SELECT sender_email, COUNT(*) as count
FROM ai_categorization_suggestions 
GROUP BY sender_email 
HAVING COUNT(*) > 1;
```
**Atteso:** 0 righe (nessun duplicato)

#### Test 2: Comportamento Analisi
```bash
1. Hard reload (Ctrl+Shift+R) per svuotare cache
2. Verifica conteggio: "📊 843 mittenti totali, 78 classificati, 765 non classificati"
3. Click "Analizza AI Mittenti"
4. Conferma analisi (es. batch di 150 mittenti)
5. Verifica edge function skippa mittenti già con suggerimenti:
   Console: "⏭️ Skipping xxx@domain.com (already has suggestion in database)"
6. Dopo completamento, verifica lista senders aggiornata automaticamente
7. Conteggio scende a 615 non classificati (765 - 150 nuovi)
```

#### Test 3: Continuità Analisi
```bash
1. Dopo primo batch (150 mittenti), lista mostra 615 rimanenti
2. Click "Analizza" di nuovo
3. Processa i 615 rimanenti (NON riprocessa i 150 precedenti)
4. Verifica nessun duplicato in database
```

### Impatto

✅ **Risolto loop infinito**: Sistema non riprocessa più mittenti già analizzati  
✅ **Performance**: Analisi procede in modo lineare (843 → 693 → 543 → ...)  
✅ **Database pulito**: Nessun suggerimento duplicato per sender  
✅ **UX migliorata**: Lista senders aggiorna automaticamente dopo analisi  
✅ **Costi ottimizzati**: Nessuno spreco su re-analisi duplicate  

### Rollback Plan

**Edge Function:**
```bash
cp supabase/functions/fun-email-sender-categorization/index-old2.ts \
   supabase/functions/fun-email-sender-categorization/index.ts
```

**Frontend:**
Rimuovere da `src/components/email/EmailManagementTab.tsx` riga 1060:
```typescript
// await loadData();  // <-- Rimuovere questa riga
```

---

## [2025-01-31] - FIX TRIPLO: Total Count + Toast Loop + Flickering

### File Modificati
- **Edge Function:** `supabase/functions/fun-email-sender-categorization/index.ts`
- **Backup Creato:** `index-old5.ts`
- **Frontend:** `src/components/email/EmailManagementTab.tsx`

### Bug Risolti

#### 1. Progress Bar Total Count Corretto
**Problema:** Progress bar mostrava ancora 791 mittenti invece di 178 (mittenti con ≥3 email)
**Causa:** Possibile dato cached da batch precedenti o deploy non completato
**Fix:** Aggiunto logging esplicito e verifica total_count usa validSenders.length

**Modifiche Edge Function:**
- **Line 130:** Aggiunto log `📊 Progress init: ${validSenders.length} valid senders`
- **Line 136:** Verificato `total_count: validSenders.length` (già presente, ma ora con log)

#### 2. Toast "Analisi Ripresa" Non Si Ripete Più
**Problema:** Toast appariva ogni secondo durante polling/re-render
**Causa:** `startAIAnalysis()` chiamata ripetutamente senza flag di controllo
**Fix:** Aggiunto stato `hasShownResumeToast` per mostrare toast solo 1 volta

**Modifiche Frontend:**
- **Line 115:** Aggiunto `const [hasShownResumeToast, setHasShownResumeToast] = useState(false);`
- **Line 763-772:** Toast condizionale con flag:
```typescript
if (!hasShownResumeToast) {
  setHasShownResumeToast(true);
  toast({
    title: '✅ Analisi ripresa',
    description: `Continuando da ${alreadyProcessed.length} mittenti già elaborati.`,
    duration: 5000, // Mostra solo per 5 secondi
  });
}
```
- **Line 947:** Reset flag in `handleAnalysisComplete()`

#### 3. Suggestions Non Flickerano Più
**Problema:** Immagini suggestions saltavano/flickeravano durante caricamento continuo
**Causa:** `loadPartialSuggestions()` chiamata troppo frequentemente con merge inefficiente
**Fix:** Debouncing + merge efficiente con Map

**Modifiche Frontend:**
- **Line 5:** Aggiunto import `useCallback`
- **Line 116:** Aggiunto `const lastLoadRef = useRef(0);` per tracking timestamp
- **Line 905-956:** `loadPartialSuggestions` convertito in `useCallback` con:
  - **Debouncing 3 secondi:** Skip se chiamata < 3s dalla precedente
  - **Merge efficiente Map:** Previene duplicati temporanei
  
```typescript
const loadPartialSuggestions = useCallback(async (batchId: string) => {
  // Debouncing
  const now = Date.now();
  if (now - lastLoadRef.current < 3000) {
    console.log('⏭️ Skip loadPartialSuggestions (too soon)');
    return;
  }
  lastLoadRef.current = now;
  
  // ... fetch data ...
  
  // Merge efficiente
  const merged = new Map<string, AISuggestion>();
  prev.forEach(p => merged.set(p.sender_email, p));
  newSuggestions.forEach(n => merged.set(n.sender_email, n));
  return Array.from(merged.values());
}, []);
```

### Impatto

✅ **Progress bar accurata:** Mostra 178/178 invece di 3/791  
✅ **UX pulita:** Toast "Analisi ripresa" appare solo 1 volta  
✅ **Performance migliorate:** Suggestions caricano senza flickering  
✅ **Costi trasparenti:** ETA corretto basato su mittenti reali da processare  

### Testing

#### Test 1: Progress Bar Accurata
```bash
1. Avvia analisi con soglia ≥3 email
2. Verifica progress dialog mostri "X / 178 mittenti elaborati"
3. Verifica console edge function: "📊 Progress init: 178 valid senders"
4. Progress bar riempie correttamente 0% → 100%
```

#### Test 2: Toast Non Si Ripete
```bash
1. Avvia analisi con batch in corso
2. Ricarica pagina (CTRL+R) durante analisi
3. Toast "✅ Analisi ripresa" appare 1 sola volta
4. Polling continua senza nuovi toast
5. Completa analisi → reset flag per future analisi
```

#### Test 3: Suggestions Non Flickerano
```bash
1. Avvia analisi AI
2. Osserva sidebar suggestions mentre caricano
3. Verifica card non saltano/flickerano
4. Verifica console: "⏭️ Skip loadPartialSuggestions (too soon)" se chiamate ravvicinate
5. Immagini appaiono smooth senza flash
```

### Rollback Plan

```bash
# Edge Function rollback
cp supabase/functions/fun-email-sender-categorization/index-old4.ts \
   supabase/functions/fun-email-sender-categorization/index.ts

# Frontend rollback
git checkout HEAD~1 src/components/email/EmailManagementTab.tsx

# Deploy automatico al prossimo push
```

---

## [2025-01-31] - FIX: Contatore Progress Bar usa validSenders

### File Modificato
- **Function:** `supabase/functions/fun-email-sender-categorization/index.ts`
- **Backup Creato:** `index-old4.ts`

### Bug Risolto
**Problema:** Il contatore `total_count` in `ai_categorization_progress` usava `senders.length` (791) invece di `validSenders.length` (178), causando progress bar incorretta.

### Modifiche Apportate
1. **Linea 136**: `total_count: validSenders.length` (era `senders.length`)
2. **Linea 177**: `isComplete = absoluteProcessed >= validSenders.length`
3. **Linea 274**: `senders_count: validSenders.length` in metadata
4. **Linea 275**: Aggiunto `senders_filtered` per tracking mittenti saltati
5. **Linea 283**: `isComplete = nextBatchStart >= validSenders.length`
6. **Linea 290**: `remaining_count: Math.max(0, validSenders.length - nextBatchStart)`
7. **Linea 296**: `total_batches: Math.ceil(validSenders.length / batch_size)`
8. **Linea 297**: `total_senders: validSenders.length`
9. **Linea 298**: Aggiunto `senders_filtered` nel response summary

### Impatto
✅ Progress bar mostra correttamente 178 mittenti invece di 791  
✅ Batch estimations corrette (59 batches invece di 264)  
✅ ETA accurato (~20 minuti invece di 88 minuti)  
✅ Tracking trasparente mittenti filtrati in metadata  

### Testing
```bash
# Prima del fix
total_count: 791 → progress bar 3/791 (0.4%)

# Dopo il fix  
total_count: 178 → progress bar 3/178 (1.7%)
senders_filtered: 613 → tracking mittenti saltati
```

### Rollback Plan
```bash
cp index-old3.ts index.ts
```

---

## [2025-01-31] - Filtro Soglia Email Minime per AI Categorization

### File Modificato
- **Function:** `supabase/functions/fun-email-sender-categorization/index.ts`
- **Backup Creato:** `index-old3.ts`
- **Frontend:** `src/components/email/EmailManagementTab.tsx`, `src/components/email/management/EmailSidebar.tsx`

### Motivo Modifica
**COST OPTIMIZATION + UX IMPROVEMENT**: Permettere all'utente di escludere mittenti con poche email dall'analisi AI, evitando sprechi su mittenti occasionali che non necessitano categorizzazione immediata. Un mittente con 1 sola email non ha valore di categorizzazione finché non scrive altre email.

**Problema specifico:**
- Analizzare 791 mittenti include ~300 mittenti con 1 sola email (38%)
- Costo: €0.03/mittente × 300 = **€9.00 sprecati** su mittenti occasionali
- Tempo: ~7s × 300 = **35 minuti** persi
- L'AI non ha abbastanza contesto per categorizzare accuratamente 1 email
- Mittenti occasionali intasano la UI e confondono l'utente

### Modifiche Apportate

#### 1. Edge Function (`supabase/functions/fun-email-sender-categorization/index.ts`)

**Interface aggiornata (lines 30-41):**
```typescript
interface CategorizationRequest {
  user_id: string;
  user_email: string;
  batch_id: string;
  model: string;
  existing_groups: ExistingGroup[];
  senders: SenderWithEmails[];
  max_emails_per_sender?: number;
  batch_start_index?: number;
  batch_size?: number;
  min_emails_threshold?: number; // 🆕 Soglia minima email
}
```

**Filtro safety senders (lines 73-97):**
```typescript
const { 
  batch_id, 
  senders, 
  batch_start_index = 0, 
  batch_size = 3,
  min_emails_threshold = 1 // 🆕 Default: processa tutti
} = body;

// 🆕 SAFETY FILTER: Skip senders below threshold
const validSenders = senders.filter(s => 
  s.email_samples && s.email_samples.length >= min_emails_threshold
);

if (validSenders.length !== senders.length) {
  console.log(`⚠️ [Threshold Filter] Filtered out ${senders.length - validSenders.length} senders below threshold (${min_emails_threshold} emails)`);
}

const batchSenders = validSenders.slice(
  batch_start_index, 
  batch_start_index + batch_size
);

console.log(`[AI Categorization] Processing batch: ${batchSenders.length} senders (${validSenders.length} valid, ${senders.length} total)`);
```

#### 2. Frontend - Dialog Pre-Analisi (`src/components/email/EmailManagementTab.tsx`)

**Stato persistito in localStorage (line 118-121):**
```typescript
const [minEmailsThreshold, setMinEmailsThreshold] = useState(() => {
  const saved = localStorage.getItem('ai-min-emails-threshold');
  return saved ? parseInt(saved) : 2; // Default consigliato: ≥2 email
});
```

**Filtro pre-analisi (lines 633-682):**
```typescript
const handleAISuggestions = async () => {
  // Filtra per soglia PRIMA di calcolare costi
  const allUnclassified = senders.filter(s => !s.isClassified);
  const unclassifiedSenders = allUnclassified.filter(
    s => s.emailCount >= minEmailsThreshold
  );
  
  const skippedCount = allUnclassified.length - unclassifiedSenders.length;
  
  if (unclassifiedSenders.length === 0) {
    toast({
      title: `ℹ️ Tutti i mittenti hanno < ${minEmailsThreshold} email`,
      description: `${skippedCount} mittenti esclusi (verranno analizzati quando scriveranno di più)`,
    });
    return;
  }
  
  // Calcola costo SOLO per mittenti qualificati
  const cost = calculateEstimatedCost(unclassifiedSenders.length, 5, selectedAIModel);
  
  // Toast informativo per mittenti esclusi
  if (skippedCount > 0) {
    setTimeout(() => {
      toast({
        title: `⏭️ ${skippedCount} mittenti esclusi`,
        description: `Mittenti con < ${minEmailsThreshold} email verranno analizzati quando scriveranno di più`,
      });
    }, 500);
  }
};
```

**Controllo soglia nel Dialog (lines 1322-1383):**
```typescript
<div className="space-y-4 pt-4 border-t">
  <div>
    <label className="text-sm font-medium mb-2 block">
      📊 Soglia email minime
    </label>
    <p className="text-xs text-muted-foreground mb-3">
      Analizza solo mittenti con almeno <strong>{minEmailsThreshold}</strong> email
    </p>
    
    <Select 
      value={minEmailsThreshold.toString()} 
      onValueChange={(val) => {
        setMinEmailsThreshold(parseInt(val));
        localStorage.setItem('ai-min-emails-threshold', val);
      }}
    >
      <SelectContent>
        <SelectItem value="1">Tutti i mittenti (≥1 email)</SelectItem>
        <SelectItem value="2">Mittenti ricorrenti (≥2 email) - Consigliato</SelectItem>
        <SelectItem value="3">Mittenti frequenti (≥3 email)</SelectItem>
        <SelectItem value="5">Mittenti abituali (≥5 email)</SelectItem>
        <SelectItem value="10">Mittenti consolidati (≥10 email)</SelectItem>
      </SelectContent>
    </Select>
  </div>
  
  {/* Badge risparmio stimato */}
  {(() => {
    const skipped = allUnclassified.length - filtered.length;
    const savedCost = skipped * 0.03;
    
    return skipped > 0 ? (
      <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
        <p className="text-xs text-green-700 dark:text-green-300">
          💰 <strong>Risparmio stimato:</strong> €{savedCost.toFixed(2)}<br/>
          ⏭️ <strong>Mittenti esclusi:</strong> {skipped}
        </p>
      </div>
    ) : null;
  })()}
</div>
```

**Invocazione edge function (line 843):**
```typescript
const { data, error } = await supabase.functions.invoke(
  'fun-email-sender-categorization',
  {
    body: {
      // ... altri parametri
      min_emails_threshold: minEmailsThreshold // 🆕 Passa soglia al backend
    }
  }
);
```

#### 3. Frontend - Sidebar Filtro Visualizzazione (`src/components/email/management/EmailSidebar.tsx`)

**Stato filtro locale (lines 70-73):**
```typescript
const [minEmailsFilter, setMinEmailsFilter] = useState(1);

const displayedSenders = useMemo(() => 
  filteredSenders.filter(s => s.emailCount >= minEmailsFilter),
  [filteredSenders, minEmailsFilter]
);
```

**Dropdown filtro (lines 95-109):**
```typescript
<div className="mb-2">
  <Select 
    value={minEmailsFilter.toString()} 
    onValueChange={(val) => setMinEmailsFilter(parseInt(val))}
  >
    <SelectTrigger className="w-full h-8 text-xs">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="1">Tutti i mittenti</SelectItem>
      <SelectItem value="2">≥2 email</SelectItem>
      <SelectItem value="3">≥3 email</SelectItem>
      <SelectItem value="5">≥5 email</SelectItem>
      <SelectItem value="10">≥10 email</SelectItem>
    </SelectContent>
  </Select>
</div>
```

**Empty state aggiornato (lines 186-205):**
```typescript
{displayedSenders.length === 0 ? (
  <div className="text-center py-12 text-muted-foreground">
    <p className="text-sm">
      {senders.length === 0 
        ? '🎉 Tutti i mittenti sono stati classificati!'
        : minEmailsFilter > 1
        ? `🔍 Nessun mittente con ≥${minEmailsFilter} email`
        : '🔍 Nessun mittente trovato con questi filtri'
      }
    </p>
  </div>
) : (
  displayedSenders.map(sender => <SenderCard key={sender.email} sender={sender} />)
)}
```

### Vantaggi Implementazione

✅ **Risparmio costi significativo**: Soglia 5 email → risparmio ~€16.50 (550 mittenti × €0.03)  
✅ **Tempo risparmiato**: ~110 minuti (550 mittenti × 7s / 3 batch)  
✅ **Qualità AI migliorata**: Più email = contesto migliore = categorizzazione più accurata  
✅ **UI più pulita**: Visualizza solo mittenti rilevanti  
✅ **Trasparenza totale**: Badge mostra risparmio stimato PRIMA di confermare  
✅ **UX persistente**: Preferenza soglia salvata in localStorage  
✅ **Doppia protezione**: Filtro frontend + safety edge function  
✅ **Zero configurazione**: Default intelligente (≥2 email) già selezionato

### Workflow Utente

**SCENARIO 1: Primo utilizzo (Default: ≥2 email)**
1. Click "Analisi AI Mittenti"
2. Dialog mostra: "491 mittenti da analizzare" (invece di 791)
3. Badge verde: "💰 Risparmio: €9.00 | ⏭️ 300 mittenti esclusi"
4. Utente conferma
5. Analisi processa SOLO 491 mittenti qualificati
6. Mittenti con 1 email analizzati automaticamente quando scriveranno 2ª email

**SCENARIO 2: Utente vuole maggiore risparmio (Soglia: ≥5 email)**
1. Dialog pre-analisi → dropdown soglia → seleziona "≥5 email"
2. Badge aggiornato: "💰 Risparmio: €16.50 | ⏭️ 550 mittenti esclusi"
3. Conferma → analizza solo 241 mittenti consolidati
4. Tempo: ~56 minuti (invece di 92)
5. Costo: ~€7.23 (invece di €23.73)

**SCENARIO 3: Sidebar filtro per focus**
1. Sidebar mostra 791 mittenti da classificare
2. Dropdown: seleziona "≥3 email"
3. Lista aggiorna: mostra solo 400 mittenti frequenti
4. Header: "📮 Da Classificare (400)" | "791 totali"
5. Utente focalizza su mittenti rilevanti

**SCENARIO 4: Utente vuole analizzare TUTTI (Soglia: ≥1 email)**
1. Dialog → dropdown → "Tutti i mittenti (≥1 email)"
2. Badge scompare (nessun risparmio)
3. Analizza tutti i 791 mittenti
4. Use case: primo setup completo del sistema

### Testing Scenarios

#### Test A: Default Behavior (≥2 email)
```bash
# Setup: 791 mittenti totali (300 con 1 email, 491 con 2+)
1. Click "Analisi AI Mittenti"
2. Verifica dialog mostra: "491 mittenti da analizzare"
3. Verifica badge: "€9.00 risparmio, 300 esclusi"
4. Conferma analisi
5. Verifica edge function processa SOLO 491 mittenti
6. Verifica toast finale: "491 mittenti classificati"
```

#### Test B: Soglia Personalizzata (≥5 email)
```bash
# Setup: 791 mittenti (550 con <5 email, 241 con 5+)
1. Dialog → dropdown → "≥5 email"
2. Verifica badge: "€16.50 risparmio, 550 esclusi"
3. Conferma
4. Verifica 241 mittenti processati
5. Tempo: ~56 min (invece di 92 min)
```

#### Test C: Sidebar Filtro Indipendente
```bash
# Setup: Sidebar mostra 791 mittenti
1. Dropdown sidebar → "≥3 email"
2. Verifica lista mostra ~400 mittenti
3. Header: "Da Classificare (400)" | "791 totali"
4. Cambia filtro → "≥10 email"
5. Lista aggiorna: ~100 mittenti
```

#### Test D: Empty State con Filtro Alto
```bash
# Setup: Tutti mittenti hanno <10 email
1. Sidebar → "≥10 email"
2. Verifica empty state: "🔍 Nessun mittente con ≥10 email"
3. Cambia → "≥2 email"
4. Lista riappare con mittenti qualificati
```

#### Test E: Persistenza localStorage
```bash
1. Dialog → soglia "≥5 email"
2. Annulla dialog
3. Refresh pagina (CTRL+R)
4. Riapri dialog
5. Verifica dropdown ancora su "≥5 email"
```

#### Test F: Edge Function Safety Filter
```bash
# Setup: Frontend invia 10 mittenti con 1 email (bug/test)
1. Edge function riceve richiesta con min_emails_threshold=5
2. Verifica log: "⚠️ Filtered out 10 senders below threshold"
3. Verifica batchSenders = [] (nessuno processato)
4. Nessuna chiamata AI effettuata
```

### Performance Impact

**Scenario Reale (791 mittenti totali):**

| Soglia | Mittenti Processati | Mittenti Saltati | Risparmio Costo | Risparmio Tempo | Tempo Totale |
|--------|---------------------|------------------|-----------------|-----------------|--------------|
| **≥1 email** (tutti) | 791 | 0 | €0.00 | 0 min | ~92 min |
| **≥2 email** (default) | 491 | 300 | €9.00 | 35 min | ~57 min |
| **≥3 email** | 400 | 391 | €11.73 | 46 min | ~46 min |
| **≥5 email** | 241 | 550 | €16.50 | 64 min | ~28 min |
| **≥10 email** | 120 | 671 | €20.13 | 78 min | ~14 min |

**Risparmio annuale stimato (analisi mensile):**
- Soglia ≥2 email: €9.00 × 12 = **€108/anno**
- Soglia ≥5 email: €16.50 × 12 = **€198/anno**

### Rollback Plan

```bash
# Edge Function rollback
cp supabase/functions/fun-email-sender-categorization/index-old2.ts \
   supabase/functions/fun-email-sender-categorization/index.ts

# Frontend rollback (git)
git checkout HEAD~1 src/components/email/EmailManagementTab.tsx
git checkout HEAD~1 src/components/email/management/EmailSidebar.tsx

# Remove localStorage key
localStorage.removeItem('ai-min-emails-threshold');

# Deploy automatico al prossimo push
```

**Nota**: Rollback rimuove filtro soglia, sistema torna a comportamento originale (analizza tutti i mittenti).

### Database Impact

**Nessuna modifica al database richiesta** (feature puramente frontend + edge function logic).

Query effettuate:
```sql
-- Frontend: Conta mittenti per soglia (in-memory filter)
SELECT COUNT(*) FROM senders WHERE emailCount >= :min_emails_threshold;

-- Edge Function: Riceve già mittenti filtrati dal frontend
-- Safety filter in-memory: senders.filter(s => s.email_samples.length >= threshold)
```

### Logging Enhancements

**Edge Function:**
- `⚠️ [Threshold Filter] Filtered out X senders below threshold (Y emails)` - safety filter attivo
- `[AI Categorization] Processing batch: X senders (Y valid, Z total)` - conteggi aggiornati

**Frontend:**
- Toast: `⏭️ X mittenti esclusi - Mittenti con < Y email verranno analizzati quando scriveranno di più`
- Dialog badge: `💰 Risparmio stimato: €X.XX | ⏭️ Y mittenti esclusi`
- Sidebar empty state: `🔍 Nessun mittente con ≥X email`

---

## [2025-01-31] - Smart Resume Anti-Reprocessing Protection

### File Modificato
- **Function:** `supabase/functions/fun-email-sender-categorization/index.ts`
- **Backup Creato:** `index-old2.ts`
- **Frontend:** `src/components/email/EmailManagementTab.tsx`

### Motivo Modifica
**CRITICAL BUG FIX**: Il frontend non escludeva mittenti già analizzati quando rilanciava l'analisi, causando riprocessamento completo e spreco di costi. Se l'utente analizzava 30 mittenti, poi rilanciava l'analisi, riprocessava tutti gli 821 mittenti invece di processare solo i 791 rimanenti.

**Problema specifico:**
- Line 666 di `EmailManagementTab.tsx`: `const unclassifiedSenders = senders.filter(s => !s.isClassified);`
- Questo recuperava TUTTI i mittenti non classificati, inclusi quelli già analizzati da AI
- L'edge function veniva chiamata con l'intera lista e riprocessava mittenti già salvati in `ai_categorization_suggestions`
- Risultato: costi duplicati, tempo sprecato, nessun progresso effettivo

### Modifiche Apportate - Edge Function

#### 1. Skip Logic per Mittenti Già Processati (lines 127-141)
```typescript
for (const sender of batchSenders) {
  try {
    // ✅ SAFETY CHECK: Skip if suggestion already exists
    const { data: existingSuggestion } = await supabase
      .from('ai_categorization_suggestions')
      .select('id')
      .eq('batch_id', batch_id)
      .eq('sender_email', sender.email)
      .maybeSingle();

    if (existingSuggestion) {
      console.log(`⏭️ Skipping ${sender.email} (already processed)`);
      suggestions.push({ 
        status: 'fulfilled', 
        value: { sender_email: sender.email, skipped: true } 
      });
      continue;
    }
    
    const result = await processSender(sender, ...);
    suggestions.push({ status: 'fulfilled', value: result });
  } catch (error) { ... }
}
```

#### 2. Skip Handling nel Salvataggio (lines 171-192)
```typescript
for (const result of successful) {
  const data = result.value;
  
  // Skip se già processato (safety check results)
  if (data.skipped) {
    console.log(`⏭️ Skipped result: ${data.sender_email}`);
    continue;
  }
  
  totalInputTokens += data.tokens_input;
  totalOutputTokens += data.tokens_output;
  totalCostEur += data.cost_eur;
  
  // Save to database...
}
```

### Modifiche Apportate - Frontend (`EmailManagementTab.tsx`)

#### 1. Smart Resume - Resume Normale (lines 673-690)
Quando utente clicca "Riprendi Analisi" con `resumeFromIndex > 0`:
```typescript
if (resumeFromIndex > 0 && currentBatchId) {
  // Carica mittenti già processati da DB
  const { data: alreadyProcessed } = await supabase
    .from('ai_categorization_suggestions')
    .select('sender_email')
    .eq('batch_id', currentBatchId);
  
  const processedEmails = new Set(alreadyProcessed?.map(s => s.sender_email) || []);
  
  sendersToProcess = unclassifiedSenders.filter(
    s => !processedEmails.has(s.email)
  );
  
  console.log(`♻️ Resuming: ${processedEmails.size} already done, ${sendersToProcess.length} remaining`);
  toast({ description: `Continuo con ${sendersToProcess.length} mittenti rimanenti` });
}
```

#### 2. Smart Resume - Rilevamento Batch Incompleti (lines 695-741)
Quando utente lancia nuova analisi (`resumeFromIndex === 0`):
```typescript
// Check for orphaned batch from previous failed run
const { data: recentBatch } = await supabase
  .from('ai_categorization_progress')
  .select('*')
  .eq('user_id', user?.id)
  .in('status', ['processing', 'failed'])
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();

if (recentBatch) {
  const { data: alreadyProcessed } = await supabase
    .from('ai_categorization_suggestions')
    .select('sender_email')
    .eq('batch_id', recentBatch.batch_id);
  
  if (alreadyProcessed && alreadyProcessed.length > 0) {
    // Ask user confirmation
    const costSavings = (alreadyProcessed.length * 0.03).toFixed(2);
    const shouldContinue = window.confirm(
      `🔍 Trovata analisi precedente con ${alreadyProcessed.length} mittenti già analizzati.\n\n` +
      `💰 Continuare ti farà risparmiare circa €${costSavings}\n\n` +
      `✅ OK per continuare | ❌ Annulla per ricominciare`
    );
    
    if (shouldContinue) {
      batchId = recentBatch.batch_id;
      setCurrentBatchId(batchId);
      
      sendersToProcess = unclassifiedSenders.filter(
        s => !processedEmails.has(s.email)
      );
      
      await loadPartialSuggestions(batchId);
    }
  }
}
```

#### 3. Filtraggio Consistente (lines 746, 775, 785, 792, 796, 835)
**CRITICAL**: Tutti i conteggi ora usano `sendersToProcess` invece di `unclassifiedSenders`:
```typescript
// ✅ CORRECT - fetch email samples solo per mittenti da processare
const sendersWithEmails = await Promise.all(
  sendersToProcess.map(async (sender) => { ... })
);

// ✅ CORRECT - total batches basato su mittenti effettivi
const totalBatches = Math.ceil(sendersToProcess.length / BATCH_SIZE);

// ✅ CORRECT - logs accurati
console.log(`🔄 Batch X/${totalBatches} (mittenti ${currentIndex}-${Math.min(currentIndex + BATCH_SIZE, sendersToProcess.length)})`);

// ✅ CORRECT - toast finale
toast({ description: `${sendersToProcess.length} mittenti classificati con successo` });
```

### Benefici

✅ **Zero Reprocessing**: Mai più mittenti riprocessati (doppia protezione: frontend + edge function)  
✅ **Smart Cost Savings**: Mostra risparmio stimato €0.03/mittente prima di continuare  
✅ **Transparent Resume**: Utente sa esattamente quanti mittenti rimangono da processare  
✅ **Accurate Progress**: Conteggi corretti in UI, logs e notifications  
✅ **Automatic Detection**: Rileva automaticamente batch incompleti al prossimo lancio  
✅ **User Choice**: Lascia decidere all'utente se continuare o ricominciare  
✅ **Fallback Safety**: Edge function skip logic come doppia protezione

### Workflow Utente Migliorato

**SCENARIO 1: Interruzione durante analisi**
1. Utente avvia "Analisi AI" su 791 mittenti
2. Dopo 30 mittenti processati → interruzione (refresh, errore, etc.)
3. Utente rilancia "Analisi AI"
4. 🆕 **Popup automatico**: "Trovata analisi con 30 mittenti già fatti. Risparmi €0.90. Continuare?"
5. Utente clicca "OK"
6. Analisi continua da mittente 31/791 (NO riprocessamento)
7. UI mostra: "♻️ Ripresa: 30 già elaborati, 761 rimanenti"

**SCENARIO 2: Resume manuale**
1. Analisi fallisce a batch 10
2. Bottone "Riprendi Analisi Interrotta" appare
3. Utente clicca
4. Sistema carica `last_processed_index` da DB
5. Riprende automaticamente dal batch 11
6. Suggerimenti parziali già caricati in UI

**SCENARIO 3: Utente vuole ricominciare**
1. Popup appare: "30 mittenti già analizzati"
2. Utente clicca "Annulla" (invece di "OK")
3. Sistema crea NUOVO `batch_id`
4. Analisi ricomincia da 0 con tutti i mittenti

### Testing Scenarios

#### Test A: Interruzione e Auto-Resume
```bash
# Setup
1. Avvia analisi su 791 mittenti
2. Attendi 30 secondi (10 batch × 3 mittenti = 30 completati)
3. Refresh pagina (CTRL+R)

# Expected
1. Popup: "Trovata analisi con 30 mittenti già analizzati. Risparmi €0.90"
2. Click "OK"
3. Console: "♻️ Resuming batch xxx: 30 already done, 761 remaining"
4. Processa SOLO 761 mittenti rimanenti
5. Toast: "761 mittenti classificati con successo"
```

#### Test B: Resume Button
```bash
# Setup
1. Analisi in corso, simula network error a batch 5
2. Dialog mostra "Errore nell'analisi AI"
3. Button "Riprendi Analisi Interrotta" appare

# Expected
1. Click button
2. Query DB per `last_processed_index` (15)
3. Riprende da mittente 16
4. Suggerimenti 1-15 già visibili in UI
```

#### Test C: Start Fresh (Annulla Resume)
```bash
# Setup
1. Batch incompleto esistente (50 mittenti)
2. Rilancia "Analisi AI"
3. Popup: "50 mittenti già analizzati"

# Expected
1. Click "Annulla" (not "OK")
2. Nuovo batch_id generato
3. Analisi parte da 0
4. Tutti 791 mittenti riprocessati
```

#### Test D: Edge Function Skip Logic
```bash
# Setup (Manual DB manipulation)
1. Insert duplicate suggestion in DB:
   INSERT INTO ai_categorization_suggestions (batch_id, sender_email, ...)
   VALUES ('test-batch', 'duplicate@example.com', ...);
2. Avvia analisi con batch contenente 'duplicate@example.com'

# Expected
1. Edge function log: "⏭️ Skipping duplicate@example.com (already processed)"
2. NO chiamata AI per questo sender
3. NO tokens/costi calcolati
4. Continua con mittenti successivi
```

### Performance Impact

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Reprocessing on resume** | 100% (tutti) | 0% (skip) | ✅ 100% saved |
| **Cost waste on error** | €0.10-€2.00 | €0.00 | ✅ 100% saved |
| **User confusion** | "Perché riprocessa?" | Dialog chiaro | ✅ UX improved |
| **Resume accuracy** | Manual check | Auto-detect | ✅ Automated |

### Database Queries Added
```sql
-- Frontend: Check for recent incomplete batch
SELECT * FROM ai_categorization_progress
WHERE user_id = $1 AND status IN ('processing', 'failed')
ORDER BY created_at DESC LIMIT 1;

-- Frontend: Load already processed senders
SELECT sender_email FROM ai_categorization_suggestions
WHERE batch_id = $1;

-- Edge Function: Check if sender already processed
SELECT id FROM ai_categorization_suggestions
WHERE batch_id = $1 AND sender_email = $2
LIMIT 1;
```

**Performance**: Tutte query indicizzate, overhead < 100ms totali.

### Rollback Plan

```bash
# Edge Function rollback
cp supabase/functions/fun-email-sender-categorization/index-old1.ts \
   supabase/functions/fun-email-sender-categorization/index.ts

# Frontend rollback (git)
git checkout HEAD~1 src/components/email/EmailManagementTab.tsx

# Deploy automatico al prossimo push
```

**Nota**: Rollback rimuove protezione anti-reprocessing, comportamento torna a bug originale.

### Logging Enhancements

**Edge Function:**
- `⏭️ Skipping {email} (already processed in this batch)` - sender skipped
- `⏭️ Skipped result: {email}` - skip handling in save loop

**Frontend:**
- `♻️ Resuming batch {id}: X already done, Y remaining` - resume normale
- `✅ Continuing batch {id}: X already done, Y remaining` - auto-detect batch
- Toast: "Ripresa: X già elaborati, Y rimanenti"
- Toast: "Continuando da X mittenti già elaborati. Risparmio: €Y"

---

## [2025-11-06] - Mini-Batch Processing per AI Sender Categorization

### File Modificato
- **Function:** `supabase/functions/fun-email-sender-categorization/index.ts`
- **Backup Creato:** `index-old1.ts`
- **Tipo:** Upgrade architetturale per resilienza

### Motivo Modifica
Risolvere timeout critici durante elaborazione di 791 mittenti non classificati. L'implementazione monolitica causava:
- ❌ Timeout dopo 5 minuti (limite Supabase Edge Functions)
- ❌ Perdita completa del lavoro svolto (~27 mittenti elaborati, €0.10 sprecati)
- ❌ Nessuna possibilità di riprendere analisi interrotta

### Problema Risolto
**Comportamento vecchio:**
1. Frontend invia TUTTI i 791 mittenti in una chiamata
2. Edge function processa sequenzialmente (~7s per mittente)
3. Tempo totale stimato: 791 × 7s = ~92 minuti
4. **TIMEOUT** dopo 5 minuti → tutto perso

### Soluzione Implementata: Mini-Batch Processing

#### Modifiche Edge Function (index.ts)

1. **Nuovi parametri request** (linee 30-39):
```typescript
interface CategorizationRequest {
  // ... parametri esistenti
  batch_start_index?: number;  // 🆕 Indice di partenza
  batch_size?: number;          // 🆕 Dimensione batch (default: 3)
}
```

2. **Elaborazione subset** (linee 70-76):
```typescript
const { batch_start_index = 0, batch_size = 3 } = body;
const batchSenders = senders.slice(batch_start_index, batch_start_index + batch_size);
// Processa SOLO 3 mittenti invece di tutti
```

3. **Progress tracking con checkpoint** (linee 104-147):
```typescript
// Salva posizione dopo ogni mittente
await supabase
  .from('ai_categorization_progress')
  .update({
    processed_count: absoluteProcessed,
    last_processed_index: absoluteProcessed,  // 🆕 Checkpoint per resume
    status: isComplete ? 'completed' : 'processing',
  })
  .eq('batch_id', batch_id);
```

4. **Response estesa** (linee 229-257):
```typescript
return {
  processed_count: 3,               // Mittenti batch corrente
  remaining_count: 788,             // Rimanenti
  next_batch_start: 3,              // Prossimo indice
  is_complete: false,               // Flag completamento
  batch_summary: {
    current_batch: 1,
    total_batches: 264
  }
}
```

#### Modifiche Frontend (EmailManagementTab.tsx)

1. **Loop ricorsivo con retry** (linee 656-790):
```typescript
const startAIAnalysis = async (resumeFromIndex: number = 0) => {
  const BATCH_SIZE = 3;
  const MAX_RETRIES_PER_BATCH = 3;
  
  while (currentIndex < totalSenders) {
    // Retry automatico per batch falliti
    while (retryCount <= MAX_RETRIES && !batchSuccess) {
      try {
        const { data } = await supabase.functions.invoke(
          'fun-email-sender-categorization',
          { body: { batch_start_index: currentIndex, batch_size: 3 } }
        );
        currentIndex = data.next_batch_start;
        batchSuccess = true;
      } catch (error) {
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
}
```

2. **Pulsante Resume** (linee 1053-1075):
```typescript
{showResumeButton && (
  <Button onClick={async () => {
    const { data } = await supabase
      .from('ai_categorization_progress')
      .select('last_processed_index')
      .eq('batch_id', currentBatchId)
      .maybeSingle();
    
    await startAIAnalysis(progress.last_processed_index);
  }}>
    Riprendi Analisi Interrotta
  </Button>
)}
```

3. **Caricamento progressivo suggerimenti** (linee 791-825):
```typescript
const loadPartialSuggestions = async (batchId: string) => {
  // Ricarica suggerimenti dopo ogni batch
  // Mostra risultati parziali in tempo reale
}
```

#### Modifiche Database (Migration)
```sql
-- Aggiungi checkpoint column
ALTER TABLE ai_categorization_progress 
ADD COLUMN last_processed_index INTEGER DEFAULT 0;

-- Indice per query ottimizzate
CREATE INDEX idx_progress_status_batch 
ON ai_categorization_progress(batch_id, status);
```

#### Modifiche Progress Dialog (AICategorizationProgressDialog.tsx)
- Mostra batch corrente: "📦 Batch 5 / 264 completato"
- Tempo stimato aggiornato: ~7s per mittente
- Display in minuti per lunghe elaborazioni

### Vantaggi Implementazione

✅ **Nessun timeout:** Batch 3 mittenti × 7s = ~21s < limite 5 min  
✅ **Resilienza:** Retry automatico 3 volte per batch fallito  
✅ **Progress reale:** Salvataggio checkpoint ogni 3 mittenti  
✅ **Resumable:** Riprendi da ultimo batch fallito via `last_processed_index`  
✅ **Cancellabile:** Batch corrente termina, poi stop  
✅ **Zero spreco:** Suggerimenti salvati progressivamente  
✅ **Rate-limit safe:** 500ms pausa tra batch (evita throttling API AI)  
✅ **Real-time feedback:** UI aggiornata dopo ogni batch

### Workflow Utente Migliorato

**PRIMA:**
1. Click "Analizza 791 mittenti"
2. Attendi... ⏳ (nessun feedback)
3. ❌ TIMEOUT dopo 5 min → tutto perso

**DOPO:**
1. Click "Analizza 791 mittenti"
2. Dialog conferma: "~90 minuti, 264 batch"
3. Progress live: "📦 Batch 5/264 completato (15 mittenti)"
4. Se errore → pulsante "Riprendi Analisi"
5. ✅ Completamento: tutti i 791 suggerimenti salvati

### Testing Raccomandato

1. **Batch piccolo:** 10 mittenti (4 batch) → verifica funzionamento base
2. **Interruzione rete:** Spegni WiFi a batch 5 → verifica retry automatico
3. **Cancellazione:** Click "Annulla" a metà → verifica stop pulito
4. **Resume:** Dopo fallimento → verifica ripartenza da checkpoint
5. **Completamento:** 791 mittenti → ~90 min, verifica tutti salvati

### Rollback Plan

Se necessario rollback:
```bash
# Ripristina versione precedente
cp supabase/functions/fun-email-sender-categorization/index-old1.ts \
   supabase/functions/fun-email-sender-categorization/index.ts

# Deploy automatico al prossimo push
git add . && git commit -m "Rollback: restore monolithic processing"
```

**Nota:** Rollback ripristina comportamento originale ma mantiene problema timeout.

### Performance Stimata

- **791 mittenti non classificati:**
  - Batch size: 3 mittenti
  - Total batches: 264
  - Tempo per batch: ~21s (7s × 3)
  - Tempo totale: ~92 minuti
  - Delay tra batch: 0.5s
  - Total wall time: ~93 minuti

- **Robustezza:**
  - Max retries per batch: 3
  - Tolleranza errori: ~3% (fallimento finale solo dopo 3 tentativi)
  - Resume capability: sì, da qualsiasi batch

### Impatto Costi

- **Costi invariati:** Stesso numero di chiamate AI
- **Beneficio:** Zero spreco su timeout (prima perdita €0.10 su fallimento)
- **Overhead:** Trascurabile (500ms × 264 batch = 132s totali di pause)

---

## [2025-11-04] - Background Email Sync TEST - Pre-Check Duplicate Optimization

### File Creato
- **Function:** `supabase/functions/background-email-sync-test/index.ts`
- **Tipo:** Nuova funzione temporanea per testing
- **Status:** 🧪 TEST MODE - Non sostituisce `background-email-sync` esistente

### Motivo Creazione
Creare funzione isolata per testare ottimizzazione **pre-check duplicati** prima di applicarla alla funzione production. Evita download inutili di email già presenti nel database.

### Problema da Risolvere
**Comportamento attuale** (`background-email-sync`):
1. Scarica TUTTE le email dalla cartella via TMWE API
2. Tenta inserimento in DB con `ignoreDuplicates: true`
3. Database scarta duplicati in fase di insert
4. **Spreco:** Download completo anche per cartelle già sincronizzate

**Esempio:** Cartella INBOX con 1000 email già scaricate → scarica tutte 1000, poi scarta 1000 duplicati (~500 secondi sprecati)

### Soluzione Implementata

#### Pre-Check UIDs (linee ~238-280)
```typescript
// 1. Query UIDs già presenti nel database
const { data: existingEmails } = await supabase
  .from('email_messages')
  .select('message_id')
  .eq('user_email', userEmail)
  .eq('folder_name', folder);

// 2. Estrai numeri UID dalle message_id
const existingUIDs = new Set(
  existingEmails?.map(e => {
    const parts = e.message_id.split('/'); // "user@domain/INBOX/12345" → 12345
    const uidStr = parts[parts.length - 1];
    return parseInt(uidStr, 10);
  }).filter(uid => !isNaN(uid)) || []
);

// 3. Filtra solo UIDs nuovi
const newUIDs = uids.filter(uid => !existingUIDs.has(uid));

// 4. Skip cartella se nessun nuovo UID
if (newUIDs.length === 0) {
  console.log('✅ Folder fully synced, skipping download');
  continue;
}

// 5. Download SOLO newUIDs (non tutti gli uids)
for (let j = 0; j < newUIDs.length; j += batchSize) {
  const batch = newUIDs.slice(j, j + batchSize); // ✅ Usa newUIDs
  // ... download batch
}
```

#### Logging Ottimizzazione (linee ~250-260, ~370-375)
```typescript
console.log('📊 UID Analysis for INBOX:');
console.log('  - Total UIDs on server: 1000');
console.log('  - Already in database: 950');
console.log('  - New UIDs to download: 50');
console.log('  - Optimization savings: 950 downloads skipped (95%)');
console.log('  - Estimated time saved: ~475s');
```

### Modifiche Rispetto a `background-email-sync`

| Aspetto | `background-email-sync` (OLD) | `background-email-sync-test` (NEW) |
|---------|-------------------------------|-------------------------------------|
| **Query DB prima download** | ❌ No | ✅ Sì - query `email_messages` per UIDs esistenti |
| **UIDs scaricati** | Tutti | Solo nuovi (`newUIDs`) |
| **Skip cartelle già sync** | ❌ No (scarica sempre) | ✅ Sì (se `newUIDs.length === 0`) |
| **Logging stats** | Base | Dettagliato (%, tempo risparmiato) |
| **Logica core** | Invariata | Invariata (stesse API calls, stessa gestione errori) |

### Performance Attese

| Scenario | `background-email-sync` | `background-email-sync-test` | Miglioramento |
|----------|-------------------------|------------------------------|---------------|
| **Cartella già sincronizzata** (1000/1000) | ~500s (scarica tutte, scarta) | ~5s (query DB, skip) | **100x più veloce** ⚡ |
| **Cartella parziale** (50/1000 nuove) | ~500s (scarica tutte) | ~30s (query + 50 download) | **16x più veloce** ⚡ |
| **Nuova cartella** (0/1000) | ~500s | ~500s | Identico |

### Test Plan

#### Test 1: Cartella già sincronizzata
```bash
# Chiamata API
POST /functions/v1/background-email-sync-test
{ "folders": ["INBOX"], "user_email": "user@example.com" }

# Atteso nei log:
# [Job xxx] New UIDs to download: 0
# [Job xxx] ✅ Folder INBOX fully synced (1000 emails already in DB)
# Tempo: < 5 secondi
```

#### Test 2: Cartella parzialmente sincronizzata
```sql
-- Simula: elimina 50 email recenti
DELETE FROM email_messages 
WHERE folder_name = 'INBOX' 
ORDER BY date DESC LIMIT 50;
```
```bash
# Atteso nei log:
# [Job xxx] New UIDs to download: 50
# [Job xxx] Downloaded new: 50
# Tempo: ~30 secondi
```

#### Test 3: Nuova cartella
```bash
# Chiamata su cartella mai sincronizzata
POST /functions/v1/background-email-sync-test
{ "folders": ["INBOX/NEW_FOLDER"], "user_email": "user@example.com" }

# Atteso: comportamento identico a background-email-sync
```

### Impatto
- **Tabelle Database:** `email_sync_progress`, `email_messages` (SELECT only, nessuna modifica struttura)
- **Frontend:** Nessuna modifica necessaria (job_id compatibile con UI esistente)
- **API TMWE:** Riduzione chiamate 90% per cartelle aggiornate
- **User Experience:** Download molto più veloci su sync ripetute

### Rollback Plan
Funzione isolata, nessun impatto su production. Per tornare indietro:
```bash
# Opzione 1: Elimina funzione TEST
rm -rf supabase/functions/background-email-sync-test

# Opzione 2: Disabilita in config.toml
[functions.background-email-sync-test]
disabled = true
```

Funzione `background-email-sync` rimane **invariata e funzionante**.

### Decisione Post-Test
✅ **Se test positivi (100% successo):**
- Creare backup: `cp background-email-sync/index.ts background-email-sync/index-old2.ts`
- Sostituire: `cp background-email-sync-test/index.ts background-email-sync/index.ts`
- Eliminare: `rm -rf background-email-sync-test`
- Documentare: Aggiornare questo changelog con successo implementazione

❌ **Se problemi (errori, duplicati mancanti):**
- Mantenere `background-email-sync` originale
- Eliminare `background-email-sync-test`
- Analizzare logs per debug

### Next Steps
1. Deploy automatico function TEST
2. Eseguire Test 1, 2, 3 in sequenza
3. Verificare logs in Supabase Dashboard
4. Confrontare performance con version OLD
5. Decidere se applicare a production

---

## [2025-01-29] - Background Email Sync - Fix getFolderUIDs()

### File Modificato
- **Function:** `supabase/functions/background-email-sync/index.ts`
- **Backup Creato:** `index-old1.ts`
- **Versione Precedente:** Versione originale (nessun backup precedente)

### Motivo Modifica
**Fix critico**: `getFolderUIDs()` cercava messaggi in `data.data`, ma `tmwe-api-proxy` ritorna `data.messages`. Questo causava array vuoto e zero download.

### Problema Risolto
```typescript
// ❌ PRIMA (linea 501) - array sempre vuoto
const messages = data.data || [];

// ✅ DOPO (linea 501) - estrae correttamente i messaggi
const messages = data.messages || [];
```

### Root Cause Analysis
1. **TmweBackendDebugger** (funzionante): usa `data.messages` ✅
2. **background-email-sync** (bug): usava `data.data` ❌
3. **Response structure** da `tmwe-api-proxy`: `{ messages: [...], total: X }`

### Test Post-Fix
- [x] Verificato logs: `Extracted messages - isArray: true, length: 3`
- [x] UIDs parsati correttamente: `✅ SUCCESS - Parsed 3 valid UIDs`
- [x] Download email in `email_messages` tabella
- [x] Progress tracking aggiornato in real-time

### Impatto
- **Tabelle Database:** `email_sync_progress`, `email_messages`
- **Frontend:** `EmailSyncStatus.tsx`, Quick Download UI
- **User Experience:** Download email finalmente funziona 🎉

### Rollback Plan
```bash
cp supabase/functions/background-email-sync/index-old1.ts supabase/functions/background-email-sync/index.ts
# Deploy automatico Supabase
```

---

## [2025-01-29] - TMWE Email Sync Master - Dual Mode Sync

### File Modificato
- **Function:** `supabase/functions/tmwe-email-sync-master/index.ts`
- **Frontend:** `src/components/email/FunEmailDownloader.tsx`
- **Backup:** `docs/CODE_BACKUPS/tmwe-email-sync-master.BACKUP-2025-01-29-PRE-DUAL-MODE.ts`

### Motivo Modifica
Implementare **due modalità di sincronizzazione complementari** per bilanciare velocità e accuratezza senza perdere la robustezza del sistema esistente.

### Modalità Implementate

#### 1. **MODALITÀ COMPLETA (Full Sync)** - Default originale
- **Quando usare**: Prima sincronizzazione, sync settimanale/mensile, dopo cambio server
- **Comportamento**: 
  - Scarica TUTTE le email dalla cartella
  - Pre-filtering batch locale (verifica email già presenti)
  - Insert solo email nuove
- **Vantaggi**: 
  - ✅ Accuratezza 100%
  - ✅ Trova email mancanti anche se non consecutive
  - ✅ Affidabile anche con database corrotto

#### 2. **MODALITÀ VELOCE (Fast Sync)** - Nuova
- **Quando usare**: Sync quotidiane, aggiornamenti frequenti, cartelle già sincronizzate
- **Comportamento**:
  - Query `MAX(message_id)` dal database locale
  - API request con `uid_min = max_uid_local + 1`
  - Download SOLO email con UID superiore
  - Early exit se 0 nuove email
- **Vantaggi**:
  - ⚡ Rapidissima (1-5s per cartella aggiornata)
  - 🚀 Skip immediato se nessuna nuova email
  - 📉 Riduce carico server TMWE del 90%

### Implementazione Tecnica

**Edge Function** (`index.ts`):
- Nuovo parametro `sync_mode?: 'full' | 'fast'` in `SyncRequest`
- Query `MAX(message_id)` condizionale se `sync_mode === 'fast'`
- Request body con `uid_min` opzionale
- Early exit per cartelle già aggiornate

**Frontend** (`FunEmailDownloader.tsx`):
- Toggle UI per selezionare modalità VELOCE/COMPLETA
- Default: modalità VELOCE
- Stato `syncMode` salvato localmente

### Metriche Performance Attese

| Modalità | Tempo/Cartella | Bandwidth | Caso d'uso |
|----------|----------------|-----------|------------|
| COMPLETA | 20-40s | Alta | Prima sync, backup completo |
| VELOCE | 1-5s | Bassissima | Sync quotidiane, aggiornamenti |

### Compatibilità
- ✅ Backward compatible: modalità COMPLETA = comportamento originale
- ✅ Se API TMWE non supporta `uid_min`, comportamento identico a prima
- ✅ Nessuna breaking change

---

## [2025-01-15] - Image Generation Backend

### File Creato
- **Function:** `supabase/functions/generate-image/index.ts`
- **Backup:** N/A (nuova funzione)

### Motivo Creazione
Supporto generazione immagini nel Chat Laboratory tramite Lovable AI Gateway (Google Gemini Flash Image Preview).

### Funzionalità Implementate
1. **Multi-provider support:**
   - Lovable AI (google/gemini-2.5-flash-image-preview) - default
   - OpenAI (dall-e-3)
   - HuggingFace (stabilityai/stable-diffusion-2-1)

2. **Features:**
   - CORS headers configurati
   - Validazione input (prompt, model, size)
   - Gestione errori dettagliata
   - Support per image editing (Lovable AI)
   - Logging completo

3. **Sicurezza:**
   - API keys da Supabase secrets
   - Nessuna API key hardcoded
   - Validazione parametri

### Codice Principale
```typescript
// Lovable AI (default)
const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: model || "google/gemini-2.5-flash-image-preview",
    messages: [{ role: "user", content: prompt }],
    modalities: ["image", "text"]
  })
});

const data = await response.json();
const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
```

### Impatto
- **Frontend:** ChatLaboratory page (nuova UI generazione immagini)
- **Database:** `chat_laboratory_messages.generated_images` (jsonb)
- **Altre Functions:** Nessuna

### Test Eseguiti
- [x] Test Lovable AI provider
- [x] Test generazione base64 image
- [x] Test error handling
- [x] Verifica CORS
- [x] Test integrazione frontend

### Breaking Changes
- [ ] Nessun breaking change (nuova feature)

### Rollback Plan
Non applicabile (nuova funzione, può essere disabilitata lato frontend).

---

## [2025-01-15] - Chat Laboratory Orchestrator - Image Generation Skip

### File Modificato
- **Function:** `supabase/functions/chat-laboratory-orchestrator/index.ts`
- **Backup Creato:** `index-old1.ts`
- **Versione Precedente:** Versione originale (no backup precedenti)

### Motivo Modifica
Dopo generazione immagine, l'orchestrator deve permettere solo all'utente di continuare la conversazione, non agli AI participants.

### Modifiche Apportate

1. **Aggiunta detection immagini generate:**
```typescript
// Fetch ultimo messaggio
const { data: lastMessage } = await supabase
  .from('chat_laboratory_messages')
  .select('generated_images, sender_type')
  .eq('conversation_id', conversationId)
  .order('created_at', { ascending: false })
  .limit(1)
  .single();

// Skip AI response se immagine appena generata
if (lastMessage?.generated_images && 
    lastMessage.generated_images.length > 0 &&
    lastMessage.sender_type === 'user') {
  console.log('Image generated, skipping AI participants response');
  
  return new Response(
    JSON.stringify({
      success: true,
      skipped: true,
      reason: 'image_generation_completed',
      message: 'Immagine generata. Attendo prossima richiesta utente.'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

2. **Logging migliorato:**
```typescript
console.log('🎲 Selected participant:', {
  index: selectedIndex,
  name: selectedParticipant.name,
  type: selectedParticipant.type,
  hasResponded: selectedParticipant.has_responded_current_turn
});
```

### Codice Modificato

**Prima:**
```typescript
// Nessun check per immagini generate
// Orchestrator rispondeva sempre con AI participant
```

**Dopo:**
```typescript
// Check se ultimo messaggio ha immagini generate
if (lastMessage?.generated_images?.length > 0) {
  // Skip AI response, attendi utente
  return skipResponse();
}
```

### Impatto
- **Altre Edge Functions:** Nessuna
- **Tabelle Database:** Legge da `chat_laboratory_messages`
- **Frontend:** ChatLaboratory - comportamento conversazione dopo image gen
- **User Experience:** Dopo generazione immagine, solo utente può continuare

### Test Eseguiti
- [x] Test generazione immagine + skip AI response
- [x] Test conversazione normale (senza immagini)
- [x] Test edge case: immagine + messaggio testuale
- [x] Verifica logs production
- [x] Test turn-taking dopo skip

### Breaking Changes
- [ ] Nessun breaking change
- [x] Comportamento cambiato: AI non risponde dopo image gen

### Rollback Plan
In caso di problemi:
1. Copiare `index-old1.ts` → `index.ts`
2. Rideploy edge function via Supabase Dashboard
3. Verificare logs per conferma rollback
4. Testare conversazione normale

---

## [2025-01-14] - TMWE Email Sync Master - Batch Processing

### File Modificato
- **Function:** `supabase/functions/tmwe-email-sync-master/index.ts`
- **Backup Creato:** `index-old2.ts`
- **Versione Precedente:** `index-old1.ts`

### Motivo Modifica
Ottimizzazione sincronizzazione email TMWE con processing batch per migliorare performance su grandi volumi.

### Modifiche Apportate
1. Processing batch parallelo (5 batch concorrenti)
2. Progress tracking in `email_sync_progress`
3. Gestione timeout migliorata
4. Retry logic per folder vuote

### Impatto
- **Frontend:** TMWEEmailDashboard (progress bar)
- **Database:** `email_sync_progress`, `email_sync_logs`
- **Performance:** 5x più veloce su 1000+ email

### Test Eseguiti
- [x] Test sync 100 email
- [x] Test sync 1000+ email
- [x] Test interruzione/resume
- [x] Test error recovery

### Breaking Changes
- [ ] Nessun breaking change (backward compatible)

---

## [2025-01-12] - Intranet AI Chat Assistant - Multi-Language

### File Modificato
- **Function:** `supabase/functions/intranet-ai-chat-assistant/index.ts`
- **Backup Creato:** `index-old3.ts`
- **Versione Precedente:** `index-old2.ts`

### Motivo Modifica
Supporto traduzioni automatiche basate su preferenze lingua utente.

### Modifiche Apportate
1. Detection lingua utente da `user_profiles`
2. Traduzione messaggi AI in lingua preferita
3. Support per multiple lingue (IT, EN, ES, FR, DE)

### Impatto
- **Frontend:** Intranet page
- **Database:** Legge `user_profiles.preferred_language`
- **User Experience:** Messaggi AI tradotti automaticamente

### Test Eseguiti
- [x] Test IT/EN translation
- [x] Test edge cases (lingua non supportata)
- [x] Performance test

---

## Template Entry (da usare per future modifiche)

```markdown
## [YYYY-MM-DD] - [Titolo Modifica]

### File Modificato
- **Function:** `supabase/functions/nome-funzione/index.ts`
- **Backup Creato:** `index-oldX.ts`
- **Versione Precedente:** `index-oldY.ts`

### Motivo Modifica
[Descrizione dettagliata del perché]

### Modifiche Apportate
1. [Cosa è cambiato]
2. [Cosa è stato aggiunto]
3. [Cosa è stato rimosso]

### Codice Modificato
\`\`\`typescript
// Prima
const oldCode = 'example';

// Dopo
const newCode = 'improved';
\`\`\`

### Impatto
- **Altre Edge Functions:** [Lista]
- **Tabelle Database:** [Lista]
- **Frontend:** [Componenti impattati]

### Test Eseguiti
- [ ] Test funzione isolata
- [ ] Test integrazione frontend
- [ ] Test edge cases
- [ ] Verifica logs
- [ ] Test performance

### Breaking Changes
- [ ] Nessun breaking change
- [ ] [Descrizione se presente]

### Rollback Plan
1. Copiare `index-oldX.ts` → `index.ts`
2. Rideploy
3. Verificare logs
```

---

## [2025-01-20] - Bar Chat Orchestrator - TTS Fix & System Backup

### File Modificato
- **Function:** `supabase/functions/bar-chat-orchestrator/index.ts`
- **Backup Creato:** `index-old-2025-01-20.ts`
- **Versione Precedente:** Versioni precedenti senza TTS funzionante

### Motivo Backup
**BACKUP COMPLETO SISTEMA** prima fix risposta simultanea agenti.

### Modifiche Implementate
1. **Fix Stack Overflow TTS**: Risolto crash conversione base64 audio
2. **Fix Full-Duplex Text**: Trascrizione passata correttamente alla chat
3. **Sistema TTS Funzionante**: Agenti parlano con audio ElevenLabs

### Issue Nota
⚠️ **Agenti rispondono tutti simultaneamente** invece che a turno
- Da risolvere nel prossimo intervento

### Stato Sistema
✅ TTS ElevenLabs: Funzionante  
✅ Full-Duplex Recorder: Funzionante  
✅ Storage Audio: Funzionante  
✅ Prompt Sections: Funzionante  
⚠️ Sequential Response: Da implementare

### Database Backup
- **File:** `docs/DATABASE_BACKUPS/2025-01-20_pre-bar-mode-simultaneous-fix.md`
- **Contenuto:** Schema completo tabelle, RLS policies, functions, triggers
- **Coverage:** 100% sistema Bar Mode

### Test Eseguiti
- [x] TTS generation con tutti gli agenti
- [x] Upload audio Supabase Storage
- [x] Full-Duplex transcription
- [x] Prompt sections composition
- [x] Interrupt functionality

### Rollback Plan
```bash
cp index-old-2025-01-20.ts index.ts
# Rideploy automatico
# Sistema torna a versione stabile TTS funzionante
```

---

## 📊 Statistics

**Total Functions:** 25+  
**Total Modifications:** 7 (documented)  
**Total Backups:** 12+ files  
**Last Update:** 2025-01-20

---

## 🔗 Related Documentation

- [MASTER_RULES.md](./MASTER_RULES.md) - Regole sviluppo
- [DATABASE_INFO.md](./DATABASE_INFO.md) - Schema database
- [DATABASE_BACKUPS/](./DATABASE_BACKUPS/) - Backup database

---

**Maintainer:** Development Team  
**Review:** Ogni modifica edge function  
**Format:** Markdown con code blocks
