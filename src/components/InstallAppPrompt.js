"use client";

import { useEffect, useState } from "react";

const DISMISSED_KEY = "ibbc_install_dismissed";

/**
 * "Add the club app to your phone."
 *
 * The site is already installable — manifest, icons and a service worker are
 * all in place — but nothing told anyone. Android Chrome fires
 * `beforeinstallprompt` and we can install in one tap; iOS Safari fires
 * nothing at all and never offers it, so an iPhone member has to know about
 * Share → Add to Home Screen. That is the half nobody discovers, so it gets
 * spelled out rather than left to chance.
 */
export default function InstallAppPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Already installed — nothing to offer.
    const installed =
      window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone;
    if (installed) return;

    let dismissed = false;
    try {
      dismissed = window.localStorage.getItem(DISMISSED_KEY) === "1";
    } catch {
      // Private mode or blocked storage — show it rather than hide it.
    }
    if (dismissed) return;

    const onPrompt = (e) => {
      // Keep the event so the button can trigger the real install later.
      e.preventDefault();
      setDeferred(e);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS Safari: no event is ever fired, so detect it and show instructions.
    const ua = window.navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    if (isIos && isSafari) {
      setShowIosHelp(true);
      setVisible(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Not being able to remember the dismissal is not worth an error.
    }
  }

  async function install() {
    if (!deferred) return;
    deferred.prompt();
    const { outcome } = await deferred.userChoice.catch(() => ({ outcome: "dismissed" }));
    setDeferred(null);
    if (outcome === "accepted") dismiss();
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-xl border border-black/10 bg-white p-4 shadow-lg sm:inset-x-auto sm:right-4">
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" className="h-10 w-10 shrink-0 rounded-lg" />
        <div className="min-w-0">
          <p className="font-display text-sm font-bold uppercase text-ibc-blue">
            Ajouter l&apos;app du club
          </p>
          {showIosHelp ? (
            <p className="mt-1 text-xs leading-relaxed text-ibc-ink/70">
              Appuyez sur <span className="font-semibold">Partager</span> en bas de Safari, puis sur{" "}
              <span className="font-semibold">Sur l&apos;écran d&apos;accueil</span>.
            </p>
          ) : (
            <p className="mt-1 text-xs leading-relaxed text-ibc-ink/70">
              Calendrier, résultats et espace équipe, en un tap depuis votre écran d&apos;accueil.
            </p>
          )}
          <div className="mt-2 flex items-center gap-3">
            {!showIosHelp && (
              <button
                type="button"
                onClick={install}
                className="rounded-full bg-ibc-blue px-4 py-1.5 text-xs font-bold uppercase text-white hover:brightness-110"
              >
                Installer
              </button>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="text-xs font-bold uppercase text-ibc-ink/45 hover:underline"
            >
              Plus tard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
