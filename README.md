# Heznpc Archive

Heznpc Archive is a personal learning archive built from the former community
app. It keeps the useful parts: public records, a knowledge index, a problem
log, private learning metrics, and an owner/admin console.

- **Stack**: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4,
  Supabase Auth/Postgres/RLS/Storage.
- **Runtime shape**: no separate backend. Server Actions provide write flows;
  Supabase RLS and SQL triggers are the authority boundary.
- **Operating model**: anonymous readers, owner/admin writers. This is not a
  public community, chat service, or SaaS signup surface.

## What Is Implemented

| Area | Status | Notes |
| --- | --- | --- |
| Public records | Implemented | Markdown blog posts, tags, series, drafts, view-count dedupe, public author pages. |
| Knowledge index | Implemented | Course/topic catalogue, material pages, full-text search, private Supabase Storage uploads with signed download URLs. |
| Problem log | Implemented | Board posts, comments, solved/open state, markdown rendering, soft delete, view/like counters. Writes are owner/admin-only in archive mode. |
| Private metrics | Implemented | Owner-only GPA-style learning rows, 4.5 scale summaries, P/NP handling, excluded rows, projection milestones. |
| Admin console | Implemented | User search, ban/unban RPCs, audit log entries, role-aware server-side access. |
| Security hardening | Implemented | CSP/security headers, sanitized markdown, rate limits, RLS policies, SQL-side course material file-path validation, production admission guard. |
| CI/local gates | Implemented | lint, typecheck, Vitest, production env guard, Next build, Supabase local reset/type generation scripts. |

## Product Boundary

This repo should stay small and boring to maintain:

- Keep it as a personal archive and publishing surface.
- Use GitHub org/repos for shared CS/SW knowledge transfer work.
- Use external chat/community tools for real-time conversation.
- Do not reopen broad public signup unless there is a fresh product decision
  and matching moderation/retention capacity.

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Prepare environment variables

```bash
cp .env.local.example .env.local
```

Fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

For production-like owner gating:

```bash
ARCHIVE_OWNER_EMAIL=owner@example.com
```

`ARCHIVE_OWNER_EMAIL` is preferred. `ALLOWED_SIGNUP_EMAIL_DOMAINS` remains as a
broader fallback for non-personal deployments, but production fails closed when
both are empty.

### 3. Start and reset local Supabase

```bash
npm run db:start
npm run db:reset
```

The local script excludes the vector service because this app does not use it.

### 4. Generate Supabase types after schema changes

```bash
npm run types:gen:local
```

The generated file, `src/lib/types.generated.ts`, is committed to keep schema
drift visible.

### 5. Run the app

```bash
npm run dev
```

Open http://localhost:3000.

## Owner Bootstrap

1. Create the owner account at `/signup` using `ARCHIVE_OWNER_EMAIL`.
2. Promote that profile once:

```sql
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users where lower(email) = lower('owner@example.com')
);
```

After promotion, posts, comments, blog posts, series, course materials, likes,
and link replacement RPCs require archive-writer access at the database layer.

## Verification

Run the main gates before deploy or merge:

```bash
ARCHIVE_OWNER_EMAIL=owner@example.com VERCEL_ENV=production npm run check:production-env
npm run typecheck
npm run lint
npm run test:run
npm run build
npm audit --audit-level=low
```

When SQL changes are involved:

```bash
npm run db:start
npm run db:reset
npm run types:gen:local
```

Manual smoke details live in [docs/archive-operations.md](docs/archive-operations.md).

## Directory Map

```text
heznpc-archive/
├── proxy.ts
├── next.config.ts
├── docs/archive-operations.md
├── supabase/
│   ├── config.toml
│   └── migrations/
└── src/
    ├── actions/
    ├── app/
    ├── components/
    └── lib/
```
