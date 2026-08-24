// The one property this whole feature rests on: an issue addressed to one
// squad contains that squad's content and that squad's people, and nothing
// belonging to another squad. Segmentation that leaks is worse than no
// newsletter — it tells the U18 parents the women's NL1 score and mails the
// men's squad about a practice they are not at.
//
//   npm test

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "ibc-test-"));
process.env.DATABASE_PATH = join(dir, "test.db");
process.env.SESSION_SECRET = "test-secret";

const { run, query, get } = await import("@/lib/db");
const { buildBlocks } = await import("@/lib/newsletter-build");
const { resolveRecipients, isMinor, isYouthTeam } = await import("@/lib/newsletter-audience");

let A; // squad A — the issue under test
let B; // squad B — must never appear in A's issue
const WEEK = "2026-08-24"; // a Monday
const LAST_WEEK_GAME = "2026-08-20";
const THIS_WEEK_GAME = "2026-08-27";

before(() => {
  A = run("INSERT INTO teams (name, category) VALUES ('Squad A (U18M)', 'U18M — Youth Men')").lastInsertRowid;
  B = run("INSERT INTO teams (name, category) VALUES ('Squad B', 'NL1')").lastInsertRowid;

  const playerA = run(
    "INSERT INTO players (first_name, last_name, email, team_id, birth_date, active) VALUES ('Ana','Alpha','ana@a.test',?,'2010-05-01',1)",
    [A]
  ).lastInsertRowid;
  const playerB = run(
    "INSERT INTO players (first_name, last_name, email, team_id, birth_date, active) VALUES ('Ben','Bravo','ben@b.test',?,'2010-05-01',1)",
    [B]
  ).lastInsertRowid;
  // An adult on squad A: their guardian must NOT be mailed.
  const adultA = run(
    "INSERT INTO players (first_name, last_name, email, team_id, birth_date, active) VALUES ('Carl','Charlie','carl@a.test',?,'1990-01-01',1)",
    [A]
  ).lastInsertRowid;

  // Accounts. The coach of A shares an address with player Ana — one copy only.
  run("INSERT INTO users (name, email, password_hash, role, team_id, active) VALUES ('Coach A','ana@a.test','x','coach',?,1)", [A]);
  run("INSERT INTO users (name, email, password_hash, role, team_id, active) VALUES ('Coach B','coachb@b.test','x','coach',?,1)", [B]);

  run("INSERT INTO player_guardians (player_id, name, email, relation) VALUES (?, 'Mum Alpha', 'mum@a.test', 'mother')", [playerA]);
  run("INSERT INTO player_guardians (player_id, name, email, relation) VALUES (?, 'Mum Bravo', 'mum@b.test', 'mother')", [playerB]);
  run("INSERT INTO player_guardians (player_id, name, email, relation) VALUES (?, 'Adult Kin', 'kin@a.test', 'guardian')", [adultA]);

  // Games last week, one per squad, each with a scorer.
  const gameA = run(
    "INSERT INTO practices (kind, title, practice_date, start_time, end_time, opponent, score_us, score_them, recap, team_id) VALUES ('game','Game A',?,'18:00','20:00','Meyrin',71,64,'Great defence.',?)",
    [LAST_WEEK_GAME, A]
  ).lastInsertRowid;
  const gameB = run(
    "INSERT INTO practices (kind, title, practice_date, start_time, end_time, opponent, score_us, score_them, recap, team_id) VALUES ('game','Game B',?,'18:00','20:00','Versoix',55,80,'Tough night.',?)",
    [LAST_WEEK_GAME, B]
  ).lastInsertRowid;
  run("INSERT INTO game_stats (practice_id, player_id, points) VALUES (?,?,22)", [gameA, playerA]);
  run("INSERT INTO game_stats (practice_id, player_id, points) VALUES (?,?,31)", [gameB, playerB]);

  // Fixtures ahead, one per squad.
  run(
    "INSERT INTO practices (kind, title, practice_date, start_time, end_time, opponent, team_id) VALUES ('game','Next A',?,'18:00','20:00','Chêne',?)",
    [THIS_WEEK_GAME, A]
  );
  run(
    "INSERT INTO practices (kind, title, practice_date, start_time, end_time, opponent, team_id) VALUES ('game','Next B',?,'18:00','20:00','Lancy',?)",
    [THIS_WEEK_GAME, B]
  );

  run("INSERT INTO practice_board (week_start_date, focus, drills, team_id) VALUES (?, 'A: transition defence', 'Shell drill', ?)", [WEEK, A]);
  run("INSERT INTO practice_board (week_start_date, focus, drills, team_id) VALUES (?, 'B: pick and roll', 'Horns', ?)", [WEEK, B]);

  run("INSERT INTO announcements (title, body, published, team_id) VALUES ('A only','Squad A news',1,?)", [A]);
  run("INSERT INTO announcements (title, body, published, team_id) VALUES ('B only','Squad B news',1,?)", [B]);
  run("INSERT INTO announcements (title, body, published, team_id) VALUES ('Club wide','Everyone news',1,NULL)");
});

