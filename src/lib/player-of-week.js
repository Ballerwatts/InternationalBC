// Who the club is calling player of the week.
//
// Derived rather than stored: it is whoever scored most across this week's
// official games for their squad. A stored flag would need clearing every
// Monday, and would go stale the moment nobody remembered to.

import { get } from "@/lib/db";
import { OFFICIAL_KINDS } from "@/lib/event-kinds";
import { mondayOfISO, addDays } from "@/lib/dates";

/**
 * @returns {{ points: number, games: number } | null} — null when this
 * player is not the current pick, or nothing has been recorded this week.
 */
export function playerOfWeekFor(playerId, teamId) {
  if (!playerId) return null;
  const weekStart = mondayOfISO();
  const weekEnd = addDays(weekStart, 6);
  const kinds = OFFICIAL_KINDS.map(() => "?").join(", ");

  const top = get(
    `SELECT gs.player_id, SUM(gs.points) AS pts, COUNT(*) AS games
     FROM game_stats gs
     JOIN practices pr ON pr.id = gs.practice_id
     JOIN players p ON p.id = gs.player_id
     WHERE pr.practice_date >= ? AND pr.practice_date <= ?
       AND pr.kind IN (${kinds})
       AND p.team_id IS ?
     GROUP BY gs.player_id
     HAVING pts > 0
     ORDER BY pts DESC, games ASC
     LIMIT 1`,
    [weekStart, weekEnd, ...OFFICIAL_KINDS, teamId ?? null]
  );

  if (!top || Number(top.player_id) !== Number(playerId)) return null;
  return { points: Number(top.pts), games: Number(top.games) };
}
