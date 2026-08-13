"use client";

import { useEffect, useState } from "react";

function mondayOfCurrentWeek() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

const EMPTY = { week_start_date: mondayOfCurrentWeek(), focus: "", drills: "", notes: "" };

export default function PracticeBoardAdminPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);

  function refresh() {
    fetch("/api/practice-board").then((r) => r.json()).then(setItems);
  }

  useEffect(refresh, []);

  async function submit(e) {
    e.preventDefault();
    if (editingId) {
      await fetch(`/api/practice-board/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/practice-board", {
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
    if (!confirm("Supprimer cette semaine ?")) return;
    await fetch(`/api/practice-board/${id}`, { method: "DELETE" });
    refresh();
  }

  function edit(item) {
    setEditingId(item.id);
    setForm(item);
  }

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl font-extrabold uppercase text-ibc-blue">
        Tableau d&apos;entraînement
      </h1>
      <p className="mt-1 text-sm text-ibc-ink/60">
        Le focus et les exercices de chaque semaine — visibles par l&apos;équipe sur la page
        publique, et repris automatiquement dans le rappel email du lundi.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-3 rounded-xl border border-black/5 bg-white p-5 shadow-sm">
        <label className="block text-xs font-bold uppercase text-ibc-blue">
          Semaine du (lundi)
        </label>
        <input
          type="date"
          value={form.week_start_date}
          onChange={(e) => setForm({ ...form, week_start_date: e.target.value })}
          className="input"
        />
        <label className="block text-xs font-bold uppercase text-ibc-blue">Focus de la semaine</label>
        <input
          placeholder="Ex. Défense en zone 2-3"
          value={form.focus}
          onChange={(e) => setForm({ ...form, focus: e.target.value })}
          className="input"
        />
        <label className="block text-xs font-bold uppercase text-ibc-blue">
          Exercices (un par ligne)
        </label>
        <textarea
          rows={5}
          placeholder={"Échauffement 15 min\nBlocs défensifs 3 contre 3\nTirs en transition"}
          value={form.drills}
          onChange={(e) => setForm({ ...form, drills: e.target.value })}
          className="input"
        />
        <label className="block text-xs font-bold uppercase text-ibc-blue">Notes</label>
        <textarea
          rows={2}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="input"
        />
        <div className="flex gap-2">
          <button className="rounded-full bg-ibc-blue px-5 py-2 text-sm font-bold uppercase text-white hover:brightness-110">
            {editingId ? "Mettre à jour" : "Publier la semaine"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(EMPTY);
              }}
              className="rounded-full bg-black/5 px-5 py-2 text-sm font-bold uppercase text-ibc-ink/70"
            >
              Annuler
            </button>
          )}
        </div>
      </form>

      <ul className="mt-6 space-y-3">
        {items.map((e) => (
          <li key={e.id} className="rounded-xl border border-black/5 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase text-ibc-blue/70">
                  Semaine du {e.week_start_date}
                </p>
                <p className="font-display text-lg font-bold text-ibc-ink">{e.focus}</p>
                <p className="whitespace-pre-line text-sm text-ibc-ink/70">{e.drills}</p>
              </div>
              <div className="flex shrink-0 gap-2 text-xs font-bold uppercase">
                <button onClick={() => edit(e)} className="text-ibc-blue hover:underline">
                  Modifier
                </button>
                <button onClick={() => remove(e.id)} className="text-red-500 hover:underline">
                  Supprimer
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid rgba(0, 0, 0, 0.1);
          padding: 0.5rem 0.75rem;
          font-size: 0.925rem;
        }
      `}</style>
    </div>
  );
}
