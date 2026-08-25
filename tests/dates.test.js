// The bug this guards: toISOString() converts to UTC first, so at 00:30
// Geneva time it returns yesterday's date. Everything here is about calendar
// days, so every conversion must go through local parts.
//
//   npm test

import { test } from "node:test";
import assert from "node:assert/strict";

const { toISODate, fromISODate, addDays, mondayOfISO } = await import("@/lib/dates");

test("00:30 local does not roll back to yesterday", () => {
  // 12 Jan 2026 at 00:30 local. In UTC+1/+2 this is 11 Jan in UTC.
  const justAfterMidnight = new Date(2026, 0, 12, 0, 30);
  assert.equal(toISODate(justAfterMidnight), "2026-01-12");
  assert.notEqual(toISODate(justAfterMidnight), justAfterMidnight.toISOString().slice(0, 10));
});

test("late evening does not roll forward either", () => {
  assert.equal(toISODate(new Date(2026, 0, 12, 23, 45)), "2026-01-12");
});

test("round-trips through a local Date", () => {
  assert.equal(toISODate(fromISODate("2026-03-29")), "2026-03-29");
  assert.equal(toISODate(fromISODate("2026-10-25")), "2026-10-25"); // DST change days
});

test("addDays crosses months, years and DST boundaries", () => {
  assert.equal(addDays("2026-01-31", 1), "2026-02-01");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2026-03-28", 1), "2026-03-29"); // clocks go forward
  assert.equal(addDays("2026-10-24", 1), "2026-10-25"); // clocks go back
  assert.equal(addDays("2026-01-12", 6), "2026-01-18");
});

test("mondayOfISO treats Sunday as the end of the week, not the start", () => {
  assert.equal(mondayOfISO(new Date(2026, 0, 12)), "2026-01-12"); // a Monday
  assert.equal(mondayOfISO(new Date(2026, 0, 15)), "2026-01-12"); // Thursday
  assert.equal(mondayOfISO(new Date(2026, 0, 18)), "2026-01-12"); // Sunday
  assert.equal(mondayOfISO(new Date(2026, 0, 19)), "2026-01-19"); // next Monday
});
