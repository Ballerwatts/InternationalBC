// The import is the one place a typo becomes 40 wrong calendar entries, so
// the parser has to reject rather than guess. These cover the four kinds,
// the per-kind required fields, and the Swiss formats people actually paste.
//
//   npm test

import { test } from "node:test";
import assert from "node:assert/strict";

const { parseGameCsv, parseKind, parseDate, parseTime, CSV_TEMPLATE } =
  await import("@/lib/game-csv");

test("the shipped template parses with no errors", () => {
  const { rows, errors } = parseGameCsv(CSV_TEMPLATE);
  assert.deepEqual(errors, []);
  assert.deepEqual(rows.map((r) => r.kind), ["game", "practice", "event", "tournament"].flatMap(
    (k) => (k === "game" ? ["game", "game"] : [k])
  ));
});

test("kinds are recognised in French and English", () => {
  for (const [input, expected] of [
    ["match", "game"], ["Game", "game"], ["rencontre", "game"],
    ["entrainement", "practice"], ["Entraînement", "practice"], ["training", "practice"],
    ["evenement", "event"], ["Événement", "event"],
    ["tournoi", "tournament"], ["Tournament", "tournament"],
  ]) assert.equal(parseKind(input), expected, `failed on ${input}`);
});

test("an unrecognised type is refused, not filed as a game", () => {
  assert.equal(parseKind("anniversaire"), null);
  const { rows, errors } = parseGameCsv("type;date;heure;adversaire\nbanquet;04.10.2026;20:00;X");
  assert.equal(rows.length, 0);
  assert.match(errors[0].message, /type inconnu/);
});

test("a game needs an opponent; a practice needs neither opponent nor title", () => {
  const game = parseGameCsv("type;date;heure;adversaire\nmatch;04.10.2026;20:00;");
  assert.equal(game.rows.length, 0);
  assert.match(game.errors[0].message, /adversaire manquant/);

  const practice = parseGameCsv("type;date;heure;adversaire\nentrainement;04.10.2026;20:00;");
  assert.deepEqual(practice.errors, []);
  assert.equal(practice.rows[0].kind, "practice");
});

test("an event or tournament needs a name", () => {
  const bad = parseGameCsv("type;date;heure;titre\nevenement;20.12.2026;19:00;");
  assert.equal(bad.rows.length, 0);
  assert.match(bad.errors[0].message, /titre manquant/);

  const good = parseGameCsv("type;date;heure;titre\ntournoi;14.03.2027;09:00;UN Games");
  assert.deepEqual(good.errors, []);
  assert.equal(good.rows[0].title, "UN Games");
});

test("without a type column the block is still games, as it always was", () => {
  const { rows, errors } = parseGameCsv("04.10.2026;20:00;BBC Meyrin;Salle;D");
  assert.deepEqual(errors, []);
  assert.equal(rows[0].kind, "game");
  assert.equal(rows[0].opponent, "BBC Meyrin");
});

test("Swiss day-first dates never read as month-first", () => {
  assert.equal(parseDate("04.10.2026"), "2026-10-04"); // 4 October, not 10 April
  assert.equal(parseDate("4/10/26"), "2026-10-04");
  assert.equal(parseDate("2026-10-04"), "2026-10-04");
  assert.equal(parseDate("31.02.2026"), null); // not a real day
  assert.equal(parseDate("nonsense"), null);
});

test("times accept 20h30 as well as 20:30", () => {
  assert.equal(parseTime("20h30"), "20:30");
  assert.equal(parseTime("20:30"), "20:30");
  assert.equal(parseTime("20h"), "20:00");
  assert.equal(parseTime("25:00"), null);
});

test("the per-line team is carried through for routing", () => {
  const { rows } = parseGameCsv(
    "type;equipe;date;heure;adversaire\nmatch;IBBC Women (NL1);11.10.2026;18:30;Lancy"
  );
  assert.equal(rows[0].team, "IBBC Women (NL1)");
});
