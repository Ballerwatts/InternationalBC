# International Basketball Club Genève — site + admin backend

A self-contained Next.js app for the club: public website (homepage, roster,
calendar, weekly practice board, tactics library) plus a password-protected
admin backend to run all of it — no external CMS, no separate database
service required to get started.

## What's included

- **Homepage** — editable hero text, team photo, announcements, quick facts,
  next practices/games, embedded map to the training venue, top scorers.
- **Individual logins for everyone** (see "Accounts & permissions" below) —
  admins get the full backend; players get their own account limited to the
  tactics editor and the practice board.
- **Admin backend** (`/admin`, admin accounts only):
  - Hero / homepage content editor
  - Announcements (publish / unpublish / delete)
  - Player profiles: photo upload, jersey number, license number, email,
    phone, position, season stats
  - Budget tracker: annual fee split (gym / license / referees), payments
    logged per player, running balance
  - Schedule manager: add practices/games one by one, or auto-generate the
    next 12 weeks of Monday/Thursday practices in one click
  - Player accounts manager (`/admin/users`) — create a login for each
    player directly, link it to their profile, reset passwords,
    promote/demote roles, deactivate or delete accounts — and approve or
    reject pending self-service access requests (see "Signup & access
    requests" below)
  - Presence headcount (`/admin/presences`) — for each upcoming
    practice/game, who has marked themselves in, who's out, and who hasn't
    responded yet
- **Team space** (`/team`, any logged-in account — admin or player):
  - Weekly practice board: this week's focus + drills, shown on the public
    site and pulled into the Monday reminder email
  - Tactics editor (see below) — every player can create and edit plays,
    not just admins. **Not public** — only visible to logged-in accounts.
  - Presences (`/team/presences`) — a personal "I'll be there / I'm out"
    mark for each upcoming practice/game
  - My availability (`/team/disponibilites`) — for longer absence windows
    (travel, injury), distinct from the per-practice presence mark above
- **Calendar**: every practice/game gets an "Add to calendar" (.ics) button,
  plus a subscribable feed at `/api/calendar.ics` players can add once to
  Google/Apple/Outlook calendar and get automatic updates.
- **Tactics / play-diagram tool**: a multi-phase, animated play editor —
  see "Tactics editor" below for the full feature set. Team-only, not on
  the public site.
- **Monday reminder automation**: `/api/cron/weekly-reminder` emails (and,
  if configured, WhatsApp-messages) every player with a registered
  email/phone the week's schedule + practice board. See "Monday reminder"
  below to wire it up.
- **Signup & access requests**: anyone can request an account from
  `/login`; a super-admin approves or rejects each request from
  `/admin/users` before any login is created. See "Signup & access
  requests" below.

## Accounts & permissions

There are two roles:

- **admin** — everything: hero/homepage, announcements, player profiles,
  budget, schedule, player-account management, *and* the team space
  (tactics + practice board).
- **player** — only the team space: the tactics editor and the practice
  board. Players cannot see or edit the budget, player profiles, homepage
  content, or the schedule.

The very first visit to `/login` creates the first **admin** account (name,
email, password — no default credentials are baked in). After that, an
account can come from two paths — see "Signup & access requests" below —
but in both cases nothing is created without an admin's say-so. Players log
in at the same `/login` page and land on `/team` instead of `/admin`.

## Signup & access requests

There are two ways someone ends up with a login, and both require a
super-admin's approval before the account exists:

1. **Admin creates it directly** — from `/admin/users`, "+ Créer un
   compte": name, email, an initial password you choose, optionally linked
   to an existing player profile. Instant, no approval step needed since
   the admin already vetted the person.
2. **Self-service request** — anyone visiting `/login` can click "Demander
   un accès" and submit their name, email, and an optional message. This
   lands in a **pending queue** on `/admin/users` ("Demandes en attente").
   A super-admin clicks **Accepter** to approve (this creates the login
   with a random temporary password, emailed to the requester if SMTP is
   configured — otherwise it's shown once in the admin UI so you can share
   it yourself) or **Refuser** to reject.

## Tactics editor

The play-diagram tool now matches the feature set of a full coaching-board
app, not just a single static diagram:

- **Phases** — a play can have multiple phases/frames (e.g. "phase 1: entry
  pass", "phase 2: screen and roll"). Add, duplicate, rename, reorder by
  navigating, or delete phases from the phase strip above the court.
- **Animated playback** — hit ▶ to watch the play move from phase to phase,
  at 0.5×/1×/1.5×/2× speed. The ball follows a slight curved arc between
  phases (like a real pass), players move in straight lines.
- **Up to 5 defenders** — add red "X" defenders anywhere on the court.
  **Auto screen orientation**: drag an offensive player and drop them next
  to a defender, and a correctly-oriented screen glyph (line + perpendicular
  bar) is drawn automatically — no manual angle work needed. The manual
  "Écran" tool is still there for precise placement.
- **Half-court / full-court toggle** — switch the board for plays that cover
  the whole floor (inbounds plays, presses, transition offense).
- **Drawing tools**: course/cut (solid arrow), passe (dashed arrow), dribble
  (wavy arrow), écran (screen), and erase — standard basketball coaching
  notation.
- **Exports**: PNG of the current phase, a print-ready PDF gridsheet with
  every phase (opens the browser print dialog — choose "Save as PDF"), and
  JSON export/import so a play can be backed up or moved between deployments.
- Diagrams save to the database and are viewable (with full phase
  navigation and playback) by the whole team, logged in or not, on the
  public `/tactiques` page.

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
in. The database is created automatically at `data/ibc.db` with the
confirmed 2026–2027 roster already seeded.

## Deployment

**Important:** because the app uses `node:sqlite` and stores the database
as a plain file, it needs a host that (a) runs Node 22.5+, and (b) gives the
app a **persistent disk** — not a stateless serverless function. Vercel's
default serverless functions are a poor fit for this reason (their
filesystem is read-only/ephemeral at runtime). The straightforward options:

Prices below were checked in July 2026 and are usage-based, so treat them as
estimates — always check the platform's current pricing page.

### Option A — Fly.io (cheapest: ~USD 2–4 / month total)

A `Dockerfile` and `fly.toml` are already included, pre-configured for this
app (Node 22, `/data` volume, always-on so there's no cold-start delay for
visitors). From this folder, with the [flyctl CLI](https://fly.io/docs/flyctl/install/) installed and `fly auth login` done:

```bash
fly launch --no-deploy         # detects fly.toml, may ask you to rename the app if taken
fly volumes create ibc_data --size 1 --region cdg
fly secrets set SESSION_SECRET=$(openssl rand -base64 32)
fly secrets set CRON_SECRET=$(openssl rand -hex 16)
# optional, for the Monday reminder — skip for now and add later:
fly secrets set SMTP_HOST=... SMTP_PORT=587 SMTP_USER=... SMTP_PASS=... FROM_EMAIL="International Basketball Club Genève <...>" CLUB_EMAIL=...
fly secrets set TWILIO_ACCOUNT_SID=... TWILIO_AUTH_TOKEN=... TWILIO_WHATSAPP_FROM=whatsapp:+...
fly deploy
```

That's it — you'll get a free `https://<your-app>.fly.dev` URL immediately
(no domain purchase needed to try it live). Smallest machine + 1 GB volume
runs roughly **$2–2.50/month**; add a `.ch` domain later (~CHF 15/year,
~CHF 1.25/month) once you're happy with it, by pointing its DNS at Fly
(`fly certs add yourdomain.ch`).

### Option B — Render (simplest dashboard, ~USD 7 / month)

No command line needed, but no real free tier for this app (Render's free
Web Service tier doesn't support persistent disks, so the database
wouldn't survive a restart). A "Web Service" (not a static site) on the
**Starter** plan ($7/mo) with a persistent disk mounted at `/data`,
`DATABASE_PATH=/data/ibc.db`, Node 22 runtime, build command
`npm install && npm run build`, start command `npm start`. Render's "Cron
Jobs" feature can hit the reminder endpoint on schedule.

### Option C — Railway (~USD 5–10 / month)

Similar workflow to Render — connect the GitHub repo, add a Volume mounted
at `/data`, set the same environment variables, done. No longer has a real
free tier (new accounts get a one-time $5 trial credit only), and tends to
land around $5–10/month for even a tiny always-on app, so it's the priciest
of the three here — pick it only if you specifically want its dashboard/DX.

### Option D — Vercel (possible, but more setup)

Vercel works if you swap SQLite for a hosted Postgres (Neon/Supabase both
have a generous free tier) — this requires rewriting `src/lib/db.js`'s
query layer, which is intentionally kept tiny and isolated so that swap is
contained to one file. Photos would need to move to Vercel Blob or another
object store rather than base64-in-DB once past a small scale, to stay
under request-size limits. Ask if you'd like this variant built out.

## Setting up the first admin account

Visit `/login` — the first submission there creates the first admin account
(name, email, password). Every account after that — admin or player — is
created from `/admin/users` by an existing admin; see "Accounts &
permissions" above. There's no self-service "forgot password" flow yet: an
admin can reset anyone's password from `/admin/users`, or if the only admin
account is locked out, an operator with server/database access can delete
the relevant row from the `users` table and go through the first-run setup
again.

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
notifies everyone with a saved email and/or phone number with the current
week's practice-board focus/drills plus the week's practices/games —
by email (with an .ics attachment) and, if a phone number is on file and
WhatsApp is configured, by WhatsApp too.

To fire it automatically every Monday morning, pick one:

- **A Fly.io scheduled machine** or **a free external pinger** like
  [cron-job.org](https://cron-job.org) hitting
  `https://your-domain/api/cron/weekly-reminder?secret=YOUR_CRON_SECRET`
  every Monday at 08:00 Europe/Zurich.
- **Ask Claude to do it for you**: once the site is deployed and players
  have real email addresses/phone numbers on file, Claude (this assistant)
  can set up a weekly scheduled task that calls this endpoint every Monday
  morning — just ask in a new message once those are in place.

### Email (SMTP)

No email provider is configured by default — until `SMTP_HOST` is set, the
app logs "would send email" to the server console instead of actually
sending, so nothing breaks in local development. Any SMTP mailbox works:
Gmail (create an "app password" under your Google Account security
settings — your normal password won't work), Infomaniak, your own domain's
mail provider, etc. Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`,
`FROM_EMAIL` — see `.env.example`.

### WhatsApp reminders (optional)

To also send the weekly reminder over WhatsApp, sign up at
[twilio.com](https://www.twilio.com), enable the WhatsApp sandbox (free,
good for testing with a handful of numbers that join the sandbox) or apply
for an approved WhatsApp Business sender (for sending to the whole team
without them opting in first), and set `TWILIO_ACCOUNT_SID`,
`TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` — see `.env.example`. Players
need a phone number on file (`/admin/players`, in international format,
e.g. `+41791234567`) to receive WhatsApp reminders. Leave these unset to
skip WhatsApp entirely — the app runs fine with email-only reminders.

## Brand assets

`public/logo.png` and `src/app/favicon.ico` are the club's crest (laurel
wreath + Geneva coat of arms, monochrome blue on white).

The color palette was derived by sampling the crest directly (dominant
pixel color `#2D3194`). Closest standard spot color is approximately
**Pantone 2143 C** (deep indigo-blue) — this is a screen-sampled
approximation, not a certified match; get it confirmed against a physical
Pantone guide before ordering anything printed (jerseys, banners, etc).
Colors are defined once in `src/app/globals.css`:

- `--ibc-blue` `#2D3194` — primary, sampled from the crest (≈ PMS 2143 C)
- `--ibc-blue-dark` `#191C5C` — darker shade, used for dark backgrounds (footer, hero panels)
- `--ibc-accent` `#4C56D6` — lighter tint of the primary, used for CTAs/highlights
- `--ibc-accent-deep` `#363FB0` — deeper shade of the accent, for hover states

## Project structure

```
src/
  app/                    Pages (App Router) + API routes under app/api/*
                          admin/  — admin-only pages
                          team/   — tactics + practice board, any logged-in account
  components/             Shared React components (Header, CourtDiagramEditor, ...)
  lib/
    db.js                  SQLite schema, seed data, query helpers
    auth.js                Session cookie (JWT via jose) + password hashing, per-user role
    api-auth.js             requireAdmin() / requireUser() guards for API routes
    ics.js                 Calendar (.ics) generation
    email.js               SMTP email sending via nodemailer (dev no-op fallback)
    whatsapp.js             WhatsApp sending via Twilio (dev no-op fallback)
    image-client.js        Client-side photo resize before upload
```
