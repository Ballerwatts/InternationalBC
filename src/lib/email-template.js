// The newsletter HTML, and its plain-text twin.
//
// PURE MODULE — no database import, on purpose: the admin preview is a
// client component and renders through this exact function, so what an
// admin approves is byte-for-byte what the sender puts in the envelope.
// There is no second implementation to drift.
//
// The markup is deliberately 2004-era: nested tables, every rule inline,
// fixed 600px, no flexbox, no grid, no web font, no <style> beyond one
// small @media block. Gmail, Outlook and the Apple Mail dark-mode
// compositor between them strip or invert anything more modern.

const BLUE = "#2d3194"; // ≈ PMS 2143 C, the crest blue (see globals.css)
const BLUE_DARK = "#191c5c";
const INK = "#14173f";
const PAPER = "#f4f5fa";
const WHITE = "#ffffff";
const MUTED = "#6b6f8d";
const BORDER = "#e3e5f0";
const WIN = "#1a7f4b";
const LOSS = "#b3261e";

const FONT = "Arial, Helvetica, sans-serif";
const DEFAULT_SITE = "https://internationalbc.fly.dev";

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Gmail strips `data:` URIs, so a crest pasted in as base64 renders as a
 * broken box for most of the club. Every image in an email has to be an
 * absolute https URL that a mail client can fetch.
 */
export function absoluteUrl(url, siteUrl = DEFAULT_SITE) {
  const base = String(siteUrl || DEFAULT_SITE).replace(/\/+$/, "");
  if (!url) return null;
  const s = String(url);
  if (/^https:\/\//i.test(s)) return s;
  if (/^http:\/\//i.test(s)) return s;
  if (/^data:/i.test(s)) return null; // unusable in email — caller falls back
  return `${base}/${s.replace(/^\/+/, "")}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

/* ── small builders ──────────────────────────────────────────────────── */

function section(title, innerHtml) {
  return `
<tr>
  <td bgcolor="${WHITE}" style="background-color:${WHITE};padding:24px 28px 8px 28px;">
    <h2 style="margin:0 0 12px 0;font-family:${FONT};font-size:13px;line-height:18px;letter-spacing:1.5px;text-transform:uppercase;color:${BLUE};font-weight:bold;">${escapeHtml(title)}</h2>
  </td>
</tr>
<tr>
  <td bgcolor="${WHITE}" style="background-color:${WHITE};padding:0 28px 20px 28px;">${innerHtml}</td>
</tr>`;
}

/** Bulletproof CTA: a table, never a styled div — Outlook ignores the div. */
function button(label, href) {
  if (!href) return "";
  return `
<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:4px 0 0 0;">
  <tr>
    <td bgcolor="${BLUE}" style="background-color:${BLUE};border-radius:24px;">
      <a href="${escapeHtml(href)}" style="display:inline-block;padding:11px 24px;font-family:${FONT};font-size:13px;font-weight:bold;letter-spacing:0.6px;text-transform:uppercase;color:${WHITE};text-decoration:none;">${escapeHtml(label)}</a>
    </td>
  </tr>
</table>`;
}

function paragraph(text, extra = "") {
  return `<p style="margin:0 0 12px 0;font-family:${FONT};font-size:15px;line-height:23px;color:${INK};${extra}">${text}</p>`;
}

function image(src, alt, width, siteUrl) {
  const url = absoluteUrl(src, siteUrl);
  if (!url) return "";
  return `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt || "")}" width="${width}" style="display:block;border:0;outline:none;text-decoration:none;max-width:100%;height:auto;" />`;
}

/* ── content blocks ──────────────────────────────────────────────────── */
// Each returns "" when it has no data, so an empty block never leaves a
// dangling heading in the issue.

function introBlock(block) {
  const text = String(block.text || "").trim();
  if (!text) return "";
  const html = text
    .split(/\n{2,}/)
    .map((para) => paragraph(escapeHtml(para).replace(/\n/g, "<br />")))
    .join("");
  return `
<tr>
  <td bgcolor="${WHITE}" style="background-color:${WHITE};padding:24px 28px 4px 28px;">${html}</td>
</tr>`;
}

