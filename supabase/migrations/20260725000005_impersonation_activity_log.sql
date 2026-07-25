-- ============================================================================
-- Impersonation ("View As Role") activity logging.
--
-- PermissionContext.tsx logged every role-impersonation switch through
-- RepositoryProvider.activityLog().create(...) — an in-memory mock
-- repository (src/lib/repositories/mock/activity-log.repository.mock.ts)
-- that discards every row on reload/restart. A privilege-impersonation
-- feature therefore had no real audit trail at all. Fix: route it through
-- public.activity_log, following the log_auth_event() pattern
-- (20260715000009) — impersonation is a client-only event with no table row
-- of its own to attach a trigger to, so a client-called SECURITY DEFINER RPC
-- is the same shape as login/logout.
-- ============================================================================

alter table public.activity_log drop constraint activity_log_action_valid;
alter table public.activity_log add constraint activity_log_action_valid
  check (action in ('created', 'updated', 'deleted', 'login', 'logout', 'impersonation'));

create or replace function public.log_impersonation_event(p_from_role text, p_to_role text, p_metadata jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_email text;
begin
  if v_actor_id is null then
    return; -- nothing to attribute this to without a session
  end if;

  select email into v_actor_email from public.profiles where id = v_actor_id;

  insert into public.activity_log (actor_id, actor_email, action, entity_type, entity_id, metadata)
  values (
    v_actor_id, v_actor_email, 'impersonation', 'impersonation', p_to_role,
    p_metadata || jsonb_build_object('fromRole', p_from_role, 'toRole', p_to_role)
  );

  insert into public.notifications (
    for_admins, type, title, message, actor_id, actor_email, action, entity_type, entity_id, metadata
  )
  values (
    true, 'system',
    'تغيير عرض الدور',
    coalesce(v_actor_email, 'مستخدم غير معروف') || ' غيّر عرض الدور من ' || p_from_role || ' إلى ' || p_to_role,
    v_actor_id, v_actor_email, 'impersonation', 'impersonation', p_to_role, p_metadata
  );
end;
$$;

grant execute on function public.log_impersonation_event(text, text, jsonb) to authenticated;

comment on function public.log_impersonation_event(text, text, jsonb) is
  'Client-called from PermissionContext.tsx whenever an admin switches "view as role" — writes to the real activity_log/notifications tables, replacing the discarded in-memory mock repository log.';
