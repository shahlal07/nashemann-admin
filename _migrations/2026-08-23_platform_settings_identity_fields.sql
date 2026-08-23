-- Platform identity/application-default columns on platform_settings
-- Run this in the nashemann Supabase SQL Editor (project eznxsosvsgkhexbjoolh).
-- Backs the Settings page (src/app/settings), which previously had no
-- persistence at all. Mirrors the fee columns already added to this same
-- singleton table by 2026-08-18_platform_fee_mode.sql.

ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS platform_name text NOT NULL DEFAULT 'Nashemann',
  ADD COLUMN IF NOT EXISTS support_email text NOT NULL DEFAULT 'hello@nashemann.store',
  ADD COLUMN IF NOT EXISTS tagline text NOT NULL DEFAULT 'The infrastructure behind independent online stores.',
  ADD COLUMN IF NOT EXISTS application_sla_hours integer NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS default_applicant_plan pricing_plan NOT NULL DEFAULT 'per_order'::pricing_plan,
  ADD COLUMN IF NOT EXISTS applications_paused boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.platform_settings.platform_name IS 'Nashemann''s own platform identity name, shown platform-wide (distinct from any vendor branding).';
COMMENT ON COLUMN public.platform_settings.support_email IS 'Platform-level support contact email.';
COMMENT ON COLUMN public.platform_settings.tagline IS 'Platform tagline shown on marketing/identity surfaces.';
COMMENT ON COLUMN public.platform_settings.application_sla_hours IS 'Target hours to review a new vendor application.';
COMMENT ON COLUMN public.platform_settings.default_applicant_plan IS 'Default pricing plan preselected for new vendor applicants.';
COMMENT ON COLUMN public.platform_settings.applications_paused IS 'When true, the public /apply page should be hidden -- platform is at capacity.';
