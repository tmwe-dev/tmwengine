# 🚀 PLAN DE MIGRACIÓN FUNEMAIL → ZERO-SYNC ARCHITECTURE

**Versión:** 3.0  
**Fecha:** 2025-01-29  
**Objetivo:** Migración completa a arquitectura Zero-Sync con TMWE API como única fuente de datos usando wrappers sobre código OAuth existente

---

## 📋 ÍNDICE

1. [Componentes Existentes a Reutilizar](#componentes-existentes-a-reutilizar)
2. [Arquitectura Propuesta](#arquitectura-propuesta)
3. [Capa de Abstracción API](#capa-de-abstracción-api)
4. [Gestión Centralizada OAuth](#gestión-centralizada-oauth)
5. [Planes de Migración por Caso de Uso](#planes-de-migración-por-caso-de-uso)
6. [Matriz de Trazabilidad](#matriz-de-trazabilidad)
7. [Roadmap de Implementación](#roadmap-de-implementación)
8. [Testing y Validación](#testing-y-validación)
9. [Beneficios Plan v3.0](#beneficios-plan-v30)

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
│  │  - ClassificationApi (NUEVO - lógica propia)        │    │
│  │  - SenderApi (NUEVO - lógica propia)                │    │
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

## 🔐 GESTIÓN CENTRALIZADA OAUTH

### 1. TMWEAuthManager (Wrapper Pattern)

**Ubicación:** `src/lib/tmwe/TMWEAuthManager.ts`

**Estrategia:** WRAPPER sobre funciones existentes - NO reimplementa, DELEGA

**Responsabilidades:**
- Proporcionar interfaz unificada para autenticación
- Delegar operaciones OAuth a `tmwe-api-integrated.ts`
- Mantener compatibilidad con código existente

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

**Ventajas del Wrapper:**
- ✅ 0 líneas de código OAuth nuevo
- ✅ Reutiliza lógica probada en producción
- ✅ Mantiene compatibilidad con código existente
- ✅ Testing: solo tests de integración

---

## 🌐 CAPA DE ABSTRACCIÓN API

### 2. TMWEApiClient (Facade Pattern)

**Ubicación:** `src/lib/tmwe/TMWEApiClient.ts`

**Estrategia:** FACADE sobre Edge Function existente `tmwe-api-proxy`

**Características:**
- Singleton para evitar múltiples instancias
- Delega todas las peticiones a `tmwe-api-proxy`
- Manejo automático de autenticación
- Error handling integrado

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

**Ventajas del Facade:**
- ✅ Reutiliza `tmwe-api-proxy` existente
- ✅ No duplica lógica HTTP
- ✅ Retry logic ya implementada en Edge Function
- ✅ Logging centralizado en backend

### 3. API Modules (Específicos por Dominio)

#### EmailApi (Wrapper Pattern)

**Ubicación:** `src/lib/tmwe/api/EmailApi.ts`

**Estrategia:** WRAPPER sobre `emailSearchApi` existente

```typescript
// WRAPPER - Delega a emailSearchApi existente
import { emailSearchApi } from '@/lib/tmwe-email-search-api';

export class EmailApi {
  // DELEGA a función existente
  async getEmailList(params: {
    folder?: string;
    page?: number;
    limit?: number;
  }) {
    return await emailSearchApi.getEmailsMetadata({
      folder: params.folder || 'INBOX',
      page: params.page || 1,
      limit: params.limit || 50
    });
  }
  
  // DELEGA a función existente
  async getEmailDetail(emailId: number) {
    return await emailSearchApi.getEmailDetail({ 
      email_id: emailId 
    });
  }
  
  // DELEGA a función existente
  async searchEmails(query: string, options?: {
    folder?: string;
    page?: number;
    limit?: number;
  }) {
    return await emailSearchApi.searchEmails({
      query,
      search_folder: options?.folder,
      page: options?.page || 1,
      limit: options?.limit || 20
    });
  }
  
  // DELEGA a función existente
  async getEmailThread(params: { messageId: string; folder: string }) {
    return await emailSearchApi.getThread({
      message_id: params.messageId,
      folder: params.folder
    });
  }
  
  // DELEGA a función existente
  async markAsRead(emailId: number) {
    return await emailSearchApi.markAsRead(emailId);
  }
}
```

**Ventajas:**
- ✅ Reutiliza `emailSearchApi` probado
- ✅ Mantiene optimizaciones existentes
- ✅ API unificada y consistente

#### FolderApi (Wrapper Pattern)

**Ubicación:** `src/lib/tmwe/api/FolderApi.ts`

**Estrategia:** WRAPPER sobre `emailSearchApi` existente

```typescript
// WRAPPER - Delega a emailSearchApi existente
import { emailSearchApi } from '@/lib/tmwe-email-search-api';

export class FolderApi {
  async getFolders(includeCounts = true) {
    return await emailSearchApi.getFolders({ 
      include_counts: includeCounts 
    });
  }
  
  async getFolderStats(folder: string) {
    return await emailSearchApi.getStatistics({ folder });
  }
  
  async getGlobalStats() {
    return await emailSearchApi.getStatistics();
  }
}
```

#### ClassificationApi

**Ubicación:** `src/lib/tmwe/api/ClassificationApi.ts`

```typescript
export class ClassificationApi {
  private client: TMWEApiClient;
  
  // Clasificar email individual
  async classifyEmail(params: {
    emailId: number;
    folder: string;
    prompt: string;
  }): Promise<ClassificationResult>;
  
  // Clasificación batch
  async classifyBatch(params: {
    emails: EmailToClassify[];
    prompt: string;
  }): Promise<BatchClassificationResult>;
  
  // Obtener clasificaciones existentes
  async getClassifications(params: {
    folder?: string;
    category?: string;
  }): Promise<Classification[]>;
}
```

#### SenderApi

**Ubicación:** `src/lib/tmwe/api/SenderApi.ts`

```typescript
export class SenderApi {
  private client: TMWEApiClient;
  
  // Obtener lista de remitentes con estadísticas
  async getSenderList(params: {
    folder?: string;
    limit?: number;
  }): Promise<SenderListResponse>;
  
  // Obtener emails de un remitente específico
  async getEmailsBySender(params: {
    sender: string;
    folder?: string;
  }): Promise<EmailListResponse>;
  
  // Obtener reglas de remitente (desde Supabase)
  async getSenderRules(userEmail: string): Promise<SenderRule[]>;
  
  // Aplicar regla a emails existentes (requiere redesign)
  async applySenderRule(rule: SenderRule): Promise<ApplyRuleResult>;
}
```

---

## 📊 PLANES DE MIGRACIÓN POR CASO DE USO

### **CASO DE USO 1: Lectura de Lista de Emails**

#### Componentes Afectados
- `src/pages/FunEmail.tsx` (principal)
- `src/components/email/EmailList.tsx`
- `src/hooks/email/useEmailList.ts`

#### Estado Actual
```typescript
// ❌ ANTES: Query directo a email_messages
const { data: emails } = useQuery({
  queryKey: ['emails', folder],
  queryFn: async () => {
    const { data } = await supabase
      .from('email_messages')
      .select('*')
      .eq('folder_name', folder);
    return data;
  }
});
```

#### Estado Objetivo (Zero-Sync)
```typescript
// ✅ DESPUÉS: Uso de EmailApi
const { data: emails } = useQuery({
  queryKey: ['emails-zerosync', folder],
  queryFn: async () => {
    const emailApi = new EmailApi();
    return await emailApi.getEmailList({ folder, limit: 50 });
  },
  staleTime: 30000 // Cache 30s
});
```

#### Plan de Migración

**Fase 1: Crear EmailApi Module**
- [ ] Implementar `src/lib/tmwe/api/EmailApi.ts`
- [ ] Definir interfaces `EmailListResponse`, `EmailFilters`
- [ ] Implementar método `getEmailList()`
- [ ] Testing unitario de EmailApi

**Fase 2: Actualizar Hook**
- [ ] Modificar `useEmailList.ts` para usar `EmailApi`
- [ ] Eliminar query directo a `email_messages`
- [ ] Actualizar `queryKey` con sufijo `-zerosync`
- [ ] Ajustar `staleTime` y `gcTime`

**Fase 3: Validar Componentes**
- [ ] Verificar que `FunEmail.tsx` funciona con nueva data
- [ ] Verificar que `EmailList.tsx` renderiza correctamente
- [ ] Testing E2E de lectura de emails

**Fase 4: Cleanup**
- [ ] Eliminar código legacy de `email_messages`
- [ ] Actualizar documentación

**Tiempo Estimado:** 2-3 días  
**Prioridad:** 🔴 CRÍTICA  
**Dependencias:** TMWEApiClient, EmailApi

---

### **CASO DE USO 2: Visualización de Detalle de Email**

#### Componentes Afectados
- `src/components/email/EmailDetail.tsx`
- `src/hooks/email/useEmailDetail.ts`

#### Estado Actual
```typescript
// ❌ ANTES: Query a email_messages con fallback
const { data: email } = useQuery({
  queryKey: ['email', emailId],
  queryFn: async () => {
    // Primero intenta API
    try {
      return await emailSearchApi.getEmailDetail(emailId);
    } catch {
      // Fallback a DB
      const { data } = await supabase
        .from('email_messages')
        .select('*')
        .eq('id', emailId)
        .single();
      return data;
    }
  }
});
```

#### Estado Objetivo (Zero-Sync)
```typescript
// ✅ DESPUÉS: Solo EmailApi, sin fallback
const { data: email } = useQuery({
  queryKey: ['email-detail-zerosync', emailId],
  queryFn: async () => {
    const emailApi = new EmailApi();
    return await emailApi.getEmailDetail({
      emailId,
      folder: selectedFolder
    });
  },
  staleTime: 60000 // Cache 1 minuto
});
```

#### Plan de Migración

**Fase 1: Actualizar EmailApi**
- [ ] Implementar método `getEmailDetail()` en `EmailApi`
- [ ] Definir interface `EmailDetail` con todos los campos necesarios
- [ ] Manejar campos `body_html` vs `body_text`
- [ ] Testing de parsing de attachments

**Fase 2: Migrar Hook**
- [ ] Eliminar fallback a `email_messages` en `useEmailDetail.ts`
- [ ] Usar `EmailApi.getEmailDetail()`
- [ ] Actualizar `queryKey`
- [ ] Configurar cache adecuado

**Fase 3: Validar UI**
- [ ] Verificar que `EmailDetail.tsx` renderiza HTML correctamente
- [ ] Verificar visualización de attachments
- [ ] Testing de emails con imágenes embebidas

**Fase 4: Performance**
- [ ] Implementar prefetch de detalle al hover en lista
- [ ] Optimizar tamaño de response (¿comprimir HTML?)

**Tiempo Estimado:** 1-2 días  
**Prioridad:** 🔴 CRÍTICA  
**Dependencias:** EmailApi, Caso de Uso 1

---

### **CASO DE USO 3: SmartInbox - Clasificación con IA**

#### Componentes Afectados
- `src/components/email/smart-inbox/SmartInboxTab.tsx`
- `src/components/email/smart-inbox/SmartInboxTabIntelligent.tsx`
- `src/hooks/email/useSmartClassification.ts`
- `src/lib/tmwe-email-search-api.ts`

#### Estado Actual - **PROBLEMA CRÍTICO**
```typescript
// ❌ PROBLEMA: Clasificaciones almacenadas con `email_id` de tabla local
// que NO existe en TMWE API
INSERT INTO email_ai_classifications (email_id, category, ...)
VALUES (uuid_from_local_db, 'important', ...);

// Cuando queremos mostrar email clasificado:
SELECT * FROM email_messages em
JOIN email_ai_classifications eac ON em.id = eac.email_id
WHERE eac.category = 'important';
// ❌ NO FUNCIONA porque email_messages ya no tiene datos!
```

#### Estado Objetivo (Zero-Sync) - **SOLUCIÓN**
```typescript
// ✅ SOLUCIÓN: Usar tmwe_email_id + folder_name como clave compuesta
CREATE TABLE email_ai_classifications_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tmwe_email_id integer NOT NULL, -- UID del API TMWE
  folder_name text NOT NULL,
  user_email text NOT NULL,
  category text NOT NULL,
  classification_prompt text,
  created_at timestamp DEFAULT now(),
  UNIQUE(tmwe_email_id, folder_name, user_email)
);

// Clasificar email
INSERT INTO email_ai_classifications_v2 
  (tmwe_email_id, folder_name, user_email, category)
VALUES (12345, 'INBOX', 'jose@tmwe.it', 'important');

// Recuperar emails clasificados
const emailApi = new EmailApi();
const classificationApi = new ClassificationApi();

// 1. Obtener clasificaciones de categoría
const classifications = await classificationApi.getClassifications({
  category: 'important',
  userEmail: 'jose@tmwe.it'
});

// 2. Obtener detalles de emails desde API
const emails = await Promise.all(
  classifications.map(c => 
    emailApi.getEmailDetail({
      emailId: c.tmwe_email_id,
      folder: c.folder_name
    })
  )
);
```

#### Plan de Migración - **MUY COMPLEJO**

**Fase 1: Migración de Esquema DB**
- [ ] Crear tabla `email_ai_classifications_v2` con `tmwe_email_id`
- [ ] Crear índices compuestos: `(tmwe_email_id, folder_name)`, `(user_email, category)`
- [ ] Script de migración de datos existentes (si es posible recuperar `tmwe_email_id`)
- [ ] RLS policies para nueva tabla

**Fase 2: Crear ClassificationApi**
- [ ] Implementar `src/lib/tmwe/api/ClassificationApi.ts`
- [ ] Método `classifyEmail()` que:
  1. Llama a TMWE API para obtener contenido de email
  2. Llama a IA para clasificar
  3. Almacena resultado en `email_ai_classifications_v2` con `tmwe_email_id`
- [ ] Método `getClassifications()` que lee de tabla local
- [ ] Método `classifyBatch()` para clasificación masiva

**Fase 3: Actualizar Hooks**
- [ ] Modificar `useSmartClassification.ts`:
  - Usar `EmailApi` para obtener contenido de emails
  - Usar `ClassificationApi` para clasificar y almacenar
  - Actualizar queries para usar `tmwe_email_id`
- [ ] Crear `useClassifiedEmails.ts`:
  - Obtener clasificaciones de tabla local
  - Enriquecer con datos de `EmailApi`

**Fase 4: Actualizar Componentes**
- [ ] `SmartInboxTab.tsx`: Usar nuevos hooks
- [ ] `SmartInboxTabIntelligent.tsx`: Eliminar referencias a `email_messages`
- [ ] Manejar estado de carga cuando se enriquecen datos

**Fase 5: Manejo de Edge Cases**
- [ ] ¿Qué pasa si email fue eliminado de TMWE pero sigue clasificado?
  - Mostrar como "[Email eliminado]" o limpiar clasificación
- [ ] ¿Cómo manejar re-clasificación de emails?
  - Update en lugar de insert en tabla clasificaciones

**Fase 6: Testing Exhaustivo**
- [ ] Testing de clasificación individual
- [ ] Testing de clasificación batch (100+ emails)
- [ ] Testing de visualización por categoría
- [ ] Testing de performance (carga de 50 emails clasificados)

**Tiempo Estimado:** 5-7 días  
**Prioridad:** 🔴 CRÍTICA  
**Dependencias:** EmailApi, ClassificationApi, migración DB  
**Riesgo:** 🔴 ALTO - Requiere migración de datos existentes

---

### **CASO DE USO 4: Análisis de Remitentes**

#### Componentes Afectados
- `src/pages/EmailSenderManager.tsx`
- `src/lib/email-sender-analyzer.ts`
- `src/hooks/useSenderAnalysis.ts`

#### Estado Actual
```typescript
// ❌ ANTES: Análisis desde email_messages
const analyzeSenders = async (userEmail: string) => {
  const { data: emails } = await supabase
    .from('email_messages')
    .select('sender_email, sender_name, date')
    .eq('user_email', userEmail);
  
  // Agrupar y analizar...
  const senderStats = emails.reduce((acc, email) => {
    // ...
  }, {});
};
```

#### Estado Objetivo (Zero-Sync)
```typescript
// ✅ DESPUÉS: Análisis desde SenderApi
const analyzeSenders = async (userEmail: string) => {
  const senderApi = new SenderApi();
  
  // SenderApi hace la agregación en backend o en memoria
  const senders = await senderApi.getSenderList({
    limit: 1000
  });
  
  return senders;
};
```

#### Plan de Migración

**Fase 1: Crear SenderApi**
- [ ] Implementar `src/lib/tmwe/api/SenderApi.ts`
- [ ] Método `getSenderList()`:
  - Llama a `EmailApi.getEmailList()` con todos los folders
  - Agrupa por `sender_email` en memoria
  - Calcula estadísticas (count, firstSeen, lastSeen)
- [ ] Método `getEmailsBySender()` para filtrar por remitente
- [ ] Optimización: Cachear resultados por 5 minutos

**Fase 2: Actualizar Analyzer**
- [ ] Modificar `email-sender-analyzer.ts` para usar `SenderApi`
- [ ] Eliminar fallback a `email_messages`
- [ ] Mantener integración con reglas de Supabase

**Fase 3: Actualizar Hook**
- [ ] `useSenderAnalysis.ts` usa `SenderApi`
- [ ] Configurar cache React Query adecuado
- [ ] Manejar estados de carga

**Fase 4: Performance**
- [ ] Implementar paginación server-side si TMWE API lo soporta
- [ ] Si no, cargar en chunks y agregar progresivamente
- [ ] Mostrar spinner con "Analizando X de Y remitentes..."

**Tiempo Estimado:** 3-4 días  
**Prioridad:** 🟡 MEDIA  
**Dependencias:** EmailApi, SenderApi

---

### **CASO DE USO 5: Estadísticas Rápidas (Quick Stats)**

#### Componentes Afectados
- `src/components/email/stats/FunEmailQuickStats.tsx`
- `src/hooks/email/useEmailFolderInfo.ts`

#### Estado Actual
```typescript
// ❌ ANTES: Count de email_messages
const { data: totalEmails } = useQuery({
  queryKey: ['total-emails'],
  queryFn: async () => {
    const { count } = await supabase
      .from('email_messages')
      .select('id', { count: 'exact', head: true });
    return count;
  }
});
```

#### Estado Objetivo (Zero-Sync)
```typescript
// ✅ DESPUÉS: Stats desde FolderApi
const { data: stats } = useQuery({
  queryKey: ['quick-stats-zerosync'],
  queryFn: async () => {
    const folderApi = new FolderApi();
    return await folderApi.getGlobalStats();
  },
  staleTime: 30000, // Cache 30s
  refetchInterval: 30000 // Auto-refresh cada 30s
});
```

#### Plan de Migración

**Fase 1: FolderApi - Global Stats**
- [ ] Implementar método `getGlobalStats()` en `FolderApi`
- [ ] Agregar estadísticas de todos los folders
- [ ] Retornar: `{ total_emails, unread_count, total_size }`

**Fase 2: Actualizar Hook**
- [ ] Modificar `useEmailFolderInfo.ts` para usar `FolderApi`
- [ ] Configurar auto-refetch cada 30s
- [ ] Eliminar query a `email_messages`

**Fase 3: Actualizar Componente**
- [ ] `FunEmailQuickStats.tsx` usa nuevo hook
- [ ] Mostrar indicador de última actualización
- [ ] Animación suave al actualizar números

**Tiempo Estimado:** 1 día  
**Prioridad:** 🟢 BAJA  
**Dependencias:** FolderApi

---

### **CASO DE USO 6: Estadísticas Globales (Global Stats)**

#### Componentes Afectados
- `src/components/email/stats/FunEmailGlobalStats.tsx`
- `src/hooks/email/useEmailFolderInfo.ts`

#### Plan Similar a Caso 5
- Usar `FolderApi.getGlobalStats()`
- Auto-refresh cada 30s
- Mostrar breakdown por folder

**Tiempo Estimado:** 1 día  
**Prioridad:** 🟢 BAJA  
**Dependencias:** FolderApi

---

### **CASO DE USO 7: Búsqueda de Emails**

#### Componentes Afectados
- `src/pages/FunEmail.tsx` (input de búsqueda)
- `src/hooks/email/useEmailList.ts`

#### Estado Actual
```typescript
// ❌ ANTES: searchEmails con fallback
const searchResults = searchQuery
  ? await emailSearchApi.searchEmails({ query: searchQuery })
  : await supabase.from('email_messages').select('*');
```

#### Estado Objetivo (Zero-Sync)
```typescript
// ✅ DESPUÉS: Solo EmailApi.searchEmails
const { data: results } = useQuery({
  queryKey: ['email-search', searchQuery],
  queryFn: async () => {
    const emailApi = new EmailApi();
    return await emailApi.searchEmails({
      query: searchQuery,
      filters: { folder: selectedFolder }
    });
  },
  enabled: searchQuery.length >= 3
});
```

#### Plan de Migración

**Fase 1: EmailApi - Search**
- [ ] Implementar método `searchEmails()` en `EmailApi`
- [ ] Soporte de filtros: folder, fecha, attachments, etc.
- [ ] Paginación de resultados

**Fase 2: Actualizar Hook**
- [ ] `useEmailList.ts` usa `EmailApi.searchEmails()`
- [ ] Eliminar fallback a DB
- [ ] Debounce de 300ms en búsqueda

**Fase 3: UI/UX**
- [ ] Mostrar número de resultados
- [ ] Highlight de términos de búsqueda
- [ ] Skeleton durante búsqueda

**Tiempo Estimado:** 2 días  
**Prioridad:** 🟡 MEDIA  
**Dependencias:** EmailApi

---

### **CASO DE USO 8: Threads de Conversación**

#### Componentes Afectados
- `src/hooks/useEmailThread.ts`
- `src/components/email/EmailThreadView.tsx` (si existe)

#### Estado Actual
```typescript
// ❌ ANTES: Usa email_messages con fallback
const fetchThread = async (messageId: string) => {
  try {
    return await emailSearchApi.getThread(messageId);
  } catch {
    return await supabase
      .from('email_messages')
      .select('*')
      .eq('thread_id', threadId);
  }
};
```

#### Estado Objetivo (Zero-Sync)
```typescript
// ✅ DESPUÉS: Solo EmailApi.getEmailThread
const { data: thread } = useQuery({
  queryKey: ['email-thread', messageId],
  queryFn: async () => {
    const emailApi = new EmailApi();
    return await emailApi.getEmailThread({
      messageId,
      folder: selectedFolder
    });
  }
});
```

#### Plan de Migración

**Fase 1: EmailApi - Threads**
- [ ] Implementar `getEmailThread()` en `EmailApi`
- [ ] Ordenar emails cronológicamente
- [ ] Identificar email actual en thread

**Fase 2: Actualizar Hook**
- [ ] `useEmailThread.ts` usa `EmailApi`
- [ ] Eliminar fallback a `email_messages`
- [ ] Cache agresivo (threads no cambian frecuentemente)

**Fase 3: UI**
- [ ] Componente de visualización de thread
- [ ] Navegación entre emails del thread
- [ ] Indicador visual de posición en thread

**Tiempo Estimado:** 2-3 días  
**Prioridad:** 🟡 MEDIA  
**Dependencias:** EmailApi

---

### **CASO DE USO 9: Descarga/Sincronización de Emails**

#### Componentes Afectados
- `src/components/email/admin/QuickDownloadDialog.tsx`
- `src/components/email/admin/GlobalDownloadDialog.tsx`
- `src/lib/email/strategies/*`
- `src/lib/email/services/EdgeFunctionSyncService.ts`

#### Estado Actual
```typescript
// ❌ ANTES: Descarga y almacena en email_messages
const downloadEmails = async (folder: string) => {
  const emails = await tmweApi.getEmails(folder);
  
  // Almacenar en Supabase
  await supabase.from('email_messages').insert(emails);
};
```

#### Estado Objetivo (Zero-Sync) - **CAMBIO DE PARADIGMA**
```typescript
// ✅ DESPUÉS: NO descargamos, solo sincronizamos metadatos
const syncMetadata = async (folder: string) => {
  // 1. Obtener lista de UIDs desde TMWE API
  const { uids } = await emailApi.getEmailList({ folder });
  
  // 2. Almacenar solo UIDs en tabla de sincronización
  await supabase.from('email_sync_metadata').upsert(
    uids.map(uid => ({ tmwe_email_id: uid, folder, synced_at: new Date() }))
  );
  
  // 3. NO almacenamos contenido de emails
};
```

#### Plan de Migración - **REDISEÑO COMPLETO**

**Fase 1: Nueva Tabla de Sync Metadata**
```sql
CREATE TABLE email_sync_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tmwe_email_id integer NOT NULL,
  folder_name text NOT NULL,
  user_email text NOT NULL,
  synced_at timestamp DEFAULT now(),
  last_seen_at timestamp DEFAULT now(),
  UNIQUE(tmwe_email_id, folder_name, user_email)
);

CREATE INDEX idx_sync_metadata_user_folder 
  ON email_sync_metadata(user_email, folder_name);
```

**Fase 2: Actualizar EdgeFunctionSyncService**
- [ ] Modificar para NO descargar contenido completo
- [ ] Solo sincronizar lista de UIDs
- [ ] Actualizar `email_sync_progress` con nuevos nombres de fases
- [ ] Eliminar inserción en `email_messages`

**Fase 3: Actualizar Estrategias de Descarga**
- [ ] `SequentialStrategy`, `DanceStrategy`, etc.
- [ ] Cambiar lógica de "descargar" a "sincronizar metadata"
- [ ] Actualizar logs y progress indicators

**Fase 4: UI/UX**
- [ ] Cambiar terminología: "Descargar" → "Sincronizar"
- [ ] "X emails sincronizados" en lugar de "descargados"
- [ ] Explicar a usuario que emails se acceden en tiempo real

**Fase 5: Cleanup**
- [ ] Eliminar código de inserción en `email_messages`
- [ ] Limpiar tabla `email_messages` (opcional, puede mantenerse como backup)

**Tiempo Estimado:** 4-5 días  
**Prioridad:** 🟡 MEDIA  
**Dependencias:** EmailApi, migración DB  
**Riesgo:** 🟡 MEDIO - Cambio conceptual importante

---

### **CASO DE USO 10: Gestión de Reglas de Remitente**

#### Componentes Afectados
- `src/pages/EmailSenderManager.tsx`
- `src/components/email/sender-rules/SenderRuleDialog.tsx`
- `src/hooks/useSenderRules.ts`

#### Estado Actual - **PROBLEMA CRÍTICO**
```typescript
// ❌ PROBLEMA: Reglas se aplican sobre email_messages
CREATE TRIGGER apply_sender_rule
AFTER INSERT ON email_sender_rules
FOR EACH ROW EXECUTE FUNCTION apply_rule_to_existing_emails();

-- Función intenta actualizar email_messages
UPDATE email_messages
SET folder_name = 'Trash', is_archived = true
WHERE sender_email = NEW.sender_email;
-- ❌ NO FUNCIONA en Zero-Sync porque email_messages está vacío!
```

#### Estado Objetivo (Zero-Sync) - **SOLUCIÓN: CLIENT-SIDE FILTERING**
```typescript
// ✅ SOLUCIÓN: Reglas se aplican al obtener emails desde API
const getFilteredEmails = async (folder: string, userEmail: string) => {
  const emailApi = new EmailApi();
  const senderApi = new SenderApi();
  
  // 1. Obtener emails desde API
  const emails = await emailApi.getEmailList({ folder });
  
  // 2. Obtener reglas activas del usuario
  const rules = await senderApi.getSenderRules(userEmail);
  
  // 3. Aplicar reglas en memoria
  const filteredEmails = emails.filter(email => {
    const rule = rules.find(r => r.sender_email === email.sender_email);
    
    if (!rule || !rule.is_active) return true;
    
    // Aplicar acciones de regla
    if (rule.action === 'delete') return false;
    if (rule.action === 'archive') {
      email._isArchived = true;
      return true;
    }
    if (rule.action === 'move') {
      email._movedToFolder = rule.target_folder;
      return folder === rule.target_folder;
    }
    
    return true;
  });
  
  return filteredEmails;
};
```

#### Plan de Migración - **REDISEÑO ARQUITECTÓNICO**

**Fase 1: Análisis de Impacto**
- [ ] Documentar todas las reglas existentes en DB
- [ ] Identificar tipos de acciones soportadas
- [ ] Determinar si reglas deben aplicarse server-side o client-side

**Fase 2: Decisión Arquitectónica**

**OPCIÓN A: Client-Side Filtering (RECOMENDADO)**
- ✅ Ventajas:
  - No requiere modificar TMWE API
  - Flexible y fácil de debugear
  - Reglas se aplican en tiempo real
- ❌ Desventajas:
  - Puede ser lento con muchas reglas
  - Reglas no persisten en servidor

**OPCIÓN B: Server-Side Rules via Edge Function**
- ✅ Ventajas:
  - Mejor performance
  - Reglas centralizadas
- ❌ Desventajas:
  - Requiere Edge Function adicional
  - Complejidad de sincronización

**Fase 3: Implementación (Asumiendo Opción A)**

**3.1 Actualizar SenderApi**
```typescript
// src/lib/tmwe/api/SenderApi.ts
class SenderApi {
  // Obtener reglas desde Supabase
  async getSenderRules(userEmail: string): Promise<SenderRule[]> {
    const { data } = await supabase
      .from('email_sender_rules')
      .select('*')
      .eq('user_email', userEmail)
      .eq('is_active', true);
    return data || [];
  }
  
  // Aplicar reglas a lista de emails
  applyRulesToEmails(
    emails: Email[],
    rules: SenderRule[]
  ): Email[] {
    return emails
      .map(email => {
        const rule = rules.find(r => 
          r.sender_email === email.sender_email
        );
        
        if (!rule) return email;
        
        // Aplicar acción
        switch (rule.action) {
          case 'delete':
            return null; // Filtrar
          case 'archive':
            return { ...email, _isArchived: true };
          case 'move':
            return { ...email, _movedToFolder: rule.target_folder };
          case 'label':
            return { ...email, _labels: [...(email._labels || []), rule.label] };
          default:
            return email;
        }
      })
      .filter(email => email !== null);
  }
}
```

**3.2 Actualizar EmailApi**
```typescript
// src/lib/tmwe/api/EmailApi.ts
class EmailApi {
  async getEmailList(params: {
    folder: string;
    userEmail: string; // Necesario para aplicar reglas
    applyRules?: boolean;
  }): Promise<Email[]> {
    // 1. Obtener emails desde TMWE API
    const emails = await this.fetchFromTMWE(params.folder);
    
    // 2. Aplicar reglas si está habilitado
    if (params.applyRules !== false) {
      const senderApi = new SenderApi();
      const rules = await senderApi.getSenderRules(params.userEmail);
      return senderApi.applyRulesToEmails(emails, rules);
    }
    
    return emails;
  }
}
```

**3.3 Actualizar Hooks**
```typescript
// src/hooks/email/useEmailList.ts
export const useEmailList = (folder: string) => {
  const { userEmail } = useUserEmail();
  
  return useQuery({
    queryKey: ['emails-with-rules', folder, userEmail],
    queryFn: async () => {
      const emailApi = new EmailApi();
      return await emailApi.getEmailList({
        folder,
        userEmail: userEmail!,
        applyRules: true
      });
    },
    enabled: !!userEmail
  });
};
```

**Fase 4: Gestión de Reglas en UI**
- [ ] Actualizar `SenderRuleDialog.tsx`
- [ ] Eliminar triggers de DB que intentan modificar `email_messages`
- [ ] Añadir opción "Aplicar regla ahora" que:
  1. Guarda regla en DB
  2. Invalida cache de React Query
  3. Re-fetch de emails con nuevas reglas

**Fase 5: Performance Optimization**
- [ ] Cachear reglas en memoria (5 minutos)
- [ ] Indexar reglas por `sender_email` para búsqueda O(1)
- [ ] Lazy loading de reglas (solo cuando sea necesario)

**Fase 6: Testing**
- [ ] Test unitario de `applyRulesToEmails()`
- [ ] Test de integración: crear regla → ver efecto inmediato
- [ ] Test de performance: 1000 emails + 50 reglas

**Tiempo Estimado:** 5-6 días  
**Prioridad:** 🔴 ALTA  
**Dependencias:** EmailApi, SenderApi  
**Riesgo:** 🔴 ALTO - Rediseño arquitectónico significativo

---

## 🗺️ MATRIZ DE TRAZABILIDAD

| Caso de Uso | Componente Principal | Hook | API Module | Prioridad | Días | Dependencias |
|-------------|---------------------|------|------------|-----------|------|--------------|
| **CU1: Lista Emails** | `FunEmail.tsx`<br>`EmailList.tsx` | `useEmailList.ts` | `EmailApi` | 🔴 CRÍTICA | 2-3 | TMWEApiClient, TMWEAuthManager |
| **CU2: Detalle Email** | `EmailDetail.tsx` | `useEmailDetail.ts` | `EmailApi` | 🔴 CRÍTICA | 1-2 | CU1 |
| **CU3: SmartInbox** | `SmartInboxTab.tsx`<br>`SmartInboxTabIntelligent.tsx` | `useSmartClassification.ts` | `EmailApi`<br>`ClassificationApi` | 🔴 CRÍTICA | 6-7 | CU1, migración DB |
| **CU4: Análisis Remitentes** | `EmailSenderManager.tsx` | `useSenderAnalysis.ts` | `SenderApi` | 🟡 MEDIA | 3-4 | CU1 |
| **CU5: Quick Stats** | `FunEmailQuickStats.tsx` | `useEmailFolderInfo.ts` | `FolderApi` | 🟢 BAJA | 1 | - |
| **CU6: Global Stats** | `FunEmailGlobalStats.tsx` | `useEmailFolderInfo.ts` | `FolderApi` | 🟢 BAJA | 1 | CU5 |
| **CU7: Búsqueda** | `FunEmail.tsx` (search) | `useEmailList.ts` | `EmailApi` | 🟡 MEDIA | 2 | CU1 |
| **CU8: Threads** | `EmailThreadView.tsx` | `useEmailThread.ts` | `EmailApi` | 🟡 MEDIA | 2-3 | CU1 |
| **CU9: Sincronización** | `QuickDownloadDialog.tsx`<br>`GlobalDownloadDialog.tsx` | - | `EmailApi` | 🟡 MEDIA | 4-5 | CU1, migración DB |
| **CU10: Reglas Remitente** | `EmailSenderManager.tsx`<br>`SenderRuleDialog.tsx` | `useSenderRules.ts` | `SenderApi` | 🔴 ALTA | 8-9 | CU1, CU4 |

**Total Estimado v3.0:** 23-34 días de desarrollo (3 días menos que v2.0 gracias a wrappers)

---

## 🚀 ROADMAP DE IMPLEMENTACIÓN

### **SPRINT 1: Infraestructura Core (Días 1-3) - WRAPPERS**

**Objetivo:** Establecer bases de arquitectura Zero-Sync usando wrappers sobre código existente

**🔥 CAMBIO CLAVE v3.0:** Este sprint ahora toma 2-3 días en lugar de 5 días gracias al patrón Wrapper/Facade

#### Comparativa v2.0 vs v3.0

| Tarea | v2.0 | v3.0 | Ahorro |
|-------|------|------|--------|
| TMWEAuthManager | 2 días (crear OAuth) | 0.5 días (wrapper) | 1.5 días |
| TMWEApiClient | 1.5 días (crear HTTP) | 0.5 días (facade) | 1 día |
| EmailApi | 1.5 días (implementar) | 0.5 días (wrapper) | 1 día |
| FolderApi | 0.5 días | 0.25 días (wrapper) | 0.25 días |
| **Total** | **5.5 días** | **1.75 días** | **~3 días** |

#### Tareas
1. **Día 1: TMWEAuthManager + TMWEApiClient (Wrappers)**
   - [ ] Crear `src/lib/tmwe/TMWEAuthManager.ts` (wrapper sobre `tmwe-api-integrated.ts`)
   - [ ] Crear `src/lib/tmwe/TMWEApiClient.ts` (facade sobre `tmwe-api-proxy`)
   - [ ] Crear `src/lib/tmwe/types.ts` (tipos compartidos)
   - [ ] Testing de integración (no unitario - delega a código existente)

2. **Día 2: EmailApi + FolderApi (Wrappers)**
   - [ ] Crear `src/lib/tmwe/api/EmailApi.ts` (wrapper sobre `emailSearchApi`)
   - [ ] Crear `src/lib/tmwe/api/FolderApi.ts` (wrapper sobre `emailSearchApi`)
   - [ ] Crear `src/lib/tmwe/api/index.ts` (exports)
   - [ ] Testing de integración

3. **Día 3: Integración y Exports Centralizados**
   - [ ] Crear `src/lib/tmwe/index.ts` (exports centralizados)
   - [ ] Verificar que todos los wrappers funcionan correctamente
   - [ ] Documentar API pública
   - [ ] Testing E2E de flujo completo

**Entregables:**
- ✅ Capa de abstracción API funcional (basada en código probado)
- ✅ Autenticación OAuth centralizada (reutiliza implementación existente)
- ✅ Módulos EmailApi y FolderApi operativos (wrappers sobre funciones existentes)
- ✅ 0 bugs de OAuth (código ya probado en producción)

**Ventajas v3.0:**
- ⏱️ 3 días más rápido que v2.0
- 🔒 Menor riesgo (reutiliza código probado)
- 🧪 Testing simplificado (solo integración)
- ↩️ Backward compatible (funciones existentes siguen funcionando)

---

### **SPRINT 2: Casos de Uso Críticos (Días 4-10)**

**Objetivo:** Migrar funcionalidades esenciales de lectura

#### Tareas
1. **Día 4-6: CU1 - Lista de Emails**
   - [ ] Actualizar `useEmailList.ts`
   - [ ] Modificar `FunEmail.tsx` y `EmailList.tsx`
   - [ ] Testing E2E de listado

2. **Día 7-8: CU2 - Detalle de Email**
   - [ ] Actualizar `useEmailDetail.ts`
   - [ ] Modificar `EmailDetail.tsx`
   - [ ] Testing de renderizado HTML

3. **Día 9-10: CU5 y CU6 - Stats**
   - [ ] Actualizar `FunEmailQuickStats.tsx`
   - [ ] Actualizar `FunEmailGlobalStats.tsx`
   - [ ] Configurar auto-refresh

**Entregables:**
- ✅ Listado de emails funcional sin DB local
- ✅ Detalle de emails desde API
- ✅ Estadísticas en tiempo real

---

### **SPRINT 3: SmartInbox (Días 11-17)**

**Objetivo:** Migrar clasificación con IA

#### Tareas
1. **Día 11-12: Migración DB**
   - [ ] Crear tabla `email_ai_classifications_v2`
   - [ ] Script de migración de datos existentes
   - [ ] RLS policies

2. **Día 13-14: ClassificationApi**
   - [ ] Implementar `src/lib/tmwe/api/ClassificationApi.ts`
   - [ ] Métodos de clasificación con `tmwe_email_id`
   - [ ] Testing

3. **Día 15-17: Actualizar Componentes**
   - [ ] Modificar `SmartInboxTab.tsx`
   - [ ] Actualizar `useSmartClassification.ts`
   - [ ] Testing de clasificación batch

**Entregables:**
- ✅ SmartInbox funcional con Zero-Sync
- ✅ Clasificaciones almacenadas con `tmwe_email_id`
- ✅ UI sin referencias a `email_messages`

---

### **SPRINT 4: Búsqueda y Threads (Días 18-22)**

**Objetivo:** Funcionalidades avanzadas de email

#### Tareas
1. **Día 18-19: CU7 - Búsqueda**
   - [ ] Implementar `EmailApi.searchEmails()`
   - [ ] Actualizar hook de búsqueda
   - [ ] UI de resultados con highlight

2. **Día 20-22: CU8 - Threads**
   - [ ] Implementar `EmailApi.getEmailThread()`
   - [ ] Actualizar `useEmailThread.ts`
   - [ ] Componente de visualización de thread

**Entregables:**
- ✅ Búsqueda full-text funcional
- ✅ Threads de conversación desde API

---

### **SPRINT 5: Remitentes y Reglas (Días 23-31)**

**Objetivo:** Análisis de remitentes y gestión de reglas

#### Tareas
1. **Día 23-26: CU4 - Análisis Remitentes**
   - [ ] Implementar `SenderApi`
   - [ ] Actualizar `email-sender-analyzer.ts`
   - [ ] Testing de performance con 1000+ remitentes

2. **Día 27-31: CU10 - Reglas de Remitente**
   - [ ] Diseñar arquitectura client-side filtering
   - [ ] Implementar `SenderApi.applyRulesToEmails()`
   - [ ] Integrar con `EmailApi.getEmailList()`
   - [ ] Actualizar UI de gestión de reglas
   - [ ] Testing exhaustivo

**Entregables:**
- ✅ Análisis de remitentes desde API
- ✅ Reglas aplicadas en tiempo real
- ✅ UI de gestión funcional

---

### **SPRINT 6: Sincronización y Cleanup (Días 32-34)**

**Objetivo:** Finalizar migración y limpieza

#### Tareas
1. **Día 32-33: CU9 - Sincronización**
   - [ ] Crear tabla `email_sync_metadata`
   - [ ] Actualizar `EdgeFunctionSyncService`
   - [ ] Modificar estrategias de descarga
   - [ ] Actualizar UI de dialogs

2. **Día 34: Cleanup Final**
   - [ ] Eliminar código legacy de `email_messages`
   - [ ] Actualizar documentación
   - [ ] Code review general
   - [ ] Testing de regresión completo

**Entregables:**
- ✅ Sistema de sincronización metadata-only
- ✅ Código limpio sin referencias a DB local
- ✅ Documentación actualizada

---

## 🧪 TESTING Y VALIDACIÓN

### Testing por Sprint

#### Sprint 1: Infraestructura
```typescript
// TMWEAuthManager.test.ts
describe('TMWEAuthManager', () => {
  it('should refresh token before expiration', async () => {
    // ...
  });
  
  it('should handle refresh token failure', async () => {
    // ...
  });
});

// TMWEApiClient.test.ts
describe('TMWEApiClient', () => {
  it('should retry failed requests with exponential backoff', async () => {
    // ...
  });
  
  it('should attach OAuth token to all requests', async () => {
    // ...
  });
});
```

#### Sprint 2-6: Integración
```typescript
// E2E Testing con Playwright
test('should load email list from API', async ({ page }) => {
  await page.goto('/funnemail');
  await page.selectOption('[data-testid="folder-select"]', 'INBOX');
  
  // Verificar que emails cargan desde API (no DB)
  const emails = await page.locator('[data-testid="email-item"]').count();
  expect(emails).toBeGreaterThan(0);
});

test('should classify email and display in SmartInbox', async ({ page }) => {
  // 1. Clasificar email
  await page.goto('/funnemail?tab=smart-inbox');
  await page.click('[data-testid="classify-new-button"]');
  await page.waitForSelector('[data-testid="classification-success"]');
  
  // 2. Verificar en categoría
  await page.selectOption('[data-testid="category-select"]', 'important');
  const classified = await page.locator('[data-testid="classified-email"]').count();
  expect(classified).toBeGreaterThan(0);
});
```

### Performance Benchmarks

| Métrica | Objetivo | Método de Medición |
|---------|----------|-------------------|
| **Tiempo de carga lista emails** | < 1s | React Query devtools |
| **Tiempo de apertura detalle** | < 500ms | Performance API |
| **Clasificación individual** | < 3s | Supabase logs |
| **Clasificación batch (100)** | < 30s | Progress tracker |
| **Aplicación de reglas** | < 200ms | Client-side timing |
| **Búsqueda full-text** | < 800ms | React Query devtools |

### Checklist de Validación Final

**Funcionalidad:**
- [ ] Todos los casos de uso funcionan sin `email_messages`
- [ ] SmartInbox clasifica con `tmwe_email_id`
- [ ] Reglas de remitente se aplican en tiempo real
- [ ] Búsqueda retorna resultados correctos
- [ ] Threads muestran conversaciones completas

**Performance:**
- [ ] Listado de emails < 1s
- [ ] Sin queries innecesarias a Supabase
- [ ] Cache de React Query configurado óptimamente
- [ ] No hay memory leaks en componentes

**Seguridad:**
- [ ] Tokens OAuth se renuevan automáticamente
- [ ] No hay tokens expuestos en código cliente
- [ ] RLS policies activas en todas las tablas

**UX:**
- [ ] Loading states en todas las operaciones
- [ ] Error messages claros y accionables
- [ ] Transiciones suaves entre estados
- [ ] Feedback visual de operaciones exitosas

---

## 🌟 BENEFICIOS PLAN V3.0

### Comparativa v2.0 vs v3.0

| Aspecto | Plan v2.0 | Plan v3.0 | Mejora |
|---------|-----------|-----------|--------|
| **Duración Total** | 26-37 días | 23-34 días | ⏬ -3 días |
| **Sprint 1** | 5 días | 2-3 días | ⏬ -2-3 días |
| **Código OAuth Nuevo** | ~300 líneas | 0 líneas | ✅ Reutiliza existente |
| **Riesgo de Bugs OAuth** | Alto | Bajo | 🔒 Código probado |
| **Testing Requerido** | Unitario + Integración | Solo Integración | ⏱️ Más rápido |
| **Mantenibilidad** | Dos implementaciones OAuth | Una sola fuente de verdad | 🎯 Simplificado |
| **Backward Compatibility** | Requiere refactor | 100% compatible | ↩️ Sin breaking changes |

### Ventajas Técnicas

#### 1. **Reducción de Tiempo**
- Sprint 1 reducido de 5 a 2-3 días
- Total del proyecto reducido ~3 días
- Menos tiempo en debugging de OAuth

#### 2. **Menor Riesgo**
- ✅ Reutiliza código OAuth probado en producción
- ✅ No reinventa la rueda con HTTP clients
- ✅ Mantiene funcionalidad existente intacta
- ✅ Rollback fácil si algo falla

#### 3. **Testing Simplificado**
- ❌ NO necesita tests unitarios de OAuth (ya existen)
- ✅ Solo tests de integración para wrappers
- ✅ Menos mocking necesario
- ✅ Tests más rápidos de ejecutar

#### 4. **Mantenibilidad Mejorada**
- Un solo punto de verdad para OAuth (`tmwe-api-integrated.ts`)
- API pública consistente a través de wrappers
- Cambios futuros en un solo lugar
- Documentación del código existente sigue válida

#### 5. **Consistencia Arquitectónica**
- Mantiene patrones ya establecidos en el proyecto
- No introduce nuevas abstracciones innecesarias
- Equipo ya familiarizado con funciones subyacentes
- Curva de aprendizaje mínima

### Patrón Wrapper/Facade Explicado

```
┌─────────────────────────────────────────────────┐
│  NUEVA API PÚBLICA (v3.0)                       │
│  ┌──────────────────────────────────────────┐   │
│  │  TMWEAuthManager.getValidToken()         │   │
│  │         └─→ ensureValidToken()          │   │
│  │              (tmwe-api-integrated.ts)    │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │  EmailApi.getEmailList()                 │   │
│  │         └─→ emailSearchApi               │   │
│  │              .getEmailsMetadata()        │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

**Beneficio:** Interfaz limpia y consistente, pero delegando a implementaciones probadas.

### Código a Reutilizar (NO Modificar)

```typescript
// ✅ Estas funciones YA EXISTEN y funcionan perfectamente

// De tmwe-api-integrated.ts
export async function ensureValidToken(): Promise<string>
export async function refreshAccessToken(): Promise<boolean>
export async function getApiConfigFromDB()
export async function setApiConfigToDB(config)
export async function clearApiConfigFromDB()

// De tmwe-email-search-api.ts
export const emailSearchApi = {
  getEmailsMetadata: async (params) => { /* implementación existente */ },
  getEmailDetail: async (params) => { /* implementación existente */ },
  searchEmails: async (params) => { /* implementación existente */ },
  getFolders: async (params) => { /* implementación existente */ },
  getStatistics: async (params) => { /* implementación existente */ },
  getThread: async (params) => { /* implementación existente */ },
  markAsRead: async (emailId) => { /* implementación existente */ }
}
```

### Estructura de Archivos Nueva

```
src/lib/tmwe/
├── index.ts                    # Re-exports centralizados (NUEVO)
├── TMWEAuthManager.ts          # Wrapper (NUEVO - ~50 líneas)
├── TMWEApiClient.ts            # Facade (NUEVO - ~40 líneas)
├── types.ts                    # Tipos compartidos (NUEVO - ~30 líneas)
└── api/
    ├── index.ts                # Re-exports (NUEVO - ~10 líneas)
    ├── EmailApi.ts             # Wrapper (NUEVO - ~80 líneas)
    ├── FolderApi.ts            # Wrapper (NUEVO - ~30 líneas)
    ├── ClassificationApi.ts    # Lógica propia (Sprint 3)
    └── SenderApi.ts            # Lógica propia (Sprint 5)
```

**Total Código Nuevo en Sprint 1:** ~240 líneas  
**Total Código OAuth Nuevo:** 0 líneas (todo delegado)

### Fecha de Finalización Actualizada

**Plan v2.0:** 37 días → Finalización estimada: 2025-03-15  
**Plan v3.0:** 34 días → Finalización estimada: 2025-03-12  

**🎯 3 días de adelanto**

---

## 📚 DOCUMENTACIÓN ADICIONAL

### Archivos de Documentación a Crear/Actualizar

1. **`docs/API_ARCHITECTURE.md`**
   - Diagrama de clases de capa de abstracción
   - Flujos de datos
   - Manejo de errores

2. **`docs/OAUTH_INTEGRATION.md`**
   - Flujo de autenticación OAuth
   - Renovación de tokens
   - Debugging de problemas de auth

3. **`docs/ZERO_SYNC_BEST_PRACTICES.md`**
   - Patrones recomendados
   - Anti-patrones a evitar
   - Optimización de cache

4. **`docs/TESTING_GUIDE.md`**
   - Setup de entorno de testing
   - Mocking de TMWE API
   - Casos de test críticos

---

## 🎯 CONCLUSIÓN

Este plan de migración v3.0 garantiza:

✅ **Trazabilidad completa:** Cada caso de uso mapeado a componentes específicos  
✅ **Arquitectura coherente:** Capa de abstracción centralizada usando wrappers  
✅ **OAuth reutilizado:** TMWEAuthManager delega a código probado existente  
✅ **Menor riesgo:** Código OAuth ya en producción, sin reimplementación  
✅ **Plan optimizado:** 23-34 días de desarrollo (3 días menos que v2.0)  
✅ **Testing simplificado:** Solo integración, no unitario para wrappers  
✅ **Backward compatible:** Funciones existentes siguen operativas  

**Mejoras vs v2.0:**
- ⏱️ Sprint 1 reducido de 5 a 2-3 días
- 🔒 0 líneas de código OAuth nuevo
- ✅ Reutiliza código probado en producción
- 🎯 Una sola fuente de verdad para OAuth
- ↩️ Sin breaking changes en código existente

**Próximos Pasos:**
1. Revisar y aprobar plan v3.0 con equipo
2. Iniciar Sprint 1 con wrappers (2-3 días)
3. Validar que wrappers funcionan correctamente
4. Continuar con sprints restantes
5. Revisión semanal de progreso

**Fecha de Inicio Propuesta:** 2025-02-03  
**Fecha de Finalización Estimada v3.0:** 2025-03-12 (3 días antes que v2.0)

---

*Documento generado por Lovable AI - Versión 3.0 (Wrapper/Facade Pattern)*
