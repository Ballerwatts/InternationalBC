// Averages have to be honest about missing data. A coach who logs rebounds
// for two games out of ten must see the average of those two — dividing by
// ten would quietly understate every player, and that number ends up on a
// public profile page.
//
//   npm test

import { test, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.DATABASE_PATH = join(mkdtempSync(join(tmpdir(), "ibc-box-")), "t.db");
process.env.SESSION_SECRET = "test-secret";

const { query, run } = await import("@/lib/db");
const { statsForPlayer, recordedTotalsByPlayer, playerStats } = await import("@/lib/stats");

let player, gameIds;
before(() => {
  player = query("SELECT * FROM players ORDER BY id LIMIT 1")[0];
  gameIds = [];
  for (let i = 0; i < 3; i++) {
    const { lastInsertRowid } = run(
      `INSERT INTO practices (kind, title, practice_date, start_time, end_time)
       VALUES ('game', 'Match', ?, '20:00', '22:00')`,
      [`2026-11-0${i + 1}`]
    );
    gameIds.push(Number(lastInsertRowid));
  }
});

test("points average over every recorded game", () => {
  for (const [i, pts] of [10, 20, 30].entries()) {
    run("INSERT INTO game_stats (practice_id, player_id, points) VALUES (?, ?, ?)", [
      gameIds[i], player.id, pts,
    ]);
  }
  const s = statsForPlayer(player);
  assert.equal(s.source, "recorded");
  assert.equal(s.games, 3);
  assert.equal(s.points, 60);
  assert.equal(s.ppg, 20);
});

test("rebounds average over the games they were recorded in, not all games", () => {
  // Rebounds logged for two of the three games: 8 and 10.
  run("UPDATE game_stats SET rebounds = 8 WHERE practice_id = ? AND player_id = ?", [gameIds[0], player.id]);
  run("UPDATE game_stats SET rebounds = 10 WHERE practice_id = ? AND player_id = ?", [gameIds[1], player.id]);
  const s = statsForPlayer(player);
  assert.equal(s.rebounds, 18);
  assert.equal(s.reboundGames, 2);
  assert.equal(s.rpg, 9); // 18/2, NOT 18/3 = 6
});

test("a recorded zero is a zero, not missing data", () => {
  run("UPDATE game_stats SET three_pointers = 0 WHERE practice_id = ? AND player_id = ?", [gameIds[0], player.id]);
  run("UPDATE game_stats SET three_pointers = 4 WHERE practice_id = ? AND player_id = ?", [gameIds[1], player.id]);
  const s = statsForPlayer(player);
  assert.equal(s.threePointers, 4);
  assert.equal(s.threeGames, 2); // the zero counts as recorded
  assert.equal(s.threePerGame, 2); // 4/2
});

test("a stat never recorded comes back null, not zero", () => {
  const s = statsForPlayer(player);
  assert.equal(s.minutes, null);
  assert.equal(s.mpg, null);
  assert.equal(s.minuteGames, 0);
});

test("minutes average once recorded", () => {
  run("UPDATE game_stats SET minutes = 30 WHERE practice_id = ? AND player_id = ?", [gameIds[0], player.id]);
  run("UPDATE game_stats SET minutes = 20 WHERE practice_id = ? AND player_id = ?", [gameIds[2], player.id]);
  const s = statsForPlayer(player);
  assert.equal(s.minutes, 50);
  assert.equal(s.mpg, 25);
});

test("a player with no box score keeps last season's hand-typed figures", () => {
  const other = query("SELECT * FROM players ORDER BY id LIMIT 1 OFFSET 1")[0];
  const s = playerStats(other, recordedTotalsByPlayer()[other.id]);
  assert.equal(s.source, "manual");
  assert.equal(s.games, other.games_played);
  assert.equal(s.rpg, null);
});

// --- official games only ---

test("a friendly's box score is excluded from season averages", async () => {
  const { lastInsertRowid } = run(
    `INSERT INTO practices (kind, title, practice_date, start_time, end_time)
     VALUES ('friendly', 'Amical', '2026-11-20', '20:00', '22:00')`
  );
  // A 50-point friendly would drag PPG up hard if it counted.
  run("INSERT INTO game_stats (practice_id, player_id, points, rebounds) VALUES (?, ?, 50, 20)", [
    Number(lastInsertRowid), player.id,
  ]);

  const s = statsForPlayer(player);
  assert.equal(s.games, 3, "the friendly must not add a game");
  assert.equal(s.points, 60, "the friendly's 50 points must not count");
  assert.equal(s.ppg, 20);
  assert.equal(s.rebounds, 18, "nor its rebounds");
});

test("assists average over the games they were recorded in", () => {
  const games = query(
    "SELECT id FROM practices WHERE kind = 'game' ORDER BY practice_date LIMIT 2"
  );
  run("UPDATE game_stats SET assists = 5 WHERE practice_id = ? AND player_id = ?", [games[0].id, player.id]);
  run("UPDATE game_stats SET assists = 3 WHERE practice_id = ? AND player_id = ?", [games[1].id, player.id]);
  const s = statsForPlayer(player);
  assert.equal(s.assists, 8);
  assert.equal(s.assistGames, 2);
  assert.equal(s.apg, 4);
});
