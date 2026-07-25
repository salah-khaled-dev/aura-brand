-- Diagnostic: lists table-level grants AND RLS policies side by side for the
-- Phase A tables, so a "permission denied" (missing GRANT) can be told apart
-- from an RLS policy gap at a glance. Run in the Supabase SQL editor.
--
-- Two result sets are unioned:
--   kind = 'grant'  -> from information_schema.role_table_grants
--   kind = 'policy' -> from pg_policies (policy_name populated, grantee/privilege_type derived from roles/cmd)
--
-- If a table you expect to be readable/writable has RLS enabled (rowsecurity
-- = true, see the second query below) but is missing a 'grant' row for the
-- relevant grantee/privilege, that's the "permission denied for table X"
-- failure mode — RLS is never reached because Postgres rejects the query at
-- the grant layer first.

select
  'grant'::text as kind,
  g.table_name,
  g.grantee,
  g.privilege_type,
  null::text as policy_name
from information_schema.role_table_grants g
where g.table_schema = 'public'
  and g.table_name in ('products', 'product_images', 'product_variants', 'categories', 'media')
  and g.grantee in ('anon', 'authenticated', 'service_role')

union all

select
  'policy'::text as kind,
  p.tablename as table_name,
  array_to_string(p.roles, ',') as grantee,
  p.cmd as privilege_type,
  p.policyname as policy_name
from pg_policies p
where p.schemaname = 'public'
  and p.tablename in ('products', 'product_images', 'product_variants', 'categories', 'media')

order by table_name, kind, grantee, privilege_type;

-- Companion check: confirm RLS is actually enabled on each table (a table
-- can have perfect policies and grants and still be wide open if RLS itself
-- was never turned on).
select relname as table_name, relrowsecurity as rls_enabled, relforcerowsecurity as rls_forced
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in ('products', 'product_images', 'product_variants', 'categories', 'media')
order by relname;
