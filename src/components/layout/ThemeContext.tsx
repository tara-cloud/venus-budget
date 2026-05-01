"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";

export type ThemePreference = "light" | "dark" | "system";

interface ThemeCtx {
  dark: boolean;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
}

const Ctx = createContext<ThemeCtx>({ dark: false, preference: "system", setPreference: () => {} });

export function useTheme() { return useContext(Ctx); }

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [systemDark, setSystemDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = (localStorage.getItem("theme-preference") as ThemePreference) ?? "system";
    setPreferenceState(stored);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mq.matches);
    const h = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", h);
    setMounted(true);
    return () => mq.removeEventListener("change", h);
  }, []);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    localStorage.setItem("theme-preference", p);
  }, []);

  const dark = preference === "dark" || (preference === "system" && systemDark);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", dark);
  }, [dark, mounted]);

  return (
    <Ctx.Provider value={{ dark, preference, setPreference }}>
      {children}
    </Ctx.Provider>
  );
}
