"use client";

import { useEffect, useState } from "react";
import ImageDropzone from "@/components/ImageDropzone";
import PracticeMap from "@/components/PracticeMap";

/**
 * Marketing → Gym. Edits the club-wide practice venue shown on the home page
 * and on /club. Individual squads can still override the venue on their own
 * record in Marketing → Teams; whatever is set here is the fallback.
 */
export default function GymAdminPage() {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then(setSettings);
  }, []);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setSaveError(false);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("save_failed");
      setSaved(true);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
      setTimeout(() => {
        setSaved(false);
        setSaveError(false);
      }, 2500);
    }
  }

  if (!settings) return <p className="text-ibc-ink/60">Chargement…</p>;

  return (
    <form onSubmit={save} className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold uppercase text-ibc-blue">Gym</h1>
        <p className="mt-1 text-sm text-ibc-ink/60">
          Le lieu d&apos;entraînement affiché sur la page d&apos;accueil et sur /club. La carte
          est générée automatiquement depuis l&apos;adresse — vérifiez l&apos;aperçu ci-dessous
          avant d&apos;enregistrer.
        </p>
      </div>

      <Field label="Nom de la salle">
        <input
          className="input"
          value={settings.practice_location_name || ""}
          onChange={(e) => setSettings({ ...settings, practice_location_name: e.target.value })}
        />
      </Field>

      <Field label="Adresse complète (utilisée pour la carte)">
        <input
          className="input"
          value={settings.practice_location_address || ""}
          onChange={(e) => setSettings({ ...settings, practice_location_address: e.target.value })}
        />
      </Field>

      <Field label="Accès / infos pratiques (parking, bus, entrée, vestiaires)">
        <textarea
          className="input"
          rows={4}
          value={settings.gym_access_notes || ""}
          onChange={(e) => setSettings({ ...settings, gym_access_notes: e.target.value })}
        />
      </Field>

      <Field label="Lien Google Maps personnalisé (optionnel)">
        <input
          className="input"
          placeholder="https://maps.app.goo.gl/…"
          value={settings.gym_maps_url || ""}
          onChange={(e) => setSettings({ ...settings, gym_maps_url: e.target.value })}
        />
        <p className="mt-1 text-xs text-ibc-ink/50">
          Laissez vide pour utiliser une recherche Google Maps sur l&apos;adresse ci-dessus.
        </p>
      </Field>

      <Field label="Photo de la salle (optionnel)">
        <ImageDropzone
          value={settings.gym_photo_data_url || ""}
          onChange={(v) => setSettings({ ...settings, gym_photo_data_url: v })}
        />
      </Field>

      {settings.practice_location_address && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-ibc-blue/70">
            Aperçu de la carte
          </p>
          <PracticeMap address={settings.practice_location_address} />
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-ibc-blue px-6 py-2.5 text-sm font-bold uppercase text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
        {saved && <span className="text-sm font-semibold text-green-700">Enregistré ✓</span>}
        {saveError && (
          <span className="text-sm font-semibold text-red-600">Échec de l&apos;enregistrement.</span>
        )}
      </div>
    </form>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-ibc-blue/70">
        {label}
      </span>
      {children}
    </label>
  );
}
