// parseVideoUrl decides what gets put inside an <iframe> on a public page,
// so the host allowlist is the security boundary, not a convenience: anything
// that is not YouTube or Vimeo must come back null rather than be embedded.
// The rest is share-link shapes people actually paste.
//
//   npm test

import { test } from "node:test";
import assert from "node:assert/strict";

const { parseVideoUrl, isSupportedVideoUrl } = await import("@/lib/video");

test("recognises the YouTube share-link shapes people paste", () => {
  for (const url of [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ",
    "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    "https://www.youtube.com/live/dQw4w9WgXcQ",
    "youtube.com/watch?v=dQw4w9WgXcQ", // pasted without the scheme
  ]) {
    const v = parseVideoUrl(url);
    assert.equal(v?.id, "dQw4w9WgXcQ", `failed on ${url}`);
    assert.equal(v.provider, "youtube");
    assert.equal(v.embedUrl, "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  }
});

test("recognises Vimeo, with no thumbnail to fetch", () => {
  const v = parseVideoUrl("https://vimeo.com/123456789");
  assert.equal(v.provider, "vimeo");
  assert.equal(v.id, "123456789");
  assert.equal(v.thumbnailUrl, null);
});

test("refuses anything outside the two allowed hosts", () => {
  for (const url of [
    "https://evil.example/embed/xyz",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ", // lookalike host
    "https://vimeo.com/not-a-number",
    "not a url at all",
  ]) {
    assert.equal(parseVideoUrl(url), null, `should have refused ${url}`);
    assert.equal(isSupportedVideoUrl(url), false, `should have refused ${url}`);
  }
});

test("an empty field is valid — the video is optional", () => {
  assert.equal(parseVideoUrl(""), null);
  assert.equal(isSupportedVideoUrl(""), true);
  assert.equal(isSupportedVideoUrl(null), true);
});
