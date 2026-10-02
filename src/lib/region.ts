import { formsOf, normalize } from "./answer";
import type { Entry, Sentence } from "./types";

/** The learner's chosen variety. Words tagged "both" are the same in either. */
export type RegionPref = "es-ES" | "es-419";

export const REGION_LABEL: Record<RegionPref, string> = {
  "es-ES": "Spain",
  "es-419": "Latin America",
};

/** Headword to show for the learner's region. */
export function shownForm(e: Entry, pref: RegionPref): string {
  if (pref === "es-419") {
    const v = e.variants.find((x) => x.region === "es-419");
    if (v) return v.form;
  }
  return e.display;
}

function variantForms(e: Entry): string[] {
  return e.variants.flatMap((v) => formsOf(v.form));
}

export interface AnswerSets {
  /** Correct for this learner. The first item is the form to show as "the answer". */
  accepted: string[];
  /** Correct in the other region: accepted, but flagged. */
  variants: string[];
}

/**
 * Answers for EN → ES typing. Like the original page, any word in the deck with the same
 * meaning is accepted (desafío / reto), plus linked synonyms.
 */
export function typingAnswers(e: Entry, pref: RegionPref, deck: readonly Entry[]): AnswerSets {
  const same = deck.filter((x) => x.id !== e.id && (x.meaning === e.meaning || e.synonyms.includes(x.id)));
  const spain = [...e.answers, ...same.flatMap((x) => x.answers)];
  const latam = [...variantForms(e), ...same.flatMap(variantForms)];
  const uniq = (xs: string[]) => [...new Set(xs.map(normalize))];
  if (pref === "es-419" && latam.length)
    return {
      accepted: uniq([...latam, ...same.filter((x) => !x.variants.length).flatMap((x) => x.answers)]),
      variants: uniq(e.answers),
    };
  return { accepted: uniq(spain), variants: uniq(latam) };
}

/** Answers for a fill-in sentence, split by region in the same way. */
export function sentenceAnswers(s: Sentence, e: Entry | undefined, pref: RegionPref): AnswerSets {
  const latam = new Set(e ? variantForms(e) : []);
  const spain = s.answers.map(normalize).filter((a) => !latam.has(a));
  if (pref === "es-419" && latam.size) return { accepted: [...latam], variants: spain };
  return { accepted: spain, variants: [...latam] };
}
