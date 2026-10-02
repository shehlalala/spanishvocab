"use client";
import type { Content } from "../types";
import { db } from "./db";

let cache: Promise<Content> | null = null;

async function fetchBase(): Promise<Content> {
  const res = await fetch("/content.json");
  if (!res.ok) throw new Error(`Could not load words (${res.status})`);
  return (await res.json()) as Content;
}

/** Built-in content (cached by the service worker) merged with the learner's own imported sets. */
export function loadContent(): Promise<Content> {
  cache ??= (async () => {
    const base = await fetchBase();
    const [entries, sets, sentences] = await Promise.all([
      db().customEntries.toArray(),
      db().customSets.toArray(),
      db().customSentences.toArray(),
    ]);
    return {
      ...base,
      entries: [...base.entries, ...entries],
      sets: [...sets, ...base.sets],
      sentences: [
        ...base.sentences,
        ...sentences.map(({ entryId, text, answers, translation }) => ({ entryId, text, answers, translation })),
      ],
    };
  })();
  cache.catch(() => {
    cache = null;
  });
  return cache;
}

/** Call after importing a set so the next load picks it up. */
export function invalidateContent(): void {
  cache = null;
}
