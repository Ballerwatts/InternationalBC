"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js so the browser will offer to install the site as an app.
 * Renders nothing. Failures are swallowed: an unregistered worker costs an
 * install prompt, never a working page.
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // Registering on load keeps it off the critical path of first paint.
    const register = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
