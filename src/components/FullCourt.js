// A full-court companion to HalfCourt.js — two mirrored half-courts sharing
// a midcourt line, same 500px width / coordinate scale so diagrams drawn on
// one court type stay geometrically comparable if the type is toggled.
// Pure presentational SVG — no state.

export const COURT_W = 500;
export const COURT_H = 940; // 2 * HalfCourt's 470, minus overlap of the shared boundary line

export default function FullCourt({ className }) {
  const cx = COURT_W / 2;
  const laneW = 163;
  const laneD = 193;
  const ftRadius = 60;
  const threeRadius = 225;
  const cornerX = 30;
  const hoopOffset = 52.5;

  function end(flip) {
    // flip=false → basket near the top (y=0 baseline), flip=true → basket near the bottom
    const sign = flip ? -1 : 1;
    const base = flip ? COURT_H : 0;
    const laneBottom = base + sign * laneD;
    const hoopY = base + sign * hoopOffset;

    return (
      <g key={flip ? "bottom" : "top"}>
        <rect
          x={cx - laneW / 2}
          y={Math.min(base, laneBottom)}
          width={laneW}
          height={laneD}
          stroke="#ffffff" strokeWidth="3" fill="none"
        />
        <circle cx={cx} cy={laneBottom} r={ftRadius} stroke="#ffffff" strokeWidth="3" fill="none" />
        <path
          d={`M ${cx - 40},${hoopY} A 40,40 0 0 ${flip ? 1 : 0} ${cx + 40},${hoopY}`}
          stroke="#ffffff" strokeWidth="3" fill="none"
        />
        <line
          x1={cx - 30}
          y1={base + sign * 15}
          x2={cx + 30}
          y2={base + sign * 15}
          stroke="#ffffff"
          strokeWidth="4"
        />
        <circle cx={cx} cy={hoopY} r="7.5" fill="none" stroke="#ffffff" strokeWidth="3" />
        <line x1={cornerX} y1={base} x2={cornerX} y2={hoopY + sign * 40} stroke="#ffffff" strokeWidth="3" fill="none" />
        <line
          x1={COURT_W - cornerX}
          y1={base}
          x2={COURT_W - cornerX}
          y2={hoopY + sign * 40}
          stroke="#ffffff" strokeWidth="3" fill="none"
        />
        <path
          d={`M ${cornerX},${hoopY + sign * 40} A ${threeRadius},${threeRadius} 0 0 ${flip ? 0 : 1} ${
            COURT_W - cornerX
          },${hoopY + sign * 40}`}
          stroke="#ffffff" strokeWidth="3" fill="none"
        />
      </g>
    );
  }

  return (
    <svg viewBox={`0 0 ${COURT_W} ${COURT_H}`} className={className} preserveAspectRatio="xMidYMid meet">
      <rect x="0" y="0" width={COURT_W} height={COURT_H} fill="#2d3194" />
      <rect x="2" y="2" width={COURT_W - 4} height={COURT_H - 4} stroke="#ffffff" strokeWidth="3" fill="none" />
      {end(false)}
      {end(true)}
      <line x1="2" y1={COURT_H / 2} x2={COURT_W - 2} y2={COURT_H / 2} stroke="#ffffff" strokeWidth="5" />
      <circle cx={cx} cy={COURT_H / 2} r="45" fill="none" stroke="#ffffff" strokeWidth="3" opacity="0.6" />
    </svg>
  );
}
