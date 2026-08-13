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
      kind TEXT NOT NULL DEFAULT 'practice', -- 'practice' | 'game'
      title TEXT NOT NULL,
      practice_date TEXT NOT NULL, -- 'YYYY-MM-DD'
      start_time TEXT NOT NULL,    -- 'HH:MM'
      end_time TEXT NOT NULL,      -- 'HH:MM'
      location_name TEXT,
      location_address TEXT,
      opponent TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS practice_board (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_start_date TEXT NOT NULL, -- Monday of the week, 'YYYY-MM-DD'
      focus TEXT,
      drills TEXT, -- newline separated
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS plays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'offense',
      diagram_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Individual logins. 'admin' role can reach every /admin page; 'player'
    -- role can only reach /team (tactics editor + practice board) — see
    -- src/lib/api-auth.js for how that's enforced on the API side.
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'player', -- 'admin' | 'player'
      player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
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
  `);
}

const DEFAULT_SETTINGS = {
  admin_password_hash: "", // set on first run via /api/auth/bootstrap or env var
  hero_headline: "International Basketball Club Genève",
  hero_subheadline: "2ème Ligue Cantonale — A.C.G.B.A.",
  hero_body:
    "Le club de basketball IBC Genève. Une seule équipe, un seul objectif : représenter fièrement nos couleurs chaque semaine en 2ème ligue cantonale.",
  hero_image_data_url: "",
  team_photo_data_url: "",
  club_about:
    "International Basketball Club Genève réunit une équipe qui évolue en 2ème ligue cantonale (A.C.G.B.A.), la plus haute ligue amateur du canton. Entraînements le lundi et le jeudi, matches le week-end — dans l'esprit sportif et communautaire du club.",
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

function seed(db) {
  const countRow = db.prepare("SELECT COUNT(*) as c FROM settings").get();
  if (countRow.c === 0) {
    const insert = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)");
    for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) insert.run(k, String(v));
  }

  const playerCount = db.prepare("SELECT COUNT(*) as c FROM players").get();
  if (playerCount.c === 0) {
    const insert = db.prepare(`
      INSERT INTO players (first_name, last_name, games_played, total_points, ppg, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    SEED_PLAYERS.forEach((p, i) => {
      insert.run(p.first_name, p.last_name, p.games_played, p.total_points, p.ppg, i);
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
      INSERT INTO practices (kind, title, practice_date, start_time, end_time, location_name, location_address, opponent, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        insert.run("practice", "Entraînement", iso, "20:00", "22:00", loc, addr, null, null);
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
