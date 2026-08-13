"use client";

import { useEffect, useState } from "react";
import CourtDiagramEditor, { defaultDiagram } from "@/components/CourtDiagramEditor";

export default function TacticsAdminPage() {
  const [plays, setPlays] = useState([]);
  const [initialDiagram, setInitialDiagram] = useState(defaultDiagram());
  const [editorKey, setEditorKey] = useState(0);
  const [message, setMessage] = useState("");

  function refresh() {
    fetch("/api/plays").then((r) => r.json()).then(setPlays);
  }

  useEffect(refresh, []);

  async function handleSave(payload) {
    await fetch("/api/plays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setMessage(`Schéma « ${payload.name} » enregistré.`);
    setTimeout(() => setMessage(""), 2500);
    refresh();
  }

  async function handleDelete(id) {
    if (!confirm("Supprimer ce schéma ?")) return;
    await fetch(`/api/plays/${id}`, { method: "DELETE" });
    setInitialDiagram(defaultDiagram());
    setEditorKey((k) => k + 1);
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
        passes, dribbles et écrans. Enregistrez pour publier le schéma sur la page « Tactiques ».
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
        />
      </div>
    </div>
  );
}
