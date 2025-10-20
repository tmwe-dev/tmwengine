# 🎨 Design Lab - Piano Implementazione Completo
**Versione:** 1.0 ULTRA PRO  
**Data Creazione:** 2025-01-20  
**Stato:** Ready for Implementation  
**Livello:** Enterprise-Grade

---

## 📋 Executive Summary

Design Lab è un sistema avanzato di visual editor low-code che permette di creare, gestire e pubblicare interfacce utente complesse tramite drag-and-drop. Il sistema è progettato per essere:

- **Sicuro**: Validazione JSON Schema server-side, RLS policies granulari, rate limiting
- **Scalabile**: Partitioning database, VACUUM automatico, indici ottimizzati
- **Monitorato**: Metriche performance, alert automatici, audit log completo
- **User-Friendly**: Debounce save, visual diff, workflow approvazione, undo/redo

---

## 🏗️ Architettura Sistema

### Stack Tecnologico
- **Frontend**: React 18, TypeScript, TailwindCSS, Vite
- **Backend**: Supabase (PostgreSQL 15+), Edge Functions
- **State Management**: TanStack Query v5, React Hooks
- **UI Components**: shadcn/ui, Radix UI
- **Drag & Drop**: @dnd-kit
- **Validation**: Ajv (JSON Schema), pg_jsonschema
- **Testing**: Vitest, React Testing Library
- **Monitoring**: pg_cron, custom metrics table

### Database Schema (6 Tabelle)

#### 1. `design_lab_pages`
Tabella principale per gestire le pagine/maschere.

