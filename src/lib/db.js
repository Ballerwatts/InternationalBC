// Lightweight persistence layer using Node's built-in SQLite (node:sqlite).
// No native addon / binary download required — works anywhere Node 22+ runs,
// which sidesteps the network-restricted-environment problems that
// Prisma/better-sqlite3 style tools run into.
//
// The whole club's data easily fits in SQLite; this file owns the schema,
// a small query helper, and first-run seed data (club settings + the
// confirmed 2026 roster).

import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "ibc.db");

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

let _db;

function getDb() {
  if (_db) return _db;
  ensureDir(DB_PATH);
  _db = new DatabaseSync(DB_PATH);
  _db.exec("PRAGMA journal_mode = WAL;");
  migrate(_db);
  seed(_db);
  return _db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    -- The club fields multiple squads (e.g. two men's teams + a women's
    -- team). Everything team-specific (roster, schedule, tactics, practice
    -- board, presences) is scoped to one of these via team_id. A NULL
    -- team_id on practices/practice_board/plays means "whole club" (kept
    -- for anything not squad-specific, e.g. shared facility bookings).
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT, -- free text, e.g. 'Hommes 1', 'Hommes 2', 'Dames'
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      jersey_number TEXT,
      license_number TEXT,
      email TEXT,
      phone TEXT,
      photo_data_url TEXT,
      position TEXT,
      games_played INTEGER DEFAULT 0,
      total_points INTEGER DEFAULT 0,
      ppg REAL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      season TEXT NOT NULL,
      category TEXT NOT NULL, -- 'gym' | 'license' | 'referee' | 'other'
      amount REAL NOT NULL,
      paid_on TEXT,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS practices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL DEFAULT 'practice', -- 'practice' | 'game' | 'event' | 'open_gym'
      title TEXT NOT NULL,
      practice_date TEXT NOT NULL, -- 'YYYY-MM-DD'
      start_time TEXT NOT NULL,    -- 'HH:MM'
      end_time TEXT NOT NULL,      -- 'HH:MM'
      location_name TEXT,
      location_address TEXT,
      opponent TEXT,
      notes TEXT,
      team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS practice_board (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_start_date TEXT NOT NULL, -- Monday of the week, 'YYYY-MM-DD'
      focus TEXT,
      drills TEXT, -- newline separated
      notes TEXT,
      team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- New plays start unpublished (published = 0) — anyone on the team can
    -- draft one, but only a coach/admin can publish it, so players only
    -- ever see the plays staff have chosen to show (see /api/plays).
    CREATE TABLE IF NOT EXISTS plays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'offense',
      diagram_json TEXT NOT NULL,
      team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
      published INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Individual logins. 'admin' = super-admin, sees/manages every team.
    -- 'coach' manages the one (or more) teams they're assigned to (schedule,
    -- tactics, practice board, presences, roster) but not billing/other
    -- teams/account management. 'player' sees only their own team's info.
    -- See src/lib/api-auth.js for how this is enforced on the API side.
    -- google_id is set when the account was created/linked via "Sign in
    -- with Google" (admin accounts only, see /api/auth/google).
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'player', -- 'admin' | 'coach' | 'player'
      player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
      team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
      google_id TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- A player-declared window of unavailability (travel, injury, other).
    -- Players manage their own rows (scoped to their linked player_id);
    -- admins see everyone's and can add on a player's behalf. Used to
    -- cross-reference against the practices table so the coach can see, for any
    -- upcoming practice or game, who is expected to be missing.
    CREATE TABLE IF NOT EXISTS availability (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      start_date TEXT NOT NULL, -- 'YYYY-MM-DD', inclusive
      end_date TEXT NOT NULL,   -- 'YYYY-MM-DD', inclusive
      reason TEXT NOT NULL DEFAULT 'voyage', -- 'voyage' | 'blessure' | 'autre'
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Per-practice RSVP ("tableau d'entraînement" personal mark). Distinct
    -- from the availability table above, which covers multi-day absence
    -- windows — this is a lightweight in/out toggle for one practice/game.
    -- One row per (practice, user); players manage only their own.
    CREATE TABLE IF NOT EXISTS practice_rsvp (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      practice_id INTEGER NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'in', -- 'in' | 'out'
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(practice_id, user_id)
    );

    -- Signup/invitation requests. 'request' = someone submitted the public
    -- "request access" form on /login; a super-admin must approve it from
    -- /admin/users before any login is created. Approving inserts a row
    -- into the users table with a freshly generated temporary password.
    CREATE TABLE IF NOT EXISTS access_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      message TEXT,
      origin TEXT NOT NULL DEFAULT 'request', -- 'request' (public, self) | 'invite' (admin-initiated)
      role TEXT NOT NULL DEFAULT 'player', -- 'admin' | 'coach' | 'player'
      player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
      team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
      requested_team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL, -- what the requester said, if anything
      status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
      invited_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      decided_at TEXT
    );

    -- Club sponsors, shown publicly (home page) and managed from
    -- /admin/sponsors. Multiple sponsors supported.
    CREATE TABLE IF NOT EXISTS sponsors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      logo_data_url TEXT,
      description TEXT,
      website_url TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Club-level income/expense ledger ("in's and out's") — distinct from
    -- the per-player payments table (which tracks what each player owes
    -- the club). This is the whole-club cash book: sponsor income, other
    -- income, and expenses like gym rental, referees, dinners, team events.
    CREATE TABLE IF NOT EXISTS budget_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_type TEXT NOT NULL, -- 'income' | 'expense'
      category TEXT NOT NULL, -- income: 'player_fees' | 'sponsor' | 'other' — expense: 'gym' | 'license' | 'referees' | 'diner' | 'team_event' | 'other'
      description TEXT,
      amount REAL NOT NULL,
      entry_date TEXT NOT NULL, -- 'YYYY-MM-DD'
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Lightweight upgrade path for dev databases created before team_id /
  // google_id existed — CREATE TABLE IF NOT EXISTS above doesn't add
  // columns to a table that's already there.
  addColumnIfMissing(db, "players", "team_id", "INTEGER REFERENCES teams(id) ON DELETE SET NULL");
  addColumnIfMissing(db, "practices", "team_id", "INTEGER REFERENCES teams(id) ON DELETE CASCADE");
  addColumnIfMissing(db, "practice_board", "team_id", "INTEGER REFERENCES teams(id) ON DELETE CASCADE");
  addColumnIfMissing(db, "plays", "team_id", "INTEGER REFERENCES teams(id) ON DELETE CASCADE");
  addColumnIfMissing(db, "plays", "published", "INTEGER NOT NULL DEFAULT 0");
  addColumnIfMissing(db, "users", "team_id", "INTEGER REFERENCES teams(id) ON DELETE SET NULL");
  addColumnIfMissing(db, "users", "google_id", "TEXT");
  addColumnIfMissing(db, "access_requests", "team_id", "INTEGER REFERENCES teams(id) ON DELETE SET NULL");
  addColumnIfMissing(db, "access_requests", "requested_team_id", "INTEGER REFERENCES teams(id) ON DELETE SET NULL");
  addColumnIfMissing(db, "players", "bio", "TEXT");

  addColumnIfMissing(db, "players", "nationality", "TEXT");

  migrateTeamNames(db);
  migrateEnglishDefaults(db);
}

