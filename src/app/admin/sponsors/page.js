"use client";

import { useEffect, useState } from "react";
import { resizeImageToDataUrl } from "@/lib/image-client";

const EMPTY = { name: "", logo_data_url: "", description: "", website_url: "" };

export default function SponsorsAdminPage() {
  const [sponsors, setSponsors] = useState([]);
  const [creating, setCreating] = useState(false);
  const [newSponsor, setNewSponsor] = useState(EMPTY);
  const [openId, setOpenId] = useState(null);

  function refresh() {
    fetch("/api/sponsors").then((r) => r.json()).then(setSponsors);
  }

  useEffect(refresh, []);

  async function handleLogo(file, setter) {
    if (!file) return;
    const dataUrl = await resizeImageToDataUrl(file, 600);
    setter((f) => ({ ...f, logo_data_url: dataUrl }));
  }

  async function createSponsor(e) {
    e.preventDefault();
    await fetch("/api/sponsors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSponsor),
    });
    setNewSponsor(EMPTY);
    setCreating(false);
    refresh();
  }

  async function updateSponsor(id, patch) {
    await fetch(`/api/sponsors/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    refresh();
  }

  async function deleteSponsor(id) {
    if (!confirm("Supprimer ce sponsor ?")) return;
    await fetch(`/api/sponsors/${id}`, { method: "DELETE" });
    refresh();
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-extrabold uppercase text-ibc-blue">Sponsors</h1>
        <button
          onClick={() => setCreating((c) => !c)}
          className="rounded-full bg-ibc-blue px-5 py-2 text-sm font-bold uppercase text-white hover:brightness-110"
        >
          {creating ? "Annuler" : "+ Ajouter un sponsor"}
        </button>
      </div>
      <p className="mt-1 text-sm text-ibc-ink/60">
        Affichés publiquement sur la page d&apos;accueil. Logo + description modifiables ici.
      </p>

      {creating && (
        <form
          onSubmit={createSponsor}
          className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-black/5 bg-white p-5 shadow-sm"
        >
          <input
            placeholder="Nom du sponsor"
            required
            value={newSponsor.name}
            onChange={(e) => setNewSponsor({ ...newSponsor, name: e.target.value })}
            className="input col-span-2"
          />
          <div className="col-span-2 flex items-center gap-3">
            {newSponsor.logo_data_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={newSponsor.logo_data_url} alt="" className="h-12 w-12 rounded object-contain" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleLogo(e.target.files?.[0], setNewSponsor)}
            />
          </div>
          <input
            placeholder="Site web (optionnel)"
            value={newSponsor.website_url}
            onChange={(e) => setNewSponsor({ ...newSponsor, website_url: e.target.value })}
            className="input col-span-2"
          />
          <textarea
            placeholder="Description"
            value={newSponsor.description}
            onChange={(e) => setNewSponsor({ ...newSponsor, description: e.target.value })}
            className="input col-span-2"
            rows={3}
          />
          <button className="col-span-2 rounded-full bg-ibc-accent py-2 text-sm font-bold uppercase text-ibc-ink hover:brightness-95">
            Créer le sponsor
          </button>
        </form>
      )}

      <ul className="mt-6 space-y-3">
        {sponsors.map((s) => (
          <SponsorRow
            key={s.id}
            sponsor={s}
            open={openId === s.id}
            onToggle={() => setOpenId(openId === s.id ? null : s.id)}
            onSave={(patch) => updateSponsor(s.id, patch)}
            onDelete={() => deleteSponsor(s.id)}
          />
        ))}
        {sponsors.length === 0 && !creating && (
          <p className="text-sm text-ibc-ink/50">Aucun sponsor pour l&apos;instant.</p>
        )}
      </ul>

      <style jsx global>{`
        .input {
          border-radius: 0.5rem;
          border: 1px solid rgba(0, 0, 0, 0.1);
          padding: 0.5rem 0.75rem;
          font-size: 0.925rem;
        }
      `}</style>
    </div>
  );
}

function SponsorRow({ sponsor, open, onToggle, onSave, onDelete }) {
  const [form, setForm] = useState(sponsor);

  useEffect(() => setForm(sponsor), [sponsor]);

  async function handleLogo(file) {
    if (!file) return;
    const dataUrl = await resizeImageToDataUrl(file, 600);
    setForm((f) => ({ ...f, logo_data_url: dataUrl }));
  }

  return (
    <li className="rounded-xl border border-black/5 bg-white shadow-sm">
      <button onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-ibc-blue/10">
          {sponsor.logo_data_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={sponsor.logo_data_url} alt="" className="h-full w-full object-contain" />
          )}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-ibc-ink">{sponsor.name}</p>
          <p className="text-xs text-ibc-ink/50">{sponsor.website_url || "pas de site web"}</p>
        </div>
        <span className="text-xs font-bold uppercase text-ibc-blue">{open ? "fermer" : "modifier"}</span>
      </button>

      {open && (
        <div className="grid grid-cols-2 gap-3 border-t border-black/5 p-4">
          <label className="col-span-2 text-xs font-bold uppercase text-ibc-blue">Logo</label>
          <div className="col-span-2 flex items-center gap-3">
            <input type="file" accept="image/*" onChange={(e) => handleLogo(e.target.files?.[0])} />
          </div>
          <input
            className="input col-span-2"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nom"
          />
          <input
            className="input col-span-2"
            value={form.website_url || ""}
            onChange={(e) => setForm({ ...form, website_url: e.target.value })}
            placeholder="Site web"
          />
          <textarea
            className="input col-span-2"
            rows={3}
            value={form.description || ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Description"
          />
          <div className="col-span-2 flex gap-2">
            <button
              onClick={() => onSave(form)}
              className="rounded-full bg-ibc-blue px-5 py-2 text-sm font-bold uppercase text-white hover:brightness-110"
            >
              Enregistrer
            </button>
            <button
              onClick={onDelete}
              className="rounded-full bg-red-50 px-5 py-2 text-sm font-bold uppercase text-red-600 hover:bg-red-100"
            >
              Supprimer
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
