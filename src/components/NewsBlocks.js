import Link from "next/link";
import VideoEmbed from "@/components/VideoEmbed";

// The newsletter's blocks, rendered for the website.
//
// The e-mail version lives in src/lib/email-template.js and has to be
// table-based HTML with inline styles for Outlook. This is the same data as
// ordinary React, so a reader who opens the news item on the site sees
// everything the e-mail said rather than a title and a stub.

function Section({ title, children }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl font-bold uppercase text-ibc-blue">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Results({ games }) {
  if (!games?.length) return null;
  return (
    <Section title="Results">
      <ul className="space-y-3">
        {games.map((g) => {
          const won = g.score_us != null && g.score_us > g.score_them;
          const drawn = g.score_us != null && g.score_us === g.score_them;
          return (
            <li key={g.id} className="rounded-xl border border-black/5 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-ibc-ink/50">
                {g.practice_date}
                {g.friendly && <span className="ml-2 text-ibc-ink/40">friendly</span>}
              </p>
              <p className="mt-1 font-display text-lg font-bold text-ibc-ink">
                {g.score_us != null && (
                  <span
                    className={`mr-2 inline-block rounded px-2 py-0.5 text-xs text-white ${
                      drawn ? "bg-ibc-ink/50" : won ? "bg-green-600" : "bg-red-600"
                    }`}
                  >
                    {drawn ? "D" : won ? "W" : "L"}
                  </span>
                )}
                IBBC vs {g.opponent || "—"}
                {g.score_us != null && (
                  <span className="ml-2 text-ibc-blue">
                    {g.score_us} – {g.score_them}
                  </span>
                )}
              </p>
              {g.leaders?.length > 0 && (
                <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {g.leaders.map((l) => (
                    <span
                      key={l.category}
                      className={
                        l.category === "points" || l.category === "three_pointers"
                          ? "text-ibc-ink"
                          : "text-ibc-ink/60"
                      }
                    >
                      <strong className="text-ibc-blue">
                        {l.value} {l.short}
                      </strong>{" "}
                      {l.names.join(" & ")}
                    </span>
                  ))}
                </p>
              )}
              {g.recap && (
                <p className="mt-2 border-l-2 border-ibc-accent pl-3 text-sm italic text-ibc-ink/75">
                  {g.recap}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

function Fixtures({ events }) {
  if (!events?.length) return null;
  return (
    <Section title="What's coming up">
      <ul className="divide-y divide-black/5 rounded-xl border border-black/5 bg-white shadow-sm">
        {events.map((e) => (
          <li key={e.id} className="flex flex-wrap items-baseline gap-x-3 px-4 py-2.5 text-sm">
            <span className="font-semibold text-ibc-blue">{e.practice_date}</span>
            <span className="text-ibc-ink/50">
              {e.start_time}
              {e.end_time ? `–${e.end_time}` : ""}
            </span>
            <span className="font-semibold text-ibc-ink">
              {e.title || e.opponent || e.kind}
            </span>
            {e.location_name && <span className="text-ibc-ink/50">{e.location_name}</span>}
          </li>
        ))}
      </ul>
    </Section>
  );
}

function PlayerOfWeek({ player }) {
  if (!player) return null;
  return (
    <Section title="Player of the week">
      <div className="flex items-center gap-4 rounded-xl border border-black/5 bg-white p-4 shadow-sm">
        {player.photo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={player.photo_url}
            alt={player.name}
            className="h-20 w-20 shrink-0 rounded-full object-cover"
          />
        )}
        <div>
          <p className="font-display text-lg font-bold text-ibc-ink">
            {player.name}
            {player.jersey && <span className="ml-2 text-ibc-ink/40">#{player.jersey}</span>}
          </p>
          <p className="text-sm text-ibc-ink/70">{player.stat_line}</p>
          {player.id && (
            <Link
              href={`/membres/${player.id}`}
              className="mt-1 inline-block text-xs font-bold uppercase text-ibc-blue hover:underline"
            >
              Profile
            </Link>
          )}
        </div>
      </div>
    </Section>
  );
}

function Practice({ focus, drills, notes }) {
  if (!focus && !drills && !notes) return null;
  return (
    <Section title="Practice focus">
      <div className="rounded-xl border border-black/5 bg-white p-4 shadow-sm">
        {focus && <p className="font-semibold text-ibc-ink">{focus}</p>}
        {drills && <p className="mt-2 whitespace-pre-line text-sm text-ibc-ink/75">{drills}</p>}
        {notes && <p className="mt-2 whitespace-pre-line text-sm text-ibc-ink/60">{notes}</p>}
      </div>
    </Section>
  );
}

function NewsItems({ items }) {
  if (!items?.length) return null;
  return (
    <Section title="Club news">
      <ul className="space-y-3">
        {items.map((n) => (
          <li key={n.id} className="rounded-xl border border-black/5 bg-white p-4 shadow-sm">
            <p className="font-display text-base font-bold text-ibc-ink">{n.title}</p>
            {n.excerpt && <p className="mt-1 text-sm text-ibc-ink/70">{n.excerpt}</p>}
          </li>
        ))}
      </ul>
    </Section>
  );
}

const RENDERERS = {
  intro: (b) =>
    b.text ? <p className="whitespace-pre-line text-ibc-ink/80">{b.text}</p> : null,
  results: (b) => <Results games={b.games} />,
  fixtures: (b) => <Fixtures events={b.events} />,
  player: (b) => <PlayerOfWeek player={b.player} />,
  practice: (b) => <Practice focus={b.focus} drills={b.drills} notes={b.notes} />,
  news: (b) => <NewsItems items={b.items} />,
  // Sponsors are rendered by SponsorStrip at the foot of every page, so
  // repeating them mid-article would only be clutter.
  sponsors: () => null,
};

export default function NewsBlocks({ blocks }) {
  if (!Array.isArray(blocks) || blocks.length === 0) return null;
  return (
    <>
      {blocks.map((b, i) => {
        const render = RENDERERS[b?.type];
        return render ? <div key={`${b.type}-${i}`}>{render(b)}</div> : null;
      })}
    </>
  );
}
