import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { Breadcrumbs, Updated, breadcrumbLd } from "@/components/PageMeta";
import { WordList } from "@/components/WordList";
import { content, entriesOf, topicBySlug } from "@/lib/content";
import { abs } from "@/lib/site";
import { topicEn } from "@/lib/topic-names";
import type { Entry, Pos } from "@/lib/types";

export const dynamicParams = false;
export function generateStaticParams() {
  return content.topics.map((t) => ({ slug: t.slug }));
}

type Props = { params: Promise<{ slug: string }> };

function describe(slug: string) {
  const t = topicBySlug(slug);
  if (!t) return null;
  const entries = entriesOf(t.entryIds);
  const en = topicEn(slug);
  const sample = entries.slice(0, 3).map((e) => `${e.display} (${e.meaning})`);
  const lead = `This list has ${entries.length} B1-level Spanish words about ${en.toLowerCase()}, each with its article, gender and English meaning, including ${sample.join(", ")}.`;
  return { t, entries, en, lead, title: `Spanish ${en.toLowerCase()} vocabulary: ${entries.length} B1 words` };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = describe((await params).slug);
  if (!d) return {};
  const path = `/es/tema/${d.t.slug}`;
  return {
    title: d.title,
    description: d.lead,
    alternates: { canonical: path, languages: { en: path, "x-default": path } },
    openGraph: { title: d.title, description: d.lead, url: path, type: "article" },
  };
}

const GROUPS: { pos: Pos[]; q: (en: string) => string }[] = [
  { pos: ["noun"], q: (en) => `What are the Spanish nouns for ${en}?` },
  { pos: ["verb"], q: (en) => `What are the Spanish verbs for ${en}?` },
  { pos: ["adjective"], q: (en) => `Which Spanish adjectives describe ${en}?` },
  {
    pos: ["adverb", "phrase", "pronoun", "determiner"],
    q: (en) => `Which other Spanish words and phrases are used for ${en}?`,
  },
];

export default async function TopicPage({ params }: Props) {
  const d = describe((await params).slug);
  if (!d) notFound();
  const { t, entries, en, lead, title } = d;
  const url = abs(`/es/tema/${t.slug}`);
  const crumbs = [{ name: "Home", href: "/" }, { name: "Topics", href: "/es/temas" }, { name: en }];
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LearningResource",
        "@id": url,
        url,
        name: title,
        alternateName: t.name,
        description: lead,
        inLanguage: "en",
        educationalLevel: "B1",
        learningResourceType: "Vocabulary list",
        teaches: `Spanish vocabulary: ${en}`,
        dateModified: content.updatedAt,
        isPartOf: { "@id": abs("/#website") },
        hasPart: { "@id": `${url}#terms` },
      },
      {
        "@type": "DefinedTermSet",
        "@id": `${url}#terms`,
        name: `Spanish ${en.toLowerCase()} vocabulary`,
        inLanguage: "es",
        hasDefinedTerm: entries.map((e) => ({
          "@type": "DefinedTerm",
          name: e.display,
          description: e.meaning,
          url: abs(`/es/palabra/${e.slug}`),
        })),
      },
      breadcrumbLd(crumbs.map((c) => ({ name: c.name, url: abs(c.href ?? `/es/tema/${t.slug}`) }))),
    ],
  };
  const groups = GROUPS.map((g) => ({ ...g, items: entries.filter((e: Entry) => g.pos.includes(e.pos)) })).filter(
    (g) => g.items.length,
  );

  return (
    <main className="prose-page mx-auto max-w-[640px] px-4 pt-3">
      <JsonLd data={ld} />
      <Breadcrumbs items={crumbs} />
      <h1 className="font-serif text-[2rem] leading-tight font-bold">{title}</h1>
      <p className="mt-1 text-muted" lang="es">
        {t.name}
      </p>
      <p className="mt-3 text-lg">{lead}</p>
      <p className="mt-3">
        <Link className="btn btn-primary !text-white !no-underline" href={`/study?set=b1-${t.slug}&mode=cards`}>
          Study these {entries.length} words
        </Link>
      </p>
      {groups.map((g) => (
        <section key={g.pos[0]}>
          <h2>{g.q(en.toLowerCase())}</h2>
          <WordList entries={g.items} />
        </section>
      ))}
      <section>
        <h2>Which other Spanish vocabulary topics are there?</h2>
        <p>
          <Link href="/es/temas">All {content.topics.length} B1 vocabulary topics</Link>
        </p>
      </section>
      <Updated />
    </main>
  );
}
