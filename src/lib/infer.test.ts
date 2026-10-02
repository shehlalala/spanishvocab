import { describe, expect, it } from "vitest";
import { guessGender, inferWord, slugify } from "./infer";

describe("guessGender", () => {
  it.each([
    ["canción", "la"],
    ["problema", "el"],
    ["mano", "la"],
    ["agua", "el"],
    ["abrelatas", "el"],
    ["lista de reproducción", "la"],
    ["ciencias políticas", "las"],
    ["fuegos artificiales", "los"],
    ["interés", "el"],
    ["caries", "la"],
  ])("%s → %s", (w, a) => expect(guessGender(w).article).toBe(a));

  it("flags weak guesses", () => {
    expect(guessGender("taburete").confident).toBe(false);
    expect(guessGender("canción").confident).toBe(true);
  });
});

describe("inferWord (importer)", () => {
  it("reads an explicit article", () => {
    expect(inferWord("la escalera")).toMatchObject({ lemma: "escalera", article: "la", gender: "f", pos: "noun" });
    expect(inferWord("el agua")).toMatchObject({ gender: "f" });
  });
  it("detects verbs from the ending or a 'to …' meaning", () => {
    expect(inferWord("merendar", "to have a snack").pos).toBe("verb");
    expect(inferWord("jubilarse").pos).toBe("verb");
  });
  it("treats noun suffixes as nouns and adds an article", () => {
    expect(inferWord("sostenibilidad", "sustainability")).toMatchObject({ display: "la sostenibilidad", pos: "noun" });
  });
  it("detects adverbs and phrases", () => {
    expect(inferWord("claramente").pos).toBe("adverb");
    expect(inferWord("al fin y al cabo").pos).toBe("phrase");
  });
});

describe("slugify", () => {
  it("removes accents but keeps ñ", () => {
    expect(slugify("Canción")).toBe("cancion");
    expect(slugify("el año")).toBe("el-año");
    expect(slugify("Datos personales y etapas de la vida")).toBe("datos-personales-y-etapas-de-la-vida");
  });
});
