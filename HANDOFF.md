# IBBC platform — handoff brief

Context for Claude Code picking this repo up. Everything below is **already
written to disk and builds clean**; none of it is deployed yet.

- Repo: `ibc_clean/` (currently lives under a Google Drive folder — see
  "Known annoyances")
- Stack: Next.js 14.2.35 App Router, Node ≥22.5, `node:sqlite` (no native
  addon), Tailwind v4, deployed to Fly.io as app `internationalbc`
- Deploy: `npm run build && fly deploy`. Schema changes apply themselves on
  boot (`CREATE TABLE IF NOT EXISTS` + `addColumnIfMissing` in
  `src/lib/db.js`); there is no migration command.
- Last commit is `f536a73`; **~92 files are uncommitted** — three rounds of
  work from 18–19 Aug 2026, described below. Nothing has been committed
  since, so `git diff` is the full picture.

---

## 1. The admin panel is grouped into four sections

`src/lib/admin-areas.js` is the **single source of truth** for the sidebar:
group order, labels, and which page belongs where. Add a new admin page
there, not in the sidebar component.

| Group | Pages |
|---|---|
| Marketing | Hero, Announcements, Sponsors, Gym, Teams, Social & Instagram |
| Organisation | Members, Calendar, Accounts |
| Season planning | Availability, Tactics, Practice board, Match register, Team calendar (all `/team/*`) |
| Finance | Budget |

### Per-user permissions

New column `users.admin_areas`, a comma-separated list (`"marketing,finance"`).

- `role = 'admin'` (super-admin) passes every check and stores `NULL` areas.
  Promoting to admin clears the list, so demoting later can't resurrect
  stale grants.
- Anyone else reaches `/admin` only if they hold ≥1 area.
- **Two screens are never delegated**: `/admin/users` (whoever edits
  accounts could grant themselves everything) and `/admin/social` (injects a
  third-party script into the public site). Both use `superAdminLayout()`.

Three layers, all needed:

1. `src/lib/admin-areas.js` — pure helpers. **Must never import `db.js`**;
   it is pulled into client components. A `"use client"` page importing from
   a module that touches `node:sqlite` drags SQLite into the browser bundle
   and the build fails.
2. `src/lib/access.js` — `getAccount()` / `requireArea(...areas)`. Reads
   areas **from the database on every request**, not from the session JWT:
   the cookie lasts 30 days, so a baked-in grant would survive revocation
   for a month. Returns `null` for a deactivated account, so deactivating
   locks someone out immediately.
3. `src/lib/area-guard.js` — `areaLayout("marketing")`. Most `/admin/*`
   pages are `"use client"` and can't run a server check, so each section
   folder has a 4-line `layout.js` that guards it. That's why every admin
   subfolder now has one.

API routes moved from `requireAdmin()` to `requireArea(...)`.
**`/api/settings` accepts marketing OR finance** — the budget screen writes
its targets into `settings` too. Easy to forget; tightening it to marketing
alone breaks the treasurer's page.

---

## 2. Socials + Instagram

- `src/lib/socials.js` — the four networks with each brand glyph as a single
  inline SVG path. Nothing fetched at runtime.
- `src/components/SocialLinks.js` — footer row. **A network with no URL
  still renders its logo**, greyed and non-clickable, and becomes a real
  link once a URL is set in Marketing → Social & Instagram. Deliberate.
- Instagram gallery: hand-picked posts rendered by Instagram's own
  `embed.js`. **No Meta app, no token, nothing that expires.** The
  `instagram_posts` table stores only a permalink;
  `src/lib/instagram.js#normalizeInstagramUrl()` canonicalises share URLs,
  reels, `/tv/` and bare shortcodes before storing, which is what makes the
  duplicate check work. `src/components/InstagramGallery.js` renders a
  `<blockquote>` that degrades to a working link if scripts are blocked.
- Root `layout.js` is now `force-dynamic` because the footer reads social
  URLs out of `settings`; without it the layout is statically generated and
  a pasted URL only appears after the next deploy.
- Side fix: **`.input` was never defined.** Every `className="input"` field
  across `/admin` rendered as bare text because Tailwind preflight strips
  the browser's default border. Now defined once in `globals.css`.

