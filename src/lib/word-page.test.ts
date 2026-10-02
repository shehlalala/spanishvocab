import { describe, expect, it } from "vitest";
import { allSlugs, content } from "./content";
import { buildWordPage } from "./word-page";

describe("word pages", () => {
  const pages = allSlugs().map((s) => buildWordPage(s));

  it("builds a page for every slug", () => {
    expect(pages.every(Boolean)).toBe(true);
  });

  it("answers the question within the first 40 words", () => {
    const long = pages.filter((p) => p && p.lead.split(/\s+/).length > 40).map((p) => p?.slug);
    expect(long).toEqual([]);
  });

  it("never publishes private notes", () => {
    for (const e of content.entries.filter((x) => x.privateNote)) {
      const p = buildWordPage(e.slug);
      const published = JSON.stringify([p?.title, p?.lead, p?.genderAnswer, p?.regionAnswer, p?.faqs, p?.examples]);
      expect(published).not.toContain(e.privateNote);
    }
  });

  it("gives Spain-specific words their Latin American form", () => {
    expect(buildWordPage("zumo")?.lead).toContain("el jugo");
  });

  it("explains gender, including feminine nouns that take el", () => {
    expect(buildWordPage("escalera")?.genderAnswer).toMatch(/feminine.*la escalera/);
    expect(buildWordPage("alma-gemela")?.genderAnswer).toMatch(/takes el/);
  });
});
