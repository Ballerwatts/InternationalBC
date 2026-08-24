// Assembles the auto-draft: last week's results, what's coming up, player
// of the week, the practice focus, club news, sponsors.
//
// Server-only. Every query here takes the same `teamId` the audience
// resolver takes, because a newsletter addressed to one squad that quotes
// another squad's scores is worse than no newsletter at all. That property
// is what tests/newsletter-segmentation.test.js asserts.

import { query, get, getAllSettings } from "@/lib/db";

export function mondayOf(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().slice(0, 10);
}

export function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * `team_id = ?` for a squad issue; for the club-wide issue everything is in
 * scope, squad-less events included. Returned as a fragment + params so
 * every query below is filtered identically and none can be forgotten.
 */
function teamFilter(teamId, column = "team_id") {
  return teamId ? { sql: ` AND ${column} = ?`, params: [Number(teamId)] } : { sql: "", params: [] };
}

function topScorerFor(practiceId) {
  return get(
    `SELECT p.first_name, p.last_name, gs.points
     FROM game_stats gs JOIN players p ON p.id = gs.player_id
     WHERE gs.practice_id = ? AND gs.points > 0
     ORDER BY gs.points DESC LIMIT 1`,
    [practiceId]
  );
}

/**
 * @param {{ teamId?: number|null, weekStart?: string, siteUrl?: string }} opts
 * @returns {Array} ordered blocks, ready for renderNewsletter()
 */
export function buildBlocks({ teamId = null, weekStart = mondayOf(), siteUrl = "" } = {}) {
  const settings = getAllSettings();
  const site = String(siteUrl || process.env.SITE_URL || "https://internationalbc.fly.dev").replace(/\/+$/, "");

  // Last week: the seven days before the Monday we are building for.
  const lastWeekStart = addDays(weekStart, -7);
  const lastWeekEnd = addDays(weekStart, -1);
  // Ahead: this week plus the next, which is what a Monday email is for.
  const aheadEnd = addDays(weekStart, 13);

  const tf = teamFilter(teamId);

  /* results — games with a score, from the week just gone */
  const games = query(
    `SELECT * FROM practices
     WHERE kind = 'game' AND practice_date >= ? AND practice_date <= ?${tf.sql}
     ORDER BY practice_date ASC`,
    [lastWeekStart, lastWeekEnd, ...tf.params]
  ).map((g) => {
    const top = topScorerFor(g.id);
    return {
      id: g.id,
      team_id: g.team_id ?? null,
      practice_date: g.practice_date,
      opponent: g.opponent,
      score_us: g.score_us,
      score_them: g.score_them,
      recap: g.recap,
      top_scorer: top ? { name: `${top.first_name} ${top.last_name}`.trim(), points: top.points } : null,
    };
  });

  /* fixtures — the next fortnight */
  const events = query(
    `SELECT * FROM practices
     WHERE practice_date >= ? AND practice_date <= ?${tf.sql}
     ORDER BY practice_date ASC, start_time ASC`,
    [weekStart, aheadEnd, ...tf.params]
  ).map((e) => ({
    id: e.id,
    team_id: e.team_id ?? null,
    practice_date: e.practice_date,
    start_time: e.start_time,
    end_time: e.end_time,
    kind: e.kind,
    title: e.title,
    opponent: e.opponent,
    location_name: e.location_name,
    location_address: e.location_address,
  }));

  /* player of the week — top scorer across last week's games, this squad only */
  const scorer = get(
    `SELECT p.id, p.first_name, p.last_name, p.jersey_number, p.photo_data_url, p.team_id,
            SUM(gs.points) AS pts, COUNT(*) AS games
     FROM game_stats gs
     JOIN players p ON p.id = gs.player_id
     JOIN practices pr ON pr.id = gs.practice_id
     WHERE pr.practice_date >= ? AND pr.practice_date <= ?${teamId ? " AND p.team_id = ?" : ""}
     GROUP BY p.id
     HAVING pts > 0
     ORDER BY pts DESC
     LIMIT 1`,
    teamId ? [lastWeekStart, lastWeekEnd, Number(teamId)] : [lastWeekStart, lastWeekEnd]
  );

  /* practice board for the week */
  const board = get(
    `SELECT * FROM practice_board WHERE week_start_date = ?${tf.sql} ORDER BY id DESC LIMIT 1`,
    [weekStart, ...tf.params]
  );

  /* announcements — this squad's, plus club-wide ones */
  const news = query(
    teamId
      ? `SELECT * FROM announcements
         WHERE published = 1 AND (team_id = ? OR team_id IS NULL)
         ORDER BY created_at DESC LIMIT 3`
      : `SELECT * FROM announcements WHERE published = 1 ORDER BY created_at DESC LIMIT 3`,
    teamId ? [Number(teamId)] : []
  ).map((n) => ({
    id: n.id,
    team_id: n.team_id ?? null,
    title: n.title,
    excerpt: excerpt(n.body),
    url: site,
  }));

  /* sponsors are always club-wide — that is the deal we sell them */
  const sponsors = query("SELECT * FROM sponsors ORDER BY sort_order ASC, id ASC").map((s) => ({
    id: s.id,
    name: s.name,
    // A logo stored as a data: URI cannot render in Gmail. Rather than ship
    // a broken image we drop the sponsor from the email; email-template.js
    // filters these out again as a belt-and-braces check.
    logo_url: /^https?:\/\//i.test(String(s.logo_data_url || "")) ? s.logo_data_url : null,
    website_url: s.website_url,
  }));

  const blocks = [
    { type: "intro", text: "" },
    { type: "results", games },
    { type: "fixtures", events },
    {
      type: "player",
      player: scorer
        ? {
            id: scorer.id,
            team_id: scorer.team_id ?? null,
            name: `${scorer.first_name} ${scorer.last_name}`.trim(),
            jersey: scorer.jersey_number || "",
            stat_line: `${scorer.pts} points in ${scorer.games} game${scorer.games > 1 ? "s" : ""}`,
            photo_url: /^https?:\/\//i.test(String(scorer.photo_data_url || "")) ? scorer.photo_data_url : null,
            note: "",
          }
        : null,
    },
    {
      type: "practice",
      focus: board?.focus || "",
      drills: board?.drills || "",
      notes: board?.notes || "",
      team_id: board?.team_id ?? null,
    },
    { type: "news", items: news },
    { type: "sponsors", sponsors },
  ];

  return blocks;
}

/** True when a draft would be nothing but empty headings. */
export function blocksAreEmpty(blocks) {
  const meaningful = { results: "games", fixtures: "events", news: "items" };
  for (const b of blocks || []) {
    if (meaningful[b.type] && (b[meaningful[b.type]] || []).length) return false;
    if (b.type === "player" && b.player) return false;
    if (b.type === "practice" && (b.focus || b.drills)) return false;
    if (b.type === "intro" && String(b.text || "").trim()) return false;
  }
  return true;
}

function excerpt(body, max = 180) {
  const flat = String(body || "").replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max).replace(/\s+\S*$/, "")}…`;
}

export function defaultSubject({ team, weekStart, settings }) {
  const label = team ? team.name : settings?.club_name || "International Basketball Club Genève";
  const d = new Date(`${weekStart}T00:00:00`);
  const week = d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
  return `${label} — week of ${week}`;
}
