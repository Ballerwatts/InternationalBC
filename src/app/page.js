import Link from "next/link";
import { getAllSettings, query } from "@/lib/db";
import PracticeMap from "@/components/PracticeMap";
import HeroSlider from "@/components/HeroSlider";

export const dynamic = "force-dynamic";

function nextPractices(limit = 4) {
  const today = new Date().toISOString().slice(0, 10);
  return query(
    `SELECT * FROM practices WHERE practice_date >= ? ORDER BY practice_date ASC, start_time ASC LIMIT ?`,
    [today, limit]
  );
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

export default function HomePage() {
  const settings = getAllSettings();
  const announcements = query(
    "SELECT * FROM announcements WHERE published = 1 ORDER BY created_at DESC LIMIT 3"
  );
  const upcoming = nextPractices(4);
  const sponsors = query("SELECT * FROM sponsors ORDER BY sort_order ASC, id ASC");
  const heroPhotos = query("SELECT * FROM hero_photos ORDER BY sort_order ASC, id ASC");

  const latestAnnouncement = announcements[0] || null;

  return (
    <div>
      {/* HERO SLIDER — club headline, latest announcement, sponsors, + up to 3 extra photos */}
      <HeroSlider
        settings={settings}
        announcement={latestAnnouncement}
        sponsors={sponsors}
        heroPhotos={heroPhotos}
      />

      {/* QUICK FACTS */}
      <section className="border-b border-black/5 bg-ibc-accent/10">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-4 py-8 text-center sm:grid-cols-4">
          <Fact label="Teams" value="4 squads" />
          <Fact label="Association Cantonale de Basketball Amateur" value="A.C.G.B.A." />
          <Fact label="Practices" value="Mon & Thu · 8–10pm" />
          <Fact label="Season" value={settings.season_label} />
        </div>
      </section>

      {/* ANNOUNCEMENTS */}
      {announcements.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="font-display text-3xl font-bold uppercase text-ibc-blue">Announcements</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {announcements.map((a) => (
              <article
                key={a.id}
                className="overflow-hidden rounded-xl border border-black/5 bg-white shadow-sm ring-1 ring-black/5"
              >
                {a.image_data_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.image_data_url} alt="" className="h-40 w-full object-cover" />
                )}
                <div className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ibc-blue/70">
                    {new Date(a.created_at).toLocaleDateString("en-GB")}
                  </p>
                  <h3 className="mt-1 font-display text-xl font-bold text-ibc-ink">{a.title}</h3>
                  <p className="mt-2 whitespace-pre-line text-sm text-ibc-ink/75">{a.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* PRACTICE / SCHEDULE + MAP */}
      <section className="bg-ibc-blue/5 py-14">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-bold uppercase text-ibc-blue">
              Upcoming
            </h2>
            <ul className="mt-6 space-y-3">
              {upcoming.length === 0 && (
                <li className="text-sm text-ibc-ink/60">No upcoming events right now.</li>
              )}
              {upcoming.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-black/5 bg-white px-4 py-3 shadow-sm"
                >
                  <div>
                    <p className="font-semibold capitalize text-ibc-ink">
                      {formatDate(p.practice_date)}
                    </p>
                    <p className="text-sm text-ibc-ink/60">
                      {p.start_time}–{p.end_time} · {p.kind === "game" ? `Game${p.opponent ? " vs " + p.opponent : ""}` : "Practice"}
                    </p>
                  </div>
                  <a
                    href={`/api/calendar/${p.id}.ics`}
                    className="shrink-0 rounded-full border-2 border-ibc-blue px-3 py-1.5 text-xs font-bold uppercase text-ibc-blue transition hover:bg-ibc-blue hover:text-white"
                  >
                    + Add to calendar
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/calendrier"
                className="rounded-full bg-ibc-blue px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition hover:brightness-110"
              >
                Full calendar
              </Link>
              <a
                href="/api/calendar.ics"
                className="rounded-full border-2 border-ibc-blue px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-ibc-blue transition hover:bg-ibc-blue hover:text-white"
              >
                Subscribe to calendar
              </a>
            </div>
          </div>
          <div>
            <h3 className="font-display text-xl font-bold uppercase text-ibc-blue">
              Practice location
            </h3>
            <p className="mt-2 text-sm text-ibc-ink/70">
              {settings.practice_location_name} — {settings.practice_location_address}
            </p>
            <PracticeMap address={settings.practice_location_address} />
          </div>
        </div>
      </section>

      {/* CLUB INFO */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="font-display text-3xl font-bold uppercase text-ibc-blue">The Club</h2>
            <p className="mt-4 whitespace-pre-line text-ibc-ink/75">{settings.club_about}</p>
          </div>
          {settings.highlight_body && (
            <div>
              <h3 className="font-display text-xl font-bold uppercase text-ibc-blue">
                Highlight of the week
              </h3>
              <div className="mt-4 rounded-xl bg-ibc-blue/5 px-5 py-4">
                <p className="font-display text-lg font-extrabold text-ibc-ink">
                  {settings.highlight_title}
                </p>
                <p className="mt-2 whitespace-pre-line text-sm text-ibc-ink/75">
                  {settings.highlight_body}
                </p>
              </div>
              <Link
                href="/equipe"
                className="mt-4 inline-block text-sm font-bold uppercase text-ibc-blue hover:underline"
              >
                See all teams →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* SPONSORS */}
      {sponsors.length > 0 && (
        <section className="border-t border-black/5 bg-ibc-ink/[0.02] py-14">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center font-display text-2xl font-bold uppercase text-ibc-blue">
              Our Sponsors
            </h2>
            <div className="mt-8 flex flex-wrap items-end justify-center gap-8">
              {sponsors.map((s) => {
                const isMain = s.tier === "main";
                return (
                  <a
                    key={s.id}
                    href={s.website_url || undefined}
                    target={s.website_url ? "_blank" : undefined}
                    rel={s.website_url ? "noopener noreferrer" : undefined}
                    className="flex flex-col items-center gap-2 text-center"
                    title={s.description || s.name}
                  >
                    {s.logo_data_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.logo_data_url}
                        alt={s.name}
                        className={isMain ? "h-28 w-auto object-contain" : "h-9 w-auto object-contain"}
                      />
                    ) : (
                      <span
                        className={`font-display font-bold text-ibc-blue ${isMain ? "text-2xl" : "text-sm"}`}
                      >
                        {s.name}
                      </span>
                    )}
                    <span className={isMain ? "text-sm text-ibc-ink/60" : "text-xs text-ibc-ink/60"}>
                      {s.name}
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function Fact({ label, value }) {
  return (
    <div>
      <p className="font-display text-lg font-bold uppercase text-ibc-blue sm:text-xl">{value}</p>
      <p className="text-xs uppercase tracking-wide text-ibc-ink/60">{label}</p>
    </div>
  );
}

