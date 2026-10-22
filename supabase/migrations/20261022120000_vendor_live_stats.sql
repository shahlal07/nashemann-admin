-- Keep vendors.orders_last_30d / revenue_last_30d in sync with real orders.
--
-- These columns are read by the public site (hero stats, vendor showcase) and
-- the revenue page, but nothing ever wrote them, so live vendors always showed
-- 0 orders. This trigger recomputes the two counters for the affected vendor
-- whenever an order is created or its status changes, and the UPDATE below
-- backfills every vendor from the real orders table.

create or replace function private.refresh_vendor_live_stats()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_vendor uuid;
begin
  v_vendor := coalesce(new.vendor_id, old.vendor_id);
  if v_vendor is null then
    return null;
  end if;

  update public.vendors v
  set orders_last_30d = s.cnt,
      revenue_last_30d = s.rev,
      updated_at = now()
  from lateral (
    select count(*)::int as cnt,
           coalesce(sum(o.total), 0) as rev
    from public.orders o
    where o.vendor_id = v_vendor
      and o.created_at >= now() - interval '30 days'
      and o.status not in ('cancelled', 'refunded')
  ) s
  where v.id = v_vendor;

  return null;
end;
$$;

drop trigger if exists orders_refresh_vendor_stats on public.orders;
create trigger orders_refresh_vendor_stats
after insert or update of status on public.orders
for each row execute function private.refresh_vendor_live_stats();

-- Backfill every vendor from real orders (also clears stale seeded counters).
update public.vendors v
set orders_last_30d = (
      select count(*)::int
      from public.orders o
      where o.vendor_id = v.id
        and o.created_at >= now() - interval '30 days'
        and o.status not in ('cancelled', 'refunded')
    ),
    revenue_last_30d = (
      select coalesce(sum(o.total), 0)
      from public.orders o
      where o.vendor_id = v.id
        and o.created_at >= now() - interval '30 days'
        and o.status not in ('cancelled', 'refunded')
    ),
    updated_at = now();
