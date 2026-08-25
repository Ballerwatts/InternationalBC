// Parser for the bulk game import (admin → Calendrier → "Importer des matchs").
//
// Built to swallow whatever the ACGBA schedule gets pasted in as, without
// the admin having to reformat it:
//   · separators  , ; or TAB  (Swiss Excel exports semicolons)
//   · dates       2026-10-04 · 04.10.2026 · 04/10/2026 · 4.10.26
//   · times       20:00 · 20h00 · 20h · 8:00 PM is NOT supported (24h only)
//   · headers     French or English, accents optional, any order
//   · a header row is optional — without one, columns are assumed to be
//     date, heure, adversaire, lieu, domicile
//
// Every row is validated and reported back with its line number so the
// admin previews exactly what will be created before anything is written.

const SEPARATORS = [";", "\t", ","];

const COLUMN_ALIASES = {
  kind: ["type", "kind", "genre", "categorie", "category"],
  team: ["equipe", "team", "squad"],
  title: ["titre", "title", "nom", "name", "evenement", "event"],
  date: ["date", "jour", "day"],
  start_time: ["heure", "heure de debut", "debut", "start", "start time", "time", "hour"],
  end_time: ["fin", "heure de fin", "end", "end time"],
  opponent: ["adversaire", "opponent", "contre", "vs", "equipe adverse", "against"],
  home_away: ["domicile", "lieu de jeu", "home", "home away", "home/away", "d/e", "dom ext"],
  location_name: ["salle", "lieu", "location", "gym", "venue"],
  location_address: ["adresse", "address"],
  notes: ["notes", "note", "remarque", "remarques", "comment", "commentaire"],
};

/** Strip accents/case/punctuation so "Heure de début" matches "heure de debut". */
function normalizeHeader(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 /]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectSeparator(line) {
  let best = ";";
  let bestCount = 0;
  for (const sep of SEPARATORS) {
    const count = line.split(sep).length - 1;
    if (count > bestCount) {
      best = sep;
      bestCount = count;
    }
  }
  return bestCount === 0 ? null : best;
}

/** Split one CSV line, honouring "quoted, fields". */
function splitLine(line, sep) {
  const out = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (ch === sep && !quoted) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

/** '04.10.2026' | '4/10/26' | '2026-10-04' -> '2026-10-04', or null. */
export function parseDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  let m = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const [, y, mo, d] = m;
    return isoIfReal(Number(y), Number(mo), Number(d));
  }

  // Day-first — the Swiss convention, so 04/10 is 4 October, never 10 April.
  m = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (m) {
    const [, d, mo, yRaw] = m;
    let y = Number(yRaw);
    if (y < 100) y += 2000;
    return isoIfReal(y, Number(mo), Number(d));
  }

  return null;
}

