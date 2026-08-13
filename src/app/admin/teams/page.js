"use client";

import { useEffect, useState } from "react";

const EMPTY = { name: "", category: "" };

export default function TeamsAdminPage() {
  const [teams, setTeams] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");

  function refresh() {
    fetch("/api/admin/teams").then((r) => r.json()).then(setTeams);
  }

  useEffect(refresh, []);

  async function create(e) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm(EMPTY);
      refresh();
    } else {
      setError((await res.json()).error || "Erreur");
    }
  }

  async function remove(id) {
    if (!confirm("Supprimer cette équipe ? Les joueurs/comptes qui y sont liés seront détachés.")) return;
    await fetch(`/api/admin/teams/${id}`, { method: "DELETE" });
    refresh();
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl font-extrabold uppercase text-ibc-blue">Équipes</h1>
      <p className="mt-1 text-sm text-ibc-ink/60">
        Les squads du club (ex. IBBC 1, IBBC 2, IBBC Dames). Chaque joueur, coach, séance,
        tactique et tableau d&apos;entraînement est rattaché à l&apos;une d&apos;elles — le
        super-admin voit tout, coachs et joueurs ne voient que leur propre équipe.
      </p>

      <form
        onSubmit={create}
        className="mt-6 grid grid-cols-2 gap-3 rounded-xl border border-black/5 bg-white p-5 shadow-sm"
      >
        <input
          placeholder="Nom (ex. IBBC 1)"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="input"
        />
        <input
          placeholder="Catégorie (ex. Hommes 1 — 2ème Ligue)"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="input"
        />
        {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}
        <button className="col-span-2 rounded-full bg-ibc-blue py-2 text-sm font-bold uppercase text-white hover:brightness-110">
          + Ajouter une équipe
        </button>
      </form>

      <ul className="mt-6 space-y-2">
        {teams.map((t) => (
          <li
            key={t.id}
            className="flex items-center justify-between rounded-xl border border-black/5 bg-white p-4 shadow-sm"
          >
            <div>
              <p className="text-sm font-semibold text-ibc-ink">{t.name}</p>
              {t.category && <p className="text-xs text-ibc-ink/50">{t.category}</p>}
            </div>
            <button
              onClick={() => remove(t.id)}
              className="text-xs font-bold uppercase text-red-500 hover:underline"
            >
              Supprimer
            </button>
          </li>
        ))}
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
