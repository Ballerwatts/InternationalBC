"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NewsletterChromeEditor from "@/components/NewsletterChromeEditor";

const STATUS_STYLES = {
  draft: "bg-black/5 text-ibc-ink/60",
  scheduled: "bg-amber-100 text-amber-700",
  sending: "bg-blue-100 text-blue-700",
  sent: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

export default function NewsletterListPage() {
  const [issues, setIssues] = useState([]);
  const [teams, setTeams] = useState([]);
  const [creating, setCreating] = useState(false);
  const [newTeamId, setNewTeamId] = useState("");
  const [busy, setBusy] = useState(false);
  const [posting, setPosting] = useState(null);
  const [postMsg, setPostMsg] = useState("");

  // One click puts an issue on the home page without sending it and without
  // composing anything — writing a whole newsletter to publish one item of
  // club news is more work than the job deserves. What it creates is a normal
  // announcement, managed from Announcements from then on.
  async function togglePost(item) {
    setPosting(item.id);
    setPostMsg("");
    const res = await fetch(`/api/newsletters/${item.id}/post`, {
      method: item.post_enabled ? "DELETE" : "POST",
    });
    setPosting(null);
    setPostMsg(
      !res.ok
        ? "Échec — réessayez."
        : item.post_enabled
        ? "Retiré de la page d'accueil."
        : "Publié — modifiable depuis Announcements."
    );
    setTimeout(() => setPostMsg(""), 4000);
    refresh();
  }

  function refresh() {
    fetch("/api/newsletters").then((r) => r.json()).then((d) => setIssues(Array.isArray(d) ? d : []));
  }

  useEffect(() => {
    refresh();
    fetch("/api/admin/teams").then((r) => r.json()).then((d) => setTeams(Array.isArray(d) ? d : []));
  }, []);

  async function createIssue(e) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/newsletters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ team_id: newTeamId || null }),
    });
    const created = await res.json();
    setBusy(false);
    setCreating(false);
    if (created?.id) window.location.href = `/admin/newsletter/${created.id}`;
    else refresh();
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-extrabold uppercase text-ibc-blue">Newsletter</h1>
        <button
          onClick={() => setCreating((c) => !c)}
          className="rounded-full bg-ibc-blue px-5 py-2 text-sm font-bold uppercase text-white hover:brightness-110"
        >
          {creating ? "Cancel" : "+ New issue"}
        </button>
      </div>

      <div className="mt-6">
        <NewsletterChromeEditor />
      </div>
      <p className="mt-1 text-sm text-ibc-ink/60">
        A weekly email of results, fixtures and club news. Each issue targets one squad — or the whole
        club. Drafts are built automatically every Monday; nothing goes out until you send it.
      </p>

      {creating && (
        <form onSubmit={createIssue} className="mt-4 rounded-xl border border-black/5 bg-white p-5 shadow-sm">
          <label className="mb-1 block text-xs font-bold uppercase text-ibc-blue/70">Who is this issue for?</label>
          <select value={newTeamId} onChange={(e) => setNewTeamId(e.target.value)} className="input">
            <option value="">Whole club</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-ibc-ink/50">
            The squad decides both who receives it and which results, fixtures and news go in it.
          </p>
          <button
            disabled={busy}
            className="mt-3 rounded-full bg-ibc-blue px-5 py-2 text-sm font-bold uppercase text-white disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create draft"}
          </button>
        </form>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border border-black/5 bg-white shadow-sm">
        {issues.length === 0 ? (
          <p className="p-8 text-center text-sm text-ibc-ink/50">
            No issues yet. Create one, or wait for Monday&apos;s automatic draft.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/5 text-xs uppercase text-ibc-ink/50">
              <tr>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Squad</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Recipients</th>
                <th className="px-4 py-3">Sent</th>
                <th className="px-4 py-3">Page d'accueil</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((n) => (
                <tr key={n.id} className="border-b border-black/5 last:border-0 hover:bg-black/[.02]">
                  <td className="px-4 py-3">
                    <Link href={`/admin/newsletter/${n.id}`} className="font-bold text-ibc-blue hover:underline">
                      {n.subject}
                    </Link>
                    {n.week_start_date && (
                      <span className="ml-2 text-xs text-ibc-ink/40">week of {n.week_start_date}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ibc-ink/70">{n.team_name || "Whole club"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${
                        STATUS_STYLES[n.status] || STATUS_STYLES.draft
                      }`}
                    >
                      {n.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ibc-ink/70">
                    {n.sent_count || 0}
                    {n.failed_count ? <span className="text-red-600"> · {n.failed_count} failed</span> : null}
                    {n.recipient_count ? <span className="text-ibc-ink/40"> / {n.recipient_count}</span> : null}
                  </td>
                  <td className="px-4 py-3 text-xs text-ibc-ink/50">{n.sent_at ? n.sent_at.slice(0, 16) : "—"}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={posting === n.id}
                      onClick={() => togglePost(n)}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase transition disabled:opacity-50 ${
                        n.post_enabled
                          ? "bg-green-600 text-white hover:brightness-110"
                          : "border border-ibc-blue/30 text-ibc-blue hover:bg-ibc-blue/10"
                      }`}
                    >
                      {posting === n.id ? "…" : n.post_enabled ? "En ligne" : "Publier"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {postMsg && (
          <p className="mt-3 text-xs font-semibold text-ibc-blue">{postMsg}</p>
        )}
      </div>
    </div>
  );
}
