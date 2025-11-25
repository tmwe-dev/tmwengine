# 🧠 Análisis de Migración AI - Reducción de Sincronización

**Fecha:** 2025-11-25  
**Objetivo:** Evaluar qué funciones de IA mover al API de TMWE para eliminar sincronización

---

## 📊 Estado Actual: Flujo de Sincronización

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ARQUITECTURA ACTUAL (Con Sincronización)                  │
└─────────────────────────────────────────────────────────────────────────────┘

  TMWE Server (IMAP)                    Supabase                    Frontend
  ─────────────────                    ─────────                    ────────
        │                                  │                           │
        │  ←──── 1. SYNC DOWNLOAD ─────── │ ←── QuickDownloader ───── │
        │         (PESADO: 10-60 min)      │                           │
        │                                  │                           │
        │                           ┌──────▼──────┐                    │
        │                           │ email_      │                    │
        │                           │ messages    │                    │
        │                           │ (137K rows) │                    │
        │                           └──────┬──────┘                    │
        │                                  │                           │
        │                           2. AI PROCESS                      │
        │                           ┌──────▼──────┐                    │
        │                           │ email-ai-   │                    │
        │                           │ processor   │                    │
        │                           └──────┬──────┘                    │
        │                                  │                           │
        │  ←──── 3. ACTION SYNC ───────── │                           │
        │         (archive/delete)         │                           │
        │                                  │                           │
```

### Problemas Identificados:

| Problema | Impacto | Archivos Afectados |
|----------|---------|-------------------|
| 57 archivos dependen de `email_messages` | Alto | src/*, hooks/*, components/* |
| Sincronización previa obligatoria | Alto | QuickEmailDownloader, SingleMailImporter |
| Duplicación de datos (137K+ rows) | Medio | Storage, costos DB |
| Sincronización bidireccional acciones | Alto | archive, delete, move |
| Latencia UX (10-60 min inicial) | Crítico | Primera experiencia usuario |

---

## 🔬 Análisis de Funciones de IA

### 1. `email-ai-processor` (511 líneas)

**Funcionalidad:**
- Clasificación de emails por categorías
- Extracción de entidades (tracking, invoices)
- Decisión de acciones automáticas
- Auto-ejecución con threshold adaptativo

**Dependencias de `email_messages`:**
```typescript
// Líneas 56-64 - LEE email de tabla local
const { data: email } = await supabase
  .from('email_messages')
  .select('*')
  .eq('id', email_id)
  .single();

// Líneas 335-346 - MODIFICA tabla local para acciones
await supabase
  .from('email_messages')
  .update({ folder_name: 'Archive' })
  .eq('id', email_id);
```

**Datos propios que genera (NO mover):**
- `email_ai_classifications` - Clasificaciones AI
- `email_pending_actions` - Acciones pendientes
- `email_auto_execution_log` - Log de auto-ejecución
- `conversation_history` - Historial de conversación

---

### 2. `generate-group-context` (512 líneas)

**Funcionalidad:**
- Analiza patrones de grupos de senders
- Genera `context_summary` para grupos
- Calcula `sender_patterns` (business_type, frequency, etc.)

**Dependencias de `email_messages`:**
```typescript
// Líneas 124-130 - LEE samples de tabla local
const { data: emailSamples } = await supabase
  .from('email_messages')
  .select('from_email, subject, data_ricezione, cartella')
  .in('from_email', senderEmails)
  .eq('user_email', userEmail)
  .limit(senderEmails.length * 5);
```

**Datos propios que genera (NO mover):**
- `email_sender_groups.context_summary`
- `email_sender_groups.sender_patterns`

---

### 3. `fun-email-ai-analysis` (282 líneas)

**Funcionalidad:**
- `getStats` - Estadísticas de emails
- `searchEmails` - Búsqueda con filtros
- `getInsights` - Insights AI
- `suggestActions` - Sugerencias de acciones

**Dependencias de `email_messages`:**
```typescript
// Línea 90+ - LEE estadísticas de tabla local
const { data: emails } = await supabase
  .from('email_messages')
  .select('*')
  .eq('user_email', user_email)
  .in('cartella', filters.folders);
