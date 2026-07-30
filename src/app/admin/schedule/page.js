"use client";

import { useEffect, useState } from "react";

const EMPTY = {
  kind: "practice",
  title: "",
  practice_date: "",
  start_time: "20:00",
  end_time: "22:00",
  location_name: "École de commerce Raymond-Uldry",
  location_address: "Chemin du Domaine-Patry 1, 1224 Chêne-Bougeries, Genève",
  opponent: "",
  notes: "",
};

export default function ScheduleAdminPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");

  function refresh() {
    fetch("/api/practices").then((r) => r.json()).then(setItems);
  }

  useEffect(refresh, []);

  async function submit(e) {
    e.preventDefault();
    if (editingId) {
      await fetch(`/api/practices/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/practices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    setForm(EMPTY);
    setEditingId(null);
    refresh();
  }

  async function remove(id) {
    if (!confirm("Supprimer cet événement ?")) return;
    await fetch(`/api/practices/${id}`, { method: "DELETE" });
    refresh();
  }

  function edit(item) {
    setEditingId(item.id);
    setForm(item);
  }

  async function generateWeeks() {
    setGenerating(true);
    const res = await fetch("/api/practices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "generate_weeks",
        weeks: 12,
        location_name: "École de commerce Raymond-Uldry",
        location_address: "Chemin du Domaine-Patry 1, 1224 Chêne-Bougeries, Genève",
      }),
    });
    const data = await res.json();
    setMessage(`${data.created} entraînement(s) ajouté(s) pour les 12 prochaines semaines.`);
    setGenerating(false);
    refresh();
  }

  const upcoming = items.filter((i) => i.practice_date >= new Date().toISOString().slice(0, 10));
  const past = items.filter((i) => i.practice_date < new Date().toISOString().slice(0, 10));

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold uppercase text-mbc-blue">Calendrier</h1>
        <button
          onClick={generateWeeks}
          disabled={generating}
          className="rounded-full bg-mbc-yellow px-4 py-2 text-xs font-bold uppercase text-mbc-ink hover:brightness-95 disabled:opacity-50"
        >
          {generating ? "Génération…" : "Générer les 12 prochaines semaines (lun/jeu)"}
        </button>
      </div>
      {message && <p className="mt-2 text-sm text-green-700">{message}</p>}

      <form onSubmit={submit} className="mt-6 grid grid-cols-2 gap-3 rounded-xl border border-black/5 bg-white p-5 shadow-sm">
        <select
          value={form.kind}
          onChange={(e) => setForm({ ...form, kind: e.target.value })}
          className="input"
        >
          <option value="practice">Entraînement</option>
          <option value="game">Match</option>
        </select>
        <input
          type="date"
          required
          value={form.practice_date}
          onChange={(e) => setForm({ ...form, practice_date: e.target.value })}
          className="input"
        />
        <input
          type="time"
          required
          value={form.start_time}
          onChange={(e) => setForm({ ...form, start_time: e.target.value })}
          className="input"
        />
        <input
          type="time"
          required
          value={form.end_time}
          onChange={(e) => setForm({ ...form, end_time: e.target.value })}
          className="input"
        />
        {form.kind === "game" && (
          <input
            placeholder="Adversaire"
            value={form.opponent}
            onChange={(e) => setForm({ ...form, opponent: e.target.value })}
            className="input col-span-2"
          />
        )}
        <input
          placeholder="Lieu"
          value={form.location_name}
          onChange={(e) => setForm({ ...form, location_name: e.target.value })}
          className="input col-span-2"
        />
        <input
          placeholder="Adresse"
          value={form.location_address}
          onChange={(e) => setForm({ ...form, location_address: e.target.value })}
          className="input col-span-2"
        />
        <textarea
          placeholder="Notes (optionnel)"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="input col-span-2"
        />
        <div className="col-span-2 flex gap-2">
          <button className="rounded-full bg-mbc-blue px-5 py-2 text-sm font-bold uppercase text-white hover:brightness-110">
            {editingId ? "Mettre à jour" : "Ajouter"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(EMPTY);
              }}
              className="rounded-full bg-black/5 px-5 py-2 text-sm font-bold uppercase text-mbc-ink/70"
            >
              Annuler
            </button>
          )}
        </div>
      </form>

      <h2 className="mt-8 font-display text-xl font-bold uppercase text-mbc-blue">À venir</h2>
      <EventList items={upcoming} onEdit={edit} onDelete={remove} />

      {past.length > 0 && (
        <>
          <h2 className="mt-8 font-display text-xl font-bold uppercase text-mbc-ink/50">Passés</h2>
          <EventList items={past} onEdit={edit} onDelete={remove} muted />
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

function EventList({ items, onEdit, onDelete, muted }) {
  return (
    <ul className={`mt-3 space-y-2 ${muted ? "opacity-60" : ""}`}>
      {items.map((e) => (
        <li key={e.id} className="flex items-center justify-between rounded-lg border border-black/5 bg-white px-4 py-2.5 text-sm shadow-sm">
          <span>
            <strong>{e.practice_date}</strong> {e.start_time}–{e.end_time} ·{" "}
            {e.kind === "game" ? `Match${e.opponent ? " vs " + e.opponent : ""}` : "Entraînement"}
          </span>
          <span className="flex gap-3 text-xs font-bold uppercase">
            <button onClick={() => onEdit(e)} className="text-mbc-blue hover:underline">
              modifier
            </button>
            <button onClick={() => onDelete(e.id)} className="text-red-500 hover:underline">
              supprimer
            </button>
          </span>
        </li>
      ))}
      {items.length === 0 && <p className="text-sm text-mbc-ink/50">Aucun événement.</p>}
    </ul>
  );
}