// One-time text fix: databases created before the English-default rename
// already have the old French hero/club text saved as real rows in
// `settings` (seed() only inserts on an empty table, so changing
// DEFAULT_SETTINGS in code doesn't retroactively touch a database that's
// already been seeded). This overwrites those specific values ONLY if they
// still exactly match the old French defaults — so any custom text an
// admin has since typed in from /admin/hero is left untouched.
function migrateEnglishDefaults(db) {
  const OLD_TO_NEW = {
    hero_headline: {
      old: "International Basketball Club Genève",
      new: "International Basketball Club Geneva",
    },
    hero_subheadline: {
      old: "2ème Ligue Cantonale — A.C.G.B.A.",
      new: "IBBC — Geneva Amateur Basketball Association",
    },
    hero_body: {
      old: "Le club de basketball IBC Genève. Une seule équipe, un seul objectif : représenter fièrement nos couleurs chaque semaine en 2ème ligue cantonale.",
      new: "IBBC Geneva fields four squads — U18M, NL1, 3LCM and 2LCM — competing every week across the Geneva basketball leagues.",
    },
    club_about: {
      old: "International Basketball Club Genève réunit une équipe qui évolue en 2ème ligue cantonale (A.C.G.B.A.), la plus haute ligue amateur du canton. Entraînements le lundi et le jeudi, matches le week-end — dans l'esprit sportif et communautaire du club.",
      new: "International Basketball Club Geneva (IBBC) fields four squads — IBBC Youth Men's Team (U18M), IBBC Women (NL1), IBBC Men (3LCM) and IBBC Men (2LCM) — competing in the Geneva Amateur Basketball Association (ACGBA) championship from October to May, in a spirit of sport and community.",
    },
  };
  for (const [key, { old, new: next }] of Object.entries(OLD_TO_NEW)) {
    const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
    if (row && row.value === old) {
      db.prepare("UPDATE settings SET value = ? WHERE key = ?").run(next, key);
    }
  }
}

