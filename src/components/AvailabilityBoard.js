"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

// The one board behind both "Availability" and "Team calendar".
//
// Those used to be two screens that each kept their own copy of the same
// idea, and they drifted: a mark made on one didn't obviously belong to the
// other, and each grew its own absence form. They are now the same
// component reading and writing the same endpoints, so a Présent clicked on
// the calendar IS the Présent shown on availability — there is no syncing
// step because there is only one set of data and one renderer.
//
// Three things it does:
//   1. Declare an absence, pinned at the top, folded until you click it.
//      Saving writes real absent marks on every session in the window
//      (src/lib/absences.js) and says how many it touched.
//   2. List the squad's declarations — name, dates, reason, note.
//   3. List upcoming sessions; click one to unfold the full roster with who
//      is in, who is out, who hasn't answered and who is away on a declared
//      absence. Staff can set anyone's mark from there; a player can set
//      their own.

const REASONS = [
  { value: "voyage", label: "Voyage / absence" },
  { value: "blessure", label: "Blessure" },
  { value: "autre", label: "Autre" },
];

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function formatLong(dateStr) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("fr-CH", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatShort(dateStr) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("fr-CH", {
    day: "numeric",
    month: "short",
  });
}

/** Inclusive day count, so "3 → 12 Oct" reads as 10 days, not 9. */
function durationDays(start, end) {
  const ms = new Date(end + "T00:00:00") - new Date(start + "T00:00:00");
  return Math.max(Math.round(ms / 86400000) + 1, 1);
}

function reasonLabel(value) {
  return REASONS.find((r) => r.value === value)?.label || value;
}

const EMPTY_FORM = {
  player_id: "",
  start_date: todayIso(),
  end_date: todayIso(),
  reason: "voyage",
  note: "",
};

