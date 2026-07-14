-- ============================================================================
-- Extensions & shared helpers
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

-- Generic "touch updated_at" trigger function, reused by every table below.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