// One-time rename: the club originally seeded 3 teams (IBBC 1 / IBBC 2 /
// IBBC Dames). The club now uses 4 named squads with league codes. Renaming
// in place (rather than delete+insert) preserves every existing team_id
// foreign key on players/practices/plays/users/etc. — nobody's roster
// assignment moves. "IBBC 1" becomes "IBBC Men (2LCM)", which is where the
// originally-seeded/currently-listed players live.
function migrateTeamNames(db) {
  const RENAMES = [
    { from: "IBBC 1", toName: "IBBC Men (2LCM)", toCategory: "Hommes 1 — 2ème Ligue Cantonale" },
    { from: "IBBC 2", toName: "IBBC Men (3LCM)", toCategory: "3ème Ligue Cantonale Masculine" },
    { from: "IBBC Dames", toName: "IBBC Women (NL1)", toCategory: "NL1 — National League 1" },
  ];
  for (const r of RENAMES) {
    const existing = db.prepare("SELECT id FROM teams WHERE name = ?").get(r.from);
    if (existing) {
      db.prepare("UPDATE teams SET name = ?, category = ? WHERE id = ?").run(
        r.toName,
        r.toCategory,
        existing.id
      );
    }
  }
  const hasYouth = db.prepare("SELECT id FROM teams WHERE name = ?").get("IBBC Youth Men's Team (U18M)");
  if (!hasYouth) {
    const teamCount = db.prepare("SELECT COUNT(*) as c FROM teams").get().c;
    if (teamCount > 0) {
      // Only add the 4th squad if teams already exist (fresh DBs get all 4
      // from SEED_TEAMS below; this only backfills already-seeded DBs).
      const maxOrder = db.prepare("SELECT COALESCE(MAX(sort_order), -1) as m FROM teams").get().m;
      db.prepare("INSERT INTO teams (name, category, sort_order) VALUES (?, ?, ?)").run(
        "IBBC Youth Men's Team (U18M)",
        "U18M — Youth Men",
        maxOrder + 1
      );
    }
  }
}

