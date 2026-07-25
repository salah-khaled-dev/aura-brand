-- ============================================================================
-- Tracking page currently only accepts order_number, but a customer's order
-- confirmation only ever contains the order number — tracking_number stays
-- null until an admin ships the order — so there was no way to look up an
-- order using a courier tracking number even after it existed. Fix:
-- get_guest_order() now matches p_order_number against EITHER order_number
-- OR tracking_number, so the same lookup box on /tracking transparently
-- accepts whichever one the customer has.
--
-- Signature is unchanged (still (text, text)) — only the WHERE clause grows
-- an OR branch — so no drop/grant churn is needed beyond the replace itself.
-- ============================================================================

create or replace function public.get_guest_order(p_order_number text, p_contact text)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select to_jsonb(o) || jsonb_build_object(
    'order_items', coalesce(
      (select jsonb_agg(to_jsonb(oi)) from public.order_items oi where oi.order_id = o.id),
      '[]'::jsonb
    )
  )
  from public.orders o
  where o.user_id is null
    and (
      upper(regexp_replace(o.order_number, '[^A-Za-z0-9]', '', 'g'))
          = upper(regexp_replace(p_order_number, '[^A-Za-z0-9]', '', 'g'))
      or (
        o.tracking_number is not null
        and upper(regexp_replace(o.tracking_number, '[^A-Za-z0-9]', '', 'g'))
            = upper(regexp_replace(p_order_number, '[^A-Za-z0-9]', '', 'g'))
      )
    )
    and (
      -- Email match (case-insensitive) if the second factor looks like one...
      (p_contact like '%@%' and lower(o.customer_email) = lower(trim(p_contact)))
      -- ...otherwise treat it as a phone number: compare the last 8 digits so
      -- +20/0/formatting differences between what the customer typed at
      -- checkout and at lookup time don't false-negative.
      or (
        p_contact not like '%@%'
        and length(regexp_replace(p_contact, '\D', '', 'g')) >= 8
        and right(regexp_replace(o.phone, '\D', '', 'g'), 8)
            = right(regexp_replace(p_contact, '\D', '', 'g'), 8)
      )
    )
  limit 1;
$$;

comment on function public.get_guest_order(text, text) is
  'Guest order lookup by order number OR tracking number (either accepted in p_order_number), plus the phone/email used at checkout as a second factor — order_number/tracking_number alone are not sufficient to prove ownership.';
