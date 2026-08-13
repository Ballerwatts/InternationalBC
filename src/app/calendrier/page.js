import { query, getAllSettings } from "@/lib/db";
import PracticeMap from "@/components/PracticeMap";

export const dynamic = "force-dynamic";
export const metadata = { title: "Calendrier — International Basketball Club Genève" };

function formatDate(dateStr) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("fr-CH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function CalendarPage() {
  const settings = getAllSettings();
  const today = new Date().toISOString().slice(0, 10);
  const events = query(
    "SELECT * FROM practices WHERE practice_date >= ? ORDER BY practice_date ASC, start_time ASC",
    [today]
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-14">
      <header className="mb-8 text-center">
        <h1 className="font-display text-4xl font-extrabold uppercase text-ibc-blue">
          Calendrier
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-ibc-ink/70">
          Entraînements le lundi et le jeudi, 20h–22h, à l&apos;École de commerce
          Raymond-Uldry. Un match par semaine en 2ème ligue cantonale.
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

      <ol className="space-y-3">
        {events.map((e) => (
          <li
            key={e.id}
            className="flex flex-col gap-2 rounded-xl border border-black/5 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-display text-lg font-bold capitalize text-ibc-ink">
                {formatDate(e.practice_date)}
              </p>
              <p className="text-sm text-ibc-ink/60">
                {e.start_time}–{e.end_time} ·{" "}
                <span
                  className={
                    e.kind === "game" ? "font-semibold text-ibc-accent-deep" : "text-ibc-ink/60"
                  }
                >
                  {e.kind === "game" ? `Match${e.opponent ? " vs " + e.opponent : ""}` : "Entraînement"}
                </span>
              </p>
              {e.location_name && (
                <p className="text-xs text-ibc-ink/50">
                  {e.location_name}
                  {e.location_address ? ` — ${e.location_address}` : ""}
                </p>
              )}
              {e.notes && <p className="mt-1 text-xs text-ibc-ink/60">{e.notes}</p>}
            </div>
            <a
              href={`/api/calendar/${e.id}.ics`}
              className="shrink-0 self-start rounded-full border-2 border-ibc-blue px-4 py-2 text-xs font-bold uppercase text-ibc-blue transition hover:bg-ibc-blue hover:text-white sm:self-center"
            >
              + Ajouter à l&apos;agenda
            </a>
          </li>
        ))}
        {events.length === 0 && (
          <p className="text-center text-ibc-ink/60">Aucun événement à venir pour le moment.</p>
        )}
      </ol>

      <div className="mt-12">
        <h2 className="font-display text-xl font-bold uppercase text-ibc-blue">
          Lieu d&apos;entraînement
        </h2>
        <p className="mt-1 text-sm text-ibc-ink/70">{settings.practice_location_address}</p>
        <PracticeMap address={settings.practice_location_address} />
      </div>
    </div>
  );
}
