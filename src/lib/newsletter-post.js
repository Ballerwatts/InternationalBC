// A sent newsletter can also appear on the public home page.
//
// It reuses `announcements` rather than introducing a parallel "posts"
// table: the home page already renders announcements, with a photo, a video
// and squad scoping, and a second model that looked almost the same would
// have to be kept in step with it forever.
//
// The link is announcements.newsletter_id, so re-sending an issue updates
// the post it already created instead of stacking a duplicate.

import { get, run } from "@/lib/db";
import { isSupportedVideoUrl } from "@/lib/video";

/**
 * Create or refresh the home-page post for one issue.
 * @returns {{ posted: boolean, announcementId?: number, reason?: string }}
 */
export function publishNewsletterPost(newsletterId) {
  const n = get("SELECT * FROM newsletters WHERE id = ?", [newsletterId]);
  if (!n) return { posted: false, reason: "not_found" };

  const existing = get("SELECT id FROM announcements WHERE newsletter_id = ?", [newsletterId]);

  // Turned off after a post was made: take it down rather than leave a
  // stale one on the home page.
  if (!n.post_enabled) {
    if (existing) run("DELETE FROM announcements WHERE id = ?", [existing.id]);
    return { posted: false, reason: "disabled" };
  }

  const title = (n.post_title || "").trim() || n.subject;
  const body = (n.post_body || "").trim();
  if (!title) return { posted: false, reason: "no_title" };

  // A bad video link must not block the post — drop the link, keep the post.
  const video = (n.post_video_url || "").trim();
  const safeVideo = video && isSupportedVideoUrl(video) ? video : null;

  if (existing) {
    run(
      `UPDATE announcements
       SET title = ?, body = ?, image_data_url = ?, video_url = ?, team_id = ?,
           published = 1, updated_at = datetime('now')
       WHERE id = ?`,
      [title, body, n.post_image_data_url || null, safeVideo, n.team_id ?? null, existing.id]
    );
    return { posted: true, announcementId: existing.id };
  }

  const { lastInsertRowid } = run(
    `INSERT INTO announcements (title, body, image_data_url, video_url, team_id, published, newsletter_id)
     VALUES (?, ?, ?, ?, ?, 1, ?)`,
    [title, body, n.post_image_data_url || null, safeVideo, n.team_id ?? null, newsletterId]
  );
  return { posted: true, announcementId: Number(lastInsertRowid) };
}
