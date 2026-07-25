-- ============================================================================
-- Fix log_entity_activity(): notification_type enum cast
--
-- Bug: ERROR: column "type" is of type notification_type but expression is
-- of type text (raised inside log_entity_activity() at the notifications
-- insert).
--
-- Root cause: v_notif_type was declared `text`, not `public.notification_type`.
-- Postgres auto-casts an unknown-typed string literal (e.g. 'order') into an
-- enum column, which is why log_order_activity() and log_auth_event() (both
-- insert literals directly) never hit this — but a `text`-typed *variable*
-- has no implicit cast to a user-defined enum inside a plain SQL statement.
--
-- Every one of the 26 trigger attachments across the migration history only
-- ever passes 'system', 'customer', or 'review' as the second argument — all
-- valid members of notification_type ('order','account','promotion','stock',
-- 'system','customer','review') — so casting is correct, not a lossy
-- workaround.
--
-- This is a full CREATE OR REPLACE of the function body as last defined in
-- 20260715000011_dashboard_notifications_completion.sql (which added the
-- severity/sensitive columns and third trigger arg) — that file and
-- 20260715000009_event_driven_activity_log.sql are left untouched.
-- ============================================================================

create or replace function public.log_entity_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_email text;
  v_action text;
  v_entity_id text;
  v_before jsonb;
  v_after jsonb;
  v_label text := coalesce(tg_argv[0], tg_table_name);
  v_notif_type public.notification_type := coalesce(tg_argv[1], 'system')::public.notification_type;
  v_sensitive boolean := coalesce(tg_argv[2], 'false')::boolean;
  v_title text;
  v_message text;
begin
  select email into v_actor_email from public.profiles where id = v_actor_id;

  if tg_op = 'INSERT' then
    v_action := 'created';
    v_entity_id := (to_jsonb(new)->>'id');
    v_after := to_jsonb(new);
    v_title := v_label || ' — إضافة جديدة';
  elsif tg_op = 'UPDATE' then
    v_action := 'updated';
    v_entity_id := (to_jsonb(new)->>'id');
    v_before := to_jsonb(old);
    v_after := to_jsonb(new);
    v_title := v_label || ' — تعديل';
  elsif tg_op = 'DELETE' then
    v_action := 'deleted';
    v_entity_id := (to_jsonb(old)->>'id');
    v_before := to_jsonb(old);
    v_title := v_label || ' — حذف';
  end if;

  insert into public.activity_log (
    actor_id, actor_email, action, entity_type, entity_id, before_data, after_data
  )
  values (
    v_actor_id, v_actor_email, v_action, tg_table_name, v_entity_id, v_before, v_after
  );

  v_message := coalesce(v_actor_email, 'مستخدم غير معروف') || ' قام بعملية ' ||
    case v_action when 'created' then 'إنشاء' when 'updated' then 'تعديل' else 'حذف' end ||
    ' على ' || v_label;

  insert into public.notifications (
    for_admins, type, severity, sensitive, title, message, actor_id, actor_email, action, entity_type, entity_id
  )
  values (
    true, v_notif_type, 'info', v_sensitive, v_title, v_message, v_actor_id, v_actor_email, v_action, tg_table_name, v_entity_id
  );

  return coalesce(new, old);
end;
$$;
