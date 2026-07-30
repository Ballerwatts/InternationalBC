"use client";

import { Fragment, useEffect, useState } from "react";

const CATEGORY_LABELS = { gym: "Salle (gym)", license: "Licence", referee: "Arbitrage", other: "Autre" };

export default function BudgetAdminPage() {
  const [settings, setSettings] = useState(null);
  const [summary, setSummary] = useState(null);
  const [openPlayerId, setOpenPlayerId] = useState(null);
  const [payments, setPayments] = useState([]);
  const [form, setForm] = useState({ category: "gym", amount: "", paid_on: "", note: "" });

  function refreshSummary() {
    fetch("/api/budget/summary").then((r) => r.json()).then(setSummary);
  }

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then(setSettings);
    refreshSummary();
  }, []);

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

  if (!settings || !summary) return <p className="text-mbc-ink/60">Chargement…</p>;

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-3xl font-extrabold uppercase text-mbc-blue">
        Budget de la saison
      </h1>
      <p className="mt-1 text-sm text-mbc-ink/60">
        Cotisation annuelle par joueur, répartie entre salle, licence et arbitrage.
      </p>

      <form
        onSubmit={saveBudgetSettings}
        className="mt-6 grid grid-cols-3 gap-3 rounded-xl border border-black/5 bg-white p-5 shadow-sm"
      >
        <BudgetInput
          label="Salle (CHF/joueur/an)"
          value={settings.budget_gym}
          onChange={(v) => setSettings({ ...settings, budget_gym: v })}
        />
        <BudgetInput
          label="Licence (CHF/joueur/an)"
          value={settings.budget_license}
          onChange={(v) => setSettings({ ...settings, budget_license: v })}
        />
        <BudgetInput
          label="Arbitrage (CHF/joueur/an)"
          value={settings.budget_referee}
          onChange={(v) => setSettings({ ...settings, budget_referee: v })}
        />
        <p className="col-span-3 text-sm text-mbc-ink/60">
          Total par joueur :{" "}
          <strong className="text-mbc-blue">
            {(Number(settings.budget_gym) || 0) +
              (Number(settings.budget_license) || 0) +
              (Number(settings.budget_referee) || 0)}{" "}
            CHF
          </strong>{" "}
          (objectif communiqué : CHF 4&apos;000.- par saison)
        </p>
        <button className="col-span-3 w-fit rounded-full bg-mbc-blue px-5 py-2 text-sm font-bold uppercase text-white hover:brightness-110">
          Enregistrer la répartition
        </button>
      </form>

      <div className="mt-6 rounded-xl border border-black/5 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/5 text-left text-xs uppercase text-mbc-ink/50">
              <th className="px-4 py-2">Joueur</th>
              <th className="px-4 py-2">Payé</th>
              <th className="px-4 py-2">Dû</th>
              <th className="px-4 py-2">Solde</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {summary.players.map((p) => (
              <Fragment key={p.id}>
                <tr className="border-b border-black/5">
                  <td className="px-4 py-2 font-semibold">
                    {p.first_name} {p.last_name}
                  </td>
                  <td className="px-4 py-2">{p.totalPaid} CHF</td>
                  <td className="px-4 py-2">{p.totalDue} CHF</td>
                  <td
                    className={`px-4 py-2 font-semibold ${
                      p.balance > 0 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {p.balance > 0 ? `${p.balance} CHF dû` : "à jour"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => openPlayer(p.id)}
                      className="text-xs font-bold uppercase text-mbc-blue hover:underline"
                    >
                      {openPlayerId === p.id ? "fermer" : "détails"}
                    </button>
                  </td>
                </tr>
                {openPlayerId === p.id && (
                  <tr>
                    <td colSpan={5} className="bg-mbc-blue/5 px-4 py-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-bold uppercase text-mbc-blue">Paiements enregistrés</p>
                          <ul className="mt-2 space-y-1">
                            {payments.length === 0 && (
                              <li className="text-xs text-mbc-ink/50">Aucun paiement enregistré.</li>
                            )}
                            {payments.map((pay) => (
                              <li key={pay.id} className="flex items-center justify-between text-xs">
                                <span>
                                  {CATEGORY_LABELS[pay.category] || pay.category} — {pay.amount} CHF
                                  {pay.paid_on ? ` (${pay.paid_on})` : ""}
                                  {pay.note ? ` · ${pay.note}` : ""}
                                </span>
                                <button
                                  onClick={() => deletePayment(pay.id, p.id)}
                                  className="ml-2 text-red-500 hover:underline"
                                >
                                  supprimer
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase text-mbc-blue">Ajouter un paiement</p>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <select
                              value={form.category}
                              onChange={(e) => setForm({ ...form, category: e.target.value })}
                              className="rounded-md border border-black/10 px-2 py-1.5 text-xs"
                            >
                              <option value="gym">Salle</option>
                              <option value="license">Licence</option>
                              <option value="referee">Arbitrage</option>
                              <option value="other">Autre</option>
                            </select>
                            <input
                              type="number"
                              placeholder="Montant CHF"
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
                              placeholder="Note (optionnel)"
                              value={form.note}
                              onChange={(e) => setForm({ ...form, note: e.target.value })}
                              className="rounded-md border border-black/10 px-2 py-1.5 text-xs"
                            />
                          </div>
                          <button
                            onClick={() => addPayment(p.id)}
                            className="mt-2 rounded-full bg-mbc-yellow px-4 py-1.5 text-xs font-bold uppercase text-mbc-ink hover:brightness-95"
                          >
                            Ajouter
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BudgetInput({ label, value, onChange }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold uppercase text-mbc-blue/70">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-black/10 px-3 py-2 text-sm"
      />
    </div>
  );
}
