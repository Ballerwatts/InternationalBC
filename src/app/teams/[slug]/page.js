import Link from "next/link";
import { notFound } from "next/navigation";
import { get, query, getGymsForTeam, getSlotsForTeam } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { sanitizePlayers } from "@/lib/player-privacy";
import { withPhotoUrls } from "@/lib/media";
import { pageMetadata, snippet, jsonLd, absolute, BRAND } from "@/lib/seo";
import { todayISO } from "@/lib/dates";
import { eventLabel } from "@/lib/event-kinds";
import PlayerCard from "@/components/PlayerCard";
import RichText from "@/components/RichText";
import SponsorStrip from "@/components/SponsorStrip";

export const dynamic = "force-dynamic";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const USAGE = { practice: "Practice", games: "Home games", both: "Practice & home games" };

function loadTeam(slug) {
  return get("SELECT * FROM teams WHERE slug = ?", [String(slug)]) ?? null;
}

export function generateMetadata({ params }) {
  const team = loadTeam(params.slug);
  if (!team) return {};
  const schedule = getSlotsForTeam(team.id);
  const fallback = [
    `${team.name}${team.category ? ` — ${team.category}` : ""}, part of ${BRAND}.`,
    schedule.length
      ? `Training ${schedule.map((s) => `${DAY_NAMES[s.weekday]} ${s.start_time}–${s.end_time}`).join(", ")}.`
      : "",
    "Roster, schedule, gyms and results.",
  ].join(" ");
  return pageMetadata({
    title: team.name,
    description: snippet(team.description) || snippet(fallback),
    path: `/teams/${team.slug}/`,
  });
}

export default async function TeamPage({ params }) {
  const team = loadTeam(params.slug);
  if (!team) notFound();

  const canSeeContact = await isAuthenticated();
  const roster = withPhotoUrls(
    sanitizePlayers(
      query(
        `SELECT players.*, teams.name AS team_name FROM players
         LEFT JOIN teams ON teams.id = players.team_id
         WHERE players.active = 1 AND players.team_id = ?
         ORDER BY players.sort_order ASC, players.last_name ASC`,
        [team.id]
      ),
      canSeeContact
    )
  );
  const schedule = getSlotsForTeam(team.id);
  const gyms = getGymsForTeam(team.id);
  const today = todayISO();
  const upcoming = query(
    `SELECT * FROM practices WHERE team_id = ? AND practice_date >= ? AND kind IN ('game', 'friendly', 'tournament')
     ORDER BY practice_date ASC, start_time ASC LIMIT 6`,
    [team.id, today]
  );
  const results = query(
    `SELECT * FROM practices WHERE team_id = ? AND practice_date < ? AND kind IN ('game', 'friendly') AND score_us IS NOT NULL
     ORDER BY practice_date DESC LIMIT 6`,
    [team.id, today]
  );

  // The squad as structured data: its players, its halls, and the club it
  // belongs to — what lets a search engine show the team as an entity.
  const structured = {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name: team.name,
    sport: "Basketball",
    url: absolute(`/teams/${team.slug}/`),
    description: snippet(team.description) || undefined,
    memberOf: { "@type": "SportsOrganization", "@id": absolute("/#club"), name: BRAND },
    athlete: roster.map((p) => ({
      "@type": "Person",
      name: `${p.first_name} ${p.last_name}`.trim(),
      url: absolute(`/membres/${p.id}/`),
      ...(p.photo_url ? { image: absolute(p.photo_url) } : {}),
    })),
    location: gyms
      .filter((g) => g.address)
      .map((g) => ({ "@type": "SportsActivityLocation", name: g.name, address: g.address })),
  };

  return (
    <>
      <script {...jsonLd(structured)} />
      <div className="mx-auto max-w-6xl px-4 py-14">
        <Link href="/teams/" className="text-xs font-bold uppercase tracking-wide text-ibc-blue hover:underline">
          ← All teams
        </Link>
        <h1 className="mt-2 font-display text-4xl font-extrabold uppercase text-ibc-blue">{team.name}</h1>
        {team.category && <p className="mt-1 text-ibc-ink/60">{team.category}</p>}

        {team.description && <RichText text={team.description} className="mt-6 max-w-3xl" />}

        {(schedule.length > 0 || gyms.length > 0) && (
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {schedule.length > 0 && (
              <section className="rounded-xl bg-ibc-blue/5 p-5">
                <h2 className="font-display text-lg font-bold uppercase text-ibc-blue">Training Schedule</h2>
                <ul className="mt-3 space-y-1.5 text-ibc-ink/85">
                  {schedule.map((s) => (
                    <li key={s.id}>
                      <span className="font-semibold">{DAY_NAMES[s.weekday]}</span> {s.start_time}–{s.end_time}
                      {s.gym_name && <span className="text-ibc-ink/55"> · {s.gym_name}</span>}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {gyms.length > 0 && (
              <section className="rounded-xl bg-ibc-blue/5 p-5">
                <h2 className="font-display text-lg font-bold uppercase text-ibc-blue">
                  {gyms.length > 1 ? "Gyms" : "Gym"}
                </h2>
                <ul className="mt-3 space-y-3">
                  {gyms.map((g) => (
                    <li key={g.id}>
                      <p className="font-semibold text-ibc-ink">
                        {g.name}
                        {g.usage && <span className="ml-2 text-xs font-normal text-ibc-ink/50">{USAGE[g.usage] || g.usage}</span>}
                      </p>
                      {g.address && (
                        <a
                          href={g.maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(g.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-ibc-blue hover:underline"
                        >
                          {g.address}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        {(upcoming.length > 0 || results.length > 0) && (
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {upcoming.length > 0 && (
              <section>
                <h2 className="font-display text-lg font-bold uppercase text-ibc-blue">Upcoming</h2>
                <ul className="mt-3 divide-y divide-black/5 rounded-xl border border-black/5 bg-white text-sm shadow-sm">
                  {upcoming.map((e) => (
                    <li key={e.id} className="px-4 py-2.5">
                      <span className="font-semibold text-ibc-blue">{e.practice_date}</span>{" "}
                      <span className="text-ibc-ink/50">{e.start_time}</span> {eventLabel(e)}
                      {e.location_name && <span className="text-ibc-ink/50"> · {e.location_name}</span>}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {results.length > 0 && (
              <section>
                <h2 className="font-display text-lg font-bold uppercase text-ibc-blue">Results</h2>
                <ul className="mt-3 divide-y divide-black/5 rounded-xl border border-black/5 bg-white text-sm shadow-sm">
                  {results.map((g) => (
                    <li key={g.id} className="px-4 py-2.5">
                      <span className="text-ibc-ink/50">{g.practice_date}</span> {eventLabel(g)}{" "}
                      <span className="font-bold text-ibc-blue">
                        {g.score_us} – {g.score_them}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        <section className="mt-12">
          <h2 className="font-display text-2xl font-bold uppercase text-ibc-blue">
            Roster <span className="text-ibc-ink/40">({roster.length})</span>
          </h2>
          {roster.length === 0 ? (
            <p className="mt-3 text-ibc-ink/50">Roster coming soon.</p>
          ) : (
            <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {roster.map((p) => (
                <PlayerCard key={p.id} p={p} />
              ))}
            </div>
          )}
        </section>
      </div>
      <SponsorStrip />
    </>
  );
}
