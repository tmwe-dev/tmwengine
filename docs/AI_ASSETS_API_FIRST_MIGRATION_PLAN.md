# 📋 PLAN DE MIGRACIÓN API-FIRST PARA ACTIVOS DE IA

**Versión:** 1.0  
**Fecha:** 2025-01-XX  
**Objetivo:** Migrar las 3 Edge Functions críticas de IA a consumir datos desde TMWE API preservando 100% de funcionalidad

---

## 📊 RESUMEN EJECUTIVO

### Funciones Afectadas

| Edge Function | Líneas de Código | Complejidad | Dependencias email_messages |
|---------------|------------------|-------------|----------------------------|
| `email-ai-processor` | 511 | Alta | **5 queries directas** |
| `generate-group-context` | 512 | Media | **2 queries directas** |
| `fun-email-ai-analysis` | 282 | Baja | **4 queries directas** |

### Estrategia: **Adapter Pattern**

```
┌─────────────────────────────────────────────────────────────────┐
│                    ANTES (Acoplado)                             │
├─────────────────────────────────────────────────────────────────┤
│  Edge Function → supabase.from('email_messages') → PostgreSQL   │
└─────────────────────────────────────────────────────────────────┘

                              ⬇️

┌─────────────────────────────────────────────────────────────────┐
│                   DESPUÉS (Desacoplado)                         │
├─────────────────────────────────────────────────────────────────┤
│  Edge Function → EmailDataAdapter → TMWE API + Cache Local      │
│                         │                                       │
│                         ├─→ getEmailById(tmwe_email_id)         │
│                         ├─→ searchEmails(filters)               │
│                         └─→ getEmailsByUser(user_email)         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔍 ANÁLISIS DETALLADO POR FUNCIÓN

---

### 1️⃣ EMAIL-AI-PROCESSOR (511 líneas)

#### Funcionalidad Actual
```typescript
// LÍNEAS 56-64: Obtener email por ID local
const { data: email, error: emailError } = await supabase
  .from('email_messages')
  .select('*')
  .eq('id', email_id)  // ⚠️ UUID local
  .single();

// LÍNEAS 335-345: Actualizar carpeta (archive/delete)
await supabase
  .from('email_messages')
  .update({ folder_name: 'Archive' })
  .eq('id', email_id);

// LÍNEAS 199-201: Obtener user_email del email
const { data: { user: authUser } } = await supabase.auth.admin.getUserById(
  (await supabase.from('email_messages').select('user_email').eq('id', email_id).single()).data?.user_email || ''
);
```

#### Cambios Específicos

##### Cambio 1: Nuevo parámetro `tmwe_email_id`

```typescript
// ANTES (líneas 15-21)
interface AIProcessRequest {
  email_id: string;
  user_email: string;
  operation?: 'classify' | 'automate';
  selected_agent?: 'gemini' | 'gpt' | 'claude';
  force_category?: string;
}

// DESPUÉS
interface AIProcessRequest {
  email_id?: string;           // Legacy support (deprecated)
  tmwe_email_id: string;       // ✅ NUEVO: ID del TMWE API
  user_email: string;
  operation?: 'classify' | 'automate';
  selected_agent?: 'gemini' | 'gpt' | 'claude';
  force_category?: string;
}
```

##### Cambio 2: Obtener email desde TMWE API

```typescript
// ANTES (líneas 56-64)
const { data: email, error: emailError } = await supabase
  .from('email_messages')
  .select('*')
  .eq('id', email_id)
  .single();

// DESPUÉS
const email = await fetchEmailFromTMWE(tmwe_email_id, user_email);

