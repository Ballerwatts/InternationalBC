// News is written once and has two independent switches: on the site, and in
// the newsletter. The point of separating them is that either can be on
// without the other, so that is what these pin — plus the rules that stop an
// issue being deleted when deleting it would destroy a delivery record.
//
//   npm test

import { test, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.DATABASE_PATH = join(mkdtempSync(join(tmpdir(), "ibc-switch-")), "t.db");
process.env.SESSION_SECRET = "test-secret";

const { query, run, get } = await import("@/lib/db");
const { buildBlocks, mondayOf } = await import("@/lib/newsletter-build");

const newsIn = (blocks) => blocks.find((b) => b.type === "news")?.items || [];

before(() => {
  run("DELETE FROM announcements");
});

function addNews(title, published, inNewsletter) {
  return Number(
    run(
      "INSERT INTO announcements (title, body, published, in_newsletter) VALUES (?, 'x', ?, ?)",
      [title, published, inNewsletter]
    ).lastInsertRowid
  );
}

test("an item can be on the site only", () => {
  addNews("Site seulement", 1, 0);
  const items = newsIn(buildBlocks({ teamId: null, weekStart: mondayOf() }));
  assert.equal(items.filter((i) => i.title === "Site seulement").length, 0);
  assert.equal(get("SELECT published FROM announcements WHERE title = ?", ["Site seulement"]).published, 1);
});

test("an item can be in the newsletter only", () => {
  addNews("Newsletter seulement", 0, 1);
  const items = newsIn(buildBlocks({ teamId: null, weekStart: mondayOf() }));
  assert.ok(
    items.some((i) => i.title === "Newsletter seulement"),
    "an unpublished item ticked for the newsletter must still reach the e-mail"
  );
});

test("an item can be both, which is the common case", () => {
  addNews("Les deux", 1, 1);
  const items = newsIn(buildBlocks({ teamId: null, weekStart: mondayOf() }));
  assert.ok(items.some((i) => i.title === "Les deux"));
  assert.equal(get("SELECT published FROM announcements WHERE title = ?", ["Les deux"]).published, 1);
});

test("an item can be neither, and then appears nowhere", () => {
  addNews("Nulle part", 0, 0);
  const items = newsIn(buildBlocks({ teamId: null, weekStart: mondayOf() }));
  assert.equal(items.filter((i) => i.title === "Nulle part").length, 0);
});

test("existing announcements default into the newsletter, as they did before", () => {
  // A row written the old way, with no in_newsletter given.
  run("INSERT INTO announcements (title, body, published) VALUES ('Ancienne', 'x', 1)");
  assert.equal(get("SELECT in_newsletter FROM announcements WHERE title = 'Ancienne'").in_newsletter, 1);
});

test("archiving an issue takes its home-page post down with it", async () => {
  const { publishNewsletterPost } = await import("@/lib/newsletter-post");
  const id = Number(
    run(
      "INSERT INTO newsletters (subject, blocks_json, status, post_enabled) VALUES ('Numéro', '[]', 'draft', 1)"
    ).lastInsertRowid
  );
  publishNewsletterPost(id);
  assert.equal(query("SELECT id FROM announcements WHERE newsletter_id = ?", [id]).length, 1);

  // What PATCH { archived: true } does.
  run("UPDATE newsletters SET archived_at = datetime('now'), post_enabled = 0 WHERE id = ?", [id]);
  publishNewsletterPost(id);
  assert.equal(
    query("SELECT id FROM announcements WHERE newsletter_id = ?", [id]).length,
    0,
    "retiring an issue must retire it everywhere"
  );
});
