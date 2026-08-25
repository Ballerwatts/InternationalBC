// Video links are stored as the plain URL an admin pasted (a YouTube or
// Vimeo share link) and turned into an embed + thumbnail at render time.
//
// Nothing is uploaded to the server on purpose: the Fly volume is 1 GB and
// also holds the SQLite database, so a couple of game videos would fill it
// and the app would stop being able to write. Letting YouTube/Vimeo host the
// file also gives us the first frame for free — no poster to maintain.

const YOUTUBE_HOSTS = ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtu.be"];
const VIMEO_HOSTS = ["vimeo.com", "www.vimeo.com", "player.vimeo.com"];

/**
 * @returns {{provider: 'youtube'|'vimeo', id: string, embedUrl: string,
 *            thumbnailUrl: string|null, watchUrl: string} | null}
 */
export function parseVideoUrl(raw) {
  const url = (raw || "").trim();
  if (!url) return null;

  let parsed;
  try {
    parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase();

  if (YOUTUBE_HOSTS.includes(host)) {
    // youtu.be/<id>, /watch?v=<id>, /embed/<id>, /shorts/<id>, /live/<id>
    let id = "";
    if (host.endsWith("youtu.be")) {
      id = parsed.pathname.slice(1);
    } else if (parsed.searchParams.get("v")) {
      id = parsed.searchParams.get("v");
    } else {
      const m = parsed.pathname.match(/\/(embed|shorts|live|v)\/([^/?]+)/);
      if (m) id = m[2];
    }
    id = (id || "").split("/")[0];
    if (!/^[\w-]{6,}$/.test(id)) return null;
    return {
      provider: "youtube",
      id,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
      // hqdefault exists for every video; maxresdefault often 404s.
      thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      watchUrl: `https://www.youtube.com/watch?v=${id}`,
    };
  }

  if (VIMEO_HOSTS.includes(host)) {
    const m = parsed.pathname.match(/\/(?:video\/)?(\d+)/);
    if (!m) return null;
    const id = m[1];
    return {
      provider: "vimeo",
      id,
      embedUrl: `https://player.vimeo.com/video/${id}`,
      // Vimeo thumbnails need an API call; the embed shows its own poster,
      // so the card falls back to a play tile when this is null.
      thumbnailUrl: null,
      watchUrl: `https://vimeo.com/${id}`,
    };
  }

  return null;
}

export function isSupportedVideoUrl(raw) {
  return !raw || !raw.trim() ? true : parseVideoUrl(raw) !== null;
}
