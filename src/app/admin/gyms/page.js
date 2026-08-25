"use client";

import { useCallback, useEffect, useState } from "react";
import ImageDropzone from "@/components/ImageDropzone";

const EMPTY = {
  name: "",
  address: "",
  maps_url: "",
  notes: "",
  photo_interior_data_url: "",
  photo_exterior_data_url: "",
  teams: [],
};

const USAGE_OPTIONS = [
  { value: "practice", label: "Practice only" },
  { value: "games", label: "Home games only" },
  { value: "both", label: "Practice & home games" },
];

/**
 * The club's halls, managed in one place. A gym is created once here and then
 * attached to any number of squads — that is what puts "IBBC Men (2LCM) trains
 * here" on the public Club and Teams pages. Saving a gym also mirrors the
 * venue back onto each linked team, so the reminder email and the .ics feed
 * stay correct without a second edit anywhere.
 */
export default function GymsAdminPage() {
  const [gyms, setGyms] = useState([]);
  const [teams, setTeams] = useState([]);
  const [homeGymId, setHomeGymId] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState(null);
  const [savedNote, setSavedNote] = useState("");

  const refresh = useCallback(() => {
    fetch("/api/gyms").then((r) => r.json()).then(setGyms);
    fetch("/api/admin/teams").then((r) => r.json()).then(setTeams);
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => setHomeGymId(s.home_gym_id || ""));
  }, []);

  useEffect(refresh, [refresh]);

  function flash(message) {
    setSavedNote(message);
    setTimeout(() => setSavedNote(""), 2500);
  }

  async function create(e) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/gyms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm(EMPTY);
      refresh();
      flash("Gym added.");
    } else {
      setError((await res.json()).error || "Something went wrong");
    }
  }

  async function save(id, patch) {
    const res = await fetch(`/api/gyms/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      setError((await res.json()).error || "Something went wrong");
      return;
    }
    refresh();
    flash("Saved.");
  }

  async function remove(id) {
    if (
      !confirm(
        "Delete this gym? Teams stay untouched — they simply lose this venue, and any team whose practice location came from it will show as 'to be announced' until you assign another gym."
      )
    ) {
      return;
    }
    await fetch(`/api/gyms/${id}`, { method: "DELETE" });
    refresh();
    flash("Gym deleted.");
  }

  async function move(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= gyms.length) return;
    const a = gyms[index];
    const b = gyms[target];
    const next = [...gyms];
    next[index] = b;
    next[target] = a;
    setGyms(next);
    await Promise.all([
      fetch(`/api/gyms/${a.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...a, sort_order: b.sort_order }),
      }),
      fetch(`/api/gyms/${b.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...b, sort_order: a.sort_order }),
      }),
    ]);
    refresh();
  }

  async function saveHomeGym(value) {
    setHomeGymId(value);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ home_gym_id: value }),
    });
    flash("Homepage venue updated.");
  }

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl font-extrabold uppercase text-ibc-blue">Gyms</h1>
      <p className="mt-1 text-sm text-ibc-ink/60">
        Every hall the club uses. Add a gym once, then tick the squads that use it and say whether
        they practise there, play home games there, or both — that is what the public Club and Teams
        pages show. Editing a gym here updates it everywhere, including each team&apos;s practice
        location, the weekly reminder email and the calendar feed.
      </p>

      <div className="mt-6 rounded-xl border border-black/5 bg-white p-5 shadow-sm">
        <label className="block text-xs font-bold uppercase tracking-wide text-ibc-ink/60">
          Venue shown on the homepage
        </label>
        <p className="mt-1 text-xs text-ibc-ink/50">
          The club&apos;s main hall — used on the home page and on the public calendar when no
          single squad is in view.
        </p>
        <select
          value={homeGymId}
          onChange={(e) => saveHomeGym(e.target.value)}
          className="input mt-2 w-full"
        >
          <option value="">— First gym in the list —</option>
          {gyms.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
              {g.address ? ` — ${g.address}` : ""}
            </option>
          ))}
        </select>
      </div>

      <form
        onSubmit={create}
        className="mt-6 grid gap-3 rounded-xl border border-black/5 bg-white p-5 shadow-sm sm:grid-cols-2"
      >
        <p className="sm:col-span-2 font-display text-sm font-bold uppercase text-ibc-blue">
          Add a gym
        </p>
        <input
          placeholder="Name (e.g. École Raymond-Uldry)"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="input"
        />
        <input
          placeholder="Address (used for the map)"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          className="input"
        />
        <input
          placeholder="Google Maps link (optional — leave blank to search the address)"
          value={form.maps_url}
          onChange={(e) => setForm({ ...form, maps_url: e.target.value })}
          className="input sm:col-span-2"
        />
        <input
          placeholder="Access notes (optional — e.g. entrance via the courtyard)"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="input sm:col-span-2"
        />
        <div className="sm:col-span-2">
          <GymPhotos
            interior={form.photo_interior_data_url}
            exterior={form.photo_exterior_data_url}
            onChange={(patch) => setForm({ ...form, ...patch })}
          />
        </div>
        <div className="sm:col-span-2">
          <TeamPicker
            teams={teams}
            value={form.teams}
            onChange={(teamsValue) => setForm({ ...form, teams: teamsValue })}
          />
        </div>
        {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
        <button className="rounded-full bg-ibc-blue py-2 text-sm font-bold uppercase text-white hover:brightness-110 sm:col-span-2">
          + Add gym
        </button>
      </form>

      {savedNote && (
        <p className="mt-4 rounded-lg bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
          {savedNote}
        </p>
      )}

      <ul className="mt-6 space-y-2">
        {gyms.map((gym, i) => (
          <GymRow
            key={gym.id}
            gym={gym}
            teams={teams}
            index={i}
            count={gyms.length}
            open={openId === gym.id}
            onToggle={() => setOpenId(openId === gym.id ? null : gym.id)}
            onSave={(patch) => save(gym.id, patch)}
            onDelete={() => remove(gym.id)}
            onMove={(dir) => move(i, dir)}
          />
        ))}
      </ul>

      {gyms.length === 0 && (
        <p className="mt-6 rounded-xl border border-dashed border-black/10 p-6 text-center text-sm text-ibc-ink/50">
          No gym yet. Add the club&apos;s main hall above to get started.
        </p>
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

function GymRow({ gym, teams, index, count, open, onToggle, onSave, onDelete, onMove }) {
  const [form, setForm] = useState(gym);

  useEffect(() => setForm(gym), [gym]);

  const teamNames = (gym.teams || []).map((t) => t.team_name);

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
        <button
          onClick={onToggle}
          className="flex flex-1 items-center justify-between gap-3 text-left"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ibc-ink">{gym.name}</p>
            {gym.address && <p className="text-xs text-ibc-ink/50">{gym.address}</p>}
            <p className="mt-0.5 text-xs text-ibc-ink/40">
              {teamNames.length > 0 ? teamNames.join(" · ") : "No team assigned yet"}
            </p>
          </div>
          <span className="shrink-0 text-xs font-bold uppercase text-ibc-blue">
            {open ? "close" : "edit"}
          </span>
        </button>
      </div>

      {open && (
        <div className="grid gap-3 border-t border-black/5 p-4 sm:grid-cols-2">
          <input
            placeholder="Name"
            value={form.name || ""}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input"
          />
          <input
            placeholder="Address"
            value={form.address || ""}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="input"
          />
          <input
            placeholder="Google Maps link (optional)"
            value={form.maps_url || ""}
            onChange={(e) => setForm({ ...form, maps_url: e.target.value })}
            className="input sm:col-span-2"
          />
          <input
            placeholder="Access notes (optional)"
            value={form.notes || ""}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="input sm:col-span-2"
          />
          <div className="sm:col-span-2">
            <GymPhotos
              interior={form.photo_interior_data_url}
              exterior={form.photo_exterior_data_url}
              onChange={(patch) => setForm({ ...form, ...patch })}
            />
          </div>
          <div className="sm:col-span-2">
            <TeamPicker
              teams={teams}
              value={(form.teams || []).map((t) => ({
                team_id: t.team_id,
                usage: t.usage,
                schedule_note: t.schedule_note || "",
              }))}
              onChange={(teamsValue) => setForm({ ...form, teams: teamsValue })}
            />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <button
              onClick={() => onSave(form)}
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

/**
 * Two photos per hall: what it looks like inside, and what the entrance
 * looks like from the street. The second is the one that actually helps a
 * visiting squad find the door.
 */
function GymPhotos({ interior, exterior, onChange }) {
  return (
    <fieldset className="rounded-lg border border-black/10 p-3">
      <legend className="px-1 text-xs font-bold uppercase tracking-wide text-ibc-ink/60">
        Photos
      </legend>
      <p className="mb-3 text-xs text-ibc-ink/50">
        Shown on the public Club page, where visitors can click either one to
        enlarge and zoom it.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-xs font-bold uppercase text-ibc-blue">Inside the hall</p>
          <ImageDropzone
            value={interior || ""}
            onChange={(dataUrl) => onChange({ photo_interior_data_url: dataUrl })}
            maxWidth={1400}
            size={120}
            label="Click or drag a photo of the court"
          />
        </div>
        <div>
          <p className="mb-1 text-xs font-bold uppercase text-ibc-blue">Entrance / outside</p>
          <ImageDropzone
            value={exterior || ""}
            onChange={(dataUrl) => onChange({ photo_exterior_data_url: dataUrl })}
            maxWidth={1400}
            size={120}
            label="Click or drag a photo of the entrance"
          />
        </div>
      </div>
    </fieldset>
  );
}

/**
 * One row per squad: tick it to attach the gym, then say what it is used for
 * and optionally when. A gym with no squad ticked is still valid — useful for
 * a hall the club only books occasionally.
 */
function TeamPicker({ teams, value, onChange }) {
  const byId = Object.fromEntries((value || []).map((v) => [String(v.team_id), v]));

  function toggle(teamId, checked) {
    const next = checked
      ? [...(value || []), { team_id: teamId, usage: "practice", schedule_note: "" }]
      : (value || []).filter((v) => Number(v.team_id) !== Number(teamId));
    onChange(next);
  }

  function patch(teamId, key, val) {
    onChange(
      (value || []).map((v) =>
        Number(v.team_id) === Number(teamId) ? { ...v, [key]: val } : v
      )
    );
  }

  return (
    <fieldset className="rounded-lg border border-black/10 p-3">
      <legend className="px-1 text-xs font-bold uppercase tracking-wide text-ibc-ink/60">
        Teams using this gym
      </legend>
      <div className="space-y-2">
        {teams.map((team) => {
          const link = byId[String(team.id)];
          const checked = !!link;
          return (
            <div key={team.id} className="rounded-lg bg-black/[0.02] p-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-ibc-ink">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => toggle(team.id, e.target.checked)}
                />
                {team.name}
              </label>
              {checked && (
                <div className="mt-2 grid gap-2 pl-6 sm:grid-cols-2">
                  <select
                    value={link.usage || "practice"}
                    onChange={(e) => patch(team.id, "usage", e.target.value)}
                    className="input"
                  >
                    {USAGE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <input
                    placeholder="When (e.g. Mon & Thu 20:00–22:00)"
                    value={link.schedule_note || ""}
                    onChange={(e) => patch(team.id, "schedule_note", e.target.value)}
                    className="input"
                  />
                </div>
              )}
            </div>
          );
        })}
        {teams.length === 0 && (
          <p className="text-sm text-ibc-ink/50">No team yet — create one from the Teams page.</p>
        )}
      </div>
    </fieldset>
  );
}
