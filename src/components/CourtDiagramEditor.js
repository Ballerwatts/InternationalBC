"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import HalfCourt, { COURT_W, COURT_H as HALF_COURT_H } from "@/components/HalfCourt";
import FullCourt, { COURT_H as FULL_COURT_H } from "@/components/FullCourt";

// ---------------------------------------------------------------------------
// Data model
// ---------------------------------------------------------------------------
// A diagram has a fixed roster of entities (5 offensive players + up to 5
// defenders) and a list of *phases*. Each phase only stores each entity's
// position for that moment — the entities themselves (id/number) live at the
// diagram level so the same player/defender can be tracked and animated
// smoothly from phase to phase, just like antonin-lfv/BasketBallCoach.
//
// diagram = {
//   courtType: 'half' | 'full',
//   players: [{ id, number }],
//   defenders: [{ id }],
//   phases: [{ id, label, playerPos: {id:{x,y}}, defenderPos: {id:{x,y}}, ball: {x,y}, annotations: [...] }]
// }

const DEFAULT_PLAYERS = [
  { id: "p1", number: "1" },
  { id: "p2", number: "2" },
  { id: "p3", number: "3" },
  { id: "p4", number: "4" },
  { id: "p5", number: "5" },
];

const DEFAULT_START_POS = {
  p1: { x: 250, y: 405 },
  p2: { x: 405, y: 300 },
  p3: { x: 95, y: 300 },
  p4: { x: 150, y: 120 },
  p5: { x: 350, y: 100 },
};

const DEFAULT_BALL = { x: 250, y: 420 };
const SCREEN_SNAP_RADIUS = 40;

const TOOLS = [
  { id: "move", label: "Déplacer", hint: "Faites glisser les joueurs, défenseurs et le ballon." },
  { id: "cut", label: "Course (cut)", hint: "Trait plein avec flèche — déplacement d'un joueur." },
  { id: "pass", label: "Passe", hint: "Trait pointillé avec flèche — passe de balle." },
  { id: "dribble", label: "Dribble", hint: "Trait ondulé avec flèche — dribble." },
  { id: "screen", label: "Écran", hint: "Trait terminé par une barre — écran (pick). Astuce : lâchez un joueur près d'un défenseur pour un écran automatique." },
  { id: "erase", label: "Effacer", hint: "Cliquez sur un tracé pour le supprimer." },
];

function clone(o) {
  return JSON.parse(JSON.stringify(o || {}));
}

function makePhase(id, label, source) {
  return {
    id,
    label,
    playerPos: source ? clone(source.playerPos) : clone(DEFAULT_START_POS),
    defenderPos: source ? clone(source.defenderPos) : {},
    ball: source ? { ...source.ball } : { ...DEFAULT_BALL },
    annotations: source ? source.annotations.map((a) => ({ ...a })) : [],
  };
}

export function defaultDiagram() {
  return {
    courtType: "half",
    players: DEFAULT_PLAYERS.map((p) => ({ ...p })),
    defenders: [],
    phases: [makePhase("phase-1", "Phase 1")],
  };
}

// Accepts either the current shape, or the older single-phase flat shape
// ({ players: [{id,number,x,y}], ball, annotations }) used before phases/
// animation/defenders were added, and normalizes both to the current shape.
function migrateDiagram(input) {
  if (!input) return defaultDiagram();

  if (Array.isArray(input.players) && input.players[0] && "x" in input.players[0]) {
    const players = input.players.map((p) => ({ id: p.id, number: p.number }));
    const playerPos = {};
    input.players.forEach((p) => {
      playerPos[p.id] = { x: p.x, y: p.y };
    });
    return {
      courtType: input.courtType || "half",
      players,
      defenders: [],
      phases: [
        {
          id: "phase-1",
          label: "Phase 1",
          playerPos,
          defenderPos: {},
          ball: input.ball || { ...DEFAULT_BALL },
          annotations: input.annotations || [],
        },
      ],
    };
  }

  return {
    courtType: input.courtType || "half",
    players: input.players && input.players.length ? input.players : DEFAULT_PLAYERS.map((p) => ({ ...p })),
    defenders: input.defenders || [],
    phases: input.phases && input.phases.length ? input.phases : [makePhase("phase-1", "Phase 1")],
  };
}

