import { formsOf } from "./answer";
import { inferWord, slugify } from "./infer";
import type { Entry, Pos } from "./types";

export interface ImportRow {
  word: string;
  meaning: string;
  note: string;
  pos: Pos;
  /** Guessed rather than given; shown highlighted for review. */
  uncertain: boolean;
  sentence: string;
  translation: string;
}

/** Separators accepted between word and meaning: " - ", " – ", " — ", tab, " = ", "|" or ": ". */
const SEP = /\s+[-–—=]\s+|\t|\s*\|\s*|:\s+/;
const NOTE_SEP = /\s+[-–—]\s+|\t|\s*\|\s*/;

/** Parse pasted lines like "la escalera - stairs" into rows with inferred article and part of speech. */
export function parseImport(text: string): { rows: ImportRow[]; errors: string[] } {
  const rows: ImportRow[] = [];
  const errors: string[] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim().replace(/^[-•*\d.)\s]+(?=\p{L})/u, "");
    if (!line) return;
    const m = SEP.exec(line);
    const word = m ? line.slice(0, m.index).trim() : line;
    const tail = m ? line.slice(m.index + m[0].length) : "";
    // A second " - " or "|" separates an optional note; "=" and ":" inside the note are kept.
    const n = NOTE_SEP.exec(tail);
    const meaning = (n ? tail.slice(0, n.index) : tail).trim();
    const note = n ? tail.slice(n.index + n[0].length).trim() : "";
    if (!word || !meaning) {
      errors.push(`Line ${i + 1}: “${raw.trim()}” needs “word - meaning”`);
      return;
    }
    const inf = inferWord(word, meaning);
    rows.push({
      word: inf.display,
      meaning,
      note,
      pos: inf.pos,
      uncertain: !inf.confident,
      sentence: "",
      translation: "",
    });
  });
  return { rows, errors };
}

/** Turn reviewed rows into entries for a custom set. */
export function rowsToEntries(rows: readonly ImportRow[], setSlug: string): Entry[] {
  const used = new Set<string>();
  return rows.map((r) => {
    const inf = inferWord(r.word, r.meaning);
    let id = `${setSlug}--${slugify(inf.lemma)}`;
    for (let n = 2; used.has(id); n++) id = `${setSlug}--${slugify(inf.lemma)}-${n}`;
    used.add(id);
    return {
      id,
      slug: slugify(inf.lemma),
      lemma: inf.lemma,
      display: r.word.trim(),
      article: inf.article,
      gender: inf.gender,
      femForm: null,
      pos: r.pos,
      meaning: r.meaning.trim(),
      note: r.note.trim(),
      privateNote: "",
      region: "both",
      variants: [],
      answers: formsOf(r.word),
      synonyms: [],
      topics: [],
      sets: [setSlug],
      genderInferred: r.uncertain,
    };
  });
}
