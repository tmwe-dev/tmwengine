# 🔐 Pre-Migration Backup: FUNEMAIL V3.1 Fresh Start
**Fecha:** 2025-02-02  
**Motivo:** Backup de seguridad antes de implementar Plan V3.1 (Fresh Start con tablas optimizadas)  
**Plan de referencia:** `docs/FUNEMAIL_MIGRATION_PLAN.md` v3.1

---

## 📊 Estado Actual de la Base de Datos

### Conteo de Registros (Pre-Migration)
```sql
-- Tablas Legacy
email_ai_classifications: 137 registros
email_sender_groups: 40 registros  
email_sender_rules: 102 registros
email_messages: 4,391 registros
email_temp_index: 178 registros

-- Verificación crítica: tmwe_email_id population
SELECT COUNT(*) FROM email_ai_classifications WHERE tmwe_email_id IS NOT NULL;
-- Resultado: 0 registros ✅ (justifica Fresh Start strategy)
```

### Schema: email_ai_classifications (Legacy)
```sql
CREATE TABLE email_ai_classifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    message_id TEXT,
    tmwe_email_id INTEGER,  -- ⚠️ NUNCA POBLADO (0 registros)
    sender_email TEXT NOT NULL,
    subject TEXT,
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    ai_model TEXT NOT NULL,
    suggested_group_id UUID REFERENCES email_sender_groups(id),
    suggested_group_name TEXT NOT NULL,
    suggested_group_type TEXT NOT NULL,
    confidence NUMERIC,
    reasoning TEXT,
    is_new_group BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices
CREATE INDEX idx_email_ai_classifications_user_sender ON email_ai_classifications(user_id, sender_email);
CREATE INDEX idx_email_ai_classifications_status ON email_ai_classifications(status);
CREATE INDEX idx_email_ai_classifications_tmwe_email_id ON email_ai_classifications(tmwe_email_id);
```

### RLS Policies: email_ai_classifications
```sql
-- Users can view own classifications
CREATE POLICY "Users can view own classifications"
ON email_ai_classifications FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert own classifications
CREATE POLICY "Users can insert own classifications"
ON email_ai_classifications FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update own classifications
CREATE POLICY "Users can update own classifications"
ON email_ai_classifications FOR UPDATE
USING (auth.uid() = user_id);
```

### Schema: email_sender_groups (Legacy)
```sql
CREATE TABLE email_sender_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    group_name TEXT NOT NULL,
    group_type TEXT NOT NULL,
    color TEXT,
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices
CREATE INDEX idx_email_sender_groups_user ON email_sender_groups(user_id);
CREATE UNIQUE INDEX idx_email_sender_groups_unique ON email_sender_groups(user_id, group_name);
```

### Schema: email_sender_rules (Legacy)
```sql
CREATE TABLE email_sender_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    sender_email TEXT,
    sender_domain TEXT,
    subject_pattern TEXT,
    group_id UUID REFERENCES email_sender_groups(id) ON DELETE CASCADE,
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices
CREATE INDEX idx_email_sender_rules_user ON email_sender_rules(user_id);
CREATE INDEX idx_email_sender_rules_group ON email_sender_rules(group_id);
CREATE INDEX idx_email_sender_rules_sender ON email_sender_rules(sender_email);
CREATE INDEX idx_email_sender_rules_domain ON email_sender_rules(sender_domain);
```

---

## 🎯 Justificación del Fresh Start

### Hallazgo Crítico
```sql
-- Query de validación
SELECT COUNT(*) as total,
       COUNT(tmwe_email_id) as with_tmwe_id,
       COUNT(*) - COUNT(tmwe_email_id) as without_tmwe_id
FROM email_ai_classifications;

-- Resultado:
-- total: 137
-- with_tmwe_id: 0  ✅
-- without_tmwe_id: 137

-- Conclusión: NO HAY DATOS CON tmwe_email_id
-- ✅ MIGRACIÓN LEGACY → NUEVO = INNECESARIA
-- ✅ ESTRATEGIA FRESH START = ÓPTIMA
```

