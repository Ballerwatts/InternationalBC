// The weekly pattern is what turns "Monday and Thursday at 20:00" from a
// hardcoded 2LCM assumption into per-squad data. Two things must hold: a
// squad can train any day of the week including weekends, and two sessions
// on the same day are distinct rather than one silently swallowing the other.
//
//   npm test

import { test, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.DATABASE_PATH = join(mkdtempSync(join(tmpdir(), "ibc-slots-")), "t.db");
process.env.SESSION_SECRET = "test-secret";

const { query, run, getSlotsForTeam, replaceSlotsForTeam, toTeamId } = await import("@/lib/db");

let teamId;
before(() => {
  teamId = query("SELECT id FROM teams ORDER BY sort_order LIMIT 1")[0].id;
});

test("a squad can train any day, Sunday included", () => {
  replaceSlotsForTeam(teamId, [
    { weekday: 0, start_time: "10:00", end_time: "12:00" }, // Sunday
    { weekday: 3, start_time: "19:00", end_time: "21:00" }, // Wednesday
    { weekday: 6, start_time: "09:00", end_time: "11:00" }, // Saturday
  ]);
  assert.deepEqual(getSlotsForTeam(teamId).map((s) => s.weekday), [0, 3, 6]);
});

test("two sessions on the same day are both kept", () => {
  replaceSlotsForTeam(teamId, [
    { weekday: 1, start_time: "12:00", end_time: "13:30" },
    { weekday: 1, start_time: "20:00", end_time: "22:00" },
  ]);
  const slots = getSlotsForTeam(teamId);
  assert.equal(slots.length, 2);
  assert.deepEqual(slots.map((s) => s.start_time), ["12:00", "20:00"]);
});

test("replacing the pattern removes what is no longer in it", () => {
  replaceSlotsForTeam(teamId, [{ weekday: 2, start_time: "18:00", end_time: "20:00" }]);
  const slots = getSlotsForTeam(teamId);
  assert.equal(slots.length, 1);
  assert.equal(slots[0].weekday, 2);
});

test("nonsense weekdays and missing times are dropped, not stored", () => {
  replaceSlotsForTeam(teamId, [
    { weekday: 9, start_time: "18:00", end_time: "20:00" },
    { weekday: -1, start_time: "18:00", end_time: "20:00" },
    { weekday: 2, start_time: "", end_time: "20:00" },
    { weekday: 5, start_time: "17:00", end_time: "19:00" },
  ]);
  const slots = getSlotsForTeam(teamId);
  assert.deepEqual(slots.map((s) => s.weekday), [5]);
});

test("a gym can be attached, and its name comes back resolved", () => {
  const { lastInsertRowid } = run("INSERT INTO gyms (name, address) VALUES (?, ?)", [
    "Collège Sismondi",
    "Chemin Eugène-Rigot 3, 1202 Geneva",
  ]);
  replaceSlotsForTeam(teamId, [
    { weekday: 4, start_time: "20:00", end_time: "22:00", gym_id: Number(lastInsertRowid) },
  ]);
  assert.equal(getSlotsForTeam(teamId)[0].gym_name, "Collège Sismondi");
});

// The "Tout le club" option sends team_id="" — and practices.team_id is a
// foreign key, so an empty string 500s the request and creates nothing.
// That is exactly how "générer les 12 prochaines semaines" came back
// looking like it had worked while adding no dates at all.
test("club-wide means NULL, never an empty string", () => {
  assert.equal(toTeamId(""), null);
  assert.equal(toTeamId(null), null);
  assert.equal(toTeamId(undefined), null);
  assert.equal(toTeamId("3"), 3);
  assert.equal(toTeamId(3), 3);
  assert.equal(toTeamId("nope"), null);
});

test("a club-wide practice inserts; an empty-string team_id would not", () => {
  run(
    `INSERT INTO practices (kind, title, practice_date, start_time, end_time, team_id)
     VALUES ('practice', 'Entraînement', '2099-01-05', '20:00', '22:00', ?)`,
    [toTeamId("")]
  );
  const row = query("SELECT team_id FROM practices WHERE practice_date = '2099-01-05'")[0];
  assert.equal(row.team_id, null);

  assert.throws(() =>
    run(
      `INSERT INTO practices (kind, title, practice_date, start_time, end_time, team_id)
       VALUES ('practice', 'Entraînement', '2099-01-06', '20:00', '22:00', ?)`,
      [""]
    )
  );
});
