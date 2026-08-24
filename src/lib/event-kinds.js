// The calendar holds more than practices and games — the club also runs
// open gyms, tournaments, meetings and one-off events (dinners, AGM…).
// `kind` is free text in SQLite, so adding a kind here is all that's needed.
//
// Anything other than a practice or a game carries its own `title`, which
// is what gets shown; practices and games fall back to a generic label
// (plus the opponent, for games).

export const EVENT_KINDS = [
  { value: "practice", label: "Entraînement", short: "Entr.", needsTitle: false },
  { value: "game", label: "Match", short: "Match", needsTitle: false },
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
  if (event.kind === "game") {
    return `Match${event.opponent ? ` vs ${event.opponent}` : ""}`;
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
