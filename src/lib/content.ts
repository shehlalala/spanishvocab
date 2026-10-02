import "server-only";
import raw from "../../data/content.json";
import { pluralize } from "./answer";
import { pluralArticle } from "./infer";
import type { Confusion, Content, Entry, Sentence, StudySet, Topic } from "./types";

export const content = raw as Content;

const bySlug = new Map<string, Entry[]>();
const byId = new Map<string, Entry>();
for (const e of content.entries) {
  byId.set(e.id, e);
  bySlug.set(e.slug, [...(bySlug.get(e.slug) ?? []), e]);
}
const sentencesByEntry = new Map<string, Sentence[]>();
for (const s of content.sentences) sentencesByEntry.set(s.entryId, [...(sentencesByEntry.get(s.entryId) ?? []), s]);

export const allSlugs = (): string[] => [...bySlug.keys()];
export const entriesForSlug = (slug: string): Entry[] => bySlug.get(slug) ?? [];
export const entryById = (id: string): Entry | undefined => byId.get(id);
export const sentencesFor = (id: string): Sentence[] => sentencesByEntry.get(id) ?? [];
export const topicBySlug = (slug: string): Topic | undefined => content.topics.find((t) => t.slug === slug);
export const setBySlug = (slug: string): StudySet | undefined => content.sets.find((s) => s.slug === slug);
export const entriesOf = (ids: readonly string[]): Entry[] =>
  ids.map((id) => byId.get(id)).filter((e): e is Entry => !!e);

export function confusionsFor(lemma: string): Confusion[] {
  return content.confusions.filter((c) => c.a === lemma || c.b === lemma);
}

/** Slug for a lemma if it has its own page. */
export function slugForLemma(lemma: string): string | undefined {
  return content.entries.find((e) => e.lemma === lemma)?.slug;
}

/** Fill the blank with the first accepted answer. */
export function filled(s: Sentence): string {
  return s.text.replace("___", s.answers[0] ?? "___");
}

export function pluralForm(e: Entry): string | null {
  if (e.pos !== "noun" || !e.article) return null;
  if (e.article === "los" || e.article === "las") return null;
  const art = e.gender === "f" ? "las" : pluralArticle(e.article);
  return `${art} ${pluralize(e.lemma)}`;
}

export const POS_LABEL: Record<Entry["pos"], string> = {
  noun: "noun",
  verb: "verb",
  adjective: "adjective",
  adverb: "adverb",
  phrase: "phrase",
  pronoun: "pronoun",
  determiner: "determiner",
};

/** "masculine noun", "feminine noun", "noun (masculine and feminine forms)" … */
export function grammarLabel(e: Entry): string {
  if (e.pos !== "noun") return POS_LABEL[e.pos];
  switch (e.gender) {
    case "m":
      return e.article === "los" ? "masculine plural noun" : "masculine noun";
    case "f":
      return e.article === "las" ? "feminine plural noun" : "feminine noun";
    case "pair":
      return "noun with masculine and feminine forms";
    case "common":
      return "noun, same form for both genders";
    default:
      return "noun";
  }
}

export function relatedInTopics(e: Entry, limit = 12): Entry[] {
  const out: Entry[] = [];
  for (const t of e.topics) {
    for (const id of topicBySlug(t)?.entryIds ?? []) {
      const x = byId.get(id);
      if (x && x.slug !== e.slug && !out.includes(x)) out.push(x);
    }
  }
  return out.slice(0, limit);
}
