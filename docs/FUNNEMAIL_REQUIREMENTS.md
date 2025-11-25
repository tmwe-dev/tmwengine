# FunEmail - Documento de Requisitos Funcionales

> **Versión:** 1.0  
> **Fecha:** 2025-01-29  
> **Estado:** Arquitectura Híbrida (Local DB + TMWE API)

---

## 1. VISIÓN GENERAL

### 1.1 Propósito
FunEmail es un sistema de gestión de email con IA integrada que permite:
- Backup local de emails desde servidor TMWE
- Clasificación inteligente con IA
- Agrupación automática de remitentes
- Automatización de acciones basadas en reglas

### 1.2 Módulos Principales
| Tab | Nombre | Descripción |
|-----|--------|-------------|
| 1 | **Fun** | Email Backup - Descarga y estadísticas locales |
| 2 | **Management** | Gestión de remitentes y grupos |
| 3 | **Suggestions** | Sugerencias AI de agrupamiento |
| 4 | **Inbox** | Smart Inbox con clasificación AI |
| 5 | **Automations** | Dashboard de automatizaciones AI |
| + | **Tools** | Herramientas de diagnóstico y debug |

### 1.3 Estado Arquitectónico Actual
```
⚠️ ARQUITECTURA HÍBRIDA NO COHERENTE

┌─────────────────────────────────────────────────────────┐
│                    FRONTEND                              │
│  ┌──────────────┐    ┌──────────────┐                   │
│  │ Components   │    │ Hooks        │                   │
│  │ (Mixed)      │    │ (Mixed)      │                   │
│  └──────┬───────┘    └──────┬───────┘                   │
│         │                   │                            │
│         ▼                   ▼                            │
│  ┌──────────────────────────────────────┐               │
│  │     Sin capa de abstracción          │ ❌ Anti-pattern│
│  └──────────────┬───────────────────────┘               │
│                 │                                        │
├─────────────────┼────────────────────────────────────────┤
│                 ▼                                        │
│  ┌──────────────────────┐  ┌──────────────────────┐     │
│  │   Supabase Client    │  │   emailSearchApi     │     │
│  │   (email_messages)   │  │   (TMWE API)         │     │
│  └──────────┬───────────┘  └──────────┬───────────┘     │
│             │                         │                  │
│             ▼                         ▼                  │
│  ┌──────────────────────┐  ┌──────────────────────┐     │
│  │   PostgreSQL         │  │   TMWE Server        │     │
│  │   (Local DB)         │  │   (Email Server)     │     │
│  └──────────────────────┘  └──────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

**Problemas Identificados:**
1. ❌ Violación Single Source of Truth
2. ❌ Identificadores inconsistentes (UUID vs INTEGER)
3. ❌ Repository Bypass (queries directas)
4. ❌ Edge Functions acopladas a DB local

---

## 2. REQUISITOS FUNCIONALES POR MÓDULO

### 2.1 RF-FUN: Tab "Fun" (Email Backup)

| ID | Requisito | Componente | Dependencia | Impacto |
|----|-----------|------------|-------------|---------|
| RF-FUN-01 | Descargar emails TMWE → DB local | `FunEmailDownloader` | `email_messages`, `tmwe-email-sync-master` | 🔴 Crítico |
| RF-FUN-02 | Mostrar estadísticas globales (total DB, por carpeta) | `FunEmailGlobalStats` | `email_messages` | 🔴 Crítico |
| RF-FUN-03 | Quick Stats (última sync, conteo rápido) | `FunEmailQuickStats` | `email_messages` | 🔴 Crítico |
| RF-FUN-04 | Chat AI sobre emails locales | `FunEmailChat` | `fun-email-ai-analysis`, `email_messages` | 🔴 Crítico |
| RF-FUN-05 | Comparación servidor vs DB local | `FunEmailComparison` | API + `email_messages` | 🟡 Medio |
| RF-FUN-06 | Selector de carpetas para descarga | `FunFolderSelector` | API folders | 🟢 Bajo |

**Notas:**
- Este módulo es **intencionalmente local** - su propósito es backup
- La migración API-Only NO aplica completamente aquí
- Sin embargo, las estadísticas podrían usar API cuando no hay backup

---

### 2.2 RF-MGT: Tab "Management"

| ID | Requisito | Componente | Dependencia | Impacto |
|----|-----------|------------|-------------|---------|
| RF-MGT-01 | Analizar y listar remitentes únicos | `SenderManagementTab` | `analyzeSenders()`, `email_messages` | 🔴 Crítico |
| RF-MGT-02 | Drag & Drop remitentes a grupos | `SenderCard`, `GroupDropZone` | `email_sender_rules` | 🟢 Bajo |
| RF-MGT-03 | Gestionar grupos de remitentes | `GroupManagement` | `email_sender_groups` | 🟢 Bajo |
| RF-MGT-04 | Crear categorías personalizadas | `CreateGroupDialog` | `email_sender_groups` | 🟢 Bajo |
| RF-MGT-05 | Vista Grid/Carousel de remitentes | `SenderGrid`, `SenderCarousel` | UI only | 🟢 Bajo |
| RF-MGT-06 | Sincronización incremental emails | `SyncControls` | `tmwe-email-sync-master` | 🔴 Crítico |
| RF-MGT-07 | Mostrar logo de empresa por dominio | `CompanyLogo` | `company_logos_cache` | 🟢 Bajo |

**Dependencia Crítica:**
```typescript
// src/lib/email-sender-analyzer.ts
analyzeSenders() {
  // ❌ Lee directamente de email_messages
  const { data } = await supabase
    .from('email_messages')
    .select('mittente, data_ricezione')
    .eq('user_email', userEmail);
}
```

---

### 2.3 RF-SUG: Tab "Suggestions" (AI Raggruppamento)

| ID | Requisito | Componente | Dependencia | Impacto |
|----|-----------|------------|-------------|---------|
| RF-SUG-01 | Generar sugerencias AI de agrupamiento | `AICategorizationPanel` | `email_sender_grouping_suggestions`, `email_messages` | 🔴 Crítico |
| RF-SUG-02 | Filtrar sugerencias por grupo/dominio | `SuggestionFilters` | `email_sender_grouping_suggestions` | 🟢 Bajo |
| RF-SUG-03 | Aprobar sugerencia individual | `SuggestionCard` | `email_sender_rules` | 🟢 Bajo |
| RF-SUG-04 | Rechazar sugerencia individual | `SuggestionCard` | `email_sender_grouping_suggestions` | 🟢 Bajo |
| RF-SUG-05 | Bulk approve sugerencias | `BulkActions` | `email_sender_rules` | 🟢 Bajo |
| RF-SUG-06 | Generar Knowledge Base de grupos | `GenerateKBButton` | `generate-group-context`, `email_messages` | 🔴 Crítico |
| RF-SUG-07 | Vista estadísticas de sugerencias | `SuggestionStats` | `email_sender_grouping_suggestions` | 🟢 Bajo |

**Dependencia Crítica:**
- Edge Function `generate-group-context` lee emails de `email_messages` para generar contexto

---

### 2.4 RF-INB: Tab "Inbox" (Smart Inbox Intelligent)

| ID | Requisito | Componente | Dependencia | Impacto |
|----|-----------|------------|-------------|---------|
| RF-INB-01 | Clasificar emails con AI | `useSmartClassificationIntelligent` | `email-ai-processor`, `email_messages` | 🔴 Crítico |
| RF-INB-02 | Listar emails por categoría AI | `SmartEmailList` | `email_ai_classifications` | 🟡 Medio |
| RF-INB-03 | Filtrar por carpeta IMAP | `FolderSelector` | API folders / `email_messages.cartella` | 🔴 Crítico |
| RF-INB-04 | Filtrar solo no leídos | `UnreadFilter` | API / `email_messages.letto` | 🟡 Medio |
| RF-INB-05 | Ver detalle de email clasificado | `SmartEmailDetail` | `tmwe_email_id` o `email_id` (UUID) | 🔴 Crítico |
| RF-INB-06 | Sidebar categorías colapsable | `CategorySidebar` | `email_ai_classifications` stats | 🟢 Bajo |
| RF-INB-07 | Acciones rápidas AI | `QuickActionsPanel` | `useEmailAIAutomation` | 🟡 Medio |
| RF-INB-08 | Navegación swipe entre emails | `EmailSwipeNavigation` | UI only | 🟢 Bajo |
| RF-INB-09 | Vistas: Split/Detail/List | `ViewModeSelector` | UI only | 🟢 Bajo |
| RF-INB-10 | Procesamiento AI batch | `BatchProcessButton` | `email-ai-processor`, `email_messages` | 🔴 Crítico |
| RF-INB-11 | Mostrar resumen AI del email | `AISummaryBadge` | `email_ai_classifications.ai_summary` | 🟢 Bajo |
| RF-INB-12 | Indicador de urgencia AI | `UrgencyIndicator` | `email_ai_classifications.urgency` | 🟢 Bajo |

**Bloqueador Principal:**
```sql
-- Tabla email_ai_classifications
-- 137 registros existentes
-- ❌ 100% usan email_id (UUID local)
-- ❌ 0% tienen tmwe_email_id

