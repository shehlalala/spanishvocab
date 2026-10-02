import "server-only";
import { content, entriesOf, filled, grammarLabel, sentencesFor } from "./content";
import { SITE_DESCRIPTION, SITE_NAME, abs } from "./site";
import { topicEn } from "./topic-names";

export function llmsTxt(): string {
  const mine = content.sets.filter((s) => s.kind === "mine");
  return `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

Every word has its own page answering "how do you say X in Spanish": article and gender, plural, part of speech, English meaning, a usage note, example sentences with translations where available, Latin American equivalents for Spain-specific words, and common confusions. Pages are static HTML with schema.org DefinedTerm, FAQPage and BreadcrumbList markup.

## Main sections

- [Spanish words A–Z](${abs("/es/palabras")}): all ${content.entries.length} words with meanings
- [Vocabulary by topic](${abs("/es/temas")}): ${content.topics.length} B1 topics
- [Study sets](${abs("/sets")}): downloadable word lists with flashcards and quizzes
- [Full text for LLMs](${abs("/llms-full.txt")}): every word, meaning and example sentence in one file

## Topics

${content.topics.map((t) => `- [${topicEn(t.slug)}](${abs(`/es/tema/${t.slug}`)}): ${t.entryIds.length} words (${t.name})`).join("\n")}

## Study sets

${mine.map((s) => `- [${s.name}](${abs(`/set/${s.slug}`)}): ${s.entryIds.length} words, CSV at ${abs(`/set/${s.slug}/csv`)}`).join("\n")}

## Optional

- [Sitemap](${abs("/sitemap.xml")})
`;
}

export function llmsFullTxt(): string {
  const parts = content.topics.map((t) => {
    const lines = entriesOf(t.entryIds).map((e) => {
      const ex = sentencesFor(e.id)[0];
      const extra = [
        e.note && `Note: ${e.note}`,
        e.variants.length && `Latin America: ${e.variants.map((v) => v.form).join(", ")}`,
        ex && `Example: ${filled(ex)} (${ex.translation})`,
      ].filter(Boolean);
      return `- ${e.display} (${grammarLabel(e)}): ${e.meaning}${extra.length ? `. ${extra.join(". ")}` : ""} — ${abs(`/es/palabra/${e.slug}`)}`;
    });
    return `## ${topicEn(t.slug)} (${t.name})\n\n${lines.join("\n")}`;
  });
  const inTopic = new Set(content.topics.flatMap((t) => t.entryIds));
  const others = content.entries.filter((e) => !inTopic.has(e.id));
  const otherLines = others.map((e) => {
    const ex = sentencesFor(e.id)[0];
    return `- ${e.display} (${grammarLabel(e)}): ${e.meaning}${e.note ? `. Note: ${e.note}` : ""}${ex ? `. Example: ${filled(ex)} (${ex.translation})` : ""} — ${abs(`/es/palabra/${e.slug}`)}`;
  });
  return `# ${SITE_NAME}: full Spanish word list

> ${SITE_DESCRIPTION}

Last updated: ${content.updatedAt}

${parts.join("\n\n")}

## More words

${otherLines.join("\n")}
`;
}
