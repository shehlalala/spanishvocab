/**
 * One-off importer: vocabulario.html → data/content.json + data/import-report.md
 *
 *   npm run import
 *
 * Runs the HTML's own data declarations (S1–S8, SENT, B1) in an isolated VM context instead of
 * regex-scraping them, then normalises them into typed entries. Anything that fails to parse or
 * needed a guess is listed in the report. Hand-curated inputs: data/variants.json, data/confusions.json.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import { join } from "node:path";
import { formsOf, normalize } from "../src/lib/answer";
import { guessGender, guessPos, slugify, splitArticle } from "../src/lib/infer";
import type {
  Article,
  Confusion,
  Content,
  Entry,
  Gender,
  Pos,
  Sentence,
  StudySet,
  Topic,
  Variant,
} from "../src/lib/types";

const ROOT = join(__dirname, "..");
const SOURCE = join(ROOT, "vocabulario.html");

// ---------- 1. Evaluate the data blocks ----------

interface RawSent {
  s: string;
  a: string[];
  en: string;
}
interface RawB1 {
  t: string;
  w: string;
  m: string;
  n: string;
}

const html = readFileSync(SOURCE, "utf8");
const script = html.split("<script>")[1];
if (!script) throw new Error("No <script> block found in vocabulario.html");
const dataBlock = script.split("const LABELS")[0];
if (!dataBlock) throw new Error("Could not find the data section (before const LABELS)");
const ctx: Record<string, unknown> = {};
createContext(ctx);
runInContext(`${dataBlock}\nthis.__out = { S: [S1,S2,S3,S4,S5,S6,S7,S8], SENT, B1 };`, ctx, { timeout: 2000 });
const out = ctx.__out as { S: unknown[]; SENT: unknown; B1: unknown };

function isRawSent(x: unknown): x is RawSent {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.s === "string" && typeof o.en === "string" && Array.isArray(o.a) && o.a.every((a) => typeof a === "string")
  );
}
function isRawB1(x: unknown): x is RawB1 {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return ["t", "w", "m", "n"].every((k) => typeof o[k] === "string");
}

const problems: string[] = [];
const merges: string[] = [];
const guesses: string[] = [];
const privates: string[] = [];
const splits: string[] = [];

// ---------- 2. Parse my sets ----------

interface RawMine {
  set: number;
  line: number;
  w: string;
  m: string;
  n: string;
}
const mine: RawMine[] = [];
out.S.forEach((block, i) => {
  if (typeof block !== "string") {
    problems.push(`S${i + 1} is not a string`);
    return;
  }
  block
    .trim()
    .split("\n")
    .forEach((line, j) => {
      const parts = line.split("|");
      const [w = "", m = "", n = ""] = parts;
      if (parts.length !== 3 || !w.trim() || !m.trim()) {
        problems.push(`S${i + 1} line ${j + 1}: expected "word|meaning|note", got ${JSON.stringify(line)}`);
        return;
      }
      mine.push({ set: i + 1, line: j + 1, w: w.trim(), m: m.trim(), n: n.trim() });
    });
});

const rawSent: Record<string, RawSent> = {};
if (typeof out.SENT === "object" && out.SENT !== null) {
  for (const [k, v] of Object.entries(out.SENT as Record<string, unknown>)) {
    if (!isRawSent(v)) problems.push(`SENT[${JSON.stringify(k)}] has the wrong shape`);
    else if ((v.s.match(/___/g) ?? []).length !== 1)
      problems.push(`SENT[${JSON.stringify(k)}] does not have exactly one ___`);
    else rawSent[k] = v;
  }
} else problems.push("SENT is not an object");

const b1: RawB1[] = [];
if (Array.isArray(out.B1)) {
  out.B1.forEach((x, i) => {
    if (isRawB1(x)) b1.push(x);
    else problems.push(`B1[${i}] has the wrong shape: ${JSON.stringify(x)}`);
  });
} else problems.push("B1 is not an array");

// ---------- 3. Curated inputs ----------

const variantFile = JSON.parse(readFileSync(join(ROOT, "data/variants.json"), "utf8")) as {
  variants: { lemma: string; es419: string[] }[];
};
const variantMap = new Map(variantFile.variants.map((v) => [v.lemma, v.es419]));
const confusionFile = JSON.parse(readFileSync(join(ROOT, "data/confusions.json"), "utf8")) as {
  confusions: Confusion[];
};

// Personal mnemonics kept off public pages.
const PRIVATE_NOTE_OVERRIDES: Record<string, string> = { "el granizo": "dolu" };
function splitNote(display: string, note: string): { note: string; privateNote: string } {
  const override = PRIVATE_NOTE_OVERRIDES[display];
  if (override !== undefined && note === override) {
    privates.push(`${display}: "${note}"`);
    return { note: "", privateNote: note };
  }
  const m = /^(.*?)(?:[.;]\s*)?(Turkish:.*)$/.exec(note);
  if (m && m[2]) {
    privates.push(`${display}: "${m[2]}"`);
    const pub = (m[1] ?? "").trim();
    return { note: pub && !/[.!?]$/.test(pub) ? `${pub}.` : pub, privateNote: m[2] };
  }
  return { note, privateNote: "" };
}

// ---------- 4. Build entries ----------

const POS_VALUES: readonly Pos[] = ["noun", "verb", "adjective", "adverb", "phrase", "pronoun", "determiner"];
const entries: Entry[] = [];
const byId = new Map<string, Entry>();
const sets: StudySet[] = Array.from({ length: 8 }, (_, i) => ({
  slug: `set-${i + 1}`,
  name: `My words · Set ${i + 1}`,
  kind: "mine" as const,
  entryIds: [],
}));
/** Original display string → entry ids, for linking SENT keys. */
const displayToIds = new Map<string, string[]>();

