-- ============================================================
-- OWNER WORKSPACE TABLES
-- Idempotent. Safe to re-run.
-- Text primary keys mirror the prototype's record ids so the
-- owner workspace maps 1:1 to the database with no id remapping.
-- RLS uses the established private.has_owner_capability() helper.
-- ============================================================

-- ---------- TRANSACTIONS -------------------------------------
create table if not exists public.owner_transactions (
  id text primary key,
  date text not null,
  type text not null check (type in ('Income','Expense')),
  label text not null,
  amount numeric not null check (abs(amount) > 0),
  status text not null default 'Needs review' check (status in ('Needs review','Recorded','Reviewed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.owner_transactions enable row level security;
drop policy if exists "Owners can CRUD their transactions" on public.owner_transactions;
create policy "Owners can CRUD their transactions"
on public.owner_transactions for all to authenticated
using (private.has_owner_capability('finance.manage'));
grant all on public.owner_transactions to authenticated;
revoke all on public.owner_transactions from anon;

create or replace function public.touch_owner_transactions_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;
drop trigger if exists owner_transactions_touch_updated_at on public.owner_transactions;
create trigger owner_transactions_touch_updated_at
before update on public.owner_transactions
for each row execute function public.touch_owner_transactions_updated_at();

-- ---------- TASKS ---------------------------------------------
create table if not exists public.owner_tasks (
  id text primary key,
  title text not null check (length(trim(title)) >= 3),
  owner text not null default 'Unassigned',
  due text,
  done boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.owner_tasks enable row level security;
drop policy if exists "Owners can CRUD their tasks" on public.owner_tasks;
create policy "Owners can CRUD their tasks"
on public.owner_tasks for all to authenticated
using (private.has_owner_capability('finance.manage') or private.has_owner_capability('technology.manage'));
grant all on public.owner_tasks to authenticated;
revoke all on public.owner_tasks from anon;

create or replace function public.touch_owner_tasks_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;
drop trigger if exists owner_tasks_touch_updated_at on public.owner_tasks;
create trigger owner_tasks_touch_updated_at
before update on public.owner_tasks
for each row execute function public.touch_owner_tasks_updated_at();

-- ---------- LEADS ---------------------------------------------
create table if not exists public.owner_leads (
  id text primary key,
  name text not null,
  contact text,
  value numeric not null default 0 check (value >= 0),
  stage text not null default 'Discovery' check (stage in ('Discovery','Qualified','Proposal','Negotiation','Won','Lost')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.owner_leads enable row level security;
drop policy if exists "Owners can CRUD their leads" on public.owner_leads;
create policy "Owners can CRUD their leads"
on public.owner_leads for all to authenticated
using (private.has_owner_capability('strategy.manage') or private.has_owner_capability('finance.manage'));
grant all on public.owner_leads to authenticated;
revoke all on public.owner_leads from anon;

create or replace function public.touch_owner_leads_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;
drop trigger if exists owner_leads_touch_updated_at on public.owner_leads;
create trigger owner_leads_touch_updated_at
before update on public.owner_leads
for each row execute function public.touch_owner_leads_updated_at();

-- ---------- CAMPAIGNS -----------------------------------------
create table if not exists public.owner_campaigns (
  id text primary key,
  name text not null,
  channel text not null default 'Outbound',
  status text not null default 'Planning' check (status in ('Planning','Running','Paused','Complete')),
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  owner text not null default 'Marketing',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.owner_campaigns enable row level security;
drop policy if exists "Owners can CRUD their campaigns" on public.owner_campaigns;
create policy "Owners can CRUD their campaigns"
on public.owner_campaigns for all to authenticated
using (private.has_owner_capability('strategy.manage') or private.has_owner_capability('technology.manage'));
grant all on public.owner_campaigns to authenticated;
revoke all on public.owner_campaigns from anon;

create or replace function public.touch_owner_campaigns_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;
drop trigger if exists owner_campaigns_touch_updated_at on public.owner_campaigns;
create trigger owner_campaigns_touch_updated_at
before update on public.owner_campaigns
for each row execute function public.touch_owner_campaigns_updated_at();

-- ---------- NOTICES -------------------------------------------
create table if not exists public.owner_notices (
  id text primary key,
  icon text not null default '$',
  title text not null,
  "desc" text not null default '',
  "read" boolean not null default false,
  time text not null default to_char(now(), 'TMMon DD, YYYY'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.owner_notices enable row level security;
drop policy if exists "Owners can CRUD their notices" on public.owner_notices;
create policy "Owners can CRUD their notices"
on public.owner_notices for all to authenticated
using (private.has_owner_capability('governance.read'));
grant all on public.owner_notices to authenticated;
revoke all on public.owner_notices from anon;

create or replace function public.touch_owner_notices_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;
drop trigger if exists owner_notices_touch_updated_at on public.owner_notices;
create trigger owner_notices_touch_updated_at
before update on public.owner_notices
for each row execute function public.touch_owner_notices_updated_at();

-- ---------- TECH ITEMS ----------------------------------------
create table if not exists public.owner_tech_items (
  id text primary key,
  title text not null check (length(trim(title)) >= 3),
  "desc" text not null default '',
  tag text not null default 'NEW' check (tag in ('NEW','PLATFORM','SECURITY','RELEASE')),
  status text not null default 'Next up' check (status in ('Next up','Building','In review','Shipped')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.owner_tech_items enable row level security;
drop policy if exists "Owners can CRUD their tech items" on public.owner_tech_items;
create policy "Owners can CRUD their tech items"
on public.owner_tech_items for all to authenticated
using (private.has_owner_capability('technology.manage') or private.has_owner_capability('finance.manage'));
grant all on public.owner_tech_items to authenticated;
revoke all on public.owner_tech_items from anon;

create or replace function public.touch_owner_tech_items_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;
drop trigger if exists owner_tech_items_touch_updated_at on public.owner_tech_items;
create trigger owner_tech_items_touch_updated_at
before update on public.owner_tech_items
for each row execute function public.touch_owner_tech_items_updated_at();

-- ---------- DOCUMENTS -----------------------------------------
create table if not exists public.owner_documents (
  id text primary key,
  name text not null,
  size integer not null default 0,
  type text not null default 'application/octet-stream',
  data_url text,
  date text not null default to_char(now(), 'YYYY-MM-DD'),
  owner text not null default 'Unassigned',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.owner_documents enable row level security;
drop policy if exists "Owners can CRUD their documents" on public.owner_documents;
create policy "Owners can CRUD their documents"
on public.owner_documents for all to authenticated
using (private.has_owner_capability('governance.read'));
grant all on public.owner_documents to authenticated;
revoke all on public.owner_documents from anon;

create or replace function public.touch_owner_documents_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;
drop trigger if exists owner_documents_touch_updated_at on public.owner_documents;
create trigger owner_documents_touch_updated_at
before update on public.owner_documents
for each row execute function public.touch_owner_documents_updated_at();

-- ---------- PERMISSIONS ---------------------------------------
create table if not exists public.owner_permissions (
  key text primary key,
  value boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.owner_permissions enable row level security;
drop policy if exists "Owners can CRUD their permissions" on public.owner_permissions;
create policy "Owners can CRUD their permissions"
on public.owner_permissions for all to authenticated
using (private.has_owner_capability('governance.read'));
grant all on public.owner_permissions to authenticated;
revoke all on public.owner_permissions from anon;

insert into public.owner_permissions (key, value) values
  ('finance', true), ('ownerChat', true), ('changeRoles', false), ('deleteRecords', false)
on conflict (key) do nothing;

create or replace function public.touch_owner_permissions_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;
drop trigger if exists owner_permissions_touch_updated_at on public.owner_permissions;
create trigger owner_permissions_touch_updated_at
before update on public.owner_permissions
for each row execute function public.touch_owner_permissions_updated_at();

-- ---------- SETTINGS -----------------------------------------
create table if not exists public.owner_settings (
  key text primary key,
  value boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.owner_settings enable row level security;
drop policy if exists "Owners can CRUD their settings" on public.owner_settings;
create policy "Owners can CRUD their settings"
on public.owner_settings for all to authenticated
using (private.has_owner_capability('governance.read'));
grant all on public.owner_settings to authenticated;
revoke all on public.owner_settings from anon;

insert into public.owner_settings (key, value) values
  ('releaseAlerts', true), ('weeklyDigest', true), ('decisionReminders', true)
on conflict (key) do nothing;

create or replace function public.touch_owner_settings_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;
drop trigger if exists owner_settings_touch_updated_at on public.owner_settings;
create trigger owner_settings_touch_updated_at
before update on public.owner_settings
for each row execute function public.touch_owner_settings_updated_at();

-- ---------- PROFIT SETTINGS -----------------------------------
create table if not exists public.owner_profit_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.owner_profit_settings enable row level security;
drop policy if exists "Owners can CRUD profit settings" on public.owner_profit_settings;
create policy "Owners can CRUD profit settings"
on public.owner_profit_settings for all to authenticated
using (private.has_owner_capability('finance.read'));
grant all on public.owner_profit_settings to authenticated;
revoke all on public.owner_profit_settings from anon;

insert into public.owner_profit_settings (key, value) values ('profit-total', '30000'), ('reserve-pct', '25')
on conflict (key) do nothing;

create or replace function public.touch_owner_profit_settings_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;
drop trigger if exists owner_profit_settings_touch_updated_at on public.owner_profit_settings;
create trigger owner_profit_settings_touch_updated_at
before update on public.owner_profit_settings
for each row execute function public.touch_owner_profit_settings_updated_at();

-- ---------- DECISION VOTES ------------------------------------
create table if not exists public.owner_decision_votes (
  id text primary key default 'current',
  reserve integer not null default 0,
  hire integer not null default 0,
  launch integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.owner_decision_votes enable row level security;
drop policy if exists "Owners can CRUD their decision votes" on public.owner_decision_votes;
create policy "Owners can CRUD their decision votes"
on public.owner_decision_votes for all to authenticated
using (private.has_owner_capability('governance.read'));
grant all on public.owner_decision_votes to authenticated;
revoke all on public.owner_decision_votes from anon;

create or replace function public.touch_owner_decision_votes_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;
drop trigger if exists owner_decision_votes_touch_updated_at on public.owner_decision_votes;
create trigger owner_decision_votes_touch_updated_at
before update on public.owner_decision_votes
for each row execute function public.touch_owner_decision_votes_updated_at();

-- ---------- MILESTONES ----------------------------------------
create table if not exists public.owner_milestones (
  id text primary key,
  title text not null,
  date text not null,
  owner text not null default 'All founders',
  kind text not null default 'Governance' check (kind in ('Governance','Product','Finance')),
  status text not null default 'Planned' check (status in ('Planned','In progress','Complete','Blocked')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.owner_milestones enable row level security;
drop policy if exists "Owners can CRUD their milestones" on public.owner_milestones;
create policy "Owners can CRUD their milestones"
on public.owner_milestones for all to authenticated
using (private.has_owner_capability('governance.read'));
grant all on public.owner_milestones to authenticated;
revoke all on public.owner_milestones from anon;

create or replace function public.touch_owner_milestones_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;
drop trigger if exists owner_milestones_touch_updated_at on public.owner_milestones;
create trigger owner_milestones_touch_updated_at
before update on public.owner_milestones
for each row execute function public.touch_owner_milestones_updated_at();

-- ---------- RISKS ---------------------------------------------
create table if not exists public.owner_risks (
  id text primary key,
  title text not null,
  area text not null default 'General',
  severity text not null default 'Medium' check (severity in ('Low','Medium','High','Critical')),
  owner text not null default 'Unassigned',
  status text not null default 'Open' check (status in ('Open','Mitigating','Resolved')),
  "next" text not null default 'Add a mitigation action',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.owner_risks enable row level security;
drop policy if exists "Owners can CRUD their risks" on public.owner_risks;
create policy "Owners can CRUD their risks"
on public.owner_risks for all to authenticated
using (private.has_owner_capability('governance.read'));
grant all on public.owner_risks to authenticated;
revoke all on public.owner_risks from anon;

create or replace function public.touch_owner_risks_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;
drop trigger if exists owner_risks_touch_updated_at on public.owner_risks;
create trigger owner_risks_touch_updated_at
before update on public.owner_risks
for each row execute function public.touch_owner_risks_updated_at();

-- ---------- VENDORS -------------------------------------------
create table if not exists public.owner_vendors (
  id text primary key,
  name text not null,
  stage text not null default 'Planned' check (stage in ('Planned','In progress','Needs attention','Complete')),
  priority text not null default 'Medium' check (priority in ('Low','Medium','High')),
  owner text not null default 'Unassigned',
  "next" text not null default 'Define the next action',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.owner_vendors enable row level security;
drop policy if exists "Owners can CRUD their vendors" on public.owner_vendors;
create policy "Owners can CRUD their vendors"
on public.owner_vendors for all to authenticated
using (private.has_owner_capability('governance.read'));
grant all on public.owner_vendors to authenticated;
revoke all on public.owner_vendors from anon;

create or replace function public.touch_owner_vendors_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;
drop trigger if exists owner_vendors_touch_updated_at on public.owner_vendors;
create trigger owner_vendors_touch_updated_at
before update on public.owner_vendors
for each row execute function public.touch_owner_vendors_updated_at();

-- ---------- CUSTOMER ISSUES -----------------------------------
create table if not exists public.owner_customer_issues (
  id text primary key,
  title text not null,
  type text not null default 'Feedback' check (type in ('Feedback','Delivery','Refund','Product quality')),
  priority text not null default 'Medium' check (priority in ('Low','Medium','High')),
  status text not null default 'Open' check (status in ('Open','In review','Resolved')),
  owner text not null default 'Unassigned',
  "next" text not null default 'Investigate and reply',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.owner_customer_issues enable row level security;
drop policy if exists "Owners can CRUD their customer issues" on public.owner_customer_issues;
create policy "Owners can CRUD their customer issues"
on public.owner_customer_issues for all to authenticated
using (private.has_owner_capability('governance.read'));
grant all on public.owner_customer_issues to authenticated;
revoke all on public.owner_customer_issues from anon;

create or replace function public.touch_owner_customer_issues_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;
drop trigger if exists owner_customer_issues_touch_updated_at on public.owner_customer_issues;
create trigger owner_customer_issues_touch_updated_at
before update on public.owner_customer_issues
for each row execute function public.touch_owner_customer_issues_updated_at();

-- ---------- PLATFORM FEATURES ---------------------------------
create table if not exists public.owner_platform_features (
  id text primary key,
  title text not null check (length(trim(title)) between 3 and 160),
  scope text not null default 'Whole panel',
  description text not null default '' check (length(description) <= 4000),
  status text not null default 'Proposed' check (status in ('Proposed','Planned','In progress','Shipped','Declined')),
  by_owner text not null default 'Technology owner',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.owner_platform_features enable row level security;
drop policy if exists "All owners read platform features" on public.owner_platform_features;
create policy "All owners read platform features"
on public.owner_platform_features for select to authenticated
using (private.has_owner_capability('governance.read'));
drop policy if exists "Technology owner writes platform features" on public.owner_platform_features;
create policy "Technology owner writes platform features"
on public.owner_platform_features for insert to authenticated
with check (created_by = auth.uid() and private.has_owner_capability('technology.manage'));
drop policy if exists "Technology owner updates platform features" on public.owner_platform_features;
create policy "Technology owner updates platform features"
on public.owner_platform_features for update to authenticated
using (private.has_owner_capability('technology.manage'))
with check (private.has_owner_capability('technology.manage'));
drop policy if exists "No deletes on platform features" on public.owner_platform_features;
create policy "No deletes on platform features"
on public.owner_platform_features for delete to authenticated
using (false);
grant select, insert, update on public.owner_platform_features to authenticated;
revoke all on public.owner_platform_features from anon;

create or replace function public.touch_owner_platform_features_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;
drop trigger if exists owner_platform_features_touch_updated_at on public.owner_platform_features;
create trigger owner_platform_features_touch_updated_at
before update on public.owner_platform_features
for each row execute function public.touch_owner_platform_features_updated_at();

-- ---------- OWNER CHAT MESSAGES -------------------------------
create table if not exists public.owner_chat_messages (
  id text primary key,
  owner text not null check (owner in ('tech','finance','marketing')),
  name text not null,
  initials text not null,
  color text not null,
  text text not null,
  time text not null,
  attachments jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.owner_chat_messages enable row level security;
drop policy if exists "Owners can CRUD chat messages" on public.owner_chat_messages;
create policy "Owners can CRUD chat messages"
on public.owner_chat_messages for all to authenticated
using (private.has_owner_capability('governance.read'));
grant all on public.owner_chat_messages to authenticated;
revoke all on public.owner_chat_messages from anon;

create or replace function public.touch_owner_chat_messages_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;
drop trigger if exists owner_chat_messages_touch_updated_at on public.owner_chat_messages;
create trigger owner_chat_messages_touch_updated_at
before update on public.owner_chat_messages
for each row execute function public.touch_owner_chat_messages_updated_at();

-- ---------- WORKSPACE STATE (scalars) -------------------------
create table if not exists public.owner_workspace_state (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.owner_workspace_state enable row level security;
drop policy if exists "Owners can CRUD workspace state" on public.owner_workspace_state;
create policy "Owners can CRUD workspace state"
on public.owner_workspace_state for all to authenticated
using (private.has_owner_capability('governance.read'));
grant all on public.owner_workspace_state to authenticated;
revoke all on public.owner_workspace_state from anon;

create or replace function public.touch_owner_workspace_state_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;
drop trigger if exists owner_workspace_state_touch_updated_at on public.owner_workspace_state;
create trigger owner_workspace_state_touch_updated_at
before update on public.owner_workspace_state
for each row execute function public.touch_owner_workspace_state_updated_at();
