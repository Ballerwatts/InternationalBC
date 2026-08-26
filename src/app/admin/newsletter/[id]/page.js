"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import NewsletterPostPanel from "@/components/NewsletterPostPanel";

// Careful: this file is a client component, so it must never import
// anything that reaches src/lib/db.js. The preview is rendered server-side
// by /api/newsletters/[id]/preview — which calls the same renderNewsletter()
// the sender uses, so what you approve here is what leaves the building.

const AUDIENCE_OPTIONS = [
  { key: "players", label: "Players", hint: "Everyone on the squad list with an address on file" },
  { key: "users", label: "Accounts", hint: "Anyone who can log in: admins, coaches, players" },
  { key: "guardians", label: "Guardians", hint: "Parents of under-18 players who opted in" },
];

const BLOCK_LABELS = {
  intro: "Intro",
  results: "Results",
  fixtures: "What's coming up",
  player: "Player of the week",
  practice: "On the floor this week",
  news: "Club news",
  sponsors: "Sponsors",
};

function blockSummary(block) {
  switch (block.type) {
    case "intro":
      return block.text ? `${block.text.slice(0, 60)}${block.text.length > 60 ? "…" : ""}` : "Empty — will be skipped";
    case "results":
      return `${(block.games || []).length} game(s)`;
    case "fixtures":
      return `${(block.events || []).length} event(s)`;
    case "player":
      return block.player?.name || "No player — will be skipped";
    case "practice":
      return block.focus || (block.drills ? "Drills only" : "Empty — will be skipped");
    case "news":
      return `${(block.items || []).length} announcement(s)`;
    case "sponsors":
      return `${(block.sponsors || []).length} logo(s)`;
    default:
      return "";
  }
}

