// A reasonably-accurate FIBA half-court, drawn in a 500 x 470 viewBox
// (roughly 33.3px per metre). Used as the background for the play-diagram
// tool. Pure presentational SVG — no state, safe to reuse in read-only and
// editable contexts alike.

export const COURT_W = 500;
export const COURT_H = 470;

export default function HalfCourt({ className }) {
  const cx = COURT_W / 2;
  const hoopY = 52.5; // distance of basket from the baseline (top, y=0 here)
  const laneW = 163;
  const laneTop = 0;
  const laneBottom = 193;
  const laneLeft = cx - laneW / 2;
  const laneRight = cx + laneW / 2;
  const ftRadius = 60;
  const threeRadius = 225;
  const cornerX = 30; // distance of the corner-three straight line from the sideline

  return (
    <svg
      viewBox={`0 0 ${COURT_W} ${COURT_H}`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      <rect x="0" y="0" width={COURT_W} height={COURT_H} fill="#2d3194" />
      {/* Boundary */}
      <rect x="2" y="2" width={COURT_W - 4} height={COURT_H - 4} stroke="#ffffff" strokeWidth="3" fill="none" />
      {/* Lane / key */}
      <rect x={laneLeft} y={laneTop} width={laneW} height={laneBottom} stroke="#ffffff" strokeWidth="3" fill="none" />
      {/* Free-throw circle (dashed lower half to suggest the contested arc) */}
      <circle cx={cx} cy={laneBottom} r={ftRadius} stroke="#ffffff" strokeWidth="3" fill="none" />
      {/* Restricted area arc under the hoop */}
      <path
        d={`M ${cx - 40},${hoopY} A 40,40 0 0 0 ${cx + 40},${hoopY}`}
        stroke="#ffffff" strokeWidth="3" fill="none"
      />
      {/* Backboard + hoop */}
      <line x1={cx - 30} y1="15" x2={cx + 30} y2="15" stroke="#ffffff" strokeWidth="4" />
      <circle cx={cx} cy={hoopY} r="7.5" fill="none" stroke="#ffffff" strokeWidth="3" />
      {/* Three point line */}
      <line x1={cornerX} y1="0" x2={cornerX} y2={hoopY + 40} stroke="#ffffff" strokeWidth="3" fill="none" />
      <line
        x1={COURT_W - cornerX}
        y1="0"
        x2={COURT_W - cornerX}
        y2={hoopY + 40}
        stroke="#ffffff" strokeWidth="3" fill="none"
      />
      <path
        d={`M ${cornerX},${hoopY + 40} A ${threeRadius},${threeRadius} 0 0 0 ${
          COURT_W - cornerX
        },${hoopY + 40}`}
        stroke="#ffffff" strokeWidth="3" fill="none"
      />
      {/* Half-court line at the bottom edge */}
      <line
        x1="2"
        y1={COURT_H - 2}
        x2={COURT_W - 2}
        y2={COURT_H - 2}
        stroke="#ffffff"
        strokeWidth="5"
      />
      <circle cx={cx} cy={COURT_H - 2} r="45" fill="none" stroke="#ffffff" strokeWidth="3" opacity="0.6" />
    </svg>
  );
}
