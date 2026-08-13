"use client";

import { useEffect, useState } from "react";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function PlayerPresencesPage() {
  const [practices, setPractices] = useState([]);
  const [rsvps, setRsvps] = useState([]);
  const [loading, setLoading] = useState(true);

  function refresh() {
    Promise.all([
      fetch(`/api/practices?from=${todayIso()}`).then((r) => r.json()),
      fetch("/api/rsvp").then((r) => r.json()),
    ]).then(([p, r]) => {
      setPractices(Array.isArray(p) ? p : []);
      setRsvps(Array.isArray(r) ? r : []);
      setLoading(false);
    });
  }

  useEffect(refresh, []);

  async function setStatus(practiceId, status) {
    await fetch("/api/rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ practice_id: practiceId, status }),
    });
    refresh();
  }

  const byPractice = {};
  for (const r of rsvps) byPractice[r.practice_id] = r.status;

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl font-extrabold uppercase text-ibc-blue">Présences</h1>
      <p className="mt-1 text-sm text-ibc-ink/60">
        Marquez si vous serez présent à chaque entraînement ou match à venir — le coach voit
        l&apos;effectif attendu en temps réel.
      </p>

      {!loading && practices.length === 0 && (
        <p className="mt-6 text-sm text-ibc-ink/50">Aucun entraînement ou match programmé pour le moment.</p>
      )}

      <ul className="mt-6 space-y-2">
        {practices.map((p) => {
          const status = byPractice[p.id];
          return (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/5 bg-white p-4 shadow-sm"
            >
              <div>
                <p className="text-sm font-semibold text-ibc-ink">
                  {formatFr(p.practice_date)} · {p.start_time}–{p.end_time}
                  <span className="ml-2 rounded-full bg-ibc-blue/10 px-2 py-0.5 text-xs font-bold uppercase text-ibc-blue">
                    {p.kind === "game" ? `Match${p.opponent ? " vs " + p.opponent : ""}` : "Entraînement"}
                  </span>
                </p>
                {p.location_name && <p className="mt-1 text-xs text-ibc-ink/50">{p.location_name}</p>}
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => setStatus(p.id, "in")}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase transition ${
                    status === "in"
                      ? "bg-green-600 text-white"
                      : "bg-black/5 text-ibc-ink/70 hover:bg-green-600/10"
                  }`}
                >
                  Présent
                </button>
                <button
                  onClick={() => setStatus(p.id, "out")}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase transition ${
                    status === "out"
                      ? "bg-red-600 text-white"
                      : "bg-black/5 text-ibc-ink/70 hover:bg-red-600/10"
                  }`}
                >
                  Absent
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function formatFr(dateStr) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("fr-CH", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
