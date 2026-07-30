"use client";

import { useCallback, useRef, useState } from "react";
import HalfCourt, { COURT_W, COURT_H } from "@/components/HalfCourt";

const DEFAULT_PLAYERS = [
  { id: "p1", number: "1", x: 250, y: 405 },
  { id: "p2", number: "2", x: 405, y: 300 },
  { id: "p3", number: "3", x: 95, y: 300 },
  { id: "p4", number: "4", x: 150, y: 120 },
  { id: "p5", number: "5", x: 350, y: 100 },
];

const DEFAULT_BALL = { x: 250, y: 420 };

export function defaultDiagram() {
  return {
    players: DEFAULT_PLAYERS.map((p) => ({ ...p })),
    ball: { ...DEFAULT_BALL },
    annotations: [],
  };
}

const TOOLS = [
  { id: "move", label: "Déplacer", hint: "Faites glisser les joueurs et le ballon." },
  { id: "cut", label: "Course (cut)", hint: "Trait plein avec flèche — déplacement d'un joueur." },
  { id: "pass", label: "Passe", hint: "Trait pointillé avec flèche — passe de balle." },
  { id: "dribble", label: "Dribble", hint: "Trait ondulé avec flèche — dribble." },
  { id: "screen", label: "Écran", hint: "Trait terminé par une barre — écran (pick)." },
  { id: "erase", label: "Effacer", hint: "Cliquez sur un tracé pour le supprimer." },
];

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function pointFromEvent(svgEl, evt) {
  const rect = svgEl.getBoundingClientRect();
  const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
  const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
  const x = ((clientX - rect.left) / rect.width) * COURT_W;
  const y = ((clientY - rect.top) / rect.height) * COURT_H;
  return { x: clamp(x, 0, COURT_W), y: clamp(y, 0, COURT_H) };
}

function wavyPath(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len; // normal vector
  const ny = dx / len;
  const segments = Math.max(4, Math.round(len / 18));
  let d = `M ${x1},${y1} `;
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const px = x1 + dx * t;
    const py = y1 + dy * t;
    const wave = Math.sin(t * Math.PI * segments * 0.9) * 6 * (i === segments ? 0.3 : 1);
    d += `L ${px + nx * wave},${py + ny * wave} `;
  }
  return d;
}

function Annotation({ a, onErase, eraseMode }) {
  const markerId = `arrow-${a.id}`;
  const commonProps = {
    onClick: eraseMode ? () => onErase(a.id) : undefined,
    style: eraseMode ? { cursor: "pointer" } : undefined,
  };

  return (
    <g {...commonProps}>
      {/* wide invisible hit-target for easy erasing */}
      {eraseMode && (
        <line
          x1={a.x1}
          y1={a.y1}
          x2={a.x2}
          y2={a.y2}
          stroke="transparent"
          strokeWidth="16"
        />
      )}
      <defs>
        <marker
          id={markerId}
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="4"
          orient="auto"
        >
          <path d="M0,0 L8,4 L0,8 Z" fill="#fff100" />
        </marker>
      </defs>
      {a.type === "screen" ? (
        <ScreenGlyph a={a} />
      ) : a.type === "dribble" ? (
        <path
          d={wavyPath(a.x1, a.y1, a.x2, a.y2)}
          fill="none"
          stroke="#fff100"
          strokeWidth="3"
          markerEnd={`url(#${markerId})`}
        />
      ) : (
        <line
          x1={a.x1}
          y1={a.y1}
          x2={a.x2}
          y2={a.y2}
          stroke="#fff100"
          strokeWidth="3"
          strokeDasharray={a.type === "pass" ? "9 7" : undefined}
          markerEnd={`url(#${markerId})`}
        />
      )}
    </g>
  );
}

function ScreenGlyph({ a }) {
  const dx = a.x2 - a.x1;
  const dy = a.y2 - a.y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const barLen = 12;
  return (
    <g>
      <line x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} stroke="#fff100" strokeWidth="3" />
      <line
        x1={a.x2 - nx * barLen}
        y1={a.y2 - ny * barLen}
        x2={a.x2 + nx * barLen}
        y2={a.y2 + ny * barLen}
        stroke="#fff100"
        strokeWidth="4"
      />
    </g>
  );
}