function resultsBlock(block) {
  const games = block.games || [];
  if (!games.length) return "";
  const rows = games
    .map((g) => {
      const won = g.score_us != null && g.score_them != null && g.score_us > g.score_them;
      const drawn = g.score_us != null && g.score_us === g.score_them;
      const badge = g.score_us == null ? "" : drawn ? "D" : won ? "W" : "L";
      const badgeColor = drawn ? MUTED : won ? WIN : LOSS;
      const score = g.score_us == null ? "—" : `${g.score_us} – ${g.score_them}`;
      return `
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin:0 0 12px 0;border:1px solid ${BORDER};border-radius:8px;">
  <tr>
    <td bgcolor="${WHITE}" style="background-color:${WHITE};padding:14px 16px;font-family:${FONT};">
      <p style="margin:0 0 2px 0;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${MUTED};">${escapeHtml(formatDate(g.practice_date))}</p>
      <p style="margin:0;font-size:16px;font-weight:bold;color:${INK};">
        ${badge ? `<span style="display:inline-block;min-width:20px;padding:1px 7px;margin-right:8px;border-radius:4px;background-color:${badgeColor};color:${WHITE};font-size:12px;">${badge}</span>` : ""}
        IBBC vs ${escapeHtml(g.opponent || "—")}
        <span style="color:${BLUE};">&nbsp;${escapeHtml(score)}</span>
      </p>
      ${g.top_scorer ? `<p style="margin:6px 0 0 0;font-size:13px;color:${MUTED};">Top scorer: <span style="color:${INK};font-weight:bold;">${escapeHtml(g.top_scorer.name)}</span> — ${escapeHtml(String(g.top_scorer.points))} pts</p>` : ""}
      ${g.recap ? `<p style="margin:8px 0 0 0;padding-left:10px;border-left:3px solid ${BORDER};font-size:14px;line-height:21px;color:${INK};font-style:italic;">${escapeHtml(g.recap)}</p>` : ""}
    </td>
  </tr>
</table>`;
    })
    .join("");
  return section("Results", rows);
}

function fixturesBlock(block, siteUrl) {
  const events = block.events || [];
  if (!events.length) return "";
  const rows = events
    .map((e) => {
      const label =
        e.kind === "game" ? `Game vs ${e.opponent || "TBD"}` : e.title || "Practice";
      const map = e.location_address
        ? `<a href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(e.location_address)}" style="color:${BLUE};text-decoration:underline;">map</a>`
        : "";
      return `
<tr>
  <td style="padding:9px 0;border-bottom:1px solid ${BORDER};font-family:${FONT};font-size:14px;line-height:20px;color:${INK};">
    <strong style="color:${BLUE};">${escapeHtml(formatDate(e.practice_date))}</strong>
    &nbsp;${escapeHtml(e.start_time || "")}${e.end_time ? `–${escapeHtml(e.end_time)}` : ""}<br />
    ${escapeHtml(label)}${e.location_name ? ` · ${escapeHtml(e.location_name)}` : ""}${map ? ` · ${map}` : ""}
  </td>
</tr>`;
    })
    .join("");
  const table = `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">${rows}</table>`;
  const cta = button("See the full calendar", `${String(siteUrl || DEFAULT_SITE).replace(/\/+$/, "")}/calendrier`);
  return section("What's coming up", `${table}<div style="height:16px;line-height:16px;">&nbsp;</div>${cta}`);
}

