// Keeps declared multi-day absences and per-event presence marks in sync.
//
// The two used to be separate: a player declared "away 3–12 October" and the
// calendar showed a badge, but the headcount still counted them as
// unanswered. Now a declaration writes a real "out" mark on every session it
// covers, so the coach's roster and every count are right without anyone
// clicking event by event.
//
// The whole thing hinges on `practice_rsvp.availability_id`:
//
//   - set   -> this mark was written BY a declaration and may be withdrawn
//              automatically when that declaration is deleted.
//   - NULL  -> someone clicked it by hand. Never touched by cleanup, which
//              is what makes "declared away, but I'll make Thursday's game"
//              survive deleting the travel entry afterwards.
//
// Server-only: imports the database.

import { get, query, run } from "@/lib/db";

/** The login attached to a player profile, or null if they have no account yet. */
function ownerUserId(playerId) {
  return get("SELECT id FROM users WHERE player_id = ?", [playerId])?.id ?? null;
}

/**
 * Mark a player absent on every session inside a declared window.
 *
 * Overwrites an existing mark on purpose — the declaration is the more
 * recent statement of intent — but stamps it with the declaration id so the
 * mark can be withdrawn cleanly later.
 */
export function applyAbsenceWindow({ availabilityId, playerId, startDate, endDate }) {
  const userId = ownerUserId(playerId);
  if (!userId) return 0; // no login yet — nothing to attach a mark to

  const teamId = get("SELECT team_id FROM players WHERE id = ?", [playerId])?.team_id ?? null;

  const sessions = query(
    `SELECT id FROM practices
     WHERE practice_date >= ? AND practice_date <= ?
       AND (team_id IS ? OR team_id IS NULL)`,
    [startDate, endDate, teamId]
  );

  for (const s of sessions) {
    run(
      `INSERT INTO practice_rsvp (practice_id, user_id, status, note, availability_id, updated_at)
       VALUES (?, ?, 'out', ?, ?, datetime('now'))
       ON CONFLICT(practice_id, user_id) DO UPDATE SET
         status = 'out',
         note = excluded.note,
         availability_id = excluded.availability_id,
         updated_at = datetime('now')`,
      [s.id, userId, "Absence déclarée", availabilityId]
    );
  }
  return sessions.length;
}

/**
 * Withdraw the marks a declaration created, leaving hand-set marks alone.
 * Call this BEFORE deleting the availability row, while the id still
 * resolves.
 */
export function clearAbsenceWindow(availabilityId) {
  const { changes } = run("DELETE FROM practice_rsvp WHERE availability_id = ?", [availabilityId]);
  return changes;
}

/**
 * Re-sync one session against every declaration.
 *
 * Idempotent, and safe to call after a reschedule: it first drops the
 * auto-marks whose window no longer covers the session's date (so moving a
 * game out of someone's holiday un-marks them), then re-applies the ones
 * that do. Hand-set marks (availability_id NULL) are never in scope.
 */
export function applyAbsencesToPractice(practiceId) {
  const practice = get(
    "SELECT id, practice_date, team_id FROM practices WHERE id = ?",
    [practiceId]
  );
  if (!practice) return 0;

  run(
    `DELETE FROM practice_rsvp
     WHERE practice_id = ?
       AND availability_id IS NOT NULL
       AND availability_id NOT IN (
         SELECT id FROM availability WHERE start_date <= ? AND ? <= end_date
       )`,
    [practice.id, practice.practice_date, practice.practice_date]
  );

  // Everyone whose declaration covers this date and who is on the squad the
  // session belongs to (a club-wide session, team_id NULL, covers everyone).
  const rows = query(
    `SELECT a.id as availability_id, a.player_id, u.id as user_id
     FROM availability a
     JOIN players p ON p.id = a.player_id
     JOIN users u ON u.player_id = p.id
     WHERE a.start_date <= ? AND ? <= a.end_date
       AND (? IS NULL OR p.team_id IS ?)`,
    [practice.practice_date, practice.practice_date, practice.team_id, practice.team_id]
  );

  for (const r of rows) {
    run(
      `INSERT INTO practice_rsvp (practice_id, user_id, status, note, availability_id, updated_at)
       VALUES (?, ?, 'out', ?, ?, datetime('now'))
       ON CONFLICT(practice_id, user_id) DO UPDATE SET
         status = 'out',
         note = excluded.note,
         availability_id = excluded.availability_id,
         updated_at = datetime('now')`,
      [practice.id, r.user_id, "Absence déclarée", r.availability_id]
    );
  }
  return rows.length;
}

/** Same, for a batch of freshly-created sessions (generator / CSV import). */
export function applyAbsencesToPractices(practiceIds) {
  let n = 0;
  for (const id of practiceIds) n += applyAbsencesToPractice(id);
  return n;
}
