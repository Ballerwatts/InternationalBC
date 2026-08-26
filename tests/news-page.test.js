// A published issue must carry its whole content to the site, not just a
// headline — that was the reported gap. Plus the two rules around it:
// sponsors are always in an issue, and player of the week clears itself.
//
//   npm test

import { test, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.DATABASE_PATH = join(mkdtempSync(join(tmpdir(), "ibc-newspage-")), "t.db");
process.env.SESSION_SECRET = "test-secret";

const { query, run, get } = await import("@/lib/db");
const { publishNewsletterPost } = await import("@/lib/newsletter-post");
const { parseBlocks } = await import("@/lib/newsletter-send");
const { playerOfWeekFor } = await import("@/lib/player-of-week");
const { mondayOfISO } = await import("@/lib/dates");

let teamId, players;
before(() => {
  teamId = query(
    `SELECT team_id AS id FROM players WHERE team_id IS NOT NULL
     GROUP BY team_id ORDER BY COUNT(*) DESC LIMIT 1`
  )[0].id;
  players = query("SELECT * FROM players WHERE team_id = ? LIMIT 2", [teamId]);
});

test("publishing an issue carries its whole content to the announcement", () => {
  const blocks = [
    { type: "intro", text: "Belle semaine." },
    { type: "results", games: [{ id: 1, opponent: "Meyrin", score_us: 78, score_them: 70 }] },
    { type: "player", player: { name: "Iaroslav", stat_line: "30 points" } },
  ];
  const id = Number(
    run(
      "INSERT INTO newsletters (subject, blocks_json, status, post_enabled) VALUES ('Numéro', ?, 'draft', 1)",
      [JSON.stringify(blocks)]
    ).lastInsertRowid
  );
  publishNewsletterPost(id);

  const post = get("SELECT * FROM announcements WHERE newsletter_id = ?", [id]);
  assert.ok(post, "an announcement should exist");
  const carried = JSON.parse(post.blocks_json || "[]");
  assert.deepEqual(
    carried.map((b) => b.type),
    ["intro", "results", "player"],
    "the announcement must carry the issue's blocks, not just its title"
  );
  assert.equal(carried[1].games[0].opponent, "Meyrin");
});

test("a published issue does not loop back into the newsletter as club news", () => {
  const post = query("SELECT in_newsletter FROM announcements WHERE newsletter_id IS NOT NULL")[0];
  assert.equal(post.in_newsletter, 0, "an issue's own post must not be fed back into the next issue");
});

test("sponsors are put back into an issue that lost them", () => {
  run("INSERT INTO sponsors (name, website_url) VALUES ('Mama & Zita', 'https://example.org')");
  const issue = { blocks_json: JSON.stringify([{ type: "intro", text: "x" }]) };
  const blocks = parseBlocks(issue);
  assert.ok(
    blocks.some((b) => b.type === "sponsors" && b.sponsors.length === 1),
    "sponsors are part of the deal, not an editorial choice"
  );
});

test("player of the week is whoever scored most this week, and only them", () => {
  const monday = mondayOfISO();
  const gameId = Number(
    run(
      `INSERT INTO practices (kind, title, practice_date, start_time, end_time, team_id)
       VALUES ('game', 'Game', ?, '20:00', '22:00', ?)`,
      [monday, teamId]
    ).lastInsertRowid
  );
  run("INSERT INTO game_stats (practice_id, player_id, points) VALUES (?, ?, 30)", [gameId, players[0].id]);
  run("INSERT INTO game_stats (practice_id, player_id, points) VALUES (?, ?, 12)", [gameId, players[1].id]);

  assert.equal(playerOfWeekFor(players[0].id, teamId).points, 30);
  assert.equal(playerOfWeekFor(players[1].id, teamId), null, "only one player holds it");
});

test("a friendly does not decide player of the week", () => {
  const monday = mondayOfISO();
  const id = Number(
    run(
      `INSERT INTO practices (kind, title, practice_date, start_time, end_time, team_id)
       VALUES ('friendly', 'Amical', ?, '20:00', '22:00', ?)`,
      [monday, teamId]
    ).lastInsertRowid
  );
  run("INSERT INTO game_stats (practice_id, player_id, points) VALUES (?, ?, 99)", [id, players[1].id]);
  assert.equal(playerOfWeekFor(players[1].id, teamId), null);
  assert.equal(playerOfWeekFor(players[0].id, teamId).points, 30);
});
