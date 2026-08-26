// A sent issue can also become a post on the home page. It reuses the
// announcements table, so the thing that must hold is idempotency: sending
// again updates the existing post instead of stacking duplicates on the
// page, and switching the post off takes it down rather than leaving a
// stale one behind.
//
//   npm test

import { test, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.DATABASE_PATH = join(mkdtempSync(join(tmpdir(), "ibc-post-")), "t.db");
process.env.SESSION_SECRET = "test-secret";

const { query, run, get } = await import("@/lib/db");
const { publishNewsletterPost } = await import("@/lib/newsletter-post");

let issueId, teamId;
before(() => {
  teamId = query("SELECT id FROM teams ORDER BY sort_order LIMIT 1")[0].id;
  issueId = Number(
    run(
      `INSERT INTO newsletters (subject, team_id, blocks_json, status)
       VALUES ('Semaine du 31 août', ?, '[]', 'sent')`,
      [teamId]
    ).lastInsertRowid
  );
});

const postsFor = (id) => query("SELECT * FROM announcements WHERE newsletter_id = ?", [id]);

test("a disabled post creates nothing", () => {
  const r = publishNewsletterPost(issueId);
  assert.equal(r.posted, false);
  assert.equal(r.reason, "disabled");
  assert.equal(postsFor(issueId).length, 0);
});

test("enabling it publishes one post, scoped to the same squad", () => {
  run("UPDATE newsletters SET post_enabled = 1, post_body = ? WHERE id = ?", ["Belle semaine.", issueId]);
  const r = publishNewsletterPost(issueId);
  assert.equal(r.posted, true);
  const posts = postsFor(issueId);
  assert.equal(posts.length, 1);
  assert.equal(posts[0].team_id, teamId);
  assert.equal(posts[0].published, 1);
  assert.equal(posts[0].body, "Belle semaine.");
});

test("an empty post title falls back to the e-mail subject", () => {
  assert.equal(postsFor(issueId)[0].title, "Semaine du 31 août");
  run("UPDATE newsletters SET post_title = ? WHERE id = ?", ["Victoire à Meyrin", issueId]);
  publishNewsletterPost(issueId);
  assert.equal(postsFor(issueId)[0].title, "Victoire à Meyrin");
});

test("publishing again updates the same post rather than stacking a second", () => {
  publishNewsletterPost(issueId);
  publishNewsletterPost(issueId);
  assert.equal(postsFor(issueId).length, 1, "re-sending must not duplicate the post");
});

test("a bad video link drops the link but keeps the post", () => {
  run("UPDATE newsletters SET post_video_url = ? WHERE id = ?", ["https://evil.example/x", issueId]);
  publishNewsletterPost(issueId);
  const post = postsFor(issueId)[0];
  assert.equal(post.video_url, null);
  assert.equal(post.title, "Victoire à Meyrin");
});

test("a good video link is kept", () => {
  run("UPDATE newsletters SET post_video_url = ? WHERE id = ?", [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ", issueId,
  ]);
  publishNewsletterPost(issueId);
  assert.match(postsFor(issueId)[0].video_url, /dQw4w9WgXcQ/);
});

test("switching the post off takes it down", () => {
  run("UPDATE newsletters SET post_enabled = 0 WHERE id = ?", [issueId]);
  const r = publishNewsletterPost(issueId);
  assert.equal(r.posted, false);
  assert.equal(postsFor(issueId).length, 0, "a disabled post must not linger on the home page");
});

// --- ownership: Announcements takes over once someone edits there ---

test("editing the post from Announcements detaches it from the issue", () => {
  run("UPDATE newsletters SET post_enabled = 1, post_title = ? WHERE id = ?", ["Auto", issueId]);
  publishNewsletterPost(issueId);
  const post = postsFor(issueId)[0];

  // What /api/announcements/[id] PUT does.
  run(
    `UPDATE announcements
     SET title = ?, body = ?, published = ?,
         post_detached = CASE WHEN newsletter_id IS NULL THEN 0 ELSE 1 END
     WHERE id = ?`,
    ["Réécrit à la main", "Mon texte", 0, post.id]
  );

  // A later publish must not revert the wording or re-publish it.
  publishNewsletterPost(issueId);
  const after = postsFor(issueId)[0];
  assert.equal(after.title, "Réécrit à la main");
  assert.equal(after.body, "Mon texte");
  assert.equal(after.published, 0, "an unpublish done here must stick");
  assert.equal(postsFor(issueId).length, 1);
});

test("deleting it from Announcements switches the issue's post off for good", () => {
  const post = postsFor(issueId)[0];
  // What /api/announcements/[id] DELETE does.
  run("DELETE FROM announcements WHERE id = ?", [post.id]);
  run("UPDATE newsletters SET post_enabled = 0 WHERE id = ?", [issueId]);

  publishNewsletterPost(issueId);
  assert.equal(postsFor(issueId).length, 0, "a deleted post must not come back on re-send");
});