---

## 3. Availability + Team calendar are one board

`src/components/AvailabilityBoard.js` **is** both `/team/availability` and
`/team/calendar` — those pages are four-line wrappers differing only in
title, intro and whether season totals show. That is the answer to "keep
them in sync": there is no sync step because there is one component and one
set of endpoints. **Do not reintroduce a second implementation.**

Layout, top to bottom:

1. **Déclarer une absence** — folded until clicked, pinned above everything
   on both routes. Staff pick a player; a player declares for themselves.
2. **The squad's live declarations** — name · dates · inclusive day count ·
   reason · note.
3. **Sessions** — click one to unfold the roster: name, jersey, Présent /
   Absent / Sans réponse, plus an `✈ absent déclaré — reason · note` tag.
   Staff set anyone's mark inline; a player sets their own. Each card also
   carries a "Ma réponse" row so a player needn't unfold to answer.

Redirects into `/team/availability` (**do not rebuild any of these**):
`/admin/availability`, `/admin/presences`, `/admin/disponibilites`,
`/team/disponibilites`, `/team/presences`.

### Declared absences write real Absent marks

`src/lib/absences.js`. A declaration writes an actual `practice_rsvp` row
with status `out` on every session it covers.

**The contract that makes it safe is `practice_rsvp.availability_id`:**

- set → the mark came from a declaration, may be withdrawn automatically
- `NULL` → a human clicked it; cleanup must never touch it

`POST /api/rsvp` sets it to `NULL` on every hand-set mark, so "I declared I
was away, then said I'd make Thursday" survives deleting the travel entry.
Deleting a declaration calls `clearAbsenceWindow()`, which only removes
stamped rows.

Applied at four points, all of which matter:

- `POST /api/availability` — returns `marked`, the count, surfaced in the UI
- `POST /api/practices` + the weekly generator — a session added inside an
  existing window
- `POST /api/practices/import` — the case that matters most, since fixtures
  land months ahead
- `PUT /api/practices/[id]` — `applyAbsencesToPractice()` is a full re-sync,
  so moving a game **out** of a holiday un-marks them too

### Visibility inside a squad

The club chose an open squad board over privacy between team-mates:

- `/api/availability` GET — any member sees their **own squad's**
  declarations including name, reason and note. Another squad sees nothing.
  Delete/edit is still owner-or-staff only.
- `/api/team/roster` — `requireStaff` → `requireUser`, pinned to the
  caller's own `team_id` (only an admin may pass another).
- `/api/rsvp` GET — a player gets their whole squad's marks; `note` and
  `marked_by` are still not selected.
- `/api/auth/status` now returns `player_id`, read live from the users table
  rather than the token.

**Consequence:** `/api/rsvp` no longer returns only "my" rows to a player,
so any client reading "my mark" must filter by the id from
`/api/auth/status`.

---

## 4. Season planning is open to players; tactics are per-squad

`TeamNav` shows the same five entries to everyone. The difference is
editing, not visibility — `/team/appel` and `/team/practice-board` render
read-only for a player, and every write is refused server-side regardless.

### Tactics access rules

| role | sees | can do |
|---|---|---|
| player | own squad's **published** plays | view + animate only |
| coach | own squad's plays incl. drafts | full edit within their squad |
| admin | one squad at a time via a **team picker** | everything, for the squad selected |

The admin team picker is deliberate: one list mixing four squads is how a
U18 set ends up on the women's board.

**Security hole that was there:** `/api/plays/[id]` PUT and DELETE only
checked `requireUser()` — any logged-in player of any squad could edit or
delete any other squad's plays by guessing an id, and `POST /api/plays` was
open to players too. Now `canWrite()` (admin anywhere, coach only inside
their own squad, players never) guards PUT/DELETE, `canRead()` guards GET,
and POST is `requireStaff()`. **If similar id-addressable routes turn up
elsewhere, check them the same way — `requireUser()` alone means "any member
of any squad".**

---

## 5. Newsletter & the email log

