"use client";

import { useEffect, useRef, useState } from "react";
import { EVENT_KINDS, eventLabel, kindNeedsTitle } from "@/lib/event-kinds";
import { expandHolidayDays, formatHolidayRange } from "@/lib/holidays";
import { CSV_TEMPLATE } from "@/lib/game-csv";

const KIND_LABELS = {
  game: "Game",
  friendly: "Friendly",
  practice: "Entraînement",
  event: "Événement",
  tournament: "Tournoi",
};
import { todayISO } from "@/lib/dates";
import WeeklyPatternEditor from "@/components/WeeklyPatternEditor";

const EMPTY = {
  kind: "practice",
  title: "",
  team_id: "",
  practice_date: "",
  start_time: "20:00",
  end_time: "22:00",
  location_name: "École de commerce Raymond-Uldry",
  location_address: "Chemin du Domaine-Patry 1, 1224 Chêne-Bougeries, Genève",
  opponent: "",
  notes: "",
  video_url: "",
};

const EMPTY_HOLIDAY = { name: "", start_date: "", end_date: "", kind: "vacances" };

export default function ScheduleAdminPage() {
  const [items, setItems] = useState([]);
  const [teams, setTeams] = useState([]);
  const [gyms, setGyms] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [genTeamId, setGenTeamId] = useState("");
  const [message, setMessage] = useState("");

  // Bulk game import
  const [showImport, setShowImport] = useState(false);
  const [csv, setCsv] = useState("");
  // Which calendars the import writes to. All squads are ticked by default —
  // a club event or tournament usually belongs on every one of them.
  const [importTeamIds, setImportTeamIds] = useState(null); // null = not yet initialised
  const [defaultKind, setDefaultKind] = useState("game");
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);

  // School holidays
  const [showHolidays, setShowHolidays] = useState(false);
  const [holidayForm, setHolidayForm] = useState(EMPTY_HOLIDAY);

  // Past events are archived — folded away at the bottom, not deleted.
  const [showPast, setShowPast] = useState(false);
  const formRef = useRef(null);

  function refresh() {
    fetch("/api/practices").then((r) => r.json()).then(setItems);
  }

  function refreshHolidays() {
    fetch("/api/holidays")
      .then((r) => r.json())
      .then((d) => setHolidays(Array.isArray(d) ? d : []));
  }

  useEffect(() => {
    refresh();
    refreshHolidays();
    fetch("/api/gyms")
      .then((r) => r.json())
      .then((d) => setGyms(Array.isArray(d) ? d : []));
    fetch("/api/admin/teams")
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : [];
        setTeams(list);
        setImportTeamIds((prev) => prev ?? list.map((t) => t.id));
      });
  }, []);

  const teamNameById = Object.fromEntries(teams.map((t) => [t.id, t.name]));
  const holidayDays = expandHolidayDays(holidays);

  async function submit(e) {
    e.preventDefault();
    if (editingId) {
      await fetch(`/api/practices/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/practices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    setForm(EMPTY);
    setEditingId(null);
    refresh();
  }

  async function remove(id) {
    if (!confirm("Supprimer cet événement ?")) return;
    await fetch(`/api/practices/${id}`, { method: "DELETE" });
    refresh();
  }

  function edit(item) {
    setEditingId(item.id);
    // team_id comes back as null for club-wide events; the <select> needs "".
    setForm({ ...item, team_id: item.team_id ?? "", title: item.title || "" });
    // The form sits above the lists; from row 40 of "À venir" a click on
    // "modifier" otherwise looks like it did nothing.
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function generateWeeks() {
    setGenerating(true);
    const res = await fetch("/api/practices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "generate_weeks",
        weeks: 12,
        team_id: genTeamId,
      }),
    });
    const data = await res.json();

    const parts = [`${data.created} entraînement(s) ajouté(s) pour les 12 prochaines semaines.`];
    if (data.duringHolidays > 0) {
      parts.push(
        `${data.duringHolidays} tombe(nt) pendant les vacances scolaires — ils sont créés et signalés, supprimez ceux qui n'auront pas lieu.`
      );
    }
    if (data.skippedForGames?.length > 0) {
      parts.push(`${data.skippedForGames.length} date(s) ignorée(s), un match y est déjà prévu : ${data.skippedForGames.join(", ")}.`);
    }
    setMessage(parts.join(" "));
    setGenerating(false);
    refresh();
  }

  async function previewImport() {
    setImporting(true);
    const res = await fetch("/api/practices/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv, team_ids: importTeamIds ?? [], default_kind: defaultKind, dry_run: true }),
    });
    setPreview(await res.json());
    setImporting(false);
  }

  async function commitImport() {
    setImporting(true);
    const res = await fetch("/api/practices/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv, team_ids: importTeamIds ?? [], default_kind: defaultKind, dry_run: false }),
    });
    const data = await res.json();
    setMessage(
      `${data.created} match(s) importé(s)${
        data.skippedDuplicates ? `, ${data.skippedDuplicates} doublon(s) ignoré(s)` : ""
      }.`
    );
    setCsv("");
    setPreview(null);
    setImporting(false);
    refresh();
  }

  async function onCsvFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsv(await file.text());
    setPreview(null);
  }

  async function addHoliday(e) {
    e.preventDefault();
    const res = await fetch("/api/holidays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(holidayForm),
    });
    if (res.ok) {
      setHolidayForm(EMPTY_HOLIDAY);
      refreshHolidays();
    }
  }

  async function removeHoliday(id) {
    if (!confirm("Supprimer cette période de vacances ?")) return;
    await fetch(`/api/holidays/${id}`, { method: "DELETE" });
    refreshHolidays();
  }

  const upcoming = items.filter((i) => i.practice_date >= todayISO());
  const past = items.filter((i) => i.practice_date < todayISO()).reverse();

  // One list per squad, club-wide events first. A coach scanning for their
  // own team should not have to read every other squad's line to find it.
  const groups = [
    { key: "club", name: "Tout le club", items: upcoming.filter((e) => !e.team_id) },
    ...teams.map((t) => ({
      key: t.id,
      name: t.name,
      items: upcoming.filter((e) => e.team_id === t.id),
    })),
  ].filter((g) => g.items.length > 0);

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl font-extrabold uppercase text-ibc-blue">Calendrier</h1>

      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-black/5 bg-white p-4 shadow-sm">
        <select
          value={genTeamId}
          onChange={(e) => setGenTeamId(e.target.value)}
          className="input"
        >
          <option value="">Tout le club</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button
          onClick={generateWeeks}
          disabled={generating}
          className="rounded-full bg-ibc-accent px-4 py-2 text-xs font-bold uppercase text-ibc-ink hover:brightness-95 disabled:opacity-50"
        >
          {generating ? "Génération…" : "Générer les 12 prochaines semaines"}
        </button>
        <p className="w-full text-xs text-ibc-ink/50">
          Utilise le rythme hebdomadaire de l&apos;équipe ci-dessous. Ignore les dates déjà
          occupées. Les séances tombant pendant les vacances scolaires genevoises sont créées mais
          signalées — la salle est une école.
        </p>
        <div className="w-full">
          <WeeklyPatternEditor teamId={genTeamId} teams={teams} gyms={gyms} />
        </div>
      </div>

      {message && (
        <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-800">{message}</p>
      )}

      {/* ---------- bulk game import ---------- */}
      <div className="mt-4">
        <button
          onClick={() => setShowImport((s) => !s)}
          className="text-xs font-bold uppercase tracking-wide text-ibc-blue hover:underline"
        >
          {showImport ? "▾ Masquer" : "▸ Afficher"} l&apos;import de matchs (CSV / texte)
        </button>
      </div>

      {showImport && (
        <div className="mt-3 rounded-xl border border-black/5 bg-white p-5 shadow-sm">
          <p className="text-sm text-ibc-ink/70">
            Collez le calendrier de la ligue, ou déposez un fichier .csv / .txt. Une ligne par
            entrée — match, entraînement, événement de club ou tournoi. Colonnes reconnues :{" "}
            <code className="rounded bg-black/5 px-1">type</code>,{" "}
            <code className="rounded bg-black/5 px-1">equipe</code>,{" "}
            <code className="rounded bg-black/5 px-1">titre</code>,{" "}
            <code className="rounded bg-black/5 px-1">date</code>,{" "}
            <code className="rounded bg-black/5 px-1">heure</code>,{" "}
            <code className="rounded bg-black/5 px-1">adversaire</code>,{" "}
            <code className="rounded bg-black/5 px-1">salle</code>,{" "}
            <code className="rounded bg-black/5 px-1">domicile</code> (D/E),{" "}
            <code className="rounded bg-black/5 px-1">notes</code> — séparées par{" "}
            <code className="rounded bg-black/5 px-1">;</code>, une virgule ou une tabulation.
            Dates au format 04.10.2026 ou 2026-10-04.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="w-full rounded-lg border border-black/10 bg-black/[0.02] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase text-ibc-blue/70">
                  Calendriers visés
                </span>
                <button
                  type="button"
                  onClick={() => setImportTeamIds(teams.map((t) => t.id))}
                  className="text-[11px] font-bold uppercase text-ibc-blue hover:underline"
                >
                  Tout sélectionner
                </button>
                <button
                  type="button"
                  onClick={() => setImportTeamIds([])}
                  className="text-[11px] font-bold uppercase text-ibc-ink/50 hover:underline"
                >
                  Aucun
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-3">
                {teams.map((t) => {
                  const on = (importTeamIds ?? []).includes(t.id);
                  return (
                    <label key={t.id} className="flex items-center gap-1.5 text-xs">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() =>
                          setImportTeamIds((prev) =>
                            (prev ?? []).includes(t.id)
                              ? (prev ?? []).filter((id) => id !== t.id)
                              : [...(prev ?? []), t.id]
                          )
                        }
                      />
                      {t.name}
                    </label>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-ibc-ink/50">
                Une ligne qui nomme une équipe va uniquement dans son calendrier. Une ligne sans
                équipe est créée dans chaque calendrier coché — c&apos;est ainsi qu&apos;un
                événement de club ou un tournoi atterrit sur tous.
              </p>
            </div>
            <select
              value={defaultKind}
              onChange={(e) => setDefaultKind(e.target.value)}
              className="input !w-auto"
              title="Type appliqué aux lignes sans colonne « type »"
            >
              <option value="game">Sans colonne type : matchs</option>
              <option value="practice">Sans colonne type : entraînements</option>
              <option value="event">Sans colonne type : événements</option>
              <option value="tournament">Sans colonne type : tournois</option>
            </select>
            <input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={onCsvFile} className="text-xs" />
            <button
              type="button"
              onClick={() => {
                setCsv(CSV_TEMPLATE);
                setPreview(null);
              }}
              className="rounded-full bg-black/5 px-3 py-1.5 text-xs font-bold uppercase text-ibc-ink/70 hover:bg-black/10"
            >
              Insérer un exemple
            </button>
          </div>

          <textarea
            rows={8}
            value={csv}
            onChange={(e) => {
              setCsv(e.target.value);
              setPreview(null);
            }}
            placeholder={CSV_TEMPLATE}
            className="mt-3 w-full rounded-md border border-black/10 px-3 py-2 font-mono text-xs"
          />

          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={!csv.trim() || importing}
              onClick={previewImport}
              className="rounded-full bg-ibc-blue px-5 py-2 text-xs font-bold uppercase text-white hover:brightness-110 disabled:opacity-50"
            >
              {importing ? "…" : "Vérifier"}
            </button>
            {preview?.toCreate?.length > 0 && (
              <button
                type="button"
                disabled={importing}
                onClick={commitImport}
                className="rounded-full bg-green-600 px-5 py-2 text-xs font-bold uppercase text-white hover:brightness-110 disabled:opacity-50"
              >
                Importer {preview.toCreate.length} entrée(s)
              </button>
            )}
          </div>

          {preview && (
            <div className="mt-4 space-y-3 text-sm">
              {preview.errors?.length > 0 && (
                <div className="rounded-lg bg-red-50 p-3">
                  <p className="text-xs font-bold uppercase text-red-700">
                    {preview.errors.length} ligne(s) à corriger
                  </p>
                  <ul className="mt-1 space-y-0.5 text-xs text-red-700">
                    {preview.errors.map((er, i) => (
                      <li key={i}>
                        ligne {er.line} — {er.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {preview.duplicates?.length > 0 && (
                <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                  {preview.duplicates.length} entrée(s) déjà au calendrier, elles seront ignorées :{" "}
                  {preview.duplicates.map((d) => `${d.practice_date} ${d.team_name} — ${d.opponent || d.title}`).join(", ")}
                </p>
              )}

              {preview.toCreate?.length > 0 ? (
                <div className="overflow-hidden rounded-lg border border-black/5">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-black/5 bg-black/[0.02] text-left uppercase text-ibc-ink/50">
                        <th className="px-3 py-1.5">Type</th>
                        <th className="px-3 py-1.5">Équipe</th>
                        <th className="px-3 py-1.5">Date</th>
                        <th className="px-3 py-1.5">Heure</th>
                        <th className="px-3 py-1.5">Adversaire / titre</th>
                        <th className="px-3 py-1.5">Salle</th>
                        <th className="px-3 py-1.5">D/E</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.toCreate.map((r) => (
                        <tr key={`${r.line}-${r.team_id ?? "club"}`} className="border-b border-black/5 last:border-0">
                          <td className="px-3 py-1.5">
                            <span className="rounded-full bg-ibc-blue/10 px-2 py-0.5 text-[10px] font-bold uppercase text-ibc-blue">
                              {KIND_LABELS[r.kind] || r.kind}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-ibc-ink/60">{r.team_name}</td>
                          <td className="px-3 py-1.5">
                            {r.practice_date}
                            {holidayDays[r.practice_date] && (
                              <span className="ml-1 rounded-full bg-ibc-accent/20 px-1.5 py-0.5 text-[9px] font-bold uppercase">
                                {holidayDays[r.practice_date].name}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-1.5">
                            {r.start_time}–{r.end_time}
                          </td>
                          <td className="px-3 py-1.5 font-semibold">{r.opponent || r.title}</td>
                          <td className="px-3 py-1.5 text-ibc-ink/60">{r.location_name || "—"}</td>
                          <td className="px-3 py-1.5">
                            {r.home_away === "home" ? "Domicile" : r.home_away === "away" ? "Extérieur" : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                !preview.errors?.length && (
                  <p className="text-xs text-ibc-ink/50">Rien de nouveau à importer.</p>
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* ---------- Geneva school holidays ---------- */}
      <div className="mt-4">
        <button
          onClick={() => setShowHolidays((s) => !s)}
          className="text-xs font-bold uppercase tracking-wide text-ibc-blue hover:underline"
        >
          {showHolidays ? "▾ Masquer" : "▸ Afficher"} les vacances scolaires genevoises (
          {holidays.length})
        </button>
      </div>

      {showHolidays && (
        <div className="mt-3 rounded-xl border border-black/5 bg-white p-5 shadow-sm">
          <p className="text-sm text-ibc-ink/70">
            Pré-remplies avec le calendrier officiel du canton pour 2026-2027. Elles apparaissent
            sur le calendrier public et dans l&apos;espace équipe, et le générateur d&apos;entraînements
            les signale. Modifiez-les ici pour les saisons suivantes.
          </p>

          <ul className="mt-3 space-y-1">
            {holidays.map((h) => (
              <li
                key={h.id}
                className="flex items-center justify-between rounded-lg border border-black/5 px-3 py-2 text-sm"
              >
                <span>
                  <span
                    className={`mr-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      h.kind === "ferie"
                        ? "bg-ibc-blue/10 text-ibc-blue"
                        : "bg-ibc-accent/20 text-ibc-ink/70"
                    }`}
                  >
                    {h.kind === "ferie" ? "Férié" : "Vacances"}
                  </span>
                  <strong>{h.name}</strong>{" "}
                  <span className="text-ibc-ink/60">— {formatHolidayRange(h)}</span>
                </span>
                <button
                  onClick={() => removeHoliday(h.id)}
                  className="text-xs font-bold uppercase text-red-500 hover:underline"
                >
                  supprimer
                </button>
              </li>
            ))}
          </ul>

          <form onSubmit={addHoliday} className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <input
              required
              placeholder="Nom (ex. Vacances d'automne)"
              value={holidayForm.name}
              onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
              className="input col-span-2"
            />
            <input
              type="date"
              required
              value={holidayForm.start_date}
              onChange={(e) => setHolidayForm({ ...holidayForm, start_date: e.target.value })}
              className="input"
            />
            <input
              type="date"
              value={holidayForm.end_date}
              onChange={(e) => setHolidayForm({ ...holidayForm, end_date: e.target.value })}
              className="input"
            />
            <select
              value={holidayForm.kind}
              onChange={(e) => setHolidayForm({ ...holidayForm, kind: e.target.value })}
              className="input"
            >
              <option value="vacances">Vacances</option>
              <option value="ferie">Jour férié</option>
            </select>
            <button className="col-span-2 w-fit rounded-full bg-ibc-blue px-5 py-2 text-xs font-bold uppercase text-white hover:brightness-110 sm:col-span-5">
              + Ajouter une période
            </button>
          </form>
        </div>
      )}

      <form ref={formRef} onSubmit={submit} className="mt-6 grid grid-cols-2 gap-3 rounded-xl border border-black/5 bg-white p-5 shadow-sm">
        <select
          value={form.kind}
          onChange={(e) => setForm({ ...form, kind: e.target.value })}
          className="input"
        >
          {EVENT_KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
        <input
          type="date"
          required
          value={form.practice_date}
          onChange={(e) => setForm({ ...form, practice_date: e.target.value })}
          className="input"
        />
        {kindNeedsTitle(form.kind) && (
          <input
            required
            placeholder="Titre de l'événement (ex. Tournoi de Noël)"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="input col-span-2"
          />
        )}
        <select
          value={form.team_id}
          onChange={(e) => setForm({ ...form, team_id: e.target.value })}
          title="Laisser sur « Tout le club » pour un événement commun à toutes les équipes"
          className="input col-span-2"
        >
          <option value="">Tout le club (toutes équipes)</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <input
          type="time"
          required
          value={form.start_time}
          onChange={(e) => setForm({ ...form, start_time: e.target.value })}
          className="input"
        />
        <input
          type="time"
          required
          value={form.end_time}
          onChange={(e) => setForm({ ...form, end_time: e.target.value })}
          className="input"
        />
        {form.kind === "game" && (
          <input
            placeholder="Adversaire"
            value={form.opponent}
            onChange={(e) => setForm({ ...form, opponent: e.target.value })}
            className="input col-span-2"
          />
        )}
        <input
          placeholder="Lieu"
          value={form.location_name}
          onChange={(e) => setForm({ ...form, location_name: e.target.value })}
          className="input col-span-2"
        />
        <input
          placeholder="Adresse"
          value={form.location_address}
          onChange={(e) => setForm({ ...form, location_address: e.target.value })}
          className="input col-span-2"
        />
        <input
          placeholder="Lien vidéo du match (YouTube ou Vimeo — optionnel)"
          value={form.video_url || ""}
          onChange={(e) => setForm({ ...form, video_url: e.target.value })}
          className="input col-span-2"
        />
        <textarea
          placeholder="Notes (optionnel)"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="input col-span-2"
        />
        <div className="col-span-2 flex gap-2">
          <button className="rounded-full bg-ibc-blue px-5 py-2 text-sm font-bold uppercase text-white hover:brightness-110">
            {editingId ? "Mettre à jour" : "Ajouter"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(EMPTY);
              }}
              className="rounded-full bg-black/5 px-5 py-2 text-sm font-bold uppercase text-ibc-ink/70"
            >
              Annuler
            </button>
          )}
        </div>
      </form>

      <h2 className="mt-8 font-display text-xl font-bold uppercase text-ibc-blue">
        À venir <span className="text-ibc-ink/40">({upcoming.length})</span>
      </h2>

      {groups.length === 0 && (
        <p className="mt-3 text-sm text-ibc-ink/50">
          Aucun événement à venir. Réglez le rythme hebdomadaire ci-dessus puis générez les 12
          prochaines semaines, ou ajoutez une ligne à la main.
        </p>
      )}

      {groups.map((g) => (
        <section key={g.key} className="mt-5">
          <h3 className="text-xs font-bold uppercase tracking-wide text-ibc-ink/50">
            {g.name} <span className="text-ibc-ink/30">· {g.items.length}</span>
          </h3>
          <EventList
            items={g.items}
            onEdit={edit}
            onDelete={remove}
            teamNameById={teamNameById}
            holidayDays={holidayDays}
          />
        </section>
      ))}

      {past.length > 0 && (
        <div className="mt-10 border-t border-black/5 pt-5">
          <button
            onClick={() => setShowPast((v) => !v)}
            className="text-xs font-bold uppercase tracking-wide text-ibc-ink/50 hover:underline"
          >
            {showPast ? "▾ Masquer" : "▸ Afficher"} les dates passées ({past.length})
          </button>
          {showPast && (
            <EventList
              items={past}
              onEdit={edit}
              onDelete={remove}
              teamNameById={teamNameById}
              holidayDays={holidayDays}
              muted
            />
          )}
        </div>
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

function EventList({ items, onEdit, onDelete, teamNameById = {}, holidayDays = {}, muted }) {
  return (
    <ul className={`mt-3 space-y-2 ${muted ? "opacity-60" : ""}`}>
      {items.map((e) => (
        <li key={e.id} className="flex items-center justify-between rounded-lg border border-black/5 bg-white px-4 py-2.5 text-sm shadow-sm">
          <span>
            <strong>{e.practice_date}</strong> {e.start_time}–{e.end_time} · {eventLabel(e)}
            <span className="ml-2 rounded-full bg-black/5 px-2 py-0.5 text-xs font-semibold text-ibc-ink/60">
              {e.team_id ? teamNameById[e.team_id] || "Équipe" : "Tout le club"}
            </span>
            {holidayDays[e.practice_date] && (
              <span className="ml-2 rounded-full bg-ibc-accent/20 px-2 py-0.5 text-xs font-bold uppercase text-ibc-ink/70">
                {holidayDays[e.practice_date].name}
              </span>
            )}
          </span>
          <span className="flex gap-3 text-xs font-bold uppercase">
            <button onClick={() => onEdit(e)} className="text-ibc-blue hover:underline">
              modifier
            </button>
            <button onClick={() => onDelete(e.id)} className="text-red-500 hover:underline">
              supprimer
            </button>
          </span>
        </li>
      ))}
      {items.length === 0 && <p className="text-sm text-ibc-ink/50">Aucun événement.</p>}
    </ul>
  );
}
