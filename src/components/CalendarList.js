"use client";

// The public calendar. Client-side so the Games / Entraînements /
// Événements filters are instant, and so past results can be shown in the
// same list as upcoming fixtures without a second page.
//
// The server hands it a pre-merged, date-ordered list of holiday bands and
// events (see src/app/calendrier/page.js) — this component only filters and
// renders, it does no date maths of its own beyond formatting.

import { useMemo, useState } from "react";
import { eventLabel, isHighlightKind } from "@/lib/event-kinds";
import { gameOutcome, outcomeClasses, OUTCOME_LABELS } from "@/lib/game-result";
import VideoEmbed from "@/components/VideoEmbed";

const FILTERS = [
  { value: "all", label: "Tout" },
  { value: "game", label: "Games" },
  { value: "friendly", label: "Friendlies" },
  { value: "practice", label: "Entraînements" },
  { value: "event", label: "Événements" },
];

const MONTHS_SHORT = [
  "Janv", "Févr", "Mars", "Avr", "Mai", "Juin",
  "Juil", "Août", "Sept", "Oct", "Nov", "Déc",
];
const WEEKDAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

function dateParts(iso) {
  const d = new Date(iso + "T00:00:00");
  return {
    weekday: WEEKDAYS[d.getDay()],
    day: d.getDate(),
    month: MONTHS_SHORT[d.getMonth()],
    year: d.getFullYear(),
  };
}

/** Which filter bucket an event belongs to. */
function bucketOf(kind) {
  if (kind === "game") return "game";
  if (kind === "practice") return "practice";
  return "event";
}

export default function CalendarList({ items, teamNameById = {}, showPast = false }) {
  const [filter, setFilter] = useState("all");

  const counts = useMemo(() => {
    const c = { all: 0, game: 0, practice: 0, event: 0 };
    for (const it of items) {
      if (it.type !== "event") continue;
      c.all++;
      c[bucketOf(it.event.kind)]++;
    }
    return c;
  }, [items]);

  const visible = useMemo(() => {
    if (filter === "all") return items;
    // Holiday bands only make sense alongside the full schedule.
    return items.filter((it) => it.type === "event" && bucketOf(it.event.kind) === filter);
  }, [items, filter]);

  return (
    <div>
      {/* The results section is games-only by construction — a filter row
          there would just show three zeroes. */}
      <div className={`mb-6 flex-wrap justify-center gap-2 ${showPast ? "hidden" : "flex"}`}>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
              filter === f.value
                ? "bg-ibc-blue text-white shadow"
                : "bg-black/5 text-ibc-ink/70 hover:bg-black/10"
            }`}
          >
            {f.label}
            <span className="ml-1.5 opacity-60">{counts[f.value] ?? 0}</span>
          </button>
        ))}
      </div>

      <ol className="space-y-3">
        {visible.map((item) => {
          if (item.type === "holiday") {
            const h = item.holiday;
            return (
              <li
                key={`h-${h.id}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-dashed border-ibc-accent/60 bg-ibc-accent/10 px-5 py-3"
              >
                <span className="rounded-full bg-ibc-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ibc-ink">
                  {h.kind === "ferie" ? "Jour férié" : "Vacances scolaires"}
                </span>
                <span className="font-display text-base font-bold uppercase text-ibc-ink">
                  {h.name}
                </span>
                <span className="text-sm text-ibc-ink/60">{h.range}</span>
              </li>
            );
          }

          const e = item.event;
          return (
            <li key={e.id}>
              <EventCard
                event={e}
                teamName={e.team_id ? teamNameById[e.team_id] : null}
                holidayName={item.holidayName}
                isPast={item.isPast}
              />
            </li>
          );
        })}

        {visible.length === 0 && (
          <p className="py-10 text-center text-sm text-ibc-ink/50">
            {showPast
              ? "Aucun résultat pour ce filtre."
              : "Aucun événement à venir pour ce filtre."}
          </p>
        )}
      </ol>
    </div>
  );
}

