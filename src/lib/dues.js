// Shared season-dues arithmetic, so the admin budget tracker and a member's
// own profile page always agree on what someone owes.
//
// A player's total due is the club-wide gym + licence + referee split from
// settings, unless that player has a custom_due_amount override. What they
// have paid is the sum of their rows in the payments table for the season.

import { get, query, getAllSettings } from "@/lib/db";

export const CURRENT_SEASON = "2026-2027";

export function getDueSplit(settings = getAllSettings()) {
  const gym = Number(settings.budget_gym) || 0;
  const license = Number(settings.budget_license) || 0;
  const referee = Number(settings.budget_referee) || 0;
  return { gym, license, referee, defaultTotal: gym + license + referee };
}

function buildRow(player, paidByCategory, split) {
  const paid = paidByCategory || {};
  const totalPaid =
    (paid.gym || 0) + (paid.license || 0) + (paid.referee || 0) + (paid.other || 0);
  const totalDue =
    player.custom_due_amount != null ? Number(player.custom_due_amount) : split.defaultTotal;
  // Licence is tracked on its own so it can show green/red independently of
  // the overall balance.
  const licensePaid = (paid.license || 0) >= split.license && split.license > 0;
  return {
    ...player,
    paid,
    totalPaid,
    totalDue,
    balance: totalDue - totalPaid,
    licensePaid,
    licenseDue: split.license,
  };
}

/** Dues for every player, oldest-roster-order first. */
export function getAllPlayerDues(season = CURRENT_SEASON) {
  const settings = getAllSettings();
  const split = getDueSplit(settings);
  const players = query(
    "SELECT id, first_name, last_name, jersey_number, active, custom_due_amount, team_id FROM players ORDER BY sort_order ASC, last_name ASC"
  );
  const paidRows = query(
    "SELECT player_id, category, SUM(amount) as total FROM payments WHERE season = ? GROUP BY player_id, category",
    [season]
  );

  const paidByPlayer = {};
  for (const row of paidRows) {
    paidByPlayer[row.player_id] = paidByPlayer[row.player_id] || {};
    paidByPlayer[row.player_id][row.category] = row.total;
  }

  return { split, rows: players.map((p) => buildRow(p, paidByPlayer[p.id], split)) };
}

/** Dues for one player — used by the member profile page. */
export function getPlayerDues(playerId, season = CURRENT_SEASON) {
  const player = get(
    "SELECT id, first_name, last_name, custom_due_amount FROM players WHERE id = ?",
    [playerId]
  );
  if (!player) return null;

  const split = getDueSplit();
  const paidRows = query(
    "SELECT category, SUM(amount) as total FROM payments WHERE season = ? AND player_id = ? GROUP BY category",
    [season, playerId]
  );
  const paid = {};
  for (const row of paidRows) paid[row.category] = row.total;

  return buildRow(player, paid, split);
}
