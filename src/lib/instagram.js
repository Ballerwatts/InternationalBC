// Helpers for the hand-curated Instagram gallery.
//
// We never talk to Meta: the admin pastes a post permalink and Instagram's
// own embed script (embed.js) renders the card client-side. That means no
// developer app, no access token and nothing that silently expires after
// 60 days — the trade-off being that new posts are added by hand.
//
// Client-safe: no database import here.

/**
 * Accepts anything a user is likely to paste — a full permalink, a share
 * URL with tracking params, or a bare shortcode — and returns the canonical
 * permalink, or null if it isn't an Instagram post/reel we can embed.
 */
export function normalizeInstagramUrl(input) {
  if (typeof input !== "string") return null;
  const raw = input.trim();
  if (!raw) return null;

  // Bare shortcode, e.g. "CyA1b2c3D4e"
  if (/^[A-Za-z0-9_-]{5,30}$/.test(raw)) {
    return `https://www.instagram.com/p/${raw}/`;
  }

  let url;
  try {
    url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (!/(^|\.)instagram\.com$/i.test(url.hostname)) return null;

  // /p/<code>/, /reel/<code>/, /reels/<code>/ and /tv/<code>/ are all embeddable.
  const match = url.pathname.match(/\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
  if (!match) return null;
  const kind = match[1] === "reels" ? "reel" : match[1];
  return `https://www.instagram.com/${kind}/${match[2]}/`;
}
