"use client";

import { useEffect, useState } from "react";
import ImageDropzone from "@/components/ImageDropzone";

export default function HeroAdminPage() {
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

      <Field label="Photo d'équipe (page d'accueil) — PNG ou JPEG">
        <ImageDropzone
          value={settings.team_photo_data_url}
          onChange={(dataUrl) => setSettings((s) => ({ ...s, team_photo_data_url: dataUrl }))}
          maxWidth={1600}
          size={160}
          label="Cliquez ou glissez une photo (PNG ou JPEG)"
        />
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

      <div className="rounded-xl border border-black/5 bg-ibc-accent/5 p-4">
        <h2 className="mb-3 font-display text-lg font-bold uppercase text-ibc-blue">
          Highlight of the week
        </h2>
        <Field label="Titre (affiché en gras, 1 ligne)">
          <input
            className="input"
            value={settings.highlight_title || ""}
            onChange={(e) => setSettings({ ...settings, highlight_title: e.target.value })}
          />
        </Field>
        <div className="mt-3">
          <Field label="Description (3 lignes environ)">
            <textarea
              className="input"
              rows={3}
              value={settings.highlight_body || ""}
              onChange={(e) => setSettings({ ...settings, highlight_body: e.target.value })}
            />
          </Field>
        </div>
      </div>

      <div className="rounded-xl border border-black/5 bg-ibc-accent/5 p-4">
        <h2 className="mb-3 font-display text-lg font-bold uppercase text-ibc-blue">
          Photos supplémentaires du slider (jusqu&apos;à 3)
        </h2>
        <HeroPhotosEditor />
      </div>

      <div className="flex items-center gap-3">
        <button
          disabled={saving}
          className="rounded-full bg-ibc-blue px-6 py-2.5 text-sm font-bold uppercase text-white hover:brightness-110 disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
        {saved && <span className="text-sm font-semibold text-green-600">✓ Enregistré</span>}
        {saveError && <span className="text-sm font-semibold text-red-600">✗ Échec de l&apos;enregistrement</span>}
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

const MAX_HERO_PHOTOS = 3;

function HeroPhotosEditor() {
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState("");

  function refresh() {
    fetch("/api/hero-photos").then((r) => r.json()).then(setPhotos);
  }

  useEffect(refresh, []);

  async function handleUpload(dataUrl) {
    if (!dataUrl) return;
    setError("");
    if (photos.length >= MAX_HERO_PHOTOS) {
      setError(`Maximum ${MAX_HERO_PHOTOS} photos supplémentaires.`);
      return;
    }
    try {
      const res = await fetch("/api/hero-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_data_url: dataUrl }),
      });
      if (!res.ok) throw new Error("upload_failed");
    } catch {
      setError("Échec de l'envoi de la photo. Réessayez.");
    }
    refresh();
  }

  async function remove(id) {
    if (!confirm("Supprimer cette photo ?")) return;
    await fetch(`/api/hero-photos/${id}`, { method: "DELETE" });
    refresh();
  }

  return (
    <div>
      <p className="mb-3 text-xs text-ibc-ink/60">
        Ces photos s&apos;ajoutent au diaporama de la page d&apos;accueil (en plus du titre, de la
        dernière annonce et des sponsors).
      </p>
      <div className="flex flex-wrap gap-3">
        {photos.map((p) => (
          <div key={p.id} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.image_data_url}
              alt=""
              className="h-24 w-36 rounded-lg border border-black/10 object-cover"
            />
            <button
              type="button"
              onClick={() => remove(p.id)}
              className="absolute -right-2 -top-2 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white shadow"
            >
              ✕
            </button>
          </div>
        ))}
        {photos.length < MAX_HERO_PHOTOS && (
          <ImageDropzone
            value=""
            onChange={handleUpload}
            maxWidth={1600}
            size={96}
            label="+ Ajouter (PNG/JPEG)"
          />
        )}
      </div>
      {photos.length >= MAX_HERO_PHOTOS && (
        <p className="mt-3 text-xs text-ibc-ink/50">Nombre maximum de photos atteint.</p>
      )}
      {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}
