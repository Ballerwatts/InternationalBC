"use client";

// Staff register, inside the team space.
//
// This exists because /admin/* is super-admin only — a coach was locked out
// of the appel entirely. Here a coach works with their own squad only
// (the roster and the RSVP API are both scoped server-side by team_id);
// an admin gets a squad picker and can work with any of them.
//
// After a game is played, the same card takes the result: final score, a
// short recap for the public calendar, and points per player. Those points
// become the player's season totals on the roster.

import { useCallback, useEffect, useMemo, useState } from "react";
import { eventLabel } from "@/lib/event-kinds";
import { gameOutcome, outcomeClasses } from "@/lib/game-result";

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default function TeamRegisterPage() {
  const [status, setStatus] = useState(null);
  const [teams, setTeams] = useState([]);
  const [teamId, setTeamId] = useState("");
  const [practices, setPractices] = useState([]);
  const [rsvps, setRsvps] = useState([]);
  const [roster, setRoster] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [busyKey, setBusyKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  // Result editing state, per open game
  const [result, setResult] = useState({ score_us: "", score_them: "", recap: "" });
  const [points, setPoints] = useState({});
  const [savingResult, setSavingResult] = useState(false);

  const load = useCallback(async () => {
    const s = await fetch("/api/auth/status").then((r) => r.json());
    setStatus(s);

    // A coach is pinned to their own squad; an admin chooses one.
    const effectiveTeam = s.role === "admin" ? teamId : s.team_id ?? "";
    const teamQuery = effectiveTeam ? `?team_id=${effectiveTeam}` : "";

    const [p, r, ro] = await Promise.all([
      fetch(`/api/practices${teamQuery}`).then((r) => r.json()),
      fetch("/api/rsvp").then((r) => r.json()),
      fetch(`/api/team/roster${teamQuery}`).then((r) => r.json()),
    ]);
    setPractices(Array.isArray(p) ? p : []);
    setRsvps(Array.isArray(r) ? r : []);
    setRoster(Array.isArray(ro) ? ro : []);
    setLoading(false);
  }, [teamId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch("/api/admin/teams")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setTeams(Array.isArray(d) ? d : []))
      .catch(() => setTeams([]));
  }, []);

  const marksBySession = useMemo(() => {
    const map = {};
    for (const r of rsvps) {
      map[r.practice_id] = map[r.practice_id] || {};
      map[r.practice_id][r.user_id] = r;
    }
    return map;
  }, [rsvps]);

  const today = todayIso();
  const upcoming = useMemo(
    () => practices.filter((p) => p.practice_date >= today).slice(0, 12),
    [practices, today]
  );
  const recent = useMemo(
    () =>
      practices
        .filter((p) => p.practice_date < today)
        .sort((a, b) => b.practice_date.localeCompare(a.practice_date))
        .slice(0, 12),
    [practices, today]
  );

  async function setMark(sessionId, userId, next) {
    const key = `${sessionId}:${userId}`;
    setBusyKey(key);
    const res = await fetch("/api/rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ practice_id: sessionId, user_id: userId, status: next }),
    });
    if (!res.ok) setNotice("Impossible d'enregistrer — vérifiez que ce joueur est bien dans votre équipe.");
    await load();
    setBusyKey(null);
  }

  async function openSession(session) {
    if (openId === session.id) {
      setOpenId(null);
      return;
    }
    setOpenId(session.id);
    setResult({
      score_us: session.score_us ?? "",
      score_them: session.score_them ?? "",
      recap: session.recap ?? "",
    });
    if (session.kind === "game") {
      const rows = await fetch(`/api/practices/${session.id}/stats`).then((r) =>
        r.ok ? r.json() : []
      );
      const map = {};
      for (const row of rows) map[row.player_id] = String(row.points);
      setPoints(map);
    } else {
      setPoints({});
    }
  }

  async function saveResult(session) {
    setSavingResult(true);
    await fetch(`/api/practices/${session.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        score_us: result.score_us === "" ? null : Number(result.score_us),
        score_them: result.score_them === "" ? null : Number(result.score_them),
        recap: result.recap || null,
      }),
    });

    // Only players with a number typed in are counted as having played.
    const stats = Object.entries(points)
      .filter(([, v]) => String(v).trim() !== "")
      .map(([player_id, v]) => ({ player_id: Number(player_id), points: Number(v) }));
    await fetch(`/api/practices/${session.id}/stats`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stats }),
    });

    setNotice("Résultat enregistré. Les totaux des joueurs sont mis à jour.");
    setSavingResult(false);
    await load();
  }

  if (loading) return <p className="text-ibc-ink/60">Chargement…</p>;

  // Players see the register, they just can't change it. Every write here
  // is refused server-side for a player anyway (requireStaff on the RSVP
  // and stats routes); readOnly makes the UI tell the same story instead of
  // showing buttons that would 401.
  const readOnly = !(status?.role === "admin" || status?.role === "coach");

  const listProps = {
    readOnly,
    roster,
    marksBySession,
    openId,
    openSession,
    setMark,
    busyKey,
    result,
    setResult,
    points,
    setPoints,
    saveResult,
    savingResult,
  };

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl font-extrabold uppercase text-ibc-blue">
        Faire l&apos;appel
      </h1>
      <p className="mt-1 text-sm text-ibc-ink/60">
        {readOnly
          ? "L'appel de votre équipe : qui est annoncé présent ou absent pour chaque séance, et le résultat des matchs joués. Seul l'entraîneur peut le modifier — pour vous annoncer, passez par Availability."
          : "Cochez qui sera présent — ou qui l'était. Une présence notée ici compte dans le total de la saison du joueur, exactement comme s'il s'était annoncé lui-même. Après un match, saisissez le score, un court résumé et les points de chacun."}
      </p>

      {status?.role === "admin" && (
        <div className="mt-4 flex items-center gap-2">
          <label className="text-xs font-bold uppercase text-ibc-blue/70">Équipe</label>
          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="rounded-md border border-black/10 px-3 py-1.5 text-sm"
          >
            <option value="">Toutes les équipes</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {notice && (
        <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}</p>
      )}

      {roster.length === 0 && (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Aucun compte joueur actif rattaché à cette équipe. Un administrateur doit créer les
          comptes et les rattacher à l&apos;équipe depuis « Comptes joueurs ».
        </p>
      )}

      <h2 className="mt-8 font-display text-xl font-bold uppercase text-ibc-blue">À venir</h2>
      <SessionList sessions={upcoming} {...listProps} />

      <h2 className="mt-8 font-display text-xl font-bold uppercase text-ibc-ink/50">
        Récemment passés
      </h2>
      <SessionList sessions={recent} {...listProps} />
    </div>
  );
}

function SessionList({
  readOnly,
  sessions,
  roster,
  marksBySession,
  openId,
  openSession,
  setMark,
  busyKey,
  result,
  setResult,
  points,
  setPoints,
  saveResult,
  savingResult,
}) {
  if (sessions.length === 0) {
    return <p className="mt-3 text-sm text-ibc-ink/50">Aucune séance.</p>;
  }

  return (
    <div className="mt-3 space-y-3">
      {sessions.map((s) => {
        const marks = marksBySession[s.id] || {};
        // marksBySession is keyed by the LOGIN id (practice_rsvp.user_id),
        // while a roster row's `id` is the PLAYER id — they are different
        // numbers. Looking marks up by p.id silently attributed one
        // player's presence to whoever happened to share that number.
        const inCount = roster.filter((p) => marks[p.user_id]?.status === "in").length;
        const outCount = roster.filter((p) => marks[p.user_id]?.status === "out").length;
        const open = openId === s.id;
        const outcome = gameOutcome(s);

        return (
          <div key={s.id} className="rounded-xl border border-black/5 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ibc-ink">
                  {s.practice_date} · {s.start_time}–{s.end_time}
                  <span className="ml-2 rounded-full bg-ibc-blue/10 px-2 py-0.5 text-xs font-bold uppercase text-ibc-blue">
                    {eventLabel(s)}
                  </span>
                  {outcome && (
                    <span
                      className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold uppercase ${outcomeClasses(
                        outcome
                      )}`}
                    >
                      {outcome} {s.score_us}–{s.score_them}
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs text-ibc-ink/60">
                  <span className="font-bold text-green-700">
                    {inCount} présent{inCount === 1 ? "" : "s"}
                  </span>
                  {" · "}
                  <span className="text-red-600">
                    {outCount} absent{outCount === 1 ? "" : "s"}
                  </span>
                  {" · "}
                  <span className="text-ibc-ink/50">
                    {Math.max(roster.length - inCount - outCount, 0)} sans réponse
                  </span>
                </p>
              </div>
              <button
                onClick={() => openSession(s)}
                className="rounded-full bg-ibc-accent px-4 py-1.5 text-xs font-bold uppercase text-ibc-ink hover:brightness-95"
              >
                {open ? "Fermer" : readOnly ? "Voir" : s.kind === "game" ? "Appel & résultat" : "Faire l'appel"}
              </button>
            </div>

            {open && (
              <>
                <ul className="mt-4 divide-y divide-black/5 border-t border-black/5">
                  {roster.map((p) => {
                    const mark = marks[p.user_id];
                    const key = `${s.id}:${p.user_id}`;
                    const label = p.first_name
                      ? `${p.first_name} ${p.last_name}`
                      : p.name;
                    return (
                      <li
                        key={p.id}
                        className="flex flex-wrap items-center justify-between gap-2 py-2"
                      >
                        <span className="text-sm">
                          {p.jersey_number && (
                            <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-ibc-blue/10 text-[10px] font-bold text-ibc-blue">
                              {p.jersey_number}
                            </span>
                          )}
                          {label}
                          {mark?.marked_by_name && (
                            <span className="ml-2 text-xs text-ibc-ink/40">
                              noté par {mark.marked_by_name}
                            </span>
                          )}
                        </span>
                        <span className="flex items-center gap-2">
                          {s.kind === "game" &&
                            (readOnly ? (
                              points[p.id] ? (
                                <span className="rounded-full bg-ibc-blue/10 px-2 py-1 text-xs font-bold text-ibc-blue">
                                  {points[p.id]} pts
                                </span>
                              ) : null
                            ) : (
                              <input
                                type="number"
                                min="0"
                                placeholder="pts"
                                value={points[p.id] ?? ""}
                                onChange={(e) => setPoints({ ...points, [p.id]: e.target.value })}
                                className="w-16 rounded-md border border-black/10 px-2 py-1 text-xs"
                              />
                            ))}
                          {readOnly ? (
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                                mark?.status === "in"
                                  ? "bg-green-600 text-white"
                                  : mark?.status === "out"
                                  ? "bg-red-600 text-white"
                                  : "bg-black/5 text-ibc-ink/40"
                              }`}
                            >
                              {mark?.status === "in"
                                ? "Présent"
                                : mark?.status === "out"
                                ? "Absent"
                                : "—"}
                            </span>
                          ) : !p.user_id ? (
                            <span className="text-xs text-ibc-ink/40">pas de compte</span>
                          ) : (
                          <>
                          <RegisterButton
                            active={mark?.status === "in"}
                            disabled={busyKey === key}
                            onClick={() => setMark(s.id, p.user_id, "in")}
                            activeClass="bg-green-600 text-white"
                            idleClass="bg-green-50 text-green-700 hover:bg-green-100"
                          >
                            Présent
                          </RegisterButton>
                          <RegisterButton
                            active={mark?.status === "out"}
                            disabled={busyKey === key}
                            onClick={() => setMark(s.id, p.user_id, "out")}
                            activeClass="bg-red-600 text-white"
                            idleClass="bg-red-50 text-red-700 hover:bg-red-100"
                          >
                            Absent
                          </RegisterButton>
                          </>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                {s.kind === "game" && readOnly && (
                  <div className="mt-4 rounded-lg border border-black/5 bg-ibc-blue/5 p-4">
                    <p className="text-xs font-bold uppercase text-ibc-blue">Résultat du match</p>
                    <p className="mt-1 text-sm text-ibc-ink/70">
                      {s.score_us != null && s.score_them != null
                        ? `${s.score_us} — ${s.score_them}${s.opponent ? ` contre ${s.opponent}` : ""}`
                        : "Pas encore de résultat enregistré."}
                    </p>
                    {s.recap && (
                      <p className="mt-2 text-sm italic text-ibc-ink/60">« {s.recap} »</p>
                    )}
                  </div>
                )}

                {s.kind === "game" && !readOnly && (
                  <div className="mt-4 rounded-lg border border-black/5 bg-ibc-blue/5 p-4">
                    <p className="text-xs font-bold uppercase text-ibc-blue">Résultat du match</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        placeholder="Nous"
                        value={result.score_us}
                        onChange={(e) => setResult({ ...result, score_us: e.target.value })}
                        className="w-20 rounded-md border border-black/10 px-2 py-1.5 text-sm"
                      />
                      <span className="text-sm text-ibc-ink/50">—</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="Eux"
                        value={result.score_them}
                        onChange={(e) => setResult({ ...result, score_them: e.target.value })}
                        className="w-20 rounded-md border border-black/10 px-2 py-1.5 text-sm"
                      />
                      <span className="text-xs text-ibc-ink/50">
                        {s.opponent ? `contre ${s.opponent}` : ""}
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      maxLength={280}
                      placeholder="Résumé en deux lignes — ce texte apparaît sur le calendrier public."
                      value={result.recap}
                      onChange={(e) => setResult({ ...result, recap: e.target.value })}
                      className="mt-2 w-full rounded-md border border-black/10 px-3 py-2 text-sm"
                    />
                    <p className="mt-1 text-[10px] uppercase text-ibc-ink/40">
                      {result.recap.length}/280
                    </p>
                    <button
                      type="button"
                      disabled={savingResult}
                      onClick={() => saveResult(s)}
                      className="mt-2 rounded-full bg-ibc-blue px-5 py-2 text-xs font-bold uppercase text-white hover:brightness-110 disabled:opacity-50"
                    >
                      {savingResult ? "…" : "Enregistrer le résultat"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function RegisterButton({ active, disabled, onClick, activeClass, idleClass, children }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-bold uppercase transition disabled:opacity-50 ${
        active ? activeClass : idleClass
      }`}
    >
      {children}
    </button>
  );
}
