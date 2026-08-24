// Geneva school holidays and public holidays.
//
// The club practises in a school gym (École de commerce Raymond-Uldry), so
// the cantonal school calendar decides when the hall is open. These dates
// are seeded into a `holidays` table rather than hard-coded at the point of
// use, so an admin can correct a date or add next season's calendar from
// /admin/schedule without a code change.
//
// Source: République et canton de Genève — "Vacances scolaires 2026-2027"
// https://www.ge.ch/vacances-scolaires-jours-feries/vacances-scolaires-2026-2027

/** kind: 'vacances' = a school holiday week · 'ferie' = a single public holiday. */
export const SEED_HOLIDAYS = [
  { name: "Jeûne genevois", start_date: "2026-09-10", end_date: "2026-09-10", kind: "ferie" },
  { name: "Vacances d'automne", start_date: "2026-10-19", end_date: "2026-10-23", kind: "vacances" },
  { name: "Vacances de Noël", start_date: "2026-12-24", end_date: "2027-01-08", kind: "vacances" },
  { name: "Vacances de février", start_date: "2027-02-15", end_date: "2027-02-19", kind: "vacances" },
  { name: "Vacances de Pâques", start_date: "2027-03-26", end_date: "2027-04-09", kind: "vacances" },
  { name: "Pont de l'Ascension", start_date: "2027-05-06", end_date: "2027-05-07", kind: "ferie" },
  { name: "Lundi de Pentecôte", start_date: "2027-05-17", end_date: "2027-05-17", kind: "ferie" },
  { name: "Vacances d'été", start_date: "2027-07-05", end_date: "2027-08-25", kind: "vacances" },
];

/** The holiday covering an ISO date, or null. Dates are inclusive both ends. */
export function holidayOn(isoDate, holidays) {
  if (!isoDate) return null;
  return holidays.find((h) => isoDate >= h.start_date && isoDate <= h.end_date) || null;
}

/** Map of ISO date -> holiday, for every day covered by `holidays`. */
export function expandHolidayDays(holidays) {
  const byDay = {};
  for (const h of holidays) {
    const end = new Date(h.end_date + "T00:00:00");
    for (let d = new Date(h.start_date + "T00:00:00"); d <= end; d.setDate(d.getDate() + 1)) {
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
      byDay[iso] = h;
    }
  }
  return byDay;
}

/** Short French range, e.g. "19 au 23 octobre" or "10 septembre". */
export function formatHolidayRange(h) {
  const opts = { day: "numeric", month: "long" };
  const start = new Date(h.start_date + "T00:00:00").toLocaleDateString("fr-CH", opts);
  if (h.start_date === h.end_date) return start;
  const end = new Date(h.end_date + "T00:00:00").toLocaleDateString("fr-CH", opts);
  return `${start} au ${end}`;
}