A weekly HTML email, **segmented by squad**, assembled automatically as a
draft that an admin reviews and sends. Two admin screens, both Marketing:
`/admin/newsletter` and `/admin/emails`.

Modules, split the usual way — pure ones can be imported by a client
component, server ones cannot:

```
src/lib/email-template.js     PURE. renderNewsletter() -> { html, text }
src/lib/unsubscribe.js        PURE-ish (node:crypto only). HMAC tokens
src/lib/newsletter-audience.js  server. resolveRecipients()
src/lib/newsletter-build.js     server. buildBlocks() — the auto-draft
src/lib/newsletter-send.js      server. freeze + batch send
src/lib/email.js                server. now logs every send, adds sendBatch()
```

**The preview and the sender are the same function.** `/admin/newsletter/[id]`
renders its preview by POSTing the unsaved draft to
`/api/newsletters/[id]/preview`, which calls `renderFor()` — exactly what
`sendNewsletter()` calls. There is deliberately no client-side renderer to
drift out of sync. If you are tempted to render the preview in the browser
to save a round trip: that is how the preview starts lying.

### Two contracts worth not breaking

**`newsletter_recipients` is frozen at send time, not re-resolved.** Resolve
the audience twice a week apart and you get different answers, so the
delivery log would stop describing what actually happened. A send writes the
list first, then works through it, and **re-running a send only picks up rows
still `queued` or `failed`**. That is why "Retry failed" and "Send" are the
same endpoint, and why a crash mid-send cannot double-mail anyone. Do not
"optimise" this into a live query.

**Guardians are gated on being a minor, twice over.** `players.birth_date`
is the real answer; when it is blank we fall back to "is this a youth
squad". Erring towards *not* mailing is deliberate — a missed newsletter
beats mailing a stranger about an adult. A guardian only ever receives their
own child's squad's issue.

### Segmentation is the acceptance criterion

`tests/newsletter-segmentation.test.js` (run `npm test`, no framework —
`node --test` plus a 12-line alias loader in `tests/register-alias.mjs`)
asserts that a squad-A issue contains zero squad-B rows: no scores, no
fixtures, no announcements, no player of the week, no addresses. Every query
in `newsletter-build.js` takes the same `teamId`; if you add a block, filter
it the same way and extend that test. Club-wide announcements
(`announcements.team_id IS NULL`) reach every squad on purpose.

### Things that will bite

- **Email HTML is 2004 HTML.** Tables, inline CSS, 600px, explicit `bgcolor`
  on every wrapper. No flexbox, no grid, no web fonts, no `<style>` beyond
  one `@media` block. Gmail strips `data:` URIs, so a sponsor logo or player
  photo stored as base64 is dropped from the email rather than shipped
  broken — the crest comes from `/logo.png` via `SITE_URL`.
- **`SITE_URL` must be set in production.** Without it every image and link
  falls back to the fly.dev default.
- **A newsletter with no text part goes to spam.** `renderNewsletter()`
  always returns both; pass `text:` through.
- **Never render `SMTP_PASS`**, not even masked — `smtpStatus()` reports
  presence only.
- The weekly cron **builds drafts and stops**. Keep it that way.

### The mailbox is editable, and that has two sharp edges

`/admin/emails` writes the SMTP settings to a **`smtp_config` table, one row,
id pinned to 1** — deliberately *not* a key in `settings`, because
`GET /api/settings` is public and returns that entire table, and its PUT
writes arbitrary keys. A mailbox password near either of those is a leak
waiting to happen.

- **The password is encrypted** (AES-256-GCM keyed off `SESSION_SECRET`, see
  `src/lib/smtp-config.js`) and never returned by any route. `GET` reports
  `hasPassword` and nothing more. A `PUT` with an empty `pass` keeps the
  stored one — the form cannot show you the password, so treating blank as
  "clear it" would wipe a working credential every time someone fixed a typo
  in the host. Rotating `SESSION_SECRET` makes the stored password
  undecryptable; `decryptPassword()` returns null rather than throwing on
  every send, and the panel then shows the password as unset.
