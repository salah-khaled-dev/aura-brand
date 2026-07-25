-- ============================================================================
-- Re-key customer auto-derivation from phone to email.
--
-- sync_customer_from_order() (20260715000010_customers.sql) already upserts a
-- customers row on every order insert — that part was never missing. It
-- matched on normalized phone, on the reasoning that phone was the one field
-- every order (guest or admin-created) always carried. Checkout now requires
-- email too (src/app/checkout/page.tsx validates it as a mandatory field
-- before step 3), so email is an equally reliable identity key — and a
-- better one: phone numbers get shared (family members, WhatsApp-only
-- numbers used by more than one shopper), which would silently merge
-- unrelated customers into one CRM record. Email doesn't have that problem.
--
-- Switching the match key requires dropping the phone column's UNIQUE index:
-- once two customers can legitimately share a phone (distinct emails), an
-- INSERT for the second one would otherwise fail the uniqueness check and
-- break order creation for a guest who just happens to share a household
-- phone. The index itself is kept (non-unique) for lookup performance.
-- ============================================================================

drop index if exists public.customers_phone_normalized_idx;
create index if not exists customers_phone_normalized_idx on public.customers (regexp_replace(phone, '\D', '', 'g'));

drop index if exists public.customers_email_idx;
create index if not exists customers_email_lower_idx on public.customers (lower(email));

create or replace function public.sync_customer_from_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_normalized_email text := lower(trim(coalesce(new.customer_email, '')));
begin
  -- No email on this order (shouldn't happen — checkout requires it, and the
  -- admin "new order" form always passes an existing customer's email — but
  -- guard anyway so a blank value never gets treated as a match key): leave
  -- customer_ref_id untouched rather than merging unrelated blank-email rows.
  if v_normalized_email = '' then
    return new;
  end if;

  select id into v_customer_id
    from public.customers
    where lower(email) = v_normalized_email
    limit 1;

  if v_customer_id is null then
    insert into public.customers (customer_number, full_name, email, phone, status)
    values (
      'CUS-' || lpad(nextval('public.customers_number_seq')::text, 6, '0'),
      coalesce(new.customer_name, ''),
      new.customer_email,
      coalesce(new.phone, ''),
      'active'
    )
    returning id into v_customer_id;
  else
    -- Keep name/phone reasonably current without clobbering admin-edited
    -- fields with blanks — only fill in what the order actually has.
    update public.customers
    set full_name = case when coalesce(new.customer_name, '') <> '' then new.customer_name else full_name end,
        phone = case when coalesce(new.phone, '') <> '' then new.phone else phone end
    where id = v_customer_id;
  end if;

  new.customer_ref_id := v_customer_id;
  return new;
end;
$$;
