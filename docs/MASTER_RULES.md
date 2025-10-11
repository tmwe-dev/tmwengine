# 🎯 MASTER RULES - Regole di Sviluppo

## 1. 🔑 Gestione API Keys

### ⚠️ Regola Fondamentale
**NON RICHIEDERE MAI API KEYS ALL'UTENTE**

Le API keys sono sempre configurate in:
- Tabella `config_ai` (per configurazioni AI multiple)
- Supabase Edge Function Secrets (per keys globali come `LOVABLE_API_KEY`)
- Tabella `user_tmwe_credentials` (per credenziali TMWE utente-specifiche)

### Procedura Corretta
1. **Verificare esistenza** in `config_ai`:
   ```sql
   SELECT * FROM config_ai WHERE attivo = true;
   ```
2. **Controllare Supabase Secrets** (nelle edge functions):
   ```typescript
   const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
   ```
3. **Se mancanti**, guidare l'utente a configurarle tramite UI esistente (`/ai-config`)
4. **Solo in casi eccezionali**, usare tool per aggiungere secret

### ❌ Mai Fare
- Chiedere API keys in chat
- Hardcodare API keys nel codice
- Salvare API keys in localStorage
- Esporre API keys nel frontend

---

## 2. 💾 Sistema di Backup Edge Functions

### Regola di Versioning Progressivo

**OGNI modifica a una Edge Function richiede backup numerato progressivo**

#### Struttura File:
```
supabase/functions/
  nome-funzione/
    ├── index.ts              (versione corrente in produzione)
    ├── index-old1.ts         (primo backup storico)
    ├── index-old2.ts         (secondo backup storico)
    ├── index-old3.ts         (terzo backup storico)
    └── index-old4.ts         (backup più recente prima ultima modifica)
```

#### Procedura Obbligatoria:
1. **Prima di modificare** `index.ts`:
   - Controllare numero progressivo più alto esistente (es. `-old3`)
   - Creare nuovo backup con numero successivo: `index-old4.ts`
   - Copiare contenuto **corrente** di `index.ts` → `index-old4.ts`
   
2. **Documentare nel changelog** (`docs/EDGE_FUNCTIONS_CHANGELOG.md`):
   - Data modifica
   - Motivo modifica
   - File backup creato (es. `index-old4.ts`)
   - Modifiche apportate
   
3. **⚠️ MAI sovrascrivere** i file `-old` esistenti
4. **⚠️ MAI eliminare** i file `-old` durante lo sviluppo

#### Esempio Workflow:
```bash
# Stato iniziale
chat-laboratory-orchestrator/
  ├── index.ts
  ├── index-old1.ts
  └── index-old2.ts

# STEP 1: Prima di modificare index.ts
# Creo nuovo backup progressivo
cp index.ts index-old3.ts

# STEP 2: Documento in EDGE_FUNCTIONS_CHANGELOG.md
# Data, motivo, file backup creato

# STEP 3: Ora posso modificare index.ts
# Modifico index.ts con nuove feature

# Stato finale
chat-laboratory-orchestrator/
  ├── index.ts          (nuova versione)
  ├── index-old1.ts     (backup storico 1)
  ├── index-old2.ts     (backup storico 2)
  └── index-old3.ts     (backup pre-modifica)
```

#### Quando Creare Backup
- ✅ Prima di modificare logica esistente
- ✅ Prima di aggiungere nuove feature
- ✅ Prima di refactoring importante
- ✅ Prima di modifiche a gestione errori o CORS
- ❌ NON serve per fix typo o commenti

---

## 3. 🗄️ Area di Protezione Database

### ⚠️ CRITICO: Backup Database Obbligatorio

**Lovable fa backup automatico del codice frontend, ma NON delle modifiche Supabase!**

Se perdiamo una migration SQL, perdiamo la struttura dati.

### Procedura Pre-Migration (OBBLIGATORIA)

Prima di OGNI modifica database:

#### Step 1: Documentare Schema Corrente
Creare file in `docs/DATABASE_BACKUPS/YYYY-MM-DD_pre-migration-[descrizione].md`:

