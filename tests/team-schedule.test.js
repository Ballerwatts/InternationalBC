// A squad's gym and its training schedule are set once, against the team,
// and everything else reads them: the Teams page shows them, and a practice
// created without a venue inherits the squad's hall instead of a blank.
//
//   npm test

import { test, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.DATABASE_PATH = join(mkdtempSync(join(tmpdir(), "ibc-teamsched-")), "t.db");
process.env.SESSION_SECRET = "test-secret";

const { query, run, getTeamPracticeGym, getSlotsByTeamId, replaceSlotsForTeam } =
  await import("@/lib/db");

let teamId, otherTeamId, sismondi, bout;
before(() => {
  [teamId, otherTeamId] = query("SELECT id FROM teams ORDER BY sort_order LIMIT 2").map((t) => t.id);
  run("DELETE FROM team_gyms");
  sismondi = Number(run("INSERT INTO gyms (name, address) VALUES ('Collège Sismondi', 'Chemin Eugène-Rigot 3')").lastInsertRowid);
  bout = Number(run("INSERT INTO gyms (name, address) VALUES ('Bout-du-Monde', 'Route de Vessy 12')").lastInsertRowid);
});

test("a squad's practice gym is its first hall linked for practice", () => {
  run("INSERT INTO team_gyms (team_id, gym_id, usage, sort_order) VALUES (?, ?, 'games', 0)", [teamId, bout]);
  run("INSERT INTO team_gyms (team_id, gym_id, usage, sort_order) VALUES (?, ?, 'practice', 1)", [teamId, sismondi]);
  // A games-only hall is not where the squad trains.
  assert.equal(getTeamPracticeGym(teamId).name, "Collège Sismondi");
});

test("a squad with no linked hall has no practice gym", () => {
  assert.equal(getTeamPracticeGym(otherTeamId), null);
  assert.equal(getTeamPracticeGym(null), null);
});

test("the Teams page schedule is grouped per squad, Monday first, Sunday last", () => {
  replaceSlotsForTeam(teamId, [
    { weekday: 0, start_time: "10:00", end_time: "12:00" }, // Sunday
    { weekday: 3, start_time: "14:00", end_time: "16:00", gym_id: sismondi }, // Wednesday
    { weekday: 1, start_time: "20:00", end_time: "22:00" }, // Monday
  ]);
  replaceSlotsForTeam(otherTeamId, [{ weekday: 5, start_time: "18:00", end_time: "19:30" }]);

  const byTeam = getSlotsByTeamId();
  assert.deepEqual(byTeam[teamId].map((s) => s.weekday), [1, 3, 0]);
  assert.equal(byTeam[teamId][1].gym_name, "Collège Sismondi");
  assert.equal(byTeam[otherTeamId].length, 1, "one squad's slots never leak into another's");
});
