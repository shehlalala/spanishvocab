import { describe, expect, it } from "vitest";
import { parseImport, rowsToEntries } from "./parse-import";

describe("parseImport", () => {
  it("parses word - meaning lines with several separators", () => {
    const { rows, errors } = parseImport(
      "la escalera - stairs\nmerendar – to have a snack\nsostenibilidad\tsustainability\n\nclaramente = clearly",
    );
    expect(errors).toEqual([]);
    expect(rows.map((r) => [r.word, r.meaning, r.pos])).toEqual([
      ["la escalera", "stairs", "noun"],
      ["merendar", "to have a snack", "verb"],
      ["la sostenibilidad", "sustainability", "noun"],
      ["claramente", "clearly", "adverb"],
    ]);
  });
  it("strips list bullets and numbering, keeps a third field as a note", () => {
    const { rows } = parseImport("1. el trueno - thunder - lightning = el relámpago");
    expect(rows[0]).toMatchObject({ word: "el trueno", meaning: "thunder" });
    expect(rows[0]?.note).toBe("lightning = el relámpago");
  });
  it("reports lines without a meaning", () => {
    expect(parseImport("hola").errors).toHaveLength(1);
  });
  it("builds unique entry ids within a set", () => {
    const { rows } = parseImport("la presa - dam\nla presa - prey");
    const ids = rowsToEntries(rows, "custom-x").map((e) => e.id);
    expect(new Set(ids).size).toBe(2);
  });
});