export default function ComposeNewsletterPage({ params }) {
  const { id } = params;
  const [issue, setIssue] = useState(null);
  const [teams, setTeams] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [teamId, setTeamId] = useState("");
  const [audience, setAudience] = useState(["players", "users"]);
  const [count, setCount] = useState(null);
  const [preview, setPreview] = useState("");
  const [width, setWidth] = useState(640);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState("");
  const [flash, setFlash] = useState("");
  const [confirming, setConfirming] = useState(false);
  const loaded = useRef(false);

  /* ── load ── */
  useEffect(() => {
    fetch(`/api/newsletters/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setIssue(d);
        setSubject(d.subject || "");
        setPreheader(d.preheader || "");
        setTeamId(d.team_id ? String(d.team_id) : "");
        setAudience(String(d.audience || "").split(",").filter(Boolean));
        try {
          setBlocks(JSON.parse(d.blocks_json || "[]"));
        } catch {
          setBlocks([]);
        }
        loaded.current = true;
      });
    fetch("/api/admin/teams").then((r) => r.json()).then((d) => setTeams(Array.isArray(d) ? d : []));
  }, [id]);

  /* ── live recipient count, follows the picker before anything is saved ── */
  useEffect(() => {
    if (!loaded.current) return;
    const qs = new URLSearchParams({ team_id: teamId, audience: audience.join(",") });
    fetch(`/api/newsletters/${id}/recipients?${qs}`)
      .then((r) => r.json())
      .then(setCount)
      .catch(() => setCount(null));
  }, [id, teamId, audience]);

  /* ── preview, debounced so typing a subject doesn't hammer the route ── */
  const refreshPreview = useCallback(() => {
    fetch(`/api/newsletters/${id}/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, preheader, team_id: teamId || null, blocks }),
    })
      .then((r) => r.json())
      .then((d) => setPreview(d.html || ""))
      .catch(() => {});
  }, [id, subject, preheader, teamId, blocks]);

  useEffect(() => {
    if (!loaded.current) return;
    const t = setTimeout(refreshPreview, 400);
    return () => clearTimeout(t);
  }, [refreshPreview]);

  const sent = issue?.status === "sent";

  async function save(extra = {}) {
    setSaving(true);
    const res = await fetch(`/api/newsletters/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject,
        preheader,
        team_id: teamId || null,
        audience: audience.join(","),
        blocks,
        ...extra,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setFlash("Saved");
      setTimeout(() => setFlash(""), 1800);
    }
    return res.ok;
  }

  async function generate() {
    setBusy("generate");
    await save();
    const res = await fetch(`/api/newsletters/${id}/generate`, { method: "POST" });
    const data = await res.json();
    if (data.blocks) setBlocks(data.blocks);
    setBusy("");
    setFlash("Filled from this week's data");
    setTimeout(() => setFlash(""), 2400);
  }

  async function sendTest() {
    setBusy("test");
    await save();
    const res = await fetch(`/api/newsletters/${id}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ test: true }),
    });
    const data = await res.json();
    setBusy("");
    setFlash(data.ok ? (data.dev ? `Dev mode — logged, not sent (${data.to})` : `Test sent to ${data.to}`) : "Test failed");
    setTimeout(() => setFlash(""), 4000);
  }

  async function sendNow() {
    setBusy("send");
    setConfirming(false);
    await save();
    const res = await fetch(`/api/newsletters/${id}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    setBusy("");
    if (data.ok) {
      setFlash(`Sent to ${data.sent} recipient(s)${data.failed ? `, ${data.failed} failed` : ""}`);
      fetch(`/api/newsletters/${id}`).then((r) => r.json()).then(setIssue);
    } else {
      setFlash(data.error || "Send failed");
    }
    setTimeout(() => setFlash(""), 6000);
  }

  /* ── block editing ── */
  const move = (index, delta) => {
    setBlocks((bs) => {
      const next = [...bs];
      const target = index + delta;
      if (target < 0 || target >= next.length) return bs;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };
  const remove = (index) => setBlocks((bs) => bs.filter((_, i) => i !== index));
  const patch = (index, changes) =>
    setBlocks((bs) => bs.map((b, i) => (i === index ? { ...b, ...changes } : b)));

  const teamName = useMemo(
    () => (teamId ? teams.find((t) => String(t.id) === String(teamId))?.name : "the whole club"),
    [teamId, teams]
  );

  if (!issue) return <p className="p-8 text-sm text-ibc-ink/50">Loading…</p>;

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/newsletter" className="text-xs font-bold uppercase text-ibc-blue/60 hover:underline">
            ← All issues
          </Link>
          <h1 className="font-display text-3xl font-extrabold uppercase text-ibc-blue">Compose</h1>
        </div>
        <div className="flex items-center gap-2">
          {flash && <span className="text-sm font-bold text-green-700">{flash}</span>}
          <button
            onClick={() => save()}
            disabled={saving || sent}
            className="rounded-full border border-ibc-blue px-4 py-2 text-sm font-bold uppercase text-ibc-blue disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save draft"}
          </button>
          <button
            onClick={sendTest}
            disabled={!!busy}
            className="rounded-full border border-black/10 px-4 py-2 text-sm font-bold uppercase text-ibc-ink/70 disabled:opacity-40"
          >
            {busy === "test" ? "Sending…" : "Send test to me"}
          </button>
          <button
            onClick={() => setConfirming(true)}
            disabled={!!busy || sent || !count?.total}
            className="rounded-full bg-ibc-blue px-5 py-2 text-sm font-bold uppercase text-white disabled:opacity-40"
          >
            {sent ? "Sent" : busy === "send" ? "Sending…" : "Send now"}
          </button>
        </div>
      </div>

      {sent && (
        <p className="mt-3 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
          This issue went out on {issue.sent_at?.slice(0, 16)}. It can no longer be edited — create a new
          issue instead.
        </p>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* ── left: the editor ── */}
        <div className="space-y-5">
          <section className="rounded-xl border border-black/5 bg-white p-5 shadow-sm">
            <label className="mb-1 block text-xs font-bold uppercase text-ibc-blue/70">Subject</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className="input" disabled={sent} />
            <p className={`mt-1 text-xs ${subject.length > 60 ? "text-amber-600" : "text-ibc-ink/40"}`}>
              {subject.length} characters — inboxes cut around 60.
            </p>

            <label className="mb-1 mt-4 block text-xs font-bold uppercase text-ibc-blue/70">Preheader</label>
            <input
              value={preheader}
              onChange={(e) => setPreheader(e.target.value)}
              className="input"
              disabled={sent}
              placeholder="The preview line shown after the subject in the inbox"
            />
            <p className={`mt-1 text-xs ${preheader.length > 100 ? "text-amber-600" : "text-ibc-ink/40"}`}>
              {preheader.length} characters — aim for 40–100.
            </p>
          </section>

          <section className="rounded-xl border border-black/5 bg-white p-5 shadow-sm">
            <h2 className="text-xs font-bold uppercase text-ibc-blue/70">Audience</h2>
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="input mt-2"
              disabled={sent}
            >
              <option value="">Whole club</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            <div className="mt-3 space-y-2">
              {AUDIENCE_OPTIONS.map((o) => (
                <label key={o.key} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={audience.includes(o.key)}
                    disabled={sent}
                    onChange={(e) =>
                      setAudience((a) => (e.target.checked ? [...a, o.key] : a.filter((x) => x !== o.key)))
                    }
                    className="mt-1"
                  />
                  <span>
                    <span className="font-bold text-ibc-ink">{o.label}</span>
                    <span className="block text-xs text-ibc-ink/50">{o.hint}</span>
                  </span>
                </label>
              ))}
            </div>

            <p className="mt-3 rounded-lg bg-ibc-blue/5 px-3 py-2 text-sm font-bold text-ibc-blue">
              {count ? count.summary : "Counting…"}
            </p>
            {count?.skipped ? (
              <p className="mt-1 text-xs text-ibc-ink/50">
                {count.skipped} skipped —{" "}
                {Object.entries(count.skipped_reasons || {})
                  .map(([reason, n]) => `${n} ${reason.replace("_", " ")}`)
                  .join(", ")}
              </p>
            ) : null}
          </section>

          <section className="rounded-xl border border-black/5 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase text-ibc-blue/70">Content</h2>
              <button
                onClick={generate}
                disabled={!!busy || sent}
                className="rounded-full bg-ibc-blue/10 px-4 py-1.5 text-xs font-bold uppercase text-ibc-blue disabled:opacity-40"
              >
                {busy === "generate" ? "Building…" : "Generate from this week's data"}
              </button>
            </div>

            {blocks.length === 0 && (
              <p className="mt-4 text-sm text-ibc-ink/50">
                Nothing in this issue yet. Use &ldquo;Generate&rdquo; to pull in {teamName}&apos;s results,
                fixtures and news.
              </p>
            )}

            <div className="mt-3 space-y-2">
              {blocks.map((block, index) => (
                <div key={`${block.type}-${index}`} className="rounded-lg border border-black/5 bg-black/[.015] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-sm font-bold text-ibc-ink">{BLOCK_LABELS[block.type] || block.type}</span>
                      <span className="ml-2 text-xs text-ibc-ink/50">{blockSummary(block)}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => move(index, -1)}
                        disabled={sent || index === 0}
                        className="rounded px-2 py-1 text-xs text-ibc-ink/60 hover:bg-black/5 disabled:opacity-30"
                        aria-label="Move up"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => move(index, 1)}
                        disabled={sent || index === blocks.length - 1}
                        className="rounded px-2 py-1 text-xs text-ibc-ink/60 hover:bg-black/5 disabled:opacity-30"
                        aria-label="Move down"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => remove(index)}
                        disabled={sent}
                        className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-30"
                        aria-label="Remove block"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {block.type === "intro" && (
                    <textarea
                      value={block.text || ""}
                      onChange={(e) => patch(index, { text: e.target.value })}
                      disabled={sent}
                      rows={4}
                      placeholder="A few words from the coach or the committee. Left empty, this block is skipped."
                      className="input mt-2 w-full"
                    />
                  )}

                  {block.type === "player" && block.player && (
                    <input
                      value={block.player.note || ""}
                      onChange={(e) => patch(index, { player: { ...block.player, note: e.target.value } })}
                      disabled={sent}
                      placeholder="One sentence on why they earned it"
                      className="input mt-2 w-full"
                    />
                  )}

                  {block.type === "practice" && (
                    <input
                      value={block.focus || ""}
                      onChange={(e) => patch(index, { focus: e.target.value })}
                      disabled={sent}
                      placeholder="This week's focus"
                      className="input mt-2 w-full"
                    />
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ── right: the preview ── */}
        <div>
          <div className="sticky top-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase text-ibc-blue/70">Preview</h2>
              <div className="flex gap-1">
                {[
                  { w: 640, label: "Desktop" },
                  { w: 375, label: "Mobile" },
                ].map((o) => (
                  <button
                    key={o.w}
                    onClick={() => setWidth(o.w)}
                    className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                      width === o.w ? "bg-ibc-blue text-white" : "bg-black/5 text-ibc-ink/60"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-black/5 bg-[#f4f5fa] shadow-sm">
              <iframe
                title="Newsletter preview"
                srcDoc={preview}
                sandbox=""
                style={{ width, maxWidth: "100%", height: "72vh", border: 0, display: "block", margin: "0 auto" }}
              />
            </div>
          </div>
        </div>
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="font-display text-xl font-extrabold uppercase text-ibc-blue">Send this issue?</h3>
            <p className="mt-3 text-sm text-ibc-ink">
              <strong>{count?.total || 0} recipient(s)</strong> — {teamId ? teamName : "the whole club"}.
            </p>
            <p className="mt-1 text-sm text-ibc-ink/60">{count?.summary}</p>
            <p className="mt-3 text-xs text-ibc-ink/50">
              Sending cannot be undone. Each person receives their own copy with their own unsubscribe link.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirming(false)}
                className="rounded-full border border-black/10 px-4 py-2 text-sm font-bold uppercase text-ibc-ink/70"
              >
                Cancel
              </button>
              <button
                onClick={sendNow}
                className="rounded-full bg-ibc-blue px-5 py-2 text-sm font-bold uppercase text-white"
              >
                Send to {count?.total || 0}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6">
        {issue && <NewsletterPostPanel newsletter={issue} />}
      </div>
    </div>
  );
}
