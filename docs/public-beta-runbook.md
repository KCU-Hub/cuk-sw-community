# Public Beta Runbook

## Required Gates

Run these before a public beta deploy:

```bash
npm run check:production-env
npm run typecheck
npm run lint
npm run test:run
npm run build
npm audit --audit-level=low
```

If Supabase CLI and Docker are available, replay all migrations before deploy:

```bash
npm run db:reset
npm run types:gen:local
```

Commit `src/lib/types.generated.ts` after type generation when a real Supabase
schema is available.

## Production Environment

Production must set:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=
ALLOWED_SIGNUP_EMAIL_DOMAINS=
```

`ALLOWED_SIGNUP_EMAIL_DOMAINS` must not be empty in production. The app fails
closed for email/password and OAuth callback admission when the allowlist is
missing.

## Manual Smoke

- Sign up with an allowed email domain.
- Try sign up and OAuth callback with a non-allowed domain.
- Create, edit, delete a Q&A post linked to a course.
- Add and delete a comment; confirm board list counts update.
- Toggle like; confirm board list counts update.
- Upload a course file; confirm the detail page uses a signed URL.
- Try uploading a disallowed file type and a file larger than 20 MB.
- Ban a user, confirm write actions are denied, then unban.
- Confirm `/admin/users` shows recent audit actions.
