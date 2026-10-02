import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { Breadcrumbs, Updated, breadcrumbLd } from "@/components/PageMeta";
import { content } from "@/lib/content";
import { abs } from "@/lib/site";
import type { Entry } from "@/lib/types";

const lead = `An A–Z list of ${content.entries.length.toLocaleString("en")} B1-level Spanish words with their English meanings. Each word links to a page with its gender, plural, usage notes, example sentences and related words.`;

export const metadata: Metadata = {
  title: "Spanish words A–Z",
  description: lead,
  alternates: { canonical: "/es/palabras", languages: { en: "/es/palabras", "x-default": "/es/palabras" } },
};

const letter = (e: Entry) => (e.lemma.normalize("NFD").replace(/[̀-ͯ]/g, "")[0] ?? "#").toUpperCase();

export default function WordsIndex() {
  const sorted = [...content.entries].sort((a, b) => a.lemma.localeCompare(b.lemma, "es"));
  const groups = new Map<string, Entry[]>();
  for (const e of sorted) groups.set(letter(e), [...(groups.get(letter(e)) ?? []), e]);
  const crumbs = [{ name: "Home", href: "/" }, { name: "Spanish words" }];
  return (
    <main className="prose-page mx-auto max-w-[640px] px-4 pt-3">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          ...breadcrumbLd(crumbs.map((c) => ({ name: c.name, url: abs(c.href ?? "/es/palabras") }))),
        }}
      />
      <Breadcrumbs items={crumbs} />
      <h1 className="font-serif text-[2rem] leading-tight font-bold">Spanish words A–Z</h1>
      <p className="mt-3 text-lg">{lead}</p>
      <nav aria-label="Letters" className="mt-3 flex flex-wrap gap-1">
        {[...groups.keys()].map((l) => (
          <a
            key={l}
            href={`#${l}`}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-card !no-underline"
          >
            {l}
          </a>
        ))}
      </nav>
      {[...groups.entries()].map(([l, es]) => (
        <section key={l} id={l}>
          <h2>{l}</h2>
          <dl className="facts">
            {es.map((e) => (
              <div key={e.id} className="contents">
                <dt lang="es">
                  <Link href={`/es/palabra/${e.slug}`}>{e.display}</Link>
                </dt>
                <dd>{e.meaning}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      <Updated />
    </main>
  );
}
