"use client";
import type { RegionPref } from "../region";

export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

const LATAM = ["es-MX", "es-US", "es-419", "es-CO", "es-AR"];

function pickVoice(pref: RegionPref): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  const wanted = pref === "es-ES" ? ["es-ES"] : LATAM;
  for (const lang of wanted) {
    const v = voices.find((x) => x.lang.replace("_", "-") === lang);
    if (v) return v;
  }
  return voices.find((x) => x.lang.toLowerCase().startsWith("es"));
}

/** True if the device has at least one Spanish voice (voices load asynchronously on some browsers). */
export function hasSpanishVoice(): Promise<boolean> {
  if (!speechSupported()) return Promise.resolve(false);
  const check = () => window.speechSynthesis.getVoices().some((v) => v.lang.toLowerCase().startsWith("es"));
  if (window.speechSynthesis.getVoices().length) return Promise.resolve(check());
  return new Promise((resolve) => {
    const done = () => resolve(check());
    window.speechSynthesis.addEventListener("voiceschanged", done, { once: true });
    setTimeout(done, 1500);
  });
}

/** Speak a Spanish word or phrase. Strips "el / la" style slashes so only one form is read. */
export function speak(text: string, pref: RegionPref): void {
  if (!speechSupported()) return;
  const clean = text.replace(/^(el|la) \/ (el|la) /, "$1 ").split(" / ")[0] ?? text;
  const u = new SpeechSynthesisUtterance(clean);
  const voice = pickVoice(pref);
  if (voice) u.voice = voice;
  u.lang = voice?.lang ?? pref;
  u.rate = 0.9;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}