export default function CourtDiagramEditor({
  initialDiagram,
  readOnly = false,
  onSave,
  savedPlays = [],
  onLoadPlay,
  onDeletePlay,
}) {
  const [diagram, setDiagram] = useState(() => initialDiagram || defaultDiagram());
  const [tool, setTool] = useState("move");
  const [dragging, setDragging] = useState(null); // { kind: 'player'|'ball', id }
  const [drawStart, setDrawStart] = useState(null);
  const [drawPreview, setDrawPreview] = useState(null);
  const [name, setName] = useState("Nouveau schéma");
  const [category, setCategory] = useState("offense");
  const svgRef = useRef(null);

  const currentToolInfo = TOOLS.find((t) => t.id === tool);

  const handlePointerDownOnPlayer = (id) => (evt) => {
    if (readOnly || tool !== "move") return;
    evt.stopPropagation();
    setDragging({ kind: "player", id });
  };

  const handlePointerDownOnBall = (evt) => {
    if (readOnly || tool !== "move") return;
    evt.stopPropagation();
    setDragging({ kind: "ball" });
  };

  const handleCourtPointerDown = (evt) => {
    if (readOnly || tool === "move" || tool === "erase") return;
    const pt = pointFromEvent(svgRef.current, evt);
    setDrawStart(pt);
    setDrawPreview(pt);
  };

  const handlePointerMove = (evt) => {
    if (!svgRef.current) return;
    const pt = pointFromEvent(svgRef.current, evt);

    if (dragging) {
      setDiagram((d) => {
        if (dragging.kind === "ball") return { ...d, ball: pt };
        return {
          ...d,
          players: d.players.map((p) => (p.id === dragging.id ? { ...p, x: pt.x, y: pt.y } : p)),
        };
      });
    } else if (drawStart) {
      setDrawPreview(pt);
    }
  };

  const finishInteraction = () => {
    if (dragging) setDragging(null);
    if (drawStart && drawPreview) {
      const dist = Math.hypot(drawPreview.x - drawStart.x, drawPreview.y - drawStart.y);
      if (dist > 10) {
        setDiagram((d) => ({
          ...d,
          annotations: [
            ...d.annotations,
            {
              id: `a${Date.now()}-${Math.round(Math.random() * 1000)}`,
              type: tool,
              x1: drawStart.x,
              y1: drawStart.y,
              x2: drawPreview.x,
              y2: drawPreview.y,
            },
          ],
        }));
      }
    }
    setDrawStart(null);
    setDrawPreview(null);
  };

  const eraseAnnotation = (id) => {
    setDiagram((d) => ({ ...d, annotations: d.annotations.filter((a) => a.id !== id) }));
  };

  const resetDiagram = () => setDiagram(defaultDiagram());
  const clearAnnotations = () => setDiagram((d) => ({ ...d, annotations: [] }));

  const exportPng = useCallback(async () => {
    const svg = svgRef.current;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = COURT_W * 2;
      canvas.height = COURT_H * 2;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const a = document.createElement("a");
      a.download = `${name || "schema"}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = url;
  }, [name]);

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="flex-1">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${COURT_W} ${COURT_H}`}
          className="w-full touch-none select-none rounded-xl border-4 border-mbc-yellow shadow-lg"
          onPointerDown={handleCourtPointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishInteraction}
          onPointerLeave={finishInteraction}
        >
          <HalfCourt />

          {diagram.annotations.map((a) => (
            <Annotation key={a.id} a={a} onErase={eraseAnnotation} eraseMode={tool === "erase"} />
          ))}

          {drawStart && drawPreview && (
            <line
              x1={drawStart.x}
              y1={drawStart.y}
              x2={drawPreview.x}
              y2={drawPreview.y}
              stroke="#ffffff"
              strokeWidth="2"
              strokeDasharray="4 4"
              opacity="0.7"
            />
          )}

          {/* Ball */}
          <circle
            cx={diagram.ball.x}
            cy={diagram.ball.y}
            r="9"
            fill="#e8720c"
            stroke="#10202f"
            strokeWidth="1.5"
            onPointerDown={handlePointerDownOnBall}
            style={{ cursor: readOnly ? "default" : tool === "move" ? "grab" : "default" }}
          />

          {/* Players */}
          {diagram.players.map((p) => (
            <g
              key={p.id}
              onPointerDown={handlePointerDownOnPlayer(p.id)}
              style={{ cursor: readOnly ? "default" : tool === "move" ? "grab" : "default" }}
            >
              <circle cx={p.x} cy={p.y} r="16" fill="#ffffff" stroke="#2371b5" strokeWidth="3" />
              <text
                x={p.x}
                y={p.y + 5}
                textAnchor="middle"
                fontFamily="Arial, Helvetica, sans-serif"
                fontSize="15"
                fontWeight="700"
                fill="#2371b5"
              >
                {p.number}
              </text>
            </g>
          ))}
        </svg>

        {!readOnly && (
          <div className="mt-3 flex flex-wrap gap-2">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTool(t.id)}
                title={t.hint}
                className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide transition ${
                  tool === t.id
                    ? "bg-mbc-blue text-white"
                    : "bg-mbc-blue/10 text-mbc-blue hover:bg-mbc-blue/20"
                }`}
              >
                {t.label}
              </button>
            ))}
            <button
              type="button"
              onClick={clearAnnotations}
              className="rounded-full bg-black/5 px-4 py-2 text-xs font-bold uppercase tracking-wide text-mbc-ink/70 hover:bg-black/10"
            >
              Effacer les tracés
            </button>
            <button
              type="button"
              onClick={resetDiagram}
              className="rounded-full bg-black/5 px-4 py-2 text-xs font-bold uppercase tracking-wide text-mbc-ink/70 hover:bg-black/10"
            >
              Réinitialiser
            </button>
            <button
              type="button"
              onClick={exportPng}
              className="rounded-full bg-mbc-yellow px-4 py-2 text-xs font-bold uppercase tracking-wide text-mbc-ink hover:brightness-95"
            >
              Exporter en image
            </button>
          </div>
        )}
        {!readOnly && currentToolInfo && (
          <p className="mt-2 text-xs text-mbc-ink/60">{currentToolInfo.hint}</p>
        )}
      </div>

      {!readOnly && (
        <div className="w-full shrink-0 lg:w-72">
          <div className="rounded-xl border border-black/5 bg-white p-4 shadow-sm">
            <label className="block text-xs font-bold uppercase text-mbc-blue">
              Nom du schéma
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm"
            />
            <label className="mt-3 block text-xs font-bold uppercase text-mbc-blue">
              Catégorie
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm"
            >
              <option value="offense">Attaque</option>
              <option value="defense">Défense</option>
              <option value="transition">Transition</option>
              <option value="inbound">Remise en jeu</option>
              <option value="special">Situation spéciale</option>
            </select>
            <button
              type="button"
              onClick={() => onSave?.({ name, category, diagram_json: JSON.stringify(diagram) })}
              className="mt-4 w-full rounded-full bg-mbc-blue py-2.5 text-sm font-bold uppercase tracking-wide text-white hover:brightness-110"
            >
              Enregistrer le schéma
            </button>
          </div>

          {savedPlays.length > 0 && (
            <div className="mt-4 rounded-xl border border-black/5 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase text-mbc-blue">Schémas enregistrés</p>
              <ul className="mt-2 space-y-1">
                {savedPlays.map((play) => (
                  <li
                    key={play.id}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-mbc-blue/5"
                  >
                    <button
                      type="button"
                      className="flex-1 text-left"
                      onClick={() => {
                        setName(play.name);
                        setCategory(play.category);
                        setDiagram(JSON.parse(play.diagram_json));
                        onLoadPlay?.(play);
                      }}
                    >
                      {play.name}
                      <span className="ml-1 text-xs text-mbc-ink/50">({play.category})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeletePlay?.(play.id)}
                      className="ml-2 text-xs text-red-500 hover:underline"
                    >
                      supprimer
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