// Nueva función helper
async function fetchEmailFromTMWE(
  tmweEmailId: string, 
  userEmail: string
): Promise<EmailData> {
  const TMWE_API_URL = Deno.env.get('TMWE_API_URL')!;
  const TMWE_API_KEY = Deno.env.get('TMWE_API_KEY')!;
  
  const response = await fetch(
    `${TMWE_API_URL}/api/email/detail/${tmweEmailId}`,
    {
      headers: {
        'Authorization': `Bearer ${TMWE_API_KEY}`,
        'X-User-Email': userEmail,
        'Content-Type': 'application/json'
      }
    }
  );
  
  if (!response.ok) {
    throw new Error(`TMWE API error: ${response.status}`);
  }
  
  const tmweEmail = await response.json();
  
  // Mapear campos TMWE → formato interno
  return {
    id: tmweEmail.id,                    // INTEGER del TMWE
    tmwe_email_id: tmweEmail.id,         // Para referencia
    subject: tmweEmail.subject || '',
    body_text: tmweEmail.body || tmweEmail.body_text || '',
    from_email: tmweEmail.from || tmweEmail.from_email || '',
    user_email: userEmail,
    cartella: tmweEmail.folder || tmweEmail.cartella || 'INBOX',
    received_at: tmweEmail.date || tmweEmail.received_at,
    uid: tmweEmail.uid || String(tmweEmail.id)
  };
}
```

##### Cambio 3: Acciones archive/delete vía TMWE API

```typescript
// ANTES (líneas 334-346)
if (decision.action === 'archive') {
  const { error: archiveError } = await supabase
    .from('email_messages')
    .update({ folder_name: 'Archive' })
    .eq('id', email_id);
  success = !archiveError;
}

// DESPUÉS
if (decision.action === 'archive') {
  const archiveResult = await executeEmailAction(
    'archive',
    tmwe_email_id,
    user_email
  );
  success = archiveResult.success;
  if (!archiveResult.success) errorMessage = archiveResult.error;
}

