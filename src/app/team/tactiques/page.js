"use client";

import { useCallback, useEffect, useState } from "react";
import CourtDiagramEditor, { defaultDiagram } from "@/components/CourtDiagramEditor";

// The playbook, one per squad.
//
// Who can do what:
//   player  — reads their own squad's PUBLISHED plays. No editor, no save,
//             no delete. The API enforces all three (plays POST is
//             staff-only; PUT/DELETE check the play's team).
//   coach   — full editor for their own squad, and nothing else exists as
//             far as they're concerned.
//   admin   — same, but picks the squad first: a single list mixing four
//             squads is how a U18 set ends up on the women's board.
export default function TacticsPage() {
  const [plays, setPlays] = useState([]);
  const [teams, setTeams] = useState([]);
  const [teamId, setTeamId] = useState("");
  const [initialDiagram, setInitialDiagram] = useState(defaultDiagram());
  const [editorKey, setEditorKey] = useState(0);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState(null);

  const role = status?.role ?? null;
  const isStaff = role === "admin" || role === "coach";
  const isAdmin = role === "admin";
  const teamName = teams.find((t) => String(t.id) === String(teamId))?.name;

  const refresh = useCallback(() => {
    const q = isAdmin && teamId ? `?team_id=${teamId}` : "";
    fetch(`/api/plays${q}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setPlays(Array.isArray(d) ? d : []));
  }, [isAdmin, teamId]);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((d) => {
        setStatus(d);
        if (d.role === "admin") {
          fetch("/api/admin/teams")
            .then((r) => (r.ok ? r.json() : []))
            .then((t) => {
              const list = Array.isArray(t) ? t : [];
              setTeams(list);
              // Land on a real squad rather than the empty "unassigned"
              // bucket, which looks like "the playbook is gone".
              if (list.length && !teamId) setTeamId(String(list[0].id));
            });
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status) refresh();
  }, [status, refresh]);

  async function handleSave(payload) {
    const res = await fetch("/api/plays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, team_id: isAdmin && teamId ? Number(teamId) : undefined }),
    });
    if (!res.ok) {
      setMessage("Enregistrement refusé.");
    } else {
      setMessage(
        `Schéma « ${payload.name} » enregistré${
          teamName ? ` pour ${teamName}` : ""
        } — publiez-le pour le rendre visible à l'équipe.`
      );
    }
    setTimeout(() => setMessage(""), 4000);
    refresh();
  }

  async function handleDelete(id) {
    if (!confirm("Supprimer ce schéma ?")) return;
    const res = await fetch(`/api/plays/${id}`, { method: "DELETE" });
    if (!res.ok) setMessage("Suppression refusée.");
    setInitialDiagram(defaultDiagram());
    setEditorKey((k) => k + 1);
    refresh();
  }

  async function handleTogglePublish(play) {
    await fetch(`/api/plays/${play.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !play.published }),
    });
    refresh();
  }

  if (!status) return <p className="text-ibc-ink/60">Chargement…</p>;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold uppercase text-ibc-blue">
          {isStaff ? "Éditeur de tactiques" : "Tactiques de l'équipe"}
        </h1>
        {isStaff && (
          <button
            onClick={() => {
              setInitialDiagram(defaultDiagram());
              setEditorKey((k) => k + 1);
            }}
            className="rounded-full bg-black/5 px-4 py-2 text-xs font-bold uppercase text-ibc-ink/70 hover:bg-black/10"
          >
            + Nouveau schéma vierge
          </button>
        )}
      </div>

      {isAdmin && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label className="text-xs font-bold uppercase text-ibc-blue/70">Équipe</label>
          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="input max-w-xs"
          >
            <option value="">— Club / non attribué —</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <span className="text-xs text-ibc-ink/50">
            Chaque équipe a son propre playbook — seuls ses membres y ont accès.
          </span>
        </div>
      )}

      <p className="mt-3 text-sm text-ibc-ink/60">
        {isStaff
          ? "Faites glisser les 5 joueurs et le ballon, puis tracez courses, passes, dribbles et écrans. Enregistrez, puis publiez le schéma pour le rendre visible à l'équipe."
          : "Les schémas publiés par votre entraîneur. Lancez l'animation pour voir le mouvement — seul l'entraîneur peut les modifier ou les supprimer."}
      </p>
      {message && <p className="mt-2 text-sm font-semibold text-green-700">{message}</p>}

      {!isStaff && plays.length === 0 && (
        <p className="mt-6 rounded-xl border border-black/5 bg-white p-5 text-sm text-ibc-ink/60 shadow-sm">
          Aucun schéma publié pour votre équipe pour l&apos;instant.
        </p>
      )}

      <div className="mt-6">
        <CourtDiagramEditor
          key={editorKey}
          initialDiagram={initialDiagram}
          readOnly={!isStaff}
          onSave={isStaff ? handleSave : undefined}
          savedPlays={plays}
          onLoadPlay={() => {}}
          onDeletePlay={isStaff ? handleDelete : undefined}
          isStaff={isStaff}
          onTogglePublish={isStaff ? handleTogglePublish : undefined}
        />
      </div>

      {/* Members-only credit — not shown on the public site, only inside
          the logged-in team space (this whole /team route is login-gated
          in src/app/team/layout.js). */}
      <p className="mt-8 border-t border-black/5 pt-4 text-xs text-ibc-ink/40">
        This editor&apos;s court-diagram animation approach was inspired by{" "}
        <a
          href="https://github.com/antonin-lfv/BasketBallCoach/blob/main/README.md"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-ibc-blue/70 hover:text-ibc-blue hover:underline"
        >
          antonin-lfv/BasketBallCoach
        </a>{" "}
        on GitHub.
      </p>
    </div>
  );
}
