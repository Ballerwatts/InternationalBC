"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

export default function MembersSearch({ players, teams }) {
  const { t } = useLanguage();
  const [q, setQ] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return players.filter((p) => {
      const matchesTeam = teamFilter === "all" || String(p.team_id) === teamFilter;
      if (!matchesTeam) return false;
      if (!needle) return true;
      const haystack = `${p.first_name} ${p.last_name} ${p.team_name || ""} ${p.position || ""}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [players, teamFilter, q]);

  return (
    <div>
      <div className="mx-auto mb-8 flex max-w-2xl flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("members.searchPlaceholder")}
          className="flex-1 rounded-full border border-black/10 px-5 py-2.5 text-sm shadow-sm focus:border-ibc-blue focus:outline-none"
        />
        <select
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="rounded-full border border-black/10 px-4 py-2.5 text-sm shadow-sm focus:border-ibc-blue focus:outline-none"
        >
          <option value="all">{t("members.allTeams")}</option>
          {teams.map((t) => (
            <option key={t.id} value={String(t.id)}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-ibc-ink/50">{t("members.noMatch")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => (
            <Link
              key={p.id}
              href={`/membres/${p.id}`}
              className="group overflow-hidden rounded-xl border border-black/5 bg-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="relative aspect-square bg-ibc-blue">
                {p.photo_data_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.photo_data_url}
                    alt={`${p.first_name} ${p.last_name}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Image src="/logo.png" alt="" width={64} height={64} className="opacity-60" />
                  </div>
                )}
                {p.jersey_number && (
                  <span className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-ibc-accent font-display text-lg font-extrabold text-ibc-ink shadow">
                    {p.jersey_number}
                  </span>
                )}
              </div>
              <div className="p-3">
                <p className="font-display text-base font-bold uppercase leading-tight text-ibc-ink">
                  {p.first_name}
                  <br />
                  {p.last_name}
                </p>
                {p.team_name && (
                  <p className="mt-1 truncate text-xs font-semibold text-ibc-blue">{p.team_name}</p>
                )}
                {p.position && <p className="text-xs text-ibc-ink/60">{p.position}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
