"use client";

import { useState } from "react";
import CourtDiagramEditor from "@/components/CourtDiagramEditor";

const CATEGORY_LABELS = {
  offense: "Attaque",
  defense: "Défense",
  transition: "Transition",
  inbound: "Remise en jeu",
  special: "Situation spéciale",
};

export default function PlaysGallery({ plays }) {
  const [selectedId, setSelectedId] = useState(plays[0]?.id ?? null);
  const selected = plays.find((p) => p.id === selectedId);

  if (plays.length === 0) {
    return (
      <p className="text-center text-ibc-ink/60">
        Aucun schéma tactique publié pour le moment.
      </p>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-[220px_1fr]">
      <ul className="space-y-1">
        {plays.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => setSelectedId(p.id)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${
                p.id === selectedId
                  ? "bg-ibc-blue text-white"
                  : "bg-ibc-blue/5 text-ibc-ink hover:bg-ibc-blue/10"
              }`}
            >
              {p.name}
              <span className="ml-1 block text-xs font-normal opacity-70">
                {CATEGORY_LABELS[p.category] || p.category}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div>
        {selected && (
          <CourtDiagramEditor initialDiagram={JSON.parse(selected.diagram_json)} readOnly />
        )}
      </div>
    </div>
  );
}
