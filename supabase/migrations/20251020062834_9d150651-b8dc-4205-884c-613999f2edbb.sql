-- Design Lab System - FASE 1 Foundation
-- Tabelle principali, RLS policies, indici e seed data

begin;

-- 1. Tabella Pages
create table if not exists public.design_lab_pages (
  id uuid primary key default gen_random_uuid(),
  page_name text not null,
  description text,
  is_template boolean default false,
  user_id uuid references auth.users(id),
  config jsonb default '{}'::jsonb,
  version integer default 1,
  status text default 'draft' check (status in ('draft', 'review', 'published', 'archived')),
  published_at timestamptz,
  is_published boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Tabella Components
create table if not exists public.design_lab_components (
  id uuid primary key default gen_random_uuid(),
  page_id uuid references public.design_lab_pages(id) on delete cascade not null,
  component_type text not null,
  props jsonb default '{}'::jsonb,
  position jsonb not null, -- {x, y, width, height}
  parent_id uuid references public.design_lab_components(id) on delete cascade,
  order_index integer default 0,
  created_at timestamptz default now()
);

-- 3. Tabella Logic
create table if not exists public.design_lab_logic (
  id uuid primary key default gen_random_uuid(),
  component_id uuid references public.design_lab_components(id) on delete cascade not null,
  event_type text not null check (event_type in ('onClick', 'onChange', 'onSubmit', 'onLoad')),
  action_type text not null,
  action_config jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 4. Tabella System Actions
create table if not exists public.system_actions (
  id uuid primary key default gen_random_uuid(),
  action_id text unique not null,
  name text not null,
  description text,
  category text check (category in ('data', 'navigation', 'notification', 'integration')),
  icon text,
  is_functional boolean default true,
  requires_auth boolean default false,
  required_config_schema jsonb,
  example_config jsonb,
  created_at timestamptz default now()
);

-- 5. Tabella Audit Log
create table if not exists public.design_lab_audit_log (
  id uuid primary key default gen_random_uuid(),
  page_id uuid references public.design_lab_pages(id) on delete cascade not null,
  action text not null,
  performed_by uuid references auth.users(id) not null,
  from_version integer,
  to_version integer,
  metadata jsonb default '{}'::jsonb,
  performed_at timestamptz default now()
);

-- Indici per performance
create index if not exists idx_components_page_order on public.design_lab_components(page_id, order_index);
create index if not exists idx_components_parent on public.design_lab_components(parent_id) where parent_id is not null;
create index if not exists idx_logic_component on public.design_lab_logic(component_id);
create index if not exists idx_pages_template on public.design_lab_pages(is_template) where is_template = true;
create index if not exists idx_pages_user on public.design_lab_pages(user_id);
create index if not exists idx_audit_page on public.design_lab_audit_log(page_id, performed_at desc);

-- Enable RLS
alter table public.design_lab_pages enable row level security;
alter table public.design_lab_components enable row level security;
alter table public.design_lab_logic enable row level security;
alter table public.system_actions enable row level security;
alter table public.design_lab_audit_log enable row level security;

-- RLS Policies per design_lab_pages
create policy "Users can view own pages and public templates"
  on public.design_lab_pages for select
  using (
    auth.uid() = user_id 
    or is_template = true
    or public.is_admin(auth.uid())
  );

create policy "Users can create own pages"
  on public.design_lab_pages for insert
  with check (auth.uid() = user_id);

create policy "Users can update own pages"
  on public.design_lab_pages for update
  using (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "Users can delete own pages"
  on public.design_lab_pages for delete
  using (auth.uid() = user_id or public.is_admin(auth.uid()));

-- RLS Policies per design_lab_components
create policy "Users can view components of accessible pages"
  on public.design_lab_components for select
  using (
    page_id in (
      select id from public.design_lab_pages 
      where user_id = auth.uid() 
      or is_template = true
      or public.is_admin(auth.uid())
    )
  );

create policy "Users can manage components of own pages"
  on public.design_lab_components for all
  using (
    page_id in (
      select id from public.design_lab_pages 
      where user_id = auth.uid()
      or public.is_admin(auth.uid())
    )
  );

-- RLS Policies per design_lab_logic
create policy "Users can view logic of accessible components"
  on public.design_lab_logic for select
  using (
    component_id in (
      select c.id from public.design_lab_components c
      join public.design_lab_pages p on c.page_id = p.id
      where p.user_id = auth.uid() 
      or p.is_template = true
      or public.is_admin(auth.uid())
    )
  );

create policy "Users can manage logic of own components"
  on public.design_lab_logic for all
  using (
    component_id in (
      select c.id from public.design_lab_components c
      join public.design_lab_pages p on c.page_id = p.id
      where p.user_id = auth.uid()
      or public.is_admin(auth.uid())
    )
  );

-- RLS Policies per system_actions
create policy "Everyone can view functional system actions"
  on public.system_actions for select
  using (is_functional = true);

create policy "Admins can manage system actions"
  on public.system_actions for all
  using (public.is_admin(auth.uid()));

-- RLS Policies per design_lab_audit_log
create policy "Users can view audit log of own pages"
  on public.design_lab_audit_log for select
  using (
    page_id in (
      select id from public.design_lab_pages 
      where user_id = auth.uid()
      or public.is_admin(auth.uid())
    )
  );

create policy "System can insert audit logs"
  on public.design_lab_audit_log for insert
  with check (true);

-- Trigger per auto-update timestamp
create or replace function update_design_lab_pages_updated_at()
returns trigger as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$ language plpgsql;

create trigger trigger_update_design_lab_pages_timestamp
  before update on public.design_lab_pages
  for each row
  execute function update_design_lab_pages_updated_at();

-- Seed System Actions
insert into public.system_actions (action_id, name, description, category, icon, is_functional, required_config_schema, example_config) values
  ('save_to_db', 'Salva su Database', 'Salva i dati in una tabella Supabase', 'data', 'Database', true,
   '{"type":"object","properties":{"table":{"type":"string"},"data":{"type":"object"}},"required":["table"]}'::jsonb,
   '{"table":"contacts","data":{"name":"{{form.name}}","email":"{{form.email}}"}}'::jsonb),
  
  ('navigate', 'Naviga', 'Naviga verso un''altra pagina', 'navigation', 'Navigation', true,
   '{"type":"object","properties":{"path":{"type":"string"}},"required":["path"]}'::jsonb,
   '{"path":"/dashboard"}'::jsonb),
  
  ('show_toast', 'Mostra Notifica', 'Mostra un messaggio toast', 'notification', 'Bell', true,
   '{"type":"object","properties":{"message":{"type":"string"},"type":{"type":"string","enum":["success","error","info"]}},"required":["message"]}'::jsonb,
   '{"message":"Operazione completata","type":"success"}'::jsonb),
  
  ('call_api', 'Chiama API', 'Effettua una chiamata HTTP', 'integration', 'Globe', true,
   '{"type":"object","properties":{"url":{"type":"string"},"method":{"type":"string","enum":["GET","POST","PUT","DELETE"]},"body":{"type":"object"}},"required":["url","method"]}'::jsonb,
   '{"url":"https://api.example.com/data","method":"POST","body":{"key":"value"}}'::jsonb)
on conflict (action_id) do nothing;

commit;