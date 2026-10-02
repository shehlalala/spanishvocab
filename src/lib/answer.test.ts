import { describe, expect, it } from "vitest";
import { checkAnswer, formsOf, normalize, pluralize } from "./answer";

describe("normalize", () => {
  it("lowercases, trims and collapses spaces", () => {
    expect(normalize("  La   Escalera ")).toBe("escalera");
  });
  it("drops Spanish punctuation", () => {
    expect(normalize("¡Correcto!")).toBe("correcto");
    expect(normalize("¿quizás?")).toBe("quizás");
  });
  it("strips one leading article, definite or indefinite", () => {
    for (const a of ["el", "la", "los", "las", "un", "una", "unos", "unas"]) {
      expect(normalize(`${a} perro`)).toBe("perro");
    }
    expect(normalize("el / la creyente")).toBe("creyente");
  });
  it("keeps words that merely start with an article", () => {
    expect(normalize("lana")).toBe("lana");
    expect(normalize("elegir")).toBe("elegir");
  });
});

describe("formsOf", () => {
  it("splits masculine/feminine pairs", () => {
    expect(formsOf("el ministro / la ministra")).toEqual(["ministro", "ministra"]);
    expect(formsOf("casero / casera")).toEqual(["casero", "casera"]);
  });
  it("handles common-gender nouns", () => {
    expect(formsOf("el / la pediatra")).toEqual(["pediatra"]);
  });
  it("splits synonym pairs", () => {
    expect(formsOf("el desafío / el reto")).toEqual(["desafío", "reto"]);
  });
});

describe("pluralize", () => {
  it.each([
    ["casa", "casas"],
    ["árbol", "árboles"],
    ["luz", "luces"],
    ["canción", "canciones"],
    ["autobús", "autobuses"],
    ["crisis", "crisis"],
    ["juego de mesa", "juegos de mesa"],
    ["sofá", "sofás"],
  ])("%s → %s", (s, p) => expect(pluralize(s)).toBe(p));
});

describe("checkAnswer", () => {
  it("accepts an exact answer", () => {
    expect(checkAnswer("escalera", { accepted: ["escalera"] })).toEqual({
      kind: "exact",
      correct: true,
      expected: "escalera",
    });
  });
  it("is article-tolerant: escalera = la escalera", () => {
    expect(checkAnswer("la escalera", { accepted: ["escalera"] }).kind).toBe("exact");
    expect(checkAnswer("escalera", { accepted: ["la escalera"] }).kind).toBe("exact");
  });
  it("is accent-tolerant but flags it and returns the correct spelling", () => {
    const v = checkAnswer("cancion", { accepted: ["canción"] });
    expect(v).toEqual({ kind: "accent", correct: true, expected: "canción" });
  });
  it("treats a missing ñ tilde as an accent slip", () => {
    expect(checkAnswer("gruñon", { accepted: ["gruñón"] }).kind).toBe("accent");
    expect(checkAnswer("grunon", { accepted: ["gruñón"] }).kind).toBe("accent");
  });
  it("accepts alternates: ministro / ministra, desafío / reto", () => {
    const pair = formsOf("el ministro / la ministra");
    expect(checkAnswer("ministra", { accepted: pair }).correct).toBe(true);
    const syn = formsOf("el desafío / el reto");
    expect(checkAnswer("el reto", { accepted: syn })).toMatchObject({ kind: "exact", expected: "reto" });
  });
  it("accepts singular/plural slips both ways", () => {
    expect(checkAnswer("pecas", { accepted: ["peca"] })).toMatchObject({ kind: "plural", expected: "peca" });
    expect(checkAnswer("peca", { accepted: ["pecas"] }).kind).toBe("plural");
    expect(checkAnswer("canciones", { accepted: ["canción"] }).kind).toBe("plural");
    expect(checkAnswer("luces", { accepted: ["luz"] }).kind).toBe("plural");
  });
  it("can disable plural tolerance", () => {
    expect(checkAnswer("pecas", { accepted: ["peca"], allowPlural: false }).kind).toBe("wrong");
  });
  it("accepts the other region's form but flags it", () => {
    const v = checkAnswer("jugo", { accepted: ["zumo"], variants: ["el jugo"] });
    expect(v).toEqual({ kind: "variant", correct: true, expected: "zumo" });
    expect(checkAnswer("el jugo", { accepted: ["zumo"], variants: ["jugo"] }).kind).toBe("variant");
  });
  it("prefers exact over looser matches when several forms are accepted", () => {
    expect(checkAnswer("quizá", { accepted: ["quizás", "quizá"] }).kind).toBe("exact");
  });
  it("ignores punctuation and case", () => {
    expect(checkAnswer("¡Enseguida!", { accepted: ["enseguida"] }).kind).toBe("exact");
  });
  it("rejects wrong and empty answers with the preferred answer", () => {
    expect(checkAnswer("mesa", { accepted: ["silla"] })).toEqual({ kind: "wrong", correct: false, expected: "silla" });
    expect(checkAnswer("  ", { accepted: ["silla"] }).correct).toBe(false);
  });
  it("does not accept a different word that only shares accents", () => {
    expect(checkAnswer("papa", { accepted: ["papá"] }).kind).toBe("accent");
    expect(checkAnswer("pala", { accepted: ["papá"] }).kind).toBe("wrong");
  });
});
