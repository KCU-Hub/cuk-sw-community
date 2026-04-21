-- =====================================================================
-- 0010_function_search_path.sql
--   0006 의 comment_depth / enforce_comment_depth_cap 함수에
--   `set search_path = public` 고정.
--
--   security definer 가 아니라 search_path 하이재킹 위험은 낮지만,
--   0001 의 handle_new_user / is_admin 이 이미 search_path 를 고정한
--   것과 일관성을 맞춤. 또한 stable 함수의 plan 캐시 안정성에 기여.
--
--   마이그레이션 불변성 원칙에 따라 0006 을 수정하지 않고 create or
--   replace 로 덮어씀. 본문은 0006 과 동일.
-- =====================================================================

create or replace function public.comment_depth(p_comment_id uuid)
returns integer
language plpgsql
stable
set search_path = public
as $$
declare
  d integer := 0;
  current_id uuid := p_comment_id;
  parent uuid;
begin
  for i in 1..8 loop
    select parent_id into parent
    from public.comments
    where id = current_id;
    if parent is null then
      return d;
    end if;
    d := d + 1;
    current_id := parent;
  end loop;
  return d;
end;
$$;

create or replace function public.enforce_comment_depth_cap()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_depth integer;
begin
  if new.parent_id is null then
    return new;
  end if;
  parent_depth := public.comment_depth(new.parent_id);
  if parent_depth >= 3 then
    raise exception 'comment reply depth exceeds cap (3)' using errcode = '23514';
  end if;
  return new;
end;
$$;
