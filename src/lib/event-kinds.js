// The calendar holds more than practices and games — the club also runs
// open gyms, tournaments, meetings and one-off events (dinners, AGM…).
// `kind` is free text in SQLite, so adding a kind here is all that's needed.
//
// Anything other than a practice or a game carries its own `title`, which
// is what gets shown; practices and games fall back to a generic label
// (plus the opponent, for games).

export const EVENT_KINDS = [
  { value: "practice", label: "Entraînement", short: "Entr.", needsTitle: false },
  { value: "game", label: "Game", short: "Game", needsTitle: false },
  // A friendly is a real game with a real box score, but it is NOT part of
  // the league — season averages are "official games only", so it has to be
  // a distinct kind rather than a flag someone forgets to tick.
  { value: "friendly", label: "Friendly game", short: "Friendly", needsTitle: false },
  { value: "open_gym", label: "Open gym", short: "Gym", needsTitle: false },
  { value: "tournament", label: "Tournoi", short: "Tournoi", needsTitle: true },
  { value: "meeting", label: "Réunion", short: "Réunion", needsTitle: true },
  { value: "event", label: "Autre événement", short: "Événement", needsTitle: true },
];

const BY_VALUE = Object.fromEntries(EVENT_KINDS.map((k) => [k.value, k]));

/** True when this kind expects the admin to type their own title. */
export function kindNeedsTitle(kind) {
  return !!BY_VALUE[kind]?.needsTitle;
}

/** Human label for one calendar row. */
export function eventLabel(event) {
  const kind = BY_VALUE[event.kind];
  if (event.kind === "game" || event.kind === "friendly") {
    const prefix = event.kind === "friendly" ? "Friendly" : "Game";
    return `${prefix}${event.opponent ? ` vs ${event.opponent}` : ""}`;
  }
  if (kind?.needsTitle) {
    return event.title?.trim() || kind.label;
  }
  return kind?.label || event.title || "Événement";
}

/** Compact label for tight spots such as a calendar day cell. */
export function eventShortLabel(event) {
  return BY_VALUE[event.kind]?.short || "Événement";
}

/** Games and other special events get the accent colour on the public calendar. */
export function isHighlightKind(kind) {
  return kind !== "practice";
}

/** Kinds that carry a score and a box score. */
export const SCORED_KINDS = ["game", "friendly"];

/**
 * Kinds that count towards season averages. A friendly is deliberately out:
 * "PPG" on a public profile has to mean something, and mixing in a summer
 * scratch game against a works team makes it mean less.
 */
export const OFFICIAL_KINDS = ["game"];

export function isScoredKind(kind) {
  return SCORED_KINDS.includes(kind);
}
