"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { db } from "@/lib/client/db";
import { invalidateContent } from "@/lib/client/content";
import { slugify } from "@/lib/infer";
import { parseImport, rowsToEntries, type ImportRow } from "@/lib/parse-import";
import { normalize } from "@/lib/answer";
import type { Pos, StudySet } from "@/lib/types";

const POS: Pos[] = ["noun", "verb", "adjective", "adverb", "phrase", "pronoun", "determiner"];
const SAMPLE =
  "el relámpago - lightning\nmerendar - to have an afternoon snack\nsostenibilidad - sustainability\nquizás - perhaps";

export function ImportForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const preview = () => {
    const r = parseImport(text);
    setRows(r.rows);
    setErrors(r.errors);
  };
  const update = (i: number, patch: Partial<ImportRow>) =>
    setRows((rs) =>
      (rs ?? []).map((r, j) =>
        j === i ? { ...r, ...patch, uncertain: patch.word || patch.pos ? false : r.uncertain } : r,
      ),
    );

  const badSentences = (rows ?? []).filter((r) => r.sentence && (r.sentence.match(/___/g) ?? []).length !== 1);

  const save = async () => {
    if (!rows?.length || !name.trim() || badSentences.length) return;
    setSaving(true);
    const slug = `custom-${slugify(name)}-${Date.now().toString(36)}`;
    const entries = rowsToEntries(rows, slug);
    const set: StudySet = { slug, name: name.trim(), kind: "custom", entryIds: entries.map((e) => e.id) };
    const sentences = rows.flatMap((r, i) => {
      const e = entries[i];
      if (!e || !r.sentence.trim()) return [];
      return [
        {
          entryId: e.id,
          text: r.sentence.trim(),
          answers: e.answers.map(normalize),
          translation: r.translation.trim(),
        },
      ];
    });
    await db().transaction("rw", [db().customSets, db().customEntries, db().customSentences], async () => {
      await db().customEntries.bulkPut(entries);
      await db().customSentences.bulkAdd(sentences);
      await db().customSets.put(set);
    });
    invalidateContent();
    router.push(`/study?set=${slug}&mode=cards`);
  };

  return (
    <div>
      <label className="mb-3 block">
        <span className="mb-1 block text-sm font-semibold">Set name</span>
        <input
          className="answer-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Set 9: weather"
          data-testid="set-name"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Words</span>
        <textarea
          className="answer-input min-h-48 font-mono text-base"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={SAMPLE}
          spellCheck={false}
          autoCapitalize="off"
          lang="es"
          data-testid="words"
        />
      </label>
      <button className="btn btn-primary mt-3 w-full" onClick={preview} disabled={!text.trim()}>
        Preview
      </button>
      {errors.length ? (
        <ul className="mt-3 text-sm text-bad">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}

      {rows ? (
        <section className="mt-6">
          <h2 className="mb-2 font-serif text-xl font-bold">
            {rows.length} words{" "}
            <span className="text-base font-normal text-muted">· add a sentence with ___ for the Sentences mode</span>
          </h2>
          <ol className="grid gap-3">
            {rows.map((r, i) => (
              <li
                key={i}
                className={`rounded-xl border-[1.5px] bg-card p-3 ${r.uncertain ? "border-tile-2" : "border-line"}`}
              >
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <input
                    className="answer-input !min-h-11 !text-base"
                    value={r.word}
                    onChange={(e) => update(i, { word: e.target.value })}
                    aria-label="Spanish word with article"
                    lang="es"
                  />
                  <select
                    className="answer-input !min-h-11 !w-auto !text-base"
                    value={r.pos}
                    onChange={(e) => update(i, { pos: e.target.value as Pos })}
                    aria-label="Part of speech"
                  >
                    {POS.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                  <input
                    className="answer-input col-span-2 !min-h-11 !text-base"
                    value={r.meaning}
                    onChange={(e) => update(i, { meaning: e.target.value })}
                    aria-label="English meaning"
                  />
                  <input
                    className="answer-input col-span-2 !min-h-11 !text-base"
                    value={r.note}
                    onChange={(e) => update(i, { note: e.target.value })}
                    placeholder="Note (optional)"
                    aria-label="Note"
                  />
                  <input
                    className="answer-input col-span-2 !min-h-11 !text-base"
                    value={r.sentence}
                    onChange={(e) => update(i, { sentence: e.target.value })}
                    placeholder="Sentence with ___ (optional)"
                    aria-label="Example sentence with a blank"
                    lang="es"
                  />
                  {r.sentence ? (
                    <input
                      className="answer-input col-span-2 !min-h-11 !text-base"
                      value={r.translation}
                      onChange={(e) => update(i, { translation: e.target.value })}
                      placeholder="English translation"
                      aria-label="Sentence translation"
                    />
                  ) : null}
                </div>
                {r.uncertain ? (
                  <p className="mt-1 text-xs text-muted">Guessed: check the article and part of speech.</p>
                ) : null}
              </li>
            ))}
          </ol>
          {badSentences.length ? <p className="mt-3 text-sm text-bad">Each sentence needs exactly one ___.</p> : null}
          <button
            className="btn btn-primary mt-4 w-full"
            onClick={() => void save()}
            disabled={saving || !name.trim() || !!badSentences.length}
            data-testid="save"
          >
            {name.trim() ? `Save “${name.trim()}” and study it` : "Name the set to save it"}
          </button>
          <p className="mt-2 text-center text-sm text-muted">Saved on this device and available offline.</p>
        </section>
      ) : null}
    </div>
  );
}
