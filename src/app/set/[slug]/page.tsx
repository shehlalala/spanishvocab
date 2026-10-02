import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { Breadcrumbs, Updated, breadcrumbLd } from "@/components/PageMeta";
import { content, entriesOf, sentencesFor, setBySlug } from "@/lib/content";
import { MODES } from "@/lib/queue";
import { abs } from "@/lib/site";

export const dynamicParams = false;
export function generateStaticParams() {
  return content.sets.map((s) => ({ slug: s.slug }));
}

type Props = { params: Promise<{ slug: string }> };

function describe(slug: string) {
  const set = setBySlug(slug);
  if (!set) return null;
  const entries = entriesOf(set.entryIds);
  const withSentences = entries.filter((e) => sentencesFor(e.id).length).length;
  const lead = `${set.name} is a Spanish vocabulary list of ${entries.length} words with English meanings${withSentences ? ` and ${withSentences} fill-in-the-blank example sentences` : ""}. You can read it here, download it, or drill it with flashcards and quizzes.`;
  return { set, entries, lead };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = describe((await params).slug);
  if (!d) return {};
  const path = `/set/${d.set.slug}`;
  return {
    title: `${d.set.name}: ${d.entries.length} Spanish words`,
    description: d.lead,
    alternates: { canonical: path, languages: { en: path, "x-default": path } },
  };
}

export default async function SetPage({ params }: Props) {
  const d = describe((await params).slug);
  if (!d) notFound();
  const { set, entries, lead } = d;
  const url = abs(`/set/${set.slug}`);
  const crumbs = [{ name: "Home", href: "/" }, { name: "Sets", href: "/sets" }, { name: set.name }];
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LearningResource",
        "@id": url,
        url,
        name: set.name,
        description: lead,
        inLanguage: "en",
        learningResourceType: "Vocabulary list",
        dateModified: content.updatedAt,
        isPartOf: { "@id": abs("/#website") },
        encoding: [{ "@type": "MediaObject", contentUrl: abs(`/set/${set.slug}/csv`), encodingFormat: "text/csv" }],
        hasPart: {
          "@type": "DefinedTermSet",
          name: set.name,
          hasDefinedTerm: entries.map((e) => ({
            "@type": "DefinedTerm",
            name: e.display,
            description: e.meaning,
            url: abs(`/es/palabra/${e.slug}`),
          })),
        },
      },
      breadcrumbLd(crumbs.map((c) => ({ name: c.name, url: abs(c.href ?? `/set/${set.slug}`) }))),
    ],
  };
  return (
    <main className="prose-page mx-auto max-w-[640px] px-4 pt-3">
      <JsonLd data={ld} />
      <Breadcrumbs items={crumbs} />
      <h1 className="font-serif text-[2rem] leading-tight font-bold">{set.name}</h1>
      <p className="mt-3 text-lg">{lead}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {MODES.map((m) => (
          <Link
            key={m.id}
            className={`btn !no-underline ${m.id === "cards" ? "btn-primary !text-white" : ""}`}
            href={`/study?set=${set.slug}&mode=${m.id}`}
          >
            {m.label}
          </Link>
        ))}
      </div>
      <p className="mt-2 text-sm">
        <a href={`/set/${set.slug}/csv`} download>
          Download as CSV
        </a>
      </p>
      <section>
        <h2>Which words are in {set.name}?</h2>
        <table>
          <thead>
            <tr>
              <th scope="col">Spanish</th>
              <th scope="col">English</th>
              <th scope="col">Note</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td lang="es">
                  <Link href={`/es/palabra/${e.slug}`}>{e.display}</Link>
                </td>
                <td>{e.meaning}</td>
                <td className="text-muted">{e.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <Updated />
    </main>
  );
}
