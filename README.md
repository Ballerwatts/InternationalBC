# Maccabi Basketball Club Genève — site + admin backend

A self-contained Next.js app for the club: public website (homepage, roster,
calendar, weekly practice board, tactics library) plus a password-protected
admin backend to run all of it — no external CMS, no separate database
service required to get started.

## What's included

- **Homepage** — editable hero text, team photo, announcements, quick facts,
  next practices/games, embedded map to the training venue, top scorers.
- **Admin backend** (`/admin`, behind a password you set on first run):
  - Hero / homepage content editor
  - Announcements (publish / unpublish / delete)
  - Player profiles: photo upload, jersey number, license number, email,
    phone, position, season stats
  - Budget tracker: annual fee split (gym / license / referees), payments
    logged per player, running balance
  - Schedule manager: add practices/games one by one, or auto-generate the
    next 12 weeks of Monday/Thursday practices in one click
  - Weekly practice board: this week's focus + drills, shown on the public
    site and pulled into the Monday reminder email
  - Tactics editor: drag-and-drop half-court diagram tool (see below)
- **Calendar**: every practice/game gets an "Add to calendar" (.ics) button,
  plus a subscribable feed at `/api/calendar.ics` players can add once to
  Google/Apple/Outlook calendar and get automatic updates.
- **Tactics / play-diagram tool**: half-court board with 5 draggable,
  numbered player markers and a ball. Tools for **course/cut** (solid
  arrow), **passe** (dashed arrow), **dribble** (wavy arrow) and **écran**
  (screen — a T-bar), matching standard basketball coaching notation.
  Diagrams save to the database and are viewable (read-only) by the whole
  team on the public `/tactiques` page. Export any diagram as a PNG image.
- **Monday reminder automation**: `/api/cron/weekly-reminder` emails every
  player with a registered address the week's schedule + practice board,
  with an .ics attachment. See "Monday reminder" below to wire it up.

## Tech choices (and why)

- **Next.js 14** (App Router) — one deployable app for both the public site
  and the admin backend.
- **SQLite via Node's built-in `node:sqlite`** — no external database to
  provision, no native binary to download at install time (this matters on
  locked-down CI/build machines). Requires **Node.js 22.5+**. The whole
  club's data (players, schedule, budget, tactics) comfortably fits in a
  single SQLite file.
- **No next/font/Google Fonts dependency** — the build never needs to reach
  fonts.googleapis.com, so it builds reliably on any host, including ones
  with restricted outbound network access during build. Swap in real
  webfonts any time (see `src/app/layout.js`).
- Photos (player photos, team photo) are resized in the browser and stored
  as base64 inside the database — this avoids needing S3/Cloudinary for a
  club this size, and avoids the classic "uploaded file disappeared after
  redeploy" problem you get with serverless filesystems.

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000. The first visit to `/login` lets you set the
admin password (minimum 8 characters) — there's no default password baked
in. The database is created automatically at `data/maccabi.db` with the
confirmed 2026–2027 roster already seeded.

## Deployment

**Important:** because the app uses `node:sqlite` and stores the database
as a plain file, it needs a host that (a) runs Node 22.5+, and (b) gives the
app a **persistent disk** — not a stateless serverless function. Vercel's
default serverless functions are a poor fit for this reason (their
filesystem is read-only/ephemeral at runtime). The straightforward options:

### Option A — Railway (recommended, easiest)

1. Push this folder to a new GitHub repo.
2. On [railway.app](https://railway.app), "New Project" → "Deploy from GitHub repo".
3. Add a **Volume** (Railway dashboard → your service → Settings → Volumes),
   mount it at `/data`.
4. Set environment variables (see `.env.example`): `SESSION_SECRET`,
   `DATABASE_PATH=/data/maccabi.db`, `RESEND_API_KEY`, `FROM_EMAIL`,
   `CLUB_EMAIL`, `CRON_SECRET`.
5. Railway auto-detects Next.js, runs `npm install && npm run build`, then
   `npm start`. Done — you'll get a `*.up.railway.app` URL (attach your own
   domain under Settings → Networking any time).