// Nueva función helper
async function executeEmailAction(
  action: 'archive' | 'delete' | 'move',
  tmweEmailId: string,
  userEmail: string,
  targetFolder?: string
): Promise<{ success: boolean; error?: string }> {
  const TMWE_API_URL = Deno.env.get('TMWE_API_URL')!;
  const TMWE_API_KEY = Deno.env.get('TMWE_API_KEY')!;
  
  const actionPayload = {
    action,
    email_id: tmweEmailId,
    target_folder: action === 'archive' ? 'Archive' : 
                   action === 'delete' ? 'Trash' : targetFolder
  };
  
  const response = await fetch(
    `${TMWE_API_URL}/api/email/action`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TMWE_API_KEY}`,
        'X-User-Email': userEmail,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(actionPayload)
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    return { success: false, error };
  }
  
  return { success: true };
}
```

##### Cambio 4: Guardar clasificación con tmwe_email_id

```typescript
// ANTES (línea 188)
await updateEmailClassification(supabase, email_id, classification);

// DESPUÉS - Modificar función updateEmailClassification
async function updateEmailClassification(
  supabase: SupabaseClient,
  tmweEmailId: string,      // ✅ Cambio de email_id a tmwe_email_id
  classification: Classification
) {
  // Upsert en email_ai_classifications usando tmwe_email_id
  const { error } = await supabase
    .from('email_ai_classifications')
    .upsert({
      tmwe_email_id: tmweEmailId,  // ✅ NUEVO campo
      category: classification.category,
      confidence: classification.confidence,
      summary: classification.summary,
      keywords: classification.keywords,
      ai_processed_at: new Date().toISOString()
    }, {
      onConflict: 'tmwe_email_id'  // ✅ Constraint único
    });
    
  if (error) throw error;
}
```

#### Código Preservado (Sin Cambios)

| Componente | Líneas | Motivo Preservación |
|------------|--------|---------------------|
| Tool definitions | 116-156 | Estructura AI independiente de fuente |
| `getAIConfig()` | 72-79 | Lee de `config_ai` (no email_messages) |
| `buildPrompt()` | 96-105 | Recibe EmailData como input |
| `callAIProvider()` | 158-163 | Agnóstico de fuente de datos |
| `parseAIResponse()` | 172-177 | Procesa respuesta AI |
| Entity extraction | 197-214 | Trabaja con EmailData |
| Learning system | 268-286 | Lee de tablas de learning |
| CRM actions | 348-376 | Independiente de email_messages |

---

### 2️⃣ GENERATE-GROUP-CONTEXT (512 líneas)

#### Funcionalidad Actual
```typescript
// LÍNEAS 92-96: Obtener emails de senders del grupo
const { data: senderRules, error: rulesError } = await supabase
  .from('email_sender_rules')
  .select('sender_email')
  .eq('group_id', body.group_id)
  .eq('user_id', body.user_id);

// LÍNEAS 124-130: Obtener samples de email_messages
const { data: emailSamples, error: samplesError } = await supabase
  .from('email_messages')
  .select('from_email, subject, data_ricezione, cartella')
  .in('from_email', senderEmails)
  .eq('user_email', userEmail)
  .order('data_ricezione', { ascending: false })
  .limit(senderEmails.length * 5);
```

#### Cambios Específicos

##### Cambio 1: Obtener samples desde TMWE API

```typescript
// ANTES (líneas 124-130)
const { data: emailSamples, error: samplesError } = await supabase
  .from('email_messages')
  .select('from_email, subject, data_ricezione, cartella')
  .in('from_email', senderEmails)
  .eq('user_email', userEmail)
  .order('data_ricezione', { ascending: false })
  .limit(senderEmails.length * 5);

// DESPUÉS
const emailSamples = await fetchEmailSamplesFromTMWE(
  senderEmails,
  userEmail,
  senderEmails.length * 5
);

// Nueva función helper
async function fetchEmailSamplesFromTMWE(
  senderEmails: string[],
  userEmail: string,
  limit: number
): Promise<EmailSample[]> {
  const TMWE_API_URL = Deno.env.get('TMWE_API_URL')!;
  const TMWE_API_KEY = Deno.env.get('TMWE_API_KEY')!;
  
  // Usar endpoint de búsqueda con filtros
  const searchParams = new URLSearchParams({
    senders: senderEmails.join(','),
    limit: String(limit),
    sort: 'date_desc',
    fields: 'from,subject,date,folder'  // Solo campos necesarios
  });
  
  const response = await fetch(
    `${TMWE_API_URL}/api/email/search?${searchParams}`,
    {
      headers: {
        'Authorization': `Bearer ${TMWE_API_KEY}`,
        'X-User-Email': userEmail,
        'Content-Type': 'application/json'
      }
    }
  );
  
  if (!response.ok) {
    console.error('❌ TMWE API error:', response.status);
    throw new Error(`TMWE API search failed: ${response.status}`);
  }
  
  const tmweResults = await response.json();
  
  // Mapear campos TMWE → formato esperado
  return tmweResults.emails.map((e: any) => ({
    from_email: e.from || e.sender_email,
    subject: e.subject,
    data_ricezione: e.date || e.received_date,
    cartella: e.folder
  }));
}
```

#### Código Preservado (Sin Cambios)

| Componente | Líneas | Motivo Preservación |
|------------|--------|---------------------|
| Group loading | 51-63 | Lee de `email_sender_groups` |
| User profile | 82-89 | Lee de `user_profiles` |
| Sender rules | 92-104 | Lee de `email_sender_rules` |
| AI config loading | 191-203 | Lee de `config_ai` |
| System prompt | 208-248 | Recibe datos como input |
| AI provider calls | 324-392 | Agnóstico de fuente |
| Context extraction | 408-428 | Procesa respuesta AI |
| Save to DB | 460-479 | Escribe en `email_sender_groups_context` |

---

### 3️⃣ FUN-EMAIL-AI-ANALYSIS (282 líneas)

#### Funcionalidad Actual
```typescript
// Todas las operaciones usan email_messages directamente:
// - getStats() líneas 83-132
// - searchEmails() líneas 134-174
// - getInsights() líneas 176-222
// - suggestActions() líneas 224-282
```

#### Cambios Específicos

##### Cambio 1: Crear EmailDataAdapter

```typescript
// NUEVO: Agregar al inicio del archivo (después de línea 18)

interface TMWESearchParams {
  user_email: string;
  folders?: string[];
  date_from?: string;
  date_to?: string;
  sender?: string;
  keywords?: string[];
  limit?: number;
}

class EmailDataAdapter {
  private tmweApiUrl: string;
  private tmweApiKey: string;
  
  constructor() {
    this.tmweApiUrl = Deno.env.get('TMWE_API_URL')!;
    this.tmweApiKey = Deno.env.get('TMWE_API_KEY')!;
  }
  
  async search(params: TMWESearchParams): Promise<any[]> {
    const searchParams = new URLSearchParams();
    
    if (params.folders?.length) {
      searchParams.set('folders', params.folders.join(','));
    }
    if (params.date_from) {
      searchParams.set('date_from', params.date_from);
    }
    if (params.date_to) {
      searchParams.set('date_to', params.date_to);
    }
    if (params.sender) {
      searchParams.set('sender', params.sender);
    }
    if (params.keywords?.length) {
      searchParams.set('q', params.keywords.join(' '));
    }
    if (params.limit) {
      searchParams.set('limit', String(params.limit));
    }
    
    const response = await fetch(
      `${this.tmweApiUrl}/api/email/search?${searchParams}`,
      {
        headers: {
          'Authorization': `Bearer ${this.tmweApiKey}`,
          'X-User-Email': params.user_email,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`TMWE search failed: ${response.status}`);
    }
    
    const result = await response.json();
    return result.emails || [];
  }
  
  async getStats(userEmail: string): Promise<any> {
    const response = await fetch(
      `${this.tmweApiUrl}/api/email/stats`,
      {
        headers: {
          'Authorization': `Bearer ${this.tmweApiKey}`,
          'X-User-Email': userEmail,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`TMWE stats failed: ${response.status}`);
    }
    
    return await response.json();
  }
}
```

##### Cambio 2: Refactorizar getStats()

```typescript
// ANTES (líneas 83-132)
async function getStats(supabase: any, userEmail: string, filters?: any) {
  let query = supabase
    .from('email_messages')
    .select('*', { count: 'exact', head: false })
    .eq('user_email', userEmail)
    .eq('sync_status', 'fun_email_backup');
  // ... más lógica

// DESPUÉS
async function getStats(
  adapter: EmailDataAdapter, 
  userEmail: string, 
  filters?: any
) {
  // Opción A: Si TMWE tiene endpoint de stats
  const tmweStats = await adapter.getStats(userEmail);
  
  return {
    totalEmails: tmweStats.total_count,
    folderBreakdown: tmweStats.folder_counts,
    topSenders: tmweStats.top_senders,
    withAttachments: tmweStats.with_attachments,
    dateRange: {
      earliest: tmweStats.date_range?.earliest,
      latest: tmweStats.date_range?.latest,
    },
  };
  
  // Opción B: Si necesita calcular manualmente
  // const emails = await adapter.search({
  //   user_email: userEmail,
  //   folders: filters?.folders,
  //   date_from: filters?.dateRange?.from,
  //   date_to: filters?.dateRange?.to,
  //   limit: 10000
  // });
  // ... calcular estadísticas localmente
}
```

##### Cambio 3: Refactorizar searchEmails()

```typescript
// ANTES (líneas 134-174)
async function searchEmails(supabase: any, userEmail: string, filters?: any) {
  let query = supabase
    .from('email_messages')
    .select('*')
    .eq('user_email', userEmail)
    // ...

// DESPUÉS
async function searchEmails(
  adapter: EmailDataAdapter, 
  userEmail: string, 
  filters?: any
) {
  const emails = await adapter.search({
    user_email: userEmail,
    folders: filters?.folders,
    sender: filters?.sender,
    keywords: filters?.keywords,
    date_from: filters?.dateRange?.from,
    date_to: filters?.dateRange?.to,
    limit: 50
  });
  
  return {
    results: emails.map((email: any) => ({
      id: email.id,                    // tmwe_email_id
      tmwe_email_id: email.id,         // ✅ Explícito
      subject: email.subject,
      from: email.from || email.from_email,
      date: email.date || email.received_at,
      preview: email.body?.substring(0, 150),
      hasAttachments: email.has_attachments,
    })),
    count: emails.length,
  };
}
```

##### Cambio 4: Actualizar handler principal

```typescript
// ANTES (líneas 50-68)
switch (operation) {
  case 'stats':
    result = await getStats(supabaseClient, user.email!, filters);
    break;
  // ...

// DESPUÉS
const emailAdapter = new EmailDataAdapter();

switch (operation) {
  case 'stats':
    result = await getStats(emailAdapter, user.email!, filters);
    break;
  case 'search':
    result = await searchEmails(emailAdapter, user.email!, filters);
    break;
  case 'insights':
    result = await getInsights(emailAdapter, user.email!, filters);
    break;
  case 'actions':
    result = await suggestActions(emailAdapter, user.email!, filters);
    break;
  // ...
```

---

## 🗄️ CAMBIOS EN BASE DE DATOS

### Migración Requerida

```sql
-- 1. Agregar tmwe_email_id a email_ai_classifications
ALTER TABLE email_ai_classifications 
ADD COLUMN IF NOT EXISTS tmwe_email_id TEXT;

-- 2. Crear índice para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_email_ai_classifications_tmwe_id 
ON email_ai_classifications(tmwe_email_id);

-- 3. Agregar constraint único (después de migrar datos existentes)
-- ALTER TABLE email_ai_classifications 
-- ADD CONSTRAINT unique_tmwe_email_id UNIQUE (tmwe_email_id);

-- 4. Agregar tmwe_email_id a email_pending_actions
ALTER TABLE email_pending_actions 
ADD COLUMN IF NOT EXISTS tmwe_email_id TEXT;

-- 5. Agregar tmwe_email_id a email_auto_execution_log
ALTER TABLE email_auto_execution_log 
ADD COLUMN IF NOT EXISTS tmwe_email_id TEXT;
```

### Migración de Datos Existentes

```sql
-- Mapear clasificaciones existentes usando message_id
UPDATE email_ai_classifications eac
SET tmwe_email_id = em.message_id
FROM email_messages em
WHERE eac.email_id = em.id
  AND eac.tmwe_email_id IS NULL;

-- Verificar cuántas no se pudieron mapear
SELECT COUNT(*) as unmapped 
FROM email_ai_classifications 
WHERE tmwe_email_id IS NULL;
```

---

## 🔐 SECRETS REQUERIDOS

```bash
# Agregar a Supabase Secrets
TMWE_API_URL=https://api.tmwengine.com    # URL base del API
TMWE_API_KEY=tmwe_prod_xxxxx              # API key para autenticación
```

---

## 📅 CRONOGRAMA DE IMPLEMENTACIÓN

```
┌────────────────────────────────────────────────────────────────────────┐
│                    SPRINT 2: MIGRACIÓN API-FIRST                       │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  Semana 1                                                              │
│  ├─ Día 1-2: Crear _shared/tmwe-email-adapter.ts                      │
│  ├─ Día 3-4: Migrar fun-email-ai-analysis (más simple)                │
│  └─ Día 5: Testing & fixes                                            │
│                                                                        │
│  Semana 2                                                              │
│  ├─ Día 1-2: Migrar generate-group-context                            │
│  ├─ Día 3: Testing con grupos existentes                              │
│  ├─ Día 4-5: Migrar email-ai-processor (más complejo)                 │
│                                                                        │
│  Semana 3                                                              │
│  ├─ Día 1: Migración de datos (tmwe_email_id)                         │
│  ├─ Día 2-3: Testing end-to-end                                       │
│  ├─ Día 4: Documentación actualizada                                  │
│  └─ Día 5: Deploy a producción                                        │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## ✅ CHECKLIST DE VALIDACIÓN

### Pre-Migración
- [ ] TMWE_API_URL y TMWE_API_KEY configurados en Supabase Secrets
- [ ] Endpoint `/api/email/detail/{id}` disponible en TMWE API
- [ ] Endpoint `/api/email/search` disponible en TMWE API
- [ ] Endpoint `/api/email/action` disponible en TMWE API
- [ ] Backup de edge functions existentes (index-old3.ts)

### Post-Migración
- [ ] Clasificación de email funciona con tmwe_email_id
- [ ] Acciones archive/delete ejecutan vía TMWE API
- [ ] generate-group-context obtiene samples de TMWE API
- [ ] fun-email-ai-analysis todas las operaciones funcionan
- [ ] Clasificaciones existentes tienen tmwe_email_id mapeado
- [ ] Logs de edge functions sin errores

---

## 📊 MÉTRICAS DE ÉXITO

| Métrica | Valor Esperado | Cómo Medir |
|---------|----------------|------------|
| Funcionalidad preservada | 100% | Tests E2E |
| Queries a email_messages | 0 | Búsqueda en código |
| Latencia clasificación | <3s (similar a actual) | Edge function logs |
| Errores TMWE API | <0.1% | Monitoring |
| Clasificaciones con tmwe_email_id | 100% | Query SQL |

---

## 🔙 PLAN DE ROLLBACK

```bash
# Si algo falla, restaurar versiones anteriores:

# 1. email-ai-processor
cp supabase/functions/email-ai-processor/index-old3.ts \
   supabase/functions/email-ai-processor/index.ts

# 2. generate-group-context  
cp supabase/functions/generate-group-context/index-old1.ts \
   supabase/functions/generate-group-context/index.ts

# 3. fun-email-ai-analysis
cp supabase/functions/fun-email-ai-analysis/index-old1.ts \
   supabase/functions/fun-email-ai-analysis/index.ts

# 4. Redeploy
supabase functions deploy email-ai-processor
supabase functions deploy generate-group-context
supabase functions deploy fun-email-ai-analysis
```

---

**Documento preparado siguiendo MASTER_RULES.md**  
**Próximo paso:** Aprobar plan y comenzar con creación de `_shared/tmwe-email-adapter.ts`