SELECT 
  COUNT(*) as total,
  COUNT(email_message_id) as con_uuid,
  COUNT(tmwe_email_id) as con_tmwe_id
FROM email_ai_classifications;
-- Resultado: total=137, con_uuid=137, con_tmwe_id=0
```

---

### 2.5 RF-AUT: Tab "Automations"

| ID | Requisito | Componente | Dependencia | Impacto |
|----|-----------|------------|-------------|---------|
| RF-AUT-01 | Dashboard prompts AI configurados | `AutomationPromptList` | `email_sender_ai_prompts` | 🟢 Bajo |
| RF-AUT-02 | Activar/Desactivar prompts | `PromptToggle` | `email_sender_ai_prompts.is_active` | 🟢 Bajo |
| RF-AUT-03 | Ver logs de ejecución AI | `ExecutionLogs` | `email_ai_execution_log` | 🟢 Bajo |
| RF-AUT-04 | Panel de acciones pendientes | `PendingActionsPanel` | `email_ai_pending_actions` | 🟢 Bajo |
| RF-AUT-05 | Learning Dashboard (feedback) | `LearningDashboard` | `email_ai_learning_feedback` | 🟢 Bajo |
| RF-AUT-06 | Actividades generadas por AI | `GeneratedActivities` | `email_ai_generated_activities` | 🟢 Bajo |
| RF-AUT-07 | Configurar acciones por categoría | `CategoryActionsConfig` | `email_category_actions` | 🟢 Bajo |

**Notas:**
- Este módulo trabaja principalmente con **metadata**, no contenido de emails
- Impacto de migración: **BAJO** - puede funcionar independiente del source de emails

---

### 2.6 RF-TOOLS: Herramientas

| ID | Requisito | Componente | Dependencia | Impacto |
|----|-----------|------------|-------------|---------|
| RF-TOOLS-01 | Quick Email Downloader | `QuickEmailDownloader` | `useEmailDownload`, `email_messages` | 🔴 Crítico |
| RF-TOOLS-02 | Email Integrity Checker | `EmailIntegrityChecker` | API + `email_messages` | 🔴 Crítico |
| RF-TOOLS-03 | Email Count Diagnostics | `EmailCountDiagnostics` | API + `email_messages` | 🔴 Crítico |
| RF-TOOLS-04 | Single Mail Importer | `SingleMailImporter` | `email_messages` | 🔴 Crítico |
| RF-TOOLS-05 | Backend Debugger | `TmweBackendDebugger` | API only | 🟢 Bajo |
| RF-TOOLS-06 | Folder Verification | `VerifyFolderNames` | ~~`verify-folder-names`~~ (DEPRECATED) | ⬛ Eliminado |

---

## 3. REQUISITOS NO FUNCIONALES

| ID | Requisito | Estado | Notas |
|----|-----------|--------|-------|
| RNF-01 | Tiempo de respuesta < 3s para listas de emails | ✅ Cumple | Con paginación |
| RNF-02 | Soporte para rate limits TMWE API | ⚠️ Parcial | Falta retry exponencial |
| RNF-03 | Cache local para modo offline | ❌ No implementado | - |
| RNF-04 | Consistencia de identificadores | ❌ Violado | UUID vs INTEGER |
| RNF-05 | Logs de operaciones críticas | ✅ Cumple | `project_history` |
| RNF-06 | Backup antes de modificaciones | ✅ Cumple | Sistema `-oldX` |
| RNF-07 | Paginación en listas largas | ✅ Cumple | 50 items default |
| RNF-08 | Responsive design | ✅ Cumple | Mobile-first |

---

## 4. DEPENDENCIAS CRÍTICAS

### 4.1 Tablas Principales

#### `email_messages` (LOCAL DB)
```sql
-- Tabla principal de emails descargados
CREATE TABLE email_messages (
  id UUID PRIMARY KEY,           -- ❌ Identificador local
  message_id TEXT,               -- ID del servidor
  user_email TEXT,
  mittente JSONB,
  destinatario JSONB,
  oggetto TEXT,
  corpo_text TEXT,
  corpo_html TEXT,
  data_ricezione TIMESTAMP,
  cartella TEXT,                 -- ⚠️ Nombre puede diferir del API
  letto BOOLEAN,
  -- ❌ FALTA: tmwe_email_id INTEGER
);

