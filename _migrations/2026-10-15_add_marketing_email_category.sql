alter table public.platform_email_log
  drop constraint if exists platform_email_log_category_check;
alter table public.platform_email_log
  add constraint platform_email_log_category_check
  check (category in ('notifications','marketing','support','security','staff'));

alter table public.platform_email_settings
  alter column category_enabled set default '{"notifications":true,"marketing":true,"support":true,"security":true,"staff":true}'::jsonb;

update public.platform_email_settings
set category_enabled = '{"notifications":true,"marketing":true,"support":true,"security":true,"staff":true}'::jsonb || category_enabled
where id = true;
