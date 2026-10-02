"use client";
import { useMemo } from "react";
import { shownForm, typingAnswers, type RegionPref } from "@/lib/region";
import type { Grade } from "@/lib/srs";
import type { Entry } from "@/lib/types";
import { normalize } from "@/lib/answer";
import { TypedAnswer, type TypedItem } from "./TypedAnswer";
import { Notes } from "./shared";

interface Item extends TypedItem {
  entry: Entry;
}

export function TypeDrill(props: {
  deck: readonly Entry[];
  queue: readonly Entry[];
  pref: RegionPref;
  onGrade: (id: string, g: Grade) => void;
  onRestart: () => void;
}) {
  const { deck, queue, pref } = props;
  const items = useMemo<Item[]>(
    () =>
      queue.map((entry) => {
        const shown = shownForm(entry, pref);
        const first = normalize(shown.split(" / ")[0] ?? shown);
        return {
          id: entry.id,
          entry,
          answers: typingAnswers(entry, pref, deck),
          shown,
          hints: [
            `${first.length} letters, starts with “${first[0] ?? ""}”`,
            `Starts with “${first.slice(0, 3)}…”`,
          ] as [string, string],
        };
      }),
    [queue, deck, pref],
  );

  return (
    <TypedAnswer
      items={items}
      pref={pref}
      placeholder="Type it in Spanish"
      nextLabel="Next word"
      onGrade={props.onGrade}
      onRestart={props.onRestart}
      prompt={(item) => (
        <>
          <div className="mb-1.5 text-sm text-muted">How do you say…</div>
          <div className="font-serif text-[2rem] leading-tight font-bold" data-testid="prompt">
            {item.entry.meaning}
          </div>
        </>
      )}
      after={(item) => <Notes entry={item.entry} />}
    />
  );
}
