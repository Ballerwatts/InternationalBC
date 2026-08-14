import Image from "next/image";
import Link from "next/link";

export default function PlayerCard({ p }) {
  return (
    <Link
      href={`/membres/${p.id}`}
      className="group overflow-hidden rounded-xl border border-black/5 bg-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative aspect-square bg-ibc-blue">
        {p.photo_data_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.photo_data_url}
            alt={`${p.first_name} ${p.last_name}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Image src="/logo.png" alt="" width={64} height={64} className="opacity-60" />
          </div>
        )}
        {p.jersey_number && (
          <span className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-ibc-accent font-display text-lg font-extrabold text-ibc-ink shadow">
            {p.jersey_number}
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="font-display text-base font-bold uppercase leading-tight text-ibc-ink">
          {p.first_name}
          <br />
          {p.last_name}
        </p>
        {p.position && <p className="text-xs text-ibc-ink/60">{p.position}</p>}
        {p.nationality && <p className="text-xs text-ibc-ink/50">{p.nationality}</p>}
        <div className="mt-2 flex justify-between text-xs text-ibc-ink/60">
          <span>{p.games_played} games</span>
          <span className="font-semibold text-ibc-blue">{p.ppg} pts/g</span>
        </div>
      </div>
    </Link>
  );
}
