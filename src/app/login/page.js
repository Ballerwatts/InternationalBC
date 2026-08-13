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

  const [googleError, setGoogleError] = useState("");

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated) router.replace(d.role === "admin" ? "/admin" : "/team");
        else setNeedsSetup(d.needsSetup);
      });

    const code = new URLSearchParams(window.location.search).get("google_error");
    if (code === "no_admin_account") {
      setGoogleError("Aucun compte admin n'est associé à cette adresse Google.");
    } else if (code === "not_configured") {
      setGoogleError("La connexion Google n'est pas encore configurée pour ce site.");
    } else if (code) {
      setGoogleError("La connexion avec Google a échoué. Réessayez ou utilisez votre mot de passe.");
    }
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
          {googleError && (
            <p className="mt-4 rounded-lg bg-red-50 p-3 text-center text-sm text-red-600">{googleError}</p>
          )}

          <a
            href="/api/auth/google/start"
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-full border border-black/10 bg-white py-2.5 text-sm font-bold uppercase text-ibc-ink shadow-sm hover:bg-black/5"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.3 0 10.1-2 13.7-5.3l-6.3-5.3C29.4 35.1 26.8 36 24 36c-5.3 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.3 5.3C40.5 36.5 44 30.8 44 24c0-1.3-.1-2.7-.4-3.5z"/>
            </svg>
            Se connecter avec Google
          </a>
          <p className="mt-1 text-center text-xs text-ibc-ink/40">Réservé aux comptes admin</p>

          <div className="my-4 flex items-center gap-3 text-xs uppercase text-ibc-ink/40">
            <span className="h-px flex-1 bg-black/10" /> ou <span className="h-px flex-1 bg-black/10" />
          </div>

          <form onSubmit={handleLogin} className="space-y-4 rounded-xl border border-black/5 bg-white p-6 shadow-sm">
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
