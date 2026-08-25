"use client";

import { useCallback, useEffect, useState } from "react";

// Days in club order — the week runs Monday to Sunday here, even though
// JavaScript's getDay() calls Sunday 0. The value stored is getDay()'s.
const DAYS = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mer" },
  { value: 4, label: "Jeu" },
  { value: 5, label: "Ven" },
  { value: 6, label: "Sam" },
  { value: 0, label: "Dim" },
];

/**
 * One squad's weekly rhythm: which days it trains, at what time, in which
 * hall. The calendar generator reads exactly this, so a youth squad training
 * Wednesday and Saturday morning needs no code change — and club events can
 * land on any of the seven days.
 */
export default function WeeklyPatternEditor({ teamId, teams, gyms, onSaved }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/practice-slots?team_id=${teamId ?? ""}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setSlots(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, [teamId]);

  useEffect(load, [load]);

  const teamName = teams.find((t) => String(t.id) === String(teamId))?.name || "toutes les équipes";

  function addSlot(weekday) {
    setSlots((s) => [...s, { weekday, start_time: "20:00", end_time: "22:00", gym_id: "" }]);
  }
  function update(i, patch) {
    setSlots((s) => s.map((slot, n) => (n === i ? { ...slot, ...patch } : slot)));
  }
  function removeSlot(i) {
    setSlots((s) => s.filter((_, n) => n !== i));
  }

  async function save() {
    setSaving(true);
    setMessage("");
    const res = await fetch(`/api/practice-slots?team_id=${teamId ?? ""}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slots: slots.map((s) => ({
          weekday: Number(s.weekday),
          start_time: s.start_time,
          end_time: s.end_time,
          gym_id: s.gym_id || null,
        })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setMessage(data.error || "Échec de l'enregistrement.");
      return;
    }
    setSlots(data.slots || []);
    setMessage("Rythme hebdomadaire enregistré.");
    onSaved?.();
    setTimeout(() => setMessage(""), 3000);
  }

  const ordered = [...slots].sort(
    (a, b) =>
      DAYS.findIndex((d) => d.value === Number(a.weekday)) -
        DAYS.findIndex((d) => d.value === Number(b.weekday)) ||
      String(a.start_time).localeCompare(String(b.start_time))
  );

  return (
    <div className="rounded-xl border border-black/10 bg-white p-4">
      <p className="font-display text-sm font-bold uppercase text-ibc-blue">
        Rythme hebdomadaire — {teamName}
      </p>
      <p className="mt-1 text-xs text-ibc-ink/55">
        Le club a des événements du lundi au dimanche. Réglez ici les jours et horaires de cette
        équipe : c&apos;est ce que la génération du calendrier utilise. Sans rythme enregistré, elle
        retombe sur lundi/jeudi 20:00–22:00.
      </p>

      <div className="mt-3 flex flex-wrap gap-1">
        {DAYS.map((d) => (
          <button
            key={d.value}
            type="button"
            onClick={() => addSlot(d.value)}
            className="rounded-full border border-ibc-blue/30 px-3 py-1 text-xs font-bold uppercase text-ibc-blue hover:bg-ibc-blue/10"
          >
            + {d.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-3 text-xs text-ibc-ink/50">Chargement…</p>
      ) : ordered.length === 0 ? (
        <p className="mt-3 text-xs text-ibc-ink/50">
          Aucune séance récurrente. Ajoutez un jour ci-dessus.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {ordered.map((slot) => {
            const i = slots.indexOf(slot);
            return (
              <li key={i} className="flex flex-wrap items-center gap-2 rounded-lg bg-ibc-blue/5 p-2">
                <select
                  value={slot.weekday}
                  onChange={(e) => update(i, { weekday: Number(e.target.value) })}
                  className="input !w-auto !py-1 text-xs"
                >
                  {DAYS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
                <input
                  type="time"
                  value={slot.start_time || ""}
                  onChange={(e) => update(i, { start_time: e.target.value })}
                  className="input !w-auto !py-1 text-xs"
                />
                <span className="text-xs text-ibc-ink/40">→</span>
                <input
                  type="time"
                  value={slot.end_time || ""}
                  onChange={(e) => update(i, { end_time: e.target.value })}
                  className="input !w-auto !py-1 text-xs"
                />
                <select
                  value={slot.gym_id || ""}
                  onChange={(e) => update(i, { gym_id: e.target.value })}
                  className="input !w-auto !py-1 text-xs"
                >
                  <option value="">Salle — non précisée</option>
                  {gyms.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeSlot(i)}
                  className="ml-auto text-xs font-bold uppercase text-red-500 hover:underline"
                >
                  Retirer
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-full bg-ibc-blue px-4 py-2 text-xs font-bold uppercase text-white hover:brightness-110 disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : "Enregistrer le rythme"}
        </button>
        {message && <span className="text-xs font-semibold text-ibc-blue">{message}</span>}
      </div>
    </div>
  );
}
