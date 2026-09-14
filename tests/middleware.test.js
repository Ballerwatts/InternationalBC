// Old ?page_id= links are still in Google's index; they must land on the page
// they meant. WordPress machinery must be reported gone so it is dropped.
//
//   npm test

import { test } from "node:test";
import assert from "node:assert/strict";

const { resolveLegacyUrl } = await import("@/lib/legacy-urls");
const at = (url) => {
  const u = new URL(url, "https://www.intbbc.org");
  return resolveLegacyUrl(u.pathname, u.searchParams);
};

test("?page_id=34 goes to the rules page", () => {
  assert.deepEqual(at("/?page_id=34"), { redirect: "/theclub/rulesfees/" });
});

test("every page_id Google has indexed has a destination", () => {
  for (const [id, target] of [[43, "/"], [2, "/theclub/"], [29, "/theclub/clubhistory/"], [26, "/committee/"], [11, "/gymnasium/"], [13, "/teams/"], [18, "/teams/ibbc-men/"], [20, "/teams/ibbc-femmes/"]]) {
    assert.equal(at(`/?page_id=${id}`).redirect, target, `page_id=${id}`);
  }
});

test("an unknown page_id still lands somewhere, not on an error", () => {
  assert.deepEqual(at("/?page_id=999"), { redirect: "/" });
});

test("WordPress-only addresses are gone; real pages are left alone", () => {
  for (const p of ["/wp-admin/", "/feed/", "/xmlrpc.php", "/wp-json/wp/v2/pages", "/wp-login.php"]) {
    assert.deepEqual(at(p), { gone: true }, p);
  }
  for (const p of ["/", "/teams/ibbc-men/", "/theclub/", "/feedback/"]) {
    assert.equal(at(p), null, p);
  }
});
