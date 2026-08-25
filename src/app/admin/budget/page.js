"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { todayISO } from "@/lib/dates";

const CATEGORY_LABELS = { gym: "Gym", license: "License", referee: "Referees", other: "Other" };

const EXPENSE_CATEGORIES = [
  { value: "gym", label: "Gym" },
  { value: "license", label: "License (per person)" },
  { value: "referees", label: "Referees" },
  { value: "diner", label: "Team dinner" },
  { value: "team_event", label: "Team event" },
  { value: "other", label: "Other" },
];

const INCOME_CATEGORIES = [
  { value: "player_fees", label: "Player dues" },
  { value: "sponsor", label: "Sponsor" },
  { value: "other", label: "Other" },
];

const ENTRY_CATEGORY_LABELS = Object.fromEntries(
  [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].map((c) => [c.value, c.label])
);

const EMPTY_ENTRY = {
  entry_type: "expense",
  category: "gym",
  amount: "",
  entry_date: todayISO(),
  description: "",
};

export default function BudgetAdminPage() {
  const [entries, setEntries] = useState([]);
  const [entryForm, setEntryForm] = useState(EMPTY_ENTRY);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [editingEntryForm, setEditingEntryForm] = useState(null);

  const [settings, setSettings] = useState(null);
  const [summary, setSummary] = useState(null);
  const [teams, setTeams] = useState([]);
  const [teamFilter, setTeamFilter] = useState("");
  const [openPlayerId, setOpenPlayerId] = useState(null);
  const [payments, setPayments] = useState([]);
  const [form, setForm] = useState({ category: "gym", amount: "", paid_on: "", note: "" });
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const [editingPaymentForm, setEditingPaymentForm] = useState(null);
  const [showDues, setShowDues] = useState(false);
  const [licenseBusyId, setLicenseBusyId] = useState(null);
  // "" = everyone · "unpaid" = still owes money · "license_unpaid" = licence not paid
  const [dueFilter, setDueFilter] = useState("");

  function refreshEntries() {
    fetch("/api/budget/entries").then((r) => r.json()).then(setEntries);
  }

  function refreshSummary() {
    fetch("/api/budget/summary").then((r) => r.json()).then(setSummary);
  }

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then(setSettings);
    fetch("/api/admin/teams").then((r) => r.json()).then(setTeams);
    refreshSummary();
    refreshEntries();
  }, []);

  async function addEntry(e) {
    e.preventDefault();
    if (!entryForm.amount) return;
    await fetch("/api/budget/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...entryForm, amount: Number(entryForm.amount) }),
    });
    setEntryForm({ ...EMPTY_ENTRY, entry_type: entryForm.entry_type });
    refreshEntries();
  }

  async function deleteEntry(id) {
    if (!confirm("Delete this line?")) return;
    await fetch(`/api/budget/entries/${id}`, { method: "DELETE" });
    refreshEntries();
  }

  function startEditEntry(e) {
    setEditingEntryId(e.id);
    setEditingEntryForm({ ...e });
  }

  async function saveEditEntry() {
    await fetch(`/api/budget/entries/${editingEntryId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editingEntryForm, amount: Number(editingEntryForm.amount) }),
    });
    setEditingEntryId(null);
    setEditingEntryForm(null);
    refreshEntries();
  }

  async function saveBudgetSettings(e) {
    e.preventDefault();
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        budget_annual_total: settings.budget_annual_total,
        budget_gym: settings.budget_gym,
        budget_license: settings.budget_license,
        budget_referee: settings.budget_referee,
      }),
    });
    refreshSummary();
  }

  function openPlayer(id) {
    if (openPlayerId === id) {
      setOpenPlayerId(null);
      return;
    }
    setOpenPlayerId(id);
    fetch(`/api/players/${id}/payments`).then((r) => r.json()).then(setPayments);
  }

  async function addPayment(playerId) {
    if (!form.amount) return;
    await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player_id: playerId, season: "2026-2027", ...form, amount: Number(form.amount) }),
    });
    setForm({ category: "gym", amount: "", paid_on: "", note: "" });
    fetch(`/api/players/${playerId}/payments`).then((r) => r.json()).then(setPayments);
    refreshSummary();
  }

  async function deletePayment(id, playerId) {
    await fetch(`/api/payments/${id}`, { method: "DELETE" });
    fetch(`/api/players/${playerId}/payments`).then((r) => r.json()).then(setPayments);
    refreshSummary();
  }

  function startEditPayment(pay) {
    setEditingPaymentId(pay.id);
    setEditingPaymentForm({ ...pay });
  }

  async function saveEditPayment(playerId) {
    await fetch(`/api/payments/${editingPaymentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editingPaymentForm, amount: Number(editingPaymentForm.amount) }),
    });
    setEditingPaymentId(null);
    setEditingPaymentForm(null);
    fetch(`/api/players/${playerId}/payments`).then((r) => r.json()).then(setPayments);
    refreshSummary();
  }

  async function saveDueAmount(playerId, value) {
    await fetch(`/api/players/${playerId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ custom_due_amount: value === "" ? "" : Number(value) }),
    });
    refreshSummary();
  }

  async function toggleLicense(playerId, currentlyPaid) {
    setLicenseBusyId(playerId);
    await fetch(`/api/players/${playerId}/license`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paid: !currentlyPaid }),
    });
    await refreshSummary();
    if (openPlayerId === playerId) {
      fetch(`/api/players/${playerId}/payments`).then((r) => r.json()).then(setPayments);
    }
    setLicenseBusyId(null);
  }

  const totalIn = entries.filter((e) => e.entry_type === "income").reduce((s, e) => s + e.amount, 0);
  const totalOut = entries.filter((e) => e.entry_type === "expense").reduce((s, e) => s + e.amount, 0);
  const netBalance = totalIn - totalOut;

  const duePlayers = useMemo(() => {
    if (!summary) return [];
    let rows = summary.players;
    if (teamFilter) rows = rows.filter((p) => String(p.team_id || "") === teamFilter);
    // "Unpaid" chip: narrow the table to whoever still owes money, and to
    // whoever hasn't paid their licence, respectively.
    if (dueFilter === "unpaid") rows = rows.filter((p) => p.balance > 0);
    if (dueFilter === "license_unpaid") rows = rows.filter((p) => !p.licensePaid);
    return rows;
  }, [summary, teamFilter, dueFilter]);

  // Totals for exactly what the table is currently showing, so filtering by
  // team or by "unpaid" gives the amount owed by that subset — not the club
  // total. Recomputed from the rows, so it follows every paid/unpaid click.
  const shownTotals = useMemo(
    () =>
      duePlayers.reduce(
        (acc, p) => {
          acc.due += p.totalDue;
          acc.paid += p.totalPaid;
          if (p.balance > 0) {
            acc.outstanding += p.balance;
            acc.unpaidPlayers += 1;
          }
          if (!p.licensePaid) acc.licenseOutstanding += p.licenseDue || 0;
          return acc;
        },
        { due: 0, paid: 0, outstanding: 0, unpaidPlayers: 0, licenseOutstanding: 0 }
      ),
    [duePlayers]
  );

  if (!settings || !summary) return <p className="text-ibc-ink/60">Loading…</p>;

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-3xl font-extrabold uppercase text-ibc-blue">
        Season Budget — Cash Book
      </h1>
      <p className="mt-1 text-sm text-ibc-ink/60">
        Every money in (&quot;in&apos;s&quot;) and out (&quot;out&apos;s&quot;) for the club.
      </p>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <SummaryCard label="In's" value={totalIn} tone="green" />
        <SummaryCard label="Out's" value={totalOut} tone="red" />
        <SummaryCard label="Net balance" value={netBalance} tone={netBalance >= 0 ? "green" : "red"} />
      </div>

      <form
        onSubmit={addEntry}
        className="mt-6 grid grid-cols-2 gap-3 rounded-xl border border-black/5 bg-white p-5 shadow-sm sm:grid-cols-5"
      >
        <select
          value={entryForm.entry_type}
          onChange={(e) =>
            setEntryForm({
              ...entryForm,
              entry_type: e.target.value,
              category: e.target.value === "income" ? "player_fees" : "gym",
            })
          }
          className="input"
        >
          <option value="expense">Out</option>
          <option value="income">In</option>
        </select>
        <select
          value={entryForm.category}
          onChange={(e) => setEntryForm({ ...entryForm, category: e.target.value })}
          className="input"
        >
          {(entryForm.entry_type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Amount CHF"
          value={entryForm.amount}
          onChange={(e) => setEntryForm({ ...entryForm, amount: e.target.value })}
          className="input"
        />
        <input
          type="date"
          value={entryForm.entry_date}
          onChange={(e) => setEntryForm({ ...entryForm, entry_date: e.target.value })}
          className="input"
        />
        <input
          placeholder="Description (optional)"
          value={entryForm.description}
          onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })}
          className="input"
        />
        <button className="col-span-2 rounded-full bg-ibc-blue px-5 py-2 text-sm font-bold uppercase text-white hover:brightness-110 sm:col-span-5 sm:w-fit">
          + Add line
        </button>
      </form>

      <div className="mt-4 overflow-hidden rounded-xl border border-black/5 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/5 text-left text-xs uppercase text-ibc-ink/50">
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ibc-ink/50">
                  No lines yet.
                </td>
              </tr>
            )}
            {entries.map((e) =>
              editingEntryId === e.id ? (
                <tr key={e.id} className="border-b border-black/5 bg-ibc-blue/5">
                  <td className="px-4 py-2">
                    <input
                      type="date"
                      value={editingEntryForm.entry_date}
                      onChange={(ev) => setEditingEntryForm({ ...editingEntryForm, entry_date: ev.target.value })}
                      className="input"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={editingEntryForm.entry_type}
                      onChange={(ev) =>
                        setEditingEntryForm({
                          ...editingEntryForm,
                          entry_type: ev.target.value,
                          category: ev.target.value === "income" ? "player_fees" : "gym",
                        })
                      }
                      className="input"
                    >
                      <option value="expense">Out</option>
                      <option value="income">In</option>
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={editingEntryForm.category}
                      onChange={(ev) => setEditingEntryForm({ ...editingEntryForm, category: ev.target.value })}
                      className="input"
                    >
                      {(editingEntryForm.entry_type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      value={editingEntryForm.description || ""}
                      onChange={(ev) => setEditingEntryForm({ ...editingEntryForm, description: ev.target.value })}
                      className="input"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      value={editingEntryForm.amount}
                      onChange={(ev) => setEditingEntryForm({ ...editingEntryForm, amount: ev.target.value })}
                      className="input"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={saveEditEntry} className="text-xs font-bold uppercase text-ibc-blue hover:underline">
                      save
                    </button>
                    <button
                      onClick={() => setEditingEntryId(null)}
                      className="ml-2 text-xs font-bold uppercase text-ibc-ink/50 hover:underline"
                    >
                      cancel
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={e.id} className="border-b border-black/5">
                  <td className="px-4 py-2">{e.entry_date}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase ${
                        e.entry_type === "income" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {e.entry_type === "income" ? "In" : "Out"}
                    </span>
                  </td>
                  <td className="px-4 py-2">{ENTRY_CATEGORY_LABELS[e.category] || e.category}</td>
                  <td className="px-4 py-2 text-ibc-ink/70">{e.description || "—"}</td>
                  <td
                    className={`px-4 py-2 font-semibold ${
                      e.entry_type === "income" ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {e.entry_type === "income" ? "+" : "-"}
                    {e.amount} CHF
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => startEditEntry(e)}
                      className="text-xs font-bold uppercase text-ibc-blue hover:underline"
                    >
                      edit
                    </button>
                    <button
                      onClick={() => deleteEntry(e.id)}
                      className="ml-2 text-xs font-bold uppercase text-red-500 hover:underline"
                    >
                      delete
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-10">
        <button
          onClick={() => setShowDues((s) => !s)}
          className="text-xs font-bold uppercase tracking-wide text-ibc-blue hover:underline"
        >
          {showDues ? "▾ Hide" : "▸ Show"} player dues tracker
        </button>
      </div>

      {showDues && (
        <div className="mt-4">
          <form
            onSubmit={saveBudgetSettings}
            className="grid grid-cols-3 gap-3 rounded-xl border border-black/5 bg-white p-5 shadow-sm"
          >
            <BudgetInput
              label="Gym (CHF/player/year)"
              value={settings.budget_gym}
              onChange={(v) => setSettings({ ...settings, budget_gym: v })}
            />
            <BudgetInput
              label="License (CHF/player/year)"
              value={settings.budget_license}
              onChange={(v) => setSettings({ ...settings, budget_license: v })}
            />
            <BudgetInput
              label="Referees (CHF/player/year)"
              value={settings.budget_referee}
              onChange={(v) => setSettings({ ...settings, budget_referee: v })}
            />
            <button className="col-span-3 w-fit rounded-full bg-ibc-blue px-5 py-2 text-sm font-bold uppercase text-white hover:brightness-110">
              Save split
            </button>
          </form>

          {summary.clubTotals && (
            <div className="mt-4 grid grid-cols-3 gap-3">
              <SummaryCard label="Dues expected" value={summary.clubTotals.expected} tone="neutral" />
              <SummaryCard label="Dues collected" value={summary.clubTotals.collected} tone="green" />
              <SummaryCard
                label={`Still owed — ${summary.clubTotals.unpaidPlayers} player${
                  summary.clubTotals.unpaidPlayers === 1 ? "" : "s"
                }`}
                value={summary.clubTotals.outstanding}
                tone={summary.clubTotals.outstanding > 0 ? "red" : "green"}
              />
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold uppercase text-ibc-blue/70">Team</label>
              <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} className="input">
                <option value="">All teams</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            {summary.licenseTotals && (
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <FilterChip
                  active={dueFilter === ""}
                  onClick={() => setDueFilter("")}
                  className="bg-black/5 text-ibc-ink/70"
                >
                  All players
                </FilterChip>
                <FilterChip
                  active={dueFilter === "unpaid"}
                  onClick={() => setDueFilter(dueFilter === "unpaid" ? "" : "unpaid")}
                  className="bg-red-100 text-red-700"
                >
                  {summary.clubTotals?.unpaidPlayers ?? 0} still owe —{" "}
                  {summary.clubTotals?.outstanding ?? 0} CHF
                </FilterChip>
                <FilterChip
                  active={dueFilter === "license_unpaid"}
                  onClick={() =>
                    setDueFilter(dueFilter === "license_unpaid" ? "" : "license_unpaid")
                  }
                  className="bg-amber-100 text-amber-800"
                >
                  Licence unpaid: {summary.licenseTotals.unpaidCount} —{" "}
                  {summary.licenseTotals.unpaidAmount} CHF
                </FilterChip>
                <FilterChip
                  active={false}
                  onClick={() => setDueFilter("")}
                  className="bg-green-100 text-green-700"
                >
                  Licence paid: {summary.licenseTotals.paidCount} —{" "}
                  {summary.licenseTotals.paidAmount} CHF
                </FilterChip>
              </div>
            )}
          </div>

          {dueFilter && (
            <p className="mt-2 text-xs text-ibc-ink/60">
              Showing {duePlayers.length} player{duePlayers.length === 1 ? "" : "s"} ·{" "}
              <strong className="text-red-700">{shownTotals.outstanding} CHF</strong> still owed
              in this selection.{" "}
              <button
                type="button"
                onClick={() => setDueFilter("")}
                className="font-bold uppercase text-ibc-blue hover:underline"
              >
                clear filter
              </button>
            </p>
          )}

          <div className="mt-3 rounded-xl border border-black/5 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/5 text-left text-xs uppercase text-ibc-ink/50">
                  <th className="px-4 py-2">Player</th>
                  <th className="px-4 py-2">Paid</th>
                  <th className="px-4 py-2">Due (CHF)</th>
                  <th className="px-4 py-2">Balance</th>
                  <th className="px-4 py-2">License</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {duePlayers.map((p) => (
                  <Fragment key={p.id}>
                    <tr className="border-b border-black/5">
                      <td className="px-4 py-2 font-semibold">
                        {p.first_name} {p.last_name}
                      </td>
                      <td className="px-4 py-2">{p.totalPaid} CHF</td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          defaultValue={p.custom_due_amount ?? ""}
                          placeholder={String(summary.totalDue)}
                          onBlur={(ev) => saveDueAmount(p.id, ev.target.value)}
                          title="Custom due amount — leave blank to use the default split"
                          className="w-24 rounded-md border border-black/10 px-2 py-1 text-xs"
                        />
                      </td>
                      <td
                        className={`px-4 py-2 font-semibold ${
                          p.balance > 0 ? "text-red-600" : "text-green-600"
                        }`}
                      >
                        {p.balance > 0 ? `${p.balance} CHF due` : "up to date"}
                      </td>
                      <td className="px-4 py-2">
                        <button
                          type="button"
                          disabled={licenseBusyId === p.id}
                          onClick={() => toggleLicense(p.id, p.licensePaid)}
                          title="Click to toggle paid / unpaid"
                          className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase transition disabled:opacity-50 ${
                            p.licensePaid
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-red-100 text-red-700 hover:bg-red-200"
                          }`}
                        >
                          {licenseBusyId === p.id ? "…" : p.licensePaid ? "Paid" : "Unpaid"}
                        </button>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => openPlayer(p.id)}
                          className="text-xs font-bold uppercase text-ibc-blue hover:underline"
                        >
                          {openPlayerId === p.id ? "close" : "details"}
                        </button>
                      </td>
                    </tr>
                    {openPlayerId === p.id && (
                      <tr>
                        <td colSpan={6} className="bg-ibc-blue/5 px-4 py-4">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <p className="text-xs font-bold uppercase text-ibc-blue">Recorded payments</p>
                              <ul className="mt-2 space-y-1">
                                {payments.length === 0 && (
                                  <li className="text-xs text-ibc-ink/50">No payments recorded.</li>
                                )}
                                {payments.map((pay) =>
                                  editingPaymentId === pay.id ? (
                                    <li key={pay.id} className="flex flex-wrap items-center gap-1 text-xs">
                                      <select
                                        value={editingPaymentForm.category}
                                        onChange={(ev) =>
                                          setEditingPaymentForm({ ...editingPaymentForm, category: ev.target.value })
                                        }
                                        className="rounded border border-black/10 px-1 py-0.5"
                                      >
                                        <option value="gym">Gym</option>
                                        <option value="license">License</option>
                                        <option value="referee">Referees</option>
                                        <option value="other">Other</option>
                                      </select>
                                      <input
                                        type="number"
                                        value={editingPaymentForm.amount}
                                        onChange={(ev) =>
                                          setEditingPaymentForm({ ...editingPaymentForm, amount: ev.target.value })
                                        }
                                        className="w-16 rounded border border-black/10 px-1 py-0.5"
                                      />
                                      <input
                                        type="date"
                                        value={editingPaymentForm.paid_on || ""}
                                        onChange={(ev) =>
                                          setEditingPaymentForm({ ...editingPaymentForm, paid_on: ev.target.value })
                                        }
                                        className="rounded border border-black/10 px-1 py-0.5"
                                      />
                                      <button
                                        onClick={() => saveEditPayment(p.id)}
                                        className="font-bold uppercase text-ibc-blue hover:underline"
                                      >
                                        ok
                                      </button>
                                      <button
                                        onClick={() => setEditingPaymentId(null)}
                                        className="text-ibc-ink/50 hover:underline"
                                      >
                                        cancel
                                      </button>
                                    </li>
                                  ) : (
                                    <li key={pay.id} className="flex items-center justify-between text-xs">
                                      <span>
                                        {CATEGORY_LABELS[pay.category] || pay.category} — {pay.amount} CHF
                                        {pay.paid_on ? ` (${pay.paid_on})` : ""}
                                        {pay.note ? ` · ${pay.note}` : ""}
                                      </span>
                                      <span className="shrink-0">
                                        <button
                                          onClick={() => startEditPayment(pay)}
                                          className="text-ibc-blue hover:underline"
                                        >
                                          edit
                                        </button>
                                        <button
                                          onClick={() => deletePayment(pay.id, p.id)}
                                          className="ml-2 text-red-500 hover:underline"
                                        >
                                          delete
                                        </button>
                                      </span>
                                    </li>
                                  )
                                )}
                              </ul>
                            </div>
                            <div>
                              <p className="text-xs font-bold uppercase text-ibc-blue">Add a payment</p>
                              <div className="mt-2 grid grid-cols-2 gap-2">
                                <select
                                  value={form.category}
                                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                                  className="rounded-md border border-black/10 px-2 py-1.5 text-xs"
                                >
                                  <option value="gym">Gym</option>
                                  <option value="license">License</option>
                                  <option value="referee">Referees</option>
                                  <option value="other">Other</option>
                                </select>
                                <input
                                  type="number"
                                  placeholder="Amount CHF"
                                  value={form.amount}
                                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                  className="rounded-md border border-black/10 px-2 py-1.5 text-xs"
                                />
                                <input
                                  type="date"
                                  value={form.paid_on}
                                  onChange={(e) => setForm({ ...form, paid_on: e.target.value })}
                                  className="rounded-md border border-black/10 px-2 py-1.5 text-xs"
                                />
                                <input
                                  placeholder="Note (optional)"
                                  value={form.note}
                                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                                  className="rounded-md border border-black/10 px-2 py-1.5 text-xs"
                                />
                              </div>
                              <button
                                onClick={() => addPayment(p.id)}
                                className="mt-2 rounded-full bg-ibc-accent px-4 py-1.5 text-xs font-bold uppercase text-ibc-ink hover:brightness-95"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-black/10 bg-ibc-blue/5 font-bold">
                  <td className="px-4 py-2">Totals shown</td>
                  <td className="px-4 py-2">{shownTotals.paid} CHF</td>
                  <td className="px-4 py-2">{shownTotals.due} CHF</td>
                  <td className="px-4 py-2 text-red-700">{shownTotals.outstanding} CHF due</td>
                  <td className="px-4 py-2 text-amber-800" colSpan={2}>
                    {shownTotals.licenseOutstanding} CHF licence
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <style jsx global>{`
        .input {
          border-radius: 0.5rem;
          border: 1px solid rgba(0, 0, 0, 0.1);
          padding: 0.5rem 0.75rem;
          font-size: 0.85rem;
        }
      `}</style>
    </div>
  );
}

function FilterChip({ active, onClick, className, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 transition hover:brightness-95 ${className} ${
        active ? "ring-2 ring-ibc-blue ring-offset-1" : ""
      }`}
    >
      {children}
    </button>
  );
}

function SummaryCard({ label, value, tone }) {
  const toneClass =
    tone === "green" ? "text-green-700" : tone === "neutral" ? "text-ibc-blue" : "text-red-700";
  return (
    <div className="rounded-xl border border-black/5 bg-white p-4 text-center shadow-sm">
      <p className={`font-display text-2xl font-extrabold ${toneClass}`}>{value.toLocaleString("fr-CH")} CHF</p>
      <p className="text-xs uppercase tracking-wide text-ibc-ink/60">{label}</p>
    </div>
  );
}

function BudgetInput({ label, value, onChange }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold uppercase text-ibc-blue/70">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-black/10 px-3 py-2 text-sm"
      />
    </div>
  );
}
