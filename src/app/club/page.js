import { getAllSettings, query, getGymsWithTeams } from "@/lib/db";
import GymCard from "@/components/GymCard";
import SponsorStrip from "@/components/SponsorStrip";

export const dynamic = "force-dynamic";
export const metadata = { title: "The Club — International Basketball Club Geneva (IBBC)" };

export default function ClubPage() {
  const settings = getAllSettings();
  const teams = query("SELECT * FROM teams ORDER BY sort_order ASC, name ASC");
  const gyms = getGymsWithTeams();
  const assignedTeamIds = new Set(gyms.flatMap((g) => (g.teams || []).map((t) => t.team_id)));
  const unassigned = teams.filter((t) => !assignedTeamIds.has(t.id));

  return (
    <>
    <div className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="font-display text-4xl font-extrabold uppercase text-ibc-blue">The Club</h1>
      <p className="mt-4 whitespace-pre-line leading-relaxed text-ibc-ink/80">
        {settings.club_about}
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        <InfoCard label="Teams" value="4 squads" />
        <InfoCard label="Association Cantonale de Basketball Amateur" value="A.C.G.B.A." />
        <InfoCard label="Season" value={settings.season_label} />
      </div>

      <h2 className="mt-12 font-display text-2xl font-bold uppercase text-ibc-blue">Our gyms</h2>
      <p className="mt-2 text-sm text-ibc-ink/60">
        Every hall the club uses, and which squads you will find there. A squad
        can train in one gym and play its home games in another — and a gym can
        host several squads. Managed from the admin Gyms page.
      </p>
      <div className="mt-4 space-y-6">
        {gyms.map((gym) => (
          <GymCard key={gym.id} gym={gym} />
        ))}
        {gyms.length === 0 && (
          <p className="text-sm text-ibc-ink/50">No gyms listed yet.</p>
        )}
        {unassigned.length > 0 && (
          <p className="text-sm text-ibc-ink/50">
            Venue to be announced for {unassigned.map((t) => t.name).join(", ")}.
          </p>
        )}
      </div>

      <h2 className="mt-12 font-display text-2xl font-bold uppercase text-ibc-blue">Games</h2>
      <p className="mt-2 text-ibc-ink/80">
        Each team plays weekly in its league — see the{" "}
        <a href="/calendrier" className="font-semibold text-ibc-blue underline">
          calendar
        </a>{" "}
        for dates and opponent venues.
      </p>

      <h2 id="contact" className="mt-12 scroll-mt-24 font-display text-2xl font-bold uppercase text-ibc-blue">
        Contact
      </h2>
      <div className="mt-3 rounded-xl border border-black/5 bg-ibc-blue/5 p-5 text-sm leading-relaxed text-ibc-ink/80">
        <p className="font-display text-base font-bold uppercase text-ibc-blue">
          International Basketball Club Geneva
        </p>
        <p>C/O Souhail BELHADJ, Club President</p>
        <p>Chemin Eugène-Rigot 2, Case postale 136, 1211 Genève 21</p>
        <p>
          Email:{" "}
          <a href="mailto:internationalbbcgeneve@gmail.com" className="font-semibold text-ibc-blue hover:underline">
            internationalbbcgeneve@gmail.com
          </a>
        </p>
      </div>
    </div>
      <SponsorStrip />
    </>
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
