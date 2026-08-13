"use client";

import { useEffect, useMemo, useState } from "react";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const REASONS = [
  { value: "voyage", label: "Voyage / absence" },
  { value: "blessure", label: "Blessure" },
  { value: "autre", label: "Autre" },
];

const EMPTY = { player_id: "", start_date: todayIso(), end_date: todayIso(), reason: "voyage", note: "" };

export default function AdminAvailabilityPage() {
  const [players, setPlayers] = useState([]);
  const [entries, setEntries] = useState([]);
  const [practices, setPractices] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");

  function refresh() {
    fetch("/api/players").then((r) => r.json()).then(setPlayers);
    fetch("/api/availability").then((r) => r.json()).then((d) => setEntries(Array.isArray(d) ? d : []));
    fetch(`/api/practices?from=${todayIso()}`).then((r) => r.json()).then(setPractices);
  }

  useEffect(refresh, []);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!form.player_id) {
      setError("Choisissez un joueur");
      return;
    }
    const res = await fetch("/api/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, player_id: Number(form.player_id) }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Erreur");
      return;
    }
    setForm(EMPTY);
    refresh();
  }

  async function remove(id) {
    if (!confirm("Supprimer cette déclaration ?")) return;
    await fetch(`/api/availability/${id}`, { method: "DELETE" });
    refresh();
  }

  // For each upcoming practice/game, work out which players' declared
  // absence window covers that date.
  const upcomingWithAbsences = useMemo(() => {
    return practices.slice(0, 16).map((pr) => {
      const missing = entries.filter(
        (e) => e.start_date <= pr.practice_date && pr.practice_date <= e.end_date
      );
      return { ...pr, missing };
    });
  }, [practices, entries]);

  const activePlayers = players.filter((p) => p.active);

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-3xl font-extrabold uppercase text-ibc-blue">
        Disponibilités
      </h1>
      <p className="mt-1 text-sm text-ibc-ink/60">
        Ce que chaque joueur a déclaré comme absence à venir, croisé avec le calendrier des
        entraînements et matchs.
      </p>

      <h2 className="mt-8 font-display text-lg font-bold uppercase text-ibc-blue">
        Prochaines séances
      </h2>
      <div className="mt-2 overflow-hidden rounded-xl border border-black/5 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/5 text-left text-xs font-bold uppercase text-ibc-blue/70">
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Présents</th>
              <th className="px-4 py-2">Absents déclarés</th>
            </tr>
          </thead>
          <tbody>
            {upcomingWithAbsences.map((pr) => {
              const present = activePlayers.length - pr.missing.length;
              return (
                <tr key={pr.id} className="border-b border-black/5 last:border-0">
                  <td className="px-4 py-2 font-semibold text-ibc-ink">
                    {pr.practice_date} · {pr.start_time}
                  </td>
                  <td className="px-4 py-2 text-ibc-ink/70">
                    {pr.kind === "game" ? `Match${pr.opponent ? ` vs ${pr.opponent}` : ""}` : "Entraînement"}
                  </td>
                  <td className="px-4 py-2">
                    <span className="font-bold text-ibc-blue">{present}</span>
                    <span className="text-ibc-ink/40"> / {activePlayers.length}</span>
                  </td>
                  <td className="px-4 py-2 text-ibc-ink/70">
                    {pr.missing.length === 0
                      ? "—"
                      : pr.missing.map((m) => `${m.first_name} ${m.last_name}`).join(", ")}
                  </td>
                </tr>
              );
            })}
            {upcomingWithAbsences.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-4 text-center text-ibc-ink/50">
                  Aucune séance à venir dans le calendrier.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 font-display text-lg font-bold uppercase text-ibc-blue">
        Ajouter une absence pour un joueur
      </h2>
      <form
        onSubmit={submit}
        className="mt-2 grid grid-cols-2 gap-3 rounded-xl border border-black/5 bg-white p-5 shadow-sm"
      >
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-bold uppercase text-ibc-blue">Joueur</label>
          <select
            value={form.player_id}
            onChange={(e) => setForm({ ...form, player_id: e.target.value })}
            className="input w-full"
          >
            <option value="">— choisir —</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.first_name} {p.last_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase text-ibc-blue">Du</label>
          <input
            type="date"
            value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            className="input w-full"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase text-ibc-blue">Au</label>
          <input
            type="date"
            value={form.end_date}
            onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            className="input w-full"
          />
        </div>
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-bold uppercase text-ibc-blue">Motif</label>
          <select
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            className="input w-full"
          >
            {REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-bold uppercase text-ibc-blue">Note</label>
          <input
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            className="input w-full"
          />
        </div>
        {error && <p className="col-span-2 text-sm font-semibold text-red-600">{error}</p>}
        <button className="col-span-2 rounded-full bg-ibc-blue px-5 py-2 text-sm font-bold uppercase text-white hover:brightness-110">
          Ajouter
        </button>
      </form>

      <h2 className="mt-10 font-display text-lg font-bold uppercase text-ibc-blue">
        Toutes les déclarations
      </h2>
      <ul className="mt-2 space-y-2">
        {entries.map((e) => (
          <li
            key={e.id}
            className="flex items-center justify-between rounded-xl border border-black/5 bg-white p-4 shadow-sm"
          >
            <div>
              <p className="text-sm font-semibold text-ibc-ink">
                {e.first_name} {e.last_name} — {e.start_date} → {e.end_date}
                <span className="ml-2 rounded-full bg-ibc-blue/10 px-2 py-0.5 text-xs font-bold uppercase text-ibc-blue">
                  {e.reason}
                </span>
              </p>
              {e.note && <p className="mt-1 text-sm text-ibc-ink/60">{e.note}</p>}
            </div>
            <button
              onClick={() => remove(e.id)}
              className="shrink-0 text-xs font-bold uppercase text-red-500 hover:underline"
            >
              Supprimer
            </button>
          </li>
        ))}
        {entries.length === 0 && (
          <p className="text-sm text-ibc-ink/50">Aucune déclaration pour le moment.</p>
        )}
      </ul>

      <style jsx global>{`
        .input {
          border-radius: 0.5rem;
          border: 1px solid rgba(0, 0, 0, 0.1);
          padding: 0.5rem 0.75rem;
          font-size: 0.925rem;
        }
      `}</style>
    </div>
  );
}
