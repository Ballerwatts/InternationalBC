"use client";

import { useEffect, useState } from "react";

/**
 * The content pages carried over from WordPress. Title and description are
 * what Google shows in results; the text uses the same light markup as the
 * rest of the site: "## " for a heading, "- " for a list item, a blank line
 * between paragraphs.
 */
export default function SitePagesAdmin() {
  const [pages, setPages] = useState([]);
  const [openPath, setOpenPath] = useState(null);

  function refresh() {
    fetch("/api/site-pages")
      .then((r) => r.json())
      .then((d) => setPages(Array.isArray(d) ? d : []));
  }
  useEffect(refresh, []);

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-3xl font-extrabold uppercase text-ibc-blue">Pages</h1>
      <p className="mt-2 text-sm text-ibc-ink/60">
        Les pages de contenu du site, reprises de l&apos;ancien site WordPress à leurs adresses
        d&apos;origine. Le titre et la description sont ce que Google affiche dans ses résultats.
      </p>
      <ul className="mt-6 space-y-2">
        {pages.map((p) => (
          <PageRow
            key={p.path}
            page={p}
            open={openPath === p.path}
            onToggle={() => setOpenPath(openPath === p.path ? null : p.path)}
            onSaved={refresh}
          />
        ))}
      </ul>
    </div>
  );
}

function PageRow({ page, open, onToggle, onSaved }) {
  const [form, setForm] = useState(page);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm(page), [page]);

  const descLen = (form.description || "").length;

  async function save() {
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/site-pages", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    setMessage(res.ok ? "Enregistré — en ligne immédiatement." : data.error || "Échec.");
    if (res.ok) onSaved();
    setTimeout(() => setMessage(""), 3500);
  }

  return (
    <li className="rounded-xl border border-black/5 bg-white shadow-sm">
      <button onClick={onToggle} className="flex w-full items-center justify-between gap-3 p-4 text-left">
        <div>
          <p className="text-sm font-semibold text-ibc-ink">{page.title}</p>
          <p className="font-mono text-xs text-ibc-ink/45">{page.path}</p>
        </div>
        <span className="shrink-0 text-xs font-bold uppercase text-ibc-blue">{open ? "fermer" : "modifier"}</span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-black/5 p-4">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-ibc-blue/70">Titre</label>
            <input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input w-full" />
          </div>
          <div>
            <label className="mb-1 flex justify-between text-xs font-bold uppercase text-ibc-blue/70">
              <span>Description (résultats Google)</span>
              <span className={descLen > 160 ? "text-amber-600" : "text-ibc-ink/40"}>{descLen} / 160</span>
            </label>
            <textarea
              rows={2}
              value={form.description || ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-ibc-blue/70">
              Texte — « ## » titre, « - » liste, ligne vide entre paragraphes
            </label>
            <textarea
              rows={16}
              value={form.body || ""}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              className="input w-full font-mono text-xs"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-full bg-ibc-blue px-5 py-2 text-sm font-bold uppercase text-white hover:brightness-110 disabled:opacity-50"
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
            <a href={page.path} target="_blank" rel="noopener noreferrer" className="text-xs font-bold uppercase text-ibc-blue hover:underline">
              Voir la page →
            </a>
            {message && <span className="text-xs font-semibold text-ibc-blue">{message}</span>}
          </div>
        </div>
      )}
    </li>
  );
}
