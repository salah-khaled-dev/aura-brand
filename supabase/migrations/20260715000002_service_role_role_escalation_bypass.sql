-- ============================================================================
-- prevent_role_escalation() — trust service_role sessions
--
-- Regression: POST/PATCH /api/admin/staff (src/app/api/admin/staff/route.ts,
-- src/app/api/admin/staff/[id]/route.ts) already verify the calling browser
-- session belongs to an active super_admin before doing anything, but they
-- then perform the actual profiles write through the service-role client
-- (createAdminClient()). The service-role key bypasses RLS policies, but it
-- does NOT bypass triggers — guard_profiles_role (20260714120002) still
-- fires, and prevent_role_escalation() calls is_super_admin(), which checks
-- auth.uid(). A service-role request carries no `sub` claim, so auth.uid()
-- is null there, is_super_admin() comes back false, and every staff
-- creation/edit is rejected with "Only a super_admin can change profile
-- roles" — even though the real caller was already authorized in app code.
--
-- Fix: let the trigger also trust auth.role() = 'service_role'. This does
-- not weaken anything a browser session can do — anon/authenticated
-- sessions never carry the service_role JWT claim (it's minted only from
-- the server-side SUPABASE_SERVICE_ROLE_KEY, which never reaches the
-- client), so this bypass is reachable only from trusted server code, and
-- every route that uses createAdminClient() for a profiles write already
-- re-implements the same "caller is an active super_admin" check itself
-- (see requireSuperAdmin() in staff/[id]/route.ts and the equivalent inline
-- check in staff/route.ts) before it ever touches the service-role client.
-- guard_profiles_role stays attached, RLS stays enabled, and every
-- browser/authenticated-role UPDATE to profiles.role or
-- profiles.staff_role_key is still blocked unless is_super_admin() is true,
-- exactly as before.
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

  return new;
end;
$$;
