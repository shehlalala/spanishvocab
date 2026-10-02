"use client";
import { useCallback, useState } from "react";
import { quizOptions } from "@/lib/queue";
import { shownForm, type RegionPref } from "@/lib/region";
import type { Grade } from "@/lib/srs";
import type { Entry } from "@/lib/types";
import { SpeakButton } from "../SpeakButton";
import { DoneTile, Meta, Notes, useEnterToContinue } from "./shared";

export function Quiz(props: {
  deck: readonly Entry[];
  queue: readonly Entry[];
  pref: RegionPref;
  onGrade: (id: string, g: Grade) => void;
  onRestart: () => void;
}) {
  const { deck, queue, pref, onGrade, onRestart } = props;
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [opts, setOpts] = useState<string[]>(() => (queue[0] ? quizOptions(queue[0], deck) : []));
  const card = queue[idx];

  const next = useCallback(() => {
    const n = idx + 1;
    const c = queue[n];
    setOpts(c ? quizOptions(c, deck) : []);
    setPicked(null);
    setIdx(n);
  }, [idx, queue, deck]);
  useEnterToContinue(picked !== null, next);

  if (!card) {
    return (
      <>
        <Meta left="" right="" />
        <DoneTile
          big={`${score}/${queue.length}`}
          note={score === queue.length ? "Perfect score." : "Retake the quiz to beat it."}
        />
        <div className="mt-3.5 flex gap-2">
          <button className="btn btn-primary flex-1" onClick={onRestart}>
            Retake quiz
          </button>
        </div>
      </>
    );
  }

  const shown = shownForm(card, pref);
  return (
    <>
      <Meta left={`${idx + 1} / ${queue.length}`} right={`Score: ${score}`} />
      <div className="tile min-h-[200px]">
        <div className="font-serif text-[2.3rem] leading-tight font-bold" lang="es" data-testid="word">
          {shown}
        </div>
        <SpeakButton text={shown} className="mt-2" />
        {picked !== null ? <Notes entry={card} /> : null}
      </div>
      <div className="mt-3.5 grid gap-2" role="group" aria-label="Choose the meaning">
        {opts.map((o) => {
          let cls = "btn justify-start text-left py-3";
          if (picked !== null) {
            if (o === card.meaning) cls += " btn-right";
            else if (o === picked) cls += " btn-wrong";
          }
          return (
            <button
              key={o}
              className={cls}
              disabled={picked !== null}
              data-testid="option"
              onClick={() => {
                setPicked(o);
                const ok = o === card.meaning;
                if (ok) setScore((s) => s + 1);
                onGrade(card.id, ok ? "good" : "again");
              }}
            >
              {o}
            </button>
          );
        })}
      </div>
      {picked !== null ? (
        <div className="mt-3.5 flex">
          <button className="btn btn-primary flex-1" onClick={next}>
            Next word
          </button>
        </div>
      ) : null}
    </>
  );
}
