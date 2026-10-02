"use client";
import { useEffect } from "react";

/** Registers /sw.js in production so the app and word list work offline. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline support is an enhancement; the app still works online without it.
    });
  }, []);
  return null;
}
