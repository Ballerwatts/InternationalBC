"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [needsSetup, setNeedsSetup] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Public "request access" form — a super-admin approves each request
  // from /admin/users before any login is created.
  const [showRequest, setShowRequest] = useState(false);
  const [reqName, setReqName] = useState("");
  const [reqEmail, setReqEmail] = useState("");
  const [reqPhone, setReqPhone] = useState("");
  const [reqMessage, setReqMessage] = useState("");
  const [reqError, setReqError] = useState("");
  const [reqSent, setReqSent] = useState(false);
  const [reqLoading, setReqLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated) router.replace(d.role === "admin" ? "/admin" : "/team");
        else setNeedsSetup(d.needsSetup);
      });
  }, [router]);

  function redirectForRole(role) {
    router.replace(role === "admin" ? "/admin" : "/team");
  }

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
      body: JSON.stringify({ name, email, password }),
    });
    setLoading(false);
    if (res.ok) redirectForRole((await res.json()).role);
    else setError((await res.json()).error || "Erreur");
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (res.ok) redirectForRole((await res.json()).role);
    else setError((await res.json()).error || "Erreur");
  }

  async function handleRequest(e) {
    e.preventDefault();
    setReqError("");
    setReqLoading(true);
    const res = await fetch("/api/access-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: reqName, email: reqEmail, phone: reqPhone, message: reqMessage }),
    });
    setReqLoading(false);
    if (res.ok) {
      setReqSent(true);
    } else {
      setReqError((await res.json()).error || "Erreur");
    }
  }

  if (needsSetup === null) {
    return <div className="mx-auto max-w-md px-4 py-24 text-center text-ibc-ink/60">Chargement…</div>;
  }

  return (
    <div className="mx-auto max-w-md px-4 py-24">
      <h1 className="text-center font-display text-3xl font-extrabold uppercase text-ibc-blue">
        Espace équipe
      </h1>
      <p className="mt-2 text-center text-sm text-ibc-ink/60">
        Connexion pour le staff et les joueurs du club.
      </p>
      {needsSetup ? (
        <form onSubmit={handleSetup} className="mt-8 space-y-4 rounded-xl border border-black/5 bg-white p-6 shadow-sm">
          <p className="text-sm text-ibc-ink/70">
            Premier accès : créez le compte administrateur du club.
          </p>
          <input
            type="text"
            placeholder="Nom complet"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-black/10 px-3 py-2"
          />
          <input
            type="email"
            placeholder="Adresse e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-black/10 px-3 py-2"
          />
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
            className="w-full rounded-full bg-ibc-blue py-2.5 text-sm font-bold uppercase text-white hover:brightness-110 disabled:opacity-50"
          >
            {loading ? "…" : "Créer le compte admin"}
          </button>
        </form>
      ) : (
        <>
          <form onSubmit={handleLogin} className="mt-8 space-y-4 rounded-xl border border-black/5 bg-white p-6 shadow-sm">
            <input
              type="email"
              placeholder="Adresse e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-black/10 px-3 py-2"
              autoFocus
            />
            <input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-black/10 px-3 py-2"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              disabled={loading}
              className="w-full rounded-full bg-ibc-blue py-2.5 text-sm font-bold uppercase text-white hover:brightness-110 disabled:opacity-50"
            >
              {loading ? "…" : "Se connecter"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setShowRequest((s) => !s)}
              className="text-sm font-semibold text-ibc-blue hover:underline"
            >
              {showRequest ? "Annuler" : "Pas encore de compte ? Demander un accès"}
            </button>
          </div>

          {showRequest && (
            <div className="mt-4 rounded-xl border border-black/5 bg-white p-6 shadow-sm">
              {reqSent ? (
                <p className="text-sm text-green-700">
                  Votre demande a bien été envoyée. Un responsable du club l&apos;examinera et vous
                  enverra vos identifiants par e-mail une fois approuvée.
                </p>
              ) : (
                <form onSubmit={handleRequest} className="space-y-3">
                  <p className="text-sm text-ibc-ink/70">
                    Un responsable du club (super-admin) devra approuver votre demande avant que
                    votre compte soit actif.
                  </p>
                  <input
                    type="text"
                    placeholder="Nom complet"
                    required
                    value={reqName}
                    onChange={(e) => setReqName(e.target.value)}
                    className="w-full rounded-md border border-black/10 px-3 py-2"
                  />
                  <input
                    type="email"
                    placeholder="Adresse e-mail"
                    required
                    value={reqEmail}
                    onChange={(e) => setReqEmail(e.target.value)}
                    className="w-full rounded-md border border-black/10 px-3 py-2"
                  />
                  <input
                    type="tel"
                    placeholder="Téléphone (facultatif)"
                    value={reqPhone}
                    onChange={(e) => setReqPhone(e.target.value)}
                    className="w-full rounded-md border border-black/10 px-3 py-2"
                  />
                  <textarea
                    rows={2}
                    placeholder="Message (facultatif) — ex. votre nom d'équipe, comment vous rejoignez le club"
                    value={reqMessage}
                    onChange={(e) => setReqMessage(e.target.value)}
                    className="w-full rounded-md border border-black/10 px-3 py-2"
                  />
                  {reqError && <p className="text-sm text-red-600">{reqError}</p>}
                  <button
                    disabled={reqLoading}
                    className="w-full rounded-full bg-ibc-accent py-2.5 text-sm font-bold uppercase text-ibc-ink hover:brightness-95 disabled:opacity-50"
                  >
                    {reqLoading ? "…" : "Envoyer la demande"}
                  </button>
                </form>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