function clampPt(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function pointFromEvent(svgEl, evt, courtH) {
  const rect = svgEl.getBoundingClientRect();
  const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
  const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
  const x = ((clientX - rect.left) / rect.width) * COURT_W;
  const y = ((clientY - rect.top) / rect.height) * courtH;
  return { x: clampPt(x, 0, COURT_W), y: clampPt(y, 0, courtH) };
}

function wavyPath(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
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

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// The ball's flight between two phases is drawn along a shallow arc rather
// than a straight line — reads much more like a real pass/lob in playback.
function arcLerp(p0, p1, t) {
  const mx = (p0.x + p1.x) / 2;
  const my = (p0.y + p1.y) / 2;
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const len = Math.hypot(dx, dy) || 1;
  const arc = Math.min(40, len * 0.25);
  const ctrl = { x: mx - (dy / len) * arc, y: my + (dx / len) * arc };
  const x = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * ctrl.x + t * t * p1.x;
  const y = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * ctrl.y + t * t * p1.y;
  return { x, y };
}

function interpolateFrame(phases, t) {
  const maxIdx = phases.length - 1;
  const ct = Math.max(0, Math.min(maxIdx, t));
  const i0 = Math.floor(ct);
  const i1 = Math.min(i0 + 1, maxIdx);
  const frac = ct - i0;
  const a = phases[i0];
  const b = phases[i1];

  const playerPos = {};
  Object.keys(a.playerPos).forEach((id) => {
    const pa = a.playerPos[id];
    const pb = (b.playerPos && b.playerPos[id]) || pa;
    playerPos[id] = { x: lerp(pa.x, pb.x, frac), y: lerp(pa.y, pb.y, frac) };
  });

  const defenderPos = {};
  Object.keys(a.defenderPos).forEach((id) => {
    const pa = a.defenderPos[id];
    const pb = (b.defenderPos && b.defenderPos[id]) || pa;
    defenderPos[id] = { x: lerp(pa.x, pb.x, frac), y: lerp(pa.y, pb.y, frac) };
  });

  const ball = arcLerp(a.ball, b.ball, frac);

  return { playerPos, defenderPos, ball, annotations: a.annotations };
}

function phaseFrame(phase) {
  return {
    playerPos: phase.playerPos,
    defenderPos: phase.defenderPos,
    ball: phase.ball,
    annotations: phase.annotations,
  };
}

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---------------------------------------------------------------------------
// Presentational pieces (shared between the live editable canvas, PNG export
// and the printable PDF gridsheet, so all three always look identical)
// ---------------------------------------------------------------------------

function Annotation({ a, onErase, eraseMode }) {
  const markerId = `arrow-${a.id}`;
  return (
    <g onClick={eraseMode ? () => onErase(a.id) : undefined} style={eraseMode ? { cursor: "pointer" } : undefined}>
      {eraseMode && <line x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} stroke="transparent" strokeWidth="16" />}
      <defs>
        <marker id={markerId} markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="#ffffff" />
        </marker>
      </defs>
      {a.type === "screen" ? (
        <ScreenGlyph a={a} />
      ) : a.type === "dribble" ? (
        <path d={wavyPath(a.x1, a.y1, a.x2, a.y2)} fill="none" stroke="#ffffff" strokeWidth="3" markerEnd={`url(#${markerId})`} />
      ) : (
        <line
          x1={a.x1}
          y1={a.y1}
          x2={a.x2}
          y2={a.y2}
          stroke="#ffffff"
          strokeWidth="3"
          strokeDasharray={a.type === "pass" ? "9 7" : undefined}
          markerEnd={`url(#${markerId})`}
        />
      )}
    </g>
  );
}

// The bar at the end is always perpendicular to the screener→defender line,
// so the orientation is derived automatically from where the screen is set —
// no manual angle-fiddling needed, whether the screen was drawn by hand or
// created automatically by dropping a player next to a defender.
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
      <line x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} stroke="#ffffff" strokeWidth="3" />
      <line x1={a.x2 - nx * barLen} y1={a.y2 - ny * barLen} x2={a.x2 + nx * barLen} y2={a.y2 + ny * barLen} stroke="#ffffff" strokeWidth="4" />
    </g>
  );
}