6. Railway also has a built-in Cron plugin — use it to hit
   `/api/cron/weekly-reminder` every Monday morning (see below).

### Option B — Render

Same idea: a "Web Service" (not a static site) with a persistent disk
mounted at, say, `/data`, `DATABASE_PATH=/data/maccabi.db`, Node 22 runtime,
build command `npm install && npm run build`, start command `npm start`.
Render's "Cron Jobs" feature can hit the reminder endpoint on schedule.

### Option C — Vercel (possible, but more setup)

Vercel works if you swap SQLite for a hosted Postgres (Neon/Supabase both
have a generous free tier) — this requires rewriting `src/lib/db.js`'s
query layer, which is intentionally kept tiny and isolated so that swap is
contained to one file. Photos would need to move to Vercel Blob or another
object store rather than base64-in-DB once past a small scale, to stay
under request-size limits. Ask if you'd like this variant built out.

## Setting the admin password

Visit `/login` — the first submission there sets the password (nobody else
can set it once it exists; there's no "forgot password" flow yet, so if you
lose it, an operator with server/database access can clear the
`admin_password_hash` row in the `settings` table to allow a new one to be set).

## Adding real player data

The 11 confirmed players from your squad list are seeded with games played /
total points / points-per-game, but **jersey number, license number, email,
phone, and photo are intentionally left blank** — the stats sheet you sent
didn't include them. Fill these in from `/admin/players` (click a player row
to expand the edit form). The one player from your original list who wasn't
in your final confirmation ("Williams Matthew") was left out — add him back
the same way if that was an oversight.

## Monday reminder automation

`GET or POST /api/cron/weekly-reminder` (optionally protected by
`CRON_SECRET` as a `?secret=` query param or `Authorization: Bearer` header)
emails everyone with a saved address the current week's practice-board
focus/drills plus the week's practices/games, with an .ics attachment.

To fire it automatically every Monday morning, pick one:

- **Railway/Render native cron** (see deployment steps above) — the
  cleanest option since it lives next to the app.
- **A free external pinger** like [cron-job.org](https://cron-job.org) hitting
  `https://your-domain/api/cron/weekly-reminder?secret=YOUR_CRON_SECRET`
  every Monday at 08:00 Europe/Zurich.
- **Ask Claude to do it for you**: once the site is deployed and players
  have real email addresses on file, Claude (this assistant) can set up a
  weekly scheduled task that calls this endpoint (or emails players
  directly via a connected Gmail account) every Monday morning — just ask
  in a new message once those two things are in place. This wasn't set up
  automatically in this session because there were no player emails yet to
  send to.

No email provider is configured by default — until `RESEND_API_KEY` is set,
the app logs "would send email" to the server console instead of actually
sending, so nothing breaks in local development.

## Brand assets

`public/logo.svg` / `public/logo.png` / `public/favicon.svg` /
`src/app/favicon.ico` were generated for this project — Star of David badge
in the club's blue/yellow, adapted from Maccabi Tel Aviv B.C.'s look. Colors
are defined once in `src/app/globals.css`:

- Blue `#2371B5` — Pantone/PMS 660 C
- Yellow `#FFF100` — Pantone/PMS 3945 C

See the separate brand guide delivered alongside this project for the full
palette, uniform Pantone references, and logo usage notes.

## Project structure

```
src/
  app/                    Pages (App Router) + API routes under app/api/*
  components/             Shared React components (Header, CourtDiagramEditor, ...)
  lib/
    db.js                  SQLite schema, seed data, query helpers
    auth.js                Admin session cookie (JWT via jose) + password hashing
    ics.js                 Calendar (.ics) generation
    email.js               Resend-based email sending (dev no-op fallback)
    image-client.js        Client-side photo resize before upload
```