```markdown
## Schema Pre-Migration: [Data]

### Obiettivo Modifica
[Cosa vogliamo fare]

### Tabelle Coinvolte
- `nome_tabella_1`
- `nome_tabella_2`

### DDL Corrente
\`\`\`sql
-- Schema tabella PRIMA della modifica
CREATE TABLE nome_tabella (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campo1 text NOT NULL,
  ...
);
\`\`\`

### Trigger Attivi
\`\`\`sql
-- Lista trigger correnti
CREATE TRIGGER update_timestamp
  BEFORE UPDATE ON nome_tabella
  ...
\`\`\`

### RLS Policies
\`\`\`sql
-- Policies correnti
CREATE POLICY "policy_name"
  ON nome_tabella
  ...
\`\`\`

### Database Functions Coinvolte
\`\`\`sql
-- Functions che potrebbero essere impattate
CREATE OR REPLACE FUNCTION function_name()
  ...
\`\`\`

### Dati di Esempio (se rilevanti)
\`\`\`sql
-- Snapshot dati importanti
SELECT * FROM nome_tabella LIMIT 5;
\`\`\`
```

#### Step 2: Eseguire Migration
**Solo dopo** aver salvato il backup completo

#### Step 3: Documentare Modifiche
Aggiornare `docs/DATABASE_INFO.md` con:
- Cosa è cambiato
- Perché è cambiato
- Link al backup pre-modifica
- Data modifica

### Tabelle da Proteggere (Priorità Alta)

Particolare attenzione e backup obbligatorio per:

#### Sistema AI e Chat
- `config_ai` - Configurazioni AI providers
- `chat_laboratory_conversations` - Conversazioni laboratorio
- `chat_laboratory_messages` - Messaggi laboratorio
- `chat_laboratory_participants` - Partecipanti AI
- `chat_laboratory_system_prompts` - Prompt di sistema
- `chat_conversations` - Conversazioni chat standard
- `chat_messages` - Messaggi chat standard
- `chat_system_prompts` - Prompt sistema chat

#### Sistema Utenti e Ruoli
- `user_roles` - **CRITICO** - Ruoli utenti
- `user_profiles` - Profili utente
- `user_tmwe_credentials` - Credenziali TMWE

#### Sistema Intranet
- `intranet_rooms` - Stanze chat
- `intranet_messages` - Messaggi intranet
- `intranet_room_members` - Membri stanze
- `intranet_room_access_requests` - Richieste accesso
- `intranet_room_ai_prompts` - Prompt AI per stanze
- `intranet_global_ai_prompt` - Prompt AI globale

#### Sistema Email
- `email_messages` - Messaggi email
- `email_provider` - Configurazioni provider
- `email_provider_credenziali` - Credenziali email
- `email_sync_logs` - Log sincronizzazioni

#### CRM e Contatti
- `rubrica` - Contatti principali
- `attivita` - Attività CRM
- `imported_contacts` - Contatti importati
- `import_logs` - Log importazioni

---

## 4. 📊 Documentazione Database

### File: `docs/DATABASE_INFO.md`

**Deve essere sempre aggiornato** dopo ogni modifica database.

Struttura obbligatoria per ogni tabella:

```markdown
### nome_tabella

**Purpose:** [Scopo della tabella]

**Columns:**
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| campo1 | text | NO | - | [Descrizione] |

**Relationships:**
- FK to `altra_tabella.id`

**RLS Policies:**
- `policy_name`: [Descrizione policy]

**Indexes:**
- `idx_campo1` on `campo1`

**Triggers:**
- `trigger_name`: [Scopo trigger]

**Last Modified:** YYYY-MM-DD
**Change:** [Descrizione ultima modifica]
**Backup:** [Link a docs/DATABASE_BACKUPS/YYYY-MM-DD_...]
```

### Changelog Database

In fondo a `DATABASE_INFO.md`, mantenere changelog:

```markdown
## 📝 Database Changelog

### 2025-01-XX: [Titolo Modifica]
- **Tabelle modificate:** `tabella1`, `tabella2`
- **Tipo modifica:** ADD COLUMN / ALTER TABLE / CREATE FUNCTION / etc.
- **Motivo:** [Perché abbiamo fatto questa modifica]
- **Backup:** `docs/DATABASE_BACKUPS/2025-01-XX_pre-migration.md`
- **Impatto:** [Quali parti del sistema sono impattate]
```

---

## 5. 🔐 Sicurezza e RLS Policies

### ⚠️ Regole di Sicurezza Critiche

#### 1. Gestione Ruoli Utente

**✅ CORRETTO:**
```sql
-- Ruoli in tabella separata
CREATE TYPE app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Function SECURITY DEFINER per evitare recursione RLS
CREATE OR REPLACE FUNCTION has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Policy usando la function
CREATE POLICY "Admins can update"
ON some_table
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));
```

**❌ SBAGLIATO:**
```sql
-- MAI memorizzare ruoli su user_profiles o auth.users
ALTER TABLE user_profiles ADD COLUMN role text;  -- ❌ NO!

-- MAI usare RLS diretto su user_profiles (causa recursione)
CREATE POLICY "wrong_policy"
ON some_table
USING (
  (SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'admin'
);  -- ❌ Causa recursione RLS!
```

#### 2. Validazione Admin

**✅ CORRETTO:**
```typescript
// Server-side validation (Edge Function)
const { data: { user } } = await supabase.auth.getUser();
const { data: isAdmin } = await supabase
  .rpc('has_role', { _user_id: user.id, _role: 'admin' });

if (!isAdmin) {
  return new Response('Unauthorized', { status: 403 });
}
```

**❌ SBAGLIATO:**
```typescript
// MAI validare admin client-side
const isAdmin = localStorage.getItem('isAdmin');  // ❌ Manipolabile!
const isAdmin = user.user_metadata.role === 'admin';  // ❌ Manipolabile!
```

#### 3. API Keys e Secrets

**✅ CORRETTO:**
```typescript
// Edge Function
const API_KEY = Deno.env.get('LOVABLE_API_KEY');
if (!API_KEY) {
  throw new Error('Missing API key');
}
```

**❌ SBAGLIATO:**
```typescript
const API_KEY = 'sk-1234567890';  // ❌ Hardcoded!
const API_KEY = import.meta.env.VITE_API_KEY;  // ❌ Esposto client-side!
```

---

## 6. 📝 Changelog Edge Functions

### File: `docs/EDGE_FUNCTIONS_CHANGELOG.md`

Aggiornare **sempre** dopo ogni modifica a edge function.

### Formato Entry Standard:

```markdown
## [YYYY-MM-DD] - [Titolo Modifica]

### File Modificato
- **Function:** `supabase/functions/nome-funzione/index.ts`
- **Backup Creato:** `index-old4.ts`
- **Versione Precedente:** `index-old3.ts` (backup pre-modifica)

### Motivo Modifica
[Descrizione dettagliata del perché abbiamo modificato]

### Modifiche Apportate
1. [Cosa è cambiato - dettaglio 1]
2. [Cosa è stato aggiunto - dettaglio 2]
3. [Cosa è stato rimosso - dettaglio 3]

### Codice Modificato
\`\`\`typescript
// Prima
const oldCode = 'example';

// Dopo
const newCode = 'improved example';
\`\`\`

### Impatto
- **Altre Edge Functions:** [Lista funzioni impattate]
- **Tabelle Database:** [Lista tabelle coinvolte]
- **Frontend:** [Componenti/pagine impattate]

### Test Eseguiti
- [x] Test funzione isolata
- [x] Test integrazione con frontend
- [x] Test edge cases
- [x] Verifica logs production
- [x] Test performance

### Breaking Changes
- [ ] Nessun breaking change
- [x] [Descrizione breaking change se presente]

### Rollback Plan
In caso di problemi:
1. Copiare `index-old3.ts` → `index.ts`
2. Rideploy edge function
3. Verificare logs

---
```

