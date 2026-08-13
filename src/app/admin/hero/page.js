"use client";

import { useEffect, useState } from "react";
import { resizeImageToDataUrl } from "@/lib/image-client";

export default function HeroAdminPage() {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then(setSettings);
  }, []);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handlePhoto(field, file) {
    if (!file) return;
    const dataUrl = await resizeImageToDataUrl(file, 1600);
    setSettings((s) => ({ ...s, [field]: dataUrl }));
  }

  if (!settings) return <p className="text-ibc-ink/60">Chargement…</p>;

  return (
    <form onSubmit={save} className="max-w-2xl space-y-6">
      <h1 className="font-display text-3xl font-extrabold uppercase text-ibc-blue">
        Contenu de la page d&apos;accueil
      </h1>

      <Field label="Titre principal (hero)">
        <input
          className="input"
          value={settings.hero_headline}
          onChange={(e) => setSettings({ ...settings, hero_headline: e.target.value })}
        />
      </Field>

      <Field label="Sous-titre (badge)">
        <input
          className="input"
          value={settings.hero_subheadline}
          onChange={(e) => setSettings({ ...settings, hero_subheadline: e.target.value })}
        />
      </Field>

      <Field label="Texte d'accroche">
        <textarea
          className="input"
          rows={4}
          value={settings.hero_body}
          onChange={(e) => setSettings({ ...settings, hero_body: e.target.value })}
        />
      </Field>

      <Field label="Photo d'équipe (page d'accueil)">
        <input type="file" accept="image/*" onChange={(e) => handlePhoto("team_photo_data_url", e.target.files?.[0])} />
        {settings.team_photo_data_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={settings.team_photo_data_url}
            alt="Aperçu"
            className="mt-2 max-h-48 rounded-lg border border-black/10"
          />
        )}
      </Field>

      <Field label="Présentation du club (page « Le club » + accueil)">
        <textarea
          className="input"
          rows={5}
          value={settings.club_about}
          onChange={(e) => setSettings({ ...settings, club_about: e.target.value })}
        />
      </Field>

      <Field label="Libellé de la saison">
        <input
          className="input"
          value={settings.season_label}
          onChange={(e) => setSettings({ ...settings, season_label: e.target.value })}
        />
      </Field>

      <div className="flex items-center gap-3">
        <button
          disabled={saving}
          className="rounded-full bg-ibc-blue px-6 py-2.5 text-sm font-bold uppercase text-white hover:brightness-110 disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
        {saved && <span className="text-sm font-semibold text-green-600">Enregistré ✓</span>}
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid rgba(0, 0, 0, 0.1);
          padding: 0.5rem 0.75rem;
          font-size: 0.925rem;
        }
      `}</style>
    </form>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold uppercase text-ibc-blue">{label}</label>
      {children}
    </div>
  );
}
