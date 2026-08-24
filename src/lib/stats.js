// Player season statistics.
//
// Two sources exist, deliberately:
//
//   1. `game_stats` rows — points recorded per player per game by a coach.
//      As soon as a player has at least one row, this wins: games played,
//      total points and PPG are all derived, so the roster can never drift
//      out of step with the results on the calendar.
//   2. The hand-typed `players.games_played / total_points / ppg` columns —
//      the figures already in the database from before results existed.
//      They remain the fallback for anyone with no recorded game yet, so
//      seeding the new feature doesn't blank out last season's numbers.
//
// `source` on the returned object says which one was used, so the UI can
// label historical figures honestly.

import { query } from "@/lib/db";

/** Season stats for one player row (needs id + the three legacy columns). */
export function playerStats(player, recorded) {
  const games = recorded?.games || 0;
  if (games > 0) {
    const points = recorded.points || 0;
    return {
      games,
      points,
      ppg: Math.round((points / games) * 10) / 10,
      source: "recorded",
    };
  }
  return {
    games: player.games_played || 0,
    points: player.total_points || 0,
    ppg: player.ppg || 0,
    source: "manual",
  };
}

/** player_id -> { games, points } from recorded box scores. */
export function recordedTotalsByPlayer() {
  const rows = query(
    `SELECT player_id, COUNT(*) as games, COALESCE(SUM(points), 0) as points
     FROM game_stats GROUP BY player_id`
  );
  const byPlayer = {};
  for (const r of rows) byPlayer[r.player_id] = { games: r.games, points: r.points };
  return byPlayer;
}

/** Convenience for a single player. */
export function statsForPlayer(player) {
  const rows = query(
    `SELECT COUNT(*) as games, COALESCE(SUM(points), 0) as points
     FROM game_stats WHERE player_id = ?`,
    [player.id]
  );
  return playerStats(player, rows[0]);
}

// gameOutcome() lives in src/lib/game-result.js — this module imports the
// database, so anything a client component needs must stay out of it.