function playerBlock(block, siteUrl) {
  const p = block.player;
  if (!p || !p.name) return "";
  const photo = image(p.photo_url, p.name, 96, siteUrl);
  return section(
    "Player of the week",
    `
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:8px;">
  <tr>
    ${photo ? `<td bgcolor="${WHITE}" width="112" valign="top" style="background-color:${WHITE};padding:16px 0 16px 16px;">${photo}</td>` : ""}
    <td bgcolor="${WHITE}" valign="top" style="background-color:${WHITE};padding:16px;font-family:${FONT};">
      <p style="margin:0;font-size:17px;font-weight:bold;color:${INK};">${escapeHtml(p.name)}${p.jersey ? ` <span style="color:${MUTED};font-weight:normal;">#${escapeHtml(p.jersey)}</span>` : ""}</p>
      ${p.stat_line ? `<p style="margin:4px 0 0 0;font-size:13px;color:${BLUE};font-weight:bold;">${escapeHtml(p.stat_line)}</p>` : ""}
      ${p.note ? `<p style="margin:8px 0 0 0;font-size:14px;line-height:21px;color:${INK};">${escapeHtml(p.note)}</p>` : ""}
    </td>
  </tr>
</table>`
  );
}

function practiceBlock(block) {
  const focus = String(block.focus || "").trim();
  const drills = String(block.drills || "").trim();
  const notes = String(block.notes || "").trim();
  if (!focus && !drills && !notes) return "";
  const drillList = drills
    ? `<ul style="margin:8px 0 0 0;padding-left:20px;font-family:${FONT};font-size:14px;line-height:22px;color:${INK};">${drills
        .split("\n")
        .map((d) => d.trim())
        .filter(Boolean)
        .map((d) => `<li>${escapeHtml(d)}</li>`)
        .join("")}</ul>`
    : "";
  return section(
    "On the floor this week",
    `${focus ? paragraph(`<strong>${escapeHtml(focus)}</strong>`) : ""}${drillList}${
      notes ? paragraph(escapeHtml(notes).replace(/\n/g, "<br />"), "margin-top:12px;color:" + MUTED + ";font-size:14px;") : ""
    }`
  );
}

function newsBlock(block) {
  const items = block.items || [];
  if (!items.length) return "";
  const rows = items
    .map(
      (n) => `
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin:0 0 14px 0;">
  <tr>
    <td style="font-family:${FONT};">
      <p style="margin:0;font-size:16px;font-weight:bold;color:${INK};">${escapeHtml(n.title)}</p>
      ${n.excerpt ? `<p style="margin:5px 0 0 0;font-size:14px;line-height:21px;color:${INK};">${escapeHtml(n.excerpt)}</p>` : ""}
      ${n.url ? `<p style="margin:5px 0 0 0;font-size:13px;"><a href="${escapeHtml(n.url)}" style="color:${BLUE};text-decoration:underline;">Read more →</a></p>` : ""}
    </td>
  </tr>
</table>`
    )
    .join("");
  return section("Club news", rows);
}

function sponsorsBlock(block, siteUrl) {
  const sponsors = (block.sponsors || []).filter((s) => absoluteUrl(s.logo_url, siteUrl));
  if (!sponsors.length) return "";
  const cells = sponsors
    .map(
      (s) => `
<td align="center" valign="middle" style="padding:8px 10px;">
  ${s.website_url ? `<a href="${escapeHtml(s.website_url)}">` : ""}${image(s.logo_url, s.name, 110, siteUrl)}${s.website_url ? "</a>" : ""}
</td>`
    )
    .join("");
  return `
<tr>
  <td bgcolor="${PAPER}" style="background-color:${PAPER};padding:20px 28px;border-top:1px solid ${BORDER};">
    <p style="margin:0 0 10px 0;font-family:${FONT};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${MUTED};text-align:center;">With the support of</p>
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"><tr>${cells}</tr></table>
  </td>
</tr>`;
}

const BLOCK_RENDERERS = {
  intro: (b) => introBlock(b),
  results: (b) => resultsBlock(b),
  fixtures: (b, ctx) => fixturesBlock(b, ctx.siteUrl),
  player: (b, ctx) => playerBlock(b, ctx.siteUrl),
  practice: (b) => practiceBlock(b),
  news: (b) => newsBlock(b),
  sponsors: (b, ctx) => sponsorsBlock(b, ctx.siteUrl),
};

/* ── plain text twin ─────────────────────────────────────────────────── */
// A newsletter with no text/plain part scores badly with every spam filter
// going, so this is not optional decoration.

function blockText(block) {
  switch (block.type) {
    case "intro":
      return String(block.text || "").trim();
    case "results": {
      const games = block.games || [];
      if (!games.length) return "";
      return [
        "RESULTS",
        ...games.map((g) => {
          const score = g.score_us == null ? "" : ` ${g.score_us}-${g.score_them}`;
          const top = g.top_scorer ? ` | Top scorer: ${g.top_scorer.name} (${g.top_scorer.points} pts)` : "";
          const recap = g.recap ? `\n  "${g.recap}"` : "";
          return `- ${formatDate(g.practice_date)}: IBBC vs ${g.opponent || "—"}${score}${top}${recap}`;
        }),
      ].join("\n");
    }
    case "fixtures": {
      const events = block.events || [];
      if (!events.length) return "";
      return [
        "WHAT'S COMING UP",
        ...events.map((e) => {
          const label = e.kind === "game" ? `Game vs ${e.opponent || "TBD"}` : e.title || "Practice";
          return `- ${formatDate(e.practice_date)} ${e.start_time || ""} — ${label}${
            e.location_name ? ` (${e.location_name})` : ""
          }`;
        }),
      ].join("\n");
    }
    case "player": {
      const p = block.player;
      if (!p || !p.name) return "";
      return ["PLAYER OF THE WEEK", `${p.name}${p.jersey ? ` #${p.jersey}` : ""}`, p.stat_line || "", p.note || ""]
        .filter(Boolean)
        .join("\n");
    }
    case "practice": {
      const parts = [String(block.focus || "").trim(), String(block.drills || "").trim(), String(block.notes || "").trim()].filter(Boolean);
      return parts.length ? ["ON THE FLOOR THIS WEEK", ...parts].join("\n") : "";
    }
    case "news": {
      const items = block.items || [];
      if (!items.length) return "";
      return [
        "CLUB NEWS",
        ...items.map((n) => `- ${n.title}${n.excerpt ? `: ${n.excerpt}` : ""}${n.url ? `\n  ${n.url}` : ""}`),
      ].join("\n");
    }
    default:
      return "";
  }
}

/* ── the whole issue ─────────────────────────────────────────────────── */

/**
 * @returns {{ html: string, text: string }}
 */
export function renderNewsletter({
  club = {},
  team = null,
  blocks = [],
  recipientName = "",
  unsubscribeUrl = "",
  siteUrl = DEFAULT_SITE,
  preheader = "",
  subject = "",
} = {}) {
  const ctx = { siteUrl };
  const clubName = club.name || "International Basketball Club Genève";
  const gym = club.gym || "École Raymond Uldry, Grand-Lancy";
  const site = String(siteUrl || DEFAULT_SITE).replace(/\/+$/, "");
  const crest = image(club.crest_url || "/logo.png", clubName, 56, siteUrl);

  const body = (Array.isArray(blocks) ? blocks : [])
    .map((b) => (BLOCK_RENDERERS[b?.type] ? BLOCK_RENDERERS[b.type](b, ctx) : ""))
    .filter(Boolean)
    .join("");

  const greeting = recipientName
    ? paragraph(`Hi ${escapeHtml(String(recipientName).split(" ")[0])},`)
    : "";

  const whyLine = team
    ? `You are receiving this because you are part of ${escapeHtml(team.name)} at ${escapeHtml(clubName)}.`
    : `You are receiving this because you are part of ${escapeHtml(clubName)}.`;

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light only" />
<meta name="supported-color-schemes" content="light only" />
<title>${escapeHtml(subject || clubName)}</title>
<style type="text/css">
@media only screen and (max-width:620px) {
  .ibc-wrap { width:100% !important; }
  .ibc-pad { padding-left:18px !important; padding-right:18px !important; }
  .ibc-hero-title { font-size:19px !important; line-height:25px !important; }
}
</style>
</head>
<body style="margin:0;padding:0;background-color:${PAPER};" bgcolor="${PAPER}">
<span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;max-height:0;max-width:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="${PAPER}" style="background-color:${PAPER};">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" class="ibc-wrap" width="600" border="0" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;border-radius:12px;overflow:hidden;">

        <tr>
          <td bgcolor="${BLUE}" class="ibc-pad" style="background-color:${BLUE};background-image:linear-gradient(180deg,${BLUE_DARK} 0%,${BLUE} 100%);padding:24px 28px;">
            <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
              <tr>
                ${crest ? `<td width="68" valign="middle" style="padding-right:12px;">${crest}</td>` : ""}
                <td valign="middle">
                  <p style="margin:0;font-family:${FONT};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#b9bce8;">${escapeHtml(team ? team.name : "Club newsletter")}</p>
                  <p class="ibc-hero-title" style="margin:3px 0 0 0;font-family:${FONT};font-size:22px;line-height:28px;font-weight:bold;color:${WHITE};">${escapeHtml(subject || clubName)}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        ${greeting ? `<tr><td bgcolor="${WHITE}" class="ibc-pad" style="background-color:${WHITE};padding:22px 28px 0 28px;">${greeting}</td></tr>` : ""}
        ${body || `<tr><td bgcolor="${WHITE}" style="background-color:${WHITE};padding:24px 28px;">${paragraph("No news this week.")}</td></tr>`}

        <tr>
          <td bgcolor="${WHITE}" style="background-color:${WHITE};padding:0 28px 24px 28px;">
            ${button("Open the club website", site)}
          </td>
        </tr>

        <tr>
          <td bgcolor="${BLUE_DARK}" class="ibc-pad" style="background-color:${BLUE_DARK};padding:22px 28px;">
            <p style="margin:0;font-family:${FONT};font-size:13px;line-height:20px;color:${WHITE};font-weight:bold;">${escapeHtml(clubName)}</p>
            <p style="margin:4px 0 0 0;font-family:${FONT};font-size:12px;line-height:19px;color:#b9bce8;">${escapeHtml(gym)}</p>
            <p style="margin:12px 0 0 0;font-family:${FONT};font-size:12px;line-height:19px;color:#b9bce8;">${whyLine}</p>
            ${
              unsubscribeUrl
                ? `<p style="margin:8px 0 0 0;font-family:${FONT};font-size:12px;line-height:19px;"><a href="${escapeHtml(unsubscribeUrl)}" style="color:#ffffff;text-decoration:underline;">Unsubscribe from the newsletter</a></p>`
                : ""
            }
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  const textParts = [
    subject || clubName,
    team ? team.name : clubName,
    "",
    recipientName ? `Hi ${String(recipientName).split(" ")[0]},` : "",
    ...(Array.isArray(blocks) ? blocks : []).map(blockText).filter(Boolean),
    "",
    "—",
    clubName,
    gym,
    site,
    whyLine.replace(/<[^>]+>/g, ""),
    unsubscribeUrl ? `Unsubscribe: ${unsubscribeUrl}` : "",
  ].filter((l) => l !== "");

  return { html, text: textParts.join("\n\n") };
}