function isoIfReal(year, month, day) {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** '20h30' | '20:30' | '20h' | '20' -> '20:30' / '20:00', or null. */
export function parseTime(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return null;
  const m = raw.match(/^(\d{1,2})\s*(?:[h:.]\s*(\d{1,2})?)?$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** Adds `minutes` to an 'HH:MM' clock time (same-day wrap is clamped to 23:59). */
export function addMinutes(hhmm, minutes) {
  const [h, m] = hhmm.split(":").map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * 'match' | 'entrainement' | 'evenement' | 'tournoi' and their English
 * equivalents -> the kind stored on the row. Anything unrecognised is
 * reported rather than silently filed as a game.
 */
const KIND_ALIASES = {
  game: ["match", "matchs", "game", "games", "rencontre"],
  practice: ["entrainement", "entrainements", "practice", "training", "seance"],
  event: ["evenement", "evenements", "event", "events", "club", "sortie"],
  tournament: ["tournoi", "tournois", "tournament", "cup", "coupe"],
};

export function parseKind(value) {
  const v = normalizeHeader(value);
  if (!v) return null;
  for (const [kind, aliases] of Object.entries(KIND_ALIASES)) {
    if (aliases.includes(v)) return kind;
  }
  return null;
}

/** 'domicile' / 'home' / 'D' -> 'home' · 'exterieur' / 'away' / 'E' -> 'away'. */
function parseHomeAway(value) {
  const v = normalizeHeader(value);
  if (!v) return null;
  if (["d", "dom", "domicile", "home", "h", "maison", "1"].includes(v)) return "home";
  if (["e", "ext", "exterieur", "away", "a", "deplacement", "0"].includes(v)) return "away";
  return null;
}

/**
 * Parse a pasted CSV/TSV block into game rows.
 *
 * @returns {{rows: object[], errors: {line: number, message: string}[], usedHeader: boolean}}
 *   rows are ready for INSERT: { practice_date, start_time, end_time,
 *   opponent, home_away, location_name, location_address, notes, line }
 */
export function parseGameCsv(text, { defaultDurationMinutes = 120, defaultKind = "game" } = {}) {
  const errors = [];
  const rows = [];

  const lines = String(text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));

  if (lines.length === 0) return { rows, errors, usedHeader: false };

  const sep = detectSeparator(lines[0]) || ";";

  // A first line whose cells match no known header AND whose first cell
  // parses as a date is data, not a header.
  const firstCells = splitLine(lines[0], sep).map(normalizeHeader);
  const knownAliases = new Set(Object.values(COLUMN_ALIASES).flat());
  const looksLikeHeader =
    firstCells.some((c) => knownAliases.has(c)) && !parseDate(splitLine(lines[0], sep)[0]);

  let indexByField;
  if (looksLikeHeader) {
    indexByField = {};
    firstCells.forEach((cell, i) => {
      for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
        if (aliases.includes(cell)) indexByField[field] = i;
      }
    });
    if (indexByField.date == null) {
      errors.push({ line: 1, message: "aucune colonne « date » reconnue dans l'en-tête" });
      return { rows, errors, usedHeader: true };
    }
  } else {
    // Positional fallback, documented in the template.
    indexByField = {
      date: 0,
      start_time: 1,
      opponent: 2,
      location_name: 3,
      home_away: 4,
    };
  }

  const dataLines = looksLikeHeader ? lines.slice(1) : lines;
  const offset = looksLikeHeader ? 2 : 1;

  dataLines.forEach((line, i) => {
    const lineNo = i + offset;
    const cells = splitLine(line, sep);
    const cell = (field) =>
      indexByField[field] != null ? (cells[indexByField[field]] ?? "").trim() : "";

    const practice_date = parseDate(cell("date"));
    if (!practice_date) {
      errors.push({
        line: lineNo,
        message: `date illisible : « ${cell("date") || "(vide)"} » — attendu 04.10.2026 ou 2026-10-04`,
      });
      return;
    }

    const start_time = parseTime(cell("start_time")) || "20:00";
    const end_time = parseTime(cell("end_time")) || addMinutes(start_time, defaultDurationMinutes);
    if (end_time <= start_time) {
      errors.push({ line: lineNo, message: "l'heure de fin doit suivre l'heure de début" });
      return;
    }

    // Without a type column the block is what it always was: games.
    const rawKind = cell("kind");
    const kind = rawKind ? parseKind(rawKind) : defaultKind;
    if (!kind) {
      errors.push({
        line: lineNo,
        message: `type inconnu : « ${rawKind} » — attendu match, entrainement, evenement ou tournoi`,
      });
      return;
    }

    const opponent = cell("opponent");
    const title = cell("title");

    // A game needs someone to play; an event or tournament needs a name.
    // A practice needs neither — it is just a slot in a hall.
    if (kind === "game" && !opponent) {
      errors.push({ line: lineNo, message: "adversaire manquant pour un match" });
      return;
    }
    if ((kind === "event" || kind === "tournament") && !title && !opponent) {
      errors.push({
        line: lineNo,
        message: kind === "event" ? "titre manquant pour un événement" : "nom du tournoi manquant",
      });
      return;
    }

    rows.push({
      line: lineNo,
      kind,
      team: cell("team") || null,
      title: title || null,
      practice_date,
      start_time,
      end_time,
      opponent: opponent || null,
      home_away: parseHomeAway(cell("home_away")),
      location_name: cell("location_name") || null,
      location_address: cell("location_address") || null,
      notes: cell("notes") || null,
    });
  });

  return { rows, errors, usedHeader: looksLikeHeader };
}

// One line per event. `type` and `equipe` are optional: leave `type` out and
// everything is a game, leave `equipe` out and the row goes to whichever
// squads are ticked in the import panel — which is how a club event or a
// tournament lands on every calendar at once.
export const CSV_TEMPLATE = [
  "type;equipe;date;heure;fin;adversaire;titre;salle;domicile;notes",
  "match;IBBC Men (2LCM);04.10.2026;20:00;;BBC Meyrin;;École Raymond-Uldry;D;",
  "match;IBBC Women (NL1);11.10.2026;18:30;;Lancy Basket;;Salle du Petit-Lancy;E;déplacement",
  "entrainement;IBBC Youth Men's Team (U18M);15.10.2026;18:00;19:30;;;Collège Sismondi;;",
  "evenement;;20.12.2026;19:00;23:00;;Souper de Noël du club;Restaurant Mama & Zita;;",
  "tournoi;;14.03.2027;09:00;18:00;;UN Inter-Agency Games;Bout-du-Monde;;",
].join("\n");
