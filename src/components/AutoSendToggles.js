"use client";

import { useEffect, useState } from "react";

const SENDS = [
  {
    key: "weekly_reminder_enabled",
    title: "Rappel hebdomadaire",
    detail: "Le programme de la semaine, envoyé à chaque joueur ayant une adresse e-mail.",
  },
  {
    key: "weekly_newsletter_enabled",
    title: "Newsletter hebdomadaire",
    detail: "Le numéro de la semaine, préparé et envoyé par équipe.",
  },
];

/**
 * The two automatic Monday sends, on or off. They land the same morning, so
 * leaving both on means two e-mails per member per week — which is the fast
 * way to lose a mailing list. Switching one off is a setting, not a deploy,
 * and it does not touch the scheduler.
 */
export default function AutoSendToggles() {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => setSettings(s || {}));
  }, []);

  const isOn = (key) => (settings?.[key] ?? "1") === "1";

  async function toggle(key) {
    const next = isOn(key) ? "0" : "1";
    setSaving(key);
    setMessage("");
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: next }),
    });
    setSaving("");
    if (!res.ok) {
      setMessage("Échec de l'enregistrement.");
      return;
    }
    setSettings((s) => ({ ...s, [key]: next }));
    setMessage(next === "1" ? "Envoi réactivé." : "Envoi désactivé — plus rien ne part le lundi.");
    setTimeout(() => setMessage(""), 3500);
  }

  const bothOn = SENDS.every((s) => isOn(s.key));

  return (
    <div className="rounded-xl border border-black/5 bg-white p-5 shadow-sm">
      <h2 className="font-display text-lg font-bold uppercase text-ibc-blue">Envois automatiques</h2>
      <p className="mt-1 text-xs text-ibc-ink/55">
        Déclenchés chaque lundi à 08:00. Couper un envoi ici n&apos;exige aucun déploiement.
      </p>

      {settings === null ? (
        <p className="mt-3 text-xs text-ibc-ink/50">Chargement…</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {SENDS.map((s) => (
            <li
              key={s.key}
              className="flex items-center justify-between gap-4 rounded-lg bg-ibc-blue/5 p-3"
            >
              <div>
                <p className="text-sm font-semibold text-ibc-ink">{s.title}</p>
                <p className="text-xs text-ibc-ink/55">{s.detail}</p>
              </div>
              <button
                type="button"
                onClick={() => toggle(s.key)}
                disabled={saving === s.key}
                aria-pressed={isOn(s.key)}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold uppercase transition disabled:opacity-50 ${
                  isOn(s.key)
                    ? "bg-green-600 text-white hover:brightness-110"
                    : "bg-black/10 text-ibc-ink/60 hover:bg-black/15"
                }`}
              >
                {saving === s.key ? "…" : isOn(s.key) ? "Activé" : "Désactivé"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {bothOn && (
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
          Les deux envois partent le même matin — cela fait deux e-mails par membre et par semaine.
        </p>
      )}
      {message && <p className="mt-2 text-xs font-semibold text-ibc-blue">{message}</p>}
    </div>
  );
}
