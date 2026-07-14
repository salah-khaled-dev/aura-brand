-- ============================================================================
-- profiles.staff_role_key — links an admin/super_admin profile to the
-- granular module-permission role used by the admin dashboard's RBAC UI
-- (administrator, store_manager, inventory_manager, finance_manager,
-- marketing_manager, customer_support). The permission matrix itself still
-- lives in application code; this column only records which named role a
-- given staff profile has. Purely additive — nothing from 20260714120002 is
-- changed in place.
-- ============================================================================

alter table public.profiles
  add column staff_role_key text;

alter table public.profiles
  add constraint profiles_staff_role_key_valid check (
    staff_role_key is null or staff_role_key in (
      'administrator', 'store_manager', 'inventory_manager',
      'finance_manager', 'marketing_manager', 'customer_support'
    )
  ),
  add constraint profiles_staff_role_key_requires_staff check (
    staff_role_key is null or role in ('admin', 'super_admin')
  );

-- Extend the existing role-escalation guard so a non-super-admin can't grant
-- themselves (or anyone) a different staff role either, same rationale as
-- the original `role` guard from 20260714120002.
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role or new.staff_role_key is distinct from old.staff_role_key)
     and not public.is_super_admin() then
    raise exception 'Only a super_admin can change profile roles';
  end if;
  return new;
end;
$$;
