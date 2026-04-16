-- =====================================================================
-- 0007_post_view_dedupe.sql
-- Server-side dedupe for post view counts, replacing the ungated RPC
-- that let anon callers inflate view_count freely.
--
-- Retention: post_view_log grows unboundedly. A scheduled job should
-- prune rows with `viewed_on < current_date - interval '7 days'` —
-- e.g. pg_cron `select cron.schedule('prune-views', '0 4 * * *', ...)`.
-- The idx_post_view_log_viewed_on index below supports that sweep.
-- =====================================================================

create table if not exists public.post_view_log (
  post_id    uuid not null references public.posts(id) on delete cascade,
  viewer_key text not null check (char_length(viewer_key) <= 64),
  viewed_on  date not null default current_date,
  primary key (post_id, viewer_key, viewed_on)
);

-- Pruning index. The primary key already covers (post_id, ...) lookups
-- so no secondary post_id index is needed.
create index if not exists idx_post_view_log_viewed_on
  on public.post_view_log(viewed_on);

alter table public.post_view_log enable row level security;
-- No policies: direct reads/writes are denied. The security definer RPC
-- below is the only access path.

create or replace function public.increment_post_view(
  p_post_id uuid,
  p_viewer_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_viewer_key is null or length(p_viewer_key) = 0 then
    return;
  end if;

  insert into public.post_view_log(post_id, viewer_key, viewed_on)
  values (p_post_id, p_viewer_key, current_date)
  on conflict (post_id, viewer_key, viewed_on) do nothing;

  if found then
    update public.posts
    set view_count = view_count + 1
    where id = p_post_id and is_deleted = false;
  end if;
end;
$$;

-- Legacy 1-arg signature must go — PostgREST resolves by arity, so
-- leaving it would let stale callers silently no-op.
drop function if exists public.increment_post_view(uuid);

grant execute on function public.increment_post_view(uuid, text)
  to anon, authenticated;
