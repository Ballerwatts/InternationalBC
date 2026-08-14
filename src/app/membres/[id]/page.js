import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { get } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ROLE_LABELS = { admin: "Super-admin", coach: "Coach", player: "Player" };

export async function generateMetadata({ params }) {
  const p = get("SELECT first_name, last_name FROM players WHERE id = ?", [params.id]);
  return { title: p ? `${p.first_name} ${p.last_name} — IBBC` : "Member — IBBC" };
}

export default async function MemberProfilePage({ params }) {
  const player = get(
    `SELECT players.*, teams.name as team_name, teams.category as team_category
     FROM players LEFT JOIN teams ON teams.id = players.team_id
     WHERE players.id = ?`,
    [params.id]
  );
  if (!player) notFound();

  const linkedUser = get("SELECT id, role FROM users WHERE player_id = ?", [player.id]);
  const session = await getSession();
  // Contact info (email/phone) is only shown to logged-in members (staff or
  // players) — never on the public page.
  const canSeeContact = !!session;

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
          {player.photo_data_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={player.photo_data_url}
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
                href="/equipe"
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

          <div className={`mt-4 grid gap-3 ${attendedCount !== null ? "grid-cols-4" : "grid-cols-3"}`}>
            <Stat label="Games" value={player.games_played} />
            <Stat label="Points" value={player.total_points} />
            <Stat label="Pts/game" value={player.ppg} />
            {attendedCount !== null && <Stat label="Attended" value={attendedCount} />}
          </div>

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