### Ventajas del Fresh Start
1. **Zero Data Migration Risk** - No hay datos legacy con `tmwe_email_id`
2. **Optimized Schema** - Diseño desde cero para API TMWE
3. **Simpler Queries** - Sin JOINs entre legacy y nuevo
4. **Easier Rollback** - Feature flags permiten volver atrás
5. **Better Performance** - Índices optimizados desde inicio

---

## 🚀 Plan V3.1: Nuevas Tablas Optimizadas

### 1. tmwe_classifications (Reemplazo de email_ai_classifications)
```sql
-- ✅ tmwe_email_id como PRIMARY KEY (no UUID)
-- ✅ subject_preview para listas rápidas
-- ✅ No dependencia de message_id local
-- ✅ Estadísticas integradas

CREATE TABLE tmwe_classifications (
    tmwe_email_id INTEGER PRIMARY KEY,  -- ✅ ID nativo TMWE
    user_email TEXT NOT NULL,
    sender_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    subject_preview TEXT,  -- ✅ Para listas (primeros 50 chars)
    
    -- AI Classification
    group_id UUID REFERENCES tmwe_sender_profiles(id) ON DELETE SET NULL,
    group_name TEXT NOT NULL,
    group_type TEXT NOT NULL,
    confidence NUMERIC CHECK (confidence >= 0 AND confidence <= 1),
    reasoning TEXT,
    
    -- Metadata
    ai_model TEXT NOT NULL,
    classified_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    is_manual_override BOOLEAN DEFAULT false,
    
    -- Status tracking
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### 2. tmwe_sender_profiles (Unificación de groups + mappings)
```sql
-- ✅ Perfil unificado por remitente
-- ✅ Estadísticas integradas
-- ✅ Configuración completa en un solo registro

CREATE TABLE tmwe_sender_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL,
    sender_email TEXT NOT NULL,
    sender_domain TEXT NOT NULL,
    
    -- Group Configuration
    group_name TEXT NOT NULL,
    group_type TEXT NOT NULL,
    color TEXT,
    icon TEXT,
    
    -- Statistics (denormalized for performance)
    total_emails INTEGER DEFAULT 0,
    unread_emails INTEGER DEFAULT 0,
    last_email_at TIMESTAMP WITH TIME ZONE,
    first_email_at TIMESTAMP WITH TIME ZONE,
    
    -- Settings
    is_active BOOLEAN DEFAULT true,
    auto_archive BOOLEAN DEFAULT false,
    notification_enabled BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    UNIQUE(user_email, sender_email)
);
```

### 3. tmwe_classification_rules (Reglas simplificadas)
```sql
-- ✅ Scope-based rules (global, sender, domain, subject)
-- ✅ Sin foreign keys a grupos (client-side matching)
-- ✅ Priority system simple

CREATE TABLE tmwe_classification_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL,
    
    -- Rule Definition
    rule_name TEXT NOT NULL,
    scope TEXT NOT NULL CHECK (scope IN ('global', 'sender', 'domain', 'subject')),
    
    -- Conditions
    sender_email TEXT,
    sender_domain TEXT,
    subject_pattern TEXT,
    
    -- Action
    target_group_name TEXT NOT NULL,
    target_group_type TEXT NOT NULL,
    
    -- Configuration
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

---

## 🛡️ Estrategia de Coexistencia

### Feature Flags (`src/lib/tmwe/config.ts`)
```typescript
export const TMWE_FEATURE_FLAGS = {
  USE_TMWE_CLASSIFICATIONS: true,   // Usar nueva tabla classifications
  USE_TMWE_SENDER_PROFILES: true,   // Usar nueva tabla sender_profiles
  USE_TMWE_RULES: true,              // Usar nueva tabla rules
  ENABLE_LEGACY_FALLBACK: true,     // Fallback a tablas legacy si falla
  SHOW_MIGRATION_BANNER: true,      // Mostrar banner de migración en UI
} as const;
```

### Plan de Deprecación Legacy
```typescript
// Phase 1: Coexistencia (Sprint 1-3)
// - Nuevas tablas activas
// - Legacy tables READ-ONLY
// - Feature flags = true

// Phase 2: Migración gradual (Sprint 4-6)
// - Legacy data queda intacto
// - Nuevos datos solo en tablas nuevas
// - UI usa solo nuevas tablas

// Phase 3: Deprecación (Sprint 7+)
// - Legacy tables archivadas
// - Feature flags removidos
// - Código legacy eliminado
```

