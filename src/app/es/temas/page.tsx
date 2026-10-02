import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { Breadcrumbs, Updated, breadcrumbLd } from "@/components/PageMeta";
import { content } from "@/lib/content";
import { abs } from "@/lib/site";
import { topicEn } from "@/lib/topic-names";

const lead = `The B1 Spanish word list is grouped into ${content.topics.length} topics, from personal details and emotions to cars, music and the environment. Each topic page lists every word with its article and English meaning.`;

export const metadata: Metadata = {
  title: "Spanish vocabulary by topic",
  description: lead,
  alternates: { canonical: "/es/temas", languages: { en: "/es/temas", "x-default": "/es/temas" } },
};

export default function TopicsIndex() {
  const crumbs = [{ name: "Home", href: "/" }, { name: "Topics" }];
  return (
    <main className="prose-page mx-auto max-w-[640px] px-4 pt-3">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          ...breadcrumbLd(crumbs.map((c) => ({ name: c.name, url: abs(c.href ?? "/es/temas") }))),
        }}
      />
      <Breadcrumbs items={crumbs} />
      <h1 className="font-serif text-[2rem] leading-tight font-bold">Spanish vocabulary by topic</h1>
      <p className="mt-3 text-lg">{lead}</p>
      <table className="mt-4">
        <thead>
          <tr>
            <th scope="col">Topic</th>
            <th scope="col">Spanish name</th>
            <th scope="col">Words</th>
          </tr>
        </thead>
        <tbody>
          {content.topics.map((t) => (
            <tr key={t.slug}>
              <td>
                <Link href={`/es/tema/${t.slug}`}>{topicEn(t.slug)}</Link>
              </td>
              <td lang="es">{t.name}</td>
              <td>{t.entryIds.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Updated />
    </main>
  );
}
