import "server-only";
import { confusionsFor, entriesForSlug, filled, grammarLabel, pluralForm, sentencesFor, slugForLemma } from "./content";
import type { Entry } from "./types";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** "to hire" → "To hire"; "stairs / staircase" → "stairs" for headline use. */
const firstMeaning = (m: string) => (m.split(/\s*[/,;]\s*/)[0] ?? m).trim();

export interface Faq {
  q: string;
  a: string;
}

export interface WordPage {
  slug: string;
  lemma: string;
  senses: Entry[];
  title: string;
  /** Self-contained answer, ≤ 40 words. */
  lead: string;
  genderAnswer: string | null;
  regionAnswer: string | null;
  confusions: { a: string; b: string; bMeaning: string; explanation: string; slugB?: string }[];
  examples: { es: string; en: string }[];
  faqs: Faq[];
}

function genderSentence(e: Entry): string | null {
  if (e.pos !== "noun") return null;
  const plural = pluralForm(e);
  const pl = plural ? ` The plural is ${plural}.` : "";
  switch (e.gender) {
    case "m":
      return `${cap(e.lemma)} is masculine, so you say ${e.display}.${pl}`;
    case "f":
      return e.article === "el"
        ? `${cap(e.lemma)} is feminine, but it takes el in the singular because it starts with a stressed a: ${e.display}.${pl}`
        : `${cap(e.lemma)} is feminine, so you say ${e.display}.${pl}`;
    case "pair":
      return `${cap(e.lemma)} has a masculine and a feminine form: el ${e.lemma} for a man and la ${e.femForm ?? e.lemma} for a woman.`;
    case "common":
      return `${cap(e.lemma)} has the same form for both genders; only the article changes: el ${e.lemma} for a man, la ${e.lemma} for a woman.`;
    default:
      return null;
  }
}

export function buildWordPage(slug: string): WordPage | null {
  const senses = entriesForSlug(slug);
  const e = senses[0];
  if (!e) return null;
  const lemma = e.lemma;
  const latam = e.variants.filter((v) => v.region === "es-419").map((v) => v.form);

  let lead: string;
  if (senses.length > 1) {
    const ms = senses.map((s) => `“${s.meaning}”`);
    lead = `${cap(lemma)} has ${senses.length} meanings in Spanish: ${ms.slice(0, -1).join(", ")} and ${ms.at(-1) ?? ""}. As a ${grammarLabel(e)} it is written ${e.display}.`;
  } else {
    const g = grammarLabel(e);
    lead = `“${cap(firstMeaning(e.meaning))}” in Spanish is ${e.display}, ${/^[aeiou]/.test(g) ? "an" : "a"} ${g}.`;
    const plural = pluralForm(e);
    if (plural) lead += ` The plural is ${plural}.`;
  }
  if (latam.length) lead += ` In Latin America, people usually say ${latam[0]}.`;

  const examples = senses.flatMap((s) => sentencesFor(s.id)).map((s) => ({ es: filled(s), en: s.translation }));
  const confusions = confusionsFor(lemma).map((c) => {
    const other = c.a === lemma ? c.b : c.a;
    return {
      a: lemma,
      b: other,
      bMeaning: c.a === lemma ? c.bMeaning : (entriesForSlug(slugForLemma(other) ?? "")[0]?.meaning ?? ""),
      explanation: c.explanation,
      slugB: slugForLemma(other),
    };
  });
  const genderAnswer = genderSentence(e);
  const regionAnswer = latam.length
    ? `${cap(e.display)} is the word used in Spain. In Latin America the usual word is ${latam.join(" or ")}. Both mean “${e.meaning}”.`
    : null;

  const faqs: Faq[] = [
    {
      q: `What does ${lemma} mean in English?`,
      a: senses.map((s) => `${cap(s.display)} means “${s.meaning}”.`).join(" "),
    },
  ];
  if (genderAnswer) faqs.push({ q: `Is ${lemma} masculine or feminine?`, a: genderAnswer });
  if (regionAnswer) faqs.push({ q: `What do they call ${lemma} in Latin America?`, a: regionAnswer });
  const ex = examples[0];
  if (ex)
    faqs.push({ q: `How do you use ${lemma} in a sentence?`, a: `For example: “${ex.es}” This means: “${ex.en}”` });
  for (const c of confusions) faqs.push({ q: `What is the difference between ${c.a} and ${c.b}?`, a: c.explanation });

  return {
    slug,
    lemma,
    senses,
    title: `“${cap(firstMeaning(e.meaning))}” in Spanish: ${e.display}`,
    lead,
    genderAnswer,
    regionAnswer,
    confusions,
    examples,
    faqs,
  };
}
