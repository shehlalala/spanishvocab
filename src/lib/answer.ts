/**
 * Answer checking shared by every typing mode.
 *
 * Order of checks: exact → other-region variant → accent-only slip → singular/plural slip → wrong.
 * Leading articles, case, surrounding punctuation and extra spaces never matter.
 */

export type VerdictKind = "exact" | "variant" | "accent" | "plural" | "wrong";

export interface Verdict {
  kind: VerdictKind;
  correct: boolean;
  /** The accepted form the input matched, or the preferred answer when wrong. */
  expected: string;
}

const ARTICLE_RE = /^(el \/ la|la \/ el|el|la|los|las|un|una|unos|unas) /;

/** Lowercase, trim, drop ¡!¿?.,;:"' and a leading article, collapse whitespace. */
export function normalize(s: string): string {
  return s
    .normalize("NFC")
    .toLowerCase()
    .replace(/[¡!¿?.,;:"“”«»]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(ARTICLE_RE, "")
    .trim();
}

/** Remove diacritics, including the tilde on ñ (so "ano" matches "año" as an accent slip). */
export function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Typed forms of a headword as displayed in a deck:
 * "el ministro / la ministra" → ["ministro", "ministra"], "el / la creyente" → ["creyente"].
 */
export function formsOf(display: string): string[] {
  return display
    .replace(/^(el|la) \/ (el|la) /i, "")
    .split(" / ")
    .map(normalize)
    .filter((f) => f.length > 0);
}

const VOWEL = /[aeiou]$/;
const ACCENTED_END: Record<string, string> = { á: "a", é: "e", í: "i", ó: "o", ú: "u" };

function pluralizeWord(w: string): string {
  if (w.endsWith("z")) return w.slice(0, -1) + "ces";
  if (VOWEL.test(w)) return w + "s";
  if (/[áéó]$/.test(w)) return w + "s";
  if (/[íú]$/.test(w)) return w + "es";
  if (/s$/.test(w) && w.length > 4 && !/[áéíóú]s$/.test(w)) return w; // la crisis → las crisis
  // canción → canciones, compás → compases: the written accent drops in the plural.
  const m = /([áéíóú])([ns])$/.exec(w);
  if (m && m[1] && m[2]) return w.slice(0, -2) + (ACCENTED_END[m[1]] ?? m[1]) + m[2] + "es";
  // joven → jóvenes, examen → exámenes are irregular in accent; accent-insensitive matching covers them.
  return w + "es";
}

/** Plural of a headword; multi-word phrases pluralise their first word ("juego de mesa" → "juegos de mesa"). */
export function pluralize(phrase: string): string {
  const [first, ...rest] = phrase.split(" ");
  if (!first) return phrase;
  return [pluralizeWord(first), ...rest].join(" ");
}

function numberSlip(input: string, accepted: string): boolean {
  const a = stripAccents(accepted);
  const v = stripAccents(input);
  return stripAccents(pluralize(accepted)) === v || stripAccents(pluralize(input)) === a;
}

export interface CheckOptions {
  /** Forms accepted outright (already the user's preferred region). */
  accepted: string[];
  /** Forms from the other region: accepted, but flagged. */
  variants?: string[];
  /** Allow singular/plural slips. Default true. */
  allowPlural?: boolean;
}

export function checkAnswer(input: string, opts: CheckOptions): Verdict {
  const v = normalize(input);
  const accepted = opts.accepted.map(normalize).filter(Boolean);
  const variants = (opts.variants ?? []).map(normalize).filter(Boolean);
  const preferred = accepted[0] ?? "";
  if (!v) return { kind: "wrong", correct: false, expected: preferred };

  const exact = accepted.find((a) => a === v);
  if (exact) return { kind: "exact", correct: true, expected: exact };

  const variantExact = variants.find((a) => a === v);
  if (variantExact) return { kind: "variant", correct: true, expected: preferred };

  const loose = accepted.find((a) => stripAccents(a) === stripAccents(v));
  if (loose) return { kind: "accent", correct: true, expected: loose };

  const variantLoose = variants.find((a) => stripAccents(a) === stripAccents(v));
  if (variantLoose) return { kind: "variant", correct: true, expected: preferred };

  if (opts.allowPlural !== false) {
    const num = accepted.find((a) => numberSlip(v, a));
    if (num) return { kind: "plural", correct: true, expected: num };
  }

  return { kind: "wrong", correct: false, expected: preferred };
}
