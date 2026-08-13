"use client";

import { useEffect, useState } from "react";

const EMPTY = { name: "", email: "", password: "", role: "player", player_id: "" };

export default function UsersAdminPage() {
  const [users, setUsers] = useState([]);
  const [players, setPlayers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [openId, setOpenId] = useState(null);
  const [credentials, setCredentials] = useState(null);

  function refresh() {
    fetch("/api/admin/users").then((r) => r.json()).then(setUsers);
    fetch("/api/access-requests").then((r) => r.json()).then((d) => setRequests(Array.isArray(d) ? d : []));
  }

  useEffect(() => {
    refresh();
    fetch("/api/players").then((r) => r.json()).then(setPlayers);
  }, []);

  async function decide(id, action) {
    const res = await fetch(`/api/access-requests/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      const data = await res.json();
      if (action === "approve" && data.tempPassword) {
        setCredentials({ email: requests.find((r) => r.id === id)?.email, password: data.tempPassword, emailed: data.emailed });
      }
      refresh();
    } else {
      alert((await res.json()).error || "Erreur");
    }
  }

  async function createUser(e) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, player_id: form.player_id || null }),
    });
    if (res.ok) {
      setForm(EMPTY);
      setCreating(false);
      setMessage("Compte créé.");
      setTimeout(() => setMessage(""), 2500);
      refresh();
    } else {
      setError((await res.json()).error || "Erreur");
    }
  }

  async function updateUser(id, patch) {
    await fetch(`/api/admin/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    refresh();
  }

  async function deleteUser(id) {
    if (!confirm("Supprimer ce compte ? Le joueur ne pourra plus se connecter.")) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (res.ok) refresh();
    else alert((await res.json()).error || "Erreur");
  }

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold uppercase text-ibc-blue">
            Comptes joueurs
          </h1>
          <p className="mt-1 text-sm text-ibc-ink/60">
            Chaque joueur peut avoir son propre compte pour se connecter à l&apos;espace équipe
            (tactiques + tableau d&apos;entraînement). Ils n&apos;ont pas accès au budget, aux
            profils, à l&apos;accueil ni au calendrier — ces pages restent réservées aux comptes
            admin.
          </p>
        </div>
        <button
          onClick={() => setCreating((c) => !c)}
          className="shrink-0 rounded-full bg-ibc-blue px-5 py-2 text-sm font-bold uppercase text-white hover:brightness-110"
        >
          {creating ? "Annuler" : "+ Créer un compte"}
        </button>
      </div>

      {message && <p className="mt-3 text-sm font-semibold text-green-700">{message}</p>}

      {credentials && (
        <div className="mt-4 rounded-xl border border-ibc-accent/40 bg-ibc-accent/10 p-4 text-sm">
          <p className="font-semibold text-ibc-ink">Compte créé pour {credentials.email}</p>
          <p className="mt-1 text-ibc-ink/70">
            Mot de passe temporaire : <code className="rounded bg-white px-1.5 py-0.5">{credentials.password}</code>
            {credentials.emailed
              ? " — envoyé par e-mail à la personne."
              : " — SMTP non configuré, communiquez-le vous-même à la personne."}
          </p>
          <button
            onClick={() => setCredentials(null)}
            className="mt-2 text-xs font-bold uppercase text-ibc-blue hover:underline"
          >
            Fermer
          </button>
        </div>
      )}

      {requests.length > 0 && (
        <div className="mt-6">
          <h2 className="font-display text-lg font-bold uppercase text-ibc-blue">
            Demandes en attente ({requests.length})
          </h2>
          <ul className="mt-2 space-y-2">
            {requests.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/5 bg-white p-4 shadow-sm"
              >
                <div>
                  <p className="text-sm font-semibold text-ibc-ink">{r.name}</p>
                  <p className="text-xs text-ibc-ink/50">
                    {r.email}
                    {r.phone && ` · ${r.phone}`}
                  </p>
                  {r.message && <p className="mt-1 text-sm text-ibc-ink/70">{r.message}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => decide(r.id, "approve")}
                    className="rounded-full bg-green-600 px-4 py-1.5 text-xs font-bold uppercase text-white hover:brightness-110"
                  >
                    Accepter
                  </button>
                  <button
                    onClick={() => decide(r.id, "reject")}
                    className="rounded-full bg-red-50 px-4 py-1.5 text-xs font-bold uppercase text-red-600 hover:bg-red-100"
                  >
                    Refuser
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {creating && (
        <form
          onSubmit={createUser}
          className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-black/5 bg-white p-5 shadow-sm"
        >
          <input
            placeholder="Nom complet"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input"
          />
          <input
            placeholder="Email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="input"
          />
          <input
            placeholder="Mot de passe initial (8 car. min)"
            type="text"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="input"
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="input"
          >
            <option value="player">Joueur (tactiques + entraînement)</option>
            <option value="admin">Admin (accès complet)</option>
          </select>
          <select
            value={form.player_id}
            onChange={(e) => setForm({ ...form, player_id: e.target.value })}
            className="input col-span-2"
          >
            <option value="">— Lier à un profil joueur (optionnel) —</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.first_name} {p.last_name}
              </option>
            ))}
          </select>
          {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}
          <button className="col-span-2 rounded-full bg-ibc-accent py-2 text-sm font-bold uppercase text-ibc-ink hover:brightness-95">
            Créer le compte
          </button>
        </form>
      )}

      <ul className="mt-6 space-y-3">
        {users.map((u) => (
          <UserRow
            key={u.id}
            user={u}
            players={players}
            open={openId === u.id}
            onToggle={() => setOpenId(openId === u.id ? null : u.id)}
            onSave={(patch) => updateUser(u.id, patch)}
            onDelete={() => deleteUser(u.id)}
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

function UserRow({ user, players, open, onToggle, onSave, onDelete }) {
  const [role, setRole] = useState(user.role);
  const [playerId, setPlayerId] = useState(user.player_id || "");
  const [newPassword, setNewPassword] = useState("");
  const [active, setActive] = useState(!!user.active);

  return (
    <li className="rounded-xl border border-black/5 bg-white shadow-sm">
      <button onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <div className="flex-1">
          <p className="font-semibold text-ibc-ink">
            {user.name}{" "}
            <span
              className={`ml-2 rounded px-2 py-0.5 text-xs uppercase ${
                user.role === "admin" ? "bg-ibc-blue/10 text-ibc-blue" : "bg-black/5 text-ibc-ink/70"
              }`}
            >
              {user.role === "admin" ? "admin" : "joueur"}
            </span>
            {!user.active && <span className="ml-2 rounded bg-red-50 px-2 py-0.5 text-xs text-red-600">désactivé</span>}
          </p>
          <p className="text-xs text-ibc-ink/50">
            {user.email}
            {user.first_name && ` · lié à ${user.first_name} ${user.last_name}`}
          </p>
        </div>
        <span className="text-xs font-bold uppercase text-ibc-blue">{open ? "fermer" : "gérer"}</span>
      </button>

      {open && (
        <div className="grid grid-cols-2 gap-3 border-t border-black/5 p-4">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-ibc-blue/70">Rôle</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="input w-full">
              <option value="player">Joueur</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-ibc-blue/70">
              Profil joueur lié
            </label>
            <select
              value={playerId}
              onChange={(e) => setPlayerId(e.target.value)}
              className="input w-full"
            >
              <option value="">— aucun —</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-bold uppercase text-ibc-blue/70">
              Réinitialiser le mot de passe
            </label>
            <input
              type="text"
              placeholder="Laisser vide pour ne pas changer"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input w-full"
            />
          </div>
          <label className="col-span-2 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Compte actif (peut se connecter)
          </label>
          <div className="col-span-2 flex gap-2">
            <button
              onClick={() => {
                const patch = { role, player_id: playerId || null, active };
                if (newPassword) patch.password = newPassword;
                onSave(patch);
                setNewPassword("");
              }}
              className="rounded-full bg-ibc-blue px-5 py-2 text-sm font-bold uppercase text-white hover:brightness-110"
            >
              Enregistrer
            </button>
            <button
              onClick={onDelete}
              className="rounded-full bg-red-50 px-5 py-2 text-sm font-bold uppercase text-red-600 hover:bg-red-100"
            >
              Supprimer le compte
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
