import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { Breadcrumbs, Updated, breadcrumbLd } from "@/components/PageMeta";
import { allSlugs, content, grammarLabel, pluralForm, relatedInTopics, setBySlug } from "@/lib/content";
import { abs } from "@/lib/site";
import { topicEn } from "@/lib/topic-names";
import { buildWordPage } from "@/lib/word-page";

export const dynamicParams = false;

export function generateStaticParams() {
  return allSlugs().map((slug) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = buildWordPage(decodeURIComponent(slug));
  if (!p) return {};
  const path = `/es/palabra/${p.slug}`;
  return {
    title: p.title,
    description: p.lead,
    alternates: { canonical: path, languages: { en: path, "x-default": path } },
    openGraph: { title: p.title, description: p.lead, url: path, type: "article", modifiedTime: content.updatedAt },
    twitter: { card: "summary_large_image", title: p.title, description: p.lead },
  };
}

export default async function WordPage({ params }: Props) {
  const { slug } = await params;
  const p = buildWordPage(decodeURIComponent(slug));
  if (!p) notFound();
  const main = p.senses[0];
  if (!main) notFound();
  const url = abs(`/es/palabra/${p.slug}`);
  const topic = main.topics[0];
  const related = relatedInTopics(main);
  const sets = [...new Set(p.senses.flatMap((s) => s.sets))].map(setBySlug).filter((s) => !!s);
  const topicSets = [...new Set(p.senses.flatMap((s) => s.topics))];

  const crumbs = [
    { name: "Home", href: "/" },
    { name: "Spanish words", href: "/es/palabras" },
    ...(topic ? [{ name: topicEn(topic), href: `/es/tema/${topic}` }] : []),
    { name: p.lemma },
  ];
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": url,
        url,
        name: p.title,
        description: p.lead,
        inLanguage: "en",
        dateModified: content.updatedAt,
        isPartOf: { "@id": abs("/#website") },
        about: p.senses.map((s) => ({ "@id": `${url}#${s.id}` })),
      },
      ...p.senses.map((s) => ({
        "@type": "DefinedTerm",
        "@id": `${url}#${s.id}`,
        name: s.display,
        alternateName: [s.lemma, ...(s.femForm ? [s.femForm] : []), ...s.variants.map((v) => v.form)].filter(
          (x) => x !== s.display,
        ),
        description: `${s.meaning} (${grammarLabel(s)})`,
        inLanguage: "es",
        url,
        inDefinedTermSet: s.topics[0]
          ? {
              "@type": "DefinedTermSet",
              "@id": abs(`/es/tema/${s.topics[0]}#terms`),
              name: `Spanish ${topicEn(s.topics[0]).toLowerCase()} vocabulary`,
              url: abs(`/es/tema/${s.topics[0]}`),
            }
          : {
              "@type": "DefinedTermSet",
              "@id": abs("/es/palabras#terms"),
              name: "Spanish B1 vocabulary",
              url: abs("/es/palabras"),
            },
      })),
      {
        "@type": "FAQPage",
        mainEntity: p.faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      breadcrumbLd(crumbs.map((c) => ({ name: c.name, url: abs(c.href ?? `/es/palabra/${p.slug}`) }))),
    ],
  };

  return (
    <main className="prose-page mx-auto max-w-[640px] px-4 pt-3">
      <JsonLd data={ld} />
      <Breadcrumbs items={crumbs} />
      <article>
        <h1 className="font-serif text-[2rem] leading-tight font-bold">{p.title}</h1>
        <p className="mt-3 text-lg" data-testid="lead">
          {p.lead}
        </p>
        <p className="mt-3 flex flex-wrap gap-2">
          {(sets[0] ?? (topicSets[0] ? setBySlug(`b1-${topicSets[0]}`) : undefined)) ? (
            <Link
              className="btn btn-primary !no-underline"
              href={`/study?set=${(sets[0] ?? setBySlug(`b1-${topicSets[0]}`))?.slug}&mode=cards`}
            >
              Practise this word
            </Link>
          ) : null}
        </p>

        <section>
          <h2>What does {p.lemma} mean in English?</h2>
          {p.senses.map((s) => (
            <div key={s.id} className="mt-2">
              <dl className="facts">
                <dt>Spanish</dt>
                <dd lang="es">
                  <strong>{s.display}</strong>
                </dd>
                <dt>English</dt>
                <dd>{s.meaning}</dd>
                <dt>Part of speech</dt>
                <dd>{grammarLabel(s)}</dd>
                {pluralForm(s) ? (
                  <>
                    <dt>Plural</dt>
                    <dd lang="es">{pluralForm(s)}</dd>
                  </>
                ) : null}
                {s.femForm && s.pos !== "noun" ? (
                  <>
                    <dt>Feminine</dt>
                    <dd lang="es">{s.femForm}</dd>
                  </>
                ) : null}
                <dt>Used in</dt>
                <dd>{s.region === "es-ES" ? "Spain" : "Spain and Latin America"}</dd>
                {s.topics.length ? (
                  <>
                    <dt>Topic</dt>
                    <dd>
                      {s.topics.map((t, i) => (
                        <span key={t}>
                          {i > 0 ? ", " : ""}
                          <Link href={`/es/tema/${t}`}>{topicEn(t)}</Link>
                        </span>
                      ))}
                    </dd>
                  </>
                ) : null}
              </dl>
              {s.note ? (
                <p>
                  <strong>Usage note on {s.lemma}:</strong> {s.note}
                </p>
              ) : null}
            </div>
          ))}
        </section>

        {p.genderAnswer ? (
          <section>
            <h2>Is {p.lemma} masculine or feminine?</h2>
            <p>{p.genderAnswer}</p>
          </section>
        ) : null}

        {p.examples.length ? (
          <section>
            <h2>How do you use {p.lemma} in a sentence?</h2>
            <ul className="mt-2 grid gap-3">
              {p.examples.slice(0, 3).map((x) => (
                <li key={x.es}>
                  <p lang="es" className="font-serif text-lg">
                    {x.es}
                  </p>
                  <p className="text-muted">{x.en}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {p.regionAnswer ? (
          <section>
            <h2>What do they call {p.lemma} in Latin America?</h2>
            <p>{p.regionAnswer}</p>
            <table>
              <thead>
                <tr>
                  <th scope="col">Spain</th>
                  <th scope="col">Latin America</th>
                  <th scope="col">English</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td lang="es">{main.display}</td>
                  <td lang="es">{main.variants.map((v) => v.form).join(", ")}</td>
                  <td>{main.meaning}</td>
                </tr>
              </tbody>
            </table>
          </section>
        ) : null}

        {p.confusions.map((c) => (
          <section key={c.b}>
            <h2>
              What is the difference between {c.a} and {c.b}?
            </h2>
            <p>{c.explanation}</p>
            <table>
              <thead>
                <tr>
                  <th scope="col">Spanish</th>
                  <th scope="col">English</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td lang="es">{main.display}</td>
                  <td>{main.meaning}</td>
                </tr>
                <tr>
                  <td lang="es">{c.slugB ? <Link href={`/es/palabra/${c.slugB}`}>{c.b}</Link> : c.b}</td>
                  <td>{c.bMeaning}</td>
                </tr>
              </tbody>
            </table>
          </section>
        ))}

        {related.length && topic ? (
          <section>
            <h2>
              What other {topicEn(topic).toLowerCase()} words should you learn with {p.lemma}?
            </h2>
            <dl className="facts">
              {related.map((r) => (
                <div key={r.id} className="contents">
                  <dt lang="es">
                    <Link href={`/es/palabra/${r.slug}`}>{r.display}</Link>
                  </dt>
                  <dd>{r.meaning}</dd>
                </div>
              ))}
            </dl>
            <p>
              <Link href={`/es/tema/${topic}`}>All {topicEn(topic).toLowerCase()} words</Link>
            </p>
          </section>
        ) : null}

        {sets.length ? (
          <section>
            <h2>Which study sets include {p.lemma}?</h2>
            <ul>
              {sets.map((s) => (
                <li key={s.slug}>
                  <Link href={`/set/${s.slug}`}>{s.name}</Link> ({s.entryIds.length} words)
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>
      <Updated />
    </main>
  );
}
