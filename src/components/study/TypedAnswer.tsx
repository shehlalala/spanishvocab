"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { checkAnswer, type Verdict } from "@/lib/answer";
import type { AnswerSets, RegionPref } from "@/lib/region";
import { gradeFromVerdict, type Grade } from "@/lib/srs";
import { DoneTile, Meta, useEnterToContinue, verdictMessage } from "./shared";

export interface TypedItem {
  id: string;
  answers: AnswerSets;
  /** Form shown as the correct answer. */
  shown: string;
  hints: [string, string];
}

/** Shared engine for the two typing modes (sentence fill-in and EN → ES). */
export function TypedAnswer<T extends TypedItem>(props: {
  items: readonly T[];
  pref: RegionPref;
  placeholder: string;
  nextLabel: string;
  prompt: (item: T, verdict: Verdict | null) => ReactNode;
  after: (item: T) => ReactNode;
  onGrade: (id: string, g: Grade) => void;
  onRestart: () => void;
}) {
  const { items, pref, onGrade, onRestart } = props;
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [value, setValue] = useState("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [hints, setHints] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const item = items[idx];

  useEffect(() => {
    if (!verdict) input.current?.focus({ preventScroll: true });
  }, [idx, verdict]);

  const next = useCallback(() => {
    setIdx((i) => i + 1);
    setVerdict(null);
    setValue("");
    setHints(0);
  }, []);
  useEnterToContinue(verdict !== null, next);

  if (!item) {
    return (
      <>
        <Meta left="" right="" />
        <DoneTile
          big={`${score}/${items.length}`}
          note={score === items.length ? "Perfect score." : "Retake the quiz to beat it."}
        />
        <div className="mt-3.5 flex">
          <button className="btn btn-primary flex-1" onClick={onRestart}>
            Retake quiz
          </button>
        </div>
      </>
    );
  }

  const check = () => {
    if (!value.trim()) return;
    const v = checkAnswer(value, item.answers);
    setVerdict(v);
    if (v.correct) setScore((s) => s + 1);
    onGrade(item.id, gradeFromVerdict(v.kind, hints > 0));
  };

  return (
    <>
      <Meta left={`${idx + 1} / ${items.length}`} right={`Score: ${score}`} />
      <div className="tile min-h-[200px]">
        {props.prompt(item, verdict)}
        {verdict ? (
          <>
            <div
              className={`mt-2.5 font-bold ${verdict.correct ? "text-ok" : "text-bad"}`}
              data-testid="verdict"
              role="status"
            >
              {verdictMessage(verdict, item.shown, value, pref)}
            </div>
            {props.after(item)}
          </>
        ) : (
          <div className="mt-4 min-h-6 text-sm text-muted" data-testid="hint" aria-live="polite">
            {hints > 0 ? item.hints[Math.min(hints, 2) - 1] : ""}
          </div>
        )}
      </div>
      {verdict ? (
        <div className="mt-3.5 flex">
          <button className="btn btn-primary flex-1" onClick={next}>
            {props.nextLabel}
          </button>
        </div>
      ) : (
        <form
          className="mt-3.5"
          onSubmit={(e) => {
            e.preventDefault();
            check();
          }}
        >
          <input
            ref={input}
            className="answer-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={(e) => {
              // Keep the field visible above the on-screen keyboard.
              const el = e.currentTarget;
              setTimeout(() => el.scrollIntoView({ block: "center", behavior: "smooth" }), 250);
            }}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            lang="es"
            aria-label={props.placeholder}
            placeholder={props.placeholder}
            data-testid="answer"
          />
          <div className="mt-3.5 flex gap-2">
            <button
              type="button"
              className="btn flex-1"
              onClick={() => {
                setHints((h) => h + 1);
                input.current?.focus();
              }}
            >
              Hint
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              Check
            </button>
          </div>
        </form>
      )}
    </>
  );
}
