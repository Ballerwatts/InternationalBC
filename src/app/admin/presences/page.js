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

  // Running tally per player across every practice/game they've responded
  // to (not just the upcoming ones above) — the /api/rsvp admin view
  // already returns every RSVP row, so this is a simple client-side count.
  const tally = useMemo(() => {
    const counts = {};
    for (const r of rsvps) {
      counts[r.user_name] = counts[r.user_name] || { in: 0, out: 0 };
      counts[r.user_name][r.status] += 1;
    }
    return Object.entries(counts)
      .map(([name, c]) => ({ name, ...c, total: c.in + c.out }))
      .sort((a, b) => b.in - a.in);
  }, [rsvps]);

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-3xl font-extrabold uppercase text-ibc-blue">Présences</h1>
      <p className="mt-1 text-sm text-ibc-ink/60">
        Le marquage individuel « présent / absent » de chaque joueur pour les prochaines séances
        (distinct des déclarations de voyage/absence longue durée, voir « Disponibilités »).
      </p>

      {!loading && tally.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-xl border border-black/5 bg-white shadow-sm">
          <p className="border-b border-black/5 px-4 py-2 text-xs font-bold uppercase tracking-wide text-ibc-blue">
            Cumul de présences par joueur
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/5 text-left text-xs uppercase text-ibc-ink/50">
                <th className="px-4 py-2">Joueur</th>
                <th className="px-4 py-2">Présent</th>
                <th className="px-4 py-2">Absent</th>
                <th className="px-4 py-2">Réponses</th>
              </tr>
            </thead>
            <tbody>
              {tally.map((t) => (
                <tr key={t.name} className="border-b border-black/5 last:border-0">
                  <td className="px-4 py-2 font-semibold">{t.name}</td>
                  <td className="px-4 py-2 text-green-700">{t.in}</td>
                  <td className="px-4 py-2 text-red-600">{t.out}</td>
                  <td className="px-4 py-2 text-ibc-ink/60">{t.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