function addColumnIfMissing(db, table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

const DEFAULT_SETTINGS = {
  admin_password_hash: "", // set on first run via /api/auth/bootstrap or env var
  hero_headline: "International Basketball Club Geneva",
  hero_subheadline: "IBBC — Geneva Amateur Basketball Association",
  hero_body:
    "IBBC Geneva fields four squads — U18M, NL1, 3LCM and 2LCM — competing every week across the Geneva basketball leagues.",
  hero_image_data_url: "",
  team_photo_data_url: "",
  club_about:
    "International Basketball Club Geneva (IBBC) fields four squads — IBBC Youth Men's Team (U18M), IBBC Women (NL1), IBBC Men (3LCM) and IBBC Men (2LCM) — competing in the Geneva Amateur Basketball Association (ACGBA) championship from October to May, in a spirit of sport and community.",
  season_label: "2026 – 2027",
  budget_annual_total: "4000",
  budget_gym: "1800",
  budget_license: "1400",
  budget_referee: "800",
  practice_location_name: "École de commerce Raymond-Uldry",
  practice_location_address: "Chemin du Domaine-Patry 1, 1224 Chêne-Bougeries, Genève",
};

const SEED_PLAYERS = [
  { first_name: "Iaroslav", last_name: "Udodenko", games_played: 18, total_points: 353, ppg: 19.6 },
  { first_name: "Julien", last_name: "Senderos", games_played: 15, total_points: 237, ppg: 15.8 },
  { first_name: "Igor", last_name: "Kozlov", games_played: 13, total_points: 197, ppg: 15.2 },
  { first_name: "Jonathan Mads", last_name: "Lomholt", games_played: 14, total_points: 99, ppg: 7.1 },
  { first_name: "Erwan", last_name: "Davies", games_played: 16, total_points: 110, ppg: 6.9 },
  { first_name: "Lucas-Pierre Henrichs", last_name: "Barbey", games_played: 14, total_points: 72, ppg: 5.1 },
  { first_name: "Arnaud", last_name: "Kajangwe", games_played: 13, total_points: 35, ppg: 2.7 },
  { first_name: "Jonathan", last_name: "Bieler", games_played: 7, total_points: 18, ppg: 2.6 },
  { first_name: "Stéfan", last_name: "Jeanmonod", games_played: 14, total_points: 26, ppg: 1.9 },
  { first_name: "Teymour Stuart", last_name: "Fouladi", games_played: 7, total_points: 8, ppg: 1.1 },
  { first_name: "Mohamed", last_name: "Turki", games_played: 11, total_points: 11, ppg: 1.0 },
];

const SEED_TEAMS = [
  { name: "IBBC Youth Men's Team (U18M)", category: "U18M — Youth Men" },
  { name: "IBBC Women (NL1)", category: "NL1 — National League 1" },
  { name: "IBBC Men (3LCM)", category: "3ème Ligue Cantonale Masculine" },
  { name: "IBBC Men (2LCM)", category: "Hommes 1 — 2ème Ligue Cantonale" },
];

function seed(db) {
  const countRow = db.prepare("SELECT COUNT(*) as c FROM settings").get();
  if (countRow.c === 0) {
    const insert = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)");
    for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) insert.run(k, String(v));
  }

  const teamCount = db.prepare("SELECT COUNT(*) as c FROM teams").get();
  if (teamCount.c === 0) {
    const insert = db.prepare("INSERT INTO teams (name, category, sort_order) VALUES (?, ?, ?)");
    SEED_TEAMS.forEach((t, i) => insert.run(t.name, t.category, i));
  }
  // "IBBC Men (2LCM)" is the squad this app was originally built around —
  // everything not-yet-assigned to a team defaults to it below.
  const primaryTeamId =
    db.prepare("SELECT id FROM teams WHERE name = ?").get("IBBC Men (2LCM)")?.id ||
    db.prepare("SELECT id FROM teams ORDER BY sort_order ASC LIMIT 1").get()?.id ||
    null;

  const playerCount = db.prepare("SELECT COUNT(*) as c FROM players").get();
  if (playerCount.c === 0) {
    const insert = db.prepare(`
      INSERT INTO players (first_name, last_name, games_played, total_points, ppg, sort_order, team_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    SEED_PLAYERS.forEach((p, i) => {
      insert.run(p.first_name, p.last_name, p.games_played, p.total_points, p.ppg, i, primaryTeamId);
    });
  }

  const announcementCount = db.prepare("SELECT COUNT(*) as c FROM announcements").get();
  if (announcementCount.c === 0) {
    db.prepare(
      "INSERT INTO announcements (title, body, published) VALUES (?, ?, 1)"
    ).run(
      "Bienvenue sur le nouveau site du club !",
      "Le site est en cours de mise en place. Retrouvez ici les annonces, le calendrier des entraînements et matches, le budget de la saison et les schémas tactiques de l'équipe."
    );
  }

  const practiceCount = db.prepare("SELECT COUNT(*) as c FROM practices").get();
  if (practiceCount.c === 0) {
    const insert = db.prepare(`
      INSERT INTO practices (kind, title, practice_date, start_time, end_time, location_name, location_address, opponent, notes, team_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const loc = "École de commerce Raymond-Uldry";
    const addr = "Chemin du Domaine-Patry 1, 1224 Chêne-Bougeries, Genève";
    // Seed the next 8 Monday/Thursday practices starting from the next occurrence.
    const today = new Date();
    let d = new Date(today);
    let created = 0;
    while (created < 8) {
      d.setDate(d.getDate() + 1);
      const day = d.getDay(); // 1 = Monday, 4 = Thursday
      if (day === 1 || day === 4) {
        const iso = d.toISOString().slice(0, 10);
        insert.run("practice", "Entraînement", iso, "20:00", "22:00", loc, addr, null, null, primaryTeamId);
        created++;
      }
    }
  }

  // One-time carry-over: earlier versions of this app had a single admin
  // password stored in settings.admin_password_hash instead of the `users`
  // table. If that's the only credential on record, promote it to a real
  // admin user so nobody gets locked out after upgrading.
  const userCount = db.prepare("SELECT COUNT(*) as c FROM users").get();
  if (userCount.c === 0) {
    const legacyHash = db
      .prepare("SELECT value FROM settings WHERE key = 'admin_password_hash'")
      .get()?.value;
    if (legacyHash) {
      db.prepare(
        "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')"
      ).run("Admin", "admin@international-bc-geneve.local", legacyHash);
    }
  }
}

// node:sqlite returns rows as null-prototype objects, which Next.js refuses
// to serialize across the Server -> Client Component boundary ("Only plain
// objects... can be passed to Client Components"). Spreading into a fresh
// {} gives back a normal Object.prototype object and fixes that everywhere
// query()/get() results eventually flow into a "use client" component.
function toPlain(row) {
  return row == null ? row : { ...row };
}

export function query(sql, params = []) {
  return getDb().prepare(sql).all(...params).map(toPlain);
}

export function get(sql, params = []) {
  return toPlain(getDb().prepare(sql).get(...params));
}

export function run(sql, params = []) {
  const info = getDb().prepare(sql).run(...params);
  return { lastInsertRowid: Number(info.lastInsertRowid), changes: Number(info.changes) };
}

export function getAllSettings() {
  const rows = query("SELECT key, value FROM settings");
  const out = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

export function setSetting(key, value) {
  run(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [key, String(value)]
  );
}

export default getDb;
