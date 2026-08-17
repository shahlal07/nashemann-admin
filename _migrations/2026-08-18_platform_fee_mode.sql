-- Platform fee mode columns on the nashemann side
-- Run this in the nashemann Supabase SQL Editor (project mztayodmvdpzzwzznsvu).
-- These mirror what the super admin sets so the UI can round-trip the data.

-- 1. Per-vendor override in vendors table
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS fee_type text NOT NULL DEFAULT 'percent',
  ADD COLUMN IF NOT EXISTS fee_override_fixed_amount integer;

COMMENT ON COLUMN public.vendors.fee_type IS
  'percent = percentage of subtotal; fixed = flat rupee amount per order.';
COMMENT ON COLUMN public.vendors.fee_override_fixed_amount IS
  'Flat per-order fee in PKR when fee_type = fixed. NULL means use platform default.';

-- 2. Platform-wide default in a new column on platform_settings
ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS platform_fee_type text NOT NULL DEFAULT 'percent',
  ADD COLUMN IF NOT EXISTS platform_fee_fixed_amount integer NOT NULL DEFAULT 0;