function uniqueId(base: string): string {
  let id = base;
  let n = 2;
  while (byId.has(id)) id = `${base}-${n++}`;
  return id;
}

const ORDINALS = new Set([
  "primero",
  "segundo",
  "tercero",
  "cuarto",
  "quinto",
  "sexto",
  "séptimo",
  "octavo",
  "noveno",
  "décimo",
]);

interface Head {
  lemma: string;
  article: Article | null;
  gender: Gender | null;
  femForm: string | null;
  pos: Pos;
}

/** Parse a set headword (possibly with "/") into one or more heads. */
function parseHeadword(w: string): Head[] {
  // "el / la creyente": one form, common gender.
  const common = /^(el|la) \/ (el|la) (.+)$/.exec(w);
  if (common && common[3]) return [{ lemma: common[3], article: "el", gender: "common", femForm: null, pos: "noun" }];
  const parts = w.split(" / ");
  if (parts.length === 2) {
    const [a = "", b = ""] = parts;
    const pa = splitArticle(a);
    const pb = splitArticle(b);
    // "el ministro / la ministra" or "casero / casera": masculine/feminine pair.
    const pairArticles = (pa.article === "el" && pb.article === "la") || (!pa.article && !pb.article);
    if (pairArticles && pa.rest.slice(0, 3) === pb.rest.slice(0, 3)) {
      const isNoun = pa.article !== null;
      return [
        {
          lemma: pa.rest,
          article: pa.article,
          gender: isNoun ? "pair" : null,
          femForm: pb.rest,
          pos: isNoun ? "noun" : "adjective",
        },
      ];
    }
    // "el desafío / el reto": two synonyms sharing a card in the source; split into linked entries.
    splits.push(`"${w}" → "${a}" + "${b}" (linked as synonyms)`);
    return [a, b].map((x) => {
      const p = splitArticle(x);
      return {
        lemma: p.rest,
        article: p.article,
        gender: genderOf(p.article),
        femForm: null,
        pos: p.article ? "noun" : guessPos(p.rest, false),
      };
    });
  }
  const p = splitArticle(w);
  let pos: Pos = guessPos(p.rest, p.article !== null);
  if (ORDINALS.has(p.rest)) pos = "adjective";
  return [{ lemma: p.rest, article: p.article, gender: genderOf(p.article, p.rest), femForm: null, pos }];
}

const EL_FEM = new Set(["alma", "agua", "hacha", "águila", "aula", "arma", "hambre"]);
function genderOf(article: Article | null, lemma = ""): Gender | null {
  if (!article) return null;
  if (article === "la" || article === "las") return "f";
  return EL_FEM.has(lemma.split(" ")[0] ?? "") ? "f" : "m";
}

function displayOf(h: Head): string {
  if (h.gender === "common") return `el / la ${h.lemma}`;
  if (h.femForm && h.article) return `el ${h.lemma} / la ${h.femForm}`;
  if (h.femForm) return `${h.lemma} / ${h.femForm}`;
  return h.article ? `${h.article} ${h.lemma}` : h.lemma;
}

function makeEntry(h: Head, meaning: string, note: string, privateNote: string, genderInferred: boolean): Entry {
  const id = uniqueId(slugify(h.lemma));
  const es419 = variantMap.get(h.lemma) ?? [];
  const variants: Variant[] = es419.map((form) => ({ form, region: "es-419" }));
  const display = displayOf(h);
  const e: Entry = {
    id,
    slug: slugify(h.lemma),
    lemma: h.lemma,
    display,
    article: h.article,
    gender: h.gender,
    femForm: h.femForm,
    pos: h.pos,
    meaning,
    note,
    privateNote,
    region: variants.length ? "es-ES" : "both",
    variants,
    answers: formsOf(display),
    synonyms: [],
    topics: [],
    sets: [],
    genderInferred,
  };
  entries.push(e);
  byId.set(id, e);
  return e;
}

