// The bug this pins: a game played yesterday did not show up in the
// newsletter, because the results window stopped at the Sunday before the
// Monday being built for. A coach who enters a score mid-week and sees
// nothing reasonably concludes the feature is broken.
//
//   npm test

import { test, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.DATABASE_PATH = join(mkdtempSync(join(tmpdir(), "ibc-nlres-")), "t.db");
process.env.SESSION_SECRET = "test-secret";

const { query, run } = await import("@/lib/db");
const { buildBlocks, mondayOf } = await import("@/lib/newsletter-build");
const { toISODate, addDays } = await import("@/lib/dates");

const resultsOf = (blocks) => blocks.find((b) => b.type === "results")?.games || [];

let teamId, players;
before(() => {
  // The squad that actually has seeded players — the first by sort_order is
  // the youth team, which has none.
  teamId = query(
    `SELECT team_id AS id FROM players WHERE team_id IS NOT NULL
     GROUP BY team_id ORDER BY COUNT(*) DESC LIMIT 1`
  )[0].id;
  players = query("SELECT id, first_name, last_name FROM players WHERE team_id = ? LIMIT 3", [teamId]);
  assert.ok(players.length >= 2, "fixture needs at least two players on the squad");
});

function addGame({ date, kind = "game", opponent = "BBC Meyrin", us = 78, them = 70 }) {
  const { lastInsertRowid } = run(
    `INSERT INTO practices (kind, title, practice_date, start_time, end_time, opponent, score_us, score_them, team_id)
     VALUES (?, 'Game', ?, '20:00', '22:00', ?, ?, ?, ?)`,
    [kind, date, opponent, us, them, teamId]
  );
  return Number(lastInsertRowid);
}

test("a game played YESTERDAY appears in an issue built today", () => {
  const yesterday = addDays(toISODate(new Date()), -1);
  const id = addGame({ date: yesterday });
  run("INSERT INTO game_stats (practice_id, player_id, points) VALUES (?, ?, 21)", [id, players[0].id]);

  const games = resultsOf(buildBlocks({ teamId, weekStart: mondayOf() }));
  assert.ok(
    games.some((g) => g.practice_date === yesterday),
    "yesterday's game must be in this week's issue, not held back until next Monday"
  );
});

test("a game with no score entered is not reported as a result", () => {
  const yesterday = addDays(toISODate(new Date()), -1);
  run(
    `INSERT INTO practices (kind, title, practice_date, start_time, end_time, opponent, team_id)
     VALUES ('game', 'Game', ?, '18:00', '20:00', 'Unplayed FC', ?)`,
    [yesterday, teamId]
  );
  const games = resultsOf(buildBlocks({ teamId, weekStart: mondayOf() }));
  assert.equal(games.filter((g) => g.opponent === "Unplayed FC").length, 0);
});

test("leaders come from what the coach entered, and ties name everyone", () => {
  const yesterday = addDays(toISODate(new Date()), -1);
  const id = addGame({ date: yesterday, opponent: "Lancy Basket" });
  run("INSERT INTO game_stats (practice_id, player_id, points, rebounds, assists, three_pointers, minutes) VALUES (?,?,?,?,?,?,?)",
    [id, players[0].id, 30, 4, 2, 5, 32]);
  run("INSERT INTO game_stats (practice_id, player_id, points, rebounds, assists, three_pointers, minutes) VALUES (?,?,?,?,?,?,?)",
    [id, players[1].id, 12, 11, 9, 5, 28]);

  const game = resultsOf(buildBlocks({ teamId, weekStart: mondayOf() })).find(
    (g) => g.opponent === "Lancy Basket"
  );
  const by = Object.fromEntries(game.leaders.map((l) => [l.category, l]));

  assert.equal(by.points.value, 30);
  assert.deepEqual(by.points.names, [`${players[0].first_name} ${players[0].last_name}`.trim()]);
  assert.equal(by.rebounds.value, 11);
  assert.equal(by.assists.value, 9);
  assert.equal(by.minutes.value, 32);
  // Both hit five threes — naming one of them would be arbitrary.
  assert.equal(by.three_pointers.value, 5);
  assert.equal(by.three_pointers.names.length, 2);
});

test("a friendly is reported, and flagged as one", () => {
  const yesterday = addDays(toISODate(new Date()), -1);
  addGame({ date: yesterday, kind: "friendly", opponent: "Works Team" });
  const game = resultsOf(buildBlocks({ teamId, weekStart: mondayOf() })).find(
    (g) => g.opponent === "Works Team"
  );
  assert.ok(game, "a friendly result still belongs in the newsletter");
  assert.equal(game.friendly, true, "but it must be marked, not passed off as a league result");
});
