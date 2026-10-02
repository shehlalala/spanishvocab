"use client";
import { useEffect, useState } from "react";
import { hasSpanishVoice, speak } from "@/lib/client/speech";
import { useSettings } from "@/lib/client/settings";

/** Pronounces a Spanish word. Renders nothing where speech synthesis or a Spanish voice is unavailable. */
export function SpeakButton({ text, className = "" }: { text: string; className?: string }) {
  const [settings] = useSettings();
  const [ok, setOk] = useState(false);
  useEffect(() => {
    let live = true;
    void hasSpanishVoice().then((v) => live && setOk(v));
    return () => {
      live = false;
    };
  }, []);
  if (!ok) return null;
  return (
    <button
      type="button"
      className={`inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-card text-tile ${className}`}
      aria-label={`Pronounce ${text}`}
      title="Pronounce"
      onClick={(e) => {
        e.stopPropagation();
        speak(text, settings.region);
      }}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M11 5 6 9H2v6h4l5 4V5z" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
        <path d="M19 5a10 10 0 0 1 0 14" />
      </svg>
    </button>
  );
}
