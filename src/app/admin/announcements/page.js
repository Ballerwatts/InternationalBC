"use client";

import { useEffect, useState } from "react";
import ImageDropzone from "@/components/ImageDropzone";

const EMPTY = { title: "", body: "", published: 1, image_data_url: "", video_url: "" };

export default function AnnouncementsAdminPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);

  function refresh() {
    fetch("/api/announcements").then((r) => r.json()).then(setItems);
  }

  useEffect(refresh, []);

  async function submit(e) {
    e.preventDefault();
    if (editingId) {
      await fetch(`/api/announcements/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    setForm(EMPTY);
    setEditingId(null);
    refresh();
  }

  async function remove(id) {
    if (!confirm("Supprimer cette annonce ?")) return;
    await fetch(`/api/announcements/${id}`, { method: "DELETE" });
    refresh();
  }

  function edit(item) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      body: item.body,
      published: item.published,
      in_newsletter: item.in_newsletter ?? 1,
      image_data_url: item.image_data_url || "",
      video_url: item.video_url || "",
    });
  }

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl font-extrabold uppercase text-ibc-blue">Annonces</h1>

      <form onSubmit={submit} className="mt-6 space-y-3 rounded-xl border border-black/5 bg-white p-5 shadow-sm">
        <input
          placeholder="Titre"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full rounded-md border border-black/10 px-3 py-2"
          required
        />
        <textarea
          placeholder="Contenu de l'annonce"
          rows={4}
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          className="w-full rounded-md border border-black/10 px-3 py-2"
          required
        />
        <div>
          <label className="mb-1 block text-xs font-bold uppercase text-ibc-blue/70">
            Lien vidéo (YouTube ou Vimeo — optionnel)
          </label>
          <input
            placeholder="https://www.youtube.com/watch?v=…"
            value={form.video_url || ""}
            onChange={(e) => setForm({ ...form, video_url: e.target.value })}
            className="input mb-4 w-full"
          />
          <label className="mb-1 block text-xs font-bold uppercase text-ibc-blue/70">
            Image (optionnelle, petit format)
          </label>
          <ImageDropzone
            value={form.image_data_url}
            onChange={(dataUrl) => setForm((f) => ({ ...f, image_data_url: dataUrl }))}
            maxWidth={1400}
            size={110}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!form.published}
            onChange={(e) => setForm({ ...form, published: e.target.checked ? 1 : 0 })}
          />
          Publiée sur le site
        </label>
        <div className="flex gap-2">
          <button className="rounded-full bg-ibc-blue px-5 py-2 text-sm font-bold uppercase text-white hover:brightness-110">
            {editingId ? "Mettre à jour" : "Publier"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(EMPTY);
              }}
              className="rounded-full bg-black/5 px-5 py-2 text-sm font-bold uppercase text-ibc-ink/70"
            >
              Annuler
            </button>
          )}
        </div>
      </form>

      <ul className="mt-6 space-y-3">
        {items.map((a) => (
          <li key={a.id} className="rounded-xl border border-black/5 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-3">
                {a.image_data_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.image_data_url}
                    alt=""
                    className="h-16 w-24 shrink-0 rounded object-cover"
                  />
                )}
                <div>
                  <p className="font-display text-lg font-bold text-ibc-ink">
                    {a.title}{" "}
                    {!a.published && (
                      <span className="ml-1 rounded bg-black/10 px-2 py-0.5 text-xs font-semibold text-ibc-ink/60">
                        brouillon
                      </span>
                    )}
                    {/* Where it came from, and who owns it now. Once edited
                        here, a re-send of the newsletter leaves it alone. */}
                    {a.newsletter_id && (
                      <span
                        className="ml-1 rounded bg-ibc-blue/10 px-2 py-0.5 text-xs font-semibold text-ibc-blue"
                        title={
                          a.post_detached
                            ? "Modifiée ici — un nouvel envoi de la newsletter ne l'écrasera pas."
                            : "Créée depuis la newsletter. La modifier ici en prend le contrôle."
                        }
                      >
                        {a.post_detached ? "newsletter · modifiée ici" : "depuis la newsletter"}
                      </span>
                    )}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm text-ibc-ink/70">{a.body}</p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2 text-xs font-bold uppercase">
                <button onClick={() => edit(a)} className="text-ibc-blue hover:underline">
                  Modifier
                </button>
                <button onClick={() => remove(a.id)} className="text-red-500 hover:underline">
                  Supprimer
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
