// Dates in this app are calendar days in Geneva, not instants — a practice on
// 2026-01-12 is that date whatever timezone you read it from. So every
// 'YYYY-MM-DD' must be derived from LOCAL parts.
//
// `new Date().toISOString().slice(0, 10)` is the trap: it converts to UTC
// first, so between midnight and 01:00/02:00 Geneva time it returns
// yesterday. That made "today" wrong on the homepage and the calendar, and
// made the Monday cron look up the previous week's practice board.
//
// Set TZ=Europe/Zurich on the server so "local" means Geneva there too.

/** 'YYYY-MM-DD' for a Date, from local parts. */
export function toISODate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Today as 'YYYY-MM-DD', local. */
export function todayISO() {
  return toISODate(new Date());
}

/** Parse 'YYYY-MM-DD' as local midnight (not UTC midnight). */
export function fromISODate(iso) {
  const [y, m, d] = String(iso).split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** 'YYYY-MM-DD' n days after an ISO date. */
export function addDays(iso, days) {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** The Monday of the week containing `date`, as 'YYYY-MM-DD'. */
export function mondayOfISO(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return toISODate(d);
}
