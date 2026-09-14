// Member photos are stored as data: URLs in SQLite. Rendering them inline
// put the whole image into the HTML — ~300 KB per member, 30+ MB for a full
// roster page, re-sent on every request and invisible to search engines.
//
// Instead each photo gets a real URL served by /media/players/[id].jpg, so
// the browser caches it, the page carries a short link, and Google Images
// can index it (the club's choice). The ?v= hash changes when the photo
// does, so a new upload is never hidden behind a cached old one.

import { createHash } from "node:crypto";

/** Split a data: URL into its bytes and content type, or null. */
export function decodeDataUrl(dataUrl) {
  const m = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(String(dataUrl || ""));
  if (!m) return null;
  return { contentType: m[1].toLowerCase(), bytes: Buffer.from(m[2], "base64") };
}

/** A short, stable fingerprint of a stored photo, for cache-busting. */
export function photoVersion(dataUrl) {
  return createHash("sha1").update(String(dataUrl || "")).digest("hex").slice(0, 10);
}

/**
 * The public URL of a member's photo, or null when there is none. Accepts a
 * row that still carries photo_data_url; a photo that is already a real
 * http(s) URL is used as-is.
 */
export function playerPhotoUrl(player) {
  const src = player?.photo_data_url;
  if (!src) return null;
  if (/^https?:\/\//i.test(src)) return src;
  return `/media/players/${player.id}.jpg?v=${photoVersion(src)}`;
}

/**
 * Replace the heavy photo_data_url on rows headed for a page with a light
 * photo_url. Everything rendered to visitors goes through this.
 */
export function withPhotoUrls(players) {
  return players.map((p) => {
    const { photo_data_url, ...rest } = p;
    return { ...rest, photo_url: playerPhotoUrl(p) };
  });
}

/**
 * A sponsor's logo URL, or null. Same reasoning as member photos: a logo
 * rendered inline on every page (footer + strip) was ~500 KB added to each
 * page view once a single sponsor uploaded one.
 */
export function sponsorLogoUrl(sponsor) {
  const src = sponsor?.logo_data_url;
  if (!src) return null;
  if (/^https?:\/\//i.test(src)) return src;
  const ext = /^data:image\/png/i.test(src) ? "png" : /^data:image\/svg/i.test(src) ? "svg" : "jpg";
  return `/media/sponsors/${sponsor.id}.${ext}?v=${photoVersion(src)}`;
}
