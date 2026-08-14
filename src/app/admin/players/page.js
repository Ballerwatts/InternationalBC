"use client";

import { useEffect, useState } from "react";
import { resizeImageToDataUrl } from "@/lib/image-client";

const EMPTY = {
  first_name: "",
  last_name: "",
  jersey_number: "",
  license_number: "",
  email: "",
  phone: "",
  position: "",
  photo_data_url: "",
  games_played: 0,
  total_points: 0,
  ppg: 0,
  active: 1,
  team_id: "",
  bio: "",
  nationality: "",
};

export default function PlayersAdminPage() {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newPlayer, setNewPlayer] = useState(EMPTY);

  function refresh() {
    fetch("/api/players").then((r) => r.json()).then(setPlayers);
    fetch("/api/admin/teams").then((r) => r.json()).then(setTeams);
  }

  useEffect(refresh, []);

  async function createPlayer(e) {
    e.preventDefault();
    await fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPlayer),
    });
    setNewPlayer(EMPTY);
    setCreating(false);
    refresh();
  }

  async function updatePlayer(id, patch) {
    await fetch(`/api/players/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    refresh();
  }

  async function deletePlayer(id) {
    if (!confirm("Supprimer ce joueur ?")) return;
    await fetch(`/api/players/${id}`, { method: "DELETE" });
    refresh();
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-extrabold uppercase text-ibc-blue">Joueurs</h1>
        <button
          onClick={() => setCreating((c) => !c)}
          className="rounded-full bg-ibc-blue px-5 py-2 text-sm font-bold uppercase text-white hover:brightness-110"
        >
          {creating ? "Annuler" : "+ Ajouter un joueur"}
        </button>
      </div>

      {creating && (
        <form
          onSubmit={createPlayer}
          className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-black/5 bg-white p-5 shadow-sm"
        >
          <input
            placeholder="Prénom"
            required
            value={newPlayer.first_name}
            onChange={(e) => setNewPlayer({ ...newPlayer, first_name: e.target.value })}
            className="input"
          />
          <input
            placeholder="Nom"
            required
            value={newPlayer.last_name}
            onChange={(e) => setNewPlayer({ ...newPlayer, last_name: e.target.value })}
            className="input"
          />
          <input
            placeholder="Numéro de maillot"
            value={newPlayer.jersey_number}
            onChange={(e) => setNewPlayer({ ...newPlayer, jersey_number: e.target.value })}
            className="input"
          />
          <input
            placeholder="Numéro de licence"
            value={newPlayer.license_number}
            onChange={(e) => setNewPlayer({ ...newPlayer, license_number: e.target.value })}
            className="input"
          />
          <input
            placeholder="Email"
            type="email"
            value={newPlayer.email}
            onChange={(e) => setNewPlayer({ ...newPlayer, email: e.target.value })}
            className="input"
          />
          <input
            placeholder="Téléphone"
            value={newPlayer.phone}
            onChange={(e) => setNewPlayer({ ...newPlayer, phone: e.target.value })}
            className="input"
          />
          <input
            placeholder="Nationalité"
            value={newPlayer.nationality}
            onChange={(e) => setNewPlayer({ ...newPlayer, nationality: e.target.value })}
            className="input"
          />
          <select
            value={newPlayer.team_id}
            onChange={(e) => setNewPlayer({ ...newPlayer, team_id: e.target.value ? Number(e.target.value) : "" })}
            className="input col-span-2"
          >
            <option value="">Aucune équipe</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button className="col-span-2 rounded-full bg-ibc-accent py-2 text-sm font-bold uppercase text-ibc-ink hover:brightness-95">
            Créer le profil
          </button>
        </form>
      )}

      <ul className="mt-6 space-y-3">
        {players.map((p) => (
          <PlayerRow
            key={p.id}
            player={p}
            teams={teams}
            open={openId === p.id}
            onToggle={() => setOpenId(openId === p.id ? null : p.id)}
            onSave={(patch) => updatePlayer(p.id, patch)}
            onDelete={() => deletePlayer(p.id)}
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

function PlayerRow({ player, teams, open, onToggle, onSave, onDelete }) {
  const [form, setForm] = useState(player);

  useEffect(() => setForm(player), [player]);

  async function handlePhoto(file) {
    if (!file) return;
    const dataUrl = await resizeImageToDataUrl(file, 800);
    setForm((f) => ({ ...f, photo_data_url: dataUrl }));
  }

  return (
    <li className="rounded-xl border border-black/5 bg-white shadow-sm">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-ibc-blue/10">
          {player.photo_data_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={player.photo_data_url} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-ibc-ink">
            {player.first_name} {player.last_name}{" "}
            {player.jersey_number && (
              <span className="text-ibc-blue">#{player.jersey_number}</span>
            )}
            {!player.active && (
              <span className="ml-2 rounded bg-black/10 px-2 py-0.5 text-xs">inactif</span>
            )}
          </p>
          <p className="text-xs text-ibc-ink/50">
            {player.email || "email manquant"} · {player.phone || "téléphone manquant"} · licence{" "}
            {player.license_number || "—"}
          </p>
        </div>
        <span className="text-xs font-bold uppercase text-ibc-blue">
          {open ? "fermer" : "modifier"}
        </span>
      </button>

      {open && (
        <div className="grid grid-cols-2 gap-3 border-t border-black/5 p-4">
          <label className="col-span-2 text-xs font-bold uppercase text-ibc-blue">Photo</label>
          <div className="col-span-2 flex items-center gap-3">
            <input type="file" accept="image/*" onChange={(e) => handlePhoto(e.target.files?.[0])} />
          </div>
          <LabeledInput label="Prénom" value={form.first_name} onChange={(v) => setForm({ ...form, first_name: v })} />
          <LabeledInput label="Nom" value={form.last_name} onChange={(v) => setForm({ ...form, last_name: v })} />
          <LabeledInput label="Numéro de maillot" value={form.jersey_number || ""} onChange={(v) => setForm({ ...form, jersey_number: v })} />
          <LabeledInput label="Numéro de licence" value={form.license_number || ""} onChange={(v) => setForm({ ...form, license_number: v })} />
          <LabeledInput label="Email" value={form.email || ""} onChange={(v) => setForm({ ...form, email: v })} />
          <LabeledInput label="Téléphone" value={form.phone || ""} onChange={(v) => setForm({ ...form, phone: v })} />
          <LabeledInput label="Poste" value={form.position || ""} onChange={(v) => setForm({ ...form, position: v })} />
          <LabeledInput label="Nationalité" value={form.nationality || ""} onChange={(v) => setForm({ ...form, nationality: v })} />
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-ibc-blue/70">Équipe</label>
            <select
              value={form.team_id || ""}
              onChange={(e) => setForm({ ...form, team_id: e.target.value ? Number(e.target.value) : null })}
              className="input w-full"
            >
              <option value="">Aucune équipe</option>
              {(teams || []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <LabeledInput
            label="Matchs joués"
            type="number"
            value={form.games_played}
            onChange={(v) => setForm({ ...form, games_played: Number(v) })}
          />
          <LabeledInput
            label="Points totaux"
            type="number"
            value={form.total_points}
            onChange={(v) => setForm({ ...form, total_points: Number(v) })}
          />
          <LabeledInput
            label="Points par match"
            type="number"
            step="0.1"
            value={form.ppg}
            onChange={(v) => setForm({ ...form, ppg: Number(v) })}
          />
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-bold uppercase text-ibc-blue/70">
              Bio / stats (visible sur le profil public)
            </label>
            <textarea
              value={form.bio || ""}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              className="input w-full"
              rows={3}
            />
          </div>
          <label className="col-span-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked ? 1 : 0 })}
            />
            Joueur actif (visible sur le site)
          </label>
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
              Supprimer le joueur
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function LabeledInput({ label, value, onChange, type = "text", step }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold uppercase text-ibc-blue/70">{label}</label>
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input w-full"
      />
    </div>
  );
}
