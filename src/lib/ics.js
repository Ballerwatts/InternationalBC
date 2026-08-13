import { createEvents } from "ics";

function toDateArray(dateStr, timeStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  return [y, m, d, hh, mm];
}

export function practiceToIcsEvent(p) {
  const start = toDateArray(p.practice_date, p.start_time);
  const end = toDateArray(p.practice_date, p.end_time);
  const isGame = p.kind === "game";
  const title = isGame
    ? `Match — International Basketball Club Genève${p.opponent ? " vs " + p.opponent : ""}`
    : p.title || "Entraînement — International Basketball Club Genève";

  return {
    title,
    start,
    end,
    location: [p.location_name, p.location_address].filter(Boolean).join(", "),
    description: p.notes || "",
    status: "CONFIRMED",
    organizer: { name: "International Basketball Club Genève", email: process.env.CLUB_EMAIL || "contact@example.org" },
    uid: `ibc-practice-${p.id}@international-bc-geneve`,
  };
}

export function buildIcsFeed(practices) {
  const events = practices.map(practiceToIcsEvent);
  const { error, value } = createEvents(events);
  if (error) throw error;
  return value;
}

export function buildIcsForOne(practice) {
  const { error, value } = createEvents([practiceToIcsEvent(practice)]);
  if (error) throw error;
  return value;
}
