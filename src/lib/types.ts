export type Region = "es-ES" | "es-419" | "both";
export type Article = "el" | "la" | "los" | "las";
/** m / f: fixed gender. pair: separate masculine and feminine forms. common: same form, gender shown by the article. */
export type Gender = "m" | "f" | "pair" | "common";
export type Pos = "noun" | "verb" | "adjective" | "adverb" | "phrase" | "pronoun" | "determiner";

export interface Variant {
  /** Full display form, e.g. "el jugo". */
  form: string;
  region: Exclude<Region, "both">;
}

export interface Entry {
  id: string;
  /** URL slug; entries that share a lemma (homographs) share a slug. */
  slug: string;
  /** Bare headword without article, e.g. "ministro". */
  lemma: string;
  /** Headword as studied, e.g. "el ministro / la ministra". */
  display: string;
  article: Article | null;
  gender: Gender | null;
  femForm: string | null;
  pos: Pos;
  meaning: string;
  /** Public usage note. */
  note: string;
  /** Personal mnemonic: shown while studying, never on public pages. */
  privateNote: string;
  region: Region;
  /** Linked forms from the other region (Latin American equivalents of Spain words). */
  variants: Variant[];
  /** Normalised forms accepted when typing this word (articles stripped). */
  answers: string[];
  synonyms: string[];
  topics: string[];
  sets: string[];
  /** True when gender/article was guessed from the ending rather than given in the source. */
  genderInferred: boolean;
}

export interface Sentence {
  entryId: string;
  /** Sentence with exactly one "___". */
  text: string;
  answers: string[];
  translation: string;
}

export interface Topic {
  slug: string;
  name: string;
  entryIds: string[];
}

export interface StudySet {
  slug: string;
  name: string;
  kind: "mine" | "b1" | "custom";
  entryIds: string[];
}

export interface Confusion {
  a: string;
  b: string;
  explanation: string;
  /** English meaning of b, for the comparison table. */
  bMeaning: string;
}

export interface Content {
  version: string;
  updatedAt: string;
  entries: Entry[];
  sentences: Sentence[];
  topics: Topic[];
  sets: StudySet[];
  confusions: Confusion[];
}
