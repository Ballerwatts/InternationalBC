"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [needsSetup, setNeedsSetup] = useState(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated) router.replace("/admin");
        else setNeedsSetup(d.needsSetup);
      });
  }, [router]);

  async function handleSetup(e) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) router.replace("/admin");
    else setError((await res.json()).error || "Erreur");
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) router.replace("/admin");
    else setError((await res.json()).error || "Erreur");
  }

  if (needsSetup === null) {
    return <div className="mx-auto max-w-md px-4 py-24 text-center text-mbc-ink/60">Chargement…</div>;
  }

  return (
    <div className="mx-auto max-w-md px-4 py-24">
      <h1 className="text-center font-display text-3xl font-extrabold uppercase text-mbc-blue">
        Espace admin
      </h1>
      {needsSetup ? (
        <form onSubmit={handleSetup} className="mt-8 space-y-4 rounded-xl border border-black/5 bg-white p-6 shadow-sm">
          <p className="text-sm text-mbc-ink/70">
            Premier accès : créez le mot de passe administrateur du club (8 caractères minimum).
          </p>
          <input
            type="password"
            placeholder="Nouveau mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-black/10 px-3 py-2"
          />
          <input
            type="password"
            placeholder="Confirmer le mot de passe"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-md border border-black/10 px-3 py-2"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            disabled={loading}
            className="w-full rounded-full bg-mbc-blue py-2.5 text-sm font-bold uppercase text-white hover:brightness-110 disabled:opacity-50"
          >
            {loading ? "…" : "Créer le mot de passe"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleLogin} className="mt-8 space-y-4 rounded-xl border border-black/5 bg-white p-6 shadow-sm">
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-black/10 px-3 py-2"
            autoFocus
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            disabled={loading}
            className="w-full rounded-full bg-mbc-blue py-2.5 text-sm font-bold uppercase text-white hover:brightness-110 disabled:opacity-50"
          >
            {loading ? "…" : "Se connecter"}
          </button>
        </form>
      )}
    </div>
  );
}
