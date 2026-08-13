"use client";

import { useEffect, useState } from "react";

const REASONS = [
  { value: "voyage", label: "Voyage / absence" },
  { value: "blessure", label: "Blessure" },
  { value: "autre", label: "Autre" },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY = { start_date: todayIso(), end_date: todayIso(), reason: "voyage", note: "" };

export default function PlayerAvailabilityPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  function refresh() {
    fetch("/api/availability")
      .then((r) => r.json())
      .then((data) => {
        setItems(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }

  useEffect(refresh, []);

  async function submit(e) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Erreur lors de l'enregistrement");
      return;
    }
    setForm(EMPTY);
    refresh();
  }

  async function remove(id) {
    if (!confirm("Supprimer cette période ?")) return;
    await fetch(`/api/availability/${id}`, { method: "DELETE" });
    refresh();
  }

  const today = todayIso();
  const upcoming = items.filter((i) => i.end_date >= today);
  const past = items.filter((i) => i.end_date < today);

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl font-extrabold uppercase text-ibc-blue">
        Mes disponibilités
      </h1>
      <p className="mt-1 text-sm text-ibc-ink/60">
        Prévenez le coach dès que possible si vous savez que vous serez absent (voyage, blessure,
        etc.) — il pourra anticiper l&apos;effectif présent à chaque entraînement et chaque match.
      </p>

      <form
        onSubmit={submit}
        className="mt-6 grid grid-cols-2 gap-3 rounded-xl border border-black/5 bg-white p-5 shadow-sm"
      >
        <div>
          <label className="mb-1 block text-xs font-bold uppercase text-ibc-blue">Du</label>
          <input
            type="date"
            required
            value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            className="input w-full"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase text-ibc-blue">Au</label>
          <input
            type="date"
            required
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
          <label className="mb-1 block text-xs font-bold uppercase text-ibc-blue">
            Note (facultatif)
          </label>
          <textarea
            rows={2}
            placeholder="Ex. de retour le dimanche soir, disponible si besoin"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            className="input w-full"
          />
        </div>
        {error && <p className="col-span-2 text-sm font-semibold text-red-600">{error}</p>}
        <button className="col-span-2 rounded-full bg-ibc-blue px-5 py-2 text-sm font-bold uppercase text-white hover:brightness-110">
          Déclarer cette absence
        </button>
      </form>

      {!loading && (
        <>
          <h2 className="mt-8 font-display text-lg font-bold uppercase text-ibc-blue">
            À venir
          </h2>
          <AvailabilityList entries={upcoming} onRemove={remove} emptyLabel="Aucune absence déclarée." />

          {past.length > 0 && (
            <>
              <h2 className="mt-8 font-display text-lg font-bold uppercase text-ibc-ink/50">
                Passées
              </h2>
              <AvailabilityList entries={past} onRemove={remove} muted />
            </>
          )}
        </>
      )}

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

function AvailabilityList({ entries, onRemove, emptyLabel, muted }) {
  if (entries.length === 0 && emptyLabel) {
    return <p className="mt-2 text-sm text-ibc-ink/50">{emptyLabel}</p>;
  }
  return (
    <ul className="mt-2 space-y-2">
      {entries.map((e) => (
        <li
          key={e.id}
          className={`flex items-center justify-between rounded-xl border border-black/5 bg-white p-4 shadow-sm ${
            muted ? "opacity-60" : ""
          }`}
        >
          <div>
            <p className="text-sm font-semibold text-ibc-ink">
              {e.start_date} → {e.end_date}
              <span className="ml-2 rounded-full bg-ibc-blue/10 px-2 py-0.5 text-xs font-bold uppercase text-ibc-blue">
                {e.reason}
              </span>
            </p>
            {e.note && <p className="mt-1 text-sm text-ibc-ink/60">{e.note}</p>}
          </div>
          <button
            onClick={() => onRemove(e.id)}
            className="shrink-0 text-xs font-bold uppercase text-red-500 hover:underline"
          >
            Supprimer
          </button>
        </li>
      ))}
    </ul>
  );
}
