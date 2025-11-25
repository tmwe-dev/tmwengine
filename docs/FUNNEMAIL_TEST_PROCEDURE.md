# 📋 FUNNEMAIL - PROCEDIMIENTO COMPLETO DE PRUEBAS

**Versión:** 1.0  
**Fecha:** 2025-01-29  
**Objetivo:** Validar funcionamiento completo de FunEmail post-migración Zero-Sync  
**Tiempo estimado:** ~105 minutos  

---

## 📌 ÍNDICE

1. [Pre-requisitos y Configuración](#fase-1-pre-requisitos-y-configuración)
2. [Tab Management](#fase-2-test-tab-management)
3. [Tab Suggestions](#fase-3-test-tab-suggestions)
4. [Tab Smart Inbox](#fase-4-test-tab-smart-inbox)
5. [Tab Automations](#fase-5-test-tab-automations)
6. [Edge Functions](#fase-6-test-edge-functions)
7. [Integración TMWE API](#fase-7-test-integración-tmwe-api)
8. [Casos Edge y Errores](#fase-8-test-casos-edge-y-errores)
9. [Validación Zero-Sync](#fase-9-checklist-validación-zero-sync)
10. [Scripts SQL de Verificación](#scripts-sql-de-verificación)

---

## FASE 1: PRE-REQUISITOS Y CONFIGURACIÓN

### 1.1 Verificar Conectividad TMWE API

| ID | Test | Acción | Resultado Esperado |
|----|------|--------|-------------------|
| PRE-01 | Edge Function activa | Abrir `/funnemail?tab=management` + DevTools > Network | Llamadas a `tmwe-api-proxy` devuelven status 200 |
| PRE-02 | Usuario autenticado | Verificar consola | Muestra `User: [email]@tmwe.it` |
| PRE-03 | tmwe_email configurado | Query `user_profiles` | Campo `tmwe_email` no es NULL |

### 1.2 Verificar Secrets Configurados

```sql
-- Script: Verificar configuración AI
SELECT provider, modello, attivo, last_test_status 
FROM config_ai 
ORDER BY attivo DESC, provider;
```

**Secrets requeridos en Supabase:**
- [ ] `TMWE_API_URL` - URL base API TMWE
- [ ] `TMWE_API_KEY` - Token autenticación TMWE
- [ ] `LOVABLE_API_KEY` - Auto-provisioned por Lovable Cloud

### 1.3 Estado Inicial de Datos

```sql
-- Script: Estado inicial antes de pruebas
SELECT 
  'email_messages' as tabla, COUNT(*) as total FROM email_messages
UNION ALL
SELECT 'email_ai_classifications', COUNT(*) FROM email_ai_classifications
UNION ALL
SELECT 'email_sender_groups', COUNT(*) FROM email_sender_groups
UNION ALL
SELECT 'email_sender_assignments', COUNT(*) FROM email_sender_assignments
UNION ALL
SELECT 'email_ai_automation_prompts', COUNT(*) FROM email_ai_automation_prompts
UNION ALL
SELECT 'email_ai_action_logs', COUNT(*) FROM email_ai_action_logs;
```

---

## FASE 2: TEST TAB MANAGEMENT

**Ruta:** `/funnemail?tab=management`  
**Tiempo estimado:** 15 minutos

### 2.1 Test Carga Inicial

| ID | Test | Acción | Resultado Esperado |
|----|------|--------|-------------------|
| MG-01 | Carga de remitentes | Navegar a tab Management | Lista de remitentes aparece con estadísticas |
| MG-02 | analyzeSenders() API-First | Observar Network tab | Llamadas a `tmwe-api-proxy` con handler `get_emails_metadata` |
| MG-03 | Fallback a email_messages | Si TMWE API falla | Carga datos desde tabla local sin error visible |

### 2.2 Test Grupos Predefinidos

| ID | Test | Acción | Resultado Esperado |
|----|------|--------|-------------------|
| MG-04 | 9 grupos visibles | Ver vista Grid | Operativo, Commerciale, Logistica, Rate Aeree, Rate Navali, Spedizionieri, Clienti, Fornitori, Enti/Autorità |
| MG-05 | Contadores correctos | Verificar número en cada grupo | Coincide con remitentes asignados en DB |

```sql
-- Script: Verificar grupos y asignaciones
SELECT 
  g.group_name,
  g.group_type,
  COUNT(a.id) as senders_assigned
FROM email_sender_groups g
LEFT JOIN email_sender_assignments a ON g.id = a.group_id
GROUP BY g.id, g.group_name, g.group_type
ORDER BY g.group_type, g.group_name;
```

### 2.3 Test Drag & Drop

| ID | Test | Acción | Resultado Esperado |
|----|------|--------|-------------------|
| MG-06 | Arrastrar remitente | Drag sender card hacia grupo | Highlight visual del grupo objetivo |
| MG-07 | Soltar en grupo | Drop sender en grupo | Toast de éxito + sender aparece en grupo |
| MG-08 | Persistencia | Recargar página | Sender sigue asignado al grupo |
| MG-09 | Collision detection | Arrastrar sobre múltiples grupos | Solo un grupo highlighted a la vez |

```sql
-- Script: Verificar asignación post drag-drop
SELECT 
  a.sender_email,
  g.group_name,
  a.assigned_at
FROM email_sender_assignments a
JOIN email_sender_groups g ON a.group_id = g.id
ORDER BY a.assigned_at DESC
LIMIT 5;
```

### 2.4 Test Vista Carousel 3D

| ID | Test | Acción | Resultado Esperado |
|----|------|--------|-------------------|
| MG-10 | Cambiar vista | Click botón Carousel | Vista 3D con rotación de tarjetas |
| MG-11 | Navegación | Flechas izq/der | Grupos rotan suavemente |
| MG-12 | Zoom control | Slider de zoom | Tarjetas escalan correctamente |

---

## FASE 3: TEST TAB SUGGESTIONS

**Ruta:** `/funnemail?tab=suggestions`  
**Tiempo estimado:** 15 minutos

### 3.1 Test Generación de Sugerencias

| ID | Test | Acción | Resultado Esperado |
|----|------|--------|-------------------|
| SG-01 | Botón generar | Click "Genera Sugerencias" | Progress bar aparece |
| SG-02 | API-First fetch | Observar Network | `emailSearchApi.searchBySender()` llamado via TMWE API |
| SG-03 | Fallback local | Si TMWE falla | Consulta email_messages sin error visible |
| SG-04 | Edge Function | Verificar logs | `suggest-sender-grouping` invocada con email_samples |

### 3.2 Test Resultados de Sugerencias

| ID | Test | Acción | Resultado Esperado |
|----|------|--------|-------------------|
| SG-05 | Sugerencias mostradas | Esperar generación completa | Cards con grupo sugerido, confidence %, razón |
| SG-06 | Metadatos | Verificar campos | transport_type, content_type, country_code presentes |
| SG-07 | Aceptar sugerencia | Click "Aceptar" | Sender asignado a grupo + toast éxito |
| SG-08 | Rechazar sugerencia | Click "Rechazar" | Sugerencia desaparece, no se guarda |

```sql
-- Script: Verificar sugerencias AI generadas
SELECT 
  sender_email,
  suggested_group_name,
  suggested_group_type,
  confidence,
  status,
  model_used,
  created_at
FROM ai_categorization_suggestions
ORDER BY created_at DESC
LIMIT 10;
```

### 3.3 Test Filtros

| ID | Test | Acción | Resultado Esperado |
|----|------|--------|-------------------|
| SG-09 | Filtro por país | Seleccionar "IT" | Solo sugerencias de Italia |
| SG-10 | Filtro por dominio | Escribir "@gmail" | Solo remitentes gmail |
| SG-11 | Filtro transporte | Seleccionar "Air" | Solo sugerencias tipo aéreo |

---

## FASE 4: TEST TAB SMART INBOX

**Ruta:** `/funnemail?tab=inbox`  
**Tiempo estimado:** 20 minutos  
**⭐ FASE CRÍTICA - Validación Zero-Sync**

### 4.1 Test Carga de Emails Clasificados

| ID | Test | Acción | Resultado Esperado |
|----|------|--------|-------------------|
| SI-01 | Lista clasificados | Navegar a Smart Inbox | Emails con categoría y badge de confianza |
| SI-02 | Categorías sidebar | Ver barra lateral | Fatture, Bolle, Preventivi, etc. con contadores |
| SI-03 | Filtrar por categoría | Click en "Spam" | Solo emails clasificados como Spam |

```sql
-- Script: Distribución de clasificaciones por categoría
SELECT 
  category,
  COUNT(*) as total,
  ROUND(AVG(confidence_score)::numeric, 2) as avg_confidence,
  COUNT(CASE WHEN user_verified THEN 1 END) as verified
FROM email_ai_classifications
GROUP BY category
ORDER BY total DESC;
```

### 4.2 Test Clasificación AI (Zero-Sync) ⭐

| ID | Test | Acción | Resultado Esperado |
|----|------|--------|-------------------|
| SI-04 | Botón clasificar | Click "Classifica Nuove" | Modal de progreso aparece |
| SI-05 | TMWE API fetch | Observar Network | `emailSearchApi.getEmailsMetadata()` para emails no clasificados |
| SI-06 | Edge Function | Verificar logs | `email-ai-processor` recibe `tmwe_email_id` (si disponible) |
| SI-07 | Clasificación éxito | Esperar completion | Nuevas clasificaciones en lista + toast éxito |
| SI-08 | tmwe_email_id guardado | Query DB | `email_ai_classifications.tmwe_email_id` populated |

```sql
-- Script: Verificar Zero-Sync - tmwe_email_id populated
SELECT 
  COUNT(*) as total_classifications,
  COUNT(tmwe_email_id) as with_tmwe_id,
  COUNT(email_id) as with_legacy_id,
  COUNT(CASE WHEN tmwe_email_id IS NOT NULL AND email_id IS NULL THEN 1 END) as pure_zero_sync
FROM email_ai_classifications;
```

### 4.3 Test Panel de Detalle

| ID | Test | Acción | Resultado Esperado |
|----|------|--------|-------------------|
| SI-09 | Seleccionar email | Click en email de lista | Panel derecho muestra detalle completo |
| SI-10 | Contenido via TMWE | Observar Network | `emailSearchApi.getEmailDetail()` llamado |
| SI-11 | Acciones AI | Ver botones | "Archivar", "Eliminar", "Crear Tarea" visibles |
| SI-12 | Navegación swipe | Click flechas prev/next | Navega entre emails de la categoría |

### 4.4 Test Vista Modes

| ID | Test | Acción | Resultado Esperado |
|----|------|--------|-------------------|
| SI-13 | Vista Split | Seleccionar "Split" | Lista izquierda + detalle derecha |
| SI-14 | Vista Detail | Seleccionar "Detail" | Solo panel de detalle expandido |
| SI-15 | Vista Clean | Toggle "Clean Mode" | UI minimalista sin badges extra |

---

## FASE 5: TEST TAB AUTOMATIONS

**Ruta:** `/funnemail?tab=automations`  
**Tiempo estimado:** 10 minutos

### 5.1 Test Dashboard

| ID | Test | Acción | Resultado Esperado |
|----|------|--------|-------------------|
| AU-01 | Carga dashboard | Navegar a Automations | Lista de prompts AI por remitente |
| AU-02 | Métricas | Ver estadísticas | Success rate, total executions visibles |
| AU-03 | Toggle activación | Click switch ON/OFF | Prompt activado/desactivado |

```sql
-- Script: Estado de automatizaciones
SELECT 
  p.sender_email,
  p.is_active,
  p.auto_execute,
  p.confidence_threshold,
  COUNT(l.id) as total_executions,
  COUNT(CASE WHEN l.execution_status = 'success' THEN 1 END) as successful
FROM email_ai_automation_prompts p
LEFT JOIN email_ai_action_logs l ON p.id = l.prompt_id
GROUP BY p.id, p.sender_email, p.is_active, p.auto_execute, p.confidence_threshold
ORDER BY total_executions DESC;
```

### 5.2 Test Pending Actions

| ID | Test | Acción | Resultado Esperado |
|----|------|--------|-------------------|
| AU-04 | Sub-tab Pending | Click "Pending Actions" | Lista de acciones pendientes de confirmación |
| AU-05 | Aprobar acción | Click "Aprobar" | Acción ejecutada + log creado |
| AU-06 | Rechazar acción | Click "Rechazar" | Acción descartada + feedback registrado |

```sql
-- Script: Acciones pendientes de confirmación
SELECT 
  l.id,
  l.sender_email,
  l.proposed_action,
  l.confidence_score,
  l.requires_confirmation,
  l.created_at
FROM email_ai_action_logs l
WHERE l.requires_confirmation = true 
  AND l.user_approved IS NULL
ORDER BY l.created_at DESC;
```

### 5.3 Test Learning Dashboard

| ID | Test | Acción | Resultado Esperado |
|----|------|--------|-------------------|
| AU-07 | Sub-tab Learning | Click "Learning" | Métricas de aprendizaje AI |
| AU-08 | Precisión por categoría | Ver gráficos | % accuracy por Fatture, Spam, etc. |
| AU-09 | Umbral adaptativo | Verificar valores | Confidence threshold ajustado por histórico |

```sql
-- Script: Métricas de aprendizaje
SELECT 
  metric_type,
  context_key,
  accuracy_rate,
  total_actions,
  successful_actions,
  updated_at
FROM email_ai_performance_metrics
ORDER BY metric_type, accuracy_rate DESC;
```

---

## FASE 6: TEST EDGE FUNCTIONS

**Tiempo estimado:** 15 minutos

### 6.1 Test email-ai-processor

| ID | Test | Acción | Resultado Esperado |
|----|------|--------|-------------------|
| EF-01 | Operation classify | Invocar con email_id | Clasificación guardada en DB |
| EF-02 | Operation automate | Invocar con email_id | Acción sugerida o ejecutada |
| EF-03 | Zero-Sync mode | Invocar con tmwe_email_id | Email fetched via TMWE API (no email_messages) |
| EF-04 | Fallback local | tmwe_email_id inválido | Falls back to email_messages gracefully |
| EF-05 | Multi-provider | Cambiar selectedAgent | Responde con Gemini/GPT/Claude según selección |

```sql
-- Script: Logs de email-ai-processor
SELECT 
  id,
  sender_email,
  category,
  confidence_score,
  model_used,
  tmwe_email_id,
  email_id,
  created_at
FROM email_ai_classifications
ORDER BY created_at DESC
LIMIT 10;
```

### 6.2 Test suggest-sender-grouping

| ID | Test | Acción | Resultado Esperado |
|----|------|--------|-------------------|
| EF-06 | Input validation | Invocar con email_samples | Sugerencias con metadatos contextuales |
| EF-07 | Knowledge Base | Verificar output | Incluye existing_groups context |

### 6.3 Test fun-email-ai-analysis

| ID | Test | Acción | Resultado Esperado |
|----|------|--------|-------------------|
| EF-08 | Operation stats | Invocar getStats | Estadísticas por folder/sender |
| EF-09 | Zero-Sync mode | Verificar source | Datos via TMWE API (no email_messages) |
| EF-10 | Fallback | Si TMWE falla | Falls back to local gracefully |

---

## FASE 7: TEST INTEGRACIÓN TMWE API

**Tiempo estimado:** 10 minutos

### 7.1 Test tmwe-api-proxy

| ID | Test | Acción | Resultado Esperado |
|----|------|--------|-------------------|
| API-01 | Handler search_emails | Buscar emails | Resultados de Elasticsearch |
| API-02 | Handler get_message | Obtener detalle | Email completo con body |
| API-03 | Handler move_message | Mover email | Email movido en servidor IMAP |
| API-04 | OAuth refresh | Token expirado | Auto-refresh sin error visible |

```sql
-- Script: Logs de llamadas API (si existe tracking)
SELECT 
  operation_type,
  COUNT(*) as calls,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_duration_sec
FROM ai_cost_tracking
WHERE operation_type LIKE 'tmwe_%'
GROUP BY operation_type
ORDER BY calls DESC;
```

### 7.2 Test Fallbacks

| ID | Test | Acción | Resultado Esperado |
|----|------|--------|-------------------|
| API-05 | TMWE timeout | Simular timeout | Fallback a email_messages sin crash |
| API-06 | TMWE error 500 | Simular error servidor | Toast de warning + datos locales mostrados |

---

## FASE 8: TEST CASOS EDGE Y ERRORES

**Tiempo estimado:** 10 minutos

### 8.1 Test Manejo de Errores

| ID | Test | Acción | Resultado Esperado |
|----|------|--------|-------------------|
| ERR-01 | Sin emails | Usuario sin emails | Mensaje "No hay emails para clasificar" |
| ERR-02 | API key inválida | Config AI mal | Toast error + log detallado |
| ERR-03 | Sesión expirada | Token expirado | Redirect a login |

### 8.2 Test Concurrencia

| ID | Test | Acción | Resultado Esperado |
|----|------|--------|-------------------|
| CON-01 | Clasificación batch | Clasificar 50+ emails | Progress bar actualiza sin UI freeze |
| CON-02 | Multiple tabs | Abrir 2 tabs FunEmail | Real-time sync via subscriptions |

---

## FASE 9: CHECKLIST VALIDACIÓN ZERO-SYNC

**Tiempo estimado:** 5 minutos

### 9.1 Verificación Post-Migración

| Check | Descripción | Estado |
|-------|-------------|--------|
| ☐ | Clasificaciones nuevas tienen `tmwe_email_id` | |
| ☐ | Edge functions logean "Zero-Sync: Fetching from TMWE API" | |
| ☐ | Fallback a `email_messages` funciona cuando TMWE falla | |
| ☐ | UI no muestra errores al usuario durante fallbacks | |

```sql
-- Script FINAL: Validación completa Zero-Sync
SELECT 
  '1. Total clasificaciones' as metric,
  COUNT(*)::text as value
FROM email_ai_classifications
UNION ALL
SELECT 
  '2. Con tmwe_email_id',
  COUNT(*)::text
FROM email_ai_classifications WHERE tmwe_email_id IS NOT NULL
UNION ALL
SELECT 
  '3. Solo email_id (legacy)',
  COUNT(*)::text
FROM email_ai_classifications WHERE email_id IS NOT NULL AND tmwe_email_id IS NULL
UNION ALL
SELECT 
  '4. Pure Zero-Sync (sin sync local)',
  COUNT(*)::text
FROM email_ai_classifications WHERE tmwe_email_id IS NOT NULL AND email_id IS NULL
UNION ALL
SELECT 
  '5. % Zero-Sync adoption',
  ROUND(
    COUNT(CASE WHEN tmwe_email_id IS NOT NULL THEN 1 END)::numeric * 100 / 
    NULLIF(COUNT(*), 0), 2
  )::text || '%'
FROM email_ai_classifications;
```

---

## 📊 MATRIZ DE COBERTURA

| Módulo | Tests UI | Tests API | Tests AI | Total |
|--------|----------|-----------|----------|-------|
| Management | 12 | 2 | 0 | 14 |
| Suggestions | 11 | 2 | 2 | 15 |
| Smart Inbox | 15 | 3 | 3 | 21 |
| Automations | 9 | 0 | 2 | 11 |
| Edge Functions | 0 | 4 | 6 | 10 |
| TMWE API | 0 | 6 | 0 | 6 |
| Error Handling | 3 | 2 | 0 | 5 |
| **TOTAL** | **50** | **19** | **13** | **82** |

---

## 🚀 ORDEN DE EJECUCIÓN RECOMENDADO

1. **Fase 1**: Pre-requisitos (5 min)
2. **Fase 7.1**: TMWE API connectivity (10 min)
3. **Fase 2**: Management Tab (15 min)
4. **Fase 3**: Suggestions Tab (15 min)
5. **Fase 4**: Smart Inbox Tab (20 min) ⭐ CRÍTICO
6. **Fase 5**: Automations Tab (10 min)
7. **Fase 6**: Edge Functions (15 min)
8. **Fase 8**: Error handling (10 min)
9. **Fase 9**: Zero-Sync validation (5 min)

**Tiempo total estimado: ~105 minutos**

---

## SCRIPTS SQL DE VERIFICACIÓN

### Script Completo de Estado Pre-Test

```sql
-- ============================================
-- FUNNEMAIL - ESTADO PRE-TEST
-- Ejecutar ANTES de iniciar pruebas
-- ============================================

-- 1. Estado general de tablas
SELECT '=== ESTADO GENERAL ===' as section;
SELECT 
  'email_messages' as tabla, COUNT(*) as total FROM email_messages
UNION ALL SELECT 'email_ai_classifications', COUNT(*) FROM email_ai_classifications
UNION ALL SELECT 'email_sender_groups', COUNT(*) FROM email_sender_groups
UNION ALL SELECT 'email_sender_assignments', COUNT(*) FROM email_sender_assignments
UNION ALL SELECT 'email_ai_automation_prompts', COUNT(*) FROM email_ai_automation_prompts
UNION ALL SELECT 'email_ai_action_logs', COUNT(*) FROM email_ai_action_logs
UNION ALL SELECT 'ai_categorization_suggestions', COUNT(*) FROM ai_categorization_suggestions;

-- 2. Configuración AI
SELECT '=== CONFIG AI ===' as section;
SELECT provider, modello, attivo, last_test_status FROM config_ai ORDER BY attivo DESC;

-- 3. Distribución de clasificaciones
SELECT '=== CLASIFICACIONES ===' as section;
SELECT category, COUNT(*) as total, ROUND(AVG(confidence_score)::numeric, 2) as avg_conf
FROM email_ai_classifications GROUP BY category ORDER BY total DESC;

-- 4. Estado Zero-Sync
SELECT '=== ZERO-SYNC STATUS ===' as section;
SELECT 
  COUNT(*) as total,
  COUNT(tmwe_email_id) as with_tmwe_id,
  ROUND(COUNT(tmwe_email_id)::numeric * 100 / NULLIF(COUNT(*), 0), 2) as pct_zero_sync
FROM email_ai_classifications;
```

### Script Completo de Validación Post-Test

```sql
-- ============================================
-- FUNNEMAIL - VALIDACIÓN POST-TEST
-- Ejecutar DESPUÉS de completar pruebas
-- ============================================

-- 1. Nuevas clasificaciones (últimas 24h)
SELECT '=== NUEVAS CLASIFICACIONES ===' as section;
SELECT 
  category,
  COUNT(*) as nuevas,
  COUNT(tmwe_email_id) as con_tmwe_id,
  model_used
FROM email_ai_classifications
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY category, model_used
ORDER BY nuevas DESC;

-- 2. Sugerencias generadas
SELECT '=== SUGERENCIAS AI ===' as section;
SELECT 
  status,
  COUNT(*) as total,
  ROUND(AVG(confidence)::numeric, 2) as avg_confidence
FROM ai_categorization_suggestions
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;

-- 3. Acciones de automatización
SELECT '=== ACCIONES AUTOMATION ===' as section;
SELECT 
  execution_status,
  COUNT(*) as total,
  COUNT(CASE WHEN user_approved THEN 1 END) as approved
FROM email_ai_action_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY execution_status;

-- 4. Validación Zero-Sync final
SELECT '=== ZERO-SYNC FINAL ===' as section;
SELECT 
  'Clasificaciones totales' as metric, COUNT(*)::text as value
FROM email_ai_classifications
UNION ALL
SELECT 'Con tmwe_email_id', COUNT(*)::text FROM email_ai_classifications WHERE tmwe_email_id IS NOT NULL
UNION ALL
SELECT '% Zero-Sync', 
  ROUND(COUNT(CASE WHEN tmwe_email_id IS NOT NULL THEN 1 END)::numeric * 100 / NULLIF(COUNT(*), 0), 2)::text || '%'
FROM email_ai_classifications;

-- 5. Errores detectados (si hay tabla de logs)
SELECT '=== POSIBLES ERRORES ===' as section;
SELECT 
  category,
  COUNT(*) as clasificaciones_fallidas
FROM email_ai_classifications
WHERE confidence_score < 0.5
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY category;
```

### Script de Limpieza Post-Test (Opcional)

```sql
-- ============================================
-- FUNNEMAIL - LIMPIEZA POST-TEST (OPCIONAL)
-- Solo ejecutar si se quiere resetear datos de prueba
-- ============================================

-- ⚠️ CUIDADO: Estos comandos eliminan datos

-- Eliminar sugerencias de prueba (últimas 24h)
-- DELETE FROM ai_categorization_suggestions WHERE created_at > NOW() - INTERVAL '24 hours';

-- Eliminar clasificaciones de prueba (últimas 24h)
-- DELETE FROM email_ai_classifications WHERE created_at > NOW() - INTERVAL '24 hours';

-- Resetear métricas de performance
-- DELETE FROM email_ai_performance_metrics WHERE updated_at > NOW() - INTERVAL '24 hours';
```

---

## 📝 REGISTRO DE EJECUCIÓN

| Fecha | Tester | Fase | Tests Pasados | Tests Fallidos | Notas |
|-------|--------|------|---------------|----------------|-------|
| | | | | | |
| | | | | | |
| | | | | | |

---

**Documento creado:** 2025-01-29  
**Última actualización:** 2025-01-29  
**Autor:** Lovable AI Assistant
