import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { get } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getPlayerDues, CURRENT_SEASON } from "@/lib/dues";
import { statsForPlayer } from "@/lib/stats";
import { query } from "@/lib/db";
import { gameOutcome, outcomeClasses } from "@/lib/game-result";
import { stripPrivatePlayerFields } from "@/lib/player-privacy";
import { playerOfWeekFor } from "@/lib/player-of-week";
import { playerPhotoUrl } from "@/lib/media";
import { pageMetadata, snippet } from "@/lib/seo";

export const dynamic = "force-dynamic";

const ROLE_LABELS = { admin: "Super-admin", coach: "Coach", player: "Player" };

export async function generateMetadata({ params }) {
  const p = get(
    `SELECT players.*, teams.name AS team_name FROM players
     LEFT JOIN teams ON teams.id = players.team_id WHERE players.id = ? AND players.active = 1`,
    [params.id]
  );
  if (!p) return { robots: { index: false } };
  const name = `${p.first_name} ${p.last_name}`.trim();
  return pageMetadata({
    title: name,
    description: snippet(
      p.bio ||
        `${name}${p.position ? `, ${p.position},` : ""} plays for ${p.team_name || "International Geneva Basketball Club"} (IBBC) in Geneva. Player profile and season statistics.`
    ),
    path: `/membres/${p.id}/`,
    image: playerPhotoUrl(p) || undefined,
    type: "profile",
  });
}

