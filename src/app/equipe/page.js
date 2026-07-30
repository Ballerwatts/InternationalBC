import Image from "next/image";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Équipe — Maccabi Basketball Club Genève" };

export default function TeamPage() {
  const players = query(
    "SELECT * FROM players WHERE active = 1 ORDER BY sort_order ASC, last_name ASC"
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <header className="mb-10 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-mbc-blue/70">
          Saison 2026–2027
        </p>
        <h1 className="font-display text-4xl font-extrabold uppercase text-mbc-blue">
          L&apos;équipe
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-mbc-ink/70">
          Maccabi Basketball Club Genève évolue en 2ème ligue cantonale (A.C.G.B.A.), la plus
          haute ligue amateur du canton.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {players.map((p) => (
          <div
            key={p.id}
            className="group overflow-hidden rounded-xl border border-black/5 bg-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="relative aspect-square bg-mbc-blue">
              {p.photo_data_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.photo_data_url}
                  alt={`${p.first_name} ${p.last_name}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Image src="/logo.svg" alt="" width={64} height={64} className="opacity-60" />
                </div>
              )}
              {p.jersey_number && (
                <span className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-mbc-yellow font-display text-lg font-extrabold text-mbc-ink shadow">
                  {p.jersey_number}
                </span>
              )}
            </div>
            <div className="p-3">
              <p className="font-display text-base font-bold uppercase leading-tight text-mbc-ink">
                {p.first_name}
                <br />
                {p.last_name}
              </p>
              {p.position && <p className="text-xs text-mbc-ink/60">{p.position}</p>}
              <div className="mt-2 flex justify-between text-xs text-mbc-ink/60">
                <span>{p.games_played} matchs</span>
                <span className="font-semibold text-mbc-blue">{p.ppg} pts/m</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {players.length === 0 && (
        <p className="text-center text-mbc-ink/60">Aucun joueur pour le moment.</p>
      )}
    </div>
  );
}
