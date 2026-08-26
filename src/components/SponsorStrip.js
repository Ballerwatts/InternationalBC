import { query } from "@/lib/db";

/**
 * The club's sponsors, on every public page rather than only the home page —
 * a sponsor is paying for visibility and the calendar is the page members
 * actually open.
 *
 * A server component so no page has to fetch or pass them down: drop it in
 * and it reads the table itself.
 */
export default function SponsorStrip({ title = "Our Sponsors", className = "" }) {
  const sponsors = query("SELECT * FROM sponsors ORDER BY sort_order ASC, id ASC");
  if (sponsors.length === 0) return null;

  return (
    <section className={`border-t border-black/5 bg-ibc-ink/[0.02] py-10 ${className}`}>
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-center font-display text-xl font-bold uppercase text-ibc-blue">
          {title}
        </h2>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-8">
          {sponsors.map((s) => {
            // A main sponsor bought a bigger slot; the tier is the deal.
            const isMain = s.tier === "main";
            const logo = s.logo_data_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={s.logo_data_url}
                alt={s.name}
                className={`w-auto object-contain ${isMain ? "max-h-20" : "max-h-12"}`}
              />
            ) : (
              <span
                className={`font-display font-bold uppercase text-ibc-blue ${
                  isMain ? "text-2xl" : "text-base"
                }`}
              >
                {s.name}
              </span>
            );
            return s.website_url ? (
              <a
                key={s.id}
                href={s.website_url}
                target="_blank"
                rel="noopener noreferrer"
                title={s.name}
                className="transition hover:opacity-80"
              >
                {logo}
              </a>
            ) : (
              <span key={s.id} title={s.name}>
                {logo}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
