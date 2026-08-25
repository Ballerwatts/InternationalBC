// Every INSERT in the codebase must list as many values as columns.
//
// This exists because a real one shipped: adding video_url to the practices
// INSERT without adding its placeholder left 11 columns against 10 values,
// and SQLite only complains at runtime — so the build passed, the deploy
// passed, and creating any practice or game failed in production instead.
// A static arity check costs nothing and catches the whole class.
//
//   npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/** Split on commas that are not inside brackets or quotes. */
function splitTopLevel(s) {
  const out = [];
  let depth = 0, cur = "", quote = null;
  for (const ch of s) {
    if (quote) {
      cur += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') { quote = ch; cur += ch; continue; }
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) { out.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function jsFilesUnder(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...jsFilesUnder(full));
    else if (entry.endsWith(".js")) out.push(full);
  }
  return out;
}

const INSERT_RE =
  /INSERT(?:\s+OR\s+\w+)?\s+INTO\s+(\w+)\s*\(([^)]*)\)\s*VALUES\s*\((.*?)\)\s*(?:ON CONFLICT|`|"|')/gis;

test("every INSERT lists as many values as columns", () => {
  const problems = [];
  let statements = 0;

  for (const file of jsFilesUnder("src")) {
    const source = readFileSync(file, "utf-8");
    for (const m of source.matchAll(INSERT_RE)) {
      const [, table, colText, valText] = m;
      const cols = splitTopLevel(colText);
      const vals = splitTopLevel(valText);
      statements++;
      if (cols.length !== vals.length) {
        const line = source.slice(0, m.index).split("\n").length;
        problems.push(
          `${file}:${line} — ${table}: ${cols.length} columns, ${vals.length} values`
        );
      }
    }
  }

  assert.ok(statements > 20, `only found ${statements} INSERTs — the regex has drifted`);
  assert.deepEqual(problems, [], `INSERT arity mismatch:\n${problems.join("\n")}`);
});
