# FunEmail - Especificación Completa del Sistema

**Versión:** 1.0  
**Fecha:** 2025-01-29  
**Autor:** Sistema AI Documentation  

---

## 1. Visión General

FunEmail es el módulo de gestión inteligente de email de TMWEngine, que combina:
- **Clasificación AI** de emails por categoría y urgencia
- **Gestión visual** de remitentes con drag & drop
- **Automatización AI** para acciones repetitivas
- **Integración TMWE API** para acceso a datos de email vía RabbitMQ/Elasticsearch

### Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────────┐
│                        FunEmail UI                               │
│  ┌─────────┬──────────────┬───────────┬──────────┬─────────────┤
│  │   Fun   │  Management  │Suggestions│Smart     │ Automations │
│  │   Tab   │    Tab       │   Tab     │ Inbox    │    Tab      │
│  └────┬────┴──────┬───────┴─────┬─────┴────┬─────┴──────┬──────┘
│       │           │             │          │            │
│  ┌────▼───────────▼─────────────▼──────────▼────────────▼──────┐
│  │                    Edge Functions (AI)                       │
│  │  email-ai-processor | suggest-sender-grouping | generate-   │
│  │  fun-email-ai-analysis | email-ai-learning | execute-ai     │
│  └────────────────────────┬─────────────────────────────────────┘
│                           │
│  ┌────────────────────────▼─────────────────────────────────────┐
│  │              Data Layer (Hybrid)                             │
│  │  ┌─────────────────┐    ┌──────────────────────────────────┐│
│  │  │   Supabase DB   │    │          TMWE API                ││
│  │  │  (AI metadata)  │    │  (RabbitMQ/ES/MySQL - emails)    ││
│  │  └─────────────────┘    └──────────────────────────────────┘│
│  └──────────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Módulos Principales

### 2.1 Fun Tab
**Archivo:** `src/components/email/fun/FunEmailTab.tsx`

Funcionalidades:
- Vista experimental/dashboard de actividad email
- Estadísticas visuales de uso
- Accesos rápidos a funciones principales

### 2.2 Management Tab (660 líneas)
**Archivo:** `src/components/email/EmailManagementTab.tsx`

Funcionalidades:
- **Análisis de remitentes** con `analyzeSenders()` 
- **Sistema Drag & Drop** nativo HTML5 para clasificación manual
- **Grupos predefinidos** (9 categorías):
  - Operativo, Commerciale, Logistica, Rate Aeree, Rate Navali
  - Spedizionieri, Clienti, Fornitori, Enti/Autorità
- **Vista Carousel 3D** con rotación 3D de tarjetas de grupo
- **Vista Grid** con ordenación alfabética
- **Real-time subscriptions** para actualizaciones inmediatas

Dependencias de datos:
- `email_sender_groups` - Grupos de remitentes
- `email_sender_rules` - Reglas de clasificación
- `email_messages` - ⚠️ Para `analyzeSenders()` (TO MIGRATE)

### 2.3 Suggestions Tab (1450 líneas)
**Archivo:** `src/components/email/EmailGroupingSuggestionsTab.tsx`

Funcionalidades:
- **Generación AI de sugerencias** con `suggest-sender-grouping`
- **Knowledge Base por grupo** con `generate-group-context`
- **Filtros avanzados**:
  - Por país (ISO codes: IT, CN, US, DE, etc.)
  - Por dominio (@gmail, @company.com)
  - Por tipo de contenido (quotation, rate, shipment, etc.)
  - Por tipo de transporte (air, sea, express, road, rail)
- **Progreso en vivo** durante generación batch

### 2.4 Smart Inbox Tab (753 líneas)
**Archivo:** `src/components/email/smart-inbox/SmartInboxTabIntelligent.tsx`

Funcionalidades:
- **Clasificación AI** con `email-ai-processor` 
- **Categorías automáticas**:
  - Fatture, Bolle/Packing List, Preventivi/Quotazioni
  - Rate Aeree/Navali, Documenti Spedizione
  - Offerte di Lavoro, Marketing/Pubblicità, Spam
