"use client";

import { useState } from "react";
import ImageDropzone from "@/components/ImageDropzone";

/**
 * Turn a sent issue into a post on the public home page.
 *
 * Composed separately from the e-mail on purpose: what reads well in an
 * inbox is rarely what reads well on a home page, so the post gets its own
 * title, comment, photo and video. The post appears when the issue is sent,
 * and editing it afterwards updates the page straight away.
 */
export default function NewsletterPostPanel({ newsletter, onSaved }) {
  const [form, setForm] = useState({
    post_enabled: !!newsletter.post_enabled,
    post_title: newsletter.post_title || "",
    post_body: newsletter.post_body || "",
    post_image_data_url: newsletter.post_image_data_url || "",
    post_video_url: newsletter.post_video_url || "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const alreadySent = newsletter.status === "sent";

  async function save() {
    setSaving(true);
    setMessage("");
    const res = await fetch(`/api/newsletters/${newsletter.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setMessage(data.error || "Échec de l'enregistrement.");
      return;
    }
    setMessage(
      !form.post_enabled
        ? "Post désactivé — retiré de la page d'accueil."
        : alreadySent
        ? "Post mis à jour sur la page d'accueil."
        : "Enregistré — le post paraîtra à l'envoi."
    );
    onSaved?.();
    setTimeout(() => setMessage(""), 3500);
  }

  return (
    <div className="rounded-xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold uppercase text-ibc-blue">
            Aussi sur la page d&apos;accueil
          </h2>
          <p className="mt-1 text-xs text-ibc-ink/55">
            {alreadySent
              ? "Ce numéro est parti — toute modification ici met à jour le post immédiatement."
              : "Le post paraîtra automatiquement quand ce numéro sera envoyé."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setForm((f) => ({ ...f, post_enabled: !f.post_enabled }))}
          aria-pressed={form.post_enabled}
          className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold uppercase transition ${
            form.post_enabled
              ? "bg-green-600 text-white hover:brightness-110"
              : "bg-black/10 text-ibc-ink/60 hover:bg-black/15"
          }`}
        >
          {form.post_enabled ? "Activé" : "Désactivé"}
        </button>
      </div>

      {form.post_enabled && (
        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-ibc-blue/70">
              Titre du post
            </label>
            <input
              value={form.post_title}
              onChange={(e) => setForm({ ...form, post_title: e.target.value })}
              placeholder={newsletter.subject}
              className="input w-full"
            />
            <p className="mt-1 text-[11px] text-ibc-ink/45">
              Vide = le sujet de l&apos;e-mail («&nbsp;{newsletter.subject}&nbsp;»).
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-ibc-blue/70">
              Commentaire
            </label>
            <textarea
              value={form.post_body}
              onChange={(e) => setForm({ ...form, post_body: e.target.value })}
              rows={4}
              placeholder="Quelques lignes pour les visiteurs du site."
              className="input w-full"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-ibc-blue/70">
              Lien vidéo (YouTube ou Vimeo)
            </label>
            <input
              value={form.post_video_url}
              onChange={(e) => setForm({ ...form, post_video_url: e.target.value })}
              placeholder="https://www.youtube.com/watch?v=…"
              className="input w-full"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-ibc-blue/70">
              Photo
            </label>
            <ImageDropzone
              value={form.post_image_data_url}
              onChange={(dataUrl) => setForm((f) => ({ ...f, post_image_data_url: dataUrl }))}
              maxWidth={1400}
              size={110}
            />
            <p className="mt-1 text-[11px] text-ibc-ink/45">
              La vidéo prend la place de la photo quand les deux sont renseignées.
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-full bg-ibc-blue px-4 py-2 text-xs font-bold uppercase text-white hover:brightness-110 disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : "Enregistrer le post"}
        </button>
        {message && <span className="text-xs font-semibold text-ibc-blue">{message}</span>}
      </div>
    </div>
  );
}
