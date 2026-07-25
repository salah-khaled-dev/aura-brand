-- ============================================================================
-- customer_notifications — replace unauthenticated full-table SELECT with a
-- capability-proof RPC, mirroring get_guest_order (20260715000007).
--
-- customer_notifications_select_public (20260715000018) granted
-- `using (true)` to anon+authenticated on the theory that order_id (a random
-- uuid) was itself the capability — but the policy never actually required a
-- caller to know or match any order_id, so `select * from
-- customer_notifications` via the public REST API returned every row for
-- every guest order ever placed (order_number, status, message text) to
-- anyone. Fix: drop the policy and require the same two factors
-- get_guest_order already requires — order_number + the phone/email used at
-- checkout — via SECURITY DEFINER RPCs. Nothing in the app called the old
-- direct-select/direct-update paths (grepped: zero callers of
-- CustomerNotificationService.listForOrder/markAllRead), so this is a
-- same-pass API change, not a breaking one.
-- ============================================================================

drop policy if exists "customer_notifications_select_public" on public.customer_notifications;

-- The anon+authenticated SELECT grant (20260715000019) is still needed for
-- `authenticated` (customer_notifications_select_admin), but anon has no
-- policy left to use it under now — revoke explicitly so there's no dangling
-- grant a future permissive policy could silently reactivate.
revoke select on table public.customer_notifications from anon;

create or replace function public.get_customer_notifications(p_order_number text, p_contact text)
returns setof public.customer_notifications
language sql
security definer
stable
set search_path = public
as $$
  select cn.*
  from public.customer_notifications cn
  join public.orders o on o.id = cn.order_id
  where o.user_id is null
    and upper(regexp_replace(o.order_number, '[^A-Za-z0-9]', '', 'g'))
        = upper(regexp_replace(p_order_number, '[^A-Za-z0-9]', '', 'g'))
    and (
      (p_contact like '%@%' and lower(o.customer_email) = lower(trim(p_contact)))
      or (
        p_contact not like '%@%'
        and length(regexp_replace(p_contact, '\D', '', 'g')) >= 8
        and right(regexp_replace(o.phone, '\D', '', 'g'), 8)
            = right(regexp_replace(p_contact, '\D', '', 'g'), 8)
      )
    )
  order by cn.created_at desc;
$$;

grant execute on function public.get_customer_notifications(text, text) to anon, authenticated;

comment on function public.get_customer_notifications(text, text) is
  'Customer notification feed requires BOTH the order number AND the phone/email used at checkout — same ownership proof as get_guest_order. order_id alone is never accepted as a capability.';

create or replace function public.mark_customer_notifications_read(p_order_number text, p_contact text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
begin
  select o.id into v_order_id
  from public.orders o
  where o.user_id is null
    and upper(regexp_replace(o.order_number, '[^A-Za-z0-9]', '', 'g'))
        = upper(regexp_replace(p_order_number, '[^A-Za-z0-9]', '', 'g'))
    and (
      (p_contact like '%@%' and lower(o.customer_email) = lower(trim(p_contact)))
      or (
        p_contact not like '%@%'
        and length(regexp_replace(p_contact, '\D', '', 'g')) >= 8
        and right(regexp_replace(o.phone, '\D', '', 'g'), 8)
            = right(regexp_replace(p_contact, '\D', '', 'g'), 8)
      )
    )
  limit 1;

  if v_order_id is null then
    return;
  end if;

  update public.customer_notifications
  set is_read = true
  where order_id = v_order_id
    and is_read = false;
end;
$$;

grant execute on function public.mark_customer_notifications_read(text, text) to anon, authenticated;

comment on function public.mark_customer_notifications_read(text, text) is
  'Same ownership-proof requirement as get_customer_notifications — order_number + phone/email, never order_id alone.';
