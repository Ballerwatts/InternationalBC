"use client";

import { useEffect, useMemo, useState } from "react";
import ImageDropzone from "@/components/ImageDropzone";

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
  const [licenseByPlayer, setLicenseByPlayer] = useState({});
  const [openId, setOpenId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newPlayer, setNewPlayer] = useState(EMPTY);

  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [licenseFilter, setLicenseFilter] = useState("");

  function refresh() {
    fetch("/api/players").then((r) => r.json()).then(setPlayers);
    fetch("/api/admin/teams").then((r) => r.json()).then(setTeams);
    fetch("/api/budget/summary")
      .then((r) => r.json())
      .then((s) => {
        const map = {};
        for (const p of s.players || []) map[p.id] = p.licensePaid;
        setLicenseByPlayer(map);
      });
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
    const res = await fetch(`/api/players/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    refresh();
    return res.ok;
  }

  async function deletePlayer(id) {
    if (!confirm("Delete this player?")) return;
    await fetch(`/api/players/${id}`, { method: "DELETE" });
    refresh();
  }

  const filteredPlayers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return players.filter((p) => {
      if (q) {
        const haystack = `${p.first_name} ${p.last_name} ${p.email || ""} ${p.license_number || ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (teamFilter && String(p.team_id || "") !== teamFilter) return false;
      if (licenseFilter) {
        const paid = !!licenseByPlayer[p.id];
        if (licenseFilter === "paid" && !paid) return false;
        if (licenseFilter === "unpaid" && paid) return false;
      }
      return true;
    });
  }, [players, search, teamFilter, licenseFilter, licenseByPlayer]);

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold uppercase text-ibc-blue">Members</h1>
        <button
          onClick={() => setCreating((c) => !c)}
          className="rounded-full bg-ibc-blue px-5 py-2 text-sm font-bold uppercase text-white hover:brightness-110"
        >
          {creating ? "Cancel" : "+ Add a member"}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder="🔍 Search by name, email, or license #…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input min-w-[220px] flex-1"
        />
        <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} className="input">
          <option value="">All teams</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select value={licenseFilter} onChange={(e) => setLicenseFilter(e.target.value)} className="input">
          <option value="">Any license status</option>
          <option value="paid">License paid</option>
          <option value="unpaid">License unpaid</option>
        </select>
      </div>

      {creating && (
        <form
          onSubmit={createPlayer}
          className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-black/5 bg-white p-5 shadow-sm"
        >
          <input
            placeholder="First name"
            required
            value={newPlayer.first_name}
            onChange={(e) => setNewPlayer({ ...newPlayer, first_name: e.target.value })}
            className="input"
          />
          <input
            placeholder="Last name"
            required
            value={newPlayer.last_name}
            onChange={(e) => setNewPlayer({ ...newPlayer, last_name: e.target.value })}
            className="input"
          />
          <input
            placeholder="Jersey number"
            value={newPlayer.jersey_number}
            onChange={(e) => setNewPlayer({ ...newPlayer, jersey_number: e.target.value })}
            className="input"
          />
          <input
            placeholder="License number"
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
            placeholder="Phone"
            value={newPlayer.phone}
            onChange={(e) => setNewPlayer({ ...newPlayer, phone: e.target.value })}
            className="input"
          />
          <input
            placeholder="Nationality"
            value={newPlayer.nationality}
            onChange={(e) => setNewPlayer({ ...newPlayer, nationality: e.target.value })}
            className="input"
          />
          <select
            value={newPlayer.team_id}
            onChange={(e) => setNewPlayer({ ...newPlayer, team_id: e.target.value ? Number(e.target.value) : "" })}
            className="input col-span-2"
          >
            <option value="">No team</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button className="col-span-2 rounded-full bg-ibc-accent py-2 text-sm font-bold uppercase text-ibc-ink hover:brightness-95">
            Create profile
          </button>
        </form>
      )}

      <p className="mt-4 text-xs font-semibold uppercase text-ibc-ink/40">
        {filteredPlayers.length} member{filteredPlayers.length === 1 ? "" : "s"}
      </p>

      <ul className="mt-2 space-y-3">
        {filteredPlayers.map((p) => (
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
        {filteredPlayers.length === 0 && (
          <p className="text-sm text-ibc-ink/50">No members match your search/filters.</p>
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

function PlayerRow({ player, teams, open, onToggle, onSave, onDelete }) {
  const [form, setForm] = useState(player);
  const [saveState, setSaveState] = useState(null); // "ok" | "error" | null

  useEffect(() => setForm(player), [player]);

  async function handleSave() {
    setSaveState(null);
    const ok = await onSave(form);
    setSaveState(ok ? "ok" : "error");
    setTimeout(() => setSaveState(null), 2500);
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
              <span className="ml-2 rounded bg-black/10 px-2 py-0.5 text-xs">inactive</span>
            )}
          </p>
          <p className="text-xs text-ibc-ink/50">
            {player.email || "no email"} · {player.phone || "no phone"} · license{" "}
            {player.license_number || "—"}
          </p>
        </div>
        <span className="text-xs font-bold uppercase text-ibc-blue">
          {open ? "close" : "edit"}
        </span>
      </button>

      {open && (
        <div className="grid grid-cols-2 gap-3 border-t border-black/5 p-4">
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-bold uppercase text-ibc-blue">Photo</label>
            <ImageDropzone
              value={form.photo_data_url}
              onChange={(dataUrl) => setForm((f) => ({ ...f, photo_data_url: dataUrl }))}
              maxWidth={800}
              size={96}
              shape="circle"
            />
          </div>
          <LabeledInput label="First name" value={form.first_name} onChange={(v) => setForm({ ...form, first_name: v })} />
          <LabeledInput label="Last name" value={form.last_name} onChange={(v) => setForm({ ...form, last_name: v })} />
          <LabeledInput label="Jersey number" value={form.jersey_number || ""} onChange={(v) => setForm({ ...form, jersey_number: v })} />
          <LabeledInput label="License number" value={form.license_number || ""} onChange={(v) => setForm({ ...form, license_number: v })} />
          <LabeledInput label="Email" value={form.email || ""} onChange={(v) => setForm({ ...form, email: v })} />
          <LabeledInput label="Phone" value={form.phone || ""} onChange={(v) => setForm({ ...form, phone: v })} />
          <LabeledInput label="Position" value={form.position || ""} onChange={(v) => setForm({ ...form, position: v })} />
          <LabeledInput label="Nationality" value={form.nationality || ""} onChange={(v) => setForm({ ...form, nationality: v })} />
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-ibc-blue/70">Team</label>
            <select
              value={form.team_id || ""}
              onChange={(e) => setForm({ ...form, team_id: e.target.value ? Number(e.target.value) : null })}
              className="input w-full"
            >
              <option value="">No team</option>
              {(teams || []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <LabeledInput
            label="Games played"
            type="number"
            value={form.games_played}
            onChange={(v) => setForm({ ...form, games_played: Number(v) })}
          />
          <LabeledInput
            label="Total points"
            type="number"
            value={form.total_points}
            onChange={(v) => setForm({ ...form, total_points: Number(v) })}
          />
          <LabeledInput
            label="Points per game"
            type="number"
            step="0.1"
            value={form.ppg}
            onChange={(v) => setForm({ ...form, ppg: Number(v) })}
          />
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-bold uppercase text-ibc-blue/70">
              Bio / stats (visible on the public profile)
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
            Active player (visible on the site)
          </label>
          <div className="col-span-2 flex items-center gap-3">
            <button
              onClick={handleSave}
              className="rounded-full bg-ibc-blue px-5 py-2 text-sm font-bold uppercase text-white hover:brightness-110"
            >
              Save
            </button>
            <button
              onClick={onDelete}
              className="rounded-full bg-red-50 px-5 py-2 text-sm font-bold uppercase text-red-600 hover:bg-red-100"
            >
              Delete member
            </button>
            {saveState === "ok" && (
              <span className="text-lg font-bold text-green-600" title="Saved">
                ✓
              </span>
            )}
            {saveState === "error" && (
              <span className="text-lg font-bold text-red-600" title="Save failed">
                ✗
              </span>
            )}
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
