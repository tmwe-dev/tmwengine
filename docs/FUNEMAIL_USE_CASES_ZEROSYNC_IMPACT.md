# FunEmail - Casos de Uso e Impacto de Zero-Sync Architecture

**Fecha**: 2025-01-29  
**Versión**: 1.0  
**Estado**: Migration Analysis - TMWE API Integration

---

## 📋 Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Casos de Uso Detallados](#casos-de-uso-detallados)
3. [Análisis de Impacto por Caso de Uso](#análisis-de-impacto-por-caso-de-uso)
4. [Impactos Críticos](#impactos-críticos)
5. [Matriz Comparativa Global](#matriz-comparativa-global)
6. [Casos Críticos Afectados](#casos-críticos-afectados)
7. [Recomendaciones](#recomendaciones)

---

## 🎯 Resumen Ejecutivo

### Arquitectura Actual (Local DB)
- **Storage**: PostgreSQL local con sincronización periódica
- **Latencia**: < 50ms (queries locales)
- **Dependencia**: Baja (funciona offline parcialmente)
- **Freshness**: Depende de frecuencia de sync

### Arquitectura Zero-Sync (TMWE API)
- **Storage**: TMWE API como única fuente de verdad
- **Latencia**: 200-500ms (llamadas API externas)
- **Dependencia**: Alta (requiere TMWE disponible)
- **Freshness**: Datos siempre actualizados en tiempo real

---

## 📊 Casos de Uso Detallados

### 1. Lectura de Lista de Emails (EmailList)

**Descripción**: Usuario visualiza inbox con lista paginada de emails clasificados por carpetas (Inbox, Sent, Drafts, etc.)

**Componente Principal**: `src/components/email/EmailList.tsx`

**Flujo Actual (Local DB)**:
```
1. Usuario accede a /funnemail
2. React Query: useEmailMessages() → SELECT FROM email_messages WHERE user_email = X
3. Renderizado inmediato desde caché local
4. Sync background opcional via tmwe-email-sync-master
```

**Flujo Zero-Sync (TMWE API)**:
```
1. Usuario accede a /funnemail
2. React Query: useEmailMessages() → Edge Function → TMWE API /messages?folder=INBOX
3. Renderizado tras respuesta API (200-500ms)
4. Cache React Query en memoria (5 minutos)
```

**Tabla Comparativa**:

| Aspecto | Local DB | Zero-Sync TMWE API | Impacto |
|---------|----------|-------------------|---------|
| **Latencia inicial** | 20-50ms | 200-500ms | ⚠️ **10x más lento** |
| **Freshness datos** | Depende sync (5-60 min) | Siempre actualizado | ✅ **Mejora** |
| **Llamadas API** | 0 (solo DB) | 1 por cada fetch | ⚠️ **Incremento costos** |
| **Offline support** | ✅ Funciona | ❌ Requiere conexión | ⚠️ **Pérdida funcionalidad** |
| **Paginación** | Server-side eficiente | API externa (límites TMWE) | ⚠️ **Menos control** |

---

### 2. Visualización de Detalle de Email (EmailDetail)

**Descripción**: Usuario abre email para leer contenido completo, attachments y metadata.

**Componente Principal**: `src/components/email/EmailDetail.tsx`

**Flujo Actual (Local DB)**:
```
1. Click en email → SELECT FROM email_messages WHERE id = X
2. Fetch attachments desde email_attachments (JOIN)
3. Renderizado completo < 30ms
```

**Flujo Zero-Sync (TMWE API)**:
```
1. Click en email → Edge Function → TMWE API /messages/{tmwe_email_id}
2. Fetch attachments via TMWE API /messages/{id}/attachments
3. Renderizado tras respuesta (300-600ms)
```

**Tabla Comparativa**:

| Aspecto | Local DB | Zero-Sync TMWE API | Impacto |
|---------|----------|-------------------|---------|
| **Latencia apertura** | 20-30ms | 300-600ms | ⚠️ **20x más lento** |
| **Attachments loading** | Paralelo (Storage) | Secuencial (API) | ⚠️ **User experience degradada** |
| **Read receipts** | Instant local update | Requiere API call | ⚠️ **Delay notificaciones** |
| **Formato HTML** | Pre-sanitizado en DB | Sanitizar on-the-fly | ⚠️ **Overhead processing** |

---

### 3. SmartInbox - Clasificación Inteligente (AI Classifications)

**Descripción**: Sistema de clasificación automática de emails usando AI (importante/spam/marketing/etc.)

**Componente Principal**: `src/components/email/smart-inbox/SmartInboxPanel.tsx`

**Flujo Actual (Local DB)**:
```
1. Edge Function clasifica emails → INSERT INTO email_ai_classifications
2. Frontend: SELECT classifications JOIN email_messages ON message_id
3. Renderizado instantáneo con clasificaciones cacheadas
```

**Flujo Zero-Sync (TMWE API)**:
```
1. Edge Function clasifica emails → INSERT INTO email_ai_classifications (PROBLEMA: message_id es UUID local)
2. ⚠️ REQUIERE tmwe_email_id para hacer JOIN con API response
3. Frontend: 
   - Fetch emails via TMWE API
   - Fetch classifications via DB (usando tmwe_email_id)
   - Merge manual en cliente
```

**Tabla Comparativa**:

| Aspecto | Local DB | Zero-Sync TMWE API | Impacto |
|---------|----------|-------------------|---------|
| **JOIN Performance** | SQL nativo (< 10ms) | Manual merge client-side | ⚠️ **100x más lento** |
| **Data Consistency** | ACID garantizado | Race conditions posibles | 🔴 **CRÍTICO** |
| **Migration Complexity** | N/A | Requiere tmwe_email_id mapping | 🔴 **BLOQUEANTE** |
| **Real-time updates** | Trigger-based | Polling (React Query) | ⚠️ **Delay notificaciones** |

**⚠️ IMPACTO CRÍTICO**: Este caso de uso **REQUIERE** la migración de `tmwe_email_id` completada antes de eliminar `email_messages` locales.

---

### 4. Análisis de Senders (SenderGroups)

**Descripción**: Agrupación de remitentes por categorías (clientes, proveedores, personal) con estadísticas.

**Componente Principal**: `src/components/email/sender-groups/SenderGroupsManager.tsx`

**Flujo Actual (Local DB)**:
```
1. SELECT sender_email, COUNT(*) FROM email_messages GROUP BY sender_email
2. JOIN con email_sender_groups para obtener categorías
3. Cálculos agregados en SQL (SUM, AVG, COUNT)
```

**Flujo Zero-Sync (TMWE API)**:
```
1. Fetch ALL emails via TMWE API (puede ser 1000s de emails)
2. Agrupar manualmente en cliente (JavaScript)
3. JOIN con email_sender_groups locales
4. Cálculos agregados en memoria
```

**Tabla Comparativa**:

| Aspecto | Local DB | Zero-Sync TMWE API | Impacto |
|---------|----------|-------------------|---------|
| **Aggregation Performance** | SQL optimizado (< 50ms) | Client-side (2-5s para 10k emails) | 🔴 **100x más lento** |
| **Memory usage** | Server-side | Client-side (puede crashear browser) | 🔴 **CRÍTICO para datasets grandes** |
| **Query complexity** | Window functions, CTEs | Loops anidados en JS | ⚠️ **Código complejo y frágil** |
| **Scalability** | ✅ Escalable a millones | ❌ Límite práctico ~50k emails | 🔴 **Limitación arquitectural** |

---

### 5. Quick Stats Dashboard

**Descripción**: Panel con estadísticas rápidas (emails today, unread, important, spam rate).

**Componente Principal**: `src/components/email/EmailQuickStats.tsx`

**Flujo Actual (Local DB)**:
```sql
SELECT 
  COUNT(*) FILTER (WHERE date = today) as today_count,
  COUNT(*) FILTER (WHERE read = false) as unread_count,
  COUNT(*) FILTER (WHERE classification = 'important') as important_count
FROM email_messages WHERE user_email = X
```

**Flujo Zero-Sync (TMWE API)**:
```
1. TMWE API /messages?folder=INBOX → Fetch ALL (sin filtros agregados)
2. Client-side filtering/counting
3. Multiples API calls si requiere datos de múltiples carpetas
```

**Tabla Comparativa**:

| Aspecto | Local DB | Zero-Sync TMWE API | Impacto |
|---------|----------|-------------------|---------|
| **Query time** | 10-20ms (1 query) | 1-3s (múltiples API calls) | ⚠️ **100x más lento** |
| **API calls** | 0 | 3-5 por dashboard load | ⚠️ **Incremento costos** |
| **Real-time accuracy** | Depende sync | Siempre preciso | ✅ **Mejora** |
| **Cache strategy** | PostgreSQL cache | React Query (5 min TTL) | ⚠️ **Menos eficiente** |

---

### 6. Global Analytics (EmailGlobalStats)

**Descripción**: Análisis histórico profundo (tendencias, patrones, time-series).

**Componente Principal**: `src/components/email/EmailGlobalStats.tsx`

**Flujo Actual (Local DB)**:
```sql
SELECT DATE(created_at) as date, 
       COUNT(*) as count,
       AVG(tokens_used) as avg_tokens
FROM email_messages
WHERE user_email = X
  AND created_at > now() - interval '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC
```

**Flujo Zero-Sync (TMWE API)**:
```
1. TMWE API /messages?since=30_days_ago → Fetch ALL (puede ser 10k+ emails)
2. Client-side grouping, aggregation, sorting
3. Chart rendering tras procesamiento completo
```

**Tabla Comparativa**:

| Aspecto | Local DB | Zero-Sync TMWE API | Impacto |
|---------|----------|-------------------|---------|
| **Time-series queries** | Window functions (50ms) | Manual loops (5-10s) | 🔴 **100x más lento** |
| **Memory footprint** | Server-side | Client-side (500MB+ para 50k emails) | 🔴 **Riesgo crashes** |
| **Historical data** | Ilimitado (TB storage) | Limitado por TMWE retention | ⚠️ **Pérdida datos antiguos** |
| **Chart rendering** | Pre-agregado | Agregado on-the-fly | ⚠️ **UI lag** |

**🔴 RECOMENDACIÓN**: Mantener tabla agregada local (`email_analytics_daily`) para este caso de uso.

---

### 7. Email Search (Búsqueda Avanzada)

**Descripción**: Full-text search en asunto, cuerpo, remitente, adjuntos.

**Componente Principal**: `src/components/email/EmailSearchBar.tsx`

**Flujo Actual (Local DB)**:
```sql
SELECT * FROM email_messages
WHERE user_email = X
  AND (
    subject ILIKE '%keyword%' OR
    body_text ILIKE '%keyword%' OR
    sender_email ILIKE '%keyword%'
  )
LIMIT 50
```

**Flujo Zero-Sync (TMWE API)**:
```
1. TMWE API /messages/search?q=keyword
2. Renderizado resultados paginados
```

**Tabla Comparativa**:

| Aspecto | Local DB | Zero-Sync TMWE API | Impacto |
|---------|----------|-------------------|---------|
| **Search speed** | 50-100ms (indexes) | 300-800ms (API) | ⚠️ **5x más lento** |
| **Search capabilities** | Full control (regex, fuzzy) | Limitado a TMWE API capabilities | ⚠️ **Funcionalidad reducida** |
| **Relevance ranking** | Custom scoring | TMWE algorithm | ⚠️ **Menos control** |
| **Attachments search** | Indexado localmente | Requiere API support | ⚠️ **Puede no estar disponible** |

---

### 8. Email Threads (Conversaciones)

**Descripción**: Agrupación de emails en threads conversacionales.

**Componente Principal**: `src/components/email/EmailThreadView.tsx`

**Flujo Actual (Local DB)**:
```sql
WITH RECURSIVE thread AS (
  SELECT * FROM email_messages WHERE id = X
  UNION
  SELECT m.* FROM email_messages m
  JOIN thread t ON m.in_reply_to = t.message_id
)
SELECT * FROM thread ORDER BY created_at
```

**Flujo Zero-Sync (TMWE API)**:
```
1. TMWE API /messages/{id}/thread
2. Si no existe endpoint → fetch ALL, manual threading
```

**Tabla Comparativa**:

| Aspecto | Local DB | Zero-Sync TMWE API | Impacto |
|---------|----------|-------------------|---------|
| **Thread reconstruction** | Recursive CTE (20ms) | Manual (1-3s) o API endpoint | ⚠️ **Depende de TMWE capabilities** |
| **Nested replies** | Soportado nativamente | Requiere algoritmo custom | ⚠️ **Complejidad código** |
| **Performance** | O(log n) | O(n) o dependiente de API | ⚠️ **Escalabilidad limitada** |

---

### 9. Email Download/Sync (Background)

**Descripción**: Proceso de descarga masiva de emails desde TMWE.

**Edge Function**: `supabase/functions/tmwe-email-sync-master/index.ts`

**Flujo Actual (Local DB)**:
```
1. Trigger manual/automático
2. Fetch emails via TMWE API
3. INSERT INTO email_messages (batch 1000)
4. UPDATE email_sync_progress
```

**Flujo Zero-Sync (TMWE API)**:
```
1. ⚠️ ELIMINADO - Ya no se almacenan emails localmente
2. Solo sync metadata necesaria (classifications, preferences)
```

**Tabla Comparativa**:

| Aspecto | Local DB | Zero-Sync TMWE API | Impacto |
|---------|----------|-------------------|---------|
| **Storage costs** | Alto (1GB+ por usuario) | Cero | ✅ **Ahorro significativo** |
| **Sync complexity** | Alta (estado, retries, dedup) | Baja (solo metadata) | ✅ **Simplificación** |
| **Data freshness** | Stale (5-60 min delay) | Always fresh | ✅ **Mejora UX** |
| **Offline access** | ✅ Disponible | ❌ No disponible | ⚠️ **Pérdida funcionalidad** |

---

### 10. Sender Rules Management (Reglas Automáticas)

**Descripción**: Aplicación de reglas automáticas sobre emails (mover carpeta, clasificar, archivar).

**Componente Principal**: `src/components/email/sender-groups/SenderRuleEditor.tsx`

**Flujo Actual (Local DB)**:
```
1. Email arrives → Trigger → evaluate_sender_rules()
2. UPDATE email_messages SET folder = X, classification = Y WHERE ...
3. Cambios reflejados instantáneamente en UI
```

**Flujo Zero-Sync (TMWE API)**:
```
1. Email arrives → ⚠️ NO HAY TRIGGER local
2. Opciones:
   A) Polling periódico (ineficiente)
   B) TMWE Webhook → Edge Function → apply rules via API
   C) Client-side rules al listar emails (muy lento)
3. Cambios requieren llamada API para persistir
```

**Tabla Comparativa**:

| Aspecto | Local DB | Zero-Sync TMWE API | Impacto |
|---------|----------|-------------------|---------|
| **Rule execution** | Instant (DB trigger) | Delayed (webhook/polling) | 🔴 **UX degradada** |
| **Consistency** | Garantizada (ACID) | Eventual | 🔴 **Riesgo inconsistencias** |
| **Rollback capability** | ✅ Transaccional | ❌ Difícil revertir | 🔴 **CRÍTICO** |
| **Architecture complexity** | Baja | Alta (webhook infra) | 🔴 **Incremento maintenance** |

**🔴 IMPACTO CRÍTICO**: Este caso de uso requiere **rediseño arquitectural completo** para funcionar con Zero-Sync.

---

## 🔍 Impactos Críticos

### 1. SmartInbox Classification
- **BLOQUEANTE**: Requiere `tmwe_email_id` en `email_ai_classifications`
- **Solución**: Migration edge function `migrate-classification-tmwe-ids` DEBE ejecutarse ANTES de eliminar `email_messages`
- **Testing**: Dry-run validado con usuario `jose@tmwengine.com`

### 2. Sender Rules Automation
- **BLOQUEANTE**: Arquitectura actual incompatible con Zero-Sync
- **Solución**: 
  - Opción A: Mantener tabla `email_messages` solo para rules (hybrid approach)
  - Opción B: Implementar TMWE webhooks + Edge Function processor
  - Opción C: Client-side rules (no recomendado para performance)

### 3. Analytics Dashboard
- **DEGRADACIÓN SEVERA**: Client-side aggregation no escalable
- **Solución**: Mantener tabla agregada diaria `email_analytics_daily` sincronizada vía Edge Function

---

## 📊 Matriz Comparativa Global

| Métrica | Local DB | Zero-Sync API | Delta | Recomendación |
|---------|----------|---------------|-------|---------------|
| **Latencia promedio** | 30ms | 400ms | +1300% | ⚠️ Requires UX optimization (loaders, skeleton) |
| **API calls/día** | ~50 (sync only) | ~5000 (fetch on demand) | +10000% | ⚠️ Monitor TMWE rate limits + costs |
| **Storage costs** | $50/month | $5/month | -90% | ✅ Ahorro significativo |
| **Data freshness** | 5-60 min delay | Real-time | ✅ | ✅ Mejora UX |
| **Offline capability** | ✅ Partial | ❌ None | ⚠️ | Consider PWA + service worker cache |
| **Code complexity** | Medium | High | +40% LOC | ⚠️ More maintenance overhead |
| **Scalability** | ✅ Unlimited | ⚠️ Limited by API | Depends on TMWE | Monitor API quotas |

---

## 🚨 Casos Críticos Afectados

### 🔴 HIGH RISK (Require Architecture Changes)
1. **Sender Rules Automation** → Requires webhook infrastructure
2. **Global Analytics** → Requires aggregated tables maintained
3. **SmartInbox Classification** → BLOCKS migration until `tmwe_email_id` complete

### 🟡 MEDIUM RISK (Performance Degradation)
4. **Email List Pagination** → 10x slower, needs skeleton loaders
5. **Sender Groups Analysis** → May crash on large datasets
6. **Email Search** → Limited by TMWE API capabilities

### 🟢 LOW RISK (Improved or Neutral)
7. **Email Detail View** → Slower but acceptable with loaders
8. **Email Threads** → Depends on TMWE API support
9. **Email Sync** → Simplified (eliminated)
10. **Quick Stats** → Slower but cacheable

---

## 💡 Recomendaciones

### Para Usuarios (Comunicación)
1. **Expectativa de latencia**: "Los emails ahora se cargan directamente desde TMWE, lo que garantiza datos siempre actualizados, pero puede tomar 0.5-1s adicional"
2. **Offline limitation**: "Requiere conexión activa para acceder a emails (no hay modo offline)"
3. **Beta testing**: "Prueba la nueva arquitectura con cuenta de prueba antes de migrar producción"

### Para Desarrollo (Implementación)
1. **Priority 1**: Completar migración `tmwe_email_id` en `email_ai_classifications` (BLOQUEANTE)
2. **Priority 2**: Rediseñar Sender Rules con webhooks o mantener tabla local (hybrid)
3. **Priority 3**: Implementar skeleton loaders, optimistic UI para mitigar latencia percibida
4. **Priority 4**: Mantener tabla `email_analytics_daily` para dashboards pesados
5. **Monitoring**: Dashboard de métricas TMWE API (rate limits, latency, errors)

### Arquitectura Hybrid (Recomendada)
```
┌─────────────────────────────────────────────────────┐
│                   Frontend (React)                   │
├─────────────────────────────────────────────────────┤
│  • Fetch emails from TMWE API (on-demand)           │
│  • Fetch classifications from local DB              │
│  • Fetch analytics from aggregated tables           │
└─────────────────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────┐
│              Edge Functions (Supabase)               │
├─────────────────────────────────────────────────────┤
│  • tmwe-api-proxy (auth + request forwarding)       │
│  • email-classifier (persist classifications)       │
│  • analytics-aggregator (daily rollup)              │
│  • webhook-receiver (sender rules automation)       │
└─────────────────────────────────────────────────────┘
                        ▼
┌──────────────────┬──────────────────────────────────┐
│   Local Tables   │        TMWE API                  │
├──────────────────┼──────────────────────────────────┤
│ • classifications│  • GET /messages                 │
│ • sender_groups  │  • GET /messages/{id}            │
│ • analytics_daily│  • POST /messages (send)         │
│ • sender_rules   │  • PATCH /messages/{id} (move)   │
└──────────────────┴──────────────────────────────────┘
```

---

## 📅 Timeline de Migración Recomendada

### Phase 1: Foundation (Week 1-2)
- ✅ Deploy `migrate-classification-tmwe-ids` edge function
- ✅ Execute dry-run on test users
- ✅ Validate data integrity

### Phase 2: UI Adaptation (Week 3-4)
- Implement skeleton loaders for all email lists
- Add error boundaries for API failures
- Test latency with real TMWE API

### Phase 3: Sender Rules Redesign (Week 5-6)
- Decide architecture (hybrid vs webhooks)
- Implement TMWE webhook receiver if chosen
- Migrate existing rules

### Phase 4: Analytics Optimization (Week 7-8)
- Create `email_analytics_daily` table
- Implement daily aggregation edge function
- Migrate GlobalStats to use aggregated data

### Phase 5: Production Migration (Week 9-10)
- Migrate pilot users (10%)
- Monitor metrics 48h
- Full rollout if successful

---

**Document Owner**: TMWEngine Development Team  
**Last Updated**: 2025-01-29  
**Next Review**: After Phase 1 completion
