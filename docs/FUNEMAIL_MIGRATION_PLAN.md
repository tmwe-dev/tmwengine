# 🚀 PLAN DE MIGRACIÓN FUNEMAIL → ZERO-SYNC ARCHITECTURE

**Versión:** 3.1 - Fresh Start Edition  
**Fecha:** 2025-01-29  
**Objetivo:** Migración completa a arquitectura Zero-Sync con tablas optimizadas para TMWE API y coexistencia con legacy

---

## 📋 ÍNDICE

1. [Estrategia Fresh Start](#estrategia-fresh-start)
2. [Componentes Existentes a Reutilizar](#componentes-existentes-a-reutilizar)
3. [Arquitectura Propuesta](#arquitectura-propuesta)
4. [Nuevas Tablas Optimizadas](#nuevas-tablas-optimizadas)
5. [Estrategia de Coexistencia Legacy](#estrategia-de-coexistencia-legacy)
6. [Capa de Abstracción API](#capa-de-abstracción-api)
7. [Gestión Centralizada OAuth](#gestión-centralizada-oauth)
8. [Planes de Migración por Caso de Uso](#planes-de-migración-por-caso-de-uso)
9. [Matriz de Trazabilidad](#matriz-de-trazabilidad)
10. [Roadmap de Implementación](#roadmap-de-implementación)
11. [Testing y Validación](#testing-y-validación)
12. [Beneficios Plan v3.1](#beneficios-plan-v31)

---

## 🆕 ESTRATEGIA FRESH START

### Justificación

**Análisis de Datos Existentes:**
```sql
-- VERIFICACIÓN REALIZADA 2025-01-29
SELECT COUNT(*) FROM email_ai_classifications WHERE tmwe_email_id IS NOT NULL;
-- Resultado: 0 registros

SELECT COUNT(*) FROM email_messages WHERE tmwe_email_id IS NOT NULL;
-- Resultado: 0 registros
```

**Conclusión:** No existen datos vinculados a `tmwe_email_id`, por lo tanto:
- ❌ NO necesitamos migrar datos existentes
- ✅ Podemos crear tablas optimizadas desde cero
- ✅ Evitamos complejidad de scripts de migración
- ✅ Diseño nativo para TMWE API desde el inicio

### Filosofía: "Clean Slate for TMWE"

**Principios:**
1. **Tablas nuevas optimizadas** para TMWE API como fuente única de datos
2. **Sin dependencias locales** - No más UUIDs locales como claves primarias
3. **Coexistencia temporal** - Legacy tables permanecen intactas durante transición
4. **Feature flag system** - Activación gradual de nuevas tablas
5. **Plan de deprecación** - Roadmap claro para sunset de legacy

---

## 🔄 COMPONENTES EXISTENTES A REUTILIZAR

### ⚠️ NO MODIFICAR - Código Probado en Producción

Estos archivos YA FUNCIONAN y serán consumidos por los nuevos wrappers/facades:

| Archivo | Función | Tipo |
|---------|---------|------|
| `src/hooks/useTMWEAuth.tsx` | Context de autenticación completo | Hook |
| `src/components/tmwe/IntegratedAuthGuard.tsx` | Guard con verificación de expiración | Component |
| `src/lib/tmwe-api-integrated.ts` | Funciones OAuth core | Library |
| `src/lib/tmwe-email-search-api.ts` | Cliente API optimizado | Library |
| `supabase/functions/tmwe-api-proxy/index.ts` | Edge Function centralizada | Backend |
| `supabase/functions/_shared/oauth-manager.ts` | Gestión de tokens backend | Backend |

### Funciones Disponibles para Reutilización

**De `tmwe-api-integrated.ts`:**
- `getApiConfigFromDB()` - Obtener configuración OAuth de DB
- `setApiConfigToDB()` - Guardar configuración OAuth
- `ensureValidToken()` - Obtener token válido (auto-refresh)
- `refreshAccessToken()` - Renovar token manualmente
- `initiateAuthorizationCodeFlow()` - Iniciar flujo OAuth
- `clearApiConfigFromDB()` - Limpiar tokens

**De `tmwe-email-search-api.ts`:**
- `emailSearchApi.getEmailsMetadata()` - Lista de emails
- `emailSearchApi.getEmailDetail()` - Detalle de email
- `emailSearchApi.searchEmails()` - Búsqueda full-text
- `emailSearchApi.getFolders()` - Lista de carpetas
- `emailSearchApi.getStatistics()` - Estadísticas
- `emailSearchApi.markAsRead()` - Marcar como leído
- `emailSearchApi.getThread()` - Obtener thread de conversación

---

## 🏗️ ARQUITECTURA PROPUESTA

### Estructura de Capas

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  (React Components - FunEmail.tsx, SmartInbox, etc.)        │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    BUSINESS LOGIC LAYER                      │
│  (Custom Hooks - useEmailList, useEmailDetail, etc.)         │
│  + useTMWEAuth.tsx (YA EXISTE ✅)                            │
│  + IntegratedAuthGuard.tsx (YA EXISTE ✅)                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              API ABSTRACTION LAYER (NUEVO)                   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  TMWEAuthManager.ts (WRAPPER)                       │    │
│  │  └─→ Delega a: ensureValidToken()                   │    │
│  │                 refreshAccessToken()                │    │
│  │                 getApiConfigFromDB()                │    │
│  │      (de src/lib/tmwe-api-integrated.ts)            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  TMWEApiClient.ts (FACADE)                          │    │
│  │  └─→ Delega a: supabase.functions.invoke(           │    │
│  │                    'tmwe-api-proxy', {...}          │    │
│  │                )                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  API Modules (WRAPPERS)                             │    │
│  │  - EmailApi → emailSearchApi.getEmailsMetadata()    │    │
│  │             → emailSearchApi.getEmailDetail()       │    │
│  │             → emailSearchApi.searchEmails()         │    │
│  │  - FolderApi → emailSearchApi.getFolders()          │    │
│  │              → emailSearchApi.getStatistics()       │    │
│  │  - ClassificationApi → tmwe_classifications (NEW)   │    │
│  │  - SenderApi → tmwe_sender_profiles (NEW)           │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│             INFRASTRUCTURE LAYER (YA EXISTE ✅)              │
│  - tmwe-api-integrated.ts (OAuth core)                       │
│  - tmwe-email-search-api.ts (API client)                     │
│  - tmwe-api-proxy (Edge Function consolidada)                │
│  - oauth-manager.ts (Backend token management)               │
│  - React Query Cache                                         │
│  - Supabase Client                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ NUEVAS TABLAS OPTIMIZADAS

### Tabla 1: `tmwe_classifications`

**Propósito:** Clasificaciones de emails optimizadas para TMWE API (reemplaza `email_ai_classifications`)

**Diferencias clave vs Legacy:**
- ✅ Usa `tmwe_email_id` (integer) como referencia principal
- ✅ NO depende de UUID local
- ✅ Incluye `subject_preview` para mostrar en listas sin query adicional
- ✅ Índices optimizados para queries frecuentes

**DDL:**
```sql
CREATE TABLE public.tmwe_classifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referencias TMWE API (no UUIDs locales)
  tmwe_email_id integer NOT NULL,           -- UID del email en TMWE
  folder_name text NOT NULL,                -- Carpeta original
  user_email text NOT NULL,                 -- Usuario propietario
  
  -- Datos de clasificación
  category text NOT NULL,                   -- Categoría asignada
  confidence numeric(3,2),                  -- Confianza IA (0.00-1.00)
  ai_summary text,                          -- Resumen generado por IA
  keywords text[],                          -- Keywords detectadas
  
  -- Metadata adicional
  sender_email text NOT NULL,               -- Para filtros rápidos
  sender_domain text NOT NULL,              -- Para agrupación
  subject_preview text,                     -- Preview del asunto (max 100 chars)
  
  -- Enhancements SmartInbox
  urgency text CHECK (urgency IN ('critical', 'high', 'normal', 'low')),
  action_suggested text,                    -- Acción sugerida
  detected_patterns text[],                 -- Patrones detectados
  reasoning text,                           -- Razonamiento IA
  tags text[],                              -- Tags personalizadas
  custom_prompt text,                       -- Prompt usado
  
  -- Verificación y timestamps
  is_verified boolean DEFAULT false,        -- Clasificación verificada manualmente
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraint único
  UNIQUE(tmwe_email_id, folder_name, user_email)
);

-- Índices optimizados
CREATE INDEX idx_tmwe_class_user_category 
  ON tmwe_classifications(user_email, category);
  
CREATE INDEX idx_tmwe_class_sender 
  ON tmwe_classifications(sender_email);
  
CREATE INDEX idx_tmwe_class_urgency 
  ON tmwe_classifications(user_email, urgency) 
  WHERE urgency IN ('critical', 'high');

-- RLS Policies
ALTER TABLE tmwe_classifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own classifications"
  ON tmwe_classifications FOR SELECT
  USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users insert own classifications"
  ON tmwe_classifications FOR INSERT
  WITH CHECK (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users update own classifications"
  ON tmwe_classifications FOR UPDATE
  USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users delete own classifications"
  ON tmwe_classifications FOR DELETE
  USING (auth.jwt() ->> 'email' = user_email);

-- Trigger para updated_at
CREATE TRIGGER update_tmwe_classifications_updated_at
  BEFORE UPDATE ON tmwe_classifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

### Tabla 2: `tmwe_sender_profiles`

**Propósito:** Perfiles unificados de remitentes optimizados para TMWE (reemplaza `email_sender_groups` + mappings)

**Diferencias clave vs Legacy:**
- ✅ Un solo registro por remitente (no N mappings)
- ✅ Estadísticas integradas (no queries separadas)
- ✅ Configuración completa en un lugar
- ✅ Diseño desnormalizado para performance

**DDL:**
```sql
CREATE TABLE public.tmwe_sender_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificación remitente
  sender_email text NOT NULL,               -- Email del remitente
  sender_domain text NOT NULL,              -- Dominio extraído
  sender_name text,                         -- Nombre detectado
  user_email text NOT NULL,                 -- Usuario propietario
  
  -- Agrupación y clasificación
  group_id uuid,                            -- Grupo asignado (FK a tmwe_sender_groups si se usa)
  group_name text,                          -- Nombre del grupo (desnormalizado)
  group_color text,                         -- Color del grupo
  group_icon text,                          -- Icono del grupo
  category text,                            -- Categoría (business, personal, etc.)
  
  -- Estadísticas integradas
  total_emails integer DEFAULT 0,           -- Total emails de este remitente
  unread_count integer DEFAULT 0,           -- Emails sin leer
  last_email_date timestamptz,              -- Fecha último email
  first_email_date timestamptz,             -- Fecha primer email
  avg_response_time_hours numeric(10,2),    -- Tiempo promedio de respuesta
  
  -- Configuración de reglas (integrada)
  auto_archive boolean DEFAULT false,       -- Archivar automáticamente
  auto_delete boolean DEFAULT false,        -- Eliminar automáticamente
  auto_label text,                          -- Etiqueta automática
  move_to_folder text,                      -- Mover a carpeta
  priority_level integer DEFAULT 0,         -- Nivel de prioridad (-10 a +10)
  
  -- Metadata
  logo_url text,                            -- URL del logo (Company Logos Cache)
  notes text,                               -- Notas del usuario
  is_blocked boolean DEFAULT false,         -- Remitente bloqueado
  is_favorite boolean DEFAULT false,        -- Remitente favorito
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_sync_at timestamptz,                 -- Última sincronización de stats
  
  -- Constraint único
  UNIQUE(sender_email, user_email)
);

-- Índices optimizados
CREATE INDEX idx_tmwe_sender_user 
  ON tmwe_sender_profiles(user_email);
  
CREATE INDEX idx_tmwe_sender_domain 
  ON tmwe_sender_profiles(sender_domain);
  
CREATE INDEX idx_tmwe_sender_group 
  ON tmwe_sender_profiles(group_id) 
  WHERE group_id IS NOT NULL;

CREATE INDEX idx_tmwe_sender_favorites 
  ON tmwe_sender_profiles(user_email, is_favorite) 
  WHERE is_favorite = true;

-- RLS Policies
ALTER TABLE tmwe_sender_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sender profiles"
  ON tmwe_sender_profiles FOR SELECT
  USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users manage own sender profiles"
  ON tmwe_sender_profiles FOR ALL
  USING (auth.jwt() ->> 'email' = user_email);

-- Trigger para updated_at
CREATE TRIGGER update_tmwe_sender_profiles_updated_at
  BEFORE UPDATE ON tmwe_sender_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

### Tabla 3: `tmwe_classification_rules`

**Propósito:** Reglas simplificadas de clasificación automática (reemplaza lógica compleja de `email_sender_rules`)

**Diferencias clave vs Legacy:**
- ✅ Scope claro (global vs por remitente)
- ✅ Condiciones y acciones simples
- ✅ Fácil de aplicar client-side
- ✅ No triggers complejos en DB

**DDL:**
```sql
CREATE TABLE public.tmwe_classification_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Propietario
  user_email text NOT NULL,
  
  -- Scope de la regla
  rule_scope text NOT NULL CHECK (rule_scope IN ('global', 'sender', 'domain', 'subject')),
  rule_name text NOT NULL,
  rule_description text,
  
  -- Condiciones
  sender_email text,                        -- Si scope = 'sender'
  sender_domain text,                       -- Si scope = 'domain'
  subject_contains text,                    -- Si scope = 'subject'
  keywords_match text[],                    -- Keywords a buscar
  
  -- Acciones
  assign_category text,                     -- Asignar categoría
  assign_urgency text CHECK (assign_urgency IN ('critical', 'high', 'normal', 'low')),
  add_tags text[],                          -- Añadir tags
  auto_archive boolean DEFAULT false,
  auto_delete boolean DEFAULT false,
  move_to_folder text,
  
  -- Configuración
  priority integer DEFAULT 0,               -- Prioridad de ejecución (mayor primero)
  is_active boolean DEFAULT true,
  stop_if_matched boolean DEFAULT false,    -- Detener evaluación de otras reglas
  
  -- Metadata
  apply_count integer DEFAULT 0,            -- Veces aplicada
  last_applied_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Validación
  CHECK (
    (rule_scope = 'sender' AND sender_email IS NOT NULL) OR
    (rule_scope = 'domain' AND sender_domain IS NOT NULL) OR
    (rule_scope = 'subject' AND subject_contains IS NOT NULL) OR
    (rule_scope = 'global')
  )
);

-- Índices
CREATE INDEX idx_tmwe_rules_user 
  ON tmwe_classification_rules(user_email, is_active) 
  WHERE is_active = true;
  
CREATE INDEX idx_tmwe_rules_priority 
  ON tmwe_classification_rules(user_email, priority DESC) 
  WHERE is_active = true;

-- RLS Policies
ALTER TABLE tmwe_classification_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own rules"
  ON tmwe_classification_rules FOR ALL
  USING (auth.jwt() ->> 'email' = user_email);

-- Trigger para updated_at
CREATE TRIGGER update_tmwe_classification_rules_updated_at
  BEFORE UPDATE ON tmwe_classification_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## 🔄 ESTRATEGIA DE COEXISTENCIA LEGACY

### Feature Flag System

**Implementación:**

```typescript
// src/lib/tmwe/config.ts
export const TMWE_FEATURE_FLAGS = {
  // Tablas nuevas
  USE_TMWE_CLASSIFICATIONS: true,    // tmwe_classifications vs email_ai_classifications
  USE_TMWE_SENDER_PROFILES: true,    // tmwe_sender_profiles vs email_sender_groups
  USE_TMWE_RULES: true,              // tmwe_classification_rules vs email_sender_rules
  
  // Funcionalidad
  ENABLE_LEGACY_FALLBACK: true,      // Fallback a tablas legacy si falla nueva
  SHOW_MIGRATION_BANNER: true,       // Banner de migración en UI
} as const;

// Helper para verificar feature
export const isFeatureEnabled = (feature: keyof typeof TMWE_FEATURE_FLAGS): boolean => {
  return TMWE_FEATURE_FLAGS[feature];
};
```

**Uso en Código:**

```typescript
// src/hooks/email/useSmartClassification.ts
import { isFeatureEnabled } from '@/lib/tmwe/config';

export const useSmartClassification = () => {
  const useTmweTables = isFeatureEnabled('USE_TMWE_CLASSIFICATIONS');
  
  return useQuery({
    queryKey: ['classifications', useTmweTables ? 'tmwe' : 'legacy'],
    queryFn: async () => {
      if (useTmweTables) {
        // Usar tmwe_classifications
        const { data } = await supabase
          .from('tmwe_classifications')
          .select('*');
        return data;
      } else {
        // Fallback a email_ai_classifications
        const { data } = await supabase
          .from('email_ai_classifications')
          .select('*');
        return data;
      }
    }
  });
};
```

---

### Comparativa: Legacy vs Fresh Start V3.1

| Aspecto | Legacy Tables | TMWE Tables V3.1 | Ventaja |
|---------|---------------|------------------|---------|
| **SmartInbox** | `email_ai_classifications` con UUIDs locales | `tmwe_classifications` con `tmwe_email_id` | ✅ No migración de datos<br>✅ Nativo para TMWE API |
| **Remitentes** | `email_sender_groups` + `email_sender_mappings` | `tmwe_sender_profiles` unificado | ✅ Menos queries<br>✅ Stats integradas |
| **Reglas** | Triggers complejos en DB | Client-side filtering simple | ✅ Más flexible<br>✅ Fácil debugging |
| **Queries** | 3-4 JOINs promedio | 1-2 queries directas | ✅ Mejor performance |
| **Complejidad** | Alta (FK constraints, triggers) | Baja (desnormalizado) | ✅ Más mantenible |
| **Rollback** | Difícil (migración de vuelta) | Fácil (cambiar feature flag) | ✅ Menos riesgo |

---

### Plan de Deprecación de Legacy

**Fase 1: Coexistencia (Sprints 1-4)**
- ✅ Tablas nuevas creadas
- ✅ Feature flags activos
- ✅ Código usa tablas nuevas por defecto
- ⚠️ Legacy tables intactas (read-only)

**Fase 2: Migración Opcional (Sprint 5)**
- ✅ Script de migración disponible (opcional)
- ✅ Banner en UI sugiriendo migración
- ⚠️ Usuario decide si migra datos legacy

**Fase 3: Deprecación (Post-lanzamiento, +2 meses)**
- ⚠️ Warning: "Legacy tables serán removidas en 30 días"
- ✅ Documentación de cómo exportar datos legacy
- ✅ Final cleanup de código legacy

**Fase 4: Sunset (Post-lanzamiento, +3 meses)**
- ❌ Eliminar feature flags
- ❌ Eliminar código de fallback
- ❌ (Opcional) DROP legacy tables si usuario confirma

---

## 🔐 GESTIÓN CENTRALIZADA OAUTH

### 1. TMWEAuthManager (Wrapper Pattern)

**Ubicación:** `src/lib/tmwe/TMWEAuthManager.ts`

**Estrategia:** WRAPPER sobre funciones existentes - NO reimplementa, DELEGA

**Implementación:**

```typescript
// WRAPPER - NO reimplementa, DELEGA a funciones existentes
import { 
  ensureValidToken,
  refreshAccessToken,
  getApiConfigFromDB,
  setApiConfigToDB,
  clearApiConfigFromDB
} from '@/lib/tmwe-api-integrated';

export class TMWEAuthManager {
  private static instance: TMWEAuthManager;
  
  static getInstance(): TMWEAuthManager {
    if (!this.instance) {
      this.instance = new TMWEAuthManager();
    }
    return this.instance;
  }

  // DELEGA a función existente
  async getValidToken(): Promise<string> {
    return await ensureValidToken();
  }
  
  // DELEGA a función existente
  async refreshToken(): Promise<boolean> {
    return await refreshAccessToken();
  }
  
  // DELEGA a función existente
  async getConfig() {
    return await getApiConfigFromDB();
  }
  
  async isTokenValid(): Promise<boolean> {
    const config = await getApiConfigFromDB();
    if (!config?.expiresAt) return false;
    return new Date(config.expiresAt) > new Date();
  }
  
  async clearTokens(): void {
    await clearApiConfigFromDB();
  }
}
```

---

## 🌐 CAPA DE ABSTRACCIÓN API

### 2. TMWEApiClient (Facade Pattern)

**Ubicación:** `src/lib/tmwe/TMWEApiClient.ts`

**Estrategia:** FACADE sobre Edge Function existente `tmwe-api-proxy`

**Implementación:**

```typescript
// FACADE - Usa Edge Function existente como backend
import { supabase } from '@/integrations/supabase/client';
import { TMWEAuthManager } from './TMWEAuthManager';

export class TMWEApiClient {
  private static instance: TMWEApiClient;
  private authManager: TMWEAuthManager;
  
  private constructor() {
    this.authManager = TMWEAuthManager.getInstance();
  }
  
  static getInstance(): TMWEApiClient {
    if (!this.instance) {
      this.instance = new TMWEApiClient();
    }
    return this.instance;
  }
  
  // DELEGA a Edge Function existente
  async request<T>(endpoint: string, data: any): Promise<T> {
    const token = await this.authManager.getValidToken();
    
    const { data: response, error } = await supabase.functions.invoke('tmwe-api-proxy', {
      body: {
        endpoint,
        data: { ...data, bearerToken: token }
      }
    });
    
    if (error) throw new Error(`API Error: ${error.message}`);
    return response as T;
  }
}
```

---

### 3. API Modules Actualizados

#### ClassificationApi (Usa `tmwe_classifications`)

**Ubicación:** `src/lib/tmwe/api/ClassificationApi.ts`

```typescript
import { supabase } from '@/integrations/supabase/client';
import { TMWEApiClient } from '../TMWEApiClient';
import { isFeatureEnabled } from '../config';

export class ClassificationApi {
  private client: TMWEApiClient;
  
  constructor() {
    this.client = TMWEApiClient.getInstance();
  }
  
  // Clasificar email individual usando TMWE
  async classifyEmail(params: {
    tmwe_email_id: number;      // ✅ Usa tmwe_email_id directamente
    folder_name: string;
    user_email: string;
    prompt: string;
  }): Promise<ClassificationResult> {
    // 1. Obtener contenido de email desde TMWE API
    const emailApi = new EmailApi();
    const email = await emailApi.getEmailDetail(params.tmwe_email_id);
    
    // 2. Llamar a IA para clasificar
    const classification = await this.client.request('/classify', {
      content: email.body_text,
      subject: email.subject,
      sender: email.from_email,
      prompt: params.prompt
    });
    
    // 3. Almacenar en tmwe_classifications
    const { data, error } = await supabase
      .from('tmwe_classifications')
      .insert({
        tmwe_email_id: params.tmwe_email_id,
        folder_name: params.folder_name,
        user_email: params.user_email,
        sender_email: email.from_email,
        sender_domain: email.from_email.split('@')[1],
        subject_preview: email.subject.substring(0, 100),
        category: classification.category,
        confidence: classification.confidence,
        ai_summary: classification.summary,
        keywords: classification.keywords,
        urgency: classification.urgency,
        action_suggested: classification.action,
        reasoning: classification.reasoning
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  // Obtener clasificaciones existentes
  async getClassifications(params: {
    user_email: string;
    category?: string;
    urgency?: string;
  }) {
    let query = supabase
      .from('tmwe_classifications')
      .select('*')
      .eq('user_email', params.user_email);
    
    if (params.category) {
      query = query.eq('category', params.category);
    }
    
    if (params.urgency) {
      query = query.eq('urgency', params.urgency);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }
}
```

#### SenderApi (Usa `tmwe_sender_profiles`)

**Ubicación:** `src/lib/tmwe/api/SenderApi.ts`

```typescript
import { supabase } from '@/integrations/supabase/client';

export class SenderApi {
  // Obtener perfil de remitente
  async getSenderProfile(params: {
    sender_email: string;
    user_email: string;
  }) {
    const { data, error } = await supabase
      .from('tmwe_sender_profiles')
      .select('*')
      .eq('sender_email', params.sender_email)
      .eq('user_email', params.user_email)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return data;
  }
  
  // Actualizar estadísticas de remitente
  async updateSenderStats(params: {
    sender_email: string;
    user_email: string;
    increment_total?: boolean;
    increment_unread?: boolean;
    last_email_date?: Date;
  }) {
    // Upsert con estadísticas actualizadas
    const { data, error } = await supabase
      .from('tmwe_sender_profiles')
      .upsert({
        sender_email: params.sender_email,
        sender_domain: params.sender_email.split('@')[1],
        user_email: params.user_email,
        total_emails: params.increment_total 
          ? supabase.raw('COALESCE(total_emails, 0) + 1') 
          : undefined,
        unread_count: params.increment_unread
          ? supabase.raw('COALESCE(unread_count, 0) + 1')
          : undefined,
        last_email_date: params.last_email_date,
        last_sync_at: new Date()
      }, {
        onConflict: 'sender_email,user_email'
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  // Aplicar reglas a emails (client-side)
  async applySenderRules(
    emails: Email[],
    user_email: string
  ): Promise<Email[]> {
    // 1. Obtener reglas activas
    const { data: rules } = await supabase
      .from('tmwe_classification_rules')
      .select('*')
      .eq('user_email', user_email)
      .eq('is_active', true)
      .order('priority', { ascending: false });
    
    if (!rules || rules.length === 0) return emails;
    
    // 2. Aplicar reglas a cada email
    return emails
      .map(email => {
        let processedEmail = { ...email };
        
        for (const rule of rules) {
          // Verificar si regla aplica
          const matches = this.ruleMatches(rule, email);
          if (!matches) continue;
          
          // Aplicar acciones
          if (rule.assign_category) {
            processedEmail._category = rule.assign_category;
          }
          if (rule.assign_urgency) {
            processedEmail._urgency = rule.assign_urgency;
          }
          if (rule.add_tags) {
            processedEmail._tags = [...(processedEmail._tags || []), ...rule.add_tags];
          }
          if (rule.auto_archive) {
            processedEmail._archived = true;
          }
          if (rule.auto_delete) {
            return null; // Filtrar email
          }
          
          // Actualizar contador
          this.incrementRuleApplyCount(rule.id);
          
          // Detener si regla marca stop_if_matched
          if (rule.stop_if_matched) break;
        }
        
        return processedEmail;
      })
      .filter(email => email !== null);
  }
  
  private ruleMatches(rule: any, email: Email): boolean {
    switch (rule.rule_scope) {
      case 'sender':
        return email.from_email === rule.sender_email;
      case 'domain':
        return email.from_email.endsWith(`@${rule.sender_domain}`);
      case 'subject':
        return email.subject?.toLowerCase().includes(rule.subject_contains?.toLowerCase());
      case 'global':
        return true;
      default:
        return false;
    }
  }
}
```

---

## 📊 PLANES DE MIGRACIÓN POR CASO DE USO

### **CASO DE USO 3: SmartInbox - Clasificación con IA (ACTUALIZADO V3.1)**

#### Estado Objetivo (Zero-Sync con Fresh Start)

```typescript
// ✅ V3.1: Usar tmwe_classifications directamente
const classificationApi = new ClassificationApi();

// Clasificar email
await classificationApi.classifyEmail({
  tmwe_email_id: 12345,              // ✅ ID directo desde TMWE API
  folder_name: 'INBOX',
  user_email: 'jose@tmwe.it',
  prompt: 'Clasifica este email...'
});

// Recuperar emails clasificados
const classifications = await classificationApi.getClassifications({
  user_email: 'jose@tmwe.it',
  category: 'important'
});

// Enriquecer con datos de TMWE API
const emailApi = new EmailApi();
const emails = await Promise.all(
  classifications.map(c => 
    emailApi.getEmailDetail(c.tmwe_email_id)
  )
);
```

#### Plan de Migración V3.1 - **SIN MIGRACIÓN DE DATOS**

**Fase 1: Crear Tabla Nueva**
- [ ] Ejecutar DDL de `tmwe_classifications`
- [ ] Verificar RLS policies activas
- [ ] Testing de insert/select/update

**Fase 2: Crear ClassificationApi**
- [ ] Implementar `src/lib/tmwe/api/ClassificationApi.ts`
- [ ] Método `classifyEmail()` usando `tmwe_email_id`
- [ ] Método `getClassifications()` desde tabla nueva
- [ ] Testing unitario

**Fase 3: Actualizar Hooks**
- [ ] Modificar `useSmartClassification.ts`:
  - Usar `ClassificationApi`
  - Feature flag para usar `tmwe_classifications`
  - Fallback a legacy si flag desactivado

**Fase 4: Actualizar Componentes**
- [ ] `SmartInboxTab.tsx`: Usar nuevos hooks
- [ ] Eliminar referencias directas a `email_ai_classifications`
- [ ] Mostrar `subject_preview` de tabla nueva

**Fase 5: Testing**
- [ ] Clasificación individual funciona
- [ ] Clasificación batch (100 emails)
- [ ] Filtros por categoría/urgencia
- [ ] Performance < 3s por clasificación

**Tiempo Estimado:** 4-5 días (2 días menos que v3.0 - no hay migración)  
**Prioridad:** 🔴 CRÍTICA  
**Dependencias:** EmailApi, tabla `tmwe_classifications`  
**Riesgo:** 🟢 BAJO - No hay datos que migrar

---

### **CASO DE USO 10: Gestión de Reglas de Remitente (ACTUALIZADO V3.1)**

#### Estado Objetivo (Zero-Sync con Fresh Start)

```typescript
// ✅ V3.1: Client-side filtering usando tmwe_sender_profiles y tmwe_classification_rules
const senderApi = new SenderApi();
const emailApi = new EmailApi();

// 1. Obtener emails desde API
const emails = await emailApi.getEmailList({ folder: 'INBOX' });

// 2. Aplicar reglas automáticamente
const filteredEmails = await senderApi.applySenderRules(
  emails,
  'jose@tmwe.it'
);

// 3. Mostrar resultado
return filteredEmails; // Emails ya tienen _category, _urgency, _archived aplicado
```

#### Plan de Migración V3.1

**Fase 1: Crear Tablas Nuevas**
- [ ] Ejecutar DDL de `tmwe_sender_profiles`
- [ ] Ejecutar DDL de `tmwe_classification_rules`
- [ ] Verificar RLS policies

**Fase 2: Crear/Actualizar SenderApi**
- [ ] Implementar métodos de `SenderApi`:
  - `getSenderProfile()`
  - `updateSenderStats()`
  - `applySenderRules()` (client-side filtering)
- [ ] Testing unitario de aplicación de reglas

**Fase 3: Integración con EmailApi**
- [ ] Modificar `EmailApi.getEmailList()` para aplicar reglas opcionales
- [ ] Feature flag `USE_TMWE_RULES`

**Fase 4: Actualizar UI**
- [ ] `EmailSenderManager.tsx`: Usar `tmwe_sender_profiles`
- [ ] `SenderRuleDialog.tsx`: CRUD en `tmwe_classification_rules`
- [ ] Botón "Aplicar ahora" → invalida cache React Query

**Fase 5: Performance Testing**
- [ ] Benchmark: 1000 emails + 50 reglas < 200ms
- [ ] Si > 200ms → considerar Edge Function para filtering

**Tiempo Estimado:** 5-6 días  
**Prioridad:** 🔴 ALTA  
**Dependencias:** EmailApi, SenderApi  
**Riesgo:** 🟡 MEDIO - Rediseño client-side

---

## 🗺️ MATRIZ DE TRAZABILIDAD

| Caso de Uso | Componente Principal | Hook | API Module | Tabla Nueva | Prioridad | Días | Dependencias |
|-------------|---------------------|------|------------|-------------|-----------|------|--------------|
| **CU1: Lista Emails** | `FunEmail.tsx`<br>`EmailList.tsx` | `useEmailList.ts` | `EmailApi` | - | 🔴 CRÍTICA | 2-3 | TMWEApiClient, TMWEAuthManager |
| **CU2: Detalle Email** | `EmailDetail.tsx` | `useEmailDetail.ts` | `EmailApi` | - | 🔴 CRÍTICA | 1-2 | CU1 |
| **CU3: SmartInbox** | `SmartInboxTab.tsx` | `useSmartClassification.ts` | `EmailApi`<br>`ClassificationApi` | `tmwe_classifications` | 🔴 CRÍTICA | 4-5 | CU1, tabla nueva |
| **CU4: Análisis Remitentes** | `EmailSenderManager.tsx` | `useSenderAnalysis.ts` | `SenderApi` | `tmwe_sender_profiles` | 🟡 MEDIA | 3-4 | CU1, tabla nueva |
| **CU5: Quick Stats** | `FunEmailQuickStats.tsx` | `useEmailFolderInfo.ts` | `FolderApi` | - | 🟢 BAJA | 1 | - |
| **CU6: Global Stats** | `FunEmailGlobalStats.tsx` | `useEmailFolderInfo.ts` | `FolderApi` | - | 🟢 BAJA | 1 | CU5 |
| **CU7: Búsqueda** | `FunEmail.tsx` (search) | `useEmailList.ts` | `EmailApi` | - | 🟡 MEDIA | 2 | CU1 |
| **CU8: Threads** | `EmailThreadView.tsx` | `useEmailThread.ts` | `EmailApi` | - | 🟡 MEDIA | 2-3 | CU1 |
| **CU9: Sincronización** | `QuickDownloadDialog.tsx` | - | `EmailApi` | - | 🟡 MEDIA | 4-5 | CU1 |
| **CU10: Reglas Remitente** | `EmailSenderManager.tsx`<br>`SenderRuleDialog.tsx` | `useSenderRules.ts` | `SenderApi` | `tmwe_sender_profiles`<br>`tmwe_classification_rules` | 🔴 ALTA | 5-6 | CU1, CU4, tablas nuevas |

**Total Estimado v3.1:** 20-30 días de desarrollo (3-4 días menos que v3.0 - sin migración de datos)

---

## 🚀 ROADMAP DE IMPLEMENTACIÓN

### **SPRINT 1: Infraestructura Core + Tablas Nuevas (Días 1-3)**

**Objetivo:** Establecer bases de arquitectura Zero-Sync con tablas optimizadas

#### Tareas
1. **Día 1: TMWEAuthManager + TMWEApiClient + Tablas DB**
   - [ ] Crear `src/lib/tmwe/TMWEAuthManager.ts` (wrapper)
   - [ ] Crear `src/lib/tmwe/TMWEApiClient.ts` (facade)
   - [ ] Crear `src/lib/tmwe/config.ts` (feature flags)
   - [ ] **Ejecutar migrations:**
     - [ ] `CREATE TABLE tmwe_classifications`
     - [ ] `CREATE TABLE tmwe_sender_profiles`
     - [ ] `CREATE TABLE tmwe_classification_rules`
   - [ ] Verificar RLS policies activas

2. **Día 2: EmailApi + FolderApi + ClassificationApi**
   - [ ] Crear `src/lib/tmwe/api/EmailApi.ts` (wrapper)
   - [ ] Crear `src/lib/tmwe/api/FolderApi.ts` (wrapper)
   - [ ] Crear `src/lib/tmwe/api/ClassificationApi.ts` (usa `tmwe_classifications`)
   - [ ] Testing de integración

3. **Día 3: SenderApi + Exports Centralizados**
   - [ ] Crear `src/lib/tmwe/api/SenderApi.ts` (usa `tmwe_sender_profiles` y `tmwe_classification_rules`)
   - [ ] Crear `src/lib/tmwe/api/index.ts` (exports)
   - [ ] Crear `src/lib/tmwe/index.ts` (exports centralizados)
   - [ ] Testing E2E de flujo completo

**Entregables:**
- ✅ Capa de abstracción API funcional
- ✅ Tablas nuevas creadas con RLS
- ✅ ClassificationApi y SenderApi operativos
- ✅ Feature flags configurados

---

### **SPRINT 2: Casos de Uso Críticos (Días 4-10)**

**Objetivo:** Migrar funcionalidades esenciales de lectura

(Sin cambios vs v3.0 - este sprint no usa tablas nuevas)

---

### **SPRINT 3: SmartInbox con Fresh Start (Días 11-15)**

**Objetivo:** SmartInbox usando `tmwe_classifications`

#### Tareas
1. **Día 11-12: Actualizar Hooks**
   - [ ] Modificar `useSmartClassification.ts`:
     - Feature flag `USE_TMWE_CLASSIFICATIONS`
     - Usar `ClassificationApi` si flag activo
     - Fallback a legacy si desactivado
   - [ ] Testing con feature flag ON/OFF

2. **Día 13-14: Actualizar Componentes**
   - [ ] `SmartInboxTab.tsx`: Eliminar queries directas a `email_ai_classifications`
   - [ ] Usar `subject_preview` de `tmwe_classifications` para listas
   - [ ] Mostrar campos nuevos: urgency, action_suggested

3. **Día 15: Testing**
   - [ ] Clasificación individual funciona
   - [ ] Clasificación batch (100 emails)
   - [ ] Filtros por categoría/urgencia
   - [ ] Performance < 3s por clasificación

**Entregables:**
- ✅ SmartInbox funcional con `tmwe_classifications`
- ✅ Feature flag permite switch a legacy
- ✅ UI mejorada con nuevos campos

**Ventaja vs v3.0:** 2 días menos (no hay migración de datos)

---

### **SPRINT 4: Búsqueda y Threads (Días 16-20)**

(Sin cambios vs v3.0 - este sprint no usa tablas nuevas)

---

### **SPRINT 5: Remitentes y Reglas con Fresh Start (Días 21-27)**

**Objetivo:** Análisis de remitentes y reglas usando tablas nuevas

#### Tareas
1. **Día 21-23: Análisis Remitentes**
   - [ ] Actualizar `email-sender-analyzer.ts`:
     - Feature flag `USE_TMWE_SENDER_PROFILES`
     - Usar `SenderApi.getSenderProfile()`
     - Actualizar stats en `tmwe_sender_profiles`
   - [ ] Testing de performance con 1000+ remitentes

2. **Día 24-27: Reglas de Remitente**
   - [ ] CRUD de reglas en `tmwe_classification_rules` (UI)
   - [ ] Integrar `SenderApi.applySenderRules()` en `EmailApi`
   - [ ] Botón "Aplicar ahora" en UI
   - [ ] Testing exhaustivo:
     - 1000 emails + 50 reglas < 200ms

**Entregables:**
- ✅ Perfiles de remitentes en `tmwe_sender_profiles`
- ✅ Reglas aplicadas en tiempo real client-side
- ✅ UI de gestión funcional

---

### **SPRINT 6: Sincronización y Cleanup (Días 28-30)**

(Sin cambios vs v3.0)

---

## 🧪 TESTING Y VALIDACIÓN

### Checklist de Validación Final V3.1

**Funcionalidad:**
- [ ] SmartInbox funciona con `tmwe_classifications`
- [ ] Feature flags permiten switch entre nuevo/legacy
- [ ] Reglas de remitente se aplican client-side < 200ms
- [ ] Perfiles de remitentes muestran stats integradas
- [ ] Búsqueda y threads funcionan correctamente

**Coexistencia:**
- [ ] Datos legacy permanecen intactos
- [ ] Feature flags funcionan correctamente
- [ ] Rollback a legacy funciona (cambiar flag)
- [ ] No hay errores con tablas legacy vacías

**Performance:**
- [ ] Clasificación individual < 3s
- [ ] Aplicación de 50 reglas a 1000 emails < 200ms
- [ ] Queries a tablas nuevas < 100ms
- [ ] Sin memory leaks

**Seguridad:**
- [ ] RLS policies activas en todas las tablas nuevas
- [ ] Usuario solo ve sus datos
- [ ] No hay SQL injection posible

---

## 🌟 BENEFICIOS PLAN V3.1

### Comparativa v3.0 vs v3.1

| Aspecto | Plan v3.0 | Plan v3.1 Fresh Start | Mejora |
|---------|-----------|----------------------|--------|
| **Duración Total** | 23-34 días | 20-30 días | ⏬ -3-4 días |
| **Migración de Datos** | Script complejo (5-7 días) | 0 días (no hay datos) | ⏱️ 100% ahorro |
| **Riesgo de Pérdida Datos** | Medio | Cero | 🔒 Sin riesgo |
| **Rollback** | Complejo | Fácil (feature flag) | ↩️ Instantáneo |
| **Testing de Migración** | Requerido | No requerido | ⏱️ Más rápido |
| **Mantenibilidad** | Tabla legacy + script | Solo tablas nuevas | 🎯 Más simple |
| **Performance** | Igual | Mejor (sin JOINs legacy) | ⚡ Queries más rápidas |

### Ventajas Técnicas Específicas V3.1

#### 1. **Diseño Optimizado Nativo**
```sql
-- ✅ V3.1: Diseño optimizado para TMWE desde día 1
CREATE TABLE tmwe_classifications (
  tmwe_email_id integer NOT NULL,  -- ✅ Nativo TMWE
  subject_preview text,             -- ✅ Desnormalizado para listas
  ...
);

-- ❌ V3.0: Tabla legacy adaptada
CREATE TABLE email_ai_classifications (
  email_id uuid NOT NULL,           -- ❌ UUID local (migración necesaria)
  email_uid text,                   -- ❌ Segundo identificador (confusión)
  tmwe_email_id integer,            -- ❌ Añadido después (nullable)
  ...
);
```

#### 2. **Sin Complejidad de Migración**
```typescript
// ❌ V3.0: Script de migración complejo
const migrateClassifications = async () => {
  // 1. Buscar email en TMWE por uid
  // 2. Mapear email_id local a tmwe_email_id
  // 3. Actualizar clasificaciones
  // 4. Manejar errores de emails no encontrados
  // 5. Rollback si falla
};

// ✅ V3.1: No hay migración
// Las clasificaciones nuevas ya usan tmwe_email_id
```

#### 3. **Queries Más Simples**
```typescript
// ❌ V3.0: Query con migración
const getClassifiedEmails = async () => {
  // JOIN entre email_ai_classifications y email_messages
  // para obtener tmwe_email_id
  const { data } = await supabase
    .from('email_ai_classifications')
    .select(`
      *,
      email_messages!inner(tmwe_email_id, subject)
    `);
};

// ✅ V3.1: Query directa
const getClassifiedEmails = async () => {
  const { data } = await supabase
    .from('tmwe_classifications')
    .select('*'); // tmwe_email_id y subject_preview ya están
};
```

#### 4. **Rollback Instantáneo**
```typescript
// ✅ V3.1: Cambiar feature flag = rollback instantáneo
export const TMWE_FEATURE_FLAGS = {
  USE_TMWE_CLASSIFICATIONS: false, // ← Cambiar a false = rollback
};

// ❌ V3.0: Rollback requiere restaurar DB desde backup
```

#### 5. **Menor Deuda Técnica**
- ❌ V3.0: Mantener código de migración + fallbacks + validación
- ✅ V3.1: Código limpio desde el inicio, eliminar flags después

---

### Tabla Comparativa Final

| Métrica | v2.0 (Implementación Completa) | v3.0 (Wrappers + Migración) | v3.1 (Fresh Start) |
|---------|-------------------------------|-----------------------------|--------------------|
| **Días Totales** | 26-37 | 23-34 | 20-30 |
| **Código OAuth Nuevo** | ~300 líneas | 0 líneas | 0 líneas |
| **Migración Datos** | Compleja | Compleja | ❌ No necesaria |
| **Riesgo** | Alto | Medio | 🟢 Bajo |
| **Rollback** | Difícil | Medio | ✅ Fácil (feature flag) |
| **Testing** | Extensivo | Integración | Integración |
| **Tablas DB** | Adaptar legacy | Adaptar legacy | ✅ Nuevas optimizadas |
| **Performance** | Media | Media | ✅ Alta (sin JOINs) |
| **Mantenibilidad** | Baja | Media | ✅ Alta |

---

### Conclusión: ¿Por qué V3.1 es Superior?

1. **⏱️ Más Rápido:** 20-30 días vs 23-34 días (v3.0)
2. **🔒 Menos Riesgo:** No hay migración de datos = 0 riesgo de pérdida
3. **↩️ Rollback Fácil:** Feature flags permiten volver atrás en segundos
4. **⚡ Mejor Performance:** Tablas desnormalizadas optimizadas para queries frecuentes
5. **🎯 Más Simple:** Diseño nativo desde día 1, sin adaptar legacy
6. **📊 Mejor UX:** Campos nuevos (subject_preview, urgency, etc.) desde el inicio
7. **🧹 Menos Deuda:** No hay código de migración que mantener

---

## 📝 NOTAS FINALES

### Decisiones Clave V3.1

1. **Datos Legacy Permanecen Intactos**
   - No se tocan `email_ai_classifications`, `email_sender_groups`, etc.
   - Usuario puede exportar/consultar datos legacy si lo necesita
   - Eventual cleanup después de +3 meses

2. **Feature Flags como Estrategia**
   - Permite probar tablas nuevas sin comprometer legacy
   - Rollback instantáneo si algo falla
   - Activación gradual por usuario si se desea

3. **Diseño Desnormalizado Intencional**
   - `subject_preview` en `tmwe_classifications` evita JOIN
   - Stats integradas en `tmwe_sender_profiles` mejora performance
   - Trade-off: Espacio vs Velocidad (elegimos Velocidad)

4. **Client-Side Filtering para Reglas**
   - Más flexible que triggers complejos en DB
   - Fácil de debugear y testear
   - Si performance < 200ms, mantener; si no, migrar a Edge Function

---

### Siguientes Pasos

1. **Revisar y Aprobar Plan V3.1**
2. **Ejecutar DDL de Tablas Nuevas en Desarrollo**
3. **Comenzar Sprint 1: Infraestructura Core**
4. **Configurar Feature Flags**
5. **Iniciar Testing Continuo**

---

**Versión:** 3.1 - Fresh Start Edition  
**Última Actualización:** 2025-01-29  
**Estado:** ✅ Listo para Implementación