- **Sidebar colapsable** de categorías con contadores
- **Panel de detalle** con acciones AI sugeridas
- **Navegación por swipe** entre emails (prev/next)
- **Clasificación batch** de emails nuevos

Estado actual de integración TMWE API:
- ✅ Lectura de emails clasificados vía `tmwe_email_id`
- ✅ `emailSearchApi.getEmailDetail()` para metadatos
- ⚠️ Clasificación aún usa `email_id` (UUID local)

### 2.5 Automations Tab (334 líneas)
**Archivo:** `src/components/email/automation/AIAutomationDashboard.tsx`

Funcionalidades:
- **Dashboard de prompts AI** por remitente
- **Logs de ejecución** con success rate
- **Sistema de activación/desactivación**
- **PendingActionsPanel** para acciones pendientes de confirmación
- **LearningDashboard** para métricas de aprendizaje AI

---

## 3. Edge Functions de IA

### 3.1 email-ai-processor (511 líneas)
**Archivo:** `supabase/functions/email-ai-processor/index.ts`

**Operaciones:**
- `classify` - Clasifica email en categorías predefinidas
- `automate` - Decide y ejecuta acciones automáticas

**Flujo de clasificación:**
1. Recibe `email_id` (UUID)
2. Lee email de `email_messages` ⚠️ (TO MIGRATE)
3. Construye prompt con contexto del remitente
4. Llama a AI provider (Gemini/GPT/Claude)
5. Parsea respuesta via Tool Calling
6. Guarda clasificación en `email_ai_classifications`
7. Extrae entidades (tracking, invoices, orders)
8. Actualiza historial de conversación

**Flujo de automatización:**
1. Todo lo anterior +
2. Carga historial de conversación con remitente
3. Obtiene contexto de herramientas disponibles
4. Carga contexto del remitente (AI prompts, reglas)
5. Calcula umbral de confianza adaptativo
6. Decide acción (archive, delete, reply, create_task, etc.)
7. Si `auto_execute_enabled` y confianza > umbral → ejecuta
8. Si no → crea `email_pending_actions`

**Tool Calling Schema:**
```typescript
{
  name: "classify_email",
  parameters: {
    category: enum["Fatture", "Bolle", "Preventivi", ...],
    confidence: number(0-1),
    summary: string(max 200),
    keywords: array[string](3-5)
  }
}
```

### 3.2 suggest-sender-grouping (591 líneas)
**Archivo:** `supabase/functions/suggest-sender-grouping/index.ts`

**Input:**
```typescript
{
  sender_email: string,
  email_samples: EmailSample[],  // ✅ Ya recibe samples como parámetro
  existing_groups: ExistingGroup[],
  user_email: string
}
```

**Proceso:**
1. Carga Knowledge Base de grupos existentes
2. Carga contexto de empresa del usuario
3. Construye prompt especializado para spedizionieri
4. Analiza NATURALEZA del remitente (no contenido)
5. Sugiere 1-3 grupos con metadatos contextuales

**Output con metadatos:**
```typescript
{
  group_id: string | null,
  group_name: string,
  confidence: number,
  reason: string,
  transport_type: 'air' | 'sea' | 'express' | 'road' | 'rail' | null,
  content_type: 'quotation' | 'rate' | 'shipment' | ... | null,
  country_code: string | null,  // ISO 2-letter
  country_confidence: number
}
```

**Nota:** Esta función NO depende de `email_messages` directamente - recibe samples como parámetro.

### 3.3 generate-group-context
**Archivo:** `supabase/functions/generate-group-context/index.ts`

Genera Knowledge Base para un grupo de remitentes:
- Patrones de emails típicos
- Resumen de contexto del grupo
- Estadísticas de remitentes

### 3.4 fun-email-ai-analysis
**Archivo:** `supabase/functions/fun-email-ai-analysis/index.ts`

