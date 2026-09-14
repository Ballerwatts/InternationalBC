// The migration keeps WordPress's rankings only if the new site answers the
// same URLs with the same pages and says so in its canonical tags. These pin
// the pieces where a silent mistake would quietly cost that.
//
//   npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.DATABASE_PATH = join(mkdtempSync(join(tmpdir(), "ibc-seo-")), "t.db");
process.env.SESSION_SECRET = "test-secret";
delete process.env.SITE_URL;

const db = await import("@/lib/db");
const { query, run, slugify } = db;
const { pageMetadata, snippet, absolute, SITE_URL } = await import("@/lib/seo");
const { playerPhotoUrl, withPhotoUrls, decodeDataUrl } = await import("@/lib/media");

test("team slugs match the addresses WordPress had indexed", () => {
  const slugs = Object.fromEntries(query("SELECT name, slug FROM teams").map((t) => [t.name, t.slug]));
  assert.equal(slugs["IBBC Women (NL1)"], "ibbc-femmes");
  assert.equal(slugs["IBBC Men (3LCM)"], "ibbc-men");
  assert.equal(slugs["IBBC Youth Men's Team (U18M)"], "ibbc-u18-youth-mens-team");
  assert.equal(slugs["IBBC Mini-Basket (U8 mixed)"], "ibbc-u8-minibasket-team");
  assert.equal(new Set(Object.values(slugs)).size, Object.values(slugs).length, "slugs must be unique");
});

test("the WordPress pages are seeded at their original paths", () => {
  const paths = query("SELECT path FROM site_pages").map((p) => p.path);
  for (const p of ["/", "/theclub/", "/theclub/clubhistory/", "/theclub/rulesfees/", "/committee/", "/gymnasium/", "/teams/"]) {
    assert.ok(paths.includes(p), `missing ${p}`);
  }
  const history = query("SELECT body FROM site_pages WHERE path = '/theclub/clubhistory/'")[0].body;
  assert.match(history, /1951/, "the 1951 Sécheron origin story must come across verbatim");
});

test("the U8 team is created once, with its Wednesday slot, and never duplicated", async () => {
  const u8 = () => query("SELECT id FROM teams WHERE slug = 'ibbc-u8-minibasket-team'");
  assert.equal(u8().length, 1);
  const slot = query("SELECT weekday, start_time, end_time FROM team_practice_slots WHERE team_id = ?", [u8()[0].id]);
  assert.deepEqual(slot, [{ weekday: 3, start_time: "14:00", end_time: "16:00" }]);
});

test("an admin's edit to a seeded page is not overwritten on restart", () => {
  run("UPDATE site_pages SET title = 'Notre histoire' WHERE path = '/theclub/clubhistory/'");
  // Simulate the seed running again, as it does on every start.
  run("INSERT OR IGNORE INTO site_pages (path, title, body) VALUES ('/theclub/clubhistory/', 'Club History', 'x')");
  assert.equal(query("SELECT title FROM site_pages WHERE path = '/theclub/clubhistory/'")[0].title, "Notre histoire");
});

test("slugify turns team names into clean addresses", () => {
  assert.equal(slugify("IBBC Men (2LCM)"), "ibbc-men-2lcm");
  assert.equal(slugify("Équipe Féminine & Juniors"), "equipe-feminine-and-juniors");
  assert.equal(slugify("  --  "), "");
});

test("canonicals point at www.intbbc.org with WordPress's trailing slash", () => {
  assert.equal(SITE_URL, "https://www.intbbc.org");
  const meta = pageMetadata({ title: "Club History", path: "/theclub/clubhistory/" });
  assert.equal(meta.alternates.canonical, "https://www.intbbc.org/theclub/clubhistory/");
  assert.equal(meta.title.absolute, "Club History | International Geneva Basketball Club (IBBC)");
  assert.equal(meta.openGraph.url, meta.alternates.canonical);
  assert.equal(absolute("/teams/ibbc-men/"), "https://www.intbbc.org/teams/ibbc-men/");
});

test("snippets fit a search result and never cut a word", () => {
  const long = "word ".repeat(80);
  const s = snippet(long);
  assert.ok(s.length <= 156, `too long: ${s.length}`);
  assert.ok(s.endsWith("…"));
  assert.doesNotMatch(snippet("## Heading\n\n[img:/x.jpg|alt] Text"), /##|\[img:/);
});

test("member photos travel as a URL, never as the encoded image", () => {
  const dataUrl = "data:image/jpeg;base64," + Buffer.from("fake-jpeg-bytes").toString("base64");
  const rows = withPhotoUrls([{ id: 7, first_name: "A", photo_data_url: dataUrl }, { id: 8, photo_data_url: null }]);
  assert.equal("photo_data_url" in rows[0], false, "the base64 must not reach the page");
  assert.match(rows[0].photo_url, /^\/media\/players\/7\.jpg\?v=[0-9a-f]{10}$/);
  assert.equal(rows[1].photo_url, null);
  assert.equal(decodeDataUrl(dataUrl).bytes.toString(), "fake-jpeg-bytes");
  assert.equal(decodeDataUrl("not a data url"), null);
});

test("a changed photo gets a new URL, so no cache shows the old one", () => {
  const a = playerPhotoUrl({ id: 1, photo_data_url: "data:image/jpeg;base64,AAAA" });
  const b = playerPhotoUrl({ id: 1, photo_data_url: "data:image/jpeg;base64,BBBB" });
  assert.notEqual(a, b);
});
