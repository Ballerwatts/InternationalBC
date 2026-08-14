"use client";

import { useEffect, useState } from "react";

const EMPTY = { name: "", category: "", practice_location_name: "", practice_location_address: "" };

export default function TeamsAdminPage() {
  const [teams, setTeams] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState(null);

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

  async function update(id, patch) {
    await fetch(`/api/admin/teams/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    refresh();
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
        Les squads du club (ex. IBBC Men (2LCM)). Chaque joueur, coach, séance, tactique et
        tableau d&apos;entraînement est rattaché à l&apos;une d&apos;elles — le super-admin voit
        tout, coachs et joueurs ne voient que leur propre équipe.
      </p>

      <form
        onSubmit={create}
        className="mt-6 grid grid-cols-2 gap-3 rounded-xl border border-black/5 bg-white p-5 shadow-sm"
      >
        <input
          placeholder="Nom (ex. IBBC Men (2LCM))"
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
        <input
          placeholder="Lieu d'entraînement (ex. École Raymond-Uldry)"
          value={form.practice_location_name}
          onChange={(e) => setForm({ ...form, practice_location_name: e.target.value })}
          className="input"
        />
        <input
          placeholder="Adresse du lieu d'entraînement"
          value={form.practice_location_address}
          onChange={(e) => setForm({ ...form, practice_location_address: e.target.value })}
          className="input"
        />
        {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}
        <button className="col-span-2 rounded-full bg-ibc-blue py-2 text-sm font-bold uppercase text-white hover:brightness-110">
          + Ajouter une équipe
        </button>
      </form>

      <ul className="mt-6 space-y-2">
        {teams.map((t) => (
          <TeamRow
            key={t.id}
            team={t}
            open={openId === t.id}
            onToggle={() => setOpenId(openId === t.id ? null : t.id)}
            onSave={(patch) => update(t.id, patch)}
            onDelete={() => remove(t.id)}
          />
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

function TeamRow({ team, open, onToggle, onSave, onDelete }) {
  const [form, setForm] = useState(team);

  useEffect(() => setForm(team), [team]);

  return (
    <li className="rounded-xl border border-black/5 bg-white shadow-sm">
      <button onClick={onToggle} className="flex w-full items-center justify-between gap-3 p-4 text-left">
        <div>
          <p className="text-sm font-semibold text-ibc-ink">{team.name}</p>
          {team.category && <p className="text-xs text-ibc-ink/50">{team.category}</p>}
          {team.practice_location_name && (
            <p className="text-xs text-ibc-ink/40">
              {team.practice_location_name}
              {team.practice_location_address ? ` — ${team.practice_location_address}` : ""}
            </p>
          )}
        </div>
        <span className="shrink-0 text-xs font-bold uppercase text-ibc-blue">
          {open ? "fermer" : "modifier"}
        </span>
      </button>

      {open && (
        <div className="grid grid-cols-2 gap-3 border-t border-black/5 p-4">
          <input
            placeholder="Nom"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input"
          />
          <input
            placeholder="Catégorie"
            value={form.category || ""}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="input"
          />
          <input
            placeholder="Lieu d'entraînement"
            value={form.practice_location_name || ""}
            onChange={(e) => setForm({ ...form, practice_location_name: e.target.value })}
            className="input col-span-2"
          />
          <input
            placeholder="Adresse du lieu d'entraînement"
            value={form.practice_location_address || ""}
            onChange={(e) => setForm({ ...form, practice_location_address: e.target.value })}
            className="input col-span-2"
          />
          <div className="col-span-2 flex gap-2">
            <button
              onClick={() => onSave(form)}
              className="rounded-full bg-ibc-blue px-5 py-2 text-sm font-bold uppercase text-white hover:brightness-110"
            >
              Enregistrer
            </button>
            <button
              onClick={onDelete}
              className="rounded-full bg-red-50 px-5 py-2 text-sm font-bold uppercase text-red-600 hover:bg-red-100"
            >
              Supprimer
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
