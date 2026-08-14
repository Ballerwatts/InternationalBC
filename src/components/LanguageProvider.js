"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { translate } from "@/lib/i18n";

const LanguageContext = createContext({ lang: "en", setLang: () => {}, t: (k) => k });

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState("en");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("ibbc_lang") : null;
    if (saved === "en" || saved === "fr") setLangState(saved);
  }, []);

  const setLang = useCallback((l) => {
    setLangState(l);
    if (typeof window !== "undefined") window.localStorage.setItem("ibbc_lang", l);
  }, []);

  const t = useCallback((key) => translate(lang, key), [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
