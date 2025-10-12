# 🔑 API KEYS CONFIGURATION

**Data Snapshot**: 2025-10-12

---

## ✅ PROVIDER ATTIVI

### 1. **Anthropic Claude**
- **Modello**: `claude-sonnet-4-5`
- **Provider**: `anthropic`
- **Stato**: ✅ Attivo
- **Last Test**: 2025-10-10 18:55:38
- **Last Test Status**: `success`
- **API Key**: Configurata in `config_ai` table
- **Tipo**: Diretta (da `config_ai`)

**Utilizzo**:
- Chat Laboratory (modalità standard)
- Bar Chat (1 agente per turno)

**Configurazione**:
```sql
-- Verifica chiave in config_ai
SELECT provider, modello, attivo, last_test_status 
FROM config_ai 
WHERE provider = 'anthropic';
```

**Restore**:
```bash
# Se perdi la chiave, riconfigura manualmente
UPDATE config_ai 
SET api_key = 'sk-ant-api03-YOUR-KEY-HERE'
WHERE provider = 'anthropic';
```

---

### 2. **OpenAI GPT-5**
- **Modello**: `gpt-5-2025-08-07`
- **Provider**: `openai`
- **Stato**: ✅ Attivo
- **Last Test**: 2025-10-10 18:55:46
- **Last Test Status**: `success`
- **API Key**: Configurata in `config_ai` table
- **Tipo**: Diretta (da `config_ai`)

**Utilizzo**:
- Chat Laboratory (modalità standard)
- Chat normale (con CRM tools)
- Bar Chat (1 agente per turno)

**Configurazione**:
```sql
-- Verifica chiave in config_ai
SELECT provider, modello, attivo, last_test_status 
FROM config_ai 
WHERE provider = 'openai';
```

**Restore**:
```bash
# Se perdi la chiave, riconfigura manualmente
UPDATE config_ai 
SET api_key = 'sk-proj-YOUR-KEY-HERE'
WHERE provider = 'openai';
```

---

### 3. **Lovable AI (Gemini)**
- **Modello**: `google/gemini-2.5-flash`
- **Provider**: `lovable`
- **Stato**: ✅ Attivo
- **Last Test**: 2025-10-10 18:40:46
- **Last Test Status**: `success`
- **API Key**: Auto-fornito (da `LOVABLE_API_KEY` env)
- **Tipo**: Gateway Lovable AI

**Utilizzo**:
- Chat Laboratory (modalità standard)
- Chat normale
- Bar Chat (1 agente per turno)

**Configurazione**:
```bash
# La chiave è auto-gestita da Lovable
# Non serve configurazione manuale
# Già presente in Supabase secrets
```

**Restore**:
- Nessuna azione necessaria
- La chiave è auto-fornita da Lovable

---

## 🔐 SECRETS SUPABASE

### **Lista Secrets**

```bash
supabase secrets list
```

Output atteso:
```
LOVABLE_API_KEY (auto-fornito)
SUPABASE_URL (auto)
SUPABASE_SERVICE_ROLE_KEY (auto)
```

### **Configurazione Secrets**

Se necessario riconfigurare:

```bash
# OpenAI (se usi env invece di config_ai)
supabase secrets set OPENAI_API_KEY=sk-proj-YOUR-KEY

# Anthropic (se usi env invece di config_ai)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-YOUR-KEY

# LOVABLE_API_KEY è auto-fornito, NON modificare
```

---

## 📋 TABELLA config_ai

### **Struttura**

```sql
SELECT id, provider, modello, attivo, last_test_status, last_test_at 
FROM config_ai 
ORDER BY created_at;
```

### **Output Atteso (2025-10-12)**

| provider    | modello                   | attivo | last_test_status |
|-------------|---------------------------|--------|------------------|
| openai      | gpt-5-2025-08-07          | true   | success          |
| lovable     | google/gemini-2.5-flash   | true   | success          |
| anthropic   | claude-sonnet-4-5         | true   | success          |

---

## 🔄 RIPRISTINO CONFIGURAZIONE

### **STEP 1: Verifica Secrets**