- **A saved mailbox beats the env vars.** Filling the form in has to make
  mail start flowing, or the screen is a lie. `smtpStatus().source` says
  which is live and the panel shows it, so the two never silently disagree.
  Deleting the row hands control back to the environment.

The transporter cache in `email.js` is keyed on the config itself, so saving
new settings takes effect on the next send with no restart and no
invalidation call to forget.

### Schema added (auto-applied on boot)

`newsletters`, `newsletter_recipients`, `player_guardians`, `email_log`,
`email_optouts`, `smtp_config`, plus `players.birth_date` and `announcements.team_id`
(NULL = club-wide; without it club news cannot be targeted).

### Fixed in passing

`GET /api/players/[id]` had no auth check at all and returned `SELECT *`
plus the player's full payment history to anyone who asked. It now applies
the same rule as the roster list: contact details, licence number, date of
birth and payments are for logged-in members. `birth_date` was added to
`PRIVATE_PLAYER_FIELDS` at the same time — a minor's date of birth has no
business on a public roster.

## Gotchas worth knowing before you touch anything

**The id-mismatch class of bug.** `practice_rsvp.user_id` is a **LOGIN** id.
A roster row's `id` is a **PLAYER** id, with the login exposed separately as
`user_id`. They are different numbers and mixing them silently attributes
one player's presence to another. It bit `/team/appel` twice and both were
fixed on 19 Aug:

1. `marks[p.id]` instead of `marks[p.user_id]`, and `setMark` passing `p.id`
   as `user_id` — presence written against the wrong account.
2. The per-player points box was gated on `p.player_id`, which
   `/api/team/roster` doesn't return (it returns the player id as `id`), so
   the box never rendered at all.

**Two separate links per player**, easy to confuse:
`users.team_id` (which squad the account belongs to) and `users.player_id`
(which player profile it's attached to). Both set in `/admin/users`. An
account can have one without the other — that half-configured state is the
usual cause of "I can't see anything" reports.

**Client/server module split.** Anything imported by a `"use client"` file
must not transitively import `src/lib/db.js`. That's why `admin-areas.js`,
`socials.js`, `instagram.js` and `game-result.js` are pure while
`access.js`, `absences.js` and `stats.js` are server-only.

**Roles.** `admin` (super-admin, only role with `/admin/*` beyond granted
areas), `coach` (own squad, **no `/admin` access at all** — coach tools must
live under `/team/*`), `player`.

---

## New files added in these rounds

```
src/lib/admin-areas.js        groups + pure permission helpers (client-safe)
src/lib/access.js             getAccount / requireArea (server)
src/lib/area-guard.js         areaLayout / superAdminLayout
src/lib/absences.js           declaration <-> presence-mark engine
src/lib/socials.js            the four networks + SVG paths
src/lib/instagram.js          permalink normaliser
src/components/AvailabilityBoard.js   the shared board (both routes)
src/components/SocialLinks.js
src/components/InstagramGallery.js
src/app/admin/gym/            venue + map editor
src/app/admin/social/         social URLs + Instagram gallery (super-admin)
src/app/team/availability/    the merged availability screen
src/app/admin/*/layout.js     one 4-line area guard per section
```

Schema additions (all auto-applied on boot): `users.admin_areas`,
`practice_rsvp.availability_id`, table `instagram_posts`, plus settings keys
`gym_access_notes`, `gym_photo_data_url`, `gym_maps_url`,
`social_{instagram,facebook,youtube,tiktok}_url`,
`instagram_gallery_title`, `instagram_gallery_enabled`.

---

## Open items

- **Nothing is deployed.** Run `npm run build && fly deploy`.
- **Nothing is committed.** ~92 files dirty against `f536a73` on `main`.
- After deploying, spot-check existing playbooks — the tactics permission
  hole means plays could have been deleted by anyone, and attendance
  recorded through the old register may be attributed to the wrong player
  (see the id-mismatch note).
- Google sign-in still needs `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` as
  Fly secrets.
- The ~15 real ACGBA fixtures still need pasting via the CSV import once
  published.

## Known annoyances

The repo lives inside a Google Drive folder, so Drive syncs every file as
npm writes it. Consider `git clone`-ing it somewhere local and treating
Drive as backup only.
