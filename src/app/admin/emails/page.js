"use client";

import { useCallback, useEffect, useState } from "react";

const STATUS_STYLES = {
  sent: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  dev: "bg-amber-100 text-amber-700",
};

const CATEGORIES = ["newsletter", "weekly_reminder", "access_request", "test", "other"];

export default function EmailLogPage() {
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({});
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ category: "", status: "", q: "", from: "", to: "" });
  const [openId, setOpenId] = useState(null);
  const [smtp, setSmtp] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [verdict, setVerdict] = useState(null);
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);

  const refresh = useCallback(() => {
    const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));
    fetch(`/api/email/log?${qs}`)
      .then((r) => r.json())
      .then((d) => {
        setRows(d.rows || []);
        setCounts(d.counts || {});
        setTotal(d.total || 0);
      });
  }, [filters]);

  useEffect(() => {
    const t = setTimeout(refresh, 250);
    return () => clearTimeout(t);
  }, [refresh]);

  useEffect(() => {
    fetch("/api/email/verify").then((r) => r.json()).then(setSmtp).catch(() => {});
  }, []);

  async function verify() {
    setVerifying(true);
    setVerdict(null);
    const res = await fetch("/api/email/verify", { method: "POST" });
    const data = await res.json();
    setVerifying(false);
    setVerdict(data);
  }

  async function sendTest(e) {
    e.preventDefault();
    setTesting(true);
    const res = await fetch("/api/email/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: testTo || undefined }),
    });
    const data = await res.json();
    setTesting(false);
    setVerdict(data.ok ? { ok: true, note: data.dev ? `Dev mode — logged, not sent (${data.to})` : `Test sent to ${data.to}` } : data);
    refresh();
  }

  async function retryFailed(newsletterId) {
    if (!confirm("Retry the failed recipients of this issue? Anyone already delivered is skipped.")) return;
    await fetch(`/api/newsletters/${newsletterId}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    refresh();
  }

  const failedNewsletters = [...new Set(rows.filter((r) => r.status === "failed" && r.newsletter_id).map((r) => r.newsletter_id))];

  return (
    <div className="max-w-6xl">
      <h1 className="font-display text-3xl font-extrabold uppercase text-ibc-blue">Email log</h1>
      <p className="mt-1 text-sm text-ibc-ink/60">
        Every message the site sends — newsletters, Monday reminders, account mail — with what the mail
        server said back.
      </p>

      {/* ── SMTP status ── */}
      <section className="mt-5 rounded-xl border border-black/5 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xs font-bold uppercase text-ibc-blue/70">SMTP</h2>
          <button
            onClick={verify}
            disabled={verifying}
            className="rounded-full border border-ibc-blue px-4 py-1.5 text-xs font-bold uppercase text-ibc-blue disabled:opacity-40"
          >
            {verifying ? "Checking…" : "Verify connection"}
          </button>
        </div>

        {smtp && (
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <Field label="Host" value={smtp.host} />
            <Field label="Port" value={smtp.port} />
            <Field label="User" value={smtp.user} />
            <Field label="Password" value={smtp.hasPassword ? "set" : null} />
            <Field label="From" value={smtp.from} />
            <Field label="Site URL" value={smtp.siteUrl} />
          </div>
        )}

        {smtp && !smtp.configured && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            SMTP_HOST is not set, so nothing is actually mailed — every send is logged as{" "}
            <strong>dev</strong> instead. Set the SMTP secrets on Fly to go live.
          </p>
        )}

        {verdict && (
          <p
            className={`mt-3 rounded-lg px-3 py-2 text-sm ${
              verdict.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
            }`}
          >
            {verdict.ok ? verdict.note || "Connection OK — the server accepted our credentials." : verdict.error}
          </p>
        )}

        <form onSubmit={sendTest} className="mt-4 flex flex-wrap items-end gap-2">
          <div className="min-w-[240px] flex-1">
            <label className="mb-1 block text-xs font-bold uppercase text-ibc-blue/70">Send a test message</label>
            <input
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              placeholder="Leave empty to send to yourself"
              className="input w-full"
            />
          </div>
          <button
            disabled={testing}
            className="rounded-full bg-ibc-blue px-5 py-2 text-sm font-bold uppercase text-white disabled:opacity-40"
          >
            {testing ? "Sending…" : "Send test"}
          </button>
        </form>
      </section>

      {/* ── filters ── */}
      <section className="mt-5 rounded-xl border border-black/5 bg-white p-4 shadow-sm">
        <div className="grid gap-2 sm:grid-cols-5">
          <select
            value={filters.category}
            onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
            className="input"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.replace("_", " ")}
              </option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            className="input"
          >
            <option value="">All statuses</option>
            <option value="sent">sent</option>
            <option value="failed">failed</option>
            <option value="dev">dev</option>
          </select>
          <input
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            placeholder="Address or subject"
            className="input"
          />
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            className="input"
          />
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            className="input"
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <span className="font-bold text-ibc-ink">{total} message(s)</span>
          {Object.entries(counts).map(([status, n]) => (
            <span key={status} className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${STATUS_STYLES[status] || ""}`}>
              {n} {status}
            </span>
          ))}
          {failedNewsletters.map((nid) => (
            <button
              key={nid}
              onClick={() => retryFailed(nid)}
              className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold uppercase text-white hover:brightness-110"
            >
              Retry failed — issue #{nid}
            </button>
          ))}
        </div>
      </section>

      {/* ── the log ── */}
      <div className="mt-5 overflow-hidden rounded-xl border border-black/5 bg-white shadow-sm">
        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-ibc-ink/50">Nothing matches those filters.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/5 text-xs uppercase text-ibc-ink/50">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">To</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setOpenId(openId === r.id ? null : r.id)}
                  className="cursor-pointer border-b border-black/5 last:border-0 align-top hover:bg-black/[.02]"
                >
                  <td className="px-4 py-3 text-xs text-ibc-ink/50">{r.created_at?.slice(0, 16)}</td>
                  <td className="px-4 py-3 text-ibc-ink">{r.to_email}</td>
                  <td className="px-4 py-3 text-ibc-ink/70">
                    {r.subject}
                    {openId === r.id && (
                      <div className="mt-2 rounded-lg bg-black/[.03] p-3 text-xs text-ibc-ink/70">
                        <p>
                          <strong>Message id:</strong> {r.message_id || "—"}
                        </p>
                        <p className="mt-1 break-words">
                          <strong>Server said:</strong> {r.response || "—"}
                        </p>
                        {r.newsletter_id && (
                          <p className="mt-1">
                            <strong>Issue:</strong>{" "}
                            <a href={`/admin/newsletter/${r.newsletter_id}`} className="text-ibc-blue underline">
                              #{r.newsletter_id}
                            </a>
                          </p>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-ibc-ink/50">{r.category?.replace("_", " ")}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${STATUS_STYLES[r.status] || ""}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <p className="flex items-center gap-2">
      <span className="text-xs font-bold uppercase text-ibc-ink/40">{label}</span>
      {value ? (
        <span className="text-ibc-ink">{value}</span>
      ) : (
        <span className="rounded bg-red-50 px-2 py-0.5 text-xs font-bold uppercase text-red-700">not set</span>
      )}
    </p>
  );
}
