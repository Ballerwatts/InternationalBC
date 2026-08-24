import { SOCIAL_NETWORKS } from "@/lib/socials";

/**
 * The club's social logos.
 *
 * Deliberately renders every network whether or not a URL is on file: with
 * no URL the logo is shown as a plain (non-clickable, dimmed) badge, and it
 * turns into a real link the moment someone pastes the address in
 * Marketing → Social & Instagram. That way the row of logos can go live now
 * and the accounts can be hooked up later without touching the code.
 */
export default function SocialLinks({ settings, className = "" }) {
  return (
    <ul className={`flex flex-wrap items-center gap-2 ${className}`}>
      {SOCIAL_NETWORKS.map((net) => {
        const url = (settings?.[net.settingKey] || "").trim();
        const shared =
          "flex h-9 w-9 items-center justify-center rounded-full border transition";
        const icon = <Icon path={net.path} />;

        return (
          <li key={net.key}>
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                aria-label={net.label}
                title={net.label}
                className={`${shared} border-white/20 bg-white/5 text-white hover:border-ibc-accent hover:bg-ibc-accent hover:text-ibc-ink`}
              >
                {icon}
              </a>
            ) : (
              <span
                aria-label={net.label}
                title={`${net.label} — lien à venir`}
                className={`${shared} cursor-default border-white/10 bg-white/[0.03] text-white/35`}
              >
                {icon}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Icon({ path }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}