-- Usada por: 15+ componentes
-- Estado: Fuente primaria actual (incorrectamente)
```

#### `email_ai_classifications`
```sql
-- Clasificaciones AI de emails
CREATE TABLE email_ai_classifications (
  id UUID PRIMARY KEY,
  email_message_id UUID,         -- ❌ Referencia local (137 registros)
  email_uid TEXT,                -- UID IMAP
  folder_name TEXT,              -- Carpeta
  tmwe_email_id INTEGER,         -- ✅ Existe pero sin usar (0 registros)
  user_email TEXT,
  category TEXT,
  confidence NUMERIC,
  ai_summary TEXT,
  urgency TEXT,
  -- ... más campos
);

-- PROBLEMA: 137 clasificaciones existentes NO tienen tmwe_email_id
```

#### `email_sender_groups`
```sql
-- Grupos de remitentes
CREATE TABLE email_sender_groups (
  id UUID PRIMARY KEY,
  name TEXT,
  type TEXT,                     -- 'system' | 'custom'
  color TEXT,
  icon TEXT,
  description TEXT
);
-- Estado: ✅ Sin dependencia de emails
```

#### `email_sender_rules`
```sql
-- Reglas de asignación remitente → grupo
CREATE TABLE email_sender_rules (
  id UUID PRIMARY KEY,
  sender_email TEXT,
  sender_domain TEXT,
  group_id UUID REFERENCES email_sender_groups,
  rule_type TEXT,
  created_by TEXT
);
-- Estado: ✅ Sin dependencia de emails
```

### 4.2 Edge Functions Críticas

| Function | Lee de | Escribe en | Estado |
|----------|--------|------------|--------|
| `email-ai-processor` | `email_messages` | `email_ai_classifications` | 🔴 Requiere migración |
| `tmwe-email-sync-master` | TMWE API | `email_messages` | 🟡 OK para backup |
| `fun-email-ai-analysis` | `email_messages` | - (respuesta) | 🔴 Requiere migración |
| `generate-group-context` | `email_messages` | `email_sender_groups.context` | 🔴 Requiere migración |
| `tmwe-api-proxy` | TMWE API | - (proxy) | ✅ OK |

### 4.3 Hooks Críticos

| Hook | Fuente de datos | Estado |
|------|-----------------|--------|
| `useEmailList` | `emailSearchApi` | ✅ Migrado |
| `useSmartClassificationIntelligent` | `email-ai-processor` → `email_messages` | 🔴 Indirecto |
| `useSenderAnalysis` | `analyzeSenders()` → `email_messages` | 🔴 Requiere migración |
| `useEmailDownload` | TMWE API → `email_messages` | 🟡 OK para backup |

---

## 5. ESTADO DE MIGRACIÓN API-ONLY

### 5.1 Componentes Migrados ✅

| Componente | Archivo | Fecha | Notas |
|------------|---------|-------|-------|
| `useEmailList` | `src/hooks/useEmailList.ts` | 2025-01 | Usa `emailSearchApi` |
| `EmailSyncStatus` | `src/components/tmwe/EmailSyncStatus.tsx` | 2025-01 | Solo muestra stats API |
| `SmartInboxSyncGuard` | `src/components/email/smart-inbox/SmartInboxSyncGuard.tsx` | 2025-01 | Bypass - no sync check |

### 5.2 Componentes Pendientes 🔄

| Componente | Archivo | Bloqueador |
|------------|---------|------------|
| `SmartInboxTabIntelligent` | `src/components/email/smart-inbox/SmartInboxTabIntelligent.tsx` | Usa `email_messages` para folders |
| `analyzeSenders()` | `src/lib/email-sender-analyzer.ts` | Lee de `email_messages` |
| `email-ai-processor` | `supabase/functions/email-ai-processor/` | Lee contenido de `email_messages` |

### 5.3 Componentes Bloqueados ❌

| Componente | Bloqueador | Solución Propuesta |
|------------|------------|-------------------|
| `SmartEmailDetail` | 137 clasificaciones sin `tmwe_email_id` | Migración de datos |
| `CategoryStats` | Join con `email_messages` | Cambiar a API counts |

---

## 6. MATRIZ DE IMPACTO DE MIGRACIÓN

### 6.1 Por Módulo

| Módulo | Impacto | % Requisitos Afectados | Prioridad |
|--------|---------|------------------------|-----------|
| Fun | 🔴 Alto | 66% (4/6) | Baja (es backup) |
| Management | 🟡 Medio | 28% (2/7) | Media |
| Suggestions | 🟡 Medio | 28% (2/7) | Media |
| Inbox | 🔴 Alto | 50% (6/12) | **ALTA** |
| Automations | 🟢 Bajo | 0% (0/7) | Baja |
| Tools | 🔴 Alto | 66% (4/6) | Media |

### 6.2 Por Tipo de Cambio

| Tipo | Cantidad | Ejemplos |
|------|----------|----------|
| Edge Function refactor | 3 | `email-ai-processor`, `fun-email-ai-analysis`, `generate-group-context` |
| Hook refactor | 2 | `useSenderAnalysis`, `useSmartClassificationIntelligent` |
| Migración de datos | 1 | 137 clasificaciones → añadir `tmwe_email_id` |
| Component update | 4+ | `SmartInboxTabIntelligent`, `SmartEmailDetail`, etc. |

---

## 7. PLAN DE MIGRACIÓN RECOMENDADO

### Sprint 2A: Clasificación API-Only (Prioridad ALTA)
1. **Modificar `email-ai-processor`** para obtener contenido vía `emailSearchApi.getEmailDetail()`
2. **Añadir `tmwe_email_id`** a nuevas clasificaciones
3. **Migrar 137 clasificaciones existentes** (match por `email_uid` + `folder_name`)

### Sprint 2B: Inbox API-Only
1. Refactorizar `SmartInboxTabIntelligent` para obtener carpetas vía API
2. Eliminar dependencia de `email_messages.cartella`
3. Actualizar `SmartEmailDetail` para usar `tmwe_email_id`

### Sprint 2C: Management API-Only
1. Refactorizar `analyzeSenders()` para usar `emailSearchApi.search()`
2. Crear endpoint de agregación de remitentes en API

### Sprint 2D: Suggestions API-Only
1. Modificar conteos de email para usar API
2. Refactorizar `generate-group-context` para leer de API

---

## 8. DECISIONES ARQUITECTÓNICAS

### 8.1 Mantener DB Local Para:
- ✅ Tab "Fun" (backup es su propósito)
- ✅ Tab "Automations" (metadata, no contenido)
- ✅ Grupos y reglas de remitentes

### 8.2 Migrar a API-Only Para:
- 🔄 Tab "Inbox" (clasificación y visualización)
- 🔄 Tab "Suggestions" (generación de sugerencias)
- 🔄 Tab "Management" (análisis de remitentes)

### 8.3 Arquitectura Objetivo
```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND                              │
│  ┌──────────────────────────────────────────────────┐   │
│  │              EmailService (Facade)                │   │
│  │  - getEmails()     - classifyEmail()             │   │
│  │  - getEmailDetail() - getSenderStats()           │   │
│  └──────────────────────┬───────────────────────────┘   │
│                         │                                │
│         ┌───────────────┼───────────────┐               │
│         ▼               ▼               ▼               │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │ TMWEAdapter│  │ LocalAdapter│  │ HybridAdapter│       │
│  │ (API-Only) │  │ (Backup)   │  │ (Fallback) │        │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘        │
│        │               │               │                │
├────────┼───────────────┼───────────────┼────────────────┤
│        ▼               ▼               ▼                │
│  ┌──────────┐   ┌──────────────┐                        │
│  │ TMWE API │   │ Supabase DB  │                        │
│  └──────────┘   └──────────────┘                        │
└─────────────────────────────────────────────────────────┘
```

---

## 9. CHANGELOG

| Fecha | Versión | Cambios |
|-------|---------|---------|
| 2025-01-29 | 1.0 | Documento inicial creado |

---

## 10. REFERENCIAS

- `docs/EDGE_FUNCTIONS_CHANGELOG.md` - Historial de cambios en Edge Functions
- `docs/DATABASE_INFO.md` - Información de esquema de base de datos
- `src/lib/tmwe-email-search-api.ts` - API client principal
- `src/types/smart-inbox.ts` - Tipos de Smart Inbox