// Lemma → entries, to merge duplicates.
const byLemma = new Map<string, Entry[]>();
function index(e: Entry) {
  const list = byLemma.get(e.lemma) ?? [];
  list.push(e);
  byLemma.set(e.lemma, list);
}

const STOP = new Set([
  "to",
  "a",
  "an",
  "the",
  "of",
  "in",
  "on",
  "and",
  "or",
  "be",
  "up",
  "for",
  "with",
  "something",
  "someone",
]);
function contentWords(m: string): Set<string> {
  return new Set(
    m
      .toLowerCase()
      .replace(/\(.*?\)/g, " ")
      .split(/[^a-z]+/)
      .filter((w) => w.length > 2 && !STOP.has(w))
      .map((w) => w.replace(/(ing|ed|s)$/, "")),
  );
}
function sameSense(a: string, b: string): boolean {
  const A = contentWords(a);
  for (const w of contentWords(b)) if (A.has(w)) return true;
  return false;
}

for (const r of mine) {
  const heads = parseHeadword(r.w);
  const { note, privateNote } = splitNote(r.w, r.n);
  const ids: string[] = [];
  for (const h of heads) {
    const set = sets[r.set - 1];
    if (!set) continue;
    const existing = (byLemma.get(h.lemma) ?? []).find((e) => sameSense(e.meaning, r.m));
    if (existing) {
      merges.push(
        `"${r.w}" (Set ${r.set}) merged with the same word in Set ${existing.sets.map((s) => s.replace("set-", "")).join(", ")}`,
      );
      if (!existing.sets.includes(set.slug)) existing.sets.push(set.slug);
      if (!set.entryIds.includes(existing.id)) set.entryIds.push(existing.id);
      ids.push(existing.id);
      continue;
    }
    const e = makeEntry(h, r.m, note, privateNote, false);
    index(e);
    e.sets.push(set.slug);
    set.entryIds.push(e.id);
    ids.push(e.id);
  }
  if (heads.length > 1) {
    for (const id of ids) {
      const e = byId.get(id);
      if (e) e.synonyms = ids.filter((x) => x !== id);
    }
  }
  displayToIds.set(r.w, [...(displayToIds.get(r.w) ?? []), ...ids]);
}

// ---------- 5. B1 ----------

const topics: Topic[] = [];
const topicBySlug = new Map<string, Topic>();
for (const r of b1) {
  const tslug = slugify(r.t);
  let topic = topicBySlug.get(tslug);
  if (!topic) {
    topic = { slug: tslug, name: r.t, entryIds: [] };
    topics.push(topic);
    topicBySlug.set(tslug, topic);
  }
  const [posRaw = "", ...noteParts] = r.n.split(" · ");
  const pos = (POS_VALUES as readonly string[]).includes(posRaw) ? (posRaw as Pos) : null;
  if (!pos) problems.push(`B1 "${r.w}": unknown part of speech "${posRaw}" (defaulted to phrase)`);
  const note = noteParts.join(" · ").trim();
  const lemma = r.w.trim();

  const existing = (byLemma.get(lemma) ?? []).find((e) => sameSense(e.meaning, r.m));
  if (existing) {
    if (existing.topics.includes(tslug)) {
      merges.push(`B1 "${lemma}" listed twice in "${r.t}" — kept once`);
      continue;
    }
    if (existing.sets.length) merges.push(`B1 "${lemma}" (${r.t}) = my word "${existing.display}"`);
    else merges.push(`B1 "${lemma}" appears in "${r.t}" too — same sense, one entry`);
    existing.topics.push(tslug);
    topic.entryIds.push(existing.id);
    // B1 part of speech is authoritative, except that a word given with an article stays a noun.
    if (pos && !existing.article) existing.pos = pos;
    if (note && !existing.note.includes(note)) existing.note = [existing.note, note].filter(Boolean).join(" ");
    continue;
  }
  if ((byLemma.get(lemma) ?? []).length) {
    merges.push(
      `B1 "${lemma}" = "${r.m}" kept as a separate sense from "${(byLemma.get(lemma) ?? []).map((e) => e.meaning).join('", "')}"`,
    );
  }

  let head: Head;
  let inferred = false;
  if (pos === "noun") {
    const g = guessGender(lemma);
    head = { lemma, article: g.article, gender: g.gender, femForm: null, pos };
    inferred = true;
    if (!g.confident) guesses.push(`${g.article} ${lemma} (${r.m})`);
  } else {
    head = { lemma, article: null, gender: null, femForm: null, pos: pos ?? "phrase" };
  }
  const e = makeEntry(head, r.m, note, "", inferred);
  index(e);
  e.topics.push(tslug);
  topic.entryIds.push(e.id);
}

// Entries with the same slug but different senses must have distinct ids (already ensured); keep shared slug.