---

## 📁 Archivos Protegidos (NO MODIFICAR)

### 1. OAuth Core (Funcional y Probado)
- ✅ `src/hooks/useTMWEAuth.tsx` - Context provider con expiración
- ✅ `src/components/tmwe/IntegratedAuthGuard.tsx` - Guard proactivo
- ✅ `src/lib/tmwe-api-integrated.ts` - ensureValidToken() + JWT
- ✅ `supabase/functions/_shared/oauth-manager.ts` - Server-side OAuth

### 2. Edge Functions Consolidadas
- ✅ `supabase/functions/tmwe-api-proxy/index.ts` - Proxy CORS universal
- ✅ Backups disponibles: 9 versiones (`index-old1.ts` hasta `index-old9.ts`)

### 3. API Clients Optimizados
- ✅ `src/lib/tmwe-email-search-api.ts` - RabbitMQ + Elasticsearch client

---

## 🔄 Plan de Rollback

### Si necesitas volver atrás:

```typescript
// 1. Cambiar feature flags
export const TMWE_FEATURE_FLAGS = {
  USE_TMWE_CLASSIFICATIONS: false,
  USE_TMWE_SENDER_PROFILES: false,
  USE_TMWE_RULES: false,
  ENABLE_LEGACY_FALLBACK: true,
  SHOW_MIGRATION_BANNER: false,
};

// 2. Las tablas legacy siguen intactas
// 3. No hay datos migrados desde legacy
// 4. Rollback = 100% seguro
```

### Eliminar tablas nuevas (si necesario)
```sql
DROP TABLE IF EXISTS tmwe_classification_rules CASCADE;
DROP TABLE IF EXISTS tmwe_classifications CASCADE;
DROP TABLE IF EXISTS tmwe_sender_profiles CASCADE;
```

---

## 📋 Snapshot del Plan V3.1

### Documento Original
- **Archivo:** `docs/FUNEMAIL_MIGRATION_PLAN.md`
- **Versión:** 3.1 Fresh Start Edition
- **Fecha:** 2025-02-02
- **Líneas:** 1,281
- **Secciones principales:**
  - Arquitectura híbrida (wrapper + facade)
  - DDL completo 3 tablas nuevas
  - Feature flags system
  - Roadmap 20-30 días
  - 10 casos de uso documentados

### Sprint 1 Objetivos (Este Backup)
1. ✅ Crear backup de seguridad (este archivo)
2. ⏳ Crear estructura `src/lib/tmwe/`
3. ⏳ Ejecutar migrations para 3 tablas
4. ⏳ Implementar TMWEAuthManager (wrapper)
5. ⏳ Implementar TMWEApiClient (facade)
6. ⏳ Crear feature flags config

**Duración estimada:** 5-6 horas

---

## ✅ Checklist Pre-Migration

- [x] Backup de schema legacy creado
- [x] Conteo de registros documentado
- [x] Verificado: 0 registros con tmwe_email_id
- [x] RLS policies documentadas
- [x] Archivos protegidos identificados
- [x] Plan de rollback definido
- [x] Feature flags diseñados
- [ ] Estructura `src/lib/tmwe/` creada
- [ ] Tablas nuevas creadas
- [ ] RLS policies aplicadas
- [ ] TMWEAuthManager implementado
- [ ] TMWEApiClient implementado

---

## 🔗 Referencias

- **Plan principal:** `docs/FUNEMAIL_MIGRATION_PLAN.md`
- **Changelog Edge Functions:** `docs/EDGE_FUNCTIONS_CHANGELOG.md`
- **Backups Email Download:** `docs/BACKUPS_20250129.md`
- **Master Rules:** `docs/MASTER_RULES.md`

---

**🟢 BACKUP COMPLETADO - READY TO PROCEED WITH MIGRATION**

**Timestamp:** 2025-02-02T[timestamp]  
**Created by:** Lovable AI (TMWENGINE Protocol)  
**Next step:** Crear estructura `src/lib/tmwe/` y ejecutar migrations