function CourtCanvas({
  svgRef,
  courtType,
  courtH,
  players,
  defenders,
  frame,
  interactive,
  tool,
  drawStart,
  drawPreview,
  onCourtDown,
  onMove,
  onUp,
  onPlayerDown,
  onDefenderDown,
  onBallDown,
  onEraseAnnotation,
}) {
  const eraseMode = interactive && tool === "erase";
  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${COURT_W} ${courtH}`}
      className="w-full touch-none select-none rounded-xl border-4 border-ibc-accent shadow-lg"
      onPointerDown={interactive ? onCourtDown : undefined}
      onPointerMove={interactive ? onMove : undefined}
      onPointerUp={interactive ? onUp : undefined}
      onPointerLeave={interactive ? onUp : undefined}
    >
      {courtType === "full" ? <FullCourt /> : <HalfCourt />}

      {(frame.annotations || []).map((a) => (
        <Annotation key={a.id} a={a} onErase={onEraseAnnotation} eraseMode={eraseMode} />
      ))}

      {drawStart && drawPreview && (
        <line x1={drawStart.x} y1={drawStart.y} x2={drawPreview.x} y2={drawPreview.y} stroke="#ffffff" strokeWidth="2" strokeDasharray="4 4" opacity="0.7" />
      )}

      {defenders.map((def) => {
        const pos = frame.defenderPos[def.id] || { x: 40, y: 40 };
        return (
          <g
            key={def.id}
            onPointerDown={interactive && onDefenderDown ? onDefenderDown(def.id) : undefined}
            style={{ cursor: interactive && tool === "move" ? "grab" : "default" }}
          >
            <line x1={pos.x - 11} y1={pos.y - 11} x2={pos.x + 11} y2={pos.y + 11} stroke="#e11d48" strokeWidth="4" strokeLinecap="round" />
            <line x1={pos.x - 11} y1={pos.y + 11} x2={pos.x + 11} y2={pos.y - 11} stroke="#e11d48" strokeWidth="4" strokeLinecap="round" />
          </g>
        );
      })}

      <circle
        cx={frame.ball.x}
        cy={frame.ball.y}
        r="9"
        fill="#e8720c"
        stroke="#14173f"
        strokeWidth="1.5"
        onPointerDown={interactive ? onBallDown : undefined}
        style={{ cursor: interactive && tool === "move" ? "grab" : "default" }}
      />

      {players.map((p) => {
        const pos = frame.playerPos[p.id] || { x: 40, y: 40 };
        return (
          <g
            key={p.id}
            onPointerDown={interactive && onPlayerDown ? onPlayerDown(p.id) : undefined}
            style={{ cursor: interactive && tool === "move" ? "grab" : "default" }}
          >
            <circle cx={pos.x} cy={pos.y} r="16" fill="#ffffff" stroke="#2d3194" strokeWidth="3" />
            <text x={pos.x} y={pos.y + 5} textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="15" fontWeight="700" fill="#2d3194">
              {p.number}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main editor
// ---------------------------------------------------------------------------

export default function CourtDiagramEditor({
  initialDiagram,
  readOnly = false,
  onSave,
  savedPlays = [],
  onLoadPlay,
  onDeletePlay,
  isStaff = false,
  onTogglePublish,
}) {
  const [diagram, setDiagram] = useState(() => migrateDiagram(initialDiagram));
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [tool, setTool] = useState("move");
  const [dragging, setDragging] = useState(null);
  const [drawStart, setDrawStart] = useState(null);
  const [drawPreview, setDrawPreview] = useState(null);
  const [name, setName] = useState("Nouveau schéma");
  const [category, setCategory] = useState("offense");
  const [playing, setPlaying] = useState(false);
  const [playT, setPlayT] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [recordingVideo, setRecordingVideo] = useState(false);
  const svgRef = useRef(null);
  const fileInputRef = useRef(null);
  const rafRef = useRef(null);
  const lastTsRef = useRef(null);
  const dragStartRef = useRef(null);

  const courtType = diagram.courtType;
  const courtH = courtType === "full" ? FULL_COURT_H : HALF_COURT_H;
  const phases = diagram.phases;
  const safeIndex = Math.min(phaseIndex, phases.length - 1);
  const phase = phases[safeIndex];
  const canEdit = !readOnly && !playing;
  const currentToolInfo = TOOLS.find((t) => t.id === tool);

  // Playback loop — interpolates positions across phases at the chosen speed.
  useEffect(() => {
    if (!playing) {
      lastTsRef.current = null;
      return undefined;
    }
    const durationPerPhase = 1400 / speed;
    function tick(ts) {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = ts - lastTsRef.current;
      lastTsRef.current = ts;
      setPlayT((t) => {
        const maxT = phases.length - 1;
        const nt = t + dt / durationPerPhase;
        if (nt >= maxT) {
          setPlaying(false);
          setPhaseIndex(phases.length - 1);
          return maxT;
        }
        return nt;
      });
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, speed, phases.length]);

  const displayFrame = playing ? interpolateFrame(phases, playT) : phaseFrame(phase);

  function updateCurrentPhase(updater) {
    setDiagram((d) => ({
      ...d,
      phases: d.phases.map((p, i) => (i === safeIndex ? updater(p) : p)),
    }));
  }

  function play() {
    if (phases.length < 2) return;
    setPlayT(safeIndex);
    setPlaying(true);
  }
  function pause() {
    setPlaying(false);
  }

  function addPhase() {
    const newId = `phase-${Date.now()}`;
    setDiagram((d) => {
      const newPhase = makePhase(newId, `Phase ${d.phases.length + 1}`, d.phases[safeIndex]);
      const next = [...d.phases];
      next.splice(safeIndex + 1, 0, newPhase);
      return { ...d, phases: next };
    });
    setPhaseIndex(safeIndex + 1);
  }

  function deletePhase() {
    if (phases.length <= 1) return;
    setDiagram((d) => ({ ...d, phases: d.phases.filter((_, i) => i !== safeIndex) }));
    setPhaseIndex((i) => Math.max(0, i - 1));
  }

  function renamePhase(label) {
    updateCurrentPhase((p) => ({ ...p, label }));
  }

  function setCourtType(type) {
    setDiagram((d) => ({ ...d, courtType: type }));
  }

  function addDefender() {
    if (diagram.defenders.length >= 5) return;
    const newId = `d${Date.now()}`;
    const idx = diagram.defenders.length;
    const startPos = { x: 60 + idx * 90, y: courtH - 70 };
    setDiagram((d) => ({
      ...d,
      defenders: [...d.defenders, { id: newId }],
      phases: d.phases.map((p) => ({ ...p, defenderPos: { ...p.defenderPos, [newId]: { ...startPos } } })),
    }));
  }

  function removeDefender(id) {
    setDiagram((d) => ({
      ...d,
      defenders: d.defenders.filter((x) => x.id !== id),
      phases: d.phases.map((p) => {
        const rest = { ...p.defenderPos };
        delete rest[id];
        return { ...p, defenderPos: rest, annotations: p.annotations.filter((a) => a.defenderId !== id) };
      }),
    }));
  }

  const handlePlayerDown = (id) => (evt) => {
    if (!canEdit || tool !== "move") return;
    evt.stopPropagation();
    dragStartRef.current = { ...phase.playerPos[id] };
    setDragging({ kind: "player", id });
  };
  const handleDefenderDown = (id) => (evt) => {
    if (!canEdit || tool !== "move") return;
    evt.stopPropagation();
    setDragging({ kind: "defender", id });
  };
  const handleBallDown = (evt) => {
    if (!canEdit || tool !== "move") return;
    evt.stopPropagation();
    setDragging({ kind: "ball" });
  };

  const handleCourtDown = (evt) => {
    if (!canEdit || tool === "move" || tool === "erase") return;
    const pt = pointFromEvent(svgRef.current, evt, courtH);
    setDrawStart(pt);
    setDrawPreview(pt);
  };

  const handleMove = (evt) => {
    if (!svgRef.current) return;
    const pt = pointFromEvent(svgRef.current, evt, courtH);
    if (dragging) {
      updateCurrentPhase((p) => {
        if (dragging.kind === "ball") return { ...p, ball: pt };
        if (dragging.kind === "defender") {
          return { ...p, defenderPos: { ...p.defenderPos, [dragging.id]: pt } };
        }
        return { ...p, playerPos: { ...p.playerPos, [dragging.id]: pt } };
      });
    } else if (drawStart) {
      setDrawPreview(pt);
    }
  };

  const finishInteraction = () => {
    if (dragging?.kind === "player") {
      const playerId = dragging.id;
      const startPos = dragStartRef.current;
      updateCurrentPhase((p) => {
        const pos = p.playerPos[playerId];
        let anns = p.annotations.filter((a) => !(a.auto && a.playerId === playerId));
        let nearest = null;
        let nearestDist = SCREEN_SNAP_RADIUS;
        Object.entries(p.defenderPos).forEach(([defId, dPos]) => {
          const dist = Math.hypot(pos.x - dPos.x, pos.y - dPos.y);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearest = { defId, dPos };
          }
        });
        if (nearest) {
          // Draw the screen from the screener's position *before* this drag
          // started, stopping just short of the defender — so the glyph is
          // always a visible, correctly oriented line + bar even if the drop
          // landed almost exactly on top of the defender marker.
          const originX = startPos ? startPos.x : pos.x;
          const originY = startPos ? startPos.y : pos.y;
          const dx = nearest.dPos.x - originX;
          const dy = nearest.dPos.y - originY;
          const len = Math.hypot(dx, dy) || 1;
          const stopDist = Math.max(0, len - 18);
          const ex = originX + (dx / len) * stopDist;
          const ey = originY + (dy / len) * stopDist;
          anns = [
            ...anns,
            {
              id: `auto-screen-${playerId}`,
              type: "screen",
              auto: true,
              playerId,
              defenderId: nearest.defId,
              x1: originX,
              y1: originY,
              x2: ex,
              y2: ey,
            },
          ];
        }
        return { ...p, annotations: anns };
      });
    }
    if (dragging) setDragging(null);
    dragStartRef.current = null;

    if (drawStart && drawPreview) {
      const dist = Math.hypot(drawPreview.x - drawStart.x, drawPreview.y - drawStart.y);
      if (dist > 10) {
        updateCurrentPhase((p) => ({
          ...p,
          annotations: [
            ...p.annotations,
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
    updateCurrentPhase((p) => ({ ...p, annotations: p.annotations.filter((a) => a.id !== id) }));
  };

  const clearAnnotations = () => updateCurrentPhase((p) => ({ ...p, annotations: [] }));
  const resetDiagram = () => {
    setDiagram(defaultDiagram());
    setPhaseIndex(0);
  };

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
      canvas.height = courtH * 2;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const a = document.createElement("a");
      a.download = `${name || "schema"}-${phase.label || "phase"}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = url;
  }, [name, courtH, phase.label]);

  // Records the phase-to-phase animation to a real video file (MP4 where the
  // browser's MediaRecorder supports it, WebM everywhere else — Chrome/Edge
  // only offer WebM at recording time even though they can usually still
  // play MP4). Works by drawing each interpolated frame's SVG onto an
  // offscreen <canvas>, capturing that canvas as a MediaStream, and
  // recording it — the same technique the play stays interactive for.
  const exportVideo = useCallback(async () => {
    if (phases.length < 2) {
      alert("Ajoutez au moins 2 phases pour exporter une vidéo.");
      return;
    }
    if (typeof window === "undefined" || typeof window.MediaRecorder === "undefined") {
      alert("L'export vidéo n'est pas supporté par ce navigateur.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = COURT_W * 2;
    canvas.height = courtH * 2;
    const ctx = canvas.getContext("2d");

    const candidates = [
      "video/mp4;codecs=avc1",
      "video/mp4",
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
    ];
    const mimeType = candidates.find((t) => window.MediaRecorder.isTypeSupported(t));
    if (!mimeType) {
      alert("Aucun format vidéo supporté par ce navigateur.");
      return;
    }

    async function drawFrameAt(tVal) {
      const frame = interpolateFrame(phases, tVal);
      const svgMarkup = renderToStaticMarkup(
        <CourtCanvas
          courtType={diagram.courtType}
          courtH={courtH}
          players={diagram.players}
          defenders={diagram.defenders}
          frame={frame}
          interactive={false}
        />
      );
      const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      await new Promise((resolve) => {
        const img = new window.Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(url);
          resolve();
        };
        img.src = url;
      });
    }

    setRecordingVideo(true);
    try {
      await drawFrameAt(0); // paint before the stream starts so the first frame isn't blank
      const stream = canvas.captureStream(30);
      const chunks = [];
      const recorder = new window.MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      const stopped = new Promise((resolve) => {
        recorder.onstop = resolve;
      });
      recorder.start();

      const durationPerPhase = 1400 / speed;
      const totalT = phases.length - 1;
      const frameIntervalMs = 1000 / 30;
      let t = 0;
      while (t < totalT) {
        // eslint-disable-next-line no-await-in-loop
        await drawFrameAt(t);
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, frameIntervalMs));
        t += frameIntervalMs / durationPerPhase;
      }
      await drawFrameAt(totalT);
      await new Promise((r) => setTimeout(r, 400)); // hold the last frame briefly

      recorder.stop();
      await stopped;

      const blob = new Blob(chunks, { type: mimeType });
      const ext = mimeType.startsWith("video/mp4") ? "mp4" : "webm";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.download = `${name || "schema"}.${ext}`;
      a.href = url;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setRecordingVideo(false);
    }
  }, [phases, speed, diagram, courtH, name]);

  const exportJson = useCallback(() => {
    const payload = { name, category, ...diagram };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.download = `${name || "schema"}.json`;
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);
  }, [name, category, diagram]);

  const importJson = useCallback(async (file) => {
    if (!file) return;
    const text = await file.text();
    try {
      const parsed = JSON.parse(text);
      setDiagram(migrateDiagram(parsed));
      if (parsed.name) setName(parsed.name);
      if (parsed.category) setCategory(parsed.category);
      setPhaseIndex(0);
    } catch {
      alert("Fichier JSON invalide.");
    }
  }, []);

  const exportPdf = useCallback(() => {
    const win = window.open("", "_blank");
    if (!win) return;
    const pagesHtml = diagram.phases
      .map((p, i) => {
        const svgMarkup = renderToStaticMarkup(
          <CourtCanvas
            courtType={diagram.courtType}
            courtH={courtH}
            players={diagram.players}
            defenders={diagram.defenders}
            frame={phaseFrame(p)}
            interactive={false}
          />
        );
        return `<div class="page"><h2>${escapeHtml(name)} — ${escapeHtml(p.label)} (${i + 1}/${diagram.phases.length})</h2>${svgMarkup}</div>`;
      })
      .join("");
    win.document.write(`<!doctype html><html><head><title>${escapeHtml(name)}</title>
      <meta charset="utf-8" />
      <style>
        body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 24px; }
        h2 { font-size: 15px; margin: 0 0 8px; color:#2d3194; text-transform: uppercase; }
        .page { page-break-after: always; margin-bottom: 28px; }
        .page:last-child { page-break-after: auto; }
        svg { width: 100%; max-width: 480px; height: auto; display:block; }
      </style>
    </head><body>${pagesHtml}<script>window.onload = function(){ window.print(); };<\/script></body></html>`);
    win.document.close();
  }, [diagram, name, courtH]);

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="flex-1">
        {/* Phase strip */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {phases.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setPlaying(false);
                setPhaseIndex(i);
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
                i === safeIndex && !playing
                  ? "bg-ibc-blue text-white"
                  : "bg-ibc-blue/10 text-ibc-blue hover:bg-ibc-blue/20"
              }`}
            >
              {p.label}
            </button>
          ))}
          {canEdit && (
            <>
              <button
                type="button"
                onClick={addPhase}
                className="rounded-full bg-ibc-accent px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-ibc-ink hover:brightness-95"
              >
                + Phase
              </button>
              {phases.length > 1 && (
                <button
                  type="button"
                  onClick={deletePhase}
                  className="rounded-full bg-black/5 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-ibc-ink/70 hover:bg-black/10"
                >
                  Supprimer la phase
                </button>
              )}
            </>
          )}
        </div>

        {canEdit && (
          <input
            value={phase.label}
            onChange={(e) => renamePhase(e.target.value)}
            className="mb-2 w-48 rounded-md border border-black/10 px-2 py-1 text-xs font-semibold"
            placeholder="Nom de la phase"
          />
        )}

        <CourtCanvas
          svgRef={svgRef}
          courtType={courtType}
          courtH={courtH}
          players={diagram.players}
          defenders={diagram.defenders}
          frame={displayFrame}
          interactive={canEdit}
          tool={tool}
          drawStart={drawStart}
          drawPreview={drawPreview}
          onCourtDown={handleCourtDown}
          onMove={handleMove}
          onUp={finishInteraction}
          onPlayerDown={handlePlayerDown}
          onDefenderDown={handleDefenderDown}
          onBallDown={handleBallDown}
          onEraseAnnotation={eraseAnnotation}
        />

        {/* Playback controls — available even read-only, so the whole team can watch the sequence */}
        {phases.length > 1 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-black/5 px-3 py-2">
            {!playing ? (
              <button
                type="button"
                onClick={play}
                className="rounded-full bg-ibc-blue px-4 py-1.5 text-xs font-bold uppercase text-white hover:brightness-110"
              >
                ▶ Lecture
              </button>
            ) : (
              <button
                type="button"
                onClick={pause}
                className="rounded-full bg-ibc-ink px-4 py-1.5 text-xs font-bold uppercase text-white hover:brightness-110"
              >
                ⏸ Pause
              </button>
            )}
            <span className="text-xs font-bold uppercase text-ibc-ink/60">Vitesse</span>
            {[0.5, 1, 1.5, 2].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  speed === s ? "bg-ibc-blue text-white" : "bg-white text-ibc-ink/70"
                }`}
              >
                {s}×
              </button>
            ))}
          </div>
        )}

        {canEdit && (
          <div className="mt-3 flex flex-wrap gap-2">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTool(t.id)}
                title={t.hint}
                className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide transition ${
                  tool === t.id ? "bg-ibc-blue text-white" : "bg-ibc-blue/10 text-ibc-blue hover:bg-ibc-blue/20"
                }`}
              >
                {t.label}
              </button>
            ))}
            <button
              type="button"
              onClick={clearAnnotations}
              className="rounded-full bg-black/5 px-4 py-2 text-xs font-bold uppercase tracking-wide text-ibc-ink/70 hover:bg-black/10"
            >
              Effacer les tracés
            </button>
            <button
              type="button"
              onClick={resetDiagram}
              className="rounded-full bg-black/5 px-4 py-2 text-xs font-bold uppercase tracking-wide text-ibc-ink/70 hover:bg-black/10"
            >
              Réinitialiser
            </button>
          </div>
        )}
        {canEdit && currentToolInfo && <p className="mt-2 text-xs text-ibc-ink/60">{currentToolInfo.hint}</p>}

        {canEdit && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-black/5 bg-white p-3 text-xs">
            <div className="flex items-center gap-1">
              <span className="font-bold uppercase text-ibc-blue/70">Terrain</span>
              <button
                type="button"
                onClick={() => setCourtType("half")}
                className={`rounded-full px-3 py-1 font-bold uppercase ${courtType === "half" ? "bg-ibc-blue text-white" : "bg-ibc-blue/10 text-ibc-blue"}`}
              >
                Demi
              </button>
              <button
                type="button"
                onClick={() => setCourtType("full")}
                className={`rounded-full px-3 py-1 font-bold uppercase ${courtType === "full" ? "bg-ibc-blue text-white" : "bg-ibc-blue/10 text-ibc-blue"}`}
              >
                Complet
              </button>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold uppercase text-ibc-blue/70">Défenseurs ({diagram.defenders.length}/5)</span>
              <button
                type="button"
                onClick={addDefender}
                disabled={diagram.defenders.length >= 5}
                className="rounded-full bg-red-50 px-3 py-1 font-bold uppercase text-red-600 hover:bg-red-100 disabled:opacity-40"
              >
                + Défenseur
              </button>
              {diagram.defenders.length > 0 && (
                <button
                  type="button"
                  onClick={() => removeDefender(diagram.defenders[diagram.defenders.length - 1].id)}
                  className="rounded-full bg-black/5 px-3 py-1 font-bold uppercase text-ibc-ink/70 hover:bg-black/10"
                >
                  − Retirer
                </button>
              )}
            </div>
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportPng}
            className="rounded-full bg-ibc-accent px-4 py-2 text-xs font-bold uppercase tracking-wide text-ibc-ink hover:brightness-95"
          >
            PNG (cette phase)
          </button>
          <button
            type="button"
            onClick={exportPdf}
            className="rounded-full bg-ibc-accent px-4 py-2 text-xs font-bold uppercase tracking-wide text-ibc-ink hover:brightness-95"
          >
            PDF (toutes les phases)
          </button>
          {isStaff && (
            <button
              type="button"
              onClick={exportVideo}
              disabled={recordingVideo || phases.length < 2}
              title={phases.length < 2 ? "Ajoutez au moins 2 phases pour exporter une vidéo" : undefined}
              className="rounded-full bg-ibc-accent px-4 py-2 text-xs font-bold uppercase tracking-wide text-ibc-ink hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {recordingVideo ? "Enregistrement…" : "Vidéo (MP4/WebM)"}
            </button>
          )}
          {canEdit && (
            <>
              <button
                type="button"
                onClick={exportJson}
                className="rounded-full bg-black/5 px-4 py-2 text-xs font-bold uppercase tracking-wide text-ibc-ink/70 hover:bg-black/10"
              >
                Exporter JSON
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-full bg-black/5 px-4 py-2 text-xs font-bold uppercase tracking-wide text-ibc-ink/70 hover:bg-black/10"
              >
                Importer JSON
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => importJson(e.target.files?.[0])}
              />
            </>
          )}
        </div>
      </div>

      {!readOnly && (
        <div className="w-full shrink-0 lg:w-72">
          <div className="rounded-xl border border-black/5 bg-white p-4 shadow-sm">
            <label className="block text-xs font-bold uppercase text-ibc-blue">Nom du schéma</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm"
            />
            <label className="mt-3 block text-xs font-bold uppercase text-ibc-blue">Catégorie</label>
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
              className="mt-4 w-full rounded-full bg-ibc-blue py-2.5 text-sm font-bold uppercase tracking-wide text-white hover:brightness-110"
            >
              Enregistrer le schéma
            </button>
          </div>

          {savedPlays.length > 0 && (
            <div className="mt-4 rounded-xl border border-black/5 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase text-ibc-blue">Schémas enregistrés</p>
              <ul className="mt-2 space-y-1">
                {savedPlays.map((play) => (
                  <li key={play.id} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-ibc-blue/5">
                    <button
                      type="button"
                      className="flex-1 text-left"
                      onClick={() => {
                        setName(play.name);
                        setCategory(play.category);
                        setDiagram(migrateDiagram(JSON.parse(play.diagram_json)));
                        setPhaseIndex(0);
                        setPlaying(false);
                        onLoadPlay?.(play);
                      }}
                    >
                      {play.name}
                      <span className="ml-1 text-xs text-ibc-ink/50">({play.category})</span>
                      {isStaff && (
                        <span
                          className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                            play.published ? "bg-green-100 text-green-700" : "bg-black/5 text-ibc-ink/50"
                          }`}
                        >
                          {play.published ? "publié" : "brouillon"}
                        </span>
                      )}
                    </button>
                    {isStaff && (
                      <button
                        type="button"
                        onClick={() => onTogglePublish?.(play)}
                        className="ml-2 shrink-0 text-xs font-bold uppercase text-ibc-blue hover:underline"
                      >
                        {play.published ? "dépublier" : "publier"}
                      </button>
                    )}
                    <button type="button" onClick={() => onDeletePlay?.(play.id)} className="ml-2 shrink-0 text-xs text-red-500 hover:underline">
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
