import type { Article, Gender, Pos } from "./types";

export interface GenderGuess {
  article: Article | null;
  gender: Gender | null;
  /** false when the rule is a weak default and a human should check it. */
  confident: boolean;
}

const MASC_EXCEPTIONS = new Set([
  "día",
  "mapa",
  "problema",
  "tema",
  "sistema",
  "programa",
  "clima",
  "idioma",
  "drama",
  "poema",
  "planeta",
  "sofá",
  "cometa",
  "esquema",
  "dilema",
  "lema",
  "síntoma",
  "diploma",
  "panorama",
  "enigma",
  "dogma",
  "fantasma",
  "aroma",
  "pijama",
  "crucigrama",
  "telegrama",
  "diagrama",
  "teorema",
  "prisma",
  "trauma",
  "carisma",
  "estigma",
  "paradigma",
  "emblema",
  "tranvía",
  "orden",
  "currículum",
  "álbum",
  "récord",
  "clímax",
]);
const FEM_EXCEPTIONS = new Set([
  "mano",
  "foto",
  "moto",
  "radio",
  "flor",
  "labor",
  "razón",
  "imagen",
  "piel",
  "sal",
  "miel",
  "cárcel",
  "señal",
  "red",
  "sed",
  "pared",
  "nariz",
  "voz",
  "luz",
  "paz",
  "cruz",
  "vez",
  "raíz",
  "nuez",
  "tos",
  "crisis",
  "frente",
  "gente",
  "muerte",
  "suerte",
  "noche",
  "leche",
  "calle",
  "llave",
  "nieve",
  "fuente",
  "parte",
  "clase",
  "carne",
  "nave",
  "base",
  "fase",
  "torre",
  "sangre",
  "sartén",
  "costumbre",
  "lumbre",
  "cumbre",
  "muchedumbre",
  "servidumbre",
  "certidumbre",
  "ley",
  "grey",
  "fiebre",
  "liebre",
  "ubre",
  "hambre",
  "mente",
  "corriente",
  "serpiente",
  "especie",
  "superficie",
  "serie",
  "barbarie",
  "planta",
  "tribu",
  "catedral",
  "col",
  "hiel",
  "variz",
  "lombriz",
  "perdiz",
  "codorniz",
  "matriz",
  "cicatriz",
  "actriz",
  "emperatriz",
  "coz",
  "hoz",
  "tez",
  "vejez",
  "niñez",
  "madurez",
  "sencillez",
  "estupidez",
  "rapidez",
  "timidez",
  "honradez",
  "pesadez",
  "palidez",
  "fluidez",
  "lucidez",
  "escasez",
  "embriaguez",
  "dosis",
  "tesis",
  "hipótesis",
  "síntesis",
  "análisis",
  "diéresis",
  "caries",
  "variable",
]);
/** Feminine nouns starting with stressed a-/ha- take "el" in the singular. */
const EL_FEMININE = new Set([
  "agua",
  "alma",
  "hacha",
  "águila",
  "aula",
  "arma",
  "hambre",
  "ala",
  "área",
  "ave",
  "hada",
  "habla",
  "asma",
  "ancla",
  "arca",
  "ama",
  "alga",
  "arpa",
  "asa",
]);
const COMMON_GENDER_WORDS = new Set([
  "pediatra",
  "psiquiatra",
  "atleta",
  "policía",
  "colega",
  "joven",
  "testigo",
  "cónyuge",
  "rehén",
  "turista",
  "artista",
  "periodista",
  "estudiante",
  "cantante",
  "creyente",
  "agente",
  "representante",
  "paciente",
  "detective",
  "gerente",
  "líder",
  "chef",
  "piloto",
  "modelo",
  "guía",
  "intérprete",
  "adolescente",
  "astronauta",
  "deportista",
  "dentista",
  "electricista",
  "economista",
  "terapeuta",
  "patriota",
  "idiota",
  "hipócrita",
  "homicida",
  "suicida",
  "burócrata",
  "demócrata",
  "aristócrata",
  "pirata",
  "DJ",
]);
/** -ista words that are things, not people. */
const FEM_ISTA = new Set(["lista", "pista", "autopista", "conquista", "revista", "entrevista", "vista", "arista"]);
/** Verb + plural noun compounds are masculine singular: el abrelatas, el paraguas. */
const COMPOUND_PREFIX =
  /^(abre|saca|rasca|para|corta|rompe|lava|guarda|quita|porta|pasa|cuenta|limpia|pinta|cubre|cumple|lanza|mata|salva|tira|toca)[a-zñáéíóú]+s$/;
const INVARIANT_MASC = new Set([
  "virus",
  "blues",
  "brindis",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "tenis",
  "autobús",
  "compás",
  "país",
  "mes",
  "anís",
  "énfasis",
  "oasis",
  "chasis",
]);

const FEM_ENDINGS = ["ción", "sión", "xión", "dad", "tad", "tud", "umbre", "itis", "ie", "sis", "ez"];
const MASC_ENDINGS = ["aje", "or", "ón", "án", "ín", "és", "ema", "o", "ú", "í", "ambre", "miento"];

const PLURAL_OF: Record<"el" | "la", Article> = { el: "los", la: "las" };

