// Who receives a given newsletter issue.
//
// Server-only (it reads the database). The output is deliberately a frozen
// list rather than a query re-run at send time: resolve it twice a week
// apart and you get different answers, which would make the delivery log
// unauditable.

import { query } from "@/lib/db";

export const SOURCES = ["players", "users", "guardians"];

/** "players,users" -> ["players","users"], garbage -> []. */
export function parseAudience(value) {
  if (Array.isArray(value)) return value.filter((s) => SOURCES.includes(s));
  if (typeof value !== "string" || !value.trim()) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => SOURCES.includes(s));
}

export function serializeAudience(audience) {
  return parseAudience(audience).join(",");
}

// Good enough for "did someone fat-finger this", which is all we need —
// the SMTP server is the real authority on deliverability.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(email) {
  return EMAIL_RE.test(String(email || "").trim());
}

/**
 * Under-18 check for guardian mail. birth_date is the real answer; when it
 * is missing we fall back to "is this player in a squad whose name or
 * category says U18". Erring towards *not* mailing a guardian is the safe
 * direction — a missed newsletter beats mailing a stranger about an adult.
 */
export function isMinor(player, team, today = new Date()) {
  if (player?.birth_date) {
    const d = new Date(`${player.birth_date}T00:00:00`);
    if (!Number.isNaN(d.getTime())) {
      let age = today.getFullYear() - d.getFullYear();
      const m = today.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
      return age < 18;
    }
  }
  return isYouthTeam(team);
}

/** "IBBC Youth Men's Team (U18M)" / category "U18M — Youth Men" -> true. */
export function isYouthTeam(team) {
  const label = `${team?.name || ""} ${team?.category || ""}`.toUpperCase();
  return /\bU(?:1[0-8]|[1-9])[A-Z]?\b/.test(label) || /\bYOUTH\b/.test(label);
}

/**
 * Resolve one issue's recipients.
 *
 * @param {{ teamId?: number|null, audience?: string|string[] }} opts
 * @returns {{ recipients: Array, skipped: Array, counts: object, total: number }}
 *   `recipients` are deliverable; `skipped` carry a reason (opted out /
 *   invalid / duplicate) so the compose screen can say why 45 became 42
 *   instead of quietly showing a smaller number.
 */
export function resolveRecipients({ teamId = null, audience = "players,users" } = {}) {
  const wanted = parseAudience(audience);
  const team = teamId ? Number(teamId) : null;

  const teams = query("SELECT id, name, category FROM teams");
  const teamById = new Map(teams.map((t) => [t.id, t]));

  const optedOut = new Set(
    query("SELECT email FROM email_optouts").map((r) => String(r.email).trim().toLowerCase())
  );

  /** @type {Array<{email,name,source,player_id,user_id,team_id}>} */
  const candidates = [];

  if (wanted.includes("players")) {
    const rows = team
      ? query("SELECT * FROM players WHERE active = 1 AND team_id = ?", [team])
      : query("SELECT * FROM players WHERE active = 1");
    for (const p of rows) {
      candidates.push({
        email: p.email,
        name: `${p.first_name} ${p.last_name}`.trim(),
        source: "player",
        player_id: p.id,
        user_id: null,
        team_id: p.team_id ?? null,
      });
    }
  }

  if (wanted.includes("users")) {
    const rows = team
      ? query("SELECT * FROM users WHERE active = 1 AND team_id = ?", [team])
      : query("SELECT * FROM users WHERE active = 1");
    for (const u of rows) {
      candidates.push({
        email: u.email,
        name: u.name,
        source: "user",
        player_id: u.player_id ?? null,
        user_id: u.id,
        team_id: u.team_id ?? null,
      });
    }
  }

  if (wanted.includes("guardians")) {
    // A guardian only ever receives their own child's squad's issue, so the
    // team filter is applied to the *player*, not to the guardian row.
    const rows = team
      ? query(
          `SELECT g.*, p.first_name, p.last_name, p.birth_date, p.team_id AS player_team_id
           FROM player_guardians g
           JOIN players p ON p.id = g.player_id
           WHERE g.receives_newsletter = 1 AND p.active = 1 AND p.team_id = ?`,
          [team]
        )
      : query(
          `SELECT g.*, p.first_name, p.last_name, p.birth_date, p.team_id AS player_team_id
           FROM player_guardians g
           JOIN players p ON p.id = g.player_id
           WHERE g.receives_newsletter = 1 AND p.active = 1`
        );
    for (const g of rows) {
      const player = { birth_date: g.birth_date };
      if (!isMinor(player, teamById.get(g.player_team_id))) continue;
      candidates.push({
        email: g.email,
        name: g.name,
        source: "guardian",
        player_id: g.player_id,
        user_id: null,
        team_id: g.player_team_id ?? null,
      });
    }
  }

  const recipients = [];
  const skipped = [];
  const seen = new Map(); // lowercased address -> the row that won

  for (const c of candidates) {
    const email = String(c.email || "").trim();
    const lower = email.toLowerCase();

    if (!isValidEmail(email)) {
      // No address at all is the normal case for a player who never gave
      // one — not worth a row in the skipped list, it would drown the real
      // problems.
      if (email) skipped.push({ ...c, reason: "invalid_email" });
      continue;
    }
    if (optedOut.has(lower)) {
      skipped.push({ ...c, email, reason: "opted_out" });
      continue;
    }
    if (seen.has(lower)) {
      // A coach who is also a player must get exactly one copy. First
      // source wins; the duplicate is recorded rather than vanishing.
      skipped.push({ ...c, email, reason: "duplicate", kept_source: seen.get(lower).source });
      continue;
    }
    const row = { ...c, email };
    seen.set(lower, row);
    recipients.push(row);
  }

  const counts = { player: 0, user: 0, guardian: 0 };
  for (const r of recipients) counts[r.source]++;

  return {
    recipients,
    skipped,
    counts,
    total: recipients.length,
    teamId: team,
    audience: wanted,
  };
}

/** "42 recipients — 18 players, 20 accounts, 4 guardians" */
export function describeCounts(counts, total) {
  const parts = [];
  if (counts.player) parts.push(`${counts.player} player${counts.player > 1 ? "s" : ""}`);
  if (counts.user) parts.push(`${counts.user} account${counts.user > 1 ? "s" : ""}`);
  if (counts.guardian) parts.push(`${counts.guardian} guardian${counts.guardian > 1 ? "s" : ""}`);
  if (!parts.length) return "No recipients";
  return `${total} recipient${total > 1 ? "s" : ""} — ${parts.join(", ")}`;
}
