import { getAllSettings } from "@/lib/db";
import PracticeMap from "@/components/PracticeMap";

export const dynamic = "force-dynamic";
export const metadata = { title: "Le club — International Basketball Club Genève" };

export default function ClubPage() {
  const settings = getAllSettings();

  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="font-display text-4xl font-extrabold uppercase text-ibc-blue">Le club</h1>
      <p className="mt-4 whitespace-pre-line leading-relaxed text-ibc-ink/80">
        {settings.club_about}
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        <InfoCard label="Ligue" value="2ème Ligue Cantonale" />
        <InfoCard label="Fédération" value="A.C.G.B.A." />
        <InfoCard label="Saison" value={settings.season_label} />
      </div>

      <h2 className="mt-12 font-display text-2xl font-bold uppercase text-ibc-blue">
        Entraînements
      </h2>
      <p className="mt-2 text-ibc-ink/80">
        Deux séances par semaine, le <strong>lundi</strong> et le <strong>jeudi</strong>, de{" "}
        <strong>20h à 22h</strong>, à l&apos;{settings.practice_location_name}.
      </p>
      <p className="mt-1 text-sm text-ibc-ink/60">{settings.practice_location_address}</p>
      <PracticeMap address={settings.practice_location_address} />

      <h2 className="mt-12 font-display text-2xl font-bold uppercase text-ibc-blue">Matches</h2>
      <p className="mt-2 text-ibc-ink/80">
        L&apos;équipe dispute un match par semaine en 2ème ligue cantonale senior — voir le{" "}
        <a href="/calendrier" className="font-semibold text-ibc-blue underline">
          calendrier
        </a>{" "}
        pour les dates et adresses des salles adverses.
      </p>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-xl border border-black/5 bg-ibc-blue/5 p-4 text-center">
      <p className="font-display text-lg font-bold text-ibc-blue">{value}</p>
      <p className="text-xs uppercase tracking-wide text-ibc-ink/60">{label}</p>
    </div>
  );
}