export default async function MemberProfilePage({ params }) {
  const rawPlayer = get(
    `SELECT players.*, teams.name as team_name, teams.category as team_category
     FROM players LEFT JOIN teams ON teams.id = players.team_id
     WHERE players.id = ?`,
    [params.id]
  );
  if (!rawPlayer) notFound();

  const linkedUser = get("SELECT id, role FROM users WHERE player_id = ?", [rawPlayer.id]);
  const session = await getSession();
  // Contact info (email/phone) is only shown to logged-in members (staff or
  // players) — never on the public page, and never serialised into it either.
  const canSeeContact = !!session;
  const player = canSeeContact ? rawPlayer : stripPrivatePlayerFields(rawPlayer);

  // The administrative side (licence + season dues) is staff-only, plus a
  // player looking at their own profile.
  const isStaff = session?.role === "admin" || session?.role === "coach";
  const viewingOwnProfile =
    !!session && !!linkedUser && Number(session.sub) === Number(linkedUser.id);
  const dues = isStaff || viewingOwnProfile ? getPlayerDues(rawPlayer.id) : null;

  // Season stats come from recorded box scores as soon as there are any;
  // otherwise the pre-existing hand-typed figures stand (see lib/stats.js).
  const stats = statsForPlayer(rawPlayer);
  const potw = playerOfWeekFor(rawPlayer.id, rawPlayer.team_id);
  const recentGames = query(
    `SELECT p.id, p.practice_date, p.opponent, p.score_us, p.score_them,
            g.points, g.rebounds, g.assists, g.three_pointers, g.minutes
     FROM game_stats g JOIN practices p ON p.id = g.practice_id
     WHERE g.player_id = ?
     ORDER BY p.practice_date DESC
     LIMIT 5`,
    [rawPlayer.id]
  );

  const attendedCount = linkedUser
    ? get("SELECT COUNT(*) as c FROM practice_rsvp WHERE user_id = ? AND status = 'in'", [linkedUser.id])?.c || 0
    : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <Link href="/membres" className="text-xs font-bold uppercase text-ibc-blue hover:underline">
        ← Back to Players &amp; Members
      </Link>

      <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="relative aspect-square w-40 shrink-0 overflow-hidden rounded-xl bg-ibc-blue shadow-sm">
          {rawPlayer.photo_data_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={playerPhotoUrl(rawPlayer)}
              alt={`${player.first_name} ${player.last_name}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Image src="/logo.png" alt="" width={72} height={72} className="opacity-60" />
            </div>
          )}
        </div>

        <div className="flex-1">
          <h1 className="font-display text-3xl font-extrabold uppercase text-ibc-blue">
            {player.first_name} {player.last_name}
            {player.jersey_number && (
              <span className="ml-2 text-ibc-accent">#{player.jersey_number}</span>
            )}
          </h1>

          <div className="mt-2 flex flex-wrap gap-2">
            {player.team_name && (
              <Link
                href="/teams/"
                className="rounded-full bg-ibc-blue px-3 py-1 text-xs font-bold uppercase text-white hover:brightness-110"
              >
                {player.team_name}
              </Link>
            )}
            {linkedUser && (
              <span className="rounded-full bg-ibc-accent/20 px-3 py-1 text-xs font-bold uppercase text-ibc-ink">
                {ROLE_LABELS[linkedUser.role] || linkedUser.role}
              </span>
            )}
            {player.position && (
              <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold uppercase text-ibc-ink/70">
                {player.position}
              </span>
            )}
            {player.nationality && (
              <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold uppercase text-ibc-ink/70">
                {player.nationality}
              </span>
            )}
          </div>

          {player.team_category && (
            <p className="mt-2 text-sm text-ibc-ink/60">{player.team_category}</p>
          )}

          {/* Player of the week — the club's weekly shout-out, so the photo
              leads rather than sitting in the corner. Derived from this
              week's official games, so it clears itself next Monday. */}
          {potw && (
            <aside className="mb-6 flex items-center gap-4 rounded-xl border-2 border-ibc-accent bg-ibc-accent/5 p-4 sm:float-right sm:ml-6 sm:mb-4 sm:w-64 sm:flex-col sm:text-center">
              {rawPlayer.photo_data_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={playerPhotoUrl(rawPlayer)}
                  alt={`${rawPlayer.first_name} ${rawPlayer.last_name}`}
                  className="h-20 w-20 shrink-0 rounded-full object-cover sm:h-40 sm:w-40"
                />
              )}
              <div>
                <p className="font-display text-xs font-bold uppercase tracking-[0.15em] text-ibc-blue">
                  Player of the week
                </p>
                <p className="mt-1 text-sm text-ibc-ink/70">
                  {potw.points} points in {potw.games} game{potw.games > 1 ? "s" : ""}
                </p>
              </div>
            </aside>
          )}
          <div className={`mt-4 grid gap-3 ${attendedCount !== null ? "grid-cols-4" : "grid-cols-3"}`}>
            <Stat label="Games" value={stats.games} />
            <Stat label="Points" value={stats.points} />
            <Stat label="PPG" value={stats.ppg} />
            {/* Only shown once actually recorded — a blank average is more
                honest than a 0.0 nobody earned. */}
            {stats.rpg != null && <Stat label="RPG" value={stats.rpg} />}
            {stats.apg != null && <Stat label="APG" value={stats.apg} />}
            {stats.threePointers != null && <Stat label="3PT" value={stats.threePointers} />}
            {stats.mpg != null && <Stat label="Min/game" value={stats.mpg} />}
            {attendedCount !== null && <Stat label="Attended" value={attendedCount} />}
          </div>
          <p className="mt-1 text-[10px] uppercase tracking-wide text-ibc-ink/40">
            {stats.source === "recorded"
              ? `From ${stats.games} recorded game${stats.games === 1 ? "" : "s"}`
              : "Historical figures — updates automatically once game results are recorded"}
          </p>

          {recentGames.length > 0 && (
            <div className="mt-4 rounded-xl border border-black/5 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-ibc-blue">
                Last games
              </p>
              <ul className="mt-2 space-y-1">
                {recentGames.map((g) => {
                  const outcome = gameOutcome(g);
                  return (
                    <li key={g.id} className="flex items-center justify-between text-sm">
                      <span className="text-ibc-ink/70">
                        {g.practice_date}
                        {g.opponent ? ` · ${g.opponent}` : ""}
                      </span>
                      <span className="flex items-center gap-2">
                        {outcome && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${outcomeClasses(
                              outcome
                            )}`}
                          >
                            {g.score_us}–{g.score_them}
                          </span>
                        )}
                        <span className="font-display font-extrabold text-ibc-blue">
                          {[
                            `${g.points} pts`,
                            g.rebounds != null ? `${g.rebounds} reb` : null,
                            g.assists != null ? `${g.assists} ast` : null,
                            g.three_pointers != null ? `${g.three_pointers} 3pt` : null,
                            g.minutes != null ? `${g.minutes} min` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {player.bio && (
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ibc-ink/80">
              {player.bio}
            </p>
          )}

          <div className="mt-6 rounded-xl border border-black/5 bg-ibc-blue/5 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-ibc-blue">Contact</p>
            {canSeeContact ? (
              <div className="mt-1 space-y-0.5 text-sm text-ibc-ink/80">
                <p>{player.email || "No email on file"}</p>
                <p>{player.phone || "No phone on file"}</p>
              </div>
            ) : (
              <p className="mt-1 text-sm text-ibc-ink/50">
                Contact details are visible to logged-in club members only.{" "}
                <Link href="/login" className="font-semibold text-ibc-blue hover:underline">
                  Sign in
                </Link>{" "}
                to view.
              </p>
            )}
          </div>

          {dues && (
            <div className="mt-4 rounded-xl border border-black/5 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wide text-ibc-blue">
                  Administrative — season {CURRENT_SEASON}
                </p>
                <span className="text-[10px] uppercase tracking-wide text-ibc-ink/40">
                  {isStaff ? "Visible to staff" : "Visible to you only"}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-black/5 p-3 text-center">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                      dues.licensePaid
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {dues.licensePaid ? "Paid" : "Unpaid"}
                  </span>
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-ibc-ink/50">
                    Licence
                  </p>
                </div>
                <Stat label="Due (CHF)" value={dues.totalDue} />
                <Stat label="Paid (CHF)" value={dues.totalPaid} />
                <div className="rounded-lg border border-black/5 bg-white p-3 text-center shadow-sm">
                  <p
                    className={`font-display text-xl font-extrabold ${
                      dues.balance > 0 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {dues.balance > 0 ? dues.balance : 0}
                  </p>
                  <p className="text-[10px] uppercase tracking-wide text-ibc-ink/50">
                    {dues.balance > 0 ? "Still owed" : "Up to date"}
                  </p>
                </div>
              </div>

              {player.license_number && (
                <p className="mt-3 text-xs text-ibc-ink/60">
                  Licence no. <span className="font-semibold">{player.license_number}</span>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-black/5 bg-white p-3 text-center shadow-sm">
      <p className="font-display text-xl font-extrabold text-ibc-blue">{value ?? 0}</p>
      <p className="text-[10px] uppercase tracking-wide text-ibc-ink/50">{label}</p>
    </div>
  );
}