---

## 7. 🎨 Standard Grafici (TODO)

**Da implementare:** `docs/UI_DESIGN_STANDARDS.md`

Documentare:
- Palette colori (HSL semantic tokens)
- Componenti UI riutilizzabili (design-system/)
- Pattern layout
- Typography standards
- Iconografia (lucide-react)
- Spacing system (Tailwind)
- Animation patterns

---

## 8. ✅ Checklist Pre-Deploy

Prima di ogni deploy importante:

### Edge Functions
- [ ] Tutti i file `-old` numerati progressivamente (old1, old2, old3...)
- [ ] `EDGE_FUNCTIONS_CHANGELOG.md` aggiornato
- [ ] Nessuna API key hardcoded
- [ ] CORS headers configurati correttamente
- [ ] Error handling completo
- [ ] Logs informativi aggiunti

### Database
- [ ] Backup pre-migration salvato in `DATABASE_BACKUPS/`
- [ ] `DATABASE_INFO.md` aggiornato con nuove modifiche
- [ ] RLS policies verificate e testate
- [ ] Database functions con `SECURITY DEFINER` dove necessario
- [ ] Trigger funzionanti correttamente

### Sicurezza
- [ ] Nessuna validazione admin client-side
- [ ] Ruoli sempre in tabella `user_roles` separata
- [ ] Secrets mai esposti nel frontend
- [ ] API keys sempre da Supabase secrets o `config_ai`

### Test
- [ ] Test edge functions in isolation
- [ ] Test integrazione frontend-backend
- [ ] Test RLS policies con utenti diversi
- [ ] Test performance su query complesse
- [ ] Logs production controllati

### Documentazione
- [ ] Master Rules rispettate
- [ ] Changelog aggiornati
- [ ] Backup salvati
- [ ] Codice commentato dove necessario

---

## 9. 📁 Struttura Documentazione

```
docs/
├── MASTER_RULES.md                    (questo file)
├── DATABASE_INFO.md                   (schema e changelog DB)
├── EDGE_FUNCTIONS_CHANGELOG.md        (modifiche edge functions)
├── UI_DESIGN_STANDARDS.md             (TODO - standard grafici)
├── ai-tools-reference.md              (reference AI tools esistente)
├── DATABASE_BACKUPS/
│   ├── README.md                      (istruzioni backup)
│   ├── 2025-01-15_pre-migration-image-gen.md
│   ├── 2025-01-20_pre-migration-chat-lab.md
│   └── ...
└── [altri file esistenti]
```

---

## 10. 🚨 Situazioni di Emergenza

### Rollback Edge Function
1. Identificare backup corretto (es. `index-old3.ts`)
2. Copiare contenuto → `index.ts`
3. Verificare in `EDGE_FUNCTIONS_CHANGELOG.md` cosa è cambiato
4. Testare localmente se possibile
5. Deploy

### Rollback Database
1. Controllare `DATABASE_BACKUPS/` per snapshot pre-modifica
2. Verificare in `DATABASE_INFO.md` cosa è stato modificato
3. Creare migration di rollback
4. **PRIMA**: Fare backup dello stato corrente!
5. Eseguire rollback migration
6. Verificare integrity database

### Perdita API Keys
1. **NON chiedere all'utente**
2. Verificare `config_ai` table
3. Verificare Supabase Edge Function Secrets
4. Guidare utente a UI configurazione (`/ai-config`)
5. Solo se necessario, aggiungere secret via tool

---

## 11. 📞 Contatti e Supporto

### In caso di dubbi su queste regole:
- Consultare documentazione Supabase ufficiale
- Verificare esempi nel codebase esistente
- Controllare `ai-tools-reference.md` per tool AI
- Non inventare soluzioni, seguire le regole

### Risorse Utili
- [Supabase RLS Docs](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Security Best Practices](https://supabase.com/docs/guides/security)

---

**Ultima revisione:** 2025-01-15
**Versione:** 1.0
