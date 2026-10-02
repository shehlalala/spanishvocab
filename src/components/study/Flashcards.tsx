"use client";
import { useMemo, useState } from "react";
import type { RegionPref } from "@/lib/region";
import { shownForm } from "@/lib/region";
import { newState, schedule, type Grade, type ReviewState } from "@/lib/srs";
import type { Entry } from "@/lib/types";
import { SpeakButton } from "../SpeakButton";
import { DoneTile, Meta, Notes, OtherRegion } from "./shared";

const DAY = 86_400_000;
function label(ms: number): string {
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)} min`;
  const d = Math.round(ms / DAY);
  return d < 31 ? `${d} d` : `${Math.round(d / 30)} mo`;
}

const GRADES: { g: Grade; text: string; cls: string }[] = [
  { g: "again", text: "Study again", cls: "btn-bad" },
  { g: "good", text: "I know it", cls: "btn-ok" },
  { g: "easy", text: "Easy", cls: "" },
];

export function Flashcards(props: {
  deck: readonly Entry[];
  initialQueue: readonly Entry[];
  reviews: ReadonlyMap<string, ReviewState>;
  pref: RegionPref;
  onGrade: (id: string, g: Grade) => void;
  onRestart: () => void;
}) {
  const { deck, reviews, pref, onGrade, onRestart } = props;
  const [queue, setQueue] = useState<Entry[]>(() => [...props.initialQueue]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  // Interval previews only need minute precision, so one timestamp per session is enough.
  const [now] = useState(() => Date.now());
  const learned = deck.filter((e) => (reviews.get(e.id)?.reps ?? 0) > 0).length;
  const card = queue[idx];

  const previews = useMemo(() => {
    if (!card) return null;
    const s = reviews.get(card.id) ?? newState(card.id, now);
    return Object.fromEntries(GRADES.map(({ g }) => [g, label(schedule(s, g, now).due - now)])) as Record<
      Grade,
      string
    >;
  }, [card, reviews, now]);

  if (!card) {
    return (
      <>
        <Meta left="" right="" />
        <DoneTile big="¡Bien!" note={`You've learned ${learned} of ${deck.length} words in this set.`} />
        <div className="mt-3.5 flex gap-2">
          <button className="btn btn-primary flex-1" onClick={onRestart}>
            Study again
          </button>
        </div>
      </>
    );
  }

  const answer = (g: Grade) => {
    onGrade(card.id, g);
    if (g === "again") setQueue((q) => [...q, card]);
    setFlipped(false);
    setIdx((i) => i + 1);
  };
  const shown = shownForm(card, pref);

  return (
    <>
      <Meta left={`${idx + 1} / ${queue.length}`} right={`Learned: ${learned}/${deck.length}`} />
      <div
        className="tile min-h-[300px] cursor-pointer select-none"
        role="button"
        tabIndex={0}
        aria-label="Flip card"
        data-testid="card"
        onClick={() => setFlipped((f) => !f)}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            setFlipped((f) => !f);
          }
        }}
      >
        <div className="flex items-center gap-2">
          <div className="font-serif text-[2.3rem] leading-tight font-bold" lang="es" data-testid="word">
            {shown}
          </div>
        </div>
        <SpeakButton text={shown} className="mt-2" />
        {flipped ? (
          <>
            <div className="mt-1 text-[1.4rem] font-semibold text-tile" data-testid="meaning">
              {card.meaning}
            </div>
            <Notes entry={card} />
            <OtherRegion entry={card} pref={pref} />
          </>
        ) : (
          <div className="mt-4 text-sm text-muted">Tap to see the meaning</div>
        )}
      </div>
      <div className="mt-3.5 grid grid-cols-3 gap-2">
        {GRADES.map(({ g, text, cls }) => (
          <button key={g} className={`btn ${cls} flex-col !gap-0 leading-tight`} onClick={() => answer(g)}>
            <span>{text}</span>
            {previews ? <span className="text-xs font-normal opacity-75">{previews[g]}</span> : null}
          </button>
        ))}
      </div>
    </>
  );
}
