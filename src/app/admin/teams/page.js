"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import WeeklyPatternEditor from "@/components/WeeklyPatternEditor";

const EMPTY = { name: "", category: "" };

export default function TeamsAdminPage() {
  const [teams, setTeams] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState(null);
  const [gyms, setGyms] = useState([]);

  function refresh() {
    fetch("/api/admin/teams").then((r) => r.json()).then(setTeams);
    // Halls with the squads linked to each — the Teams page shows a team's
    // gyms and lets you set its Training Schedule against them.
    fetch("/api/gyms")
      .then((r) => r.json())
      .then((d) => setGyms(Array.isArray(d) ? d : []));
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
      setError((await res.json()).error || "Something went wrong");
    }
  }

  async function update(id, patch) {
    setError("");
    const res = await fetch(`/api/admin/teams/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) setError((await res.json().catch(() => ({}))).error || "Échec de l'enregistrement.");
    refresh();
  }

  async function remove(id) {
    if (!confirm("Delete this team? Any linked players/accounts will be unassigned.")) return;
    await fetch(`/api/admin/teams/${id}`, { method: "DELETE" });
    refresh();
  }

  async function move(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= teams.length) return;
    const a = teams[index];
    const b = teams[target];
    // Optimistic local swap so the reorder feels instant.
    const next = [...teams];
    next[index] = b;
    next[target] = a;
    setTeams(next);
    await Promise.all([
      fetch(`/api/admin/teams/${a.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...a, sort_order: b.sort_order }),
      }),
      fetch(`/api/admin/teams/${b.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...b, sort_order: a.sort_order }),
      }),
    ]);
    refresh();
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl font-extrabold uppercase text-ibc-blue">Teams</h1>
      <p className="mt-1 text-sm text-ibc-ink/60">
        The club&apos;s squads (e.g. IBBC Men (2LCM)). Every player, coach, practice, tactic and
        practice board is attached to one of them — the super-admin sees everything, coaches and
        players only see their own team. Use the ↑ / ↓ buttons to change the order teams appear in
        across the site.
      </p>

      <form
        onSubmit={create}
        className="mt-6 grid grid-cols-2 gap-3 rounded-xl border border-black/5 bg-white p-5 shadow-sm"
      >
        <input
          placeholder="Name (e.g. IBBC Men (2LCM))"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="input"
        />
        <input
          placeholder="Category (e.g. Men 1 — 2nd Cantonal League)"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="input"
        />
        {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}
        <button className="col-span-2 rounded-full bg-ibc-blue py-2 text-sm font-bold uppercase text-white hover:brightness-110">
          + Add a team
        </button>
      </form>

      <ul className="mt-6 space-y-2">
        {teams.map((t, i) => (
          <TeamRow
            key={t.id}
            team={t}
            index={i}
            count={teams.length}
            open={openId === t.id}
            onToggle={() => setOpenId(openId === t.id ? null : t.id)}
            onSave={(patch) => update(t.id, patch)}
            onDelete={() => remove(t.id)}
            onMove={(dir) => move(i, dir)}
            teams={teams}
            gyms={gyms}
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

function TeamRow({ team, index, count, open, onToggle, onSave, onDelete, onMove, teams, gyms }) {
  // The halls this squad is linked to, from the gyms table.
  const teamGyms = gyms.filter((g) => (g.teams || []).some((t) => t.team_id === team.id));
  const [form, setForm] = useState(team);

  useEffect(() => setForm(team), [team]);

  return (
    <li className="rounded-xl border border-black/5 bg-white shadow-sm">
      <div className="flex items-center gap-2 p-4">
        <div className="flex shrink-0 flex-col">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            title="Move up"
            className="rounded px-1.5 py-0.5 text-xs font-bold text-ibc-blue hover:bg-ibc-blue/10 disabled:opacity-20"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index === count - 1}
            title="Move down"
            className="rounded px-1.5 py-0.5 text-xs font-bold text-ibc-blue hover:bg-ibc-blue/10 disabled:opacity-20"
          >
            ▼
          </button>
        </div>
        <button onClick={onToggle} className="flex flex-1 items-center justify-between gap-3 text-left">
          <div>
            <p className="text-sm font-semibold text-ibc-ink">{team.name}</p>
            {team.category && <p className="text-xs text-ibc-ink/50">{team.category}</p>}
            {teamGyms.length > 0 && (
              <p className="text-xs text-ibc-ink/40">{teamGyms.map((g) => g.name).join(" · ")}</p>
            )}
          </div>
          <span className="shrink-0 text-xs font-bold uppercase text-ibc-blue">
            {open ? "close" : "edit"}
          </span>
        </button>
      </div>

      {open && (
        <div className="grid grid-cols-2 gap-3 border-t border-black/5 p-4">
          <input
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input"
          />
          <input
            placeholder="Category"
            value={form.category || ""}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="input"
          />
          {/* The team's own public page. The address is what search engines
              index, so changing it later breaks every existing link. */}
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-bold uppercase text-ibc-blue/70">
              Adresse de la page d&apos;équipe
            </label>
            <div className="flex items-center gap-1 text-sm">
              <span className="font-mono text-ibc-ink/45">/teams/</span>
              <input
                value={form.slug || ""}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="input flex-1 font-mono"
              />
              <span className="font-mono text-ibc-ink/45">/</span>
              {team.slug && (
                <a href={`/teams/${team.slug}/`} target="_blank" rel="noopener noreferrer" className="ml-2 text-xs font-bold uppercase text-ibc-blue hover:underline">
                  Voir →
                </a>
              )}
            </div>
            {team.slug && form.slug && form.slug !== team.slug && (
              <p className="mt-1 text-xs font-semibold text-amber-700">
                Changer l&apos;adresse casse les liens existants vers /teams/{team.slug}/ et fait perdre son
                référencement Google.
              </p>
            )}
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-bold uppercase text-ibc-blue/70">
              Présentation (page d&apos;équipe) — « ## » titre, « - » liste
            </label>
            <textarea
              rows={6}
              value={form.description || ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input w-full"
            />
          </div>
          {/* These used to be free-text "Practice location" boxes. Anything
              typed there was silently overwritten the next time a gym was
              saved, because the gyms table owns venues. So they are gone:
              the team shows its real linked halls, and its schedule is
              edited right here against them. */}
          <div className="col-span-2 rounded-lg border border-black/10 bg-black/[0.02] p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase text-ibc-blue/70">Salles liées</p>
              <Link href="/admin/gyms" className="text-xs font-bold uppercase text-ibc-blue hover:underline">
                Gérer les salles →
              </Link>
            </div>
            {teamGyms.length === 0 ? (
              <p className="mt-1 text-sm text-ibc-ink/50">
                Aucune salle liée — liez cette équipe à une salle dans Gyms.
              </p>
            ) : (
              <ul className="mt-1 space-y-0.5 text-sm">
                {teamGyms.map((g) => {
                  const link = g.teams.find((t) => t.team_id === team.id);
                  return (
                    <li key={g.id}>
                      <span className="font-semibold text-ibc-ink">{g.name}</span>
                      {g.address && <span className="text-ibc-ink/50"> — {g.address}</span>}
                      {link?.usage && (
                        <span className="ml-2 text-xs text-ibc-ink/40">({link.usage})</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="col-span-2">
            <WeeklyPatternEditor teamId={team.id} teams={teams} gyms={teamGyms.length ? teamGyms : gyms} />
          </div>
          <div className="col-span-2 flex gap-2">
            <button
              onClick={() =>
                onSave({
                  name: form.name,
                  category: form.category,
                  slug: form.slug,
                  description: form.description,
                })
              }
              className="rounded-full bg-ibc-blue px-5 py-2 text-sm font-bold uppercase text-white hover:brightness-110"
            >
              Save
            </button>
            <button
              onClick={onDelete}
              className="rounded-full bg-red-50 px-5 py-2 text-sm font-bold uppercase text-red-600 hover:bg-red-100"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
