"use client";

import { useCallback, useEffect, useState } from "react";

const STATUS_STYLES = {
  sent: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  dev: "bg-amber-100 text-amber-700",
};

const CATEGORIES = ["newsletter", "weekly_reminder", "access_request", "test", "other"];

const EMPTY_SMTP = { host: "", port: "587", secure: false, user: "", from: "", pass: "" };

const SOURCE_LABELS = {
  database: ["Saved here", "bg-green-100 text-green-700"],
  environment: ["From server environment", "bg-blue-100 text-blue-700"],
  none: ["Not configured", "bg-amber-100 text-amber-700"],
};

export default function EmailLogPage() {
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({});
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ category: "", status: "", q: "", from: "", to: "" });
  const [openId, setOpenId] = useState(null);
  const [smtp, setSmtp] = useState(null);
  const [form, setForm] = useState(EMPTY_SMTP);
  const [savedConfig, setSavedConfig] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [savingSmtp, setSavingSmtp] = useState(false);
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

  const loadSmtp = useCallback(() => {
    fetch("/api/email/smtp")
      .then((r) => r.json())
      .then((d) => {
        setSmtp(d.status);
        setSavedConfig(d.saved);
        // Prefill from whatever is live, so "edit" starts from the truth
        // rather than from an empty form. The password is never sent to the
        // browser, so its field always starts blank.
        setForm({
          host: d.saved?.host ?? d.status?.host ?? "",
          port: String(d.saved?.port ?? d.status?.port ?? 587),
          secure: !!(d.saved?.secure ?? d.status?.secure),
          user: d.saved?.user ?? d.status?.user ?? "",
          from: d.saved?.from ?? d.status?.from ?? "",
          pass: "",
        });
      })
      .catch(() => {});
  }, []);

  useEffect(loadSmtp, [loadSmtp]);

  async function saveSmtp(e) {
    e.preventDefault();
    if (!form.host.trim()) return;
    setSavingSmtp(true);
    setVerdict(null);
    const res = await fetch("/api/email/smtp", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, port: Number(form.port) || 587 }),
    });
    const data = await res.json();
    setSavingSmtp(false);
    if (res.ok) {
      loadSmtp();
      setVerdict({ ok: true, note: "Mailbox saved. Verify the connection to be sure it works." });
    } else {
      setVerdict({ error: data.error === "host_required" ? "A host is required." : data.error });
    }
  }

  async function deleteSmtp() {
    const fallback = smtp?.envAvailable
      ? "The site will fall back to the SMTP settings from the environment."
      : "The site will stop sending mail and log every message instead.";
    if (!confirm(`Delete the saved mailbox?\n\n${fallback}`)) return;
    await fetch("/api/email/smtp", { method: "DELETE" });
    loadSmtp();
    setVerdict({ ok: true, note: "Saved mailbox deleted." });
  }

  async function verify() {
    setVerifying(true);
    setVerdict(null);
    const res = await fetch("/api/email/verify", { method: "POST" });
    const data = await res.json();
    setVerifying(false);
    setVerdict(data);
    loadSmtp();
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

      {/* ── SMTP mailbox ── */}
      <section className="mt-5 rounded-xl border border-black/5 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-bold uppercase text-ibc-blue/70">Outgoing mailbox (SMTP)</h2>
            <p className="mt-1 text-xs text-ibc-ink/50">
              Any mailbox works — Gmail (with an app password, not your normal one), Infomaniak, your own
              domain. Saved here, it takes effect immediately; no redeploy.
            </p>
          </div>
          <SourceBadge status={smtp} />
        </div>

        {smtp && !smtp.configured && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            No mailbox is configured, so nothing is actually sent — every message is logged as{" "}
            <strong>dev</strong> instead. Fill this in to go live.
          </p>
        )}

        {smtp?.source === "database" && smtp?.envAvailable && (
          <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">
            These saved settings are overriding the SMTP environment variables set on the server. Delete
            them to fall back to those.
          </p>
        )}

        <form onSubmit={saveSmtp} className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-bold uppercase text-ibc-blue/70">Host</label>
            <input
              value={form.host}
              onChange={(e) => setForm({ ...form, host: e.target.value })}
              placeholder="mail.infomaniak.com"
              className="input w-full"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-ibc-blue/70">Port</label>
            <input
              type="number"
              value={form.port}
              onChange={(e) => setForm({ ...form, port: e.target.value })}
              className="input w-full"
            />
            <label className="mt-2 flex items-center gap-2 text-xs text-ibc-ink/60">
              <input
                type="checkbox"
                checked={form.secure}
                onChange={(e) => setForm({ ...form, secure: e.target.checked })}
              />
              Implicit TLS (tick for port 465; 587 and 25 use STARTTLS)
            </label>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-ibc-blue/70">Username</label>
            <input
              value={form.user}
              onChange={(e) => setForm({ ...form, user: e.target.value })}
              placeholder="no-reply@yourdomain.ch"
              className="input w-full"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-ibc-blue/70">Password</label>
            <input
              type="password"
              value={form.pass}
              onChange={(e) => setForm({ ...form, pass: e.target.value })}
              placeholder={savedConfig?.hasPassword ? "•••••••• — leave blank to keep it" : "App password"}
              autoComplete="new-password"
              className="input w-full"
            />
            <p className="mt-1 text-xs text-ibc-ink/40">
              Stored encrypted and never shown again — not even masked.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-ibc-blue/70">From address</label>
            <input
              value={form.from}
              onChange={(e) => setForm({ ...form, from: e.target.value })}
              placeholder="IBBC <no-reply@yourdomain.ch>"
              className="input w-full"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <button
              disabled={savingSmtp || !form.host.trim()}
              className="rounded-full bg-ibc-blue px-5 py-2 text-sm font-bold uppercase text-white disabled:opacity-40"
            >
              {savingSmtp ? "Saving…" : savedConfig ? "Save changes" : "Save mailbox"}
            </button>
            <button
              type="button"
              onClick={verify}
              disabled={verifying}
              className="rounded-full border border-ibc-blue px-4 py-2 text-sm font-bold uppercase text-ibc-blue disabled:opacity-40"
            >
              {verifying ? "Checking…" : "Verify connection"}
            </button>
            {savedConfig && (
              <button
                type="button"
                onClick={deleteSmtp}
                className="ml-auto rounded-full border border-red-200 px-4 py-2 text-sm font-bold uppercase text-red-600 hover:bg-red-50"
              >
                Delete mailbox
              </button>
            )}
          </div>
        </form>

        {savedConfig?.updated_at && (
          <p className="mt-2 text-xs text-ibc-ink/40">Last changed {savedConfig.updated_at.slice(0, 16)}.</p>
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

        <form onSubmit={sendTest} className="mt-4 flex flex-wrap items-end gap-2 border-t border-black/5 pt-4">
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

function SourceBadge({ status }) {
  if (!status) return null;
  const [label, classes] = SOURCE_LABELS[status.source] || SOURCE_LABELS.none;
  return <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${classes}`}>{label}</span>;
}
