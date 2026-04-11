-- =====================================================================
-- 0003_seed.sql — Initial reference data
-- =====================================================================

insert into public.boards (slug, name, description, sort_order) values
  ('free',   '자유게시판', '자유롭게 이야기 나누는 공간',     1),
  ('qna',    '질문게시판', '공부하다 막힐 때 질문해보세요',   2),
  ('notice', '공지사항',   '학부 및 커뮤니티 공지',           3)
on conflict (slug) do nothing;

insert into public.courses (slug, name, code, semester_hint, sort_order) values
  ('java',                 '자바 프로그래밍',     'SW101', '1학년 1학기',  1),
  ('data-structure',       '자료구조',            'SW201', '1학년 2학기',  2),
  ('algorithm',            '알고리즘',            'SW202', '2학년 1학기',  3),
  ('database',             '데이터베이스',        'SW203', '2학년 1학기',  4),
  ('operating-system',     '운영체제',            'SW301', '2학년 2학기',  5),
  ('computer-network',     '컴퓨터네트워크',      'SW302', '2학년 2학기',  6),
  ('web-programming',      '웹프로그래밍',        'SW303', '3학년 1학기',  7),
  ('mobile-programming',   '모바일프로그래밍',    'SW304', '3학년 2학기',  8),
  ('software-engineering', '소프트웨어공학',      'SW401', '3학년 2학기',  9),
  ('ai-basics',            '인공지능개론',        'SW402', '4학년 1학기', 10)
on conflict (slug) do nothing;

insert into public.tags (slug, name) values
  ('java',       'Java'),
  ('python',     'Python'),
  ('javascript', 'JavaScript'),
  ('typescript', 'TypeScript'),
  ('algorithm',  '알고리즘'),
  ('tips',       '꿀팁'),
  ('assignment', '과제'),
  ('exam',       '시험')
on conflict (slug) do nothing;
