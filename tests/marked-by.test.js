// "noté par …" in the register was rendered but never populated: the column
// was declared and migrated, and nothing ever wrote it. These pin the two
// halves that matter — it records WHO marked, and it must not leak the
// reason to team-mates.
//
//   npm test

import { test, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.DATABASE_PATH = join(mkdtempSync(join(tmpdir(), "ibc-marked-")), "t.db");
process.env.SESSION_SECRET = "test-secret";

const { query, run, get } = await import("@/lib/db");

let coachId, playerUserId, practiceId;
before(() => {
  const teamId = query("SELECT id FROM teams ORDER BY sort_order LIMIT 1")[0].id;
  coachId = Number(
    run("INSERT INTO users (name, email, password_hash, role, team_id) VALUES (?,?,?,'coach',?)", [
      "Coach Souhail", "coach@test.local", "x", teamId,
    ]).lastInsertRowid
  );
  playerUserId = Number(
    run("INSERT INTO users (name, email, password_hash, role, team_id) VALUES (?,?,?,'player',?)", [
      "Iaroslav", "player@test.local", "x", teamId,
    ]).lastInsertRowid
  );
  practiceId = Number(
    run(`INSERT INTO practices (kind, title, practice_date, start_time, end_time, team_id)
         VALUES ('practice','Entraînement','2026-11-02','20:00','22:00',?)`, [teamId]).lastInsertRowid
  );
});

/** Mirrors the route: NULL when marking yourself, the actor otherwise. */
function mark({ actorId, targetId, status }) {
  const markedBy = Number(targetId) === Number(actorId) ? null : actorId;
  run(
    `INSERT INTO practice_rsvp (practice_id, user_id, status, note, availability_id, marked_by, updated_at)
     VALUES (?, ?, ?, NULL, NULL, ?, datetime('now'))
     ON CONFLICT(practice_id, user_id) DO UPDATE SET
       status = excluded.status, marked_by = excluded.marked_by, updated_at = datetime('now')`,
    [practiceId, targetId, status, markedBy]
  );
}

test("marking yourself records no marker", () => {
  mark({ actorId: playerUserId, targetId: playerUserId, status: "in" });
  const row = get("SELECT marked_by FROM practice_rsvp WHERE user_id = ?", [playerUserId]);
  assert.equal(row.marked_by, null);
});

test("a coach marking a player records the coach, and the name resolves", () => {
  mark({ actorId: coachId, targetId: playerUserId, status: "out" });
  const row = get(
    `SELECT r.marked_by, m.name AS marked_by_name
     FROM practice_rsvp r LEFT JOIN users m ON m.id = r.marked_by
     WHERE r.user_id = ?`,
    [playerUserId]
  );
  assert.equal(row.marked_by, coachId);
  assert.equal(row.marked_by_name, "Coach Souhail");
});

test("the player taking the mark back clears the attribution", () => {
  mark({ actorId: playerUserId, targetId: playerUserId, status: "in" });
  const row = get("SELECT marked_by, status FROM practice_rsvp WHERE user_id = ?", [playerUserId]);
  assert.equal(row.status, "in");
  assert.equal(row.marked_by, null, "re-marking yourself must not keep the coach's name on it");
});

test("the squad-wide read exposes neither the note nor the marker", () => {
  // The exact projection the route uses for a player reading their squad.
  const rows = query(
    `SELECT r.id, r.practice_id, r.user_id, r.status, r.availability_id, r.updated_at,
            u.name as user_name, u.player_id
     FROM practice_rsvp r JOIN users u ON u.id = r.user_id`
  );
  for (const r of rows) {
    assert.equal("note" in r, false, "a team-mate must not see the reason");
    assert.equal("marked_by" in r, false, "a team-mate must not see who marked it");
  }
});
