-- ============================================================================
-- journal_articles — replaces TWO disconnected mock sources:
--
--   1. src/data/mock/journal.ts (mockStorage-backed) — what the admin panel
--      (journal.service.ts) actually reads/writes.
--   2. src/data/journal.ts (hardcoded `mockArticles: JournalArticle[] = []`,
--      permanently empty, NOT mockStorage-backed at all) — what the public
--      storefront (/journal, /journal/[slug]) and sitemap.ts read.
--
-- These were two entirely separate arrays with incompatible shapes (the
-- storefront one had no persistence layer whatsoever) — admin-authored
-- articles never reached the public site. One real table now backs both.
-- ============================================================================

create table public.journal_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null,
  excerpt text not null default '',
  content text not null default '',
  featured_image text not null default '',
  gallery text[] not null default '{}',
  category text not null default 'عام',
  tags text[] not null default '{}',
  author text not null default 'Admin',
  reading_time_minutes integer not null default 1,
  status text not null default 'draft',
  is_featured boolean not null default false,
  publish_date timestamptz not null default now(),
  seo jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint journal_articles_slug_unique unique (slug),
  constraint journal_articles_status_valid check (status in ('published', 'draft', 'archived'))
);

create index journal_articles_status_idx on public.journal_articles (status);
create index journal_articles_publish_date_idx on public.journal_articles (publish_date desc);
create index journal_articles_category_idx on public.journal_articles (category);

create trigger set_journal_articles_updated_at
  before update on public.journal_articles
  for each row execute function public.set_updated_at();

alter table public.journal_articles enable row level security;

-- Public: only published articles (storefront /journal, /journal/[slug], sitemap.ts).
create policy "journal_articles_select_public"
  on public.journal_articles for select
  to anon, authenticated
  using (status = 'published');

create policy "journal_articles_select_admin"
  on public.journal_articles for select
  to authenticated
  using (public.is_admin());

create policy "journal_articles_insert_admin"
  on public.journal_articles for insert
  to authenticated
  with check (public.is_admin());

create policy "journal_articles_update_admin"
  on public.journal_articles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "journal_articles_delete_admin"
  on public.journal_articles for delete
  to authenticated
  using (public.is_admin());

drop trigger if exists log_activity on public.journal_articles;
create trigger log_activity
  after insert or update or delete on public.journal_articles
  for each row execute function public.log_entity_activity('مقال', 'system');
