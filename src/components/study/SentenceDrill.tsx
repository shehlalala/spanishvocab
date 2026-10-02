"use client";
import { useMemo } from "react";
import { sentenceAnswers, shownForm, type RegionPref } from "@/lib/region";
import type { Grade } from "@/lib/srs";
import type { Entry, Sentence } from "@/lib/types";
import { TypedAnswer, type TypedItem } from "./TypedAnswer";

interface Item extends TypedItem {
  sentence: Sentence;
  entry: Entry;
}

export function SentenceDrill(props: {
  queue: readonly Entry[];
  sentences: ReadonlyMap<string, Sentence[]>;
  pref: RegionPref;
  onGrade: (id: string, g: Grade) => void;
  onRestart: () => void;
}) {
  const { queue, sentences, pref } = props;
  const items = useMemo<Item[]>(
    () =>
      queue.flatMap((entry) => {
        const sentence = sentences.get(entry.id)?.[0];
        if (!sentence) return [];
        const answers = sentenceAnswers(sentence, entry, pref);
        const first = answers.accepted[0] ?? "";
        return [
          {
            id: entry.id,
            entry,
            sentence,
            answers,
            shown: first,
            hints: [`Meaning: ${entry.meaning}`, `Starts with “${first.slice(0, 2)}…”`] as [string, string],
          },
        ];
      }),
    [queue, sentences, pref],
  );

  if (!items.length) {
    return (
      <div className="tile min-h-[200px]" data-testid="empty">
        <div className="max-w-[34ch] text-muted">
          This set has no sentences yet. Sentences are ready for Sets 3–8: pick one of those above.
        </div>
      </div>
    );
  }

  return (
    <TypedAnswer
      items={items}
      pref={pref}
      placeholder="Type the missing word"
      nextLabel="Next sentence"
      onGrade={props.onGrade}
      onRestart={props.onRestart}
      prompt={(item, verdict) => {
        const [before, after] = item.sentence.text.split("___");
        return (
          <div className="font-serif text-[1.45rem] leading-snug" lang="es" data-testid="sentence">
            {before}
            <span className="blank">{verdict ? item.shown : " "}</span>
            {after}
          </div>
        );
      }}
      after={(item) => (
        <>
          <div className="mt-2.5 text-[0.95rem] text-muted">{item.sentence.translation}</div>
          <div className="mt-1 text-sm text-muted" lang="es">
            {shownForm(item.entry, pref)} · {item.entry.meaning}
          </div>
        </>
      )}
    />
  );
}