// ---------- 6. Sentences ----------

const sentences: Sentence[] = [];
for (const [key, s] of Object.entries(rawSent)) {
  const ids = displayToIds.get(key);
  const id = ids?.[0];
  if (!id) {
    problems.push(`SENT key "${key}" does not match any word in Sets 1–8`);
    continue;
  }
  const entry = byId.get(id);
  // Accept the other-region form too, so the sentence works whichever variant the learner picked.
  const extra = entry ? entry.variants.map((v) => normalize(v.form)) : [];
  sentences.push({ entryId: id, text: s.s, answers: [...s.a, ...extra], translation: s.en });
}

// ---------- 7. Sets: all mine + B1 topics ----------

const allMine: StudySet = {
  slug: "mine-all",
  name: "My words · All",
  kind: "mine",
  entryIds: [...new Set(sets.flatMap((s) => s.entryIds))],
};
const b1All: StudySet = {
  slug: "b1-all",
  name: "All B1 words",
  kind: "b1",
  entryIds: topics.flatMap((t) => t.entryIds).filter((x, i, a) => a.indexOf(x) === i),
};
const topicSets: StudySet[] = topics.map((t) => ({
  slug: `b1-${t.slug}`,
  name: t.name,
  kind: "b1",
  entryIds: t.entryIds,
}));

const confusions = confusionFile.confusions.filter((c) => {
  const ok = byLemma.has(c.a);
  if (!ok) problems.push(`Confusion "${c.a}" / "${c.b}": "${c.a}" is not in the word list`);
  return ok;
});

// Keep the previous timestamp when nothing changed, so re-running the import doesn't touch dateModified.
const body = { entries, sentences, topics, sets: [...sets, allMine, b1All, ...topicSets], confusions };
const outFile = join(ROOT, "data/content.json");
let updatedAt = new Date().toISOString();
if (existsSync(outFile)) {
  const prev = JSON.parse(readFileSync(outFile, "utf8")) as Content;
  const prevBody = {
    entries: prev.entries,
    sentences: prev.sentences,
    topics: prev.topics,
    sets: prev.sets,
    confusions: prev.confusions,
  };
  if (JSON.stringify(prevBody) === JSON.stringify(body)) updatedAt = prev.updatedAt;
}
const content: Content = {
  version: updatedAt.slice(0, 10),
  updatedAt,
  ...body,
};
writeFileSync(outFile, JSON.stringify(content, null, 1) + "\n");

// ---------- 8. Report ----------

const sourceMine = mine.length;
const counts = [
  ["Source lines in S1–S8", sourceMine, 337],
  ["Source B1 rows", b1.length, 1128],
  ["Source B1 topics", topics.length, 47],
  ["Source sentences (SENT)", Object.keys(rawSent).length, 227],
] as const;
const mismatch = counts.filter(([, got, want]) => got !== want);

const perSet = sets
  .map(
    (s) => `| ${s.name} | ${s.entryIds.length} | ${sentences.filter((x) => s.entryIds.includes(x.entryId)).length} |`,
  )
  .join("\n");
const report = `# Import report

Generated by \`npm run import\` from \`vocabulario.html\` on ${content.updatedAt}.

## Counts

| Check | Found | Expected |
|---|---|---|
${counts.map(([k, got, want]) => `| ${k} | ${got} | ${want} ${got === want ? "✓" : "✗"} |`).join("\n")}
| Entries after merging | ${entries.length} | |
| Sentences linked | ${sentences.length} | |
| Entries with a Latin American variant | ${entries.filter((e) => e.variants.length).length} | |
| Confusions | ${confusions.length} | |

| Set | Entries | Sentences |
|---|---|---|
${perSet}

## Entries that failed to parse (${problems.length})

${problems.length ? problems.map((p) => `- ${p}`).join("\n") : "None."}

## Split into separate entries (${splits.length})

${splits.map((s) => `- ${s}`).join("\n") || "None."}

## Merged duplicates (${merges.length})

${merges.map((s) => `- ${s}`).join("\n") || "None."}

## Gender guesses to check (${guesses.length})

B1 nouns have no article in the source. These were guessed from a weak rule (ending in -e, a consonant, -ista, or a possible plural). Fix any wrong ones by adding the article in the source or an override.

${guesses.map((s) => `- ${s}`).join("\n") || "None."}

## Notes moved to private (${privates.length})

Shown while studying, never on public pages.

${privates.map((s) => `- ${s}`).join("\n") || "None."}
`;
writeFileSync(join(ROOT, "data/import-report.md"), report);

console.log(
  `entries=${entries.length} sentences=${sentences.length} topics=${topics.length} problems=${problems.length} guesses=${guesses.length}`,
);
if (mismatch.length) {
  console.error("Count mismatch:", mismatch);
  process.exit(1);
}