function guessSingular(head: string): GenderGuess {
  if (COMMON_GENDER_WORDS.has(head)) return { article: "el", gender: "common", confident: true };
  if (MASC_EXCEPTIONS.has(head)) return { article: "el", gender: "m", confident: true };
  if (EL_FEMININE.has(head)) return { article: "el", gender: "f", confident: true };
  if (FEM_EXCEPTIONS.has(head)) return { article: "la", gender: "f", confident: true };
  if (FEM_ISTA.has(head)) return { article: "la", gender: "f", confident: true };
  if (head.endsWith("ista")) return { article: "el", gender: "common", confident: false };
  for (const e of FEM_ENDINGS) if (head.endsWith(e)) return { article: "la", gender: "f", confident: true };
  if (head.endsWith("ma")) return { article: "la", gender: "f", confident: false };
  if (head.endsWith("a")) return { article: "la", gender: "f", confident: true };
  for (const e of MASC_ENDINGS) if (head.endsWith(e)) return { article: "el", gender: "m", confident: true };
  // -e, -l, -z, -d, -ente and other endings: masculine is the more common default, but unreliable.
  return { article: "el", gender: "m", confident: false };
}

/** Guess article and gender for a noun given without an article (may be a phrase or a plural). */
export function guessGender(lemma: string): GenderGuess {
  const w = lemma.toLowerCase().trim();
  const words = w.split(" ");
  const head = words[0] ?? w;
  if (COMPOUND_PREFIX.test(head)) return { article: "el", gender: "m", confident: true };
  if (INVARIANT_MASC.has(head)) return { article: "el", gender: "m", confident: true };
  if (FEM_EXCEPTIONS.has(head)) return { article: "la", gender: "f", confident: true };

  const plural = /[^s]s$/.test(head) && head.length > 3 && !/[áéíóú]s$/.test(head);
  // In "ciencias políticas" the adjective's ending confirms the gender.
  const adj = words.length > 1 && words[1] !== "de" ? words[1] : undefined;
  const agree = adj && /(o|os)$/.test(adj) ? "m" : adj && /(a|as)$/.test(adj) ? "f" : null;

  if (plural) {
    const singular = /[^aeiouáéíóú]es$/.test(head) ? head.slice(0, -2) : head.slice(0, -1);
    const g = guessSingular(singular);
    const fem = agree ? agree === "f" : g.gender === "f";
    return { article: fem ? "las" : "los", gender: fem ? "f" : "m", confident: agree !== null || g.confident };
  }
  const g = guessSingular(head);
  if (agree && g.gender !== "common" && g.gender !== agree) {
    return { article: agree === "f" ? "la" : "el", gender: agree, confident: true };
  }
  return g;
}

/** Article to use for a plural headword. */
export function pluralArticle(a: "el" | "la"): Article {
  return PLURAL_OF[a];
}

const ADVERBS = new Set([
  "quizás",
  "quizá",
  "enseguida",
  "únicamente",
  "claramente",
  "siempre",
  "nunca",
  "jamás",
  "todavía",
  "aún",
  "ya",
  "también",
  "tampoco",
  "además",
  "apenas",
]);

/** Guess part of speech for a headword (article already stripped). */
export function guessPos(lemma: string, hadArticle: boolean): Pos {
  const w = lemma.toLowerCase().trim();
  if (hadArticle) return "noun";
  const words = w.split(" ");
  const first = words[0] ?? w;
  if (ADVERBS.has(w) || w.endsWith("mente")) return "adverb";
  if (/(ar|er|ir|ír)(se)?$/.test(first) && first.length > 3)
    return words.length === 1 || words.length === 2 ? "verb" : "phrase";
  if (words.length > 1) return "phrase";
  return "adjective";
}

/** Split "el ministro" into its article and the rest. */
export function splitArticle(text: string): { article: Article | null; rest: string } {
  const m = /^(el|la|los|las)\s+(.+)$/i.exec(text.trim());
  if (!m || !m[1] || !m[2]) return { article: null, rest: text.trim() };
  return { article: m[1].toLowerCase() as Article, rest: m[2] };
}

const NOUN_SUFFIXES = [
  "ción",
  "sión",
  "dad",
  "tad",
  "tud",
  "aje",
  "umbre",
  "miento",
  "ismo",
  "ura",
  "eza",
  "encia",
  "ancia",
];

/** Infer display form, article, gender and part of speech for a word pasted into the importer. */
export function inferWord(
  raw: string,
  meaning = "",
): {
  display: string;
  lemma: string;
  article: Article | null;
  gender: Gender | null;
  pos: Pos;
  confident: boolean;
} {
  const { article, rest } = splitArticle(raw);
  if (article) {
    const masc = article === "el" || article === "los";
    const gender: Gender = masc && !EL_FEMININE.has(rest.toLowerCase()) ? "m" : "f";
    return { display: raw.trim(), lemma: rest, article, gender, pos: "noun", confident: true };
  }
  const m = meaning.trim().toLowerCase();
  let pos = guessPos(rest, false);
  if (m.startsWith("to ") && pos !== "phrase") pos = "verb";
  const single = !rest.includes(" ");
  const nounish = /^(a|an|the) /.test(m) || NOUN_SUFFIXES.some((e) => rest.toLowerCase().endsWith(e));
  if (single && pos === "adjective" && nounish) {
    const g = guessGender(rest);
    return {
      display: `${g.article} ${rest}`,
      lemma: rest,
      article: g.article,
      gender: g.gender,
      pos: "noun",
      confident: g.confident,
    };
  }
  return { display: rest, lemma: rest, article: null, gender: null, pos, confident: pos !== "adjective" };
}

/** URL-safe slug: lowercase, accents removed (ñ kept), spaces to hyphens. */
export function slugify(s: string): string {
  return s
    .normalize("NFC")
    .toLowerCase()
    .split("ñ")
    .map((part) => part.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
    .join("ñ")
    .replace(/[^a-z0-9ñ]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
