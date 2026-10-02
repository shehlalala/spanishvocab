"use client";
import { useCallback, useSyncExternalStore } from "react";
import type { RegionPref } from "../region";

export type Theme = "system" | "light" | "dark";

export interface Settings {
  region: RegionPref;
  theme: Theme;
  /** New cards introduced per day on the Due today screen. */
  newPerDay: number;
  /** Set slugs that feed new cards into Due today. */
  dailySets: string[];
}

export const DEFAULT_SETTINGS: Settings = {
  region: "es-ES",
  theme: "system",
  newPerDay: 15,
  dailySets: ["mine-all"],
};

const KEY = "vocabulario:settings";
const listeners = new Set<() => void>();
let snapshot: Settings | null = null;

function read(): Settings {
  if (snapshot) return snapshot;
  try {
    const raw = localStorage.getItem(KEY);
    snapshot = raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) } : DEFAULT_SETTINGS;
  } catch {
    snapshot = DEFAULT_SETTINGS;
  }
  return snapshot;
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

export function writeSettings(patch: Partial<Settings>): void {
  snapshot = { ...read(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch {
    // Private mode or storage full: settings still apply for this session.
  }
  if (patch.theme) applyTheme(patch.theme);
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useSettings(): [Settings, (patch: Partial<Settings>) => void] {
  const s = useSyncExternalStore(subscribe, read, () => DEFAULT_SETTINGS);
  const set = useCallback((patch: Partial<Settings>) => writeSettings(patch), []);
  return [s, set];
}

/** Inline script for <head>: applies the saved theme before first paint. */
export const THEME_BOOT = `try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(KEY)})||"{}");if(s.theme&&s.theme!=="system")document.documentElement.setAttribute("data-theme",s.theme)}catch(e){}`;
