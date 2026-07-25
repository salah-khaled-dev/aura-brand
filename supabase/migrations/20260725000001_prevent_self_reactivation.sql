-- ============================================================================
-- prevent_role_escalation() — also guard profiles.is_active
--
-- P0 security hotfix. profiles_update_own (20260714120002) lets any
-- authenticated user update their own profile row
-- (`using/with check (id = auth.uid())`), and the guard trigger on
-- public.profiles only ever checked `role` / `staff_role_key`. Nothing
-- stopped a deactivated staff member (is_active = false) — whose Supabase
-- Auth session/JWT is still perfectly valid, only their profile row is
-- flagged inactive — from calling
-- `supabase.from('profiles').update({ is_active: true }).eq('id', <self>)`
-- directly from the browser (devtools console or a replayed request),
-- satisfying profiles_update_own and silently reactivating themselves. The
-- admin dashboard's "deactivate user" action (UsersPage.handleToggleStatus)
-- was therefore only a UI-level restriction, not an enforced one.
--
-- Fix: block any change to is_active unless the caller already passes
-- is_admin() (mirrors profiles_update_admin, the same authority the Users
-- page's toggle already requires in the UI), or the request comes from
-- service_role (trusted server routes, which re-check the caller's
-- authority themselves before touching profiles — see requireSuperAdmin()
-- in src/app/api/admin/staff/[id]/route.ts). is_admin() itself requires
-- is_active = true, and this trigger runs BEFORE UPDATE so it observes the
-- pre-update row — so the instant a staff member is deactivated, is_admin()
-- is false for them and this closes the loop: only a still-active admin (or
-- trusted server code) can flip is_active on any row, including their own.
-- ============================================================================

create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    new.role is distinct from old.role
    or new.staff_role_key is distinct from old.staff_role_key
  )
  and not public.is_super_admin()
  and auth.role() is distinct from 'service_role' then
    raise exception 'Only a super_admin can change profile roles';
  end if;

  if new.is_active is distinct from old.is_active
  and not public.is_admin()
  and auth.role() is distinct from 'service_role' then
    raise exception 'Only an active admin can change profile active status';
  end if;

  return new;
end;
$$;
