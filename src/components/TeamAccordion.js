"use client";

import { useState } from "react";
import PlayerCard from "@/components/PlayerCard";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const USAGE = { practice: "Practice", games: "Home games", both: "Practice & home games" };

export default function TeamAccordion({
  teams,
  players,
  unassigned,
  gymsByTeam = {},
  scheduleByTeam = {},
}) {
  // Every squad starts collapsed — click a team's header to unfold its roster.
  const [openId, setOpenId] = useState(null);

  return (
    <div className="space-y-4">
      {teams.map((team) => {
        const roster = players.filter((p) => p.team_id === team.id);
        const schedule = scheduleByTeam[team.id] || [];
        const gyms = gymsByTeam[team.id] || [];
        const isOpen = openId === team.id;
        return (
          <section key={team.id} className="rounded-xl border border-black/5 bg-white shadow-sm">
            <button
              onClick={() => setOpenId(isOpen ? null : team.id)}
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
            >
              <div>
                <h2 className="font-display text-xl font-extrabold uppercase text-ibc-blue sm:text-2xl">
                  {team.name}
                </h2>
                {team.category && <p className="text-sm text-ibc-ink/60">{team.category}</p>}
                {/* The rhythm at a glance, even with the panel closed. */}
                {schedule.length > 0 && (
                  <p className="mt-0.5 text-xs text-ibc-ink/50">
                    {schedule
                      .map((s) => `${DAY_NAMES[s.weekday].slice(0, 3)} ${s.start_time}–${s.end_time}`)
                      .join(" · ")}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="rounded-full bg-ibc-blue/10 px-3 py-1 text-xs font-bold uppercase text-ibc-blue">
                  {roster.length} player{roster.length === 1 ? "" : "s"}
                </span>
                <span className="text-lg text-ibc-blue transition-transform" style={{ transform: isOpen ? "rotate(180deg)" : "none" }}>
                  ▾
                </span>
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-black/5 px-5 py-5">
                {(schedule.length > 0 || gyms.length > 0) && (
                  <div className="mb-6 grid gap-4 sm:grid-cols-2">
                    {schedule.length > 0 && (
                      <div className="rounded-lg bg-ibc-blue/5 p-4">
                        <h3 className="font-display text-sm font-bold uppercase tracking-wide text-ibc-blue">
                          Training Schedule
                        </h3>
                        <ul className="mt-2 space-y-1 text-sm text-ibc-ink/80">
                          {schedule.map((s) => (
                            <li key={s.id}>
                              <span className="font-semibold">{DAY_NAMES[s.weekday]}</span>{" "}
                              {s.start_time}–{s.end_time}
                              {s.gym_name && (
                                <span className="text-ibc-ink/50"> · {s.gym_name}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {gyms.length > 0 && (
                      <div className="rounded-lg bg-ibc-blue/5 p-4">
                        <h3 className="font-display text-sm font-bold uppercase tracking-wide text-ibc-blue">
                          {gyms.length > 1 ? "Gyms" : "Gym"}
                        </h3>
                        <ul className="mt-2 space-y-2 text-sm">
                          {gyms.map((g) => (
                            <li key={g.id}>
                              <p className="font-semibold text-ibc-ink">
                                {g.name}
                                {g.usage && (
                                  <span className="ml-2 text-xs font-normal text-ibc-ink/50">
                                    {USAGE[g.usage] || g.usage}
                                  </span>
                                )}
                              </p>
                              {g.address && (
                                <a
                                  href={
                                    g.maps_url ||
                                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(g.address)}`
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-ibc-blue hover:underline"
                                >
                                  {g.address}
                                </a>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                {roster.length === 0 ? (
                  <p className="text-sm text-ibc-ink/50">Roster coming soon.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
                    {roster.map((p) => (
                      <PlayerCard key={p.id} p={p} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        );
      })}

      {unassigned.length > 0 && (
        <UnassignedSection players={unassigned} />
      )}
    </div>
  );
}

function UnassignedSection({ players }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-xl border border-black/5 bg-white shadow-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <h2 className="font-display text-xl font-extrabold uppercase text-ibc-blue">
          Other players
        </h2>
        <div className="flex shrink-0 items-center gap-3">
          <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-bold uppercase text-ibc-ink/70">
            {players.length} player{players.length === 1 ? "" : "s"}
          </span>
          <span className="text-lg text-ibc-blue transition-transform" style={{ transform: open ? "rotate(180deg)" : "none" }}>
            ▾
          </span>
        </div>
      </button>
      {open && (
        <div className="border-t border-black/5 px-5 py-5">
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {players.map((p) => (
              <PlayerCard key={p.id} p={p} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