function EventCard({ event: e, teamName, holidayName, isPast }) {
  const { weekday, day, month, year } = dateParts(e.practice_date);
  const outcome = gameOutcome(e);
  const isGame = e.kind === "game";

  return (
    <article
      className={`flex overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md ${
        isGame ? "border-ibc-blue/20" : "border-black/5"
      } ${isPast ? "opacity-90" : ""}`}
    >
      {/* Date block */}
      <div
        className={`flex w-20 shrink-0 flex-col items-center justify-center px-2 py-4 text-center sm:w-24 ${
          isGame ? "bg-ibc-blue text-white" : "bg-black/[0.03] text-ibc-ink"
        }`}
      >
        <span className={`text-[10px] font-bold uppercase ${isGame ? "text-white/70" : "text-ibc-ink/50"}`}>
          {weekday}
        </span>
        <span className="font-display text-3xl font-extrabold leading-none">{day}</span>
        <span className={`text-[10px] font-bold uppercase ${isGame ? "text-white/70" : "text-ibc-ink/50"}`}>
          {month} {year}
        </span>
      </div>

      {/* Body */}
      <div className="flex min-w-0 flex-1 flex-col gap-1 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-lg font-bold uppercase leading-tight text-ibc-ink">
            {isGame && e.opponent ? (
              <>
                <span className="text-ibc-blue">IBBC</span>{" "}
                <span className="text-ibc-ink/40">vs</span> {e.opponent}
              </>
            ) : (
              eventLabel(e)
            )}
          </h3>
          {outcome && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${outcomeClasses(outcome)}`}
            >
              {OUTCOME_LABELS[outcome]} {e.score_us}–{e.score_them}
            </span>
          )}
          {!outcome && isHighlightKind(e.kind) && !isGame && (
            <span className="rounded-full bg-ibc-accent/25 px-2.5 py-0.5 text-[10px] font-bold uppercase text-ibc-ink/70">
              {eventLabel(e)}
            </span>
          )}
        </div>

        <p className="text-sm text-ibc-ink/60">
          {e.start_time}–{e.end_time}
          {teamName && <span className="ml-2 text-ibc-ink/45">· {teamName}</span>}
          {holidayName && (
            <span className="ml-2 rounded-full bg-ibc-accent/20 px-2 py-0.5 text-[10px] font-bold uppercase text-ibc-ink/70">
              {holidayName}
            </span>
          )}
        </p>

        {e.location_name && (
          <p className="text-xs text-ibc-ink/50">
            {e.location_name}
            {e.location_address ? ` — ${e.location_address}` : ""}
          </p>
        )}

        {e.recap && (
          <p className="mt-1 line-clamp-2 border-l-2 border-ibc-accent pl-3 text-sm italic text-ibc-ink/75">
            {e.recap}
          </p>
        )}
        {!e.recap && e.notes && <p className="mt-1 text-xs text-ibc-ink/60">{e.notes}</p>}

        {/* Game footage. Only the first frame loads until it is clicked —
            embedding a player per fixture would make a season's calendar
            unusable on a phone. */}
        {e.video_url && (
          <div className="mt-3 max-w-sm">
            <VideoEmbed url={e.video_url} title={`${eventLabel(e)} — ${e.practice_date}`} />
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-ibc-ink/45">
              Match video
            </p>
          </div>
        )}
      </div>

      {/* Action */}
      {!isPast && (
        <div className="flex shrink-0 items-center pr-4">
          <a
            href={`/api/calendar/${e.id}.ics`}
            title="Ajouter à votre agenda"
            className="rounded-full border-2 border-ibc-blue px-3 py-2 text-[10px] font-bold uppercase text-ibc-blue transition hover:bg-ibc-blue hover:text-white"
          >
            + Agenda
          </a>
        </div>
      )}
    </article>
  );
}
