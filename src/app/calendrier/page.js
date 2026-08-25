import { query, getAllSettings } from "@/lib/db";
import { expandHolidayDays, formatHolidayRange } from "@/lib/holidays";
import CalendarList from "@/components/CalendarList";
import PracticeMap from "@/components/PracticeMap";
import { todayISO } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const metadata = { title: "Calendrier — International Basketball Club Geneva" };

// Builds the merged, date-ordered timeline (holiday bands + events) and
// hands it to a client component that owns the filters. All the date maths
// and database work stays here on the server.
function buildTimeline({ events, holidays, holidayDays, anchorDate, isPast }) {
  const bands = holidays.map((h) => ({
    type: "holiday",
    sortDate: h.start_date < anchorDate ? anchorDate : h.start_date,
    sortTime: "00:00",
    holiday: { ...h, range: formatHolidayRange(h) },
  }));

  const rows = events.map((e) => ({
    type: "event",
    sortDate: e.practice_date,
    sortTime: e.start_time || "00:00",
    event: e,
    holidayName: holidayDays[e.practice_date]?.name || null,
    isPast,
  }));

  return [...bands, ...rows].sort(
    (a, b) => a.sortDate.localeCompare(b.sortDate) || a.sortTime.localeCompare(b.sortTime)
  );
}

export default function CalendarPage() {
  const settings = getAllSettings();
  const today = todayISO();

  const upcoming = query(
    "SELECT * FROM practices WHERE practice_date >= ? ORDER BY practice_date ASC, start_time ASC",
    [today]
  );
  // Results: played games only, most recent first — nobody wants to scroll
  // past 40 finished practices to find last weekend's score.
  const results = query(
    `SELECT * FROM practices
     WHERE practice_date < ? AND kind = 'game' AND score_us IS NOT NULL
     ORDER BY practice_date DESC, start_time DESC
     LIMIT 20`,
    [today]
  );

  const teams = query("SELECT id, name FROM teams");
  const teamNameById = Object.fromEntries(teams.map((t) => [t.id, t.name]));

  const holidays = query(
    "SELECT * FROM holidays WHERE end_date >= ? ORDER BY start_date ASC",
    [today]
  );
  const holidayDays = expandHolidayDays(query("SELECT * FROM holidays"));

  const timeline = buildTimeline({
    events: upcoming,
    holidays,
    holidayDays,
    anchorDate: today,
    isPast: false,
  });
  const resultsTimeline = buildTimeline({
    events: results,
    holidays: [],
    holidayDays,
    anchorDate: today,
    isPast: true,
  }).reverse();

  return (
    <div className="mx-auto max-w-4xl px-4 py-14">
      <header className="mb-8 text-center">
        <h1 className="font-display text-4xl font-extrabold uppercase text-ibc-blue">Calendrier</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-ibc-ink/70">
          Tous les entraînements, matches et événements du club, toutes équipes confondues.
        </p>
        <a
          href="/api/calendar.ics"
          className="mt-5 inline-block rounded-full bg-ibc-blue px-6 py-3 text-sm font-bold uppercase tracking-wide text-white shadow transition hover:brightness-110"
        >
          S&apos;abonner au calendrier (.ics)
        </a>
        <p className="mt-2 text-xs text-ibc-ink/50">
          Ce lien peut être ajouté dans Google Calendar, Apple Calendar ou Outlook comme
          calendrier « par abonnement » : il se met à jour automatiquement quand l&apos;admin
          modifie le planning.
        </p>
      </header>

      <CalendarList items={timeline} teamNameById={teamNameById} />

      {resultsTimeline.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-center font-display text-2xl font-extrabold uppercase text-ibc-blue">
            Résultats
          </h2>
          <CalendarList items={resultsTimeline} teamNameById={teamNameById} showPast />
        </section>
      )}

      <div className="mt-16">
        <h2 className="font-display text-xl font-bold uppercase text-ibc-blue">
          Lieu d&apos;entraînement
        </h2>
        <p className="mt-1 text-sm text-ibc-ink/70">{settings.practice_location_address}</p>
        <PracticeMap address={settings.practice_location_address} />
      </div>
    </div>
  );
}
