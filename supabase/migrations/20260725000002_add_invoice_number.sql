-- ============================================================================
-- orders.invoice_number — independent, permanent invoice numbering
-- ============================================================================
-- The invoice shown to customers/admins must NOT reuse order_number: invoice
-- numbers are their own sequence (INV-2026-000001, ...) that, once assigned
-- at order creation, never changes even if order_number's own scheme changes
-- later. Mirrors the existing order_number pattern (see
-- 20260714120010_orders.sql's orders_number_seq/generate_order_number) so a
-- new invoice number is stamped once, in a BEFORE INSERT trigger, and never
-- touched again.

create sequence public.invoices_number_seq;

alter table public.orders add column invoice_number text;

create or replace function public.generate_invoice_number()
returns trigger
language plpgsql
as $$
begin
  if new.invoice_number is null then
    new.invoice_number := 'INV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.invoices_number_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

create trigger set_orders_invoice_number
  before insert on public.orders
  for each row execute function public.generate_invoice_number();

-- Backfill any orders that already existed before this migration ran (unique
-- constraint below allows this — Postgres treats each NULL as distinct, so
-- rows are never left ambiguous even if the backfill is skipped).
update public.orders
set invoice_number = 'INV-' || to_char(created_at, 'YYYY') || '-' || lpad(nextval('public.invoices_number_seq')::text, 6, '0')
where invoice_number is null;

alter table public.orders add constraint orders_invoice_number_unique unique (invoice_number);