Operaciones de análisis:
- `getStats` - Estadísticas de email por folder/sender
- `searchEmails` - Búsqueda con filtros
- `getInsights` - Insights AI sobre patrones
- `suggestActions` - Sugerencias de acciones batch

### 3.5 email-ai-learning
**Archivo:** `supabase/functions/email-ai-learning/index.ts`

Sistema de aprendizaje:
- Registra feedback de usuario (aceptar/rechazar clasificaciones)
- Ajusta umbrales de confianza adaptativamente
- Genera métricas de precisión por remitente/categoría

### 3.6 execute-ai-actions
**Archivo:** `supabase/functions/execute-ai-actions/index.ts`

Ejecuta acciones confirmadas por el usuario:
- Archive/Delete emails
- Create tasks/meetings/calls
- Update contacts
- Link to campaigns

---

## 4. Modelos de Datos

### 4.1 email_ai_classifications
```sql
CREATE TABLE email_ai_classifications (
  id UUID PRIMARY KEY,
  email_id UUID,              -- ⚠️ Legacy: UUID local
  email_uid TEXT,             -- UID IMAP
  tmwe_email_id INTEGER,      -- 🆕 TMWE API ID (primary identifier)
  folder_name TEXT,
  user_email TEXT,
  category TEXT,
  confidence NUMERIC,
  ai_summary TEXT,
  keywords TEXT[],
  sender_email TEXT,
  sender_domain TEXT,
  sender_logo_url TEXT,
  is_verified BOOLEAN,
  urgency TEXT,               -- 'critical' | 'high' | 'normal' | 'low'
  action_suggested TEXT,
  detected_patterns TEXT[],
  reasoning TEXT,
  tags TEXT[],
  custom_prompt TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### 4.2 email_pending_actions
```sql
CREATE TABLE email_pending_actions (
  id UUID PRIMARY KEY,
  user_id UUID,
  email_uid TEXT,
  email_id UUID,              -- ⚠️ Legacy
  tmwe_email_id INTEGER,      -- 🆕 TO ADD
  sender_email TEXT,
  action_type TEXT,
  action_payload JSONB,
  suggested_response TEXT,
  reasoning TEXT,
  confidence NUMERIC,
  status TEXT,                -- 'pending' | 'approved' | 'rejected'
  created_at TIMESTAMPTZ
);
```

### 4.3 conversation_history
```sql
CREATE TABLE conversation_history (
  id UUID PRIMARY KEY,
  user_id UUID,
  sender_email TEXT,
  last_5_exchanges JSONB,
  conversation_summary TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

---

## 5. Hooks y Utilidades

### 5.1 useSmartClassificationIntelligent
**Archivo:** `src/hooks/useSmartClassificationIntelligent.ts`

```typescript
const { classifyEmails, isClassifying, progress } = useSmartClassificationIntelligent();

// Clasifica array de email_ids con AI agent seleccionado
await classifyEmails(emailIds, userEmail, forceCategory?, selectedAgent?);
```

### 5.2 useEmailAIProcessor
**Archivo:** `src/hooks/useEmailAIProcessor.ts`

```typescript
const { processEmailWithAI, currentProposal, clearProposal } = useEmailAIProcessor();

// Procesa email individual con AI
await processEmailWithAI(emailUid, senderEmail, subject, body);
```

### 5.3 analyzeSenders
**Archivo:** `src/lib/email-sender-analyzer.ts`

```typescript
// Analiza todos los remitentes de un usuario
const senders = await analyzeSenders(userEmail, userId);
// Retorna: SenderAnalysis[] con estadísticas y estado de clasificación
```

⚠️ **Dependencia actual:** Lee de `email_messages` con paginación manual

### 5.4 emailSearchApi
**Archivo:** `src/lib/tmwe-email-search-api.ts`

```typescript
// API wrapper para TMWE API
const { email } = await emailSearchApi.getEmailDetail({ 
  email_id: tmweEmailId,
  include_body: true,
  timeout: 10
});

const { results } = await emailSearchApi.searchEmails({
  query: 'from:sender@example.com',
  limit: 100
});
```

---

## 6. Integración TMWE API

### 6.1 Arquitectura TMWE
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Supabase      │     │   RabbitMQ      │     │   Elasticsearch │
│   Edge Function │────▶│   Queue         │────▶│   + MySQL       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                                              │
         │              ┌─────────────────┐             │
         └──────────────│   tmwe-api-proxy│◀────────────┘
                        │   Edge Function │
                        └─────────────────┘
```

### 6.2 Handlers Disponibles

| Handler | Descripción | Parámetros |
|---------|-------------|------------|
| `search_emails` | Búsqueda ES | query, folder, limit, include_body |
| `get_message` | Detalle email | email_id, include_body |
| `move_message` | Mover email | email_id, target_folder |
| `delete_message` | Eliminar | email_id, permanent |
| `mark_read` | Marcar leído | email_id, read |
| `get_folders` | Lista folders | - |

### 6.3 Identificadores

| Campo | Tipo | Origen | Uso |
|-------|------|--------|-----|
| `email_id` | UUID | Supabase `email_messages` | Legacy (deprecating) |
| `email_uid` | string | UID IMAP servidor | Identificador IMAP |
| `tmwe_email_id` | integer | TMWE API (ES/MySQL) | **PRIMARY** - Nuevo estándar |

---

## 7. Plan de Migración Zero-Sync

### 7.1 Objetivo
Eliminar dependencia de `email_messages` table para operaciones AI, usando TMWE API como fuente única de datos de email.

### 7.2 Componentes a Migrar

| Componente | Estado | Cambio Requerido |
|------------|--------|------------------|
| `email-ai-processor` | ⚠️ Pendiente | Leer email via TMWE API |
| `suggest-sender-grouping` | ✅ OK | Ya recibe samples como param |
| `analyzeSenders()` | ⚠️ Pendiente | Usar TMWE API search |
| `SmartInboxTabIntelligent` | ✅ Parcial | Ya usa TMWE API parcialmente |
| `fun-email-ai-analysis` | ⚠️ Pendiente | Adaptar a TMWE API |

### 7.3 Beneficios Esperados
- ~95% reducción de sincronización
- Latencia reducida (1-2s vs 2-3s)
- Eliminación de duplicación de datos
- Acceso real-time a emails actualizados

---

## 8. Configuración y Secretos

### Variables de Entorno Requeridas
```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
LOVABLE_API_KEY=xxx                    # Auto-provisioned
TMWE_API_URL=https://api.tmwe.com      # 🆕 Required for Zero-Sync
TMWE_API_KEY=xxx                       # 🆕 Required for Zero-Sync
```

### Tablas de Configuración
- `config_ai` - API keys de providers AI (Gemini, GPT, Claude)
- `email_automation_config` - Configuración de auto-ejecución
- `ai_communication_preferences` - Preferencias AI por usuario

---

## 9. Métricas y Logging

### Tablas de Tracking
- `ai_cost_tracking` - Costos por llamada AI
- `email_auto_execution_log` - Log de ejecuciones automáticas
- `email_ai_automation_log` - Log de automatizaciones legacy

### Logs Edge Functions
Todos los Edge Functions incluyen logging estructurado:
```typescript
console.log('[AI Processor] 📧 Processing:', { email_id, operation });
console.log('[AI Processor] ✅ Classification:', classification);
console.error('[AI Processor] ❌ Error:', error);
```

---

## 10. Seguridad

### RLS Policies
- Todos los datos AI filtrados por `user_id` o `user_email`
- Clasificaciones solo visibles para el propietario
- Acciones pendientes aisladas por usuario

### Validación de Input
- Email IDs validados como UUID
- Categorías restringidas a enum predefinido
- Confianza limitada a rango 0-1
- Payload de acciones sanitizado
