import { query } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tableau d'entraînement — International Basketball Club Genève" };

function formatWeek(dateStr) {
  const start = new Date(dateStr + "T00:00:00");
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (d) => d.toLocaleDateString("fr-CH", { day: "numeric", month: "long" });
  return `Semaine du ${fmt(start)} au ${fmt(end)}`;
}

export default function PracticeBoardPage() {
  const entries = query("SELECT * FROM practice_board ORDER BY week_start_date DESC");

  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <header className="mb-8 text-center">
        <h1 className="font-display text-4xl font-extrabold uppercase text-ibc-blue">
          Tableau d&apos;entraînement
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-ibc-ink/70">
          Le programme de la semaine : focus, exercices et consignes du coach.
        </p>
      </header>

      <div className="space-y-6">
        {entries.map((e, i) => (
          <article
            key={e.id}
            className={`rounded-xl border p-6 shadow-sm ${
              i === 0 ? "border-ibc-accent bg-ibc-accent/10 ring-2 ring-ibc-accent" : "border-black/5 bg-white"
            }`}
          >
            <p className="text-xs font-bold uppercase tracking-wide text-ibc-blue/70">
              {formatWeek(e.week_start_date)} {i === 0 && "· Semaine en cours"}
            </p>
            {e.focus && (
              <h2 className="mt-1 font-display text-2xl font-bold text-ibc-ink">{e.focus}</h2>
            )}
            {e.drills && (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase text-ibc-blue">Exercices</p>
                <ul className="mt-1 list-inside list-disc text-sm text-ibc-ink/80">
                  {e.drills.split("\n").filter(Boolean).map((line, j) => (
                    <li key={j}>{line}</li>
                  ))}
                </ul>
              </div>
            )}
            {e.notes && (
              <p className="mt-3 whitespace-pre-line text-sm text-ibc-ink/70">{e.notes}</p>
            )}
          </article>
        ))}

        {entries.length === 0 && (
          <p className="text-center text-ibc-ink/60">
            Aucun programme publié pour le moment — à venir depuis l&apos;espace admin.
          </p>
        )}
      </div>
    </div>
  );
}
