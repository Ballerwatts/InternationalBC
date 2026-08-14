"use client";

import { useState } from "react";
import PlayerCard from "@/components/PlayerCard";

export default function TeamAccordion({ teams, players, unassigned }) {
  // Every squad starts collapsed — click a team's header to unfold its roster.
  const [openId, setOpenId] = useState(null);

  return (
    <div className="space-y-4">
      {teams.map((team) => {
        const roster = players.filter((p) => p.team_id === team.id);
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
