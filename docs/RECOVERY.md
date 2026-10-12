# Running this project from a fresh clone

What a clone contains, what it does not, and how to get from `git clone` to a
running site. The private half — the real environment values — lives outside
this repository, in `~/ProjectBackups/tourismproj/` (Windows:
`%USERPROFILE%\ProjectBackups\tourismproj\`), and must never be committed.

## Quick start

```bash
git clone --depth 1 https://github.com/ashutoshsharma1309/tourismproj.git
cd tourismproj
corepack enable && corepack prepare pnpm@10.33.2 --activate   # if pnpm is missing
pnpm install --frozen-lockfile
cp ~/ProjectBackups/tourismproj/project-recovery.env .env.local   # or fill .env.example in
pnpm dev                                                      # localhost:3000
```

With the backup kit present, one command does all of it:

```bash
bash ~/ProjectBackups/tourismproj/restore-project.sh ~/Desktop/tourismproj
```

`--depth 1` clones in about 1.2 GB; the full history is around 3.3 GB because
the archive's photographs and audio are tracked (deliberately — they are the
project's substance, and Vercel needs them at build time).

## Runtimes

Node 20 or newer (built on 22.20.0, pinned in `.nvmrc`), pnpm 10.33.2 from the
lockfile. No Python, Docker, Selenium, Git LFS or submodules. Playwright is a
dev dependency; its browsers install separately and only the QA suites need
them:

```bash
pnpm exec playwright install chromium
```

## What a clone does and does not contain

**Included:** all source, `src/data` (the archive as typed data),
`public/images` (1,306 credited photographs), `public/audio` (180 recorded
guides across 12 languages), `drizzle/sql` (hand-written SQL), every QA suite,
the docs.

**Not included, and intentionally so:** `.env.local` (secrets — restore from
the backup), `.data/` (pipeline inputs and curation proposals — restore from
the backup, or let the pipelines re-fetch), `node_modules`, `.next`,
`reports/qa`, `reports/visual`, `voice-benchmark` renders. All of those are
either private or regenerated.

**Not included anywhere:** the database rows. The schema is here; the contents
are in Supabase.

## Without any configuration

The site still runs. The archive is typed data, so destinations, stories,
culture, history and the map all render from a bare clone. What switches off,
and says so on the page rather than failing: accounts, the partner workspace,
bookings, the government console (all need `DATABASE_URL`), and the Guide's AI
wording, translation, voice input, road distances and weather.

`/api/health/accounts` reports which settings a deployment can see —
true/false per setting plus whether Supabase answers, never a value.

## Environment variables

`.env.example` lists every one with its purpose and where to get it. The
essentials are `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL` (or it
is derived from `DATABASE_URL`), the publishable key, and
`SUPABASE_SERVICE_ROLE_KEY`.

## Database

Against an existing Supabase project, nothing is needed: the schema is already
there. For a brand-new project:

```bash
pnpm db:push         # tables from src/db/schema/*.ts
pnpm db:constraints  # triggers, check constraints, row-level security
pnpm db:seed         # idempotent demo data
```

Then, in Supabase → Authentication → URL Configuration, set the Site URL to
the deployment address and add `<site>/auth/callback` to Redirect URLs.

`pnpm db:push` rewrites the schema it manages. Never aim it at a database whose
rows matter without reading the diff first.

## Deployment

Vercel builds `main`. The working branch is `v2-saas-deploy`, which pushes to
the remote branch `v2-saas` and does **not** deploy:

```bash
git push origin v2-saas-deploy:v2-saas          # safe, no deploy
git fetch origin                                 # release:
git checkout -b deploy-main origin/main
git merge origin/v2-saas -m "Merge v2-saas"
git push origin deploy-main:main                 # Vercel deploys
git checkout v2-saas-deploy && git branch -D deploy-main
```

`NEXT_PUBLIC_*` values are compiled in at build time, so a deployment must be
rebuilt after one changes. Leave `NEXT_PUBLIC_SITE_URL` unset on Vercel: the
deployment's own URL is used, and a copied `localhost` value is ignored there.

## Checks

```bash
pnpm typecheck && pnpm lint
pnpm qa:accounts         # login, sessions, account data (needs a server)
pnpm qa:partners         # partner workspace and reviews
pnpm qa:guide-assistant  # the Guide
pnpm qa:final            # the whole fleet
```