```

---

## 🎯 TABLA COMPARATIVA: Mover vs Mantener en Supabase

| Función | Estado Actual | Opción A: Mantener Supabase | Opción B: Mover a TMWE API | Recomendación |
|---------|--------------|---------------------------|---------------------------|---------------|
| **Leer contenido email** | `email_messages` table | Requiere sync previo (10-60 min) | API `/api/email/detail/{uid}` directo | ✅ **MOVER** |
| **Clasificar email** | Edge Function local | OK pero requiere email sincronizado | API `/api/email/classify` (AI en backend TMWE) | ⚠️ EVALUAR |
| **Acciones (archive/delete)** | Local + sync posterior | Duplicación, latencia | API `/api/email/action` ya existe | ✅ **MOVER** |
| **Buscar emails** | `email_messages` query | Rápido pero datos desactualizados | API `search_emails` ya existe | ✅ **MOVER** |
| **Samples para grupo** | `email_messages` query | Requiere sync previo | API `/api/email/search-by-sender` | ✅ **MOVER** |
| **Estadísticas** | `email_messages` aggregation | Rápido, datos locales | API `/api/email/stats` | ⚠️ EVALUAR |
| **Clasificaciones guardadas** | `email_ai_classifications` | Datos propios Lovable | N/A | 🔒 **MANTENER** |
| **Learning/Feedback** | `email_ai_learning_feedback` | Datos propios Lovable | N/A | 🔒 **MANTENER** |
| **Conversation History** | `conversation_history` | Datos propios Lovable | N/A | 🔒 **MANTENER** |
| **Pending Actions** | `email_pending_actions` | Datos propios Lovable | N/A | 🔒 **MANTENER** |
| **Auto-execution Log** | `email_auto_execution_log` | Datos propios Lovable | N/A | 🔒 **MANTENER** |

---

## 🚀 OPCIÓN RECOMENDADA: Arquitectura Híbrida Zero-Sync

### Principio: "AI en Supabase, Datos en TMWE API"

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              ARQUITECTURA PROPUESTA (Zero-Sync para AI)                      │
└─────────────────────────────────────────────────────────────────────────────┘

  TMWE Server                         Supabase Edge Functions           Frontend
  ───────────                         ─────────────────────────         ────────
        │                                      │                           │
        │ ←── GET /api/email/detail ────────── │ ←── email-ai-processor ── │
        │      (contenido email directo)       │     (sin sync previo!)    │
        │                                      │                           │
        │ ←── GET /api/email/search ─────────  │ ←── generate-group-ctx ── │
        │      (samples por sender)            │     (sin sync previo!)    │
        │                                      │                           │
        │ ←── POST /api/email/action ───────── │ ←── auto-execute ──────── │
        │      (archive/delete directo)        │     (sin sync posterior!) │
        │                                      │                           │
        │                               ┌──────▼──────┐                    │
        │                               │ Metadata    │                    │
        │                               │ Propios:    │                    │
        │                               │ - classif.  │                    │
        │                               │ - learning  │                    │
        │                               │ - history   │                    │
        │                               └─────────────┘                    │
```

### Beneficios:

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| Sync inicial requerido | 10-60 min | 0 min | **100%** |
| Datos duplicados | 137K+ rows | 0 rows | **100%** |
| Latencia clasificación | sync + process | process only | **~80%** |
| Consistencia datos | Eventual (sync) | Real-time | **Inmediata** |
| Costos storage DB | Alto | Mínimo | **~90%** |

---

## 📋 Endpoints TMWE API Necesarios

### Endpoints YA EXISTENTES en `tmwe-api-proxy`:

| Handler | Endpoint | Uso para AI |
|---------|----------|------------|
| `get_message` | `/api/email?handler=get_message&uid=X&folder=Y` | ✅ Obtener email para clasificar |
| `search_emails` | `/api/email?handler=search_emails` | ✅ Buscar emails por sender |
| `get_folders` | `/api/email?handler=get_folders` | ✅ Listar carpetas disponibles |
| `mark_as_read` | `/api/email?handler=mark_as_read` | ✅ Marcar leído |

### Endpoints NUEVOS Sugeridos en TMWE Backend:

| Endpoint Propuesto | Descripción | Reduce Sync |
|-------------------|-------------|-------------|
| `POST /api/email/archive` | Archivar email directamente | ✅ Elimina sync acciones |
| `POST /api/email/delete` | Eliminar email directamente | ✅ Elimina sync acciones |
| `POST /api/email/move` | Mover email a carpeta | ✅ Elimina sync acciones |
| `GET /api/email/stats` | Estadísticas agregadas | ⚠️ Opcional |

---

## 🔀 DECISIÓN CRÍTICA: ¿Dónde ejecutar la IA?

### Opción A: AI en Supabase Edge Functions (RECOMENDADO)

**Ventajas:**
- ✅ Preserva 100% código AI existente (511+ líneas)
- ✅ Multi-provider (Gemini, GPT, Claude) ya configurado
- ✅ Learning system funcional
- ✅ Configuración AI en `config_ai` tabla
- ✅ Menor cambio, menor riesgo

**Cambios necesarios:**
```typescript
// ANTES (email-ai-processor)
const { data: email } = await supabase
  .from('email_messages')
  .select('*')
  .eq('id', email_id);

// DESPUÉS
const emailResponse = await fetch(
  `${TMWE_API_URL}/api/email?handler=get_message&uid=${uid}&folder=${folder}`,
  { headers: { Authorization: `Bearer ${tmweToken}` } }
);
const email = await emailResponse.json();
```

**Estimación:** 8-12 horas de desarrollo

---