```sql
create table public.design_lab_pages (
  id uuid primary key default gen_random_uuid(),
  page_name text not null,
  description text,
  is_template boolean default false,
  user_id uuid references auth.users(id) on delete cascade,
  config jsonb default '{}'::jsonb,
  version integer default 1,
  status text default 'draft' check (status in ('draft', 'review', 'published', 'archived')),
  published_at timestamptz,
  is_published boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

**Indici:**
```sql
create index idx_pages_template on public.design_lab_pages(is_template) where is_template = true;
create index idx_pages_version on public.design_lab_pages(page_name, version);
create index idx_pages_user on public.design_lab_pages(user_id);
create index idx_pages_status on public.design_lab_pages(status);
```

#### 2. `design_lab_components`
Componenti UI posizionati sul canvas.

```sql
create table public.design_lab_components (
  id uuid primary key default gen_random_uuid(),
  page_id uuid references public.design_lab_pages(id) on delete cascade not null,
  component_type text not null,
  props jsonb default '{}'::jsonb,
  position jsonb default '{}'::jsonb,
  parent_id uuid references public.design_lab_components(id) on delete cascade,
  order_index integer default 0,
  created_at timestamptz default now()
);
```

**Indici:**
```sql
create index idx_components_page_order on public.design_lab_components(page_id, order_index);
create index idx_components_parent on public.design_lab_components(parent_id) where parent_id is not null;
create index idx_components_props_gin on public.design_lab_components using gin(props);
```

#### 3. `design_lab_logic`
Azioni e logica associata ai componenti.

```sql
create table public.design_lab_logic (
  id uuid primary key default gen_random_uuid(),
  component_id uuid references public.design_lab_components(id) on delete cascade not null,
  event_type text not null,
  action_type text not null,
  action_config jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
```

**Indici:**
```sql
create index idx_logic_component on public.design_lab_logic(component_id);
create index idx_logic_event_type on public.design_lab_logic(event_type);
create index idx_logic_config_gin on public.design_lab_logic using gin(action_config);
```

#### 4. `system_actions`
Libreria centralizzata delle azioni riusabili.

```sql
create table public.system_actions (
  id uuid primary key default gen_random_uuid(),
  action_id text unique not null,
  name text not null,
  description text,
  category text,
  icon text,
  is_functional boolean default true,
  requires_auth boolean default false,
  required_config_schema jsonb,
  example_config jsonb,
  created_at timestamptz default now()
);
```

**Seed Iniziale:**
- `save_to_db`: Salva dati in tabella Supabase
- `call_api`: Chiamata HTTP esterna
- `navigate`: Navigazione interna
- `show_toast`: Notifica toast

#### 5. `design_lab_page_history` (Partitioned)
Storico versioni con partitioning per scalabilità.

```sql
create table public.design_lab_page_history (
  id uuid default gen_random_uuid(),
  page_id uuid not null,
  version integer not null,
  config_snapshot jsonb not null,
  components_snapshot jsonb not null,
  logic_snapshot jsonb not null,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  change_description text,
  primary key (page_id, id)
) partition by hash (page_id);

-- Partizioni (4 per distribuzione carico)
create table design_lab_page_history_p0 partition of design_lab_page_history
  for values with (modulus 4, remainder 0);
-- ... p1, p2, p3
```

**Trigger Versioning:**
```sql
create trigger trigger_increment_version
  before update on public.design_lab_pages
  for each row
  execute function increment_page_version();
```

#### 6. `design_lab_audit_log`
Log audit per operazioni critiche (publish, rollback, approve).

```sql
create table public.design_lab_audit_log (
  id uuid primary key default gen_random_uuid(),
  page_id uuid references public.design_lab_pages(id) on delete cascade not null,
  action text not null,
  performed_by uuid references auth.users(id) not null,
  from_version integer,
  to_version integer,
  metadata jsonb default '{}'::jsonb,
  performed_at timestamptz default now()
);
```

**Indici:**
```sql
create index idx_audit_page_action on public.design_lab_audit_log(page_id, action, performed_at desc);
```

#### 7. `design_lab_metrics`
Metriche performance e monitoraggio.

```sql
create table public.design_lab_metrics (
  id uuid primary key default gen_random_uuid(),
  metric_type text not null,
  metric_value numeric not null,
  metadata jsonb default '{}'::jsonb,
  recorded_at timestamptz default now()
);
```

#### 8. `design_lab_publish_attempts`
Tracking tentativi publish per rate limiting.

```sql
create table public.design_lab_publish_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  page_id uuid references public.design_lab_pages(id) not null,
  attempted_at timestamptz default now(),
  success boolean default true
);
```

---

## 🔒 Sicurezza

### RLS Policies

#### Ruoli Sistema
```sql
create type public.app_role as enum ('admin', 'editor', 'viewer', 'reviewer');
```

#### Policies Principali

**design_lab_pages:**
- Users possono gestire proprie pagine
- Admins possono gestire tutte le pagine
- Viewers possono vedere solo template pubblici
- Reviewers possono approvare pagine in review

**design_lab_components:**
- Ereditano permessi da pages
- Solo owner/admin possono modificare

**design_lab_logic:**
- Ereditano permessi da components
- Validazione JSON Schema server-side obbligatoria

**system_actions:**
- Tutti possono leggere azioni attive
- Solo admin possono gestire azioni

### Validazione JSON Schema

**Funzione Server-Side:**
```sql
create or replace function validate_action_config(
  _action_type text,
  _action_config jsonb
)
returns boolean
language plpgsql
security definer
as $$
declare
  schema jsonb;
  is_valid boolean;
begin
  select required_config_schema into schema
  from public.system_actions
  where action_id = _action_type and is_functional = true;
  
  if schema is null then
    raise exception 'Invalid action_type: %', _action_type;
  end if;
  
  select jsonb_matches_schema(schema, _action_config) into is_valid;
  
  return is_valid;
end;
$$;
```

**Trigger Validazione:**
```sql
create trigger trigger_validate_logic
  before insert or update on public.design_lab_logic
  for each row
  execute function validate_logic_before_save();
