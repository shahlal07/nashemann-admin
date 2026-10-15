-- Super Admin Email Control Center.
-- The service-role key is the only writer/reader for these private tables.
create table if not exists public.platform_email_settings (
  id boolean primary key default true check (id),
  category_enabled jsonb not null default '{"notifications":true,"support":true,"security":true,"staff":true}'::jsonb,
  sender_from jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

insert into public.platform_email_settings (id)
values (true)
on conflict (id) do nothing;

create table if not exists public.platform_email_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  category text not null check (category in ('notifications','support','security','staff')),
  source text not null default 'unknown',
  recipient_domain text,
  subject text not null default '',
  status text not null check (status in ('sent','failed','skipped')),
  provider_id text,
  error_message text
);

create index if not exists platform_email_log_created_at_idx
  on public.platform_email_log (created_at desc);
create index if not exists platform_email_log_status_created_idx
  on public.platform_email_log (status, created_at desc);
create index if not exists platform_email_log_category_created_idx
  on public.platform_email_log (category, created_at desc);

alter table public.platform_email_settings enable row level security;
alter table public.platform_email_log enable row level security;
revoke all on public.platform_email_settings from anon, authenticated;
revoke all on public.platform_email_log from anon, authenticated;
grant all on public.platform_email_settings to service_role;
grant all on public.platform_email_log to service_role;