### Opción B: AI en TMWE Backend (NO RECOMENDADO)

**Ventajas:**
- Zero latencia red (AI junto a datos)
- Independencia total de Supabase

**Desventajas:**
- ❌ Reescribir 1200+ líneas de código AI
- ❌ Perder multi-provider (solo un provider)
- ❌ Perder learning system
- ❌ Perder configuración dinámica
- ❌ Duplicar infraestructura AI
- ❌ Mayor costo TMWE (API keys, compute)

**Estimación:** 40-60 horas de desarrollo

---

## 📊 Matriz de Decisión Final

| Criterio | Peso | Opción A (AI Supabase) | Opción B (AI TMWE) |
|----------|------|----------------------|-------------------|
| Preservar código existente | 30% | ✅ 100% | ❌ 0% |
| Reducir sincronización | 25% | ✅ ~95% | ✅ 100% |
| Tiempo implementación | 20% | ✅ 8-12h | ❌ 40-60h |
| Mantener multi-provider | 15% | ✅ Sí | ❌ No |
| Mantener learning | 10% | ✅ Sí | ❌ No |
| **TOTAL** | 100% | **92%** | **45%** |

---

## ✅ PLAN DE IMPLEMENTACIÓN RECOMENDADO

### Sprint 1: Adaptar lectura de emails (4h)

**Archivo:** `supabase/functions/email-ai-processor/index.ts`

```typescript
// NUEVO: Helper para obtener email vía API
async function getEmailFromAPI(
  supabase: SupabaseClient,
  userEmail: string,
  folder: string,
  uid: string
): Promise<EmailData> {
  // 1. Obtener token OAuth del usuario
  const { data: creds } = await supabase
    .from('user_tmwe_credentials')
    .select('access_token')
    .eq('email', userEmail)
    .eq('token_type', 'oauth')
    .single();

  // 2. Llamar a TMWE API vía proxy
  const { data: email, error } = await supabase.functions.invoke('tmwe-api-proxy', {
    body: {
      endpoint: '/api/email',
      data: {
        handler: 'get_message',
        folder: folder,
        uid: uid,
        include_body: true
      }
    }
  });

  if (error) throw new Error(`Failed to fetch email: ${error.message}`);

  return {
    id: `${folder}/${uid}`,
    subject: email.subject || '',
    body_text: email.body || email.text || '',
    from_email: email.from || '',
    user_email: userEmail,
    cartella: folder
  };
}
```

### Sprint 2: Adaptar acciones (2h)

**Cambio en auto-execute:**
```typescript
// ANTES: Modificar tabla local
await supabase
  .from('email_messages')
  .update({ folder_name: 'Archive' })
  .eq('id', email_id);

// DESPUÉS: Ejecutar vía API
await supabase.functions.invoke('tmwe-api-proxy', {
  body: {
    endpoint: '/api/email',
    data: {
      handler: 'move_message',
      uid: uid,
      folder: folder,
      target_folder: 'Archive'
    }
  }
});
```

### Sprint 3: Adaptar generate-group-context (3h)

```typescript
// ANTES: Query a email_messages
const { data: emailSamples } = await supabase
  .from('email_messages')
  .select('from_email, subject, data_ricezione')
  .in('from_email', senderEmails);

// DESPUÉS: Búsqueda vía API
const { data: searchResult } = await supabase.functions.invoke('tmwe-api-proxy', {
  body: {
    endpoint: '/api/email',
    data: {
      handler: 'search_emails',
      from: senderEmails.join(' OR '),
      limit: senderEmails.length * 5
    }
  }
});
```

### Sprint 4: Adaptar fun-email-ai-analysis (3h)

Similar al Sprint 3, usando `search_emails` y agregaciones en memoria.

---

## 🎯 Resultado Esperado

| Funcionalidad | Sincronización Antes | Sincronización Después |
|--------------|---------------------|----------------------|
| Clasificar email | ✅ Requerida | ❌ No requerida |
| Ver inbox | ✅ Requerida | ❌ No requerida |
| Archivar/Eliminar | ✅ Bidireccional | ❌ No requerida |
| Análisis grupos | ✅ Requerida | ❌ No requerida |
| Buscar emails | ✅ Requerida | ❌ No requerida |

**Reducción total de sincronización: ~95%**

La tabla `email_messages` pasa de ser **obligatoria** a **opcional** (solo para cache/offline).

---

## 📁 Archivos a Modificar

| Archivo | Cambios | Complejidad |
|---------|---------|-------------|
| `supabase/functions/email-ai-processor/index.ts` | Líneas 56-64, 335-346 | Media |
| `supabase/functions/generate-group-context/index.ts` | Líneas 124-163 | Media |
| `supabase/functions/fun-email-ai-analysis/index.ts` | Líneas 90-175 | Media |
| `supabase/functions/_shared/email-sender-context-loader.ts` | Líneas 45-80 | Baja |

**Total estimado: 12-16 horas**
