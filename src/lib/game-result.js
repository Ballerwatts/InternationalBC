// Pure helpers for game results — no database import, so client components
// can use them. (src/lib/stats.js talks to SQLite and is server-only; a
// "use client" page importing from it drags node:sqlite into the browser
// bundle and the build fails.)

/** 'V' win / 'D' loss / 'N' draw, or null when no score has been entered. */
export function gameOutcome(game) {
  if (game?.score_us == null || game?.score_them == null) return null;
  if (game.score_us > game.score_them) return "V";
  if (game.score_us < game.score_them) return "D";
  return "N";
}

/** Tailwind classes for a result badge. */
export function outcomeClasses(outcome) {
  if (outcome === "V") return "bg-green-100 text-green-700";
  if (outcome === "D") return "bg-red-100 text-red-700";
  return "bg-black/5 text-ibc-ink/60";
}

export const OUTCOME_LABELS = { V: "Victoire", D: "Défaite", N: "Nul" };
