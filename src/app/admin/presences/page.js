"use client";

import { useEffect, useMemo, useState } from "react";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminPresencesPage() {
  const [practices, setPractices] = useState([]);
  const [rsvps, setRsvps] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  function refresh() {
    Promise.all([
      fetch(`/api/practices?from=${todayIso()}`).then((r) => r.json()),
      fetch("/api/rsvp").then((r) => r.json()),
      fetch("/api/admin/users").then((r) => r.json()),
    ]).then(([p, r, u]) => {
      setPractices(Array.isArray(p) ? p : []);
      setRsvps(Array.isArray(r) ? r : []);
      setUsers(Array.isArray(u) ? u : []);
      setLoading(false);
    });
  }

  useEffect(refresh, []);

  const players = useMemo(() => users.filter((u) => u.role === "player" && u.active), [users]);

  const rows = useMemo(() => {
    return practices.slice(0, 16).map((pr) => {
      const forThisPractice = rsvps.filter((r) => r.practice_id === pr.id);
      const in_ = forThisPractice.filter((r) => r.status === "in");
      const out = forThisPractice.filter((r) => r.status === "out");
      const noResponse = players.length - forThisPractice.length;
      return { ...pr, in_, out, noResponse };
    });
  }, [practices, rsvps, players]);

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-3xl font-extrabold uppercase text-ibc-blue">Présences</h1>
      <p className="mt-1 text-sm text-ibc-ink/60">
        Le marquage individuel « présent / absent » de chaque joueur pour les prochaines séances
        (distinct des déclarations de voyage/absence longue durée, voir « Disponibilités »).
      </p>

      {!loading && (
        <div className="mt-6 space-y-4">
          {rows.length === 0 && (
            <p className="text-sm text-ibc-ink/50">Aucune séance à venir dans le calendrier.</p>
          )}
          {rows.map((pr) => (
            <div key={pr.id} className="rounded-xl border border-black/5 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-ibc-ink">
                {pr.practice_date} · {pr.start_time}–{pr.end_time}
                <span className="ml-2 rounded-full bg-ibc-blue/10 px-2 py-0.5 text-xs font-bold uppercase text-ibc-blue">
                  {pr.kind === "game" ? `Match${pr.opponent ? " vs " + pr.opponent : ""}` : "Entraînement"}
                </span>
              </p>
              <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs font-bold uppercase text-green-700">
                    Présents ({pr.in_.length})
                  </p>
                  <p className="mt-1 text-ibc-ink/70">
                    {pr.in_.map((r) => r.user_name).join(", ") || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-red-600">Absents ({pr.out.length})</p>
                  <p className="mt-1 text-ibc-ink/70">
                    {pr.out.map((r) => r.user_name).join(", ") || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-ibc-ink/50">
                    Sans réponse ({pr.noResponse})
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
