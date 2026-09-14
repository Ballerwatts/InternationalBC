import { query } from "@/lib/db";
import { sponsorLogoUrl } from "@/lib/media";

/**
 * Sponsor logos in the footer, centred and deliberately larger than the
 * social icons next to them (those are h-9; these are h-14, ~1.5x). A
 * sponsor's logo outranking a Facebook glyph is the point.
 */
export default function FooterSponsors() {
  const sponsors = query("SELECT * FROM sponsors ORDER BY sort_order ASC, id ASC");
  if (sponsors.length === 0) return null;

  return (
    <div className="border-t border-white/10 px-4 py-6">
      <p className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">
        Our sponsors
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-8">
        {sponsors.map((s) => {
          const logo = sponsorLogoUrl(s) ? (
            // A logo made for print is usually dark; the footer is dark too,
            // so a white plate keeps it legible instead of invisible.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={sponsorLogoUrl(s)}
              alt={s.name}
              className="h-14 w-auto rounded bg-white/95 object-contain p-1.5"
            />
          ) : (
            <span className="font-display text-base font-bold uppercase text-white/70">
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
  );
}