```bash
# Lista secrets attuali
supabase secrets list

# Se manca LOVABLE_API_KEY, contatta supporto Lovable
# È auto-gestita e non può essere impostata manualmente
```

### **STEP 2: Ripristina config_ai**

Esegui lo script SQL:
```bash
psql -U postgres -d your_db < chat-top/database/config-data.sql
```

### **STEP 3: Sostituisci API Keys**

```sql
-- OpenAI
UPDATE config_ai 
SET api_key = 'sk-proj-YOUR-OPENAI-KEY'
WHERE provider = 'openai';

-- Anthropic
UPDATE config_ai 
SET api_key = 'sk-ant-api03-YOUR-ANTHROPIC-KEY'
WHERE provider = 'anthropic';

-- Lovable: NON modificare, usa 'auto'
```

### **STEP 4: Test Configurazione**

```sql
-- Marca come da testare
UPDATE config_ai 
SET last_test_status = NULL, 
    last_test_at = NULL;

-- Poi usa l'interfaccia per testare
```

---

## ⚠️ DIFFERENZA TRA FONTI API KEYS

### **Edge Functions Diverse Usano Fonti Diverse**

1. **`chat-laboratory-orchestrator`**:
   - Anthropic: `config_ai` table ✅
   - OpenAI: `config_ai` table ✅
   - Lovable: `LOVABLE_API_KEY` env ✅

2. **`bar-chat-orchestrator`**:
   - Anthropic: `ANTHROPIC_API_KEY` env
   - OpenAI: `OPENAI_API_KEY` env
   - Lovable: `LOVABLE_API_KEY` env

3. **`chat-with-ai`**:
   - Tutti: `config_ai` table

### **Raccomandazione**

Per massima flessibilità, configura **entrambi**:

```bash
# Secrets (per bar-chat-orchestrator)
supabase secrets set OPENAI_API_KEY=sk-proj-YOUR-KEY
supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-YOUR-KEY

# Database (per chat-laboratory-orchestrator e chat-with-ai)
UPDATE config_ai SET api_key = 'sk-proj-YOUR-KEY' WHERE provider = 'openai';
UPDATE config_ai SET api_key = 'sk-ant-api03-YOUR-KEY' WHERE provider = 'anthropic';
```

---

## 🧪 TESTING POST-RESTORE

### **Test 1: Verifica config_ai**

```sql
SELECT provider, modello, attivo 
FROM config_ai 
WHERE attivo = true;
```

Attesi: 3 record (openai, lovable, anthropic)

### **Test 2: Test Lovable AI**

```bash
# Chiamata test al gateway
curl -X POST https://ai.gateway.lovable.dev/v1/chat/completions \
  -H "Authorization: Bearer $LOVABLE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "google/gemini-2.5-flash",
    "messages": [{"role": "user", "content": "Ciao"}]
  }'
```

### **Test 3: Test Chat Laboratory**

1. Apri `/chat-laboratory`
2. Crea nuova conversazione
3. Attiva tutti e 3 gli agenti
4. Invia messaggio "Test sistema"
5. Verifica che tutti e 3 rispondano

---

## 📊 MONITORING

### **Log API Calls**

```bash
# Logs chat-laboratory-orchestrator
supabase functions logs chat-laboratory-orchestrator

# Logs bar-chat-orchestrator
supabase functions logs bar-chat-orchestrator

# Logs chat-with-ai
supabase functions logs chat-with-ai
```

### **Controlla Errori API**

```sql
-- Messaggi con errori
SELECT sender_name, content, created_at 
FROM chat_laboratory_messages 
WHERE content LIKE '%error%' 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 🔗 RIFERIMENTI

- **Anthropic Docs**: https://docs.anthropic.com/claude/reference/getting-started-with-the-api
- **OpenAI Docs**: https://platform.openai.com/docs/api-reference
- **Lovable AI Docs**: https://docs.lovable.dev/features/ai
- **Supabase Secrets**: https://supabase.com/docs/guides/functions/secrets

---

**Ultima modifica**: 2025-10-12
