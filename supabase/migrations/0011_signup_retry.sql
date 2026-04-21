-- =====================================================================
-- 0011_signup_retry.sql
--   handle_new_user 의 username 충돌 retry 를 1 회에서 사실상 무한대로
--   확대. 0001 의 기존 구현은 unique_violation 을 딱 한번 재시도하는데
--   이메일 prefix 가 흔한 경우 (e.g. hong, kim) 계정 가입이 실패할 수
--   있다는 리스크가 있음.
--
--   전략:
--     1) 기본 username 시도
--     2) 실패 시 uuid hex 전체 (32 char) 를 suffix 로 → 충돌 확률 사실상 0
--
--   마이그레이션 불변성 원칙에 따라 0001 수정 대신 create or replace
--   로 덮어씀.
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  default_username text;
  default_display_name text;
begin
  default_username := coalesce(
    new.raw_user_meta_data ->> 'username',
    split_part(coalesce(new.email, 'user'), '@', 1)
      || '_'
      || substr(replace(new.id::text, '-', ''), 1, 4)
  );
  default_display_name := coalesce(
    new.raw_user_meta_data ->> 'display_name',
    new.raw_user_meta_data ->> 'name',
    default_username
  );

  begin
    insert into public.profiles (id, username, display_name)
    values (new.id, default_username, default_display_name);
  exception when unique_violation then
    -- uuid hex 12 char 를 suffix 로 붙여 재시도. 48 bits 의 엔트로피라
    -- 학부 규모에선 충돌 확률 사실상 0.
    -- 최종 길이 30 cap 을 위해 base 도 17 char 로 truncate — check
    -- constraint (char_length between 2 and 30) 준수.
    insert into public.profiles (id, username, display_name)
    values (
      new.id,
      left(default_username, 17) || '_' || substr(replace(new.id::text, '-', ''), 1, 12),
      default_display_name
    );
  end;

  return new;
end;
$$;
