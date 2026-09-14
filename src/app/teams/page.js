import Link from "next/link";
import { query, getSlotsByTeamId, getGymsByTeamId } from "@/lib/db";
import { getSitePage } from "@/lib/site-pages";
import { pageMetadata, snippet } from "@/lib/seo";
import RichText from "@/components/RichText";
import SponsorStrip from "@/components/SponsorStrip";

export const dynamic = "force-dynamic";

const PATH = "/teams/";
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function generateMetadata() {
  const page = getSitePage(PATH);
  return pageMetadata({
    title: page?.title || "Teams",
    description: page?.description || snippet(page?.body),
    path: PATH,
  });
}

// One card per squad, each linking to that squad's own page at the address
// WordPress had indexed. Each team being its own URL is what lets it rank for
// its own name — an accordion on one page could only ever rank as "Teams".
export default function TeamsIndexPage() {
  const page = getSitePage(PATH);
  const teams = query(
    `SELECT t.*, (SELECT COUNT(*) FROM players p WHERE p.team_id = t.id AND p.active = 1) AS player_count
     FROM teams t WHERE t.slug IS NOT NULL ORDER BY t.sort_order ASC, t.name ASC`
  );
  const scheduleByTeam = getSlotsByTeamId();
  const gymsByTeam = getGymsByTeamId();

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-14">
        <header className="mx-auto mb-10 max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-ibc-blue/70">Season 2026–2027</p>
          <h1 className="font-display text-4xl font-extrabold uppercase text-ibc-blue">{page?.title || "Teams"}</h1>
          {page?.body && <RichText text={page.body} className="mt-3 text-left sm:text-center" />}
        </header>

        <ul className="grid gap-5 sm:grid-cols-2">
          {teams.map((t) => {
            const schedule = scheduleByTeam[t.id] || [];
            const gyms = gymsByTeam[t.id] || [];
            return (
              <li key={t.id}>
                <Link
                  href={`/teams/${t.slug}/`}
                  className="group block h-full rounded-xl border border-black/5 bg-white p-6 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <h2 className="font-display text-2xl font-extrabold uppercase text-ibc-blue group-hover:underline">
                    {t.name}
                  </h2>
                  {t.category && <p className="mt-1 text-sm text-ibc-ink/60">{t.category}</p>}
                  {schedule.length > 0 && (
                    <p className="mt-3 text-sm text-ibc-ink/75">
                      {schedule.map((s) => `${DAY_SHORT[s.weekday]} ${s.start_time}–${s.end_time}`).join(" · ")}
                    </p>
                  )}
                  {gyms.length > 0 && (
                    <p className="text-sm text-ibc-ink/50">{gyms.map((g) => g.name).join(" · ")}</p>
                  )}
                  <p className="mt-4 flex items-center justify-between text-xs font-bold uppercase">
                    <span className="rounded-full bg-ibc-blue/10 px-3 py-1 text-ibc-blue">
                      {t.player_count} player{t.player_count === 1 ? "" : "s"}
                    </span>
                    <span className="text-ibc-blue">View team →</span>
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="mt-10 text-center text-sm text-ibc-ink/60">
          Looking for a specific player?{" "}
          <Link href="/membres/" className="font-semibold text-ibc-blue underline">
            Browse all members
          </Link>
          .
        </p>
      </div>
      <SponsorStrip />
    </>
  );
}
