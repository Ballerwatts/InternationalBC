import PracticeMap from "@/components/PracticeMap";
import PhotoZoom from "@/components/PhotoZoom";

const USAGE_BADGE = {
  practice: "Practice",
  games: "Home games",
  both: "Practice & home games",
};

/**
 * One hall, with the squads that use it. Rendered on the public Club page and
 * (compact, no map) inside each team's panel on the Teams page.
 *
 * `gym.teams` comes from getGymsWithTeams(); `teamsLabel` lets a caller
 * suppress the team list when the surrounding context already says whose gym
 * this is.
 */
export default function GymCard({ gym, showMap = true, showTeams = true, compact = false }) {
  const teams = gym.teams || [];

  return (
    <div
      className={`rounded-xl border border-black/5 bg-ibc-blue/5 ${compact ? "p-3" : "p-4"}`}
    >
      <p className="font-display text-base font-bold uppercase text-ibc-blue">{gym.name}</p>
      {gym.address && <p className="mt-1 text-sm text-ibc-ink/70">{gym.address}</p>}
      {gym.notes && <p className="mt-1 text-xs italic text-ibc-ink/55">{gym.notes}</p>}

      {/* When the caller passed a per-team row (getGymsByTeamId), the usage
          lives on the gym itself rather than in gym.teams. */}
      {!showTeams && gym.usage && (
        <p className="mt-2 inline-block rounded-full bg-white px-3 py-1 text-xs font-semibold text-ibc-blue shadow-sm">
          {USAGE_BADGE[gym.usage] || USAGE_BADGE.practice}
          {gym.schedule_note ? (
            <span className="ml-1 font-normal text-ibc-ink/55">· {gym.schedule_note}</span>
          ) : null}
        </p>
      )}

      {showTeams && teams.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {teams.map((t) => (
            <li
              key={t.id ?? `${t.team_id}-${gym.id}`}
              className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ibc-blue shadow-sm"
            >
              {t.team_name}
              <span className="ml-1 font-normal text-ibc-ink/50">
                · {USAGE_BADGE[t.usage] || USAGE_BADGE.practice}
                {t.schedule_note ? ` · ${t.schedule_note}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}

      {showTeams && teams.length === 0 && (
        <p className="mt-2 text-xs text-ibc-ink/45">No squad assigned to this hall yet.</p>
      )}

      {(gym.photo_exterior_data_url || gym.photo_interior_data_url) && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <PhotoZoom
            src={gym.photo_exterior_data_url}
            alt={`${gym.name} — entrance`}
            caption="Entrance"
          />
          <PhotoZoom
            src={gym.photo_interior_data_url}
            alt={`${gym.name} — inside`}
            caption="Inside"
          />
        </div>
      )}

      {showMap && gym.address && <PracticeMap address={gym.address} mapsUrl={gym.maps_url} />}

      {!showMap && gym.address && (
        <a
          href={
            gym.maps_url ||
            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(gym.address)}`
          }
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-xs font-bold uppercase tracking-wide text-ibc-blue hover:underline"
        >
          Open in Google Maps →
        </a>
      )}
    </div>
  );
}
