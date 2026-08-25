import { run } from "@/lib/db";

export const GYM_USAGES = ["practice", "games", "both"];

const USAGE_SET = new Set(GYM_USAGES);

/** Human labels for the usage flag, EN + FR, so pages can pick per language. */
export const USAGE_LABELS = {
  practice: { en: "Practice", fr: "Entraînements" },
  games: { en: "Home games", fr: "Matches à domicile" },
  both: { en: "Practice & home games", fr: "Entraînements et matches" },
};

/**
 * Replace a gym's team assignments wholesale. The admin screen always sends
 * the complete list, so diffing would only add failure modes — and
 * UNIQUE(team_id, gym_id) makes delete-then-insert safe.
 */
export function replaceGymLinksForTeam(teamId, gyms) {
  if (!Array.isArray(gyms)) return;
  run("DELETE FROM team_gyms WHERE team_id = ?", [teamId]);
  gyms.forEach((g, i) => {
    const gymId = Number(g?.gym_id);
    if (!gymId) return;
    const usage = USAGE_SET.has(g?.usage) ? g.usage : "practice";
    run(
      "INSERT OR IGNORE INTO team_gyms (team_id, gym_id, usage, schedule_note, sort_order) VALUES (?, ?, ?, ?, ?)",
      [teamId, gymId, usage, (g?.schedule_note || "").trim() || null, i]
    );
  });
}

export function replaceTeamLinks(gymId, teams) {
  if (!Array.isArray(teams)) return;
  run("DELETE FROM team_gyms WHERE gym_id = ?", [gymId]);
  teams.forEach((t, i) => {
    const teamId = Number(t?.team_id);
    if (!teamId) return;
    const usage = USAGE_SET.has(t?.usage) ? t.usage : "practice";
    run(
      "INSERT OR IGNORE INTO team_gyms (team_id, gym_id, usage, schedule_note, sort_order) VALUES (?, ?, ?, ?, ?)",
      [teamId, gymId, usage, (t?.schedule_note || "").trim() || null, i]
    );
  });
}
