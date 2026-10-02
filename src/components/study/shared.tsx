"use client";
import { useEffect } from "react";
import { REGION_LABEL, type RegionPref } from "@/lib/region";
import type { Verdict } from "@/lib/answer";
import type { Entry } from "@/lib/types";

export function Meta({ left, right }: { left: string; right: string }) {
  return (
    <div className="mb-3 flex justify-between text-sm text-muted" aria-live="polite">
      <span data-testid="progress">{left}</span>
      <span data-testid="score">{right}</span>
    </div>
  );
}

/** Press Enter to continue once an answer is shown (the original page's behaviour). */
export function useEnterToContinue(active: boolean, onNext: () => void) {
  useEffect(() => {
    if (!active) return;
    let armed = false;
    const t = setTimeout(() => (armed = true), 0);
    const h = (e: KeyboardEvent) => {
      if (armed && e.key === "Enter") {
        e.preventDefault();
        onNext();
      }
    };
    document.addEventListener("keydown", h);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", h);
    };
  }, [active, onNext]);
}

export function verdictMessage(v: Verdict, shown: string, typed: string, pref: RegionPref): string {
  switch (v.kind) {
    case "exact":
      return `¡Correcto! ${shown}`;
    case "accent":
      return `Correct, but check the accent: ${v.expected}`;
    case "plural":
      return `Correct. The form we wanted is ${v.expected}`;
    case "variant":
      return `Correct, that's the ${pref === "es-ES" ? REGION_LABEL["es-419"] : REGION_LABEL["es-ES"]} word. In ${REGION_LABEL[pref]}: ${shown}`;
    case "wrong":
      return `You wrote “${typed.trim()}”. The answer is ${shown}.`;
  }
}

export function OtherRegion({ entry, pref }: { entry: Entry; pref: RegionPref }) {
  if (!entry.variants.length) return null;
  const other = pref === "es-ES" ? entry.variants.map((v) => v.form).join(", ") : entry.display;
  const where = pref === "es-ES" ? REGION_LABEL["es-419"] : REGION_LABEL["es-ES"];
  return (
    <div className="mt-2 text-sm text-muted">
      {where}: {other}
    </div>
  );
}

export function Notes({ entry }: { entry: Entry }) {
  return (
    <>
      {entry.note ? <div className="mt-2.5 max-w-[34ch] text-[0.95rem] text-muted">{entry.note}</div> : null}
      {entry.privateNote ? (
        <div className="mt-1.5 max-w-[34ch] text-sm text-muted italic">
          <span className="sr-only">Your note: </span>
          {entry.privateNote}
        </div>
      ) : null}
    </>
  );
}

export function DoneTile({ big, note }: { big: string; note: string }) {
  return (
    <div className="tile min-h-[260px]" data-testid="done">
      <div className="font-serif text-5xl font-bold">{big}</div>
      <div className="mt-2.5 max-w-[34ch] text-muted">{note}</div>
    </div>
  );
}
