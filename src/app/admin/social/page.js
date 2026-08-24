"use client";

import { useEffect, useState } from "react";
import { SOCIAL_NETWORKS } from "@/lib/socials";

/**
 * Marketing → Social & Instagram (super-admin only).
 *
 * Two things live here: the four social URLs behind the footer logos, and
 * the hand-picked Instagram gallery. Leaving a URL empty is a supported
 * state — the logo still shows in the footer, just greyed out and not
 * clickable, so the row of logos can ship before the accounts are ready.
 */
export default function SocialAdminPage() {
  const [settings, setSettings] = useState(null);
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState({ post_url: "", caption: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [postError, setPostError] = useState("");

  function refreshPosts() {
    fetch("/api/instagram").then((r) => r.json()).then((d) => setPosts(Array.isArray(d) ? d : []));
  }

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then(setSettings);
    refreshPosts();
  }, []);

  async function saveSettings(e) {
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

  async function addPost(e) {
    e.preventDefault();
    setPostError("");
    const res = await fetch("/api/instagram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPost),
    });
    if (res.ok) {
      setNewPost({ post_url: "", caption: "" });
      refreshPosts();
    } else {
      setPostError((await res.json()).error || "Erreur");
    }
  }

  async function removePost(id) {
    if (!confirm("Retirer cette publication de la galerie ?")) return;
    await fetch(`/api/instagram/${id}`, { method: "DELETE" });
    refreshPosts();
  }

  async function move(index, direction) {
    const next = [...posts];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setPosts(next);
    await Promise.all(
      next.map((p, i) =>
        fetch(`/api/instagram/${p.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sort_order: i }),
        })
      )
    );
    refreshPosts();
  }

  if (!settings) return <p className="text-ibc-ink/60">Chargement…</p>;

  return (
    <div className="max-w-2xl space-y-10">
      <form onSubmit={saveSettings} className="space-y-5">
        <div>
          <h1 className="font-display text-3xl font-extrabold uppercase text-ibc-blue">
            Social &amp; Instagram
          </h1>
          <p className="mt-1 text-sm text-ibc-ink/60">
            Les quatre logos apparaissent déjà en bas de chaque page. Tant qu&apos;un champ est
            vide, le logo est affiché en gris et n&apos;est pas cliquable ; dès que vous collez
            l&apos;adresse, il devient un vrai lien.
          </p>
        </div>

        {SOCIAL_NETWORKS.map((net) => (
          <label key={net.key} className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-ibc-blue/70">
              {net.label}
            </span>
            <input
              className="input"
              placeholder={net.placeholder}
              value={settings[net.settingKey] || ""}
              onChange={(e) => setSettings({ ...settings, [net.settingKey]: e.target.value })}
            />
          </label>
        ))}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-ibc-blue px-6 py-2.5 text-sm font-bold uppercase text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Enregistrer les liens"}
          </button>
          {saved && <span className="text-sm font-semibold text-green-700">Enregistré ✓</span>}
          {saveError && (
            <span className="text-sm font-semibold text-red-600">
              Échec de l&apos;enregistrement.
            </span>
          )}
        </div>
      </form>

      <div className="border-t border-black/10 pt-8">
        <h2 className="font-display text-2xl font-extrabold uppercase text-ibc-blue">
          Galerie Instagram
        </h2>
        <p className="mt-1 text-sm text-ibc-ink/60">
          Collez le lien d&apos;une publication ou d&apos;un reel (le bouton « Partager → Copier
          le lien » dans Instagram). La publication est affichée sur la page d&apos;accueil via
          l&apos;intégration officielle d&apos;Instagram — aucun compte développeur ni jeton
          d&apos;accès n&apos;est nécessaire.
        </p>

        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.instagram_gallery_enabled !== "0"}
            onChange={(e) =>
              setSettings({
                ...settings,
                instagram_gallery_enabled: e.target.checked ? "1" : "0",
              })
            }
          />
          Afficher la galerie sur la page d&apos;accueil
          <span className="text-xs text-ibc-ink/50">(enregistrez les liens ci-dessus)</span>
        </label>

        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-ibc-blue/70">
            Titre de la section
          </span>
          <input
            className="input"
            value={settings.instagram_gallery_title || ""}
            onChange={(e) => setSettings({ ...settings, instagram_gallery_title: e.target.value })}
          />
        </label>

        <form onSubmit={addPost} className="mt-5 space-y-3 rounded-xl border border-black/5 bg-white p-5 shadow-sm">
          <input
            className="input w-full"
            required
            placeholder="https://www.instagram.com/p/…"
            value={newPost.post_url}
            onChange={(e) => setNewPost({ ...newPost, post_url: e.target.value })}
          />
          <input
            className="input w-full"
            placeholder="Légende affichée sous la publication (optionnel)"
            value={newPost.caption}
            onChange={(e) => setNewPost({ ...newPost, caption: e.target.value })}
          />
          {postError && <p className="text-sm font-semibold text-red-600">{postError}</p>}
          <button
            type="submit"
            className="rounded-full bg-ibc-blue px-5 py-2 text-sm font-bold uppercase text-white hover:brightness-110"
          >
            + Ajouter à la galerie
          </button>
        </form>

        <ul className="mt-4 space-y-2">
          {posts.map((post, i) => (
            <li
              key={post.id}
              className="flex items-center gap-3 rounded-xl border border-black/5 bg-white px-4 py-3 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <a
                  href={post.post_url}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-sm font-semibold text-ibc-blue hover:underline"
                >
                  {post.post_url}
                </a>
                {post.caption && <p className="text-xs text-ibc-ink/60">{post.caption}</p>}
              </div>
              <button
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className="rounded border border-black/10 px-2 py-1 text-xs disabled:opacity-30"
                aria-label="Monter"
              >
                ↑
              </button>
              <button
                onClick={() => move(i, 1)}
                disabled={i === posts.length - 1}
                className="rounded border border-black/10 px-2 py-1 text-xs disabled:opacity-30"
                aria-label="Descendre"
              >
                ↓
              </button>
              <button
                onClick={() => removePost(post.id)}
                className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold uppercase text-red-600 hover:bg-red-100"
              >
                Retirer
              </button>
            </li>
          ))}
          {posts.length === 0 && (
            <li className="rounded-xl bg-black/5 px-4 py-3 text-sm text-ibc-ink/60">
              Aucune publication pour l&apos;instant.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