export default function AvailabilityBoard({ title, intro, showTotals = false }) {
  const [status, setStatus] = useState(null);
  const [practices, setPractices] = useState([]);
  const [rsvps, setRsvps] = useState([]);
  const [roster, setRoster] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const [openId, setOpenId] = useState(null);
  const [busyKey, setBusyKey] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const isStaff = status?.role === "admin" || status?.role === "coach";
  const isAdmin = status?.role === "admin";
  const myUserId = status?.id ?? null;
  const myPlayerId = status?.player_id ?? null;

  const load = useCallback(async () => {
    const s = await fetch("/api/auth/status").then((r) => r.json());
    setStatus(s);

    const teamQuery =
      s.role !== "admin" && s.team_id ? `&team_id=${s.team_id}&include_club=1` : "";
    const rosterQuery = s.role !== "admin" && s.team_id ? `?team_id=${s.team_id}` : "";

    const [p, r, ro, a] = await Promise.all([
      fetch(`/api/practices?from=${todayIso()}${teamQuery}`).then((x) => x.json()),
      fetch("/api/rsvp").then((x) => x.json()),
      fetch(`/api/team/roster${rosterQuery}`).then((x) => (x.ok ? x.json() : [])),
      fetch("/api/availability").then((x) => x.json()),
    ]);

    setPractices(Array.isArray(p) ? p : []);
    setRsvps(Array.isArray(r) ? r : []);
    setRoster(Array.isArray(ro) ? ro : []);
    setEntries(Array.isArray(a) ? a : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // practice_rsvp rows are keyed by the LOGIN id, never the player id —
  // those are different numbers and mixing them up attributes one player's
  // presence to another.
  const marks = useMemo(() => {
    const map = {};
    for (const r of rsvps) {
      map[r.practice_id] = map[r.practice_id] || {};
      map[r.practice_id][r.user_id] = r;
    }
    return map;
  }, [rsvps]);

  const declarationsFor = useCallback(
    (dateStr) => entries.filter((e) => e.start_date <= dateStr && dateStr <= e.end_date),
    [entries]
  );

  async function setMark(practiceId, userId, next) {
    const key = `${practiceId}:${userId}`;
    setBusyKey(key);
    setError("");
    const res =
      next === "clear"
        ? await fetch("/api/rsvp", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ practice_id: practiceId, user_id: userId }),
          })
        : await fetch("/api/rsvp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ practice_id: practiceId, user_id: userId, status: next }),
          });
    if (!res.ok) setError("Impossible d'enregistrer ce marquage.");
    await load();
    setBusyKey(null);
  }

  async function declare(e) {
    e.preventDefault();
    setError("");
    setNotice("");

    const payload = { ...form };
    if (!isStaff) delete payload.player_id;
    else if (!payload.player_id) {
      setError("Choisissez un joueur.");
      return;
    } else payload.player_id = Number(payload.player_id);

    if (payload.end_date < payload.start_date) {
      setError("La date de fin doit être après la date de début.");
      return;
    }

    const res = await fetch("/api/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Erreur lors de l'enregistrement.");
      return;
    }
    setNotice(
      data.marked
        ? `Absence enregistrée — ${data.marked} séance${data.marked > 1 ? "s" : ""} passée${
            data.marked > 1 ? "s" : ""
          } en « absent » sur le calendrier.`
        : "Absence enregistrée — aucune séance programmée sur cette période."
    );
    setForm({ ...EMPTY_FORM, player_id: form.player_id });
    await load();
  }

  async function removeEntry(id) {
    if (
      !confirm(
        "Supprimer cette absence ? Les séances marquées automatiquement redeviendront « sans réponse »."
      )
    )
      return;
    const res = await fetch(`/api/availability/${id}`, { method: "DELETE" });
    if (!res.ok) setError("Suppression refusée.");
    setNotice("");
    await load();
  }

  // Only players who are actually on the squad may be declared absent by a
  // coach — the roster endpoint is already team-scoped server-side.
  const declarablePlayers = useMemo(
    () =>
      [...roster].sort((a, b) =>
        `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)
      ),
    [roster]
  );

  const upcomingEntries = useMemo(() => {
    const t = todayIso();
    return entries
      .filter((e) => e.end_date >= t)
      .sort((a, b) => a.start_date.localeCompare(b.start_date));
  }, [entries]);

  const totals = useMemo(() => {
    if (!showTotals) return [];
    const byUser = {};
    for (const r of rsvps) {
      byUser[r.user_id] = byUser[r.user_id] || { in: 0, out: 0 };
      byUser[r.user_id][r.status] += 1;
    }
    return roster
      .filter((p) => p.user_id)
      .map((p) => ({
        name: `${p.first_name} ${p.last_name}`,
        ...(byUser[p.user_id] || { in: 0, out: 0 }),
      }))
      .sort((a, b) => b.in - a.in);
  }, [rsvps, roster, showTotals]);

  if (loading) return <p className="text-ibc-ink/60">Chargement…</p>;

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-3xl font-extrabold uppercase text-ibc-blue">{title}</h1>
      <p className="mt-1 text-sm text-ibc-ink/60">{intro}</p>

      {/* ---- 1. Declare an absence: always first, folded until clicked ---- */}
      <section className="mt-6 overflow-hidden rounded-xl border border-ibc-accent/40 bg-ibc-accent/5">
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        >
          <span>
            <span className="font-display text-lg font-bold uppercase text-ibc-blue">
              Déclarer une absence
            </span>
            <span className="mt-0.5 block text-xs text-ibc-ink/60">
              {isStaff
                ? "Pour n'importe quel joueur de l'équipe — chaque séance de la période passe en « absent »."
                : "Voyage, blessure… une seule saisie et toutes les séances de la période passent en « absent »."}
            </span>
          </span>
          <span className="shrink-0 rounded-full bg-ibc-blue px-4 py-1.5 text-xs font-bold uppercase text-white">
            {showForm ? "Fermer" : "Déclarer"}
          </span>
        </button>

        {showForm && (
          <form onSubmit={declare} className="grid grid-cols-2 gap-3 border-t border-ibc-accent/30 px-5 py-4">
            {isStaff && (
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-bold uppercase text-ibc-blue">Joueur</label>
                <select
                  value={form.player_id}
                  onChange={(e) => setForm({ ...form, player_id: e.target.value })}
                  className="input"
                >
                  <option value="">— choisir —</option>
                  {declarablePlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.last_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-ibc-blue">Du</label>
              <input
                type="date"
                required
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-ibc-blue">Au</label>
              <input
                type="date"
                required
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="input"
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-bold uppercase text-ibc-blue">Motif</label>
              <select
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className="input"
              >
                {REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-bold uppercase text-ibc-blue">
                Note (visible par l&apos;équipe)
              </label>
              <textarea
                rows={2}
                placeholder="Ex. de retour le dimanche soir, disponible pour le match"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                className="input"
              />
            </div>
            <button className="col-span-2 rounded-full bg-ibc-blue px-5 py-2 text-sm font-bold uppercase text-white hover:brightness-110">
              Enregistrer l&apos;absence
            </button>
          </form>
        )}

        {/* The squad's live declarations: name · duration · reason · note. */}
        {upcomingEntries.length > 0 && (
          <ul className="divide-y divide-ibc-accent/20 border-t border-ibc-accent/30 bg-white/60">
            {upcomingEntries.map((e) => {
              const days = durationDays(e.start_date, e.end_date);
              const mine = myPlayerId && e.player_id === myPlayerId;
              return (
                <li key={e.id} className="flex flex-wrap items-start justify-between gap-2 px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ibc-ink">
                      {e.first_name ? `${e.first_name} ${e.last_name}` : "Vous"}
                      {mine && !isStaff && (
                        <span className="ml-2 rounded-full bg-ibc-blue/10 px-2 py-0.5 text-[10px] font-bold uppercase text-ibc-blue">
                          vous
                        </span>
                      )}
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                        {reasonLabel(e.reason)}
                      </span>
                    </p>
                    <p className="text-xs text-ibc-ink/60">
                      {formatShort(e.start_date)} → {formatShort(e.end_date)} · {days} jour
                      {days > 1 ? "s" : ""}
                    </p>
                    {e.note && <p className="mt-0.5 text-sm text-ibc-ink/70">{e.note}</p>}
                  </div>
                  {(isStaff || mine) && (
                    <button
                      onClick={() => removeEntry(e.id)}
                      className="shrink-0 text-xs font-bold uppercase text-red-500 hover:underline"
                    >
                      Supprimer
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
      {notice && <p className="mt-3 text-sm font-semibold text-green-700">{notice}</p>}

      {/* ---- 2. The sessions, each unfolding into the full roster ---- */}
      <h2 className="mt-8 font-display text-lg font-bold uppercase text-ibc-blue">
        Prochaines séances
      </h2>
      {practices.length === 0 && (
        <p className="mt-3 text-sm text-ibc-ink/50">Aucune séance programmée pour le moment.</p>
      )}

      <div className="mt-3 space-y-2">
        {practices.map((pr) => (
          <SessionCard
            key={pr.id}
            session={pr}
            open={openId === pr.id}
            onToggle={() => setOpenId(openId === pr.id ? null : pr.id)}
            roster={roster}
            marks={marks[pr.id] || {}}
            declared={declarationsFor(pr.practice_date)}
            isStaff={isStaff}
            isAdmin={isAdmin}
            myUserId={myUserId}
            busyKey={busyKey}
            onSetMark={setMark}
          />
        ))}
      </div>

      {showTotals && totals.length > 0 && (
        <div className="mt-8 overflow-hidden rounded-xl border border-black/5 bg-white shadow-sm">
          <p className="border-b border-black/5 px-4 py-2 text-xs font-bold uppercase tracking-wide text-ibc-blue">
            Totaux de la saison
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/5 text-left text-xs uppercase text-ibc-ink/50">
                <th className="px-4 py-2">Joueur</th>
                <th className="px-4 py-2">Présences</th>
                <th className="px-4 py-2">Absences</th>
              </tr>
            </thead>
            <tbody>
              {totals.map((t) => (
                <tr key={t.name} className="border-b border-black/5 last:border-0">
                  <td className="px-4 py-2 font-semibold">{t.name}</td>
                  <td className="px-4 py-2 text-green-700">{t.in}</td>
                  <td className="px-4 py-2 text-red-600">{t.out}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SessionCard({
  session,
  open,
  onToggle,
  roster,
  marks,
  declared,
  isStaff,
  isAdmin,
  myUserId,
  busyKey,
  onSetMark,
}) {
  // A club-wide session (team_id NULL) concerns everyone; otherwise only
  // the players who belong to that squad.
  const sessionRoster = session.team_id
    ? roster.filter((p) => p.team_id === session.team_id)
    : roster;

  const declaredPlayerIds = new Set(declared.map((d) => d.player_id));

  const inCount = sessionRoster.filter((p) => marks[p.user_id]?.status === "in").length;
  const outCount = sessionRoster.filter((p) => marks[p.user_id]?.status === "out").length;
  const noAnswer = Math.max(sessionRoster.length - inCount - outCount, 0);

  const myMark = myUserId ? marks[myUserId] : null;
  const myRow = sessionRoster.find((p) => p.user_id === myUserId);
  const iAmDeclared = myRow ? declaredPlayerIds.has(myRow.id) : false;

  return (
    <div className="rounded-xl border border-black/5 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ibc-ink">
            {formatLong(session.practice_date)} · {session.start_time}–{session.end_time}
            <span className="ml-2 rounded-full bg-ibc-blue/10 px-2 py-0.5 text-xs font-bold uppercase text-ibc-blue">
              {session.kind === "game"
                ? `Match${session.opponent ? " vs " + session.opponent : ""}`
                : "Entraînement"}
            </span>
            {!session.team_id && (
              <span className="ml-1 rounded-full bg-ibc-accent/30 px-2 py-0.5 text-xs font-bold uppercase text-ibc-ink/70">
                Club
              </span>
            )}
          </p>
          <p className="mt-1 text-xs font-semibold">
            <span className="text-green-600">{inCount} présent{inCount === 1 ? "" : "s"}</span>
            {" · "}
            <span className="text-red-500">{outCount} absent{outCount === 1 ? "" : "s"}</span>
            {" · "}
            <span className="text-ibc-ink/50">{noAnswer} sans réponse</span>
            {declared.length > 0 && (
              <>
                {" · "}
                <span className="text-amber-600">✈ {declared.length} en absence déclarée</span>
              </>
            )}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-ibc-accent/40 px-4 py-1.5 text-xs font-bold uppercase text-ibc-ink">
          {open ? "Fermer" : "Voir qui vient"}
        </span>
      </button>

      {/* Own quick answer, so a player never has to unfold to reply. */}
      {myRow && (
        <div className="flex flex-wrap items-center gap-2 border-t border-black/5 px-4 py-3">
          <span className="text-xs font-bold uppercase text-ibc-ink/50">Ma réponse</span>
          <MarkButton
            active={myMark?.status === "in"}
            busy={busyKey === `${session.id}:${myUserId}`}
            onClick={() => onSetMark(session.id, myUserId, "in")}
            activeClass="bg-green-600 text-white"
            idleClass="bg-black/5 text-ibc-ink/70 hover:bg-green-600/10"
          >
            Présent
          </MarkButton>
          <MarkButton
            active={myMark?.status === "out"}
            busy={busyKey === `${session.id}:${myUserId}`}
            onClick={() => onSetMark(session.id, myUserId, "out")}
            activeClass="bg-red-600 text-white"
            idleClass="bg-black/5 text-ibc-ink/70 hover:bg-red-600/10"
          >
            Absent
          </MarkButton>
          {iAmDeclared && (
            <span className="text-xs font-semibold text-amber-600">
              {myMark?.status === "in"
                ? "✈ vous êtes en absence déclarée sur cette date, mais vous vous êtes annoncé présent"
                : "✈ couvert par votre absence déclarée"}
            </span>
          )}
        </div>
      )}

      {open && (
        <ul className="divide-y divide-black/5 border-t border-black/5">
          {sessionRoster.length === 0 && (
            <li className="px-4 py-3 text-sm text-ibc-ink/50">
              Aucun joueur actif rattaché à cette équipe.
            </li>
          )}
          {sessionRoster.map((p) => {
            const mark = marks[p.user_id];
            const away = declared.find((d) => d.player_id === p.id);
            const isMe = p.user_id && p.user_id === myUserId;
            const canEdit = isStaff || isMe;
            return (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
                <span className="text-sm">
                  {p.jersey_number != null && p.jersey_number !== "" && (
                    <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-ibc-blue/10 text-[10px] font-bold text-ibc-blue">
                      {p.jersey_number}
                    </span>
                  )}
                  <span className="font-semibold text-ibc-ink">
                    {p.first_name} {p.last_name}
                  </span>
                  {isMe && (
                    <span className="ml-2 rounded-full bg-ibc-blue/10 px-2 py-0.5 text-[10px] font-bold uppercase text-ibc-blue">
                      vous
                    </span>
                  )}
                  {away && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                      ✈ absent déclaré — {reasonLabel(away.reason)}
                      {away.note ? ` · ${away.note}` : ""}
                    </span>
                  )}
                  {!p.user_id && (
                    <span className="ml-2 text-xs text-ibc-ink/40">pas encore de compte</span>
                  )}
                </span>

                {p.user_id && canEdit ? (
                  <span className="flex items-center gap-2">
                    <MarkButton
                      active={mark?.status === "in"}
                      busy={busyKey === `${session.id}:${p.user_id}`}
                      onClick={() => onSetMark(session.id, p.user_id, "in")}
                      activeClass="bg-green-600 text-white"
                      idleClass="bg-green-50 text-green-700 hover:bg-green-100"
                    >
                      Présent
                    </MarkButton>
                    <MarkButton
                      active={mark?.status === "out"}
                      busy={busyKey === `${session.id}:${p.user_id}`}
                      onClick={() => onSetMark(session.id, p.user_id, "out")}
                      activeClass="bg-red-600 text-white"
                      idleClass="bg-red-50 text-red-700 hover:bg-red-100"
                    >
                      Absent
                    </MarkButton>
                    {mark && (
                      <button
                        type="button"
                        onClick={() => onSetMark(session.id, p.user_id, "clear")}
                        className="rounded-full px-2 py-1 text-xs font-bold uppercase text-ibc-ink/40 hover:text-ibc-ink/70"
                        title="Effacer ce marquage"
                      >
                        ✕
                      </button>
                    )}
                  </span>
                ) : (
                  <StatusChip status={mark?.status} />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StatusChip({ status }) {
  const map = {
    in: { label: "Présent", cls: "bg-green-600 text-white" },
    out: { label: "Absent", cls: "bg-red-600 text-white" },
  };
  const s = map[status] || { label: "Sans réponse", cls: "bg-black/5 text-ibc-ink/50" };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${s.cls}`}>{s.label}</span>
  );
}

function MarkButton({ active, busy, onClick, activeClass, idleClass, children }) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase transition disabled:opacity-50 ${
        active ? activeClass : idleClass
      }`}
    >
      {children}
    </button>
  );
}
