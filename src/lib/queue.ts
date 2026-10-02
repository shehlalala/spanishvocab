import { isDue, startOfDay, type ReviewState } from "./srs";
import type { Entry, StudySet } from "./types";

export type Mode = "cards" | "quiz" | "write" | "type";
export const MODES: { id: Mode; label: string }[] = [
  { id: "cards", label: "Flashcards" },
  { id: "quiz", label: "Quiz" },
  { id: "write", label: "Sentences" },
  { id: "type", label: "EN → ES" },
];
/** Quiz and typing rounds are capped at 25 for decks over 40, as in the original page. */
export const ROUND_CAP = 25;
export const BIG_DECK = 40;

export function shuffle<T>(xs: readonly T[], rand: () => number = Math.random): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = a[i] as T;
    a[i] = a[j] as T;
    a[j] = t;
  }
  return a;
}

export interface QueueContext {
  reviews: ReadonlyMap<string, ReviewState>;
  hasSentence: (id: string) => boolean;
  now: number;
  rand?: () => number;
}

export function buildQueue(mode: Mode, deck: readonly Entry[], ctx: QueueContext): Entry[] {
  const rand = ctx.rand ?? Math.random;
  if (mode === "cards") {
    const pending = deck.filter((e) => {
      const r = ctx.reviews.get(e.id);
      return !r || isDue(r, ctx.now);
    });
    return shuffle(pending.length ? pending : deck, rand);
  }
  if (mode === "write")
    return shuffle(
      deck.filter((e) => ctx.hasSentence(e.id)),
      rand,
    );
  const round = shuffle(deck, rand);
  return deck.length > BIG_DECK ? round.slice(0, ROUND_CAP) : round;
}

/** Three wrong options from the same deck, never sharing the right answer's meaning. */
export function quizOptions(card: Entry, deck: readonly Entry[], rand: () => number = Math.random): string[] {
  const others = [...new Set(deck.filter((x) => x.meaning !== card.meaning).map((x) => x.meaning))];
  return shuffle([card.meaning, ...shuffle(others, rand).slice(0, 3)], rand);
}

export interface Daily {
  due: Entry[];
  fresh: Entry[];
  /** Cards that will be due tomorrow, for the "all done" message. */
  tomorrow: number;
}

export function dailyQueue(
  entries: readonly Entry[],
  sets: readonly StudySet[],
  reviews: ReadonlyMap<string, ReviewState>,
  opts: { newPerDay: number; dailySets: readonly string[]; now: number },
): Daily {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const due = [...reviews.values()]
    .filter((r) => isDue(r, opts.now))
    .sort((a, b) => a.due - b.due)
    .map((r) => byId.get(r.entryId))
    .filter((e): e is Entry => !!e);
  const today = startOfDay(opts.now);
  const introduced = [...reviews.values()].filter((r) => r.firstSeen >= today).length;
  const room = Math.max(0, opts.newPerDay - introduced);
  const fresh: Entry[] = [];
  const seen = new Set<string>();
  for (const slug of opts.dailySets) {
    for (const id of sets.find((s) => s.slug === slug)?.entryIds ?? []) {
      if (fresh.length >= room) break;
      if (seen.has(id) || reviews.has(id)) continue;
      seen.add(id);
      const e = byId.get(id);
      if (e) fresh.push(e);
    }
  }
  const tomorrowEnd = today + 2 * 86_400_000;
  const tomorrow = [...reviews.values()].filter((r) => !isDue(r, opts.now) && r.due < tomorrowEnd).length;
  return { due, fresh, tomorrow };
}
