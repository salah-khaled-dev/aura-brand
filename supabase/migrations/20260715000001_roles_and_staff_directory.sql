-- ============================================================================
-- roles — the module → {read, write, delete} permission matrix used by the
-- admin dashboard's RBAC (PermissionContext.can / canAccessModule). This used
-- to live only in the browser (localStorage MOCK_ROLES in users.service.ts),
-- so different admins/browsers could see different permissions. `id` keeps
-- the existing 'role_1'..'role_6' values — PermissionContext.tsx and
-- auth.service.ts hardcode 'role_1' for the super-admin/impersonation gate,
-- so the id format is preserved exactly, only the storage moves.
--
-- profiles.staff_role_key (20260714120017) already links a staff profile to
-- one of these roles by name_key; this migration upgrades that link from a
-- hardcoded 6-value CHECK to a real FK, and adds the roles table it points at.
--
-- Idempotent: safe to re-run. Postgres has no CREATE TRIGGER/POLICY/CONSTRAINT
-- IF NOT EXISTS, so those use DROP ... IF EXISTS guards; everything else uses
-- IF NOT EXISTS / ON CONFLICT DO NOTHING directly.
-- ============================================================================

create table if not exists public.roles (
  id text primary key,
  name_ar text not null,
  name_key text not null unique,
  description_ar text not null default '',
  color text not null default 'blue',
  is_system boolean not null default false,
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_roles_updated_at on public.roles;
create trigger set_roles_updated_at
  before update on public.roles
  for each row execute function public.set_updated_at();

alter table public.roles enable row level security;

-- Any active admin/super_admin can read the role matrix (needed to resolve
-- their own effective permissions and to populate the role dropdown).
drop policy if exists "roles_select_admin" on public.roles;
create policy "roles_select_admin"
  on public.roles for select
  to authenticated
  using (public.is_admin());

-- Only a super_admin can create/edit/delete roles — same authority level
-- already required to change a profile's role/staff_role_key
-- (see prevent_role_escalation in 20260714120002 / 20260714120017).
drop policy if exists "roles_insert_super_admin" on public.roles;
create policy "roles_insert_super_admin"
  on public.roles for insert
  to authenticated
  with check (public.is_super_admin());

drop policy if exists "roles_update_super_admin" on public.roles;
create policy "roles_update_super_admin"
  on public.roles for update
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "roles_delete_super_admin" on public.roles;
create policy "roles_delete_super_admin"
  on public.roles for delete
  to authenticated
  using (public.is_super_admin());

-- Seed the 6 existing system roles, verbatim from the retired MOCK_ROLES.
-- ON CONFLICT DO NOTHING: won't clobber roles already edited via the admin
-- Roles UI on a re-run.
insert into public.roles (id, name_ar, name_key, description_ar, color, is_system, permissions) values
('role_1', 'المسؤول الأول', 'administrator', 'صلاحية كاملة على جميع أجزاء النظام', 'purple', true, '{
  "dashboard":  {"read": true, "write": true, "delete": true},
  "analytics":  {"read": true, "write": true, "delete": true},
  "products":   {"read": true, "write": true, "delete": true},
  "inventory":  {"read": true, "write": true, "delete": true},
  "orders":     {"read": true, "write": true, "delete": true},
  "customers":  {"read": true, "write": true, "delete": true},
  "finance":    {"read": true, "write": true, "delete": true},
  "marketing":  {"read": true, "write": true, "delete": true},
  "storefront": {"read": true, "write": true, "delete": true},
  "settings":   {"read": true, "write": true, "delete": true},
  "system":     {"read": true, "write": true, "delete": true, "impersonation": true}
}'::jsonb),
('role_2', 'مدير المتجر', 'store_manager', 'إدارة المنتجات والطلبات والعملاء دون الوصول للمالية والإعدادات', 'blue', true, '{
  "dashboard":  {"read": true,  "write": false, "delete": false},
  "analytics":  {"read": true,  "write": false, "delete": false},
  "products":   {"read": true,  "write": true,  "delete": true},
  "inventory":  {"read": true,  "write": true,  "delete": false},
  "orders":     {"read": true,  "write": true,  "delete": false},
  "customers":  {"read": true,  "write": true,  "delete": false},
  "finance":    {"read": true,  "write": false, "delete": false},
  "marketing":  {"read": true,  "write": true,  "delete": false},
  "storefront": {"read": true,  "write": true,  "delete": false},
  "settings":   {"read": false, "write": false, "delete": false}
}'::jsonb),
('role_3', 'مدير المخزون', 'inventory_manager', 'إدارة المخزون والموردين وأوامر الشراء فقط', 'emerald', true, '{
  "dashboard":  {"read": true,  "write": false, "delete": false},
  "analytics":  {"read": false, "write": false, "delete": false},
  "products":   {"read": true,  "write": false, "delete": false},
  "inventory":  {"read": true,  "write": true,  "delete": true},
  "orders":     {"read": true,  "write": false, "delete": false},
  "customers":  {"read": false, "write": false, "delete": false},
  "finance":    {"read": false, "write": false, "delete": false},
  "marketing":  {"read": false, "write": false, "delete": false},
  "storefront": {"read": false, "write": false, "delete": false},
  "settings":   {"read": false, "write": false, "delete": false}
}'::jsonb),
('role_4', 'المحاسب المالي', 'finance_manager', 'الوصول الكامل للتقارير المالية والمصروفات والأصول', 'orange', true, '{
  "dashboard":  {"read": true,  "write": false, "delete": false},
  "analytics":  {"read": true,  "write": false, "delete": false},
  "products":   {"read": true,  "write": false, "delete": false},
  "inventory":  {"read": true,  "write": false, "delete": false},
  "orders":     {"read": true,  "write": false, "delete": false},
  "customers":  {"read": true,  "write": false, "delete": false},
  "finance":    {"read": true,  "write": true,  "delete": true},
  "marketing":  {"read": false, "write": false, "delete": false},
  "storefront": {"read": false, "write": false, "delete": false},
  "settings":   {"read": false, "write": false, "delete": false}
}'::jsonb),
('role_5', 'مدير التسويق', 'marketing_manager', 'إدارة الكوبونات والمقالات والمحتوى والواجهة', 'pink', true, '{
  "dashboard":  {"read": true,  "write": false, "delete": false},
  "analytics":  {"read": true,  "write": false, "delete": false},
  "products":   {"read": true,  "write": true,  "delete": false},
  "inventory":  {"read": true,  "write": false, "delete": false},
  "orders":     {"read": false, "write": false, "delete": false},
  "customers":  {"read": true,  "write": false, "delete": false},
  "finance":    {"read": false, "write": false, "delete": false},
  "marketing":  {"read": true,  "write": true,  "delete": true},
  "storefront": {"read": true,  "write": true,  "delete": true},
  "settings":   {"read": false, "write": false, "delete": false}
}'::jsonb),
('role_6', 'خدمة العملاء', 'customer_support', 'الرد على العملاء ومعالجة الطلبات والمرتجعات', 'cyan', true, '{
  "dashboard":  {"read": true,  "write": false, "delete": false},
  "analytics":  {"read": false, "write": false, "delete": false},
  "products":   {"read": true,  "write": false, "delete": false},
  "inventory":  {"read": true,  "write": false, "delete": false},
  "orders":     {"read": true,  "write": true,  "delete": false},
  "customers":  {"read": true,  "write": true,  "delete": false},
  "finance":    {"read": false, "write": false, "delete": false},
  "marketing":  {"read": false, "write": false, "delete": false},
  "storefront": {"read": false, "write": false, "delete": false},
  "settings":   {"read": false, "write": false, "delete": false}
}'::jsonb)
on conflict (id) do nothing;

-- ============================================================================
-- profiles — display field the create/edit staff form already collects but
-- the API route never persisted, and the FK upgrade for staff_role_key.
-- ============================================================================

alter table public.profiles add column if not exists username text;

alter table public.profiles drop constraint if exists profiles_staff_role_key_valid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_staff_role_key_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_staff_role_key_fkey
        foreign key (staff_role_key) references public.roles (name_key)
        on update cascade;
  end if;
end $$;

create index if not exists profiles_staff_role_key_idx on public.profiles (staff_role_key);

-- ============================================================================
-- Explicit grants — profiles has never had one (only Phase A tables got this
-- fix in 20260714120021), which is the exact "permission denied for table X"
-- failure mode that migration's own comment documents. Add it here for
-- profiles and the new roles table before either gets real traffic.
-- GRANT is idempotent by nature — re-running is always a no-op-safe no-op.
-- ============================================================================

grant select, insert, update, delete on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

grant select, insert, update, delete on table public.roles to authenticated;
grant all on table public.roles to service_role;