```

### Rate Limiting

**Publish Operations (max 10/ora per utente):**
```sql
create or replace function publish_page_with_rate_limit(_page_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  recent_attempts integer;
begin
  select count(*) into recent_attempts
  from public.design_lab_publish_attempts
  where user_id = auth.uid()
    and attempted_at > now() - interval '1 hour';
  
  if recent_attempts >= 10 then
    raise exception 'Rate limit exceeded. Max 10 publish operations per hour.';
  end if;
  
  -- Esegui publish + log
  -- ...
  
  return jsonb_build_object('success', true, 'published_at', now());
end;
$$;
```

---

## 📊 Monitoraggio

### Metriche Tracciate

1. **Query Performance**: Tempo esecuzione query critiche
2. **Snapshot Size**: Dimensione totale history table
3. **History Growth**: Numero versioni per pagina
4. **Publish Rate**: Frequenza pubblicazioni

### Alert Automatici

**Slow Query Alert (> 1000ms):**
```sql
if _execution_time_ms > 1000 then
  raise warning 'Slow query detected: % took %ms', _query_name, _execution_time_ms;
end if;
```

**History Size Alert (> 10k record o > 500MB):**
```sql
if history_count > 10000 or snapshot_size_mb > 500 then
  raise warning 'History table alert: % records, % MB', history_count, snapshot_size_mb;
end if;
```

### pg_cron Jobs

```sql
-- Check history size ogni ora
select cron.schedule(
  'check-design-lab-history-size',
  '0 * * * *',
  'select check_history_size()'
);

-- VACUUM ogni notte alle 2 AM
select cron.schedule(
  'vacuum-design-lab-history',
  '0 2 * * *',
  'vacuum analyze public.design_lab_page_history'
);

-- Purge mensile vecchie versioni (mantieni ultimi 10)
select cron.schedule(
  'purge-design-lab-history',
  '0 3 1 * *',
  'select purge_old_history()'
);
```

---

## 🚀 Scalabilità

### Partitioning Strategy

**History table partitioned by hash(page_id):**
- 4 partizioni iniziali (p0, p1, p2, p3)
- Distribuzione carico automatica
- Espandibile dinamicamente

### VACUUM Configuration

```sql
alter table public.design_lab_page_history 
  set (autovacuum_vacuum_scale_factor = 0.05);
```

### Retention Policy

**Purge automatico:**
- Mantieni ultimi 10 versioni per pagina
- Esecuzione mensile schedulata
- Log operazione in metrics

```sql
delete from public.design_lab_page_history
where id in (
  select id
  from (
    select id, row_number() over (partition by page_id order by version desc) as rn
    from public.design_lab_page_history
  ) sub
  where rn > 10
);
```

---

## 👥 Workflow Approvazione

### Stati Pagina
- `draft`: Bozza in lavorazione
- `review`: In attesa approvazione reviewer
- `published`: Pubblicata e attiva
- `archived`: Archiviata

### Ruoli e Permessi

| Ruolo | Permessi |
|-------|----------|
| **Editor** | Crea/modifica proprie pagine, richiede review |
| **Reviewer** | Approva/rifiuta pagine in review |
| **Admin** | Gestisce tutto, bypassa workflow |
| **Viewer** | Solo visualizzazione template pubblici |

### Funzioni Workflow

**Richiesta Review:**
```sql
create or replace function request_review(_page_id uuid, _reviewer_id uuid)
returns jsonb as $$
begin
  update public.design_lab_pages
  set status = 'review'
  where id = _page_id and user_id = auth.uid();
  
  -- Log audit + notifica reviewer
  return jsonb_build_object('success', true, 'status', 'review');
end;
$$;
```

**Approvazione (solo reviewer/admin):**
```sql
create or replace function approve_page(_page_id uuid)
returns jsonb as $$
begin
  if not public.has_role(auth.uid(), 'reviewer') 
     and not public.has_role(auth.uid(), 'admin') then
    raise exception 'Only reviewers can approve pages';
  end if;
  
  update public.design_lab_pages
  set status = 'published', published_at = now(), is_published = true
  where id = _page_id;
  
  -- Log audit
  return jsonb_build_object('success', true, 'status', 'published');
end;
$$;
```

---

## 🎨 UX Features

### 1. Debounce Auto-Save (2 secondi)

```typescript
// Hook useAutoSave.ts
export const useAutoSave = (
  data: any,
  saveFn: (data: any) => Promise<void>,
  delay = 2000
) => {
  const debouncedSave = useRef(
    debounce(async (dataToSave: any) => {
      try {
        await saveFn(dataToSave);
        console.log('✅ Auto-saved');
      } catch (error) {
        console.error('❌ Auto-save failed:', error);
      }
    }, delay)
  ).current;

  useEffect(() => {
    if (data) debouncedSave(data);
    return () => debouncedSave.cancel();
  }, [data, debouncedSave]);
};
```

### 2. Visual Diff tra Versioni

```typescript
// Componente VersionDiff.tsx
import { diffLines } from 'diff';

export const VersionDiff = ({ oldVersion, newVersion }) => {
  const diff = diffLines(
    JSON.stringify(oldVersion.config_snapshot, null, 2),
    JSON.stringify(newVersion.config_snapshot, null, 2)
  );

  return (
    <div>
      {diff.map((part, index) => (
        <div
          key={index}
          className={cn(
            'p-2 font-mono text-sm',
            part.added && 'bg-green-500/20 text-green-700',
            part.removed && 'bg-red-500/20 text-red-700'
          )}
        >
          {part.value}
        </div>
      ))}
    </div>
  );
};
```

### 3. Conferma Publish con Preview

```typescript
// Componente PublishConfirmDialog.tsx
export const PublishConfirmDialog = ({ page, isOpen, onConfirm }) => {
  const { data: components } = useDesignLabComponents(page.id);

  return (
    <Dialog open={isOpen}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Conferma Pubblicazione</DialogTitle>
        </DialogHeader>

        {/* Preview Canvas Miniatura */}
        <div className="border rounded-lg p-4">
          <CanvasPreview components={components || []} scale={0.3} />
        </div>

        {/* Lista Modifiche */}
        <ul className="text-sm">
          <li>✓ {components?.length || 0} componenti configurati</li>
          <li>✓ Versione: {page.version}</li>
        </ul>

        <DialogFooter>
          <Button variant="outline">Annulla</Button>
          <Button onClick={onConfirm}>Pubblica</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

### 4. Undo/Redo System (Command Pattern)

```typescript
// Hook useCommandHistory.ts
interface Command {
  execute: () => void;
  undo: () => void;
}

export const useCommandHistory = () => {
  const [history, setHistory] = useState<Command[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const executeCommand = (command: Command) => {
    command.execute();
    setHistory(prev => [...prev.slice(0, currentIndex + 1), command]);
    setCurrentIndex(prev => prev + 1);
  };

  const undo = () => {
    if (currentIndex >= 0) {
      history[currentIndex].undo();
      setCurrentIndex(prev => prev - 1);
    }
  };

  const redo = () => {
    if (currentIndex < history.length - 1) {
      history[currentIndex + 1].execute();
      setCurrentIndex(prev => prev + 1);
    }
  };

  return { executeCommand, undo, redo };
};
```

---

## ⚡ Performance

### Indici Compositi

```sql
-- Query ordinate per pagina
create index idx_components_page_order on public.design_lab_components(page_id, order_index);

-- Parent-child relationships
create index idx_components_parent on public.design_lab_components(parent_id) where parent_id is not null;

-- Full-text search in JSONB
create index idx_components_props_gin on public.design_lab_components using gin(props);
create index idx_logic_config_gin on public.design_lab_logic using gin(action_config);
```

### Memoization Canvas

```typescript
// CanvasElement.tsx con memo custom
export const CanvasElement = memo(({ component, isSelected, onSelect }) => {
  return (
    <div
      className={cn('absolute', isSelected && 'border-primary')}
      style={{
        left: component.position.x,
        top: component.position.y,
        width: component.position.width,
        height: component.position.height
      }}
      onClick={() => onSelect(component.id)}
    >
      <DynamicComponent type={component.component_type} props={component.props} />
    </div>
  );
}, (prev, next) => {
  // Re-render solo se cambia posizione, props o selezione
  return (
    prev.component.id === next.component.id &&
    JSON.stringify(prev.component.position) === JSON.stringify(next.component.position) &&
    JSON.stringify(prev.component.props) === JSON.stringify(next.component.props) &&
    prev.isSelected === next.isSelected
  );
});
```

### Lazy Loading Componenti

```typescript
// DynamicComponent.tsx
const componentMap = {
  input: lazy(() => import('@/components/ui/input')),
  button: lazy(() => import('@/components/ui/button')),
  chart: lazy(() => import('@/components/ui/chart')), // Pesante
};

export const DynamicComponent = ({ type, props }) => {
  const Component = componentMap[type];
  
  return (
    <Suspense fallback={<Skeleton />}>
      <Component {...props} />
    </Suspense>
  );
};
```

---

## 🧪 Testing Strategy

### Test Suite Completa

#### 1. Page Creation
```typescript
describe('Design Lab - Page Creation', () => {
  it('should create a new page with valid config', async () => {
    const { data, error } = await supabase
      .from('design_lab_pages')
      .insert({ page_name: 'Test Page', config: {} })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data.version).toBe(1);
  });
});
```

#### 2. Drag & Drop
```typescript
describe('Design Lab - Drag & Drop', () => {
  it('should correctly position component on drop', async () => {
    const dropData = {
      component_type: 'input',
      position: { x: 100, y: 200, width: 300, height: 50 }
    };

    const { data } = await supabase
      .from('design_lab_components')
      .insert(dropData)
      .select()
      .single();

    expect(data.position.x).toBe(100);
  });
});
```

#### 3. Canvas Load Test
```typescript
describe('Design Lab - Canvas Load', () => {
  it('should render 100 components in < 1s', async () => {
    const components = generateMockComponents(100);

    const startTime = performance.now();
    render(<Canvas components={components} />);
    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(1000);
  });
});
```

#### 4. Action Config Validation
```typescript
describe('Design Lab - Validation', () => {
  it('should reject invalid action_config', async () => {
    const invalidConfig = { table: 123 }; // Should be string

    const result = validateActionConfig('save_to_db', invalidConfig, systemActions);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('table should be string');
  });
});
```

#### 5. Rate Limiting
```typescript
describe('Design Lab - Rate Limiting', () => {
  it('should block publish after 10 attempts in 1 hour', async () => {
    // Mock 10 publish attempts
    for (let i = 0; i < 10; i++) {
      await publish_page(pageId);
    }

    // 11th attempt should fail
    await expect(publish_page(pageId)).rejects.toThrow('Rate limit exceeded');
  });
});
```

---

## 📦 Componenti Principali

### 1. ComponentPalette
Libreria componenti drag-and-drop con 3 tab:
- **Componenti Base**: Input, Button, Select, etc.
- **Layout**: Container, Grid, Flex
- **Strutture Salvate**: Template maschere complete

### 2. Canvas
Area di lavoro drag-and-drop:
- Grid snap positioning
- Multi-select (Shift+Click)
- Keyboard shortcuts (Delete, Ctrl+Z, Ctrl+Y)
- Auto-save debounced 2s

### 3. PropertiesPanel
Editor proprietà componente selezionato con 3 tab:
- **Tab 1 - Properties**: Props base (label, placeholder, etc.)
- **Tab 2 - Style**: Position, size, colors
- **Tab 3 - Logic/Actions**: Event handlers + action config

### 4. RuntimePreview
Anteprima esecuzione pagina:
- Rendering dinamico da config DB
- Esecuzione logica (onClick, onChange)
- Debug mode con log eventi

### 5. VersionHistory
Viewer storico modifiche:
- Lista versioni con timestamp
- Visual diff tra versioni
- Rollback a versione precedente

### 6. PublishDialog
Conferma pubblicazione:
- Preview canvas miniatura
- Lista modifiche
- Workflow approval (se reviewer)

---

## 📅 Timeline Implementazione

### FASE 1: Database & Backend (3 giorni)
✅ Migration SQL con 8 tabelle  
✅ Indici compositi + GIN indexes  
✅ RLS policies con 4 ruoli  
✅ Trigger validazione + versioning + audit  
✅ Funzioni SECURITY DEFINER (10 funzioni)  
✅ pg_cron jobs (3 schedule)  
✅ Seed system_actions iniziale  

### FASE 2: Hooks & Types (1 giorno)
✅ Types TypeScript (8 interfaces)  
✅ useDesignLabPages (CRUD + cache)  
✅ useSystemActions (prefetch)  
✅ useCommandHistory (undo/redo)  
✅ useAutoSave (debounce)  
✅ useVersionDiff (diff viewer)  

### FASE 3: Componenti UI (4 giorni)
✅ ComponentPalette (lazy loading)  
✅ Canvas (memoization + drag-drop)  
✅ CanvasElement (memo custom)  
✅ PropertiesPanel (dynamic actions)  
✅ PublishConfirmDialog (preview + workflow)  
✅ VersionDiff (visual diff)  
✅ AuditLogViewer (log history)  
✅ RuntimePreview (dynamic rendering)  

### FASE 4: Testing (2 giorni)
✅ Test suite completa (7 test files)  
✅ Canvas load test (100 componenti)  
✅ Validation tests (JSON Schema)  
✅ Rate limiting tests  
✅ Integration tests end-to-end  

### FASE 5: Monitoring Dashboard (1 giorno)
✅ Metrics visualization  
✅ Alert configurator  
✅ Query performance viewer  

---

## 🔗 Riferimenti Tecnici

### Database Functions
- `validate_action_config()`: Validazione JSON Schema
- `publish_page_with_rate_limit()`: Publish con throttling
- `increment_page_version()`: Auto-versioning trigger
- `log_publish_action()`: Audit log automatico
- `request_review()`: Workflow approvazione
- `approve_page()`: Approvazione reviewer
- `purge_old_history()`: Cleanup retention
- `check_history_size()`: Monitoring alert

### React Hooks
- `useDesignLabPages()`: CRUD pagine
- `useDesignLabComponents()`: CRUD componenti
- `useSystemActions()`: Libreria azioni
- `useCommandHistory()`: Undo/Redo
- `useAutoSave()`: Debounce save
- `useVersionDiff()`: Diff versioni

### Utils
- `validateActionConfig()`: Client-side validation
- `canvasPerformance.ts`: Performance monitoring
- `adjustPosition()`: Snap to grid
- `generateMockComponents()`: Test helpers

---

## 🎯 KPI e Metriche Success

### Performance
- [ ] Render 100 componenti < 1000ms
- [ ] Drag operation < 100ms
- [ ] Query canvas components < 200ms
- [ ] Auto-save debounce 2000ms

### Scalabilità
- [ ] History table < 500MB
- [ ] Partitioning attivo
- [ ] VACUUM schedulato funzionante
- [ ] Retention policy attiva (max 10 versioni)

### Sicurezza
- [ ] Rate limiting 10 publish/ora
- [ ] Validazione JSON Schema server-side 100%
- [ ] RLS policies attive tutte tabelle
- [ ] Audit log completo publish/rollback

### UX
- [ ] Undo/Redo funzionante
- [ ] Visual diff tra versioni
- [ ] Conferma publish con preview
- [ ] Workflow approvazione reviewer

---

## 📚 Documentazione Aggiuntiva

### API Reference
- [Supabase RLS Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [JSON Schema Validation](https://json-schema.org/)
- [pg_cron Scheduling](https://github.com/citusdata/pg_cron)
- [React DnD Kit](https://docs.dndkit.com/)

### Internal Docs
- `docs/DESIGN_LAB_API.md`: API endpoints e funzioni DB
- `docs/DESIGN_LAB_COMPONENTS.md`: Catalogo componenti UI
- `docs/DESIGN_LAB_WORKFLOW.md`: Workflow approvazione dettagliato

---

## 🚀 Getting Started

### Prerequisites
```bash
# Supabase CLI
npm install -g supabase

# Project dependencies
npm install
```

### Migration
```bash
# Applicare migration FASE 1
supabase migration up

# Verificare tabelle create
supabase db tables list
```

### Development
```bash
# Avviare dev server
npm run dev

# Navigare a /design-lab
# Login con utente con ruolo 'editor'
```

### Testing
```bash
# Run test suite completa
npm run test

# Run canvas load test
npm run test:load

# Run validation tests
npm run test:validation
```

---

**Versione Documento:** 1.0  
**Ultimo Aggiornamento:** 2025-01-20  
**Prossimo Review:** FASE 2 Completamento  
**Maintainer:** Development Team
