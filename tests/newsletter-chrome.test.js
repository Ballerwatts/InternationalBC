// The header line and footer block are admin-authored free text that lands
// in an HTML email sent to the whole club. Two things must hold: it must
// appear in both the HTML and the plain-text part, and it must never be able
// to inject markup — an apostrophe in "l'équipe" should not break the email,
// and a pasted <script> should not travel.
//
//   npm test

import { test } from "node:test";
import assert from "node:assert/strict";

const { renderNewsletter } = await import("@/lib/email-template");

const base = {
  club: { name: "International Basketball Club Genève" },
  blocks: [],
  subject: "Semaine du 31 août",
  unsubscribeUrl: "https://example.org/unsub?e=a%40b.c",
};

test("header and footer text reach both the HTML and the text part", () => {
  const { html, text } = renderNewsletter({
    ...base,
    headerText: "Les nouvelles de la semaine",
    footerText: "Chemin Eugène-Rigot 2, 1211 Genève 21",
  });
  assert.match(html, /Les nouvelles de la semaine/);
  assert.match(html, /Chemin Eugène-Rigot 2, 1211 Genève 21/);
  assert.match(text, /Les nouvelles de la semaine/);
  assert.match(text, /Chemin Eugène-Rigot 2, 1211 Genève 21/);
});

test("markup in the admin text is escaped, not rendered", () => {
  const { html } = renderNewsletter({
    ...base,
    headerText: '<script>alert(1)</script>',
    footerText: '<img src=x onerror=alert(1)>',
  });
  // The payload must survive only as inert text. "onerror=" still appears as
  // characters inside &lt;img …&gt; — that is correct and harmless; what must
  // NOT appear is a live tag the mail client would act on.
  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /<img src=x/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
});

test("newlines in the footer become line breaks, not one run-on line", () => {
  const { html } = renderNewsletter({
    ...base,
    footerText: "Chemin Eugène-Rigot 2\ninternationalbbcgeneve@gmail.com",
  });
  assert.match(html, /Chemin Eugène-Rigot 2<br \/>internationalbbcgeneve@gmail\.com/);
});

test("empty chrome falls back rather than leaving a hole", () => {
  const { html } = renderNewsletter({ ...base, club: { name: "IBBC", gym: "Collège Sismondi" } });
  assert.match(html, /Collège Sismondi/);
  assert.match(html, /IBBC/);
});

test("the unsubscribe link survives whatever the admin types", () => {
  const { html, text } = renderNewsletter({
    ...base,
    headerText: "anything",
    footerText: "anything at all",
  });
  assert.match(html, /example\.org\/unsub/);
  assert.match(text, /Unsubscribe: https:\/\/example\.org\/unsub/);
});