after(() => rmSync(dir, { recursive: true, force: true }));

/** Every id-bearing row a block carries, flattened. */
function rowsOf(blocks) {
  const rows = [];
  for (const b of blocks) {
    if (b.type === "results") rows.push(...(b.games || []));
    if (b.type === "fixtures") rows.push(...(b.events || []));
    if (b.type === "news") rows.push(...(b.items || []));
    if (b.type === "player" && b.player) rows.push(b.player);
    if (b.type === "practice" && (b.focus || b.drills)) rows.push({ team_id: b.team_id, focus: b.focus });
  }
  return rows;
}

test("a squad-A issue contains zero squad-B rows", () => {
  const blocks = buildBlocks({ teamId: A, weekStart: WEEK });
  const rows = rowsOf(blocks);

  assert.ok(rows.length > 0, "the fixture data should produce content at all");
  for (const row of rows) {
    assert.notEqual(row.team_id, B, `a row belonging to squad B leaked in: ${JSON.stringify(row)}`);
  }

  const json = JSON.stringify(blocks);
  for (const needle of ["Versoix", "Tough night", "Squad B news", "B: pick and roll", "Bravo", "Next B"]) {
    assert.ok(!json.includes(needle), `squad B content "${needle}" leaked into squad A's issue`);
  }
});

test("a squad-A issue still carries its own content and club-wide news", () => {
  const blocks = buildBlocks({ teamId: A, weekStart: WEEK });
  const json = JSON.stringify(blocks);

  assert.ok(json.includes("Meyrin"), "squad A's result is missing");
  assert.ok(json.includes("Great defence."), "the coach's recap is missing");
  assert.ok(json.includes("Ana Alpha"), "player of the week is missing");
  assert.ok(json.includes("A: transition defence"), "the practice focus is missing");
  assert.ok(json.includes("A only"), "squad A's announcement is missing");
  assert.ok(json.includes("Club wide"), "a club-wide announcement should reach every squad");
  assert.ok(!json.includes("B only"), "squad B's announcement leaked");
});

test("player of the week is the top scorer of that squad, not of the club", () => {
  // Ben scored 31 to Ana's 22 — but he is on squad B.
  const blocks = buildBlocks({ teamId: A, weekStart: WEEK });
  const player = blocks.find((b) => b.type === "player")?.player;
  assert.equal(player.name, "Ana Alpha");
});

test("recipients are squad-scoped, deduplicated, and guardian rules hold", () => {
  const { recipients, skipped, counts } = resolveRecipients({
    teamId: A,
    audience: "players,users,guardians",
  });
  const emails = recipients.map((r) => r.email);

  assert.ok(!emails.some((e) => e.endsWith("@b.test")), `squad B addresses leaked: ${emails.join(", ")}`);
  assert.ok(emails.includes("ana@a.test"), "squad A's player is missing");
  assert.ok(emails.includes("mum@a.test"), "the minor's guardian should be mailed");
  assert.ok(!emails.includes("kin@a.test"), "an adult player's guardian must not be mailed");

  // Ana is both a player and the coach account, on one address.
  assert.equal(emails.filter((e) => e === "ana@a.test").length, 1, "a duplicate address was mailed twice");
  assert.ok(
    skipped.some((s) => s.reason === "duplicate" && s.email === "ana@a.test"),
    "the deduplicated copy should be recorded, not silently dropped"
  );
  assert.equal(counts.guardian, 1);
});

test("an opt-out is skipped with a reason rather than vanishing", () => {
  run("INSERT INTO email_optouts (email, token) VALUES ('ana@a.test','t') ON CONFLICT(email) DO NOTHING");
  const { recipients, skipped } = resolveRecipients({ teamId: A, audience: "players,users" });
  assert.ok(!recipients.some((r) => r.email === "ana@a.test"));
  assert.ok(skipped.some((s) => s.email === "ana@a.test" && s.reason === "opted_out"));
  run("DELETE FROM email_optouts WHERE email = 'ana@a.test'");
});

test("under-18 detection falls back to the squad when a birth date is missing", () => {
  const youth = get("SELECT * FROM teams WHERE id = ?", [A]);
  const senior = get("SELECT * FROM teams WHERE id = ?", [B]);
  assert.equal(isYouthTeam(youth), true);
  assert.equal(isYouthTeam(senior), false);
  assert.equal(isMinor({ birth_date: null }, youth), true);
  assert.equal(isMinor({ birth_date: null }, senior), false);
  assert.equal(isMinor({ birth_date: "1990-01-01" }, youth), false, "a real birth date beats the squad guess");
});

test("the club-wide issue sees every squad", () => {
  const json = JSON.stringify(buildBlocks({ teamId: null, weekStart: WEEK }));
  assert.ok(json.includes("Meyrin") && json.includes("Versoix"));
});
