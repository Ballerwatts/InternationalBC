"use client";

import { useEffect, useState } from "react";

/**
 * The two bits of the newsletter that are the same in every issue: a line
 * under the title, and the block of text in the footer.
 *
 * Free text on purpose. The crest, the colours and the unsubscribe link are
 * not editable — an admin should not be able to style the email into
 * unreadability, and removing the unsubscribe link is not theirs to do.
 */
export default function NewsletterChromeEditor() {
  const [header, setHeader] = useState("");
  const [footer, setFooter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => {
        setHeader(s?.newsletter_header_text || "");
        setFooter(s?.newsletter_footer_text || "");
      })
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        newsletter_header_text: header,
        newsletter_footer_text: footer,
      }),
    });
    setSaving(false);
    setMessage(res.ok ? "Enregistré — visible dès le prochain aperçu." : "Échec de l'enregistrement.");
    setTimeout(() => setMessage(""), 3000);
  }

  return (
    <div className="rounded-xl border border-black/5 bg-white p-5 shadow-sm">
      <h2 className="font-display text-lg font-bold uppercase text-ibc-blue">
        En-tête et pied de page
      </h2>
      <p className="mt-1 text-xs text-ibc-ink/55">
        Identiques dans chaque numéro. Le blason, les couleurs et le lien de désinscription ne sont
        pas modifiables — le lien de désinscription est obligatoire.
      </p>

      {loading ? (
        <p className="mt-3 text-xs text-ibc-ink/50">Chargement…</p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-ibc-blue/70">
              Ligne d&apos;en-tête (sous le titre)
            </label>
            <textarea
              value={header}
              onChange={(e) => setHeader(e.target.value)}
              rows={3}
              placeholder="Les nouvelles de la semaine du club"
              className="input w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-ibc-blue/70">
              Pied de page
            </label>
            <textarea
              value={footer}
              onChange={(e) => setFooter(e.target.value)}
              rows={3}
              placeholder={"Chemin Eugène-Rigot 2, 1211 Genève 21\ninternationalbbcgeneve@gmail.com"}
              className="input w-full"
            />
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving || loading}
          className="rounded-full bg-ibc-blue px-4 py-2 text-xs font-bold uppercase text-white hover:brightness-110 disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
        {message && <span className="text-xs font-semibold text-ibc-blue">{message}</span>}
      </div>
    </div>
  );
}
