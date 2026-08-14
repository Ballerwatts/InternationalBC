"use client";

import { useEffect, useState } from "react";
import CourtDiagramEditor, { defaultDiagram } from "@/components/CourtDiagramEditor";

export default function TacticsAdminPage() {
  const [plays, setPlays] = useState([]);
  const [initialDiagram, setInitialDiagram] = useState(defaultDiagram());
  const [editorKey, setEditorKey] = useState(0);
  const [message, setMessage] = useState("");
  const [role, setRole] = useState(null);

  const isStaff = role === "admin" || role === "coach";

  function refresh() {
    fetch("/api/plays").then((r) => r.json()).then(setPlays);
  }

  useEffect(() => {
    refresh();
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((d) => setRole(d.role));
  }, []);

  async function handleSave(payload) {
    await fetch("/api/plays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setMessage(
      `Schéma « ${payload.name} » enregistré${isStaff ? "" : " — en attente de publication par le coach"}.`
    );
    setTimeout(() => setMessage(""), 3000);
    refresh();
  }

  async function handleDelete(id) {
    if (!confirm("Supprimer ce schéma ?")) return;
    await fetch(`/api/plays/${id}`, { method: "DELETE" });
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

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold uppercase text-ibc-blue">
          Éditeur de tactiques
        </h1>
        <button
          onClick={() => {
            setInitialDiagram(defaultDiagram());
            setEditorKey((k) => k + 1);
          }}
          className="rounded-full bg-black/5 px-4 py-2 text-xs font-bold uppercase text-ibc-ink/70 hover:bg-black/10"
        >
          + Nouveau schéma vierge
        </button>
      </div>
      <p className="mt-1 text-sm text-ibc-ink/60">
        Faites glisser les 5 joueurs et le ballon, puis utilisez les outils pour tracer courses,
        passes, dribbles et écrans.{" "}
        {isStaff
          ? "Enregistrez puis publiez le schéma pour le rendre visible à toute l'équipe."
          : "Enregistrez votre schéma — le coach devra le publier pour qu'il soit visible par le reste de l'équipe."}
      </p>
      {message && <p className="mt-2 text-sm font-semibold text-green-700">{message}</p>}

      <div className="mt-6">
        <CourtDiagramEditor
          key={editorKey}
          initialDiagram={initialDiagram}
          onSave={handleSave}
          savedPlays={plays}
          onLoadPlay={() => {}}
          onDeletePlay={handleDelete}
          isStaff={isStaff}
          onTogglePublish={handleTogglePublish}
        />
      </div>

      {/* Members-only credit — not shown on the public site, only inside
          the logged-in team space (this whole /team route is login-gated
          in src/app/team/layout.js). */}
      <p className="mt-8 border-t border-black/5 pt-4 text-xs text-ibc-ink/40">
        This editor's court-diagram animation approach was inspired by{" "}
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
