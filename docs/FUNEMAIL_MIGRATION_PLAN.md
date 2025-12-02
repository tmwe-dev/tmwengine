# 🚀 PLAN DE MIGRACIÓN FUNEMAIL → ZERO-SYNC ARCHITECTURE

**Versión:** 2.0  
**Fecha:** 2025-01-29  
**Objetivo:** Migración completa a arquitectura Zero-Sync con TMWE API como única fuente de datos

---

## 📋 ÍNDICE

1. [Arquitectura Propuesta](#arquitectura-propuesta)
2. [Capa de Abstracción API](#capa-de-abstracción-api)
3. [Gestión Centralizada OAuth](#gestión-centralizada-oauth)
4. [Planes de Migración por Caso de Uso](#planes-de-migración-por-caso-de-uso)
5. [Matriz de Trazabilidad](#matriz-de-trazabilidad)
6. [Roadmap de Implementación](#roadmap-de-implementación)
7. [Testing y Validación](#testing-y-validación)

---

## 🏗️ ARQUITECTURA PROPUESTA

### Estructura de Capas

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  (React Components - FunEmail.tsx, SmartInbox, etc.)       │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    BUSINESS LOGIC LAYER                      │
│  (Custom Hooks - useEmailList, useEmailDetail, etc.)        │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                  API ABSTRACTION LAYER                       │
│         (Centralized TMWE API Communication)                 │
│                                                              │
│  ┌────────────────────────────────────────────────┐         │
│  │  TMWEApiClient (Singleton)                     │         │
│  │  - OAuth Token Management                      │         │
│  │  - Request/Response Interceptors               │         │
│  │  - Error Handling & Retry Logic                │         │
│  │  - Rate Limiting                                │         │
│  └────────────────────────────────────────────────┘         │
│                                                              │
│  ┌────────────────────────────────────────────────┐         │
│  │  API Modules                                   │         │
│  │  - EmailApi (getList, getDetail, search)      │         │
│  │  - FolderApi (getFolders, getStats)           │         │
│  │  - ClassificationApi (classify, getBatch)     │         │
│  │  - SenderApi (getSenders, getRules)           │         │
│  └────────────────────────────────────────────────┘         │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                   INFRASTRUCTURE LAYER                       │
│  - React Query Cache                                         │
│  - Supabase Client (metadata only)                          │
│  - Local Storage (OAuth tokens, preferences)                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 GESTIÓN CENTRALIZADA OAUTH

### 1. TMWEAuthManager

**Ubicación:** `src/lib/tmwe/TMWEAuthManager.ts`

**Responsabilidades:**
- Obtener y renovar access tokens OAuth
- Gestionar refresh tokens
- Validar expiración de tokens
- Manejar errores de autenticación
- Proporcionar interceptores para requests HTTP

**Implementación:**

```typescript
class TMWEAuthManager {
  private static instance: TMWEAuthManager;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private expiresAt: Date | null = null;

  // Singleton pattern
  static getInstance(): TMWEAuthManager;
  
  // Obtener token válido (renovar si es necesario)
  async getValidToken(): Promise<string>;
  
  // Renovar token usando refresh_token
  private async refreshAccessToken(): Promise<void>;
  
  // Verificar si token está próximo a expirar
  private isTokenExpiringSoon(): boolean;
  
  // Limpiar tokens (logout)
  clearTokens(): void;
  
  // Cargar tokens desde Supabase
  private async loadTokensFromDB(userEmail: string): Promise<void>;
}
```

**Integración con Supabase:**
```sql
-- Tabla user_tmwe_credentials ya existe
SELECT access_token, refresh_token, expires_at
FROM user_tmwe_credentials
WHERE user_email = auth.jwt() ->> 'email';
```

---

## 🌐 CAPA DE ABSTRACCIÓN API

### 2. TMWEApiClient (Core)

**Ubicación:** `src/lib/tmwe/TMWEApiClient.ts`

**Características:**
- Singleton para evitar múltiples instancias
- Interceptor automático de autenticación
- Manejo centralizado de errores
- Retry logic con exponential backoff
- Rate limiting (si TMWE API lo requiere)
- Logging centralizado

**Implementación:**

```typescript
class TMWEApiClient {
  private static instance: TMWEApiClient;
  private authManager: TMWEAuthManager;
  private baseURL: string;
  
  private constructor() {
    this.authManager = TMWEAuthManager.getInstance();
    this.baseURL = 'https://api.tmwe.it/v1';
  }
  
  static getInstance(): TMWEApiClient;
  
  // Método genérico para requests
  async request<T>(config: RequestConfig): Promise<T> {
    // 1. Obtener token válido
    const token = await this.authManager.getValidToken();
    
    // 2. Añadir headers de autenticación
    const headers = {
      ...config.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // 3. Ejecutar request con retry logic
    return this.executeWithRetry<T>({ ...config, headers });
  }
  
  private async executeWithRetry<T>(
    config: RequestConfig,
    retries = 3
  ): Promise<T>;
  
  // Métodos específicos HTTP
  async get<T>(url: string, params?: any): Promise<T>;
  async post<T>(url: string, data?: any): Promise<T>;
  async put<T>(url: string, data?: any): Promise<T>;
  async delete<T>(url: string): Promise<T>;
}
```

### 3. API Modules (Específicos por Dominio)

#### EmailApi

**Ubicación:** `src/lib/tmwe/api/EmailApi.ts`

```typescript
export class EmailApi {
  private client: TMWEApiClient;
  
  constructor() {
    this.client = TMWEApiClient.getInstance();
  }
  
  // Listar emails con paginación
  async getEmailList(params: {
    folder: string;
    limit?: number;
    offset?: number;
    filters?: EmailFilters;
  }): Promise<EmailListResponse>;
  
  // Obtener detalle de email
  async getEmailDetail(params: {
    emailId: number;
    folder: string;
  }): Promise<EmailDetail>;
  
  // Búsqueda de emails
  async searchEmails(params: {
    query: string;
    folder?: string;
    filters?: SearchFilters;
  }): Promise<SearchResponse>;
  
  // Obtener thread de conversación
  async getEmailThread(params: {
    messageId: string;
    folder: string;
  }): Promise<EmailThread>;
  
  // Marcar como leído/no leído
  async markAsRead(emailId: number, folder: string): Promise<void>;
  
  // Marcar como importante
  async markAsFlagged(emailId: number, folder: string): Promise<void>;
}
```

#### FolderApi

**Ubicación:** `src/lib/tmwe/api/FolderApi.ts`

```typescript
export class FolderApi {
  private client: TMWEApiClient;
  
  async getFolders(params?: {
    include_counts?: boolean;
  }): Promise<FolderListResponse>;
  
  async getFolderStats(folder: string): Promise<FolderStats>;
  
  async getGlobalStats(): Promise<GlobalStats>;
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
| **CU3: SmartInbox** | `SmartInboxTab.tsx`<br>`SmartInboxTabIntelligent.tsx` | `useSmartClassification.ts` | `EmailApi`<br>`ClassificationApi` | 🔴 CRÍTICA | 5-7 | CU1, migración DB |
| **CU4: Análisis Remitentes** | `EmailSenderManager.tsx` | `useSenderAnalysis.ts` | `SenderApi` | 🟡 MEDIA | 3-4 | CU1 |
| **CU5: Quick Stats** | `FunEmailQuickStats.tsx` | `useEmailFolderInfo.ts` | `FolderApi` | 🟢 BAJA | 1 | - |
| **CU6: Global Stats** | `FunEmailGlobalStats.tsx` | `useEmailFolderInfo.ts` | `FolderApi` | 🟢 BAJA | 1 | CU5 |
| **CU7: Búsqueda** | `FunEmail.tsx` (search) | `useEmailList.ts` | `EmailApi` | 🟡 MEDIA | 2 | CU1 |
| **CU8: Threads** | `EmailThreadView.tsx` | `useEmailThread.ts` | `EmailApi` | 🟡 MEDIA | 2-3 | CU1 |
| **CU9: Sincronización** | `QuickDownloadDialog.tsx`<br>`GlobalDownloadDialog.tsx` | - | `EmailApi` | 🟡 MEDIA | 4-5 | CU1, migración DB |
| **CU10: Reglas Remitente** | `EmailSenderManager.tsx`<br>`SenderRuleDialog.tsx` | `useSenderRules.ts` | `SenderApi` | 🔴 ALTA | 5-6 | CU1, CU4 |

**Total Estimado:** 26-37 días de desarrollo

---

## 🚀 ROADMAP DE IMPLEMENTACIÓN

### **SPRINT 1: Infraestructura Core (Días 1-5)**

**Objetivo:** Establecer bases de arquitectura Zero-Sync

#### Tareas
1. **Día 1-2: TMWEAuthManager + TMWEApiClient**
   - [ ] Implementar `src/lib/tmwe/TMWEAuthManager.ts`
   - [ ] Implementar `src/lib/tmwe/TMWEApiClient.ts`
   - [ ] Testing unitario de OAuth token refresh
   - [ ] Testing de retry logic

2. **Día 3-4: EmailApi Base**
   - [ ] Crear `src/lib/tmwe/api/EmailApi.ts`
   - [ ] Implementar `getEmailList()`
   - [ ] Implementar `getEmailDetail()`
   - [ ] Testing de integración con TMWE API

3. **Día 5: FolderApi**
   - [ ] Crear `src/lib/tmwe/api/FolderApi.ts`
   - [ ] Implementar `getFolders()`, `getFolderStats()`, `getGlobalStats()`
   - [ ] Testing

**Entregables:**
- ✅ Capa de abstracción API funcional
- ✅ Autenticación OAuth centralizada
- ✅ Módulos EmailApi y FolderApi operativos

---

### **SPRINT 2: Casos de Uso Críticos (Días 6-12)**

**Objetivo:** Migrar funcionalidades esenciales de lectura

#### Tareas
1. **Día 6-8: CU1 - Lista de Emails**
   - [ ] Actualizar `useEmailList.ts`
   - [ ] Modificar `FunEmail.tsx` y `EmailList.tsx`
   - [ ] Testing E2E de listado

2. **Día 9-10: CU2 - Detalle de Email**
   - [ ] Actualizar `useEmailDetail.ts`
   - [ ] Modificar `EmailDetail.tsx`
   - [ ] Testing de renderizado HTML

3. **Día 11-12: CU5 y CU6 - Stats**
   - [ ] Actualizar `FunEmailQuickStats.tsx`
   - [ ] Actualizar `FunEmailGlobalStats.tsx`
   - [ ] Configurar auto-refresh

**Entregables:**
- ✅ Listado de emails funcional sin DB local
- ✅ Detalle de emails desde API
- ✅ Estadísticas en tiempo real

---

### **SPRINT 3: SmartInbox (Días 13-19)**

**Objetivo:** Migrar clasificación con IA

#### Tareas
1. **Día 13-14: Migración DB**
   - [ ] Crear tabla `email_ai_classifications_v2`
   - [ ] Script de migración de datos existentes
   - [ ] RLS policies

2. **Día 15-16: ClassificationApi**
   - [ ] Implementar `src/lib/tmwe/api/ClassificationApi.ts`
   - [ ] Métodos de clasificación con `tmwe_email_id`
   - [ ] Testing

3. **Día 17-19: Actualizar Componentes**
   - [ ] Modificar `SmartInboxTab.tsx`
   - [ ] Actualizar `useSmartClassification.ts`
   - [ ] Testing de clasificación batch

**Entregables:**
- ✅ SmartInbox funcional con Zero-Sync
- ✅ Clasificaciones almacenadas con `tmwe_email_id`
- ✅ UI sin referencias a `email_messages`

---

### **SPRINT 4: Búsqueda y Threads (Días 20-24)**

**Objetivo:** Funcionalidades avanzadas de email

#### Tareas
1. **Día 20-21: CU7 - Búsqueda**
   - [ ] Implementar `EmailApi.searchEmails()`
   - [ ] Actualizar hook de búsqueda
   - [ ] UI de resultados con highlight

2. **Día 22-24: CU8 - Threads**
   - [ ] Implementar `EmailApi.getEmailThread()`
   - [ ] Actualizar `useEmailThread.ts`
   - [ ] Componente de visualización de thread

**Entregables:**
- ✅ Búsqueda full-text funcional
- ✅ Threads de conversación desde API

---

### **SPRINT 5: Remitentes y Reglas (Días 25-33)**

**Objetivo:** Análisis de remitentes y gestión de reglas

#### Tareas
1. **Día 25-28: CU4 - Análisis Remitentes**
   - [ ] Implementar `SenderApi`
   - [ ] Actualizar `email-sender-analyzer.ts`
   - [ ] Testing de performance con 1000+ remitentes

2. **Día 29-33: CU10 - Reglas de Remitente**
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

### **SPRINT 6: Sincronización y Cleanup (Días 34-37)**

**Objetivo:** Finalizar migración y limpieza

#### Tareas
1. **Día 34-36: CU9 - Sincronización**
   - [ ] Crear tabla `email_sync_metadata`
   - [ ] Actualizar `EdgeFunctionSyncService`
   - [ ] Modificar estrategias de descarga
   - [ ] Actualizar UI de dialogs

2. **Día 37: Cleanup Final**
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

Este plan de migración garantiza:

✅ **Trazabilidad completa:** Cada caso de uso mapeado a componentes específicos  
✅ **Arquitectura coherente:** Capa de abstracción centralizada  
✅ **OAuth centralizado:** TMWEAuthManager gestiona toda la autenticación  
✅ **Reutilización de código:** API Modules compartidos entre casos de uso  
✅ **Plan realista:** 26-37 días de desarrollo en 6 sprints  
✅ **Testing robusto:** Validación en cada sprint  

**Próximos Pasos:**
1. Revisar y aprobar plan con equipo
2. Priorizar sprints según necesidades de negocio
3. Iniciar Sprint 1 con infraestructura core
4. Revisión semanal de progreso

**Fecha de Inicio Propuesta:** 2025-02-03  
**Fecha de Finalización Estimada:** 2025-03-15

---

*Documento generado automáticamente por Lovable AI - Versión 2.0*
