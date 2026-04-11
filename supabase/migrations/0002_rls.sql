-- =====================================================================
-- 0002_rls.sql — Phase 1 row level security
-- =====================================================================

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists profiles_select_all on public.profiles;
create policy profiles_select_all
  on public.profiles
  for select
  using (true);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Inserts only happen via the handle_new_user trigger (security definer),
-- so no INSERT policy is needed for end users.

-- ---------------------------------------------------------------------
-- boards
-- ---------------------------------------------------------------------
alter table public.boards enable row level security;

drop policy if exists boards_select_all on public.boards;
create policy boards_select_all
  on public.boards
  for select
  using (true);

drop policy if exists boards_admin_all on public.boards;
create policy boards_admin_all
  on public.boards
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- courses
-- ---------------------------------------------------------------------
alter table public.courses enable row level security;

drop policy if exists courses_select_all on public.courses;
create policy courses_select_all
  on public.courses
  for select
  using (true);

drop policy if exists courses_admin_all on public.courses;
create policy courses_admin_all
  on public.courses
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- tags
-- ---------------------------------------------------------------------
alter table public.tags enable row level security;

drop policy if exists tags_select_all on public.tags;
create policy tags_select_all
  on public.tags
  for select
  using (true);

drop policy if exists tags_admin_all on public.tags;
create policy tags_admin_all
  on public.tags
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
