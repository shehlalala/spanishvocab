import { describe, expect, it } from "vitest";
import { buildQueue, dailyQueue, quizOptions } from "./queue";
import { newState, schedule } from "./srs";
import type { Entry, StudySet } from "./types";

const entry = (id: string, meaning = id): Entry => ({
  id,
  slug: id,
  lemma: id,
  display: id,
  article: null,
  gender: null,
  femForm: null,
  pos: "noun",
  meaning,
  note: "",
  privateNote: "",
  region: "both",
  variants: [],
  answers: [id],
  synonyms: [],
  topics: [],
  sets: [],
  genderInferred: false,
});
const NOW = new Date(2026, 9, 2, 12).getTime();
const deck = Array.from({ length: 50 }, (_, i) => entry(`w${i}`));

describe("buildQueue", () => {
  it("caps quiz and typing rounds at 25 for decks over 40", () => {
    const ctx = { reviews: new Map(), hasSentence: () => true, now: NOW };
    expect(buildQueue("quiz", deck, ctx)).toHaveLength(25);
    expect(buildQueue("type", deck.slice(0, 30), ctx)).toHaveLength(30);
  });
  it("flashcards skip cards that are not due, unless nothing is due", () => {
    const later = schedule(newState("w0", NOW), "easy", NOW);
    const reviews = new Map([["w0", later]]);
    const q = buildQueue("cards", deck.slice(0, 3), { reviews, hasSentence: () => false, now: NOW });
    expect(q.map((e) => e.id).sort()).toEqual(["w1", "w2"]);
    const all = buildQueue("cards", deck.slice(0, 1), { reviews, hasSentence: () => false, now: NOW });
    expect(all).toHaveLength(1);
  });
  it("sentence mode only uses words with sentences", () => {
    const q = buildQueue("write", deck.slice(0, 5), { reviews: new Map(), hasSentence: (id) => id === "w3", now: NOW });
    expect(q.map((e) => e.id)).toEqual(["w3"]);
  });
});

describe("quizOptions", () => {
  it("gives four options with exactly one correct and no duplicate meanings", () => {
    const d = [entry("a", "x"), entry("b", "x"), entry("c", "y"), entry("d", "z"), entry("e", "w")];
    const opts = quizOptions(d[0] as Entry, d);
    expect(opts).toHaveLength(4);
    expect(opts.filter((o) => o === "x")).toHaveLength(1);
    expect(new Set(opts).size).toBe(4);
  });
});

describe("dailyQueue", () => {
  it("returns due reviews plus new cards up to the daily limit, minus those already introduced today", () => {
    const sets: StudySet[] = [{ slug: "s", name: "s", kind: "mine", entryIds: deck.map((e) => e.id) }];
    const seenToday = newState("w0", NOW - 1000);
    const dueOld = { ...newState("w1", NOW - 5 * 86_400_000), due: NOW - 1 };
    const reviews = new Map([
      ["w0", { ...seenToday, due: NOW + 5 * 86_400_000 }],
      ["w1", dueOld],
    ]);
    const d = dailyQueue(deck, sets, reviews, { newPerDay: 3, dailySets: ["s"], now: NOW });
    expect(d.due.map((e) => e.id)).toEqual(["w1"]);
    expect(d.fresh.map((e) => e.id)).toEqual(["w2", "w3"]);
  });
});
