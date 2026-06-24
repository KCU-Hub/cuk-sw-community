# Heznpc Archive Operations

## Required Gates

Run these before a production deploy:

```bash
ARCHIVE_OWNER_EMAIL=owner@example.com VERCEL_ENV=production npm run check:production-env
npm run typecheck
npm run lint
npm run test:run
npm run build
npm audit --audit-level=low
```

If Supabase CLI and Docker are available, replay all migrations before deploy:

```bash
npm run db:start
npm run db:reset
npm run types:gen:local
```

`npm run db:start` excludes the local vector service because this app does not
use it and the DB/auth/storage checks do not depend on it.

For a manual Supabase Cloud deploy, apply every file in `supabase/migrations/`
in numeric order through `0022_heznpc_archive_mode.sql`.

## Production Environment

Production must set:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=
ARCHIVE_OWNER_EMAIL=
```

`ARCHIVE_OWNER_EMAIL` is the preferred gate for a personal archive. If it is
missing in production, `ALLOWED_SIGNUP_EMAIL_DOMAINS` can still be used as a
broader fallback, but one of the two must be present or startup fails closed.

## Owner Bootstrap

1. Create the owner account through `/signup` with `ARCHIVE_OWNER_EMAIL`.
2. Promote that profile once in SQL:

```sql
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users where lower(email) = lower('owner@example.com')
);
```

After promotion, writes to posts, comments, blog posts, series, course materials,
and link replacement RPCs are admin/owner-only at the database layer.

## Manual Smoke

- Open `/`, `/blog`, `/courses`, and `/board` while signed out.
- Confirm `/login` and `/signup` describe owner access, not public community signup.
- Sign in as the owner email and confirm `/me`, `/blog/new`, `/board/qna/new`,
  `/courses/{slug}/new`, and `/gpa` are reachable.
- Try an unconfigured email in production-like env and confirm it is rejected.
- Create, edit, and soft-delete a blog post.
- Create, edit, and soft-delete a problem log entry.
- Upload an allowed course file, then confirm the detail page uses a signed URL.
- Try a disallowed file extension and a path whose first segment is not the
  current profile id; both must fail before the row is saved.
